"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Plus, Trash2, GripVertical, Loader2, Video, Upload, CheckCircle2, XCircle } from "lucide-react"

interface MuxAsset {
  id: string
  playback_id: string | null
  title: string | null
  thumbnail: string | null
  duration: number | null
  status: string
}

interface LessonFormProps {
  courseId: string
  lessonId?: string // present in edit mode
  initial?: Partial<LessonFormData>
}

interface LessonFormData {
  title: string
  description: string
  order_index: number
  duration_minutes: number
  is_free: boolean
  video_url: string
  content_intro: string
  content_notes: string
  content_tips: string[]
  content_checklist: string[]
}

const DEFAULT: LessonFormData = {
  title: "",
  description: "",
  order_index: 1,
  duration_minutes: 10,
  is_free: false,
  video_url: "",
  content_intro: "",
  content_notes: "",
  content_tips: [],
  content_checklist: [],
}

export function LessonForm({ courseId, lessonId, initial }: LessonFormProps) {
  const router = useRouter()
  const isEdit = !!lessonId
  const [form, setForm] = useState<LessonFormData>({ ...DEFAULT, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Mux picker state
  const [muxAssets, setMuxAssets] = useState<MuxAsset[]>([])
  const [muxLoading, setMuxLoading] = useState(false)
  const [muxError, setMuxError] = useState("")
  const [showMuxPicker, setShowMuxPicker] = useState(false)
  const [muxSearch, setMuxSearch] = useState("")

  // Mux direct upload state
  type UploadPhase = "idle" | "uploading" | "processing" | "ready" | "errored"
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle")
  const [uploadProgress, setUploadProgress] = useState(0) // 0–100
  const [uploadError, setUploadError] = useState("")
  const [uploadFileName, setUploadFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const set = <K extends keyof LessonFormData>(field: K, value: LessonFormData[K]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const fetchMuxAssets = async () => {
    setMuxLoading(true)
    setMuxError("")
    try {
      const res = await fetch("/api/admin/mux/assets")
      if (!res.ok) throw new Error("Failed to load videos")
      const data = await res.json()
      setMuxAssets(data.filter((a: MuxAsset) => a.status === "ready"))
    } catch (err: any) {
      setMuxError(err.message)
    } finally {
      setMuxLoading(false)
    }
  }

  const openMuxPicker = () => {
    setShowMuxPicker(true)
    setMuxSearch("")
    if (muxAssets.length === 0) fetchMuxAssets()
  }

  const closeMuxPicker = () => {
    setShowMuxPicker(false)
    setMuxSearch("")
  }

  const filteredAssets = muxAssets.filter(a => {
    const q = muxSearch.toLowerCase().trim()
    if (!q) return true
    return (a.title?.toLowerCase().includes(q) ?? false) || a.id.toLowerCase().includes(q)
  })

  const selectVideo = (asset: MuxAsset) => {
    if (!asset.playback_id) return
    set("video_url", asset.playback_id)
    // Auto-fill duration if not set
    if (asset.duration && form.duration_minutes === 10) {
      set("duration_minutes", Math.round(asset.duration / 60))
    }
    setShowMuxPicker(false)
  }

  // ── Direct upload ──────────────────────────────────────────────────────────

  const pollUploadStatus = useCallback(async (uploadId: string) => {
    try {
      const res = await fetch(`/api/admin/mux/upload-status?uploadId=${uploadId}`)
      if (!res.ok) throw new Error("Status check failed")
      const data = await res.json()

      if (data.status === "ready") {
        setUploadPhase("ready")
        if (data.playback_id) {
          set("video_url", data.playback_id)
          if (data.duration && form.duration_minutes === 10) {
            set("duration_minutes", Math.round(data.duration / 60))
          }
        }
        // Refresh the "Pick from Mux" list so the new video appears
        setMuxAssets([])
      } else if (data.status === "errored") {
        setUploadPhase("errored")
        setUploadError("Mux processing failed. Please try again.")
      } else {
        // Still uploading or processing — poll again in 3 s
        pollTimerRef.current = setTimeout(() => pollUploadStatus(uploadId), 3000)
      }
    } catch {
      setUploadPhase("errored")
      setUploadError("Failed to check upload status.")
    }
  }, [form.duration_minutes]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    setUploadPhase("uploading")
    setUploadProgress(0)
    setUploadError("")
    setUploadFileName(file.name)

    try {
      // 1. Ask our backend to create a Mux direct upload URL
      const createRes = await fetch("/api/admin/mux/upload", { method: "POST" })
      if (!createRes.ok) throw new Error("Could not create upload URL")
      const { uploadId, uploadUrl } = await createRes.json()

      // 2. PUT the file directly to Mux via XHR so we can track progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("PUT", uploadUrl)
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4")

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setUploadProgress(Math.round((ev.loaded / ev.total) * 100))
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed with status ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error("Network error during upload"))
        xhr.send(file)
      })

      // 3. File is on Mux — now poll until asset is ready
      setUploadPhase("processing")
      setUploadProgress(100)
      pollTimerRef.current = setTimeout(() => pollUploadStatus(uploadId), 3000)
    } catch (err: any) {
      setUploadPhase("errored")
      setUploadError(err.message ?? "Upload failed")
    }

    // Reset the input so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const resetUpload = () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    setUploadPhase("idle")
    setUploadProgress(0)
    setUploadError("")
    setUploadFileName("")
  }

  // ── Dynamic list helpers ───────────────────────────────────────────────────

  // Dynamic list helpers
  const addTip = () => set("content_tips", [...form.content_tips, ""])
  const updateTip = (i: number, v: string) => {
    const tips = [...form.content_tips]
    tips[i] = v
    set("content_tips", tips)
  }
  const removeTip = (i: number) => set("content_tips", form.content_tips.filter((_, idx) => idx !== i))

  const addChecklistItem = () => set("content_checklist", [...form.content_checklist, ""])
  const updateChecklistItem = (i: number, v: string) => {
    const items = [...form.content_checklist]
    items[i] = v
    set("content_checklist", items)
  }
  const removeChecklistItem = (i: number) =>
    set("content_checklist", form.content_checklist.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSuccess("")

    // Clean empty entries from arrays
    const payload = {
      ...form,
      content_tips: form.content_tips.filter(t => t.trim()),
      content_checklist: form.content_checklist.filter(c => c.trim()),
    }

    const url = isEdit
      ? `/api/admin/courses/${courseId}/lessons/${lessonId}`
      : `/api/admin/courses/${courseId}/lessons`

    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      setSuccess("Saved!")
      setTimeout(() => setSuccess(""), 2500)
      if (!isEdit) {
        const lesson = await res.json()
        router.push(`/admin/courses/${courseId}/lessons/${lesson.id}/edit`)
      }
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? "Something went wrong")
    }
    setSaving(false)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/admin/courses/${courseId}`} className="text-zinc-500 hover:text-white">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-black text-white">
          {isEdit ? "Edit Lesson" : "New Lesson"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">

        {/* ── Basic info ── */}
        <Section title="Basic Info">
          <Field label="Lesson Title" required>
            <input
              className={inp}
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g. The Basic Step"
              required
            />
          </Field>

          <Field label="Short Description">
            <textarea
              className={`${inp} h-20 resize-none`}
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="One sentence shown in the lesson list"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Order (position in course)">
              <input
                type="number"
                className={inp}
                value={form.order_index}
                onChange={e => set("order_index", Number(e.target.value))}
                min={1}
              />
            </Field>
            <Field label="Duration (minutes)">
              <input
                type="number"
                className={inp}
                value={form.duration_minutes}
                onChange={e => set("duration_minutes", Number(e.target.value))}
                min={1}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.is_free}
              onChange={e => set("is_free", e.target.checked)}
              className="h-4 w-4 accent-amber-500"
            />
            Free preview (visible before purchase)
          </label>
        </Section>

        {/* ── Video ── */}
        <Section title="Video">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <Field label="Mux Playback ID">
            <div className="flex gap-2">
              <input
                className={`${inp} flex-1 font-mono text-xs`}
                value={form.video_url}
                onChange={e => set("video_url", e.target.value)}
                placeholder="e.g. rR8P8mSaKDzz02Ts..."
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadPhase === "uploading" || uploadPhase === "processing"}
                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </button>
              <button
                type="button"
                onClick={openMuxPicker}
                className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-500 hover:text-white"
              >
                Pick from Mux
              </button>
            </div>

            {/* Upload progress / status */}
            {uploadPhase === "uploading" && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading {uploadFileName}…
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {uploadPhase === "processing" && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Video uploaded — Mux is processing it. This usually takes 1–3 minutes…
              </div>
            )}

            {uploadPhase === "ready" && (
              <div className="mt-3 flex items-center gap-2 text-xs text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Video ready! Playback ID auto-filled below.
                <button type="button" onClick={resetUpload} className="ml-auto text-zinc-500 hover:text-white">
                  ✕
                </button>
              </div>
            )}

            {uploadPhase === "errored" && (
              <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
                <XCircle className="h-3.5 w-3.5" />
                {uploadError}
                <button type="button" onClick={resetUpload} className="ml-2 underline">
                  Dismiss
                </button>
              </div>
            )}

            {form.video_url && uploadPhase !== "ready" && (
              <p className="mt-1.5 text-xs text-green-500">✓ Video selected</p>
            )}
          </Field>

          {/* Mux picker modal */}
          {showMuxPicker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-zinc-700 bg-zinc-900">
                <div className="border-b border-zinc-800 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">Select Video from Mux</h3>
                    <button
                      type="button"
                      onClick={closeMuxPicker}
                      className="text-zinc-500 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-3">
                    <input
                      className={inp}
                      value={muxSearch}
                      onChange={e => setMuxSearch(e.target.value)}
                      placeholder="Search by title or asset ID…"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {muxLoading && (
                    <div className="flex items-center justify-center py-12 text-zinc-500">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Loading videos…
                    </div>
                  )}
                  {muxError && (
                    <div className="rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-400">
                      {muxError}
                      <button
                        type="button"
                        onClick={fetchMuxAssets}
                        className="ml-3 underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {!muxLoading && !muxError && muxAssets.length === 0 && (
                    <p className="py-8 text-center text-zinc-500">No ready videos found in Mux.</p>
                  )}
                  {!muxLoading && !muxError && muxAssets.length > 0 && filteredAssets.length === 0 && (
                    <p className="py-8 text-center text-zinc-500">No videos match your search.</p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {filteredAssets.map(asset => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => selectVideo(asset)}
                        disabled={!asset.playback_id}
                        className="group relative overflow-hidden rounded-lg border border-zinc-700 text-left transition-colors hover:border-amber-500 disabled:opacity-40"
                      >
                        {asset.thumbnail ? (
                          <img
                            src={asset.thumbnail}
                            alt=""
                            className="aspect-video w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-video items-center justify-center bg-zinc-800">
                            <Video className="h-8 w-8 text-zinc-600" />
                          </div>
                        )}
                        <div className="p-2">
                          <p className="truncate text-xs font-medium text-white">
                            {asset.title ?? asset.id}
                          </p>
                          {asset.duration && (
                            <p className="text-xs text-zinc-500">
                              {Math.round(asset.duration / 60)} min
                            </p>
                          )}
                        </div>
                        {form.video_url === asset.playback_id && (
                          <div className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-black">
                            Selected
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* ── Text content ── */}
        <Section title="Text Content">
          <Field label="Intro (shown above notes — short, optional)">
            <input
              className={inp}
              value={form.content_intro}
              onChange={e => set("content_intro", e.target.value)}
              placeholder="e.g. In this lesson you'll learn the Linea and Lateral…"
            />
          </Field>

          <Field label="Lesson Notes (shown below video)">
            <textarea
              className={`${inp} h-40 resize-y`}
              value={form.content_notes}
              onChange={e => set("content_notes", e.target.value)}
              placeholder="Write the main lesson content here. Explain the moves, give context, tips for practice…"
            />
          </Field>
        </Section>

        {/* ── Practice tips ── */}
        <Section title="Practice Tips">
          <div className="space-y-2">
            {form.content_tips.map((tip, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-center text-xs font-bold text-zinc-600">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <input
                  className={`${inp} flex-1`}
                  value={tip}
                  onChange={e => updateTip(i, e.target.value)}
                  placeholder={`Tip ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeTip(i)}
                  className="shrink-0 text-zinc-600 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addTip}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-500 hover:text-amber-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Tip
          </button>
        </Section>

        {/* ── Checklist ── */}
        <Section title="Completion Checklist" description="Students must tick all items to complete the lesson.">
          <div className="space-y-2">
            {form.content_checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-4 w-4 shrink-0 rounded border border-zinc-600" />
                <input
                  className={`${inp} flex-1`}
                  value={item}
                  onChange={e => updateChecklistItem(i, e.target.value)}
                  placeholder={`Checklist item ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeChecklistItem(i)}
                  className="shrink-0 text-zinc-600 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addChecklistItem}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-500 hover:text-amber-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Checklist Item
          </button>
        </Section>

        {/* ── Submit ── */}
        <div className="flex items-center gap-4 border-t border-zinc-800 pt-6">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Lesson"}
          </button>
          <Link
            href={`/admin/courses/${courseId}`}
            className="text-sm text-zinc-500 hover:text-white"
          >
            Cancel
          </Link>
          {success && (
            <span className="text-sm font-semibold text-green-400">✓ {success}</span>
          )}
          {error && (
            <span className="text-sm text-red-400">{error}</span>
          )}
        </div>
      </form>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-5 border-b border-zinc-800 pb-4">
        <h2 className="font-semibold text-white">{title}</h2>
        {description && <p className="mt-1 text-xs text-zinc-500">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  )
}

const inp =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
