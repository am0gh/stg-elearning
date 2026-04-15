"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import MuxPlayer from "@mux/mux-player-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/client"
import type { Course, Lesson, LessonProgress } from "@/lib/types"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Circle,
  GraduationCap,
  Menu,
  Play,
  X,
} from "lucide-react"

// ─── Checklist sub-component ──────────────────────────────────────────────────
function ChecklistSection({
  items,
  isAlreadyCompleted,
  onAllChecked,
  completing,
}: {
  items: string[]
  isAlreadyCompleted: boolean
  onAllChecked: () => void
  completing: boolean
}) {
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const allTicked = items.length > 0 && checked.size === items.length

  const toggle = (i: number) => {
    if (isAlreadyCompleted) return
    setChecked(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  // No checklist items → fall back to a simple manual button
  if (items.length === 0) {
    return (
      <div className="mt-2 mb-6">
        {!isAlreadyCompleted ? (
          <button
            onClick={onAllChecked}
            disabled={completing}
            className="flex items-center gap-2 rounded px-5 py-2.5 text-sm font-bold transition-opacity disabled:opacity-50"
            style={{ background: GOLD, color: BLACK }}
          >
            <CheckCircle2 className="h-4 w-4" />
            {completing ? "Saving…" : "Mark as Complete"}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: GOLD }}>
            <CheckCircle2 className="h-4 w-4" />
            Lesson completed
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: WHITE_30 }}>
          Before you move on
        </p>
        <span className="text-xs font-semibold tabular-nums" style={{ color: allTicked ? GOLD : WHITE_30 }}>
          {checked.size} / {items.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1 overflow-hidden rounded-full" style={{ background: GOLD_DIM }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${items.length > 0 ? (checked.size / items.length) * 100 : 0}%`, background: GOLD }}
        />
      </div>

      {/* Items */}
      <ul className="space-y-2">
        {items.map((item, i) => {
          const done = isAlreadyCompleted || checked.has(i)
          return (
            <li key={i}>
              <button
                onClick={() => toggle(i)}
                className="flex w-full items-start gap-3 rounded-lg px-4 py-3 text-left transition-colors"
                style={{
                  background: done ? GOLD_DIM : WHITE_08,
                  border: `1px solid ${done ? GOLD_MID : BORDER}`,
                  cursor: isAlreadyCompleted ? "default" : "pointer",
                }}
              >
                {/* Checkbox */}
                <div
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded"
                  style={{
                    background: done ? GOLD : "transparent",
                    border: `1.5px solid ${done ? GOLD : WHITE_30}`,
                  }}
                >
                  {done && (
                    <svg className="h-2.5 w-2.5" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke={BLACK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span
                  className="text-sm leading-snug"
                  style={{
                    color: done ? WHITE_50 : WHITE,
                    textDecoration: done ? "line-through" : "none",
                  }}
                >
                  {item}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* Complete button — appears when all ticked */}
      <div className="mt-4">
        {isAlreadyCompleted ? (
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: GOLD }}>
            <CheckCircle2 className="h-4 w-4" />
            Lesson completed
          </div>
        ) : allTicked ? (
          <button
            onClick={onAllChecked}
            disabled={completing}
            className="flex items-center gap-2 rounded px-5 py-2.5 text-sm font-bold transition-opacity disabled:opacity-50"
            style={{ background: GOLD, color: BLACK }}
          >
            <CheckCircle2 className="h-4 w-4" />
            {completing ? "Saving…" : "Complete Lesson →"}
          </button>
        ) : (
          <p className="text-xs" style={{ color: WHITE_30 }}>
            Tick all items above to complete this lesson
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD        = "#C9A227"
const GOLD_DIM    = "rgba(201,162,39,0.12)"
const GOLD_MID    = "rgba(201,162,39,0.2)"
const BLACK       = "#0a0a0a"
const PURPLE      = "#3D0057"
const WHITE       = "#ffffff"
const WHITE_70    = "rgba(255,255,255,0.7)"
const WHITE_50    = "rgba(255,255,255,0.5)"
const WHITE_30    = "rgba(255,255,255,0.3)"
const WHITE_08    = "rgba(255,255,255,0.08)"
const BORDER      = "rgba(255,255,255,0.08)"

interface LessonPlayerProps {
  course:         Course
  lessons:        Lesson[]
  currentLesson:  Lesson
  progressMap:    Record<string, LessonProgress>
  initialProgress: number
}

export function LessonPlayer({
  course,
  lessons,
  currentLesson,
  progressMap,
  initialProgress,
}: LessonPlayerProps) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [completing, setCompleting]   = useState(false)
  const [localCompleted, setLocalCompleted] = useState<Set<string>>(
    new Set(Object.values(progressMap).filter(p => p.completed).map(p => p.lesson_id))
  )

  const currentIndex   = lessons.findIndex(l => l.id === currentLesson.id)
  const prevLesson     = currentIndex > 0 ? lessons[currentIndex - 1] : null
  const nextLesson     = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null
  const completedCount = localCompleted.size
  const progressPct    = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0
  const isCompleted    = localCompleted.has(currentLesson.id)
  const allDone        = completedCount === lessons.length

  const markComplete = async () => {
    setCompleting(true)
    setLocalCompleted(prev => new Set([...prev, currentLesson.id]))
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("lesson_progress").upsert({
          user_id:      user.id,
          lesson_id:    currentLesson.id,
          completed:    true,
          completed_at: new Date().toISOString(),
        })
      }
      if (nextLesson) router.push(`/courses/${course.id}/learn?lesson=${nextLesson.id}`)
    } catch (err) {
      console.error(err)
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="flex h-screen flex-col" style={{ background: BLACK, color: WHITE }}>

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header
        className="flex h-14 shrink-0 items-center justify-between px-4"
        style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}
      >
        {/* Back + branding */}
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/courses/${course.id}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded transition-opacity hover:opacity-70"
            style={{ color: WHITE_50 }}
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <span className="hidden shrink-0 text-sm font-black tracking-tight sm:block" style={{ color: GOLD }}>
            Start Salsa
          </span>
          <span className="hidden sm:block" style={{ color: WHITE_30 }}>/</span>
          <span className="hidden min-w-0 truncate text-sm sm:block" style={{ color: WHITE_50 }}>
            {course.title}
          </span>
        </div>

        {/* Progress */}
        <div className="hidden flex-1 items-center justify-center gap-3 px-8 sm:flex">
          <div className="h-1 w-36 overflow-hidden rounded-full" style={{ background: GOLD_DIM }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: GOLD }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums" style={{ color: GOLD }}>
            {completedCount} / {lessons.length}
          </span>
        </div>

        {/* Lesson list toggle */}
        <button
          className="flex h-8 items-center gap-2 rounded px-3 text-xs font-semibold transition-colors"
          style={{ border: `1px solid ${BORDER}`, color: WHITE_50 }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          <span className="hidden sm:inline">Lessons</span>
        </button>
      </header>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">

        {/* ── Split panel: video left, notes right ─────────────────── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">

          {/* VIDEO PANEL — left on desktop, top on mobile */}
          <div
            className="flex shrink-0 items-center justify-center bg-black lg:w-[58%]"
            style={{ borderRight: `1px solid ${BORDER}` }}
          >
            {currentLesson.video_url ? (
              /* Aspect-ratio wrapper so video is always 16:9 */
              <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                <MuxPlayer
                  playbackId={currentLesson.video_url}
                  accentColor={GOLD}
                  className="absolute inset-0"
                  style={{ width: "100%", height: "100%", display: "block" }}
                />
              </div>
            ) : (
              <div className="flex h-48 w-full flex-col items-center justify-center gap-3" style={{ color: WHITE_30 }}>
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: GOLD_DIM, border: `1px solid ${GOLD_MID}` }}
                >
                  <Play className="h-7 w-7" style={{ color: GOLD }} />
                </div>
                <p className="text-sm">Video coming soon</p>
              </div>
            )}
          </div>

          {/* NOTES PANEL — right on desktop, below on mobile */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-lg px-6 py-7">

              {/* Meta */}
              <div
                className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest"
                style={{ color: GOLD }}
              >
                <span>Lesson {currentIndex + 1}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{currentLesson.duration_minutes} min</span>
              </div>

              {/* Title */}
              <h2
                className="mb-3 text-xl font-black leading-tight tracking-tight"
                style={{ color: WHITE }}
              >
                {currentLesson.title}
              </h2>

              {/* Description */}
              {currentLesson.description && (
                <p className="mb-5 text-sm leading-relaxed" style={{ color: WHITE_70 }}>
                  {currentLesson.description}
                </p>
              )}

              {/* Intro */}
              {currentLesson.content_intro && (
                <p className="mb-5 text-sm leading-relaxed" style={{ color: GOLD }}>
                  {currentLesson.content_intro}
                </p>
              )}

              {/* Lesson notes — plain white, no card */}
              {currentLesson.content_notes && (
                <div className="mb-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: WHITE_30 }}>
                    Notes
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: WHITE }}>
                    {currentLesson.content_notes}
                  </p>
                </div>
              )}

              {/* Practice tips — numbered, plain */}
              {currentLesson.content_tips && currentLesson.content_tips.length > 0 && (
                <div className="mb-6">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: WHITE_30 }}>
                    Practice Tips
                  </p>
                  <ul className="space-y-2.5">
                    {currentLesson.content_tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm" style={{ color: WHITE }}>
                        <span className="mt-0.5 shrink-0 text-xs font-black tabular-nums" style={{ color: GOLD }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ── Checklist ── */}
              <ChecklistSection
                items={currentLesson.content_checklist ?? []}
                isAlreadyCompleted={isCompleted}
                onAllChecked={markComplete}
                completing={completing}
              />

              {/* Nav */}
              <div className="mt-6 flex gap-2">
                {prevLesson && (
                  <Link
                    href={`/courses/${course.id}/learn?lesson=${prevLesson.id}`}
                    className="flex items-center gap-1.5 rounded px-4 py-2.5 text-sm font-semibold"
                    style={{ border: `1px solid ${BORDER}`, color: WHITE_50 }}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Prev
                  </Link>
                )}
                {nextLesson && (
                  <Link
                    href={`/courses/${course.id}/learn?lesson=${nextLesson.id}`}
                    className="flex items-center gap-1.5 rounded px-4 py-2.5 text-sm font-semibold"
                    style={{ border: `1px solid rgba(201,162,39,0.35)`, color: GOLD }}
                  >
                    Next
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>

              {/* Completion banner */}
              {allDone && (
                <div
                  className="mt-8 flex items-start gap-4 rounded-lg p-5"
                  style={{ background: `${PURPLE}55`, border: "1px solid rgba(61,0,87,0.7)" }}
                >
                  <GraduationCap className="mt-0.5 h-6 w-6 shrink-0" style={{ color: GOLD }} />
                  <div>
                    <p className="font-black" style={{ color: WHITE }}>
                      ¡Felicidades — Level 1 complete!
                    </p>
                    <p className="mt-1 text-sm" style={{ color: WHITE_70 }}>
                      You've finished every lesson. Keep dancing.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ── Lesson list sidebar (overlay) ───────────────────────── */}
        <aside
          className={`absolute right-0 top-0 z-50 flex h-full w-72 flex-col transition-transform duration-200 ${
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
          style={{ background: "#111", borderLeft: `1px solid ${BORDER}` }}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: WHITE_30 }}>
                All Lessons
              </p>
              <p className="mt-0.5 text-sm font-semibold" style={{ color: WHITE_50 }}>
                {completedCount} of {lessons.length} done
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded transition-opacity hover:opacity-70"
              style={{ color: WHITE_50 }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="h-1 overflow-hidden rounded-full" style={{ background: GOLD_DIM }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: GOLD }}
              />
            </div>
          </div>

          {/* List */}
          <ScrollArea className="flex-1">
            <div className="py-1">
              {lessons.map((lesson, index) => {
                const done    = localCompleted.has(lesson.id)
                const current = lesson.id === currentLesson.id
                return (
                  <Link
                    key={lesson.id}
                    href={`/courses/${course.id}/learn?lesson=${lesson.id}`}
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition-colors"
                    style={{
                      background:   current ? GOLD_DIM : "transparent",
                      borderLeft:   current ? `2px solid ${GOLD}` : "2px solid transparent",
                    }}
                  >
                    <div className="mt-0.5 shrink-0">
                      {done ? (
                        <CheckCircle2 className="h-4 w-4" style={{ color: GOLD }} />
                      ) : current ? (
                        <Play className="h-4 w-4" style={{ color: GOLD }} />
                      ) : (
                        <Circle className="h-4 w-4" style={{ color: WHITE_30 }} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="line-clamp-2 text-sm font-medium leading-snug"
                        style={{ color: current ? WHITE : WHITE_70 }}
                      >
                        {index + 1}. {lesson.title}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: WHITE_30 }}>
                        {lesson.duration_minutes} min
                        {lesson.is_free && (
                          <span
                            className="ml-2 rounded px-1.5 py-0.5 text-xs font-bold"
                            style={{ background: GOLD_DIM, color: GOLD }}
                          >
                            Free
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </ScrollArea>
        </aside>

      </div>
    </div>
  )
}
