/**
 * GET /api/admin/enrollments
 * ─────────────────────────
 * Return all enrollments with student email, course title, and refund status.
 * Supports optional query params:
 *   ?course=<courseId>  — filter to one course
 *   ?refunded=1         — only refunded enrollments
 *   ?refunded=0         — only active enrollments
 *
 * Deliberately avoids relational joins (uses separate queries instead) so it
 * works regardless of whether foreign-key declarations exist in the DB schema.
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const courseFilter   = searchParams.get("course")
  const refundedFilter = searchParams.get("refunded") // "0" | "1" | null

  const admin = createAdminClient()

  // ── 1. Fetch enrollments (flat, no joins) ─────────────────────────────────
  // Select only the columns that definitely exist. refunded_at may not exist
  // yet if the migration hasn't been run — we handle that gracefully below.
  let query = admin
    .from("enrollments")
    .select("id, user_id, course_id, enrolled_at, completed_at, enrollment_source, discount_code_id")
    .order("enrolled_at", { ascending: false })

  if (courseFilter) query = query.eq("course_id", courseFilter)

  const { data: rows, error } = await query

  if (error) {
    console.error("[admin/enrollments GET] enrollments query:", error)
    return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 })
  }

  // ── 2. Optionally fetch refunded_at (only if column exists) ───────────────
  // We attempt a separate query for refunded_at to isolate migration-dependent
  // data from the core data fetch above.
  const refundedAtMap: Record<string, string | null> = {}
  if ((rows ?? []).length > 0) {
    const ids = (rows ?? []).map(r => r.id)
    const refundResult = await admin
      .from("enrollments")
      .select("id, refunded_at")
      .in("id", ids)
    const refundRows = refundResult.error ? null : refundResult.data

    for (const r of refundRows ?? []) {
      refundedAtMap[r.id] = r.refunded_at ?? null
    }
  }

  // Apply refunded filter in JS (after we have the data) so it works even if
  // the column was just added and we couldn't push the filter to the DB.
  let filtered = rows ?? []
  if (refundedFilter === "1") filtered = filtered.filter(r => !!refundedAtMap[r.id])
  if (refundedFilter === "0") filtered = filtered.filter(r => !refundedAtMap[r.id])

  // ── 3. Fetch course titles (single query, deduplicated) ───────────────────
  const courseIds = [...new Set(filtered.map(r => r.course_id))]
  const courseMap: Record<string, { title: string; level: string }> = {}

  if (courseIds.length > 0) {
    const { data: courses } = await admin
      .from("courses")
      .select("id, title, level")
      .in("id", courseIds)
    for (const c of courses ?? []) {
      courseMap[c.id] = { title: c.title, level: c.level }
    }
  }

  // ── 4. Fetch student emails from auth (single batch call) ─────────────────
  const emailMap: Record<string, string> = {}
  const nameMap:  Record<string, string> = {}

  if (filtered.length > 0) {
    try {
      // Supabase admin.auth.admin.listUsers returns up to 1 000 per page
      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
      for (const u of users) emailMap[u.id] = u.email ?? ""
    } catch (e) {
      console.error("[admin/enrollments GET] listUsers:", e)
    }

    // Also pull display names from profiles
    const userIds = [...new Set(filtered.map(r => r.user_id))]
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds)
    for (const p of profiles ?? []) {
      if (p.full_name) nameMap[p.id] = p.full_name
    }
  }

  // ── 5. Assemble response ──────────────────────────────────────────────────
  const enriched = filtered.map(e => ({
    id:               e.id,
    enrolledAt:       e.enrolled_at,
    completedAt:      e.completed_at,
    refundedAt:       refundedAtMap[e.id] ?? null,
    enrollmentSource: e.enrollment_source ?? null,
    userId:           e.user_id,
    userEmail:        emailMap[e.user_id] ?? "",
    userName:         nameMap[e.user_id] ?? null,
    courseId:         e.course_id,
    courseTitle:      courseMap[e.course_id]?.title ?? "",
    courseLevel:      courseMap[e.course_id]?.level ?? "",
  }))

  return NextResponse.json(enriched)
}
