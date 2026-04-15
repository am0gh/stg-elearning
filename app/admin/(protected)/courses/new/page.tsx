"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default function NewCoursePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
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

  const set = (field: string, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const course = await res.json()
      router.push(`/admin/courses/${course.id}`)
    } else {
      const data = await res.json()
      setError(data.error ?? "Something went wrong")
      setSaving(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-zinc-500 hover:text-white">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-black text-white">New Course</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
        <Field label="Title" required>
          <input
            className={input}
            value={form.title}
            onChange={e => set("title", e.target.value)}
            placeholder="e.g. Level 1 — Beginners"
            required
          />
        </Field>

        <Field label="Description">
          <textarea
            className={`${input} h-28 resize-none`}
            value={form.description}
            onChange={e => set("description", e.target.value)}
            placeholder="Short description shown on the course card"
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
            <input
              type="number"
              className={input}
              value={form.price}
              onChange={e => set("price", Number(e.target.value))}
              min={0}
            />
          </Field>
        </div>

        <Field label="Instructor Name">
          <input
            className={input}
            value={form.instructor_name}
            onChange={e => set("instructor_name", e.target.value)}
            placeholder="e.g. Giovanny"
          />
        </Field>

        <Field label="Thumbnail URL">
          <input
            className={input}
            value={form.thumbnail_url}
            onChange={e => set("thumbnail_url", e.target.value)}
            placeholder="https://..."
          />
        </Field>

        <Field label="Duration (hours)">
          <input
            type="number"
            className={input}
            value={form.duration_hours}
            onChange={e => set("duration_hours", Number(e.target.value))}
            min={0}
            step={0.5}
          />
        </Field>

        <label className="flex items-center gap-2.5 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={form.is_published}
            onChange={e => set("is_published", e.target.checked)}
            className="h-4 w-4 accent-amber-500"
          />
          Publish immediately
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Course"}
          </button>
          <Link
            href="/admin"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white"
          >
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

const input =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
