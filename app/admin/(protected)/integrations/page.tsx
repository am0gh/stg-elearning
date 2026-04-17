"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, ExternalLink, Loader2, Save, Webhook, Zap } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookEvent {
  event: string
  description: string
  payload_example: object
}

const WEBHOOK_EVENTS: WebhookEvent[] = [
  {
    event: "user.signup",
    description: "Fired after a new student confirms their email address.",
    payload_example: {
      event: "user.signup",
      timestamp: "2026-04-17T10:00:00.000Z",
      data: { user_id: "uuid", email: "student@example.com", name: "Maria" },
    },
  },
  {
    event: "enrollment.created",
    description: "Fired after a student successfully enrolls (free, discount, or paid via Stripe).",
    payload_example: {
      event: "enrollment.created",
      timestamp: "2026-04-17T10:05:00.000Z",
      data: {
        user_id: "uuid", email: "student@example.com", name: "Maria",
        course_id: "uuid", course_title: "Level 1 Salsa", course_level: "level-1",
        payment_method: "stripe", amount_paid_eur: 89, discount_code: null,
        stripe_session_id: "cs_live_...",
      },
    },
  },
  {
    event: "course.completed",
    description: "Fired when a student finishes all lessons in a course.",
    payload_example: {
      event: "course.completed",
      timestamp: "2026-04-17T14:00:00.000Z",
      data: {
        user_id: "uuid", email: "student@example.com", name: "Maria",
        course_id: "uuid", course_title: "Level 1 Salsa", lessons_completed: 8,
      },
    },
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [webhookUrl, setWebhookUrl] = useState("")
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [testingEvent, setTestingEvent] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, "ok" | "error">>({})
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)

  // ── Load current URL from settings ────────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/integrations")
      .then(r => r.json())
      .then(data => {
        if (data.n8n_webhook_url) setWebhookUrl(data.n8n_webhook_url)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // ── Save webhook URL ───────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await fetch("/api/admin/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ n8n_webhook_url: webhookUrl.trim() }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // ── Send a test event ──────────────────────────────────────────────────────
  const handleTest = async (event: WebhookEvent) => {
    if (!webhookUrl.trim()) {
      alert("Save a webhook URL first before testing.")
      return
    }
    setTestingEvent(event.event)
    try {
      const res = await fetch("/api/admin/integrations/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: event.event }),
      })
      setTestResults(prev => ({ ...prev, [event.event]: res.ok ? "ok" : "error" }))
    } catch {
      setTestResults(prev => ({ ...prev, [event.event]: "error" }))
    } finally {
      setTestingEvent(null)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Integrations</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Connect to n8n to send transactional emails via Klaviyo, Flodesk, or any platform.
        </p>
      </div>

      {/* ── n8n Webhook URL ── */}
      <section className="mb-10 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Webhook className="h-5 w-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">n8n Webhook URL</h2>
        </div>

        <p className="mb-5 text-sm text-zinc-400">
          Paste your n8n &quot;Webhook&quot; trigger URL here. Every time a student signs up,
          enrolls, or completes a course, this URL will receive a POST request with
          structured event data. You can then route it to any email platform.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <div className="flex gap-3">
            <input
              type="url"
              value={webhookUrl}
              onChange={e => { setWebhookUrl(e.target.value); setSaved(false) }}
              placeholder="https://your-n8n.example.com/webhook/abc123"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold disabled:opacity-50"
              style={{ background: "#C9A227", color: "#0a0a0a" }}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saved ? "Saved!" : "Save"}
            </button>
          </div>
        )}

        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Quick setup guide</p>
          <ol className="space-y-1.5 text-sm text-zinc-400">
            <li>1. In n8n, create a new workflow and add a <strong className="text-white">Webhook</strong> trigger node</li>
            <li>2. Set method to <strong className="text-white">POST</strong>, copy the URL and paste it above</li>
            <li>3. Connect nodes to your email platform (Klaviyo, Flodesk, etc.)</li>
            <li>4. Use the <strong className="text-white">event</strong> field to route different events to different flows</li>
          </ol>
        </div>
      </section>

      {/* ── Events ── */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">Webhook Events</h2>
        </div>
        <p className="mb-5 text-sm text-zinc-400">
          These events are fired automatically. Use the test buttons to send a sample payload to your n8n workflow.
        </p>

        <div className="space-y-3">
          {WEBHOOK_EVENTS.map(ev => {
            const result   = testResults[ev.event]
            const isExpanded = expandedEvent === ev.event

            return (
              <div
                key={ev.event}
                className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-mono font-bold text-amber-400">
                        {ev.event}
                      </code>
                      {result === "ok" && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-400">
                          <CheckCircle2 className="h-3 w-3" /> Delivered
                        </span>
                      )}
                      {result === "error" && (
                        <span className="text-xs font-semibold text-red-400">
                          ✕ Failed — check your n8n URL
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-zinc-400">{ev.description}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => setExpandedEvent(isExpanded ? null : ev.event)}
                      className="rounded px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white"
                      style={{ border: "1px solid rgb(63 63 70)" }}
                    >
                      {isExpanded ? "Hide" : "Payload"}
                    </button>
                    <button
                      onClick={() => handleTest(ev)}
                      disabled={testingEvent === ev.event}
                      className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                      style={{ background: "rgba(201,162,39,0.12)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.25)" }}
                    >
                      {testingEvent === ev.event ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ExternalLink className="h-3 w-3" />
                      )}
                      Test
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-zinc-800 bg-zinc-950 p-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-600">Example payload</p>
                    <pre className="overflow-x-auto rounded text-xs text-zinc-300">
                      {JSON.stringify(ev.payload_example, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
