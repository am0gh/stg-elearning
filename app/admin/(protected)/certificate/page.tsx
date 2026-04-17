"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  CheckCircle2, ChevronDown, ChevronUp,
  Loader2, Save, Upload, X,
} from "lucide-react"
import { CertificateTemplate } from "@/components/certificate-template"
import {
  DEFAULT_CERTIFICATE_SETTINGS,
  NAME_FONT_META,
  type CertificateSettings,
  type BorderStyle,
  type NameFont,
} from "@/lib/certificate-settings"
import type { CertificateData } from "@/components/certificate-template"

// ─── Dummy preview data ───────────────────────────────────────────────────────

const PREVIEW_DATA: CertificateData = {
  studentName:    "Maria García",
  courseTitle:    "Level 1 Salsa",
  levelLabel:     "Level 1",
  instructorName: "Carlos Rodríguez",
  completedDate:  new Date().toLocaleDateString("nl-NL", { year: "numeric", month: "long", day: "numeric" }),
  enrollmentId:   "PREVIEW000",
}

// ─── Small reusable form controls ─────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
    />
  )
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 w-14 cursor-pointer rounded border border-zinc-700 bg-zinc-800 p-0.5"
      />
      <input
        type="text"
        value={value}
        onChange={e => {
          const v = e.target.value
          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v)
        }}
        className="w-28 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-white focus:border-amber-500 focus:outline-none"
        maxLength={7}
      />
    </div>
  )
}

function ToggleInput({ value, onChange, label }: {
  value: boolean; onChange: (v: boolean) => void; label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center gap-3"
    >
      <div
        className="relative h-5 w-9 rounded-full transition-colors"
        style={{ background: value ? "#C9A227" : "rgb(63 63 70)" }}
      >
        <div
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
          style={{ transform: value ? "translateX(18px)" : "translateX(2px)" }}
        />
      </div>
      <span className="text-sm text-zinc-300">{label}</span>
    </button>
  )
}

function SectionHeader({ label, open, onToggle }: {
  label: string; open: boolean; onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between py-3 text-left"
    >
      <span className="text-sm font-bold text-white">{label}</span>
      {open ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
    </button>
  )
}

// ─── Image upload field ───────────────────────────────────────────────────────

function ImageField({
  label, value, uploadType, onChange,
}: {
  label: string; value: string; uploadType: "logo" | "signature"; onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("type", uploadType)
    const res = await fetch("/api/admin/certificate-settings/upload", { method: "POST", body: fd })
    const data = await res.json()
    if (data.url) onChange(data.url)
    setUploading(false)
  }

  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} className="h-10 w-auto rounded border border-zinc-700 object-contain" style={{ maxWidth: "120px" }} />
            <button
              onClick={() => onChange("")}
              className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ) : (
          <div
            className="flex h-10 w-24 items-center justify-center rounded border border-dashed border-zinc-700 text-xs text-zinc-600"
            style={{ cursor: "pointer" }}
            onClick={() => ref.current?.click()}
          >
            None
          </div>
        )}
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50"
          style={{ background: "rgba(201,162,39,0.12)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.25)" }}
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
    </Field>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const BORDER_OPTIONS: { value: BorderStyle; label: string; description: string }[] = [
  { value: "bars",    label: "Gold Bars",      description: "Thick bars at top & bottom" },
  { value: "full",    label: "Full Border",    description: "Solid line around the edge" },
  { value: "double",  label: "Double Line",    description: "Elegant double-line frame" },
  { value: "corners", label: "Corner Marks",   description: "Decorative corner accents" },
  { value: "none",    label: "None",           description: "No border decoration" },
]

export default function CertificateDesignerPage() {
  const [settings, setSettings]   = useState<CertificateSettings>(DEFAULT_CERTIFICATE_SETTINGS)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    branding: true, copy: true, design: true, border: true,
  })

  const toggle = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  const set = useCallback(<K extends keyof CertificateSettings>(
    key: K, value: CertificateSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }, [])

  // Load
  useEffect(() => {
    fetch("/api/admin/certificate-settings")
      .then(r => r.json())
      .then(data => setSettings({ ...DEFAULT_CERTIFICATE_SETTINGS, ...data }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Save
  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch("/api/admin/certificate-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div>
          <h1 className="text-lg font-black text-white">Certificate Designer</h1>
          <p className="text-xs text-zinc-500">Changes apply to all certificates immediately after saving</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold disabled:opacity-50"
          style={{ background: "#C9A227", color: "#0a0a0a" }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : saving ? "Saving…" : "Save Certificate"}
        </button>
      </div>

      {/* ── Split layout ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Left: controls */}
        <div className="w-72 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-900">
          <div className="divide-y divide-zinc-800 px-5">

            {/* ── Branding ── */}
            <div>
              <SectionHeader label="Branding" open={openSections.branding} onToggle={() => toggle("branding")} />
              {openSections.branding && (
                <div className="space-y-4 pb-5">
                  <Field label="Organisation Name">
                    <TextInput value={settings.org_name} onChange={v => set("org_name", v)} placeholder="SALSA TE GUSTA" />
                  </Field>
                  <Field label="Tagline">
                    <TextInput value={settings.org_tagline} onChange={v => set("org_tagline", v)} placeholder="ONLINE DANCE ACADEMY" />
                  </Field>
                  <ImageField label="Logo" value={settings.logo_url} uploadType="logo" onChange={v => set("logo_url", v)} />
                  <Field label="Website (footer)">
                    <TextInput value={settings.footer_website} onChange={v => set("footer_website", v)} placeholder="salsategusta.nl" />
                  </Field>
                  <ToggleInput value={settings.show_credential} onChange={v => set("show_credential", v)} label="Show credential ID" />
                </div>
              )}
            </div>

            {/* ── Copy ── */}
            <div>
              <SectionHeader label="Certificate Text" open={openSections.copy} onToggle={() => toggle("copy")} />
              {openSections.copy && (
                <div className="space-y-4 pb-5">
                  <Field label="Preamble">
                    <TextInput value={settings.preamble} onChange={v => set("preamble", v)} placeholder="This is to certify that" />
                  </Field>
                  <Field label="Body Text">
                    <TextInput value={settings.body_text} onChange={v => set("body_text", v)} placeholder="has successfully completed the course" />
                  </Field>
                  <Field label="Instructor Label">
                    <TextInput value={settings.instructor_title} onChange={v => set("instructor_title", v)} placeholder="INSTRUCTOR" />
                  </Field>
                  <ImageField label="Signature Image" value={settings.signature_url} uploadType="signature" onChange={v => set("signature_url", v)} />
                </div>
              )}
            </div>

            {/* ── Design ── */}
            <div>
              <SectionHeader label="Colours & Font" open={openSections.design} onToggle={() => toggle("design")} />
              {openSections.design && (
                <div className="space-y-4 pb-5">
                  <Field label="Accent Colour">
                    <ColorInput value={settings.accent_color} onChange={v => set("accent_color", v)} />
                  </Field>
                  <Field label="Header Background">
                    <ColorInput value={settings.header_bg} onChange={v => set("header_bg", v)} />
                  </Field>
                  <Field label="Certificate Background">
                    <ColorInput value={settings.body_bg} onChange={v => set("body_bg", v)} />
                  </Field>
                  <Field label="Name Font">
                    <select
                      value={settings.name_font}
                      onChange={e => set("name_font", e.target.value as NameFont)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                    >
                      {(Object.keys(NAME_FONT_META) as NameFont[]).map(k => (
                        <option key={k} value={k}>{NAME_FONT_META[k].label}</option>
                      ))}
                    </select>
                  </Field>
                  {/* Font preview */}
                  <div
                    className="rounded-lg p-3 text-center text-lg italic"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      fontFamily: NAME_FONT_META[settings.name_font].family,
                      color: "white",
                    }}
                  >
                    {PREVIEW_DATA.studentName}
                  </div>
                </div>
              )}
            </div>

            {/* ── Border ── */}
            <div>
              <SectionHeader label="Border Style" open={openSections.border} onToggle={() => toggle("border")} />
              {openSections.border && (
                <div className="space-y-3 pb-5">
                  {BORDER_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("border_style", opt.value)}
                      className="flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors"
                      style={{
                        border:     `1px solid ${settings.border_style === opt.value ? "#C9A227" : "rgb(63 63 70)"}`,
                        background: settings.border_style === opt.value ? "rgba(201,162,39,0.08)" : "transparent",
                      }}
                    >
                      <div
                        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                        style={{
                          border: `1.5px solid ${settings.border_style === opt.value ? "#C9A227" : "rgb(113 113 122)"}`,
                          background: settings.border_style === opt.value ? "#C9A227" : "transparent",
                        }}
                      >
                        {settings.border_style === opt.value && (
                          <div className="h-1.5 w-1.5 rounded-full bg-black" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{opt.label}</p>
                        <p className="text-xs text-zinc-500">{opt.description}</p>
                      </div>
                    </button>
                  ))}

                  {settings.border_style !== "bars" && settings.border_style !== "none" && (
                    <Field label="Border Colour">
                      <ColorInput value={settings.border_color} onChange={v => set("border_color", v)} />
                    </Field>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right: live preview */}
        <div className="flex flex-1 flex-col overflow-y-auto bg-zinc-950 p-8">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-600">
            Live Preview — using sample student data
          </p>

          {/* Scale the certificate down to fit the panel */}
          <div className="w-full">
            <CertificateTemplate
              settings={settings}
              data={PREVIEW_DATA}
              loadFonts
            />
          </div>
        </div>

      </div>
    </div>
  )
}
