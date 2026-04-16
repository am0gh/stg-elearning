import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEFAULT_CONTENT, getHomepageContent } from "@/lib/homepage-content"
import { isAdmin } from "@/lib/auth/admin"
import { revalidateTag } from "next/cache"

// GET — return current content (merged with defaults)
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  return NextResponse.json(await getHomepageContent())
}

// PUT — upsert any subset of content keys
export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const body = await req.json() as Record<string, string>
  const allowed = new Set(Object.keys(DEFAULT_CONTENT))

  const rows = Object.entries(body)
    .filter(([k]) => allowed.has(k))
    .map(([k, v]) => ({ key: k, value: String(v), updated_at: new Date().toISOString() }))

  if (rows.length === 0) return NextResponse.json({ error: "No valid fields" }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("site_settings")
    .upsert(rows, { onConflict: "key" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidateTag("site-settings", "default")
  revalidateTag("homepage-content", "default")

  return NextResponse.json({ ok: true })
}
