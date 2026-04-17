/**
 * DELETE /api/account/delete
 * ───────────────────────────
 * GDPR "right to erasure" — permanently deletes the authenticated user's
 * account and all associated personal data.
 *
 * Data deleted (in order):
 *   1. lesson_progress rows
 *   2. enrollments rows
 *   3. profiles row
 *   4. auth.users record (via Supabase admin API — this is irreversible)
 *
 * The student must confirm with their email address to prevent accidental
 * deletion triggered by CSRF or a stray click.
 *
 * Returns 200 on success. The client should immediately redirect to / and
 * clear any local state (the session cookie is invalidated server-side).
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function DELETE(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // ── Confirmation check ───────────────────────────────────────────────────────
  // Student must submit their email address to confirm. This prevents accidental
  // deletion and provides a lightweight CSRF barrier on top of sameSite cookies.
  const body = await req.json().catch(() => ({}))
  const { confirmEmail } = body

  if (typeof confirmEmail !== "string" || confirmEmail.trim().toLowerCase() !== user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "Email address does not match. Please type your email exactly to confirm deletion." },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const userId = user.id

  // ── Delete user data ─────────────────────────────────────────────────────────
  // Order matters — foreign key constraints (lessons → enrollments → profiles)
  // must be respected. The admin client bypasses RLS.

  // 1. Lesson progress
  const { error: progressError } = await admin
    .from("lesson_progress")
    .delete()
    .eq("user_id", userId)

  if (progressError) {
    console.error("[account/delete] lesson_progress error:", progressError)
    return NextResponse.json({ error: "Failed to delete account data. Please try again." }, { status: 500 })
  }

  // 2. Enrollments
  const { error: enrollmentError } = await admin
    .from("enrollments")
    .delete()
    .eq("user_id", userId)

  if (enrollmentError) {
    console.error("[account/delete] enrollments error:", enrollmentError)
    return NextResponse.json({ error: "Failed to delete account data. Please try again." }, { status: 500 })
  }

  // 3. Profile
  const { error: profileError } = await admin
    .from("profiles")
    .delete()
    .eq("id", userId)

  if (profileError) {
    console.error("[account/delete] profiles error:", profileError)
    return NextResponse.json({ error: "Failed to delete account data. Please try again." }, { status: 500 })
  }

  // 4. Auth user — this is the point of no return
  const { error: authError } = await admin.auth.admin.deleteUser(userId)

  if (authError) {
    console.error("[account/delete] auth.users error:", authError)
    // Profile/progress/enrollments are already deleted at this point.
    // Log for manual cleanup — don't expose the raw error to the client.
    return NextResponse.json(
      { error: "Account data was cleared but the auth record could not be deleted. Please contact support." },
      { status: 500 }
    )
  }

  // ── Invalidate session ───────────────────────────────────────────────────────
  // Sign the user out so the session cookie is cleared.
  await supabase.auth.signOut()

  console.log(`[account/delete] User ${userId} account permanently deleted`)
  return NextResponse.json({ ok: true })
}
