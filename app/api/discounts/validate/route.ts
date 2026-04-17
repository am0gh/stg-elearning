import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const { code } = await req.json()

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code is required" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("discount_codes")
    .select("id, code, discount_percent, discount_amount_eur, max_uses, max_uses_per_user, uses_count, starts_at, expires_at, is_active")
    .eq("is_active", true)
    .ilike("code", code.trim())
    .single()

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ error: "Discount codes are not yet configured — contact support" }, { status: 503 })
    }
    return NextResponse.json({ error: "Invalid or expired discount code" }, { status: 404 })
  }

  if (!data) {
    return NextResponse.json({ error: "Invalid or expired discount code" }, { status: 404 })
  }

  const now = new Date()

  // Not started yet
  if (data.starts_at && new Date(data.starts_at) > now) {
    return NextResponse.json({ error: "This discount code is not active yet" }, { status: 410 })
  }

  // Expired
  if (data.expires_at && new Date(data.expires_at) < now) {
    return NextResponse.json({ error: "This discount code has expired" }, { status: 410 })
  }

  // Global usage limit reached
  if (data.max_uses !== null && data.uses_count >= data.max_uses) {
    return NextResponse.json({ error: "This discount code has reached its usage limit" }, { status: 410 })
  }

  // Per-user usage limit — only check when a user is signed in
  if (data.max_uses_per_user !== null) {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()

    if (user) {
      const { count } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("discount_code_id", data.id)

      if ((count ?? 0) >= data.max_uses_per_user) {
        return NextResponse.json({
          error: data.max_uses_per_user === 1
            ? "You have already used this discount code"
            : `You can only use this code ${data.max_uses_per_user} time${data.max_uses_per_user > 1 ? "s" : ""}`,
        }, { status: 410 })
      }
    }
  }

  return NextResponse.json({
    valid: true,
    id: data.id,
    code: data.code,
    discount_percent: data.discount_percent ?? null,
    discount_amount_eur: data.discount_amount_eur ?? null,
  })
}
