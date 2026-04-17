import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"
import { validateAdminOrigin } from "@/lib/csrf"

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("discount_codes")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const csrf = validateAdminOrigin(req)
  if (csrf) return csrf
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { code, description, discount_percent, discount_amount_eur, max_uses, max_uses_per_user, starts_at, expires_at } = body

  if (!code || typeof code !== "string" || code.trim() === "") {
    return NextResponse.json({ error: "Code is required" }, { status: 400 })
  }

  const hasPct = discount_percent !== null && discount_percent !== undefined
  const hasAmt = discount_amount_eur !== null && discount_amount_eur !== undefined

  if (!hasPct && !hasAmt) {
    return NextResponse.json({ error: "Either a discount percentage or a euro amount is required" }, { status: 400 })
  }
  if (hasPct && hasAmt) {
    return NextResponse.json({ error: "Set either a percentage or a euro amount, not both" }, { status: 400 })
  }
  if (hasPct && (typeof discount_percent !== "number" || discount_percent < 0 || discount_percent > 100)) {
    return NextResponse.json({ error: "discount_percent must be 0–100" }, { status: 400 })
  }
  if (hasAmt && (typeof discount_amount_eur !== "number" || discount_amount_eur <= 0)) {
    return NextResponse.json({ error: "discount_amount_eur must be a positive number" }, { status: 400 })
  }

  // Validate date ordering
  if (starts_at && expires_at && new Date(starts_at) >= new Date(expires_at)) {
    return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("discount_codes")
    .insert({
      code: code.trim().toLowerCase(),
      description: description ?? null,
      discount_percent: hasPct ? discount_percent : null,
      discount_amount_eur: hasAmt ? discount_amount_eur : null,
      max_uses: max_uses ?? null,
      max_uses_per_user: max_uses_per_user ?? null,
      starts_at: starts_at ?? null,
      expires_at: expires_at ?? null,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A code with that name already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
