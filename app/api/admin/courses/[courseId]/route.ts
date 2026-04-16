import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"

export async function GET(_: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { courseId } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("courses").select("*").eq("id", courseId).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { courseId } = await params
  const body = await req.json()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("courses")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", courseId)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { courseId } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from("courses").delete().eq("id", courseId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
