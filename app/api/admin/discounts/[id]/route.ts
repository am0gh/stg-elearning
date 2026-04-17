import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"
import { DiscountPatchSchema, parseBody } from "@/lib/schemas"
import { validateAdminOrigin } from "@/lib/csrf"

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const csrf = validateAdminOrigin(req)
  if (csrf) return csrf
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Only is_active is allowed via PATCH — strict schema rejects anything else
  const parsed = await parseBody(req, DiscountPatchSchema)
  if ("response" in parsed) return parsed.response

  const { id } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("discount_codes")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[admin/discounts PATCH]", error)
    return NextResponse.json({ error: "Failed to update discount code" }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const csrf = validateAdminOrigin(req)
  if (csrf) return csrf
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("discount_codes")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[admin/discounts DELETE]", error)
    return NextResponse.json({ error: "Failed to delete discount code" }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
