"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Award, BookOpen, Calendar, Camera,
  CheckCircle2, Loader2, Play, Save, User,
} from "lucide-react"

const GOLD    = "#C9A227"
const BLACK   = "#0a0a0a"
const WHITE   = "#ffffff"
const W50     = "rgba(255,255,255,0.5)"
const W30     = "rgba(255,255,255,0.3)"
const W08     = "rgba(255,255,255,0.08)"
const BORDER  = "rgba(255,255,255,0.09)"
const GOLD_DIM = "rgba(201,162,39,0.12)"

interface CourseHistoryItem {
  enrollmentId:    string
  courseId:        string
  courseTitle:     string
  courseLevel:     string
  thumbnail:       string | null
  enrolledAt:      string
  completedAt:     string | null
  totalLessons:    number
  completedLessons: number
  progressPct:     number
}

interface ProfileFormProps {
  userId:          string
  email:           string
  initialName:     string
  initialAvatarUrl: string | null
  memberSince:     string
  courseHistory:   CourseHistoryItem[]
}

export function ProfileForm({
  userId,
  email,
  initialName,
  initialAvatarUrl,
  memberSince,
  courseHistory,
}: ProfileFormProps) {
  const router     = useRouter()
  const fileRef    = useRef<HTMLInputElement>(null)

  const [name, setName]           = useState(initialName)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const displayAvatar = avatarPreview ?? avatarUrl

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("name", name.trim())
      if (avatarFile) formData.append("avatar", avatarFile)

      const res = await fetch("/api/profile", {
        method: "PUT",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Failed to save changes")
        return
      }

      if (data.avatar_url) setAvatarUrl(data.avatar_url)
      setAvatarFile(null)
      setAvatarPreview(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const initials = name
    ? name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()
    : email[0]?.toUpperCase() ?? "?"

  return (
    <div className="space-y-6">

      {/* ── Profile card ──────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-6 space-y-6"
        style={{ border: `1px solid ${BORDER}`, background: W08 }}
      >
        {/* Avatar + name row */}
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full"
              style={{ border: `2px solid ${GOLD}`, background: GOLD_DIM }}
            >
              {displayAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayAvatar}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xl font-black" style={{ color: GOLD }}>
                  {initials}
                </span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full transition-opacity hover:opacity-80"
              style={{ background: GOLD, color: BLACK }}
              title="Change photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Name + email */}
          <div className="flex-1 min-w-0">
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest" style={{ color: W30 }}>
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setSaved(false) }}
                placeholder="Your full name"
                className="w-full rounded-lg border px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest" style={{ color: W30 }}>
                Email
              </label>
              <p className="text-sm" style={{ color: W50 }}>{email}</p>
              <p className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                Email cannot be changed
              </p>
            </div>
          </div>
        </div>

        {/* Member since */}
        <div className="flex items-center gap-2 text-sm" style={{ color: W30 }}>
          <Calendar className="h-3.5 w-3.5" />
          <span>
            Member since{" "}
            {new Date(memberSince).toLocaleDateString("nl-NL", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </span>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || (!avatarFile && name.trim() === initialName)}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold disabled:opacity-40 transition-opacity"
          style={{ background: GOLD, color: BLACK }}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? "Saved!" : saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* ── Learning history ──────────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-lg font-black" style={{ color: WHITE }}>
          My Courses
        </h2>

        {courseHistory.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{ border: `1px solid ${BORDER}`, background: W08 }}
          >
            <BookOpen className="mx-auto mb-3 h-8 w-8" style={{ color: W30 }} />
            <p className="text-sm" style={{ color: W50 }}>No courses yet.</p>
            <Link
              href="/courses"
              className="mt-3 inline-block text-sm font-bold"
              style={{ color: GOLD }}
            >
              Browse courses →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {courseHistory.map(item => (
              <div
                key={item.enrollmentId}
                className="flex items-center gap-4 rounded-xl p-4"
                style={{ border: `1px solid ${BORDER}`, background: W08 }}
              >
                {/* Thumbnail / placeholder */}
                <div
                  className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                  style={{ background: "rgba(61,0,87,0.5)" }}
                >
                  {item.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnail}
                      alt={item.courseTitle}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl select-none">💃</span>
                  )}
                </div>

                {/* Course info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: WHITE }}>
                    {item.courseTitle}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div
                      className="h-1 w-28 overflow-hidden rounded-full"
                      style={{ background: GOLD_DIM }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${item.progressPct}%`, background: GOLD }}
                      />
                    </div>
                    <span className="text-xs font-bold tabular-nums" style={{ color: GOLD }}>
                      {item.progressPct}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: W30 }}>
                    {item.completedLessons} of {item.totalLessons} lessons ·{" "}
                    Enrolled {new Date(item.enrolledAt).toLocaleDateString("nl-NL")}
                  </p>
                </div>

                {/* Right: status badge + actions */}
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {item.completedAt ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: GOLD }}>
                      <Award className="h-3.5 w-3.5" />
                      Complete
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: W30 }}>
                      <User className="h-3 w-3" />
                      In progress
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {item.completedAt && (
                      <Link
                        href={`/certificate/${item.enrollmentId}`}
                        className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-bold"
                        style={{ background: GOLD_DIM, color: GOLD, border: `1px solid rgba(201,162,39,0.2)` }}
                      >
                        <Award className="h-3 w-3" />
                        Certificate
                      </Link>
                    )}
                    <Link
                      href={`/courses/${item.courseId}/learn`}
                      className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-bold"
                      style={{ background: W08, color: WHITE, border: `1px solid ${BORDER}` }}
                    >
                      <Play className="h-3 w-3" />
                      {item.completedAt ? "Review" : "Continue"}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
