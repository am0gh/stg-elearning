/**
 * GET /api/admin/enrollments
 * ─────────────────────────
 * Return all enrollments with student email, course title, and refund status.
 * Supports optional query params:
 *   ?course=<courseId>  — filter to one course
 *   ?refunded=1         — only refunded enrollments
 *   ?refunded=0         — only active enrollments
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    if (!await isAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const courseFilter   = searchParams.get("course")

    const admin = createAdminClient()

    // ── 1. Fetch enrollments — only guaranteed-stable columns ───────────────
    // Selecting only columns that have existed since the initial schema
    // avoids 400s if a migration hasn't been applied to this environment yet.
    const baseQuery = admin
      .from("enrollments")
      .select("id, user_id, course_id, enrolled_at, completed_at")
      .order("enrolled_at", { ascending: false })

    const { data: rows, error: enrollmentsError } = courseFilter
      ? await baseQuery.eq("course_id", courseFilter)
      : await baseQuery

    if (enrollmentsError) {
      console.error("[admin/enrollments] enrollments query failed:", enrollmentsError)
      return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 })
    }

    const allRows = rows ?? []
    const ids = allRows.map(r => r.id)

    // ── 2. Optional: discount_code_id (added in migration 20260417) ──────────
    const discountCodeMap: Record<string, boolean> = {}
    if (ids.length > 0) {
      const { data: discountRows } = await admin
        .from("enrollments")
        .select("id, discount_code_id")
        .in("id", ids)
      for (const r of discountRows ?? []) {
        const rAny = r as Record<string, unknown>
        discountCodeMap[r.id] = !!(rAny.discount_code_id)
      }
    }

    // ── 3. Optional: refunded_at (added in migration 20260417_enrollment_refunds) ──
    const refundedAtMap: Record<string, string | null> = {}
    if (ids.length > 0) {
      const { data: refundRows, error: refundError } = await admin
        .from("enrollments")
        .select("id, refunded_at")
        .in("id", ids)

      if (!refundError && refundRows) {
        for (const r of refundRows) {
          const rAny = r as Record<string, unknown>
          refundedAtMap[r.id] = (rAny.refunded_at as string | null) ?? null
        }
      }
      // If the column doesn't exist yet refundError is set — silently skip,
      // treat all enrollments as active (refundedAt: null).
    }

    // ── 3. Apply refunded filter in JS ────────────────────────────────────────
    const refundedFilter = searchParams.get("refunded")
    const filtered = allRows.filter(r => {
      if (refundedFilter === "1") return !!refundedAtMap[r.id]
      if (refundedFilter === "0") return !refundedAtMap[r.id]
      return true
    })

    // ── 4. Fetch course titles (single query, deduplicated) ──────────────────
    const courseMap: Record<string, { title: string; level: string }> = {}
    const courseIds = [...new Set(filtered.map(r => r.course_id))]

    if (courseIds.length > 0) {
      const { data: courses } = await admin
        .from("courses")
        .select("id, title, level")
        .in("id", courseIds)

      for (const c of courses ?? []) {
        courseMap[c.id] = { title: c.title, level: c.level ?? "" }
      }
    }

    // ── 5. Fetch student emails from auth (one batch call) ───────────────────
    const emailMap: Record<string, string> = {}
    const nameMap:  Record<string, string> = {}

    if (filtered.length > 0) {
      // auth.admin.listUsers requires service role key
      try {
        const listResponse = await admin.auth.admin.listUsers({ perPage: 1000 })
        const users = listResponse?.data?.users ?? []
        for (const u of users) {
          if (u.id && u.email) emailMap[u.id] = u.email
        }
      } catch (e) {
        console.error("[admin/enrollments] listUsers failed:", e)
        // Non-fatal — emails will be empty strings
      }

      // Pull display names from profiles table
      const userIds = [...new Set(filtered.map(r => r.user_id))]
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds)

      for (const p of profiles ?? []) {
        if (p.full_name) nameMap[p.id] = p.full_name
      }
    }

    // ── 6. Assemble response ─────────────────────────────────────────────────
    const enriched = filtered.map(e => ({
      id:               e.id,
      enrolledAt:       e.enrolled_at,
      completedAt:      e.completed_at ?? null,
      refundedAt:       refundedAtMap[e.id] ?? null,
      enrollmentSource: discountCodeMap[e.id] ? "discount" : "stripe",
      userId:           e.user_id,
      userEmail:        emailMap[e.user_id] ?? "",
      userName:         nameMap[e.user_id]  ?? null,
      courseId:         e.course_id,
      courseTitle:      courseMap[e.course_id]?.title ?? "",
      courseLevel:      courseMap[e.course_id]?.level ?? "",
    }))

    return NextResponse.json(enriched)

  } catch (err) {
    // Last-resort catch — log the real error server-side, return generic message
    console.error("[admin/enrollments] unhandled error:", err)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
