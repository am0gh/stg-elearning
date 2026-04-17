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
 *
 * Reliability:
 *   Retries up to MAX_RETRIES times with exponential back-off.
 *   All errors are swallowed so a webhook failure never breaks the user flow.
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

// ─── Retry config ─────────────────────────────────────────────────────────────

/** Maximum number of delivery attempts (1 initial + N-1 retries) */
const MAX_RETRIES = 3

/** Per-attempt timeout in milliseconds */
const ATTEMPT_TIMEOUT_MS = 8_000

/**
 * Delay before the Nth retry (0-indexed).
 * Exponential back-off: 1s → 2s → 4s …
 */
function retryDelayMs(attempt: number): number {
  return Math.min(1_000 * 2 ** attempt, 30_000)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Core dispatcher ──────────────────────────────────────────────────────────

/**
 * Sends a webhook event to n8n with automatic retry on transient failures.
 *
 * Fire-and-forget — never throws, so a webhook failure never breaks the
 * user-facing flow. Errors are logged server-side for debugging.
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
      console.log(`[notifications] n8n webhook not configured, skipping: ${notification.event}`)
      return
    }

    const payload = {
      event: notification.event,
      timestamp: new Date().toISOString(),
      data: notification.data,
    }

    let lastError: unknown

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = retryDelayMs(attempt - 1)
        console.log(`[notifications] retrying ${notification.event} (attempt ${attempt + 1}/${MAX_RETRIES}) in ${delay}ms`)
        await sleep(delay)
      }

      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        })

        if (res.ok) {
          console.log(`[notifications] ✓ fired ${notification.event}${attempt > 0 ? ` (after ${attempt} retries)` : ""}`)
          return
        }

        // 4xx errors from the webhook endpoint are client errors — don't retry
        if (res.status >= 400 && res.status < 500) {
          console.error(`[notifications] ${notification.event} rejected by webhook (${res.status}) — not retrying`)
          return
        }

        // 5xx — server-side error, worth retrying
        lastError = new Error(`HTTP ${res.status}`)
        console.warn(`[notifications] ${notification.event} got ${res.status} on attempt ${attempt + 1}`)

      } catch (err) {
        // Network error, timeout, DNS failure — all worth retrying
        lastError = err
        console.warn(`[notifications] ${notification.event} network error on attempt ${attempt + 1}:`, err)
      }
    }

    // All attempts exhausted
    console.error(
      `[notifications] ✗ giving up on ${notification.event} after ${MAX_RETRIES} attempts. Last error:`,
      lastError
    )

  } catch (err) {
    // Outermost catch — e.g. Supabase error reading the webhook URL
    console.error(`[notifications] unexpected error for ${notification.event}:`, err)
  }
}
