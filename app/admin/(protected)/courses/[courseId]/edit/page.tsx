"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Upload, X } from "lucide-react"

export default function EditCoursePage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    title: "",
    description: "",
    level: "beginner",
    price: 89,
    instructor_name: "",
    instructor_avatar: "",
    thumbnail_url: "",
    duration_hours: 0,
    is_published: false,
  })

  useEffect(() => {
    fetch(`/api/admin/courses/${courseId}`)
      .then(r => r.json())
      .then(data => {
        setForm({
          title: data.title ?? "",
          description: data.description ?? "",
          level: data.level ?? "beginner",
          price: data.price ?? 89,
          instructor_name: data.instructor_name ?? "",
          instructor_avatar: data.instructor_avatar ?? "",
          thumbnail_url: data.thumbnail_url ?? "",
          duration_hours: data.duration_hours ?? 0,
          is_published: data.is_published ?? false,
        })
        setLoading(false)
      })
  }, [courseId])

  const set = (field: string, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError("")

    const data = new FormData()
    data.append("file", file)

    const res = await fetch("/api/admin/upload-image", {
      method: "POST",
      body: data,
    })

    const json = await res.json()
    setUploading(false)

    if (!res.ok) {
      setUploadError(json.error ?? "Upload failed")
      return
    }

    set("thumbnail_url", json.url)
    // Reset the input so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    const res = await fetch(`/api/admin/courses/${courseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      router.push(`/admin/courses/${courseId}`)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? "Something went wrong")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-zinc-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/admin/courses/${courseId}`} className="text-zinc-500 hover:text-white">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-black text-white">Edit Course</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
        <Field label="Title" required>
          <input className={input} value={form.title} onChange={e => set("title", e.target.value)} required />
        </Field>

        <Field label="Description">
          <textarea
            className={`${input} h-28 resize-none`}
            value={form.description}
            onChange={e => set("description", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Level">
            <select className={input} value={form.level} onChange={e => set("level", e.target.value)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>
          <Field label="Price (€)">
            <input type="number" className={input} value={form.price} onChange={e => set("price", Number(e.target.value))} min={0} />
          </Field>
        </div>

        <Field label="Instructor Name">
          <input className={input} value={form.instructor_name} onChange={e => set("instructor_name", e.target.value)} />
        </Field>

        <Field label="Thumbnail Image">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageUpload}
          />

          {/* Image preview */}
          {form.thumbnail_url && (
            <div className="relative mb-2 overflow-hidden rounded-lg border border-zinc-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.thumbnail_url}
                alt="Course thumbnail preview"
                className="h-40 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => set("thumbnail_url", "")}
                className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                title="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mb-2 flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-amber-500 hover:text-white disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : form.thumbnail_url ? "Replace image" : "Upload image"}
          </button>

          {uploadError && <p className="mb-2 text-xs text-red-400">{uploadError}</p>}

          {/* Fallback manual URL input */}
          <input
            className={input}
            value={form.thumbnail_url}
            onChange={e => set("thumbnail_url", e.target.value)}
            placeholder="Or paste an image URL…"
          />
        </Field>

        <Field label="Duration (hours)">
          <input type="number" className={input} value={form.duration_hours} onChange={e => set("duration_hours", Number(e.target.value))} min={0} step={0.5} />
        </Field>

        <label className="flex items-center gap-2.5 text-sm text-zinc-300">
          <input type="checkbox" checked={form.is_published} onChange={e => set("is_published", e.target.checked)} className="h-4 w-4 accent-amber-500" />
          Published
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50">
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <Link href={`/admin/courses/${courseId}`} className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white">
            Cancel
          </Link>
        </div>
      </form>
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

const input = "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
