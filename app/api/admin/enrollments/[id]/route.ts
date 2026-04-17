/**
 * PATCH /api/admin/enrollments/[id]
 * ────────────────────────────────
 * Toggle the refund status of an enrollment.
 *
 *   { action: "refund" }    — sets refunded_at to now, revoking course access
 *   { action: "reinstate" } — clears refunded_at, restoring course access
 *
 * Only the admin may call this route (cookie-based session check).
 * CSRF: Origin header is validated for all state-changing requests.
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"
import { validateAdminOrigin } from "@/lib/csrf"
import { z } from "zod"

export const dynamic = "force-dynamic"

const PatchSchema = z.object({
  action: z.enum(["refund", "reinstate"]),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── CSRF ──────────────────────────────────────────────────────────────────
  const csrfError = validateAdminOrigin(req)
  if (csrfError) return csrfError

  // ── Admin auth ────────────────────────────────────────────────────────────
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // ── Body validation ───────────────────────────────────────────────────────
  let raw: unknown
  try { raw = await req.json() }
  catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }) }

  const parsed = PatchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "action must be 'refund' or 'reinstate'" },
      { status: 422 }
    )
  }

  const { action } = parsed.data
  const { id: enrollmentId } = await params

  // ── Update enrollment ─────────────────────────────────────────────────────
  const admin = createAdminClient()

  const { data: enrollment, error: fetchError } = await admin
    .from("enrollments")
    .select("id, user_id, course_id, refunded_at")
    .eq("id", enrollmentId)
    .single()

  if (fetchError || !enrollment) {
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 })
  }

  const refunded_at = action === "refund" ? new Date().toISOString() : null

  const { error: updateError } = await admin
    .from("enrollments")
    .update({ refunded_at })
    .eq("id", enrollmentId)

  if (updateError) {
    console.error("[admin/enrollments] update error:", updateError)
    return NextResponse.json({ error: "Failed to update enrollment. Please try again." }, { status: 500 })
  }

  console.log(
    `[admin/enrollments] enrollment ${enrollmentId} ${action === "refund" ? "refunded" : "reinstated"}`
  )

  return NextResponse.json({ ok: true, action, refunded_at })
}
