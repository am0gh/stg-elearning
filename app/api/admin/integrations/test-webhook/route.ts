/**
 * POST /api/admin/integrations/test-webhook
 * ────────────────────────────────────────────
 * Sends a test payload for a given event type to the configured n8n webhook URL.
 * Used by the admin integrations panel.
 *
 * Body: { event: "user.signup" | "enrollment.created" | "course.completed" }
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"

const TEST_PAYLOADS: Record<string, object> = {
  "user.signup": {
    event: "user.signup",
    timestamp: new Date().toISOString(),
    _test: true,
    data: {
      user_id: "00000000-0000-0000-0000-000000000001",
      email: "test-student@salsategusta.nl",
      name: "Test Student",
    },
  },
  "enrollment.created": {
    event: "enrollment.created",
    timestamp: new Date().toISOString(),
    _test: true,
    data: {
      user_id: "00000000-0000-0000-0000-000000000001",
      email: "test-student@salsategusta.nl",
      name: "Test Student",
      course_id: "00000000-0000-0000-0000-000000000002",
      course_title: "Level 1 Salsa",
      course_level: "level-1",
      payment_method: "stripe",
      amount_paid_eur: 89,
      discount_code: null,
    },
  },
  "course.completed": {
    event: "course.completed",
    timestamp: new Date().toISOString(),
    _test: true,
    data: {
      user_id: "00000000-0000-0000-0000-000000000001",
      email: "test-student@salsategusta.nl",
      name: "Test Student",
      course_id: "00000000-0000-0000-0000-000000000002",
      course_title: "Level 1 Salsa",
      lessons_completed: 8,
    },
  },
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { event } = await req.json()

  if (!event || !(event in TEST_PAYLOADS)) {
    return NextResponse.json({ error: "Unknown event type" }, { status: 400 })
  }

  // Read webhook URL from site_settings
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "n8n_webhook_url")
    .single()

  const webhookUrl = data?.value as string | undefined

  if (!webhookUrl) {
    return NextResponse.json({ error: "No webhook URL configured" }, { status: 400 })
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(TEST_PAYLOADS[event]),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `n8n returned ${res.status}` },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to reach webhook URL" },
      { status: 502 }
    )
  }
}
