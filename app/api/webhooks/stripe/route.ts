/**
 * POST /api/webhooks/stripe
 * ──────────────────────────
 * Stripe sends signed events here after payment is confirmed.
 *
 * Handled events:
 *   checkout.session.completed → create enrollment + fire n8n notification
 *
 * Setup in Stripe Dashboard:
 *   Webhooks → Add endpoint → https://yourdomain.com/api/webhooks/stripe
 *   Events to listen to: checkout.session.completed
 *
 * IMPORTANT: Disable Next.js body parser for this route (raw body needed for
 * signature verification). We read the raw buffer below.
 */

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendNotification } from "@/lib/notifications"

export const runtime = "nodejs"

// Tell Next.js NOT to parse the body — Stripe needs the raw bytes to verify
export const dynamic = "force-dynamic"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
})

export async function POST(req: NextRequest) {
  const rawBody  = await req.text()
  const sig      = req.headers.get("stripe-signature")
  const secret   = process.env.STRIPE_WEBHOOK_SECRET!

  // ── Verify signature ─────────────────────────────────────────────────────────
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, secret)
  } catch (err) {
    console.error("[stripe-webhook] Invalid signature:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // ── Route events ─────────────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
  }

  return NextResponse.json({ received: true })
}

// ─── Handler ──────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {}
  const userId         = meta.user_id
  const courseId       = meta.course_id
  const discountCodeId = meta.discount_code_id || null
  const amountEur      = parseFloat(meta.amount_eur ?? "0")
  const discountPct    = parseInt(meta.discount_percent ?? "0", 10)

  if (!userId || !courseId) {
    console.error("[stripe-webhook] Missing metadata on session:", session.id)
    return
  }

  const admin = createAdminClient()

  // ── Idempotency: don't double-enroll ─────────────────────────────────────────
  const { data: existing } = await admin
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .single()

  if (existing) {
    console.log(`[stripe-webhook] Already enrolled user=${userId} course=${courseId}, skipping`)
    return
  }

  // ── Create enrollment ─────────────────────────────────────────────────────────
  const { error: enrollError } = await admin
    .from("enrollments")
    .insert({
      user_id:           userId,
      course_id:         courseId,
      stripe_session_id: session.id,
    })

  if (enrollError) {
    console.error("[stripe-webhook] Failed to create enrollment:", enrollError)
    return
  }

  console.log(`[stripe-webhook] ✓ Enrolled user=${userId} course=${courseId}`)

  // ── Increment discount code usage ─────────────────────────────────────────────
  if (discountCodeId) {
    await admin.rpc("increment_discount_usage", { code_id: discountCodeId }).then(({ error }) => {
      if (error) {
        // Fallback: manual increment
        admin
          .from("discount_codes")
          .select("uses_count")
          .eq("id", discountCodeId)
          .single()
          .then(({ data }) => {
            if (data) {
              admin
                .from("discount_codes")
                .update({ uses_count: (data.uses_count ?? 0) + 1 })
                .eq("id", discountCodeId)
            }
          })
      }
    })
  }

  // ── Fetch enrichment data for notification ────────────────────────────────────
  const [{ data: course }, { data: profile }] = await Promise.all([
    admin
      .from("courses")
      .select("title, level")
      .eq("id", courseId)
      .single(),
    admin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single(),
  ])

  // Get user email from auth.users
  const { data: { user: authUser } } = await admin.auth.admin.getUserById(userId)

  const email = authUser?.email ?? session.customer_email ?? ""
  const name  = profile?.full_name ?? authUser?.user_metadata?.full_name ?? ""

  // ── Fire n8n notification ─────────────────────────────────────────────────────
  await sendNotification({
    event: "enrollment.created",
    data: {
      user_id:          userId,
      email,
      name,
      course_id:        courseId,
      course_title:     course?.title ?? "",
      course_level:     course?.level ?? "",
      payment_method:   "stripe",
      amount_paid_eur:  amountEur,
      discount_code:    discountPct > 0 ? meta.discount_code_id : undefined,
      stripe_session_id: session.id,
    },
  })
}
