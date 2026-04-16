import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const { code } = await req.json()

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code is required" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("discount_codes")
    .select("id, code, discount_percent, max_uses, uses_count, expires_at, is_active")
    .eq("is_active", true)
    .ilike("code", code.trim())
    .single()

  if (error) {
    // Table doesn't exist yet (code 42P01) — misconfiguration, not a bad code
    if (error.code === "42P01") {
      return NextResponse.json({ error: "Discount codes are not yet configured — contact support" }, { status: 503 })
    }
    return NextResponse.json({ error: "Invalid or expired discount code" }, { status: 404 })
  }

  if (!data) {
    return NextResponse.json({ error: "Invalid or expired discount code" }, { status: 404 })
  }

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: "This discount code has expired" }, { status: 410 })
  }

  // Check usage limit
  if (data.max_uses !== null && data.uses_count >= data.max_uses) {
    return NextResponse.json({ error: "This discount code has reached its usage limit" }, { status: 410 })
  }

  return NextResponse.json({
    valid: true,
    id: data.id,
    code: data.code,
    discount_percent: data.discount_percent,
  })
}
