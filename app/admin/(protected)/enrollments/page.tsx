"use client"

/**
 * /admin/enrollments
 * ──────────────────
 * Full enrollment list with refund / reinstate controls.
 *
 * Columns: student email, course, enrolled date, source, status, actions
 * Filters: All / Active / Refunded
 */

import { useEffect, useState, useCallback } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Enrollment {
  id:               string
  enrolledAt:       string
  completedAt:      string | null
  refundedAt:       string | null
  enrollmentSource: string | null
  userId:           string
  userEmail:        string
  userName:         string | null
  courseId:         string
  courseTitle:      string
  courseLevel:      string
}

type Filter = "all" | "active" | "refunded"

// ─── Component ────────────────────────────────────────────────────────────────

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [filter, setFilter]           = useState<Filter>("all")
  const [search, setSearch]           = useState("")
  const [actionId, setActionId]       = useState<string | null>(null) // row being acted on

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchEnrollments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filter === "active")   params.set("refunded", "0")
      if (filter === "refunded") params.set("refunded", "1")

      const res = await fetch(`/api/admin/enrollments?${params}`)
      if (!res.ok) throw new Error("Failed to fetch enrollments")
      const data: Enrollment[] = await res.json()
      setEnrollments(data)
    } catch {
      setError("Could not load enrollments. Please refresh the page.")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchEnrollments() }, [fetchEnrollments])

  // ── Refund / reinstate action ──────────────────────────────────────────────

  const handleAction = async (enrollment: Enrollment, action: "refund" | "reinstate") => {
    const verb = action === "refund" ? "refund" : "reinstate"
    const confirmed = window.confirm(
      action === "refund"
        ? `Refund enrollment for ${enrollment.userEmail} in "${enrollment.courseTitle}"?\n\nThis will immediately revoke their course access.`
        : `Reinstate enrollment for ${enrollment.userEmail} in "${enrollment.courseTitle}"?\n\nThis will restore their course access.`
    )
    if (!confirmed) return

    setActionId(enrollment.id)
    try {
      const res = await fetch(`/api/admin/enrollments/${enrollment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? `Failed to ${verb} enrollment`)
        return
      }
      // Optimistically update row in local state
      setEnrollments(prev =>
        prev.map(e =>
          e.id === enrollment.id
            ? { ...e, refundedAt: action === "refund" ? new Date().toISOString() : null }
            : e
        )
      )
    } catch {
      alert(`Something went wrong. Please try again.`)
    } finally {
      setActionId(null)
    }
  }

  // ── Filtering / search ─────────────────────────────────────────────────────

  const visible = enrollments.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      e.userEmail.toLowerCase().includes(q) ||
      (e.userName ?? "").toLowerCase().includes(q) ||
      e.courseTitle.toLowerCase().includes(q)
    )
  })

  // ── Counts ─────────────────────────────────────────────────────────────────

  const totalCount    = enrollments.length
  const activeCount   = enrollments.filter(e => !e.refundedAt).length
  const refundedCount = enrollments.filter(e =>  e.refundedAt).length

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Enrollments</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage student access · refund or reinstate enrollments
          </p>
        </div>
        <button
          onClick={fetchEnrollments}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex items-center gap-1 rounded-lg bg-zinc-900 p-1 w-fit">
        {(["all", "active", "refunded"] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded px-3.5 py-1.5 text-sm font-semibold capitalize transition-colors ${
              filter === f
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {f === "all"      && `All (${totalCount})`}
            {f === "active"   && `Active (${activeCount})`}
            {f === "refunded" && `Refunded (${refundedCount})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by email, name or course…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading enrollments…
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center text-sm text-zinc-500">
          {search ? "No enrollments match your search." : "No enrollments found."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Student</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Course</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Enrolled</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 bg-zinc-950">
              {visible.map(e => {
                const isRefunded = !!e.refundedAt
                const isActing   = actionId === e.id
                return (
                  <tr
                    key={e.id}
                    className={`transition-colors hover:bg-zinc-900/50 ${isRefunded ? "opacity-60" : ""}`}
                  >
                    {/* Student */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-white truncate max-w-[180px]">{e.userEmail}</p>
                      {e.userName && (
                        <p className="text-xs text-zinc-500 truncate">{e.userName}</p>
                      )}
                    </td>

                    {/* Course */}
                    <td className="px-4 py-3">
                      <p className="text-zinc-200 truncate max-w-[160px]">{e.courseTitle}</p>
                      {e.courseLevel && (
                        <p className="text-xs text-zinc-500 capitalize">{e.courseLevel}</p>
                      )}
                    </td>

                    {/* Enrolled date */}
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                      {new Date(e.enrolledAt).toLocaleDateString("nl-NL", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3">
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300 capitalize">
                        {e.enrollmentSource ?? "direct"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {isRefunded ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                          <XCircle className="h-3.5 w-3.5" />
                          Refunded
                          <span className="font-normal text-zinc-500 ml-1">
                            {new Date(e.refundedAt!).toLocaleDateString("nl-NL", {
                              day: "numeric", month: "short",
                            })}
                          </span>
                        </div>
                      ) : e.completedAt ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Completed
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Active
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-right">
                      {isActing ? (
                        <Loader2 className="ml-auto h-4 w-4 animate-spin text-zinc-400" />
                      ) : isRefunded ? (
                        <button
                          onClick={() => handleAction(e, "reinstate")}
                          className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-800/50 hover:bg-emerald-950/40 transition-colors ml-auto"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reinstate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(e, "refund")}
                          className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold text-red-400 border border-red-800/50 hover:bg-red-950/40 transition-colors ml-auto"
                        >
                          <XCircle className="h-3 w-3" />
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
