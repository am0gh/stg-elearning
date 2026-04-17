import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"
import { CourseUpdateSchema, parseBody } from "@/lib/schemas"
import { validateAdminOrigin } from "@/lib/csrf"

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { courseId } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("courses").select("*").eq("id", courseId).single()
  if (error) return NextResponse.json({ error: "Course not found" }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const csrf = validateAdminOrigin(req)
  if (csrf) return csrf
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = await parseBody(req, CourseUpdateSchema)
  if ("response" in parsed) return parsed.response

  const { courseId } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("courses")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", courseId)
    .select()
    .single()
  if (error) {
    console.error("[admin/courses PUT]", error)
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const csrf = validateAdminOrigin(req)
  if (csrf) return csrf
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { courseId } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from("courses").delete().eq("id", courseId)
  if (error) {
    console.error("[admin/courses DELETE]", error)
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
