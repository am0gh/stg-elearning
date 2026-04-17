"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag, Copy, Check, CalendarRange } from "lucide-react"

interface DiscountCode {
  id: string
  code: string
  description: string | null
  discount_percent: number | null
  discount_amount_eur: number | null
  is_active: boolean
  max_uses: number | null
  max_uses_per_user: number | null
  uses_count: number
  starts_at: string | null
  expires_at: string | null
  created_at: string
}

type DiscountType = "percent" | "amount"

interface FormState {
  code: string
  description: string
  discount_type: DiscountType
  discount_percent: string
  discount_amount_eur: string
  max_uses: string
  max_uses_per_user: string
  starts_at: string
  expires_at: string
}

const emptyForm: FormState = {
  code: "",
  description: "",
  discount_type: "percent",
  discount_percent: "",
  discount_amount_eur: "",
  max_uses: "",
  max_uses_per_user: "",
  starts_at: "",
  expires_at: "",
}

function discountLabel(code: DiscountCode): string {
  if (code.discount_amount_eur !== null) return `€${Number(code.discount_amount_eur).toFixed(2)} off`
  if (code.discount_percent !== null) return `${code.discount_percent}% off`
  return "—"
}

function discountColor(code: DiscountCode): string {
  if (code.discount_percent === 100) return "#22c55e"
  return "#C9A227"
}

function formatDate(dt: string | null, fallback = "—") {
  if (!dt) return fallback
  return new Date(dt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function dateStatus(code: DiscountCode): { label: string; color: string } {
  const now = new Date()
  if (!code.is_active) return { label: "Inactive", color: "#71717a" }
  if (code.starts_at && new Date(code.starts_at) > now) return { label: "Scheduled", color: "#60a5fa" }
  if (code.expires_at && new Date(code.expires_at) < now) return { label: "Expired", color: "#f87171" }
  if (code.max_uses !== null && code.uses_count >= code.max_uses) return { label: "Exhausted", color: "#f87171" }
  return { label: "Active", color: "#22c55e" }
}

export default function DiscountsPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([])
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [migrating, setMigrating] = useState(false)
  const [migrateMsg, setMigrateMsg] = useState<string | null>(null)

  const fetchCodes = async () => {
    setLoading(true)
    const res = await fetch("/api/admin/discounts")
    if (res.ok) {
      setCodes(await res.json())
      setTableError(false)
    } else {
      setTableError(true)
    }
    setLoading(false)
  }

  const handleRunMigration = async () => {
    setMigrating(true)
    setMigrateMsg(null)
    const res = await fetch("/api/admin/setup-discounts", { method: "POST" })
    const data = await res.json()
    if (res.ok) {
      setMigrateMsg(`✓ Setup complete — ${data.seeded} seeded.`)
      await fetchCodes()
    } else {
      setMigrateMsg(`⚠ ${data.hint ?? data.error}`)
    }
    setMigrating(false)
  }

  useEffect(() => { fetchCodes() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload: Record<string, unknown> = {
      code: form.code.trim().toLowerCase(),
      description: form.description || null,
      discount_percent: null,
      discount_amount_eur: null,
    }

    if (form.discount_type === "percent") {
      payload.discount_percent = Number(form.discount_percent)
    } else {
      payload.discount_amount_eur = Number(form.discount_amount_eur)
    }

    if (form.max_uses) payload.max_uses = Number(form.max_uses)
    if (form.max_uses_per_user) payload.max_uses_per_user = Number(form.max_uses_per_user)
    if (form.starts_at) payload.starts_at = new Date(form.starts_at).toISOString()
    if (form.expires_at) payload.expires_at = new Date(form.expires_at).toISOString()

    const res = await fetch("/api/admin/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? "Something went wrong")
    } else {
      setCodes(prev => [data, ...prev])
      setForm(emptyForm)
      setShowForm(false)
    }
    setSaving(false)
  }

  const handleToggle = async (code: DiscountCode) => {
    const res = await fetch(`/api/admin/discounts/${code.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !code.is_active }),
    })
    if (res.ok) {
      setCodes(prev => prev.map(c => c.id === code.id ? { ...c, is_active: !c.is_active } : c))
    }
  }

  const handleDelete = async (code: DiscountCode) => {
    if (!confirm(`Delete discount code "${code.code}"? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/discounts/${code.id}`, { method: "DELETE" })
    if (res.ok || res.status === 204) {
      setCodes(prev => prev.filter(c => c.id !== code.id))
    }
  }

  const copyCode = async (code: DiscountCode) => {
    await navigator.clipboard.writeText(code.code)
    setCopiedId(code.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Discount Codes</h1>
          <p className="mt-1 text-sm text-zinc-500">Create and manage promotional codes for your courses</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setError(null) }}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          New Code
        </button>
      </div>

      {/* First-time setup banner */}
      {(tableError || migrateMsg) && (
        <div
          className="mb-6 rounded-xl border p-4"
          style={{
            borderColor: migrateMsg?.startsWith("✓") ? "rgba(34,197,94,0.4)" : "rgba(201,162,39,0.4)",
            background: migrateMsg?.startsWith("✓") ? "rgba(34,197,94,0.08)" : "rgba(201,162,39,0.08)",
          }}
        >
          {tableError && !migrateMsg && (
            <div>
              <p className="mb-2 text-sm font-semibold text-amber-400">Database table not found</p>
              <p className="mb-3 text-sm text-zinc-400">
                Click below to create the <code className="rounded bg-zinc-800 px-1 text-xs">discount_codes</code> table
                and seed the <code className="rounded bg-zinc-800 px-1 text-xs">testingphase</code> code automatically.
              </p>
              <button
                onClick={handleRunMigration}
                disabled={migrating}
                className="rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50"
                style={{ background: "#C9A227", color: "#0a0a0a" }}
              >
                {migrating ? "Setting up…" : "Run Setup"}
              </button>
            </div>
          )}
          {migrateMsg && (
            <p className="text-sm font-medium" style={{ color: migrateMsg.startsWith("✓") ? "#22c55e" : "#C9A227" }}>
              {migrateMsg}
            </p>
          )}
        </div>
      )}

      {/* ── Create form ─────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="mb-8 rounded-xl border border-zinc-700 bg-zinc-900 p-6">
          <h2 className="mb-5 font-semibold text-white">New Discount Code</h2>
          <form onSubmit={handleCreate} className="space-y-5">

            {/* Row 1: code + discount */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Code <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. SUMMER25"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-zinc-600">Stored lowercase · case-insensitive for students</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Discount <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 p-0.5">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, discount_type: "percent", discount_amount_eur: "" }))}
                      className="rounded-md px-3 py-1.5 text-sm font-bold transition-colors"
                      style={form.discount_type === "percent" ? { background: "#C9A227", color: "#0a0a0a" } : { color: "#71717a" }}
                    >%</button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, discount_type: "amount", discount_percent: "" }))}
                      className="rounded-md px-3 py-1.5 text-sm font-bold transition-colors"
                      style={form.discount_type === "amount" ? { background: "#C9A227", color: "#0a0a0a" } : { color: "#71717a" }}
                    >€</button>
                  </div>
                  {form.discount_type === "percent" ? (
                    <input
                      type="number" placeholder="0 – 100" min={0} max={100}
                      value={form.discount_percent}
                      onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))}
                      required
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                    />
                  ) : (
                    <input
                      type="number" placeholder="e.g. 20.00" min={0.01} step={0.01}
                      value={form.discount_amount_eur}
                      onChange={e => setForm(f => ({ ...f, discount_amount_eur: e.target.value }))}
                      required
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                    />
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-600">
                  {form.discount_type === "percent" ? "Enter 100 for a fully free code" : "Fixed amount deducted from course price"}
                </p>
              </div>
            </div>

            {/* Row 2: description + max uses + max uses per user */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">Description</label>
                <input
                  type="text" placeholder="e.g. Summer sale 2026"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">Max Uses (total)</label>
                <input
                  type="number" placeholder="Unlimited" min={1}
                  value={form.max_uses}
                  onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-zinc-600">Across all users combined</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">Max Uses (per user)</label>
                <input
                  type="number" placeholder="Unlimited" min={1}
                  value={form.max_uses_per_user}
                  onChange={e => setForm(f => ({ ...f, max_uses_per_user: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-zinc-600">Per individual account</p>
              </div>
            </div>

            {/* Row 3: start date + end date */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <CalendarRange className="h-3.5 w-3.5" /> Start Date
                </label>
                <input
                  type="date"
                  value={form.starts_at}
                  onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none [color-scheme:dark]"
                />
                <p className="mt-1 text-xs text-zinc-600">Leave blank to activate immediately.</p>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <CalendarRange className="h-3.5 w-3.5" /> End Date
                </label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none [color-scheme:dark]"
                />
                <p className="mt-1 text-xs text-zinc-600">Leave blank to never expire.</p>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit" disabled={saving}
                className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create Code"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null); setForm(emptyForm) }}
                className="text-sm text-zinc-500 hover:text-white"
              >Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-6 py-4">
          <h2 className="font-semibold text-white">All Codes</h2>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-zinc-500 text-sm">Loading…</div>
        ) : codes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Tag className="mx-auto mb-3 h-8 w-8 text-zinc-700" />
            <p className="text-zinc-500">No discount codes yet.</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-amber-500 hover:text-amber-400">
              Create your first code →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_100px_100px_110px_110px_90px_48px] gap-3 px-6 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-600">
              <span>Code</span>
              <span>Discount</span>
              <span>Uses</span>
              <span>Start Date</span>
              <span>End Date</span>
              <span>Status</span>
              <span />
            </div>

            {codes.map(code => {
              const status = dateStatus(code)
              return (
                <div
                  key={code.id}
                  className="grid grid-cols-[1fr_100px_100px_110px_110px_90px_48px] items-center gap-3 px-6 py-4"
                >
                  {/* Code + description */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-sm font-bold text-amber-400">
                        {code.code}
                      </span>
                      <button onClick={() => copyCode(code)} className="text-zinc-600 hover:text-zinc-400" title="Copy code">
                        {copiedId === code.id
                          ? <Check className="h-3.5 w-3.5 text-green-500" />
                          : <Copy className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>
                    {code.description && (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">{code.description}</p>
                    )}
                  </div>

                  {/* Discount value */}
                  <span className="text-sm font-bold tabular-nums" style={{ color: discountColor(code) }}>
                    {discountLabel(code)}
                  </span>

                  {/* Uses */}
                  <div>
                    <span className="text-sm text-zinc-400 tabular-nums">
                      {code.uses_count}
                      {code.max_uses !== null && <span className="text-zinc-600">/{code.max_uses}</span>}
                    </span>
                    {code.max_uses_per_user !== null && (
                      <p className="mt-0.5 text-xs text-zinc-600">
                        max {code.max_uses_per_user}/user
                      </p>
                    )}
                  </div>

                  {/* Start date */}
                  <span className="text-sm text-zinc-400">{formatDate(code.starts_at, "Immediately")}</span>

                  {/* End date */}
                  <span className="text-sm text-zinc-400">{formatDate(code.expires_at, "Never")}</span>

                  {/* Status */}
                  <button
                    onClick={() => handleToggle(code)}
                    className="flex items-center gap-1 text-xs font-semibold"
                    style={{ color: status.color }}
                    title="Click to toggle active/inactive"
                  >
                    {code.is_active
                      ? <ToggleRight className="h-4 w-4 shrink-0" />
                      : <ToggleLeft className="h-4 w-4 shrink-0" />
                    }
                    {status.label}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(code)}
                    className="ml-auto text-zinc-600 hover:text-red-400"
                    title="Delete code"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
