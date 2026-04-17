import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"
import { CourseCreateSchema, parseBody } from "@/lib/schemas"
import { validateAdminOrigin } from "@/lib/csrf"

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at")

  if (error) {
    console.error("[admin/courses GET]", error)
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const csrf = validateAdminOrigin(req)
  if (csrf) return csrf
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = await parseBody(req, CourseCreateSchema)
  if ("response" in parsed) return parsed.response

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("courses")
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    console.error("[admin/courses POST]", error)
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
