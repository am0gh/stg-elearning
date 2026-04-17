/**
 * GET /api/admin/analytics
 * ─────────────────────────
 * Returns aggregate platform metrics for the admin dashboard.
 *
 * Query params:
 *   days  number  — lookback window in days (default 30, 0 = all time)
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const days   = parseInt(searchParams.get("days") ?? "30", 10)
  const cutoff = days > 0
    ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    : null

  const supabase = createAdminClient()

  // ── 1. Overview stats ─────────────────────────────────────────────────────────

  const [
    { count: totalStudents },
    { count: totalEnrollments },
    { count: completedCourses },
    { data: courses },
    { data: recentEnrollments },
    { data: lessonProgressData },
  ] = await Promise.all([
    // Total unique enrolled students (all time)
    supabase
      .from("enrollments")
      .select("user_id", { count: "exact", head: true }),

    // Total enrollments in the window
    supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .gte(cutoff ? "enrolled_at" : "id", cutoff ?? ""),

    // Courses completed in the window
    supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .not("completed_at", "is", null)
      .gte(cutoff ? "completed_at" : "id", cutoff ?? ""),

    // All published courses with lesson count
    supabase
      .from("courses")
      .select("id, title, level, is_published")
      .eq("is_published", true)
      .order("created_at", { ascending: true }),

    // Enrollments over time (for chart) — last 60 days max
    supabase
      .from("enrollments")
      .select("enrolled_at, course_id")
      .gte("enrolled_at", new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
      .order("enrolled_at", { ascending: true }),

    // Lesson completion counts (for dropout heatmap)
    supabase
      .from("lesson_progress")
      .select("lesson_id, completed"),
  ])

  // ── 2. Enrollments per course ─────────────────────────────────────────────────

  const { data: enrollmentsPerCourse } = await supabase
    .from("enrollments")
    .select("course_id, discount_code_id")
    .gte(cutoff ? "enrolled_at" : "id", cutoff ?? "")

  const enrollmentCounts: Record<string, number> = {}
  for (const e of enrollmentsPerCourse ?? []) {
    enrollmentCounts[e.course_id] = (enrollmentCounts[e.course_id] ?? 0) + 1
  }

  const { data: completionsPerCourse } = await supabase
    .from("enrollments")
    .select("course_id")
    .not("completed_at", "is", null)

  const completionCounts: Record<string, number> = {}
  for (const e of completionsPerCourse ?? []) {
    completionCounts[e.course_id] = (completionCounts[e.course_id] ?? 0) + 1
  }

  // ── 3. Lesson completion rates ────────────────────────────────────────────────

  // Count how many users have completed each lesson
  const lessonCompletions: Record<string, { total: number; completed: number }> = {}
  for (const lp of lessonProgressData ?? []) {
    if (!lessonCompletions[lp.lesson_id]) {
      lessonCompletions[lp.lesson_id] = { total: 0, completed: 0 }
    }
    lessonCompletions[lp.lesson_id].total++
    if (lp.completed) lessonCompletions[lp.lesson_id].completed++
  }

  // Fetch lesson metadata (title, order, course_id)
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, order_index, course_id")
    .in("course_id", (courses ?? []).map(c => c.id))
    .order("order_index", { ascending: true })

  const lessonStats = (lessons ?? []).map(l => {
    const stats = lessonCompletions[l.id] ?? { total: 0, completed: 0 }
    return {
      lessonId:    l.id,
      title:       l.title,
      orderIndex:  l.order_index,
      courseId:    l.course_id,
      totalStarts: stats.total,
      completed:   stats.completed,
      completionRate: stats.total > 0
        ? Math.round((stats.completed / stats.total) * 100)
        : 0,
    }
  })

  // ── 4. Enrollments chart data (daily buckets) ─────────────────────────────────

  const buckets: Record<string, number> = {}
  for (const e of recentEnrollments ?? []) {
    const day = e.enrolled_at.slice(0, 10)   // "YYYY-MM-DD"
    buckets[day] = (buckets[day] ?? 0) + 1
  }

  // Fill in zero-days for a complete 30-day series
  const chartData: { date: string; enrollments: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d   = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    chartData.push({ date: key, enrollments: buckets[key] ?? 0 })
  }

  // ── 5. Course summary rows ────────────────────────────────────────────────────

  const courseStats = (courses ?? []).map(c => ({
    courseId:        c.id,
    title:           c.title,
    level:           c.level,
    totalEnrollments: enrollmentCounts[c.id] ?? 0,
    completions:     completionCounts[c.id] ?? 0,
    completionRate:  enrollmentCounts[c.id]
      ? Math.round(((completionCounts[c.id] ?? 0) / enrollmentCounts[c.id]) * 100)
      : 0,
    lessonStats:     lessonStats.filter(l => l.courseId === c.id),
  }))

  // ── 6. Total revenue (from enrollments with stripe data) ──────────────────────
  // We don't store amount in enrollments yet, so derive from course prices
  const { data: paidEnrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .not("stripe_session_id", "is", null)
    .gte(cutoff ? "enrolled_at" : "id", cutoff ?? "")

  const { data: coursePrices } = await supabase
    .from("courses")
    .select("id, price")

  const priceMap: Record<string, number> = {}
  for (const c of coursePrices ?? []) priceMap[c.id] = c.price

  const estimatedRevenue = (paidEnrollments ?? []).reduce(
    (sum, e) => sum + (priceMap[e.course_id] ?? 0), 0
  )

  // ── 7. Discount code usage breakdown ─────────────────────────────────────────

  // Fetch all enrollments that had a discount code, with user email
  const { data: discountEnrollments } = await supabase
    .from("enrollments")
    .select("discount_code_id, course_id, enrolled_at, user_id")
    .not("discount_code_id", "is", null)

  // Fetch all discount codes for labelling
  const { data: allCodes } = await supabase
    .from("discount_codes")
    .select("id, code, discount_percent, discount_amount_eur, description")

  const codeMap: Record<string, { code: string; discount_percent: number | null; discount_amount_eur: number | null; description: string | null }> = {}
  for (const dc of allCodes ?? []) codeMap[dc.id] = dc

  // Aggregate per discount code
  const discountUsage: Record<string, {
    codeId: string; code: string; discount_percent: number | null; discount_amount_eur: number | null
    description: string | null; enrollmentCount: number; userIds: string[]
  }> = {}

  for (const e of discountEnrollments ?? []) {
    if (!e.discount_code_id) continue
    const meta = codeMap[e.discount_code_id]
    if (!discountUsage[e.discount_code_id]) {
      discountUsage[e.discount_code_id] = {
        codeId: e.discount_code_id,
        code: meta?.code ?? "unknown",
        discount_percent: meta?.discount_percent ?? null,
        discount_amount_eur: meta?.discount_amount_eur ?? null,
        description: meta?.description ?? null,
        enrollmentCount: 0,
        userIds: [],
      }
    }
    discountUsage[e.discount_code_id].enrollmentCount++
    if (!discountUsage[e.discount_code_id].userIds.includes(e.user_id)) {
      discountUsage[e.discount_code_id].userIds.push(e.user_id)
    }
  }

  const discountStats = Object.values(discountUsage)
    .sort((a, b) => b.enrollmentCount - a.enrollmentCount)

  // ─────────────────────────────────────────────────────────────────────────────
  return NextResponse.json({
    overview: {
      totalStudents:   totalStudents ?? 0,
      totalEnrollments: totalEnrollments ?? 0,
      completedCourses: completedCourses ?? 0,
      estimatedRevenue,
      windowDays: days,
    },
    chartData,
    courseStats,
    discountStats,
  })
}
