import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEFAULT_SETTINGS, getSiteSettings, type SiteSettings } from "@/lib/site-settings"
import { isAdmin } from "@/lib/auth/admin"
import { revalidateTag } from "next/cache"

// GET — return current settings (merged with defaults)
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const settings = await getSiteSettings()
  return NextResponse.json(settings)
}

// PUT — upsert one or more settings keys
export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const body = await req.json() as Partial<SiteSettings>

  // Validate color fields
  const hexRe = /^#[0-9a-fA-F]{6}$/
  if (body.cta_color && !hexRe.test(body.cta_color)) {
    return NextResponse.json({ error: "Invalid cta_color: must be a 6-digit hex color" }, { status: 400 })
  }
  if (body.secondary_color && !hexRe.test(body.secondary_color)) {
    return NextResponse.json({ error: "Invalid secondary_color: must be a 6-digit hex color" }, { status: 400 })
  }
  if (body.heading_color && !hexRe.test(body.heading_color)) {
    return NextResponse.json({ error: "Invalid heading_color: must be a 6-digit hex color" }, { status: 400 })
  }

  const allowed = Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[]
  const rows = allowed
    .filter(k => k in body)
    .map(k => ({ key: k, value: String(body[k]), updated_at: new Date().toISOString() }))

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid settings provided" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("site_settings")
    .upsert(rows, { onConflict: "key" })

  if (error) {
    console.error("Settings upsert error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidateTag("site-settings", "default")
  revalidateTag("homepage-content", "default")

  return NextResponse.json({ ok: true })
}
