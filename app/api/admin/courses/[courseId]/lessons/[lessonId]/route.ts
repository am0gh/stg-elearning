import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"
import { LessonUpdateSchema, parseBody } from "@/lib/schemas"
import { validateAdminOrigin } from "@/lib/csrf"

type Params = { params: Promise<{ courseId: string; lessonId: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { lessonId } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("lessons").select("*").eq("id", lessonId).single()
  if (error) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const csrf = validateAdminOrigin(req)
  if (csrf) return csrf
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = await parseBody(req, LessonUpdateSchema)
  if ("response" in parsed) return parsed.response

  const { lessonId } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("lessons")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", lessonId)
    .select()
    .single()
  if (error) {
    console.error("[admin/lessons PUT]", error)
    return NextResponse.json({ error: "Failed to update lesson" }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const csrf = validateAdminOrigin(req)
  if (csrf) return csrf
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { lessonId } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId)
  if (error) {
    console.error("[admin/lessons DELETE]", error)
    return NextResponse.json({ error: "Failed to delete lesson" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
