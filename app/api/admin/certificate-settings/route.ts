/**
 * GET  /api/admin/certificate-settings  — return current certificate design
 * PUT  /api/admin/certificate-settings  — save certificate design
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"
import {
  DEFAULT_CERTIFICATE_SETTINGS,
  getCertificateSettings,
  type CertificateSettings,
} from "@/lib/certificate-settings"

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }
  const settings = await getCertificateSettings()
  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }

  const body = await req.json() as Partial<CertificateSettings>

  // Validate hex color fields
  const hexRe = /^#[0-9a-fA-F]{6}$/
  for (const field of ["accent_color", "header_bg", "body_bg", "border_color"] as const) {
    if (body[field] !== undefined && !hexRe.test(body[field] as string)) {
      return NextResponse.json(
        { error: `Invalid ${field}: must be a 6-digit hex color` },
        { status: 400 }
      )
    }
  }

  // Merge with defaults to ensure all keys are present
  const current = await getCertificateSettings()
  const merged: CertificateSettings = { ...current, ...body }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      {
        key:        "certificate_settings",
        value:      JSON.stringify(merged),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
