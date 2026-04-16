"use client"

import { useState, useEffect, useRef } from "react"
import { Check, Loader2, ExternalLink, Upload, X } from "lucide-react"
import type { HomepageContent } from "@/lib/homepage-content"
import { DEFAULT_CONTENT } from "@/lib/homepage-content"

// ─── Shared field components ──────────────────────────────────────────────────

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="mb-4 border-b border-zinc-800 pb-3">
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">
        {label}
        {hint && <span className="ml-2 font-normal text-zinc-600">— {hint}</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
const textareaCls = `${inputCls} resize-none leading-relaxed`

// ─── Logo Upload Component ────────────────────────────────────────────────────

function LogoUploader({ currentUrl, onUploaded, onRemoved }: {
  currentUrl: string
  onUploaded: (url: string) => void
  onRemoved: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving]   = useState(false)
  const [err, setErr]             = useState("")
  const [dragOver, setDragOver]   = useState(false)

  const upload = async (file: File) => {
    setUploading(true); setErr("")
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/admin/upload-logo", { method: "POST", body: fd })
    const data = await res.json()
    setUploading(false)
    if (!res.ok) { setErr(data.error ?? "Upload failed"); return }
    onUploaded(data.url)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) upload(e.target.files[0])
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    if (e.dataTransfer.files?.[0]) upload(e.dataTransfer.files[0])
  }

  const handleRemove = async () => {
    setRemoving(true); setErr("")
    await fetch("/api/admin/upload-logo", { method: "DELETE" })
    setRemoving(false)
    onRemoved()
  }

  return (
    <div className="space-y-3">
      {currentUrl ? (
        <div className="flex items-center gap-4 rounded-lg border border-zinc-700 bg-zinc-800 p-3">
          {/* Preview on dark bg mimicking the nav */}
          <div className="flex h-12 w-40 shrink-0 items-center justify-center rounded bg-black px-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentUrl} alt="Logo preview" className="h-8 w-auto object-contain" style={{ maxWidth: 140 }} />
          </div>
          <div className="flex flex-1 flex-col gap-1 text-xs text-zinc-400">
            <span className="font-medium text-white">Logo uploaded</span>
            <span className="truncate text-zinc-500">{currentUrl.split("/").pop()}</span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-1.5 text-xs text-white hover:bg-zinc-600"
            >
              Replace
            </button>
            <button
              onClick={handleRemove}
              disabled={removing}
              className="flex items-center gap-1 rounded-lg border border-red-800 bg-red-950/50 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/50 disabled:opacity-50"
            >
              {removing ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 transition-colors"
          style={{ borderColor: dragOver ? "var(--brand-gold)" : "#3f3f46", background: dragOver ? "rgba(201,162,39,0.05)" : "transparent" }}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
          ) : (
            <>
              <Upload className="h-5 w-5 text-zinc-500" />
              <p className="text-xs text-zinc-500">
                <span className="font-semibold text-zinc-300">Click to upload</span> or drag & drop
              </p>
              <p className="text-xs text-zinc-600">PNG, JPG, WebP or SVG · max 2 MB</p>
            </>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleFile} />
      {err && <p className="text-xs text-red-400">{err}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const [content, setContent] = useState<HomepageContent>(DEFAULT_CONTENT)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState("")

  useEffect(() => {
    fetch("/api/admin/homepage")
      .then(r => r.json())
      .then(data => { setContent(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const set = (key: keyof HomepageContent, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true); setError(""); setSaved(false)
    const res = await fetch("/api/admin/homepage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else { const d = await res.json(); setError(d.error ?? "Something went wrong") }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
    </div>
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Homepage Content</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Edit all text on the homepage. Changes go live immediately after saving.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white"
          >
            Preview <ExternalLink className="h-3 w-3" />
          </a>
          {saved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-900/50 px-2.5 py-1 text-xs text-green-400">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-400">{error}</div>
      )}

      <div className="max-w-2xl space-y-6">

        {/* ── Navigation ─────────────────────────────────────────────────── */}
        <Section title="Navigation" hint="Appears in the top bar on every page">
          <Field label="Logo image" hint="shown instead of logo text when uploaded">
            <LogoUploader
              currentUrl={content.logo_url}
              onUploaded={url => set("logo_url", url)}
              onRemoved={() => set("logo_url", "")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Logo text" hint="fallback when no image is set">
              <input className={inputCls} value={content.nav_logo} onChange={e => set("nav_logo", e.target.value)} placeholder={DEFAULT_CONTENT.nav_logo} />
            </Field>
            <Field label="Nav CTA button">
              <input className={inputCls} value={content.nav_cta} onChange={e => set("nav_cta", e.target.value)} placeholder={DEFAULT_CONTENT.nav_cta} />
            </Field>
          </div>
        </Section>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <Section title="Hero" hint="The first section visitors see">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Headline" hint="white part">
              <input className={inputCls} value={content.hero_headline} onChange={e => set("hero_headline", e.target.value)} placeholder={DEFAULT_CONTENT.hero_headline} />
            </Field>
            <Field label="Headline accent" hint="gold part">
              <input className={inputCls} value={content.hero_headline_accent} onChange={e => set("hero_headline_accent", e.target.value)} placeholder={DEFAULT_CONTENT.hero_headline_accent} />
            </Field>
          </div>
          <Field label="Subtext">
            <textarea
              rows={2}
              className={textareaCls}
              value={content.hero_subtext}
              onChange={e => set("hero_subtext", e.target.value)}
              placeholder={DEFAULT_CONTENT.hero_subtext}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Primary CTA" hint="gold button">
              <input className={inputCls} value={content.hero_cta_primary} onChange={e => set("hero_cta_primary", e.target.value)} placeholder={DEFAULT_CONTENT.hero_cta_primary} />
            </Field>
            <Field label="Secondary CTA" hint="outline button">
              <input className={inputCls} value={content.hero_cta_secondary} onChange={e => set("hero_cta_secondary", e.target.value)} placeholder={DEFAULT_CONTENT.hero_cta_secondary} />
            </Field>
          </div>

          {/* Live headline preview */}
          <div className="rounded-lg border border-zinc-800 bg-black px-4 py-3">
            <p className="text-center text-lg font-black uppercase tracking-tight text-white">
              {content.hero_headline || DEFAULT_CONTENT.hero_headline}{" "}
              <span style={{ color: "var(--brand-gold)" }}>
                {content.hero_headline_accent || DEFAULT_CONTENT.hero_headline_accent}
              </span>
            </p>
          </div>
        </Section>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <Section title="Stats" hint="4 highlight tiles below the hero">
          {([1, 2, 3, 4] as const).map(n => (
            <div key={n} className="grid grid-cols-2 gap-4">
              <Field label={`Stat ${n} — value`}>
                <input
                  className={inputCls}
                  value={content[`stat_${n}_value` as keyof HomepageContent]}
                  onChange={e => set(`stat_${n}_value` as keyof HomepageContent, e.target.value)}
                  placeholder={DEFAULT_CONTENT[`stat_${n}_value` as keyof HomepageContent]}
                />
              </Field>
              <Field label={`Stat ${n} — label`}>
                <input
                  className={inputCls}
                  value={content[`stat_${n}_label` as keyof HomepageContent]}
                  onChange={e => set(`stat_${n}_label` as keyof HomepageContent, e.target.value)}
                  placeholder={DEFAULT_CONTENT[`stat_${n}_label` as keyof HomepageContent]}
                />
              </Field>
            </div>
          ))}
        </Section>

        {/* ── Courses Section ─────────────────────────────────────────────── */}
        <Section title="Courses Section">
          <Field label="Section heading">
            <input className={inputCls} value={content.courses_title} onChange={e => set("courses_title", e.target.value)} placeholder={DEFAULT_CONTENT.courses_title} />
          </Field>
        </Section>

        {/* ── What's Inside ───────────────────────────────────────────────── */}
        <Section title="What's Inside the Course" hint="The purple feature grid section">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Section heading">
              <input className={inputCls} value={content.included_title} onChange={e => set("included_title", e.target.value)} placeholder={DEFAULT_CONTENT.included_title} />
            </Field>
            <Field label="Section subtext">
              <input className={inputCls} value={content.included_subtext} onChange={e => set("included_subtext", e.target.value)} placeholder={DEFAULT_CONTENT.included_subtext} />
            </Field>
          </div>

          <div className="mt-2 space-y-4">
            {([1, 2, 3, 4, 5, 6] as const).map(n => (
              <div key={n} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <p className="mb-3 text-xs font-bold text-zinc-400">Feature {n}</p>
                <div className="grid grid-cols-[5rem_1fr] gap-3 mb-3">
                  <Field label="Emoji" hint="optional">
                    <input
                      className={inputCls}
                      value={content[`feature_${n}_emoji` as keyof typeof content]}
                      onChange={e => set(`feature_${n}_emoji` as keyof typeof content, e.target.value)}
                      placeholder="e.g. 🎵"
                      maxLength={4}
                    />
                  </Field>
                  <Field label="Title">
                    <input
                      className={inputCls}
                      value={content[`feature_${n}_title` as keyof typeof content]}
                      onChange={e => set(`feature_${n}_title` as keyof typeof content, e.target.value)}
                      placeholder={DEFAULT_CONTENT[`feature_${n}_title` as keyof typeof DEFAULT_CONTENT]}
                    />
                  </Field>
                </div>
                <Field label="Description">
                  <textarea
                    rows={2}
                    className={textareaCls}
                    value={content[`feature_${n}_desc` as keyof typeof content]}
                    onChange={e => set(`feature_${n}_desc` as keyof typeof content, e.target.value)}
                    placeholder={DEFAULT_CONTENT[`feature_${n}_desc` as keyof typeof DEFAULT_CONTENT]}
                  />
                </Field>
              </div>
            ))}
          </div>
        </Section>

        {/* ── CTA Banner ─────────────────────────────────────────────────── */}
        <Section title="CTA Banner" hint="The gold banner near the bottom of the page">
          <Field label="Headline">
            <input className={inputCls} value={content.banner_headline} onChange={e => set("banner_headline", e.target.value)} placeholder={DEFAULT_CONTENT.banner_headline} />
          </Field>
          <Field label="Subtext">
            <textarea
              rows={2}
              className={textareaCls}
              value={content.banner_subtext}
              onChange={e => set("banner_subtext", e.target.value)}
              placeholder={DEFAULT_CONTENT.banner_subtext}
            />
          </Field>
          <Field label="Button text">
            <input className={inputCls} value={content.banner_cta} onChange={e => set("banner_cta", e.target.value)} placeholder={DEFAULT_CONTENT.banner_cta} />
          </Field>
        </Section>

      </div>
    </div>
  )
}
