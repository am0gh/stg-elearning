/**
 * n8n Webhook Dispatcher
 * ──────────────────────
 * Fires structured events to your n8n webhook URL so you can route them
 * to Klaviyo, Flodesk, or any other platform — without touching this code.
 *
 * The webhook URL is stored in `site_settings` (key: n8n_webhook_url) so
 * admins can update it from the admin panel without a redeploy.
 *
 * Events fired:
 *   user.signup          → after email confirmation
 *   enrollment.created   → after free enroll OR successful Stripe payment
 *   course.completed     → when student finishes all lessons
 */

import { createAdminClient } from "@/lib/supabase/admin"

// ─── Event type definitions ────────────────────────────────────────────────────

export type NotificationEvent =
  | {
      event: "user.signup"
      data: {
        user_id: string
        email: string
        name: string
      }
    }
  | {
      event: "enrollment.created"
      data: {
        user_id: string
        email: string
        name: string
        course_id: string
        course_title: string
        course_level: string
        payment_method: "stripe" | "free" | "discount_code"
        amount_paid_eur: number
        discount_code?: string
        stripe_session_id?: string
      }
    }
  | {
      event: "course.completed"
      data: {
        user_id: string
        email: string
        name: string
        course_id: string
        course_title: string
        lessons_completed: number
      }
    }

// ─── Core dispatcher ──────────────────────────────────────────────────────────

/**
 * Sends a webhook event to n8n. Fire-and-forget — never throws,
 * so a webhook failure never breaks the user-facing flow.
 */
export async function sendNotification(notification: NotificationEvent): Promise<void> {
  try {
    // Read webhook URL from site_settings so admins can change it without redeploy
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "n8n_webhook_url")
      .single()

    const webhookUrl = data?.value as string | undefined

    if (!webhookUrl) {
      // Not configured yet — log quietly and return
      console.log(`[notifications] n8n webhook not configured, skipping event: ${notification.event}`)
      return
    }

    const payload = {
      event: notification.event,
      timestamp: new Date().toISOString(),
      data: notification.data,
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Abort if n8n takes too long — never block the main request
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.error(`[notifications] n8n webhook returned ${res.status} for event: ${notification.event}`)
    } else {
      console.log(`[notifications] ✓ fired ${notification.event}`)
    }
  } catch (err) {
    // Swallow all errors — webhook failure should never crash the app
    console.error(`[notifications] failed to send ${notification.event}:`, err)
  }
}
