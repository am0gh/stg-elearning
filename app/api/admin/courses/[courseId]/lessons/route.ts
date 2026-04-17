import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"
import { LessonCreateSchema, parseBody } from "@/lib/schemas"
import { validateAdminOrigin } from "@/lib/csrf"

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { courseId } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true })
  if (error) {
    console.error("[admin/lessons GET]", error)
    return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const csrf = validateAdminOrigin(req)
  if (csrf) return csrf
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = await parseBody(req, LessonCreateSchema)
  if ("response" in parsed) return parsed.response

  const { courseId } = await params
  const supabase = createAdminClient()

  // Auto-assign next order_index when not provided
  const { count } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      ...parsed.data,
      course_id: courseId,
      order_index: parsed.data.order_index ?? (count ?? 0) + 1,
    })
    .select()
    .single()

  if (error) {
    console.error("[admin/lessons POST]", error)
    return NextResponse.json({ error: "Failed to create lesson" }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
