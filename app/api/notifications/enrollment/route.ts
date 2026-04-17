/**
 * POST /api/notifications/enrollment
 * ─────────────────────────────────────
 * Fires the enrollment.created notification for free / discount-code enrollments.
 * (Paid Stripe enrollments are handled by the Stripe webhook instead.)
 *
 * Body:
 *   courseId       string
 *   paymentMethod  "free" | "discount_code"
 *   discountCode?  string
 *   amountPaidEur  number  (0 for free)
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

  const { courseId, paymentMethod, discountCode, amountPaidEur } = await req.json()

  if (!courseId) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 })
  }

  const admin = createAdminClient()

  const [{ data: course }, { data: profile }] = await Promise.all([
    admin.from("courses").select("title, level").eq("id", courseId).single(),
    admin.from("profiles").select("full_name").eq("id", user.id).single(),
  ])

  const { data: { user: authUser } } = await admin.auth.admin.getUserById(user.id)
  const email = authUser?.email ?? user.email ?? ""
  const name  = profile?.full_name ?? authUser?.user_metadata?.full_name ?? ""

  await sendNotification({
    event: "enrollment.created",
    data: {
      user_id:         user.id,
      email,
      name,
      course_id:       courseId,
      course_title:    course?.title ?? "",
      course_level:    course?.level ?? "",
      payment_method:  paymentMethod ?? "free",
      amount_paid_eur: amountPaidEur ?? 0,
      discount_code:   discountCode,
    },
  })

  return NextResponse.json({ ok: true })
}
