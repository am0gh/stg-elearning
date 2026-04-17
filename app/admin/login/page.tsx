"use client"

import { useState } from "react"

export default function AdminLoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [warning, setWarning] = useState("")
  const [loading, setLoading] = useState(false)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLocked) return

    setLoading(true)
    setError("")
    setWarning("")

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      // Hard navigation ensures the browser sends the fresh admin_session
      // cookie with the request rather than relying on the RSC soft-navigation.
      window.location.href = "/admin"
      return
    }

    const data = await res.json().catch(() => ({}))

    if (res.status === 429) {
      // Rate-limited — show lockout message and disable the form
      const retryAfter: number = data.retryAfter ?? 60
      setLockedUntil(Date.now() + retryAfter * 1000)
      const minutes = Math.ceil(retryAfter / 60)
      setError(
        `Too many failed attempts. This IP is locked out for ${minutes} minute${minutes !== 1 ? "s" : ""}.`
      )
    } else if (res.status === 401) {
      setError("Incorrect password")
      // Warn when the admin is getting close to a lockout
      if (typeof data.attemptsRemaining === "number" && data.attemptsRemaining <= 2) {
        setWarning(
          `${data.attemptsRemaining} attempt${data.attemptsRemaining !== 1 ? "s" : ""} remaining before a 15-minute lockout.`
        )
      }
    } else {
      setError("Something went wrong — please try again.")
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="mb-1 text-xl font-bold text-white">Admin</h1>
        <p className="mb-6 text-sm text-zinc-500">Salsa te Gusta — content management</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isLocked || loading}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none disabled:opacity-50"
              placeholder="Enter admin password"
              autoFocus
              required
            />
          </div>

          {warning && !error && (
            <p className="rounded-lg border border-amber-800 bg-amber-950/40 px-3 py-2 text-xs text-amber-400">
              ⚠ {warning}
            </p>
          )}

          {error && (
            <p className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || isLocked}
            className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in…" : isLocked ? "Locked out" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  )
}
