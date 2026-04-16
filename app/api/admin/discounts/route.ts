import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"

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
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { code, description, discount_percent, max_uses, expires_at } = body

  if (!code || typeof code !== "string" || code.trim() === "") {
    return NextResponse.json({ error: "Code is required" }, { status: 400 })
  }
  if (typeof discount_percent !== "number" || discount_percent < 0 || discount_percent > 100) {
    return NextResponse.json({ error: "discount_percent must be 0–100" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("discount_codes")
    .insert({
      code: code.trim().toLowerCase(),
      description: description ?? null,
      discount_percent,
      max_uses: max_uses ?? null,
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
