/**
 * POST /api/progress/course-complete
 * ────────────────────────────────────
 * Called by the lesson player (client-side) when a student completes
 * all lessons in a course. Fires the course.completed notification to n8n.
 *
 * Body: { courseId: string }
 *
 * Idempotent — safe to call multiple times (only fires notification once
 * per course via the enrollments.completed_at column).
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendNotification } from "@/lib/notifications"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { courseId } = await req.json()
  if (!courseId) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 })
  }

  const admin = createAdminClient()

  // ── Verify enrollment exists ─────────────────────────────────────────────────
  const { data: enrollment } = await admin
    .from("enrollments")
    .select("id, completed_at")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single()

  if (!enrollment) {
    return NextResponse.json({ error: "Not enrolled" }, { status: 403 })
  }

  // ── Idempotency: already marked complete? ────────────────────────────────────
  if (enrollment.completed_at) {
    return NextResponse.json({ ok: true, alreadyCompleted: true })
  }

  // ── Count total lessons and completed lessons ────────────────────────────────
  const { data: lessons } = await admin
    .from("lessons")
    .select("id")
    .eq("course_id", courseId)

  const totalLessons = lessons?.length ?? 0

  if (totalLessons === 0) {
    return NextResponse.json({ ok: true })
  }

  const { count: completedCount } = await admin
    .from("lesson_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("completed", true)
    .in("lesson_id", lessons!.map(l => l.id))

  // Only fire if genuinely all done
  if ((completedCount ?? 0) < totalLessons) {
    return NextResponse.json({ ok: true, allDone: false })
  }

  // ── Stamp enrollment as completed ────────────────────────────────────────────
  await admin
    .from("enrollments")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", enrollment.id)

  // ── Fetch enrichment data ────────────────────────────────────────────────────
  const [{ data: course }, { data: profile }] = await Promise.all([
    admin.from("courses").select("title, level").eq("id", courseId).single(),
    admin.from("profiles").select("full_name").eq("id", user.id).single(),
  ])

  const { data: { user: authUser } } = await admin.auth.admin.getUserById(user.id)
  const email = authUser?.email ?? ""
  const name  = profile?.full_name ?? authUser?.user_metadata?.full_name ?? ""

  // ── Fire n8n notification ────────────────────────────────────────────────────
  await sendNotification({
    event: "course.completed",
    data: {
      user_id:           user.id,
      email,
      name,
      course_id:         courseId,
      course_title:      course?.title ?? "",
      lessons_completed: totalLessons,
    },
  })

  return NextResponse.json({ ok: true, allDone: true })
}
