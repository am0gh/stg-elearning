"use client"

import { useEffect, useState } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts"
import { Award, BookOpen, Loader2, TrendingUp, Users } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Overview {
  totalStudents:    number
  totalEnrollments: number
  completedCourses: number
  estimatedRevenue: number
  windowDays:       number
}

interface ChartPoint {
  date:        string
  enrollments: number
}

interface LessonStat {
  lessonId:       string
  title:          string
  orderIndex:     number
  courseId:       string
  totalStarts:    number
  completed:      number
  completionRate: number
}

interface CourseStat {
  courseId:         string
  title:            string
  level:            string
  totalEnrollments: number
  completions:      number
  completionRate:   number
  lessonStats:      LessonStat[]
}

interface Analytics {
  overview:    Overview
  chartData:   ChartPoint[]
  courseStats: CourseStat[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GOLD     = "#C9A227"
const GOLD_DIM = "rgba(201,162,39,0.12)"

function StatCard({
  label, value, sub, icon: Icon, gold,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  gold?: boolean
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ border: "1px solid rgb(39 39 42)", background: "rgb(24 24 27)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</p>
        <Icon className="h-4 w-4" style={{ color: gold ? GOLD : "rgb(113 113 122)" }} />
      </div>
      <p
        className="text-3xl font-black tabular-nums"
        style={{ color: gold ? GOLD : "white" }}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-xs text-zinc-500">{sub}</p>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData]       = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays]       = useState(30)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/admin/analytics?days=${days}`)
      .then(r => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`)
        return r.json()
      })
      .then(json => {
        // Guard: ensure the response has the expected shape
        if (!json.overview || !json.chartData || !json.courseStats) {
          throw new Error("Unexpected response from analytics API")
        }
        setData(json)
      })
      .catch(err => {
        console.error(err)
        setError(err.message ?? "Failed to load analytics")
      })
      .finally(() => setLoading(false))
  }, [days])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm font-semibold text-red-400">
          {error ?? "Failed to load analytics"}
        </p>
        <button
          onClick={() => setDays(d => d)}
          className="rounded-lg px-4 py-2 text-xs font-bold"
          style={{ background: "rgba(201,162,39,0.12)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.25)" }}
        >
          Retry
        </button>
      </div>
    )
  }

  const { overview, chartData, courseStats } = data

  // Format the X-axis date labels
  const formattedChart = chartData.map(d => ({
    ...d,
    label: new Date(d.date + "T12:00:00").toLocaleDateString("nl-NL", {
      month: "short", day: "numeric",
    }),
  }))

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Analytics</h1>
          <p className="mt-0.5 text-sm text-zinc-400">Platform performance overview</p>
        </div>

        {/* Window selector */}
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: "rgb(24 24 27)", border: "1px solid rgb(39 39 42)" }}>
          {[7, 30, 90, 0].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className="rounded px-3 py-1.5 text-xs font-bold transition-colors"
              style={{
                background: days === d ? GOLD : "transparent",
                color: days === d ? "#0a0a0a" : "rgb(113 113 122)",
              }}
            >
              {d === 0 ? "All time" : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview stats ── */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Students"
          value={overview.totalStudents.toLocaleString()}
          sub="All time"
          icon={Users}
        />
        <StatCard
          label="Enrollments"
          value={overview.totalEnrollments.toLocaleString()}
          sub={days > 0 ? `Last ${days} days` : "All time"}
          icon={BookOpen}
        />
        <StatCard
          label="Completions"
          value={overview.completedCourses.toLocaleString()}
          sub={days > 0 ? `Last ${days} days` : "All time"}
          icon={Award}
        />
        <StatCard
          label="Est. Revenue"
          value={`€${overview.estimatedRevenue.toLocaleString()}`}
          sub={days > 0 ? `Last ${days} days (Stripe enrollments)` : "All time (Stripe enrollments)"}
          icon={TrendingUp}
          gold
        />
      </div>

      {/* ── Enrollments chart ── */}
      <div
        className="mb-8 rounded-xl p-6"
        style={{ border: "1px solid rgb(39 39 42)", background: "rgb(24 24 27)" }}
      >
        <h2 className="mb-5 text-sm font-bold uppercase tracking-widest text-zinc-400">
          Enrollments — last 30 days
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={formattedChart} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={GOLD} stopOpacity={0.25} />
                <stop offset="95%" stopColor={GOLD} stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "rgb(113 113 122)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "rgb(113 113 122)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#111",
                border: "1px solid rgb(63 63 70)",
                borderRadius: "8px",
                color: "white",
                fontSize: 12,
              }}
              formatter={(v: number) => [v, "Enrollments"]}
            />
            <Area
              type="monotone"
              dataKey="enrollments"
              stroke={GOLD}
              strokeWidth={2}
              fill="url(#goldGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Per-course breakdown ── */}
      <div>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-400">
          Courses
        </h2>

        <div className="space-y-3">
          {courseStats.map(c => {
            const isOpen = expanded === c.courseId

            return (
              <div
                key={c.courseId}
                className="overflow-hidden rounded-xl"
                style={{ border: "1px solid rgb(39 39 42)", background: "rgb(24 24 27)" }}
              >
                {/* Course header row */}
                <button
                  className="flex w-full items-center gap-4 p-5 text-left"
                  onClick={() => setExpanded(isOpen ? null : c.courseId)}
                >
                  {/* Title + level */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{c.title}</p>
                    <p className="text-xs capitalize text-zinc-500">{c.level?.replace("-", " ")}</p>
                  </div>

                  {/* Stats row */}
                  <div className="hidden items-center gap-8 sm:flex">
                    <div className="text-right">
                      <p className="text-lg font-black tabular-nums text-white">{c.totalEnrollments}</p>
                      <p className="text-xs text-zinc-500">enrolled</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black tabular-nums text-white">{c.completions}</p>
                      <p className="text-xs text-zinc-500">completed</p>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-lg font-black tabular-nums"
                        style={{ color: c.completionRate >= 50 ? GOLD : "rgb(113 113 122)" }}
                      >
                        {c.completionRate}%
                      </p>
                      <p className="text-xs text-zinc-500">completion</p>
                    </div>
                  </div>

                  <div
                    className="ml-2 text-xs font-semibold"
                    style={{ color: GOLD }}
                  >
                    {isOpen ? "▲" : "▼"}
                  </div>
                </button>

                {/* Lesson breakdown */}
                {isOpen && c.lessonStats.length > 0 && (
                  <div style={{ borderTop: "1px solid rgb(39 39 42)" }}>
                    <div className="px-5 py-4">
                      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Lesson completion rates
                      </p>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart
                          data={c.lessonStats.map(l => ({
                            name: `L${l.orderIndex + 1}`,
                            rate: l.completionRate,
                            title: l.title,
                          }))}
                          margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: "rgb(113 113 122)", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fill: "rgb(113 113 122)", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={v => `${v}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "#111",
                              border: "1px solid rgb(63 63 70)",
                              borderRadius: "8px",
                              color: "white",
                              fontSize: 12,
                            }}
                            formatter={(v: number, _name: string, item) => [
                              `${v}%`, item.payload.title
                            ]}
                          />
                          <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                            {c.lessonStats.map((_, i) => (
                              <Cell
                                key={i}
                                fill={
                                  c.lessonStats[i].completionRate >= 70 ? GOLD
                                  : c.lessonStats[i].completionRate >= 40 ? "rgba(201,162,39,0.5)"
                                  : "rgba(201,162,39,0.2)"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Lesson table */}
                      <div className="mt-3 space-y-1">
                        {c.lessonStats.map((l, i) => (
                          <div
                            key={l.lessonId}
                            className="flex items-center gap-3 rounded px-2 py-1.5"
                            style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}
                          >
                            <span className="w-6 shrink-0 text-xs font-bold tabular-nums text-zinc-600">
                              {l.orderIndex + 1}
                            </span>
                            <span className="flex-1 truncate text-xs text-zinc-400">{l.title}</span>
                            <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                              {l.totalStarts} starts
                            </span>
                            <div className="flex w-20 items-center gap-2">
                              <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "rgb(39 39 42)" }}>
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${l.completionRate}%`, background: GOLD }}
                                />
                              </div>
                              <span
                                className="w-8 shrink-0 text-right text-xs font-bold tabular-nums"
                                style={{ color: l.completionRate >= 50 ? GOLD : "rgb(113 113 122)" }}
                              >
                                {l.completionRate}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {courseStats.length === 0 && (
            <div
              className="rounded-xl p-8 text-center"
              style={{ border: "1px solid rgb(39 39 42)" }}
            >
              <p className="text-sm text-zinc-500">No course data yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
