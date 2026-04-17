/**
 * POST /api/checkout/create-session
 * ───────────────────────────────────
 * Creates a Stripe Checkout Session for a paid course enrolment.
 *
 * Body: { courseId: string, discountCodeId?: string, discountPercent?: number }
 *
 * Returns: { url: string }  — the Stripe-hosted checkout URL.
 * The client should window.location.href = url to redirect the user.
 */

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
})

export async function POST(req: NextRequest) {
  // ── Auth: must be logged in ──────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────────
  const { courseId, discountCodeId, discountPercent } = await req.json()

  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 })
  }

  // ── Fetch course ──────────────────────────────────────────────────────────────
  const admin = createAdminClient()
  const { data: course, error: courseError } = await admin
    .from("courses")
    .select("id, title, level, price, thumbnail_url")
    .eq("id", courseId)
    .eq("is_published", true)
    .single()

  if (courseError || !course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 })
  }

  // ── Guard: already enrolled? ──────────────────────────────────────────────────
  const { data: existing } = await admin
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single()

  if (existing) {
    return NextResponse.json({ error: "Already enrolled" }, { status: 409 })
  }

  // ── Calculate effective price (cents) ────────────────────────────────────────
  const basePriceEur = course.price            // e.g. 89
  const discount     = discountPercent ?? 0    // e.g. 50 → 50%
  const effectiveEur = Math.round(basePriceEur * (1 - discount / 100) * 100) / 100
  const amountCents  = Math.round(effectiveEur * 100)

  // Safety: if somehow 0 or negative, reject (free enrollments should use the
  // direct enroll path, not Stripe)
  if (amountCents <= 0) {
    return NextResponse.json(
      { error: "Use direct enrollment for free courses" },
      { status: 400 }
    )
  }

  // ── App base URL ─────────────────────────────────────────────────────────────
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`

  // ── Create Stripe Checkout Session ───────────────────────────────────────────
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "ideal", "sepa_debit"],
      currency: "eur",

      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: amountCents,
            product_data: {
              name: course.title,
              description: `Level ${course.level} — Salsa te Gusta`,
              images: course.thumbnail_url ? [course.thumbnail_url] : [],
            },
          },
          quantity: 1,
        },
      ],

      // Pass IDs so the webhook can create the enrollment
      metadata: {
        user_id:          user.id,
        course_id:        courseId,
        discount_code_id: discountCodeId ?? "",
        discount_percent: String(discount),
        amount_eur:       String(effectiveEur),
      },

      customer_email: user.email,

      success_url: `${origin}/courses/${courseId}/learn?enrolled=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/courses/${courseId}`,

      // Allow 30 minutes for checkout
      expires_at: Math.floor(Date.now() / 1000) + 60 * 30,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error("[checkout] Stripe session creation failed:", err)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
