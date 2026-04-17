/**
 * GET  /api/admin/integrations  — return current integration settings
 * PUT  /api/admin/integrations  — save integration settings
 *
 * Integration settings live in the same `site_settings` table
 * (key-value store) but are managed separately from design settings.
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"
import { validateAdminOrigin } from "@/lib/csrf"

const INTEGRATION_KEYS = ["n8n_webhook_url"] as const
type IntegrationKey = (typeof INTEGRATION_KEYS)[number]

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", INTEGRATION_KEYS)

  const settings = Object.fromEntries(
    (data ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
  ) as Partial<Record<IntegrationKey, string>>

  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const csrf = validateAdminOrigin(req)
  if (csrf) return csrf
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const body = await req.json() as Partial<Record<IntegrationKey, string>>

  const rows = INTEGRATION_KEYS
    .filter(k => k in body)
    .map(k => ({ key: k, value: String(body[k] ?? ""), updated_at: new Date().toISOString() }))

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid integration settings provided" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("site_settings")
    .upsert(rows, { onConflict: "key" })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
