"use client"

import { useState, useEffect } from "react"
import { Check, Loader2, Palette, Type, Sliders, ChevronRight } from "lucide-react"
import type { SiteSettings, ButtonShape, FontChoice, BorderStrength } from "@/lib/site-settings"
import { FONT_META } from "@/lib/site-settings"

// ─── Static data ──────────────────────────────────────────────────────────────

const BUTTON_SHAPES: { value: ButtonShape; label: string; radius: string }[] = [
  { value: "rounded", label: "Rounded",  radius: "0.5rem" },
  { value: "square",  label: "Square",   radius: "0" },
  { value: "pill",    label: "Pill",     radius: "9999px" },
]

const PRIMARY_PRESETS = [
  { label: "Classic Gold",   hex: "#C9A227" },
  { label: "Bright Gold",    hex: "#F0C040" },
  { label: "Deep Gold",      hex: "#B8860B" },
  { label: "Warm Amber",     hex: "#E5A017" },
  { label: "Coral Red",      hex: "#E05252" },
  { label: "Salsa Red",      hex: "#CC2936" },
  { label: "Emerald",        hex: "#2ECC71" },
  { label: "Sky Blue",       hex: "#3B9EE2" },
  { label: "Electric Blue",  hex: "#4361EE" },
  { label: "Hot Pink",       hex: "#D63384" },
  { label: "Platinum",       hex: "#E5E5E5" },
]

const SECONDARY_PRESETS = [
  { label: "Brand Purple",   hex: "#3D0057" },
  { label: "Deep Violet",    hex: "#2D1B69" },
  { label: "Midnight Navy",  hex: "#0A2342" },
  { label: "Forest",         hex: "#1A3D2B" },
  { label: "Burgundy",       hex: "#4A1528" },
  { label: "Dark Teal",      hex: "#0D3B4A" },
  { label: "Espresso",       hex: "#2C1A0E" },
  { label: "Slate",          hex: "#1E293B" },
  { label: "Charcoal",       hex: "#1A1A1A" },
]

const HEADING_PRESETS = [
  { label: "White",       hex: "#FFFFFF" },
  { label: "Classic Gold", hex: "#C9A227" },
  { label: "Bright Gold", hex: "#F0C040" },
  { label: "Light Gray",  hex: "#D4D4D4" },
  { label: "Warm Cream",  hex: "#F5EDD6" },
  { label: "Coral",       hex: "#E05252" },
]

const BORDER_STRENGTHS: { value: BorderStrength; label: string; desc: string; alpha: number }[] = [
  { value: "subtle",  label: "Subtle",  desc: "Nearly invisible", alpha: 0.06 },
  { value: "default", label: "Default", desc: "Standard",         alpha: 0.15 },
  { value: "strong",  label: "Strong",  desc: "High contrast",    alpha: 0.30 },
]

const FONT_ORDER: FontChoice[] = ["geist", "inter", "montserrat", "poppins", "raleway", "dm-sans"]
const ALL_GOOGLE_PARAMS = FONT_ORDER.map(f => FONT_META[f].googleParam).filter(Boolean) as string[]

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
        {icon}
      </span>
      <h2 className="text-sm font-semibold text-white">{children}</h2>
    </div>
  )
}

// ── Compact 3-way option row ──────────────────────────────────────────────────

function ThreeWay<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string; preview?: React.ReactNode }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`relative flex flex-1 flex-col items-center gap-2 rounded-xl border p-3 transition-all ${
            value === opt.value
              ? "border-amber-500 bg-amber-500/10"
              : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
          }`}
        >
          {value === opt.value && (
            <span className="absolute right-2 top-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500">
              <Check className="h-2 w-2 text-black" />
            </span>
          )}
          {opt.preview}
          <span className="text-xs font-medium text-zinc-300">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}

// ── Color swatch picker ───────────────────────────────────────────────────────

function ColorPicker({
  value, onChange, presets, label,
}: {
  value: string
  onChange: (hex: string) => void
  presets: { label: string; hex: string }[]
  label: string
}) {
  const norm = (h: string) => h.toLowerCase()
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      {/* Swatches */}
      <div className="flex flex-wrap gap-2">
        {presets.map(({ label: l, hex }) => (
          <button
            key={hex}
            type="button"
            title={l}
            onClick={() => onChange(hex)}
            className="relative h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
            style={{ backgroundColor: hex }}
          >
            {norm(value) === norm(hex) && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full ring-2 ring-white ring-offset-1 ring-offset-zinc-900">
                <Check className="h-3 w-3 text-white" style={{ filter: "drop-shadow(0 0 1px black)" }} />
              </span>
            )}
          </button>
        ))}
      </div>
      {/* Hex input + native picker */}
      <div className="flex items-center gap-2">
        <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-600">
          <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: value }} />
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <input
          type="text"
          value={value.toUpperCase()}
          onChange={e => {
            const v = e.target.value
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v)
          }}
          className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 font-mono text-xs text-white focus:border-amber-500 focus:outline-none"
          maxLength={7}
        />
      </div>
    </div>
  )
}

// ── Font selector ─────────────────────────────────────────────────────────────

function FontSelector({ value, onChange }: { value: FontChoice; onChange: (f: FontChoice) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {FONT_ORDER.map(font => {
        const meta = FONT_META[font]
        const active = value === font
        return (
          <button
            key={font}
            type="button"
            onClick={() => onChange(font)}
            className={`relative flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all ${
              active
                ? "border-amber-500 bg-amber-500/10"
                : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
            }`}
          >
            {active && (
              <span className="absolute right-2 top-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500">
                <Check className="h-2 w-2 text-black" />
              </span>
            )}
            <span className="text-xl font-bold text-white" style={{ fontFamily: meta.previewFamily }}>Aa</span>
            <span className="text-[11px] font-medium text-zinc-300">{meta.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Live preview panel ───────────────────────────────────────────────────────

function LivePreview({ s }: { s: SiteSettings }) {
  const radius =
    s.button_shape === "square" ? "0"
    : s.button_shape === "pill" ? "9999px"
    : "0.5rem"

  const borderAlpha = { subtle: 0.06, default: 0.15, strong: 0.30 }[s.border_strength]
  const border = `1px solid rgba(255,255,255,${borderAlpha})`

  const hFont = FONT_META[s.heading_font].previewFamily
  const bFont = FONT_META[s.body_font].previewFamily

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-700/60 bg-[#0a0a0a] text-sm shadow-2xl">
      {/* Label */}
      <div className="border-b border-zinc-800 px-4 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">Live Preview</span>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: `rgba(255,255,255,${borderAlpha})` }}>
        <span className="text-xs font-black text-white" style={{ fontFamily: bFont }}>Salsa te Gusta</span>
        <button
          className="px-3 py-1 text-[11px] font-bold text-black"
          style={{ backgroundColor: s.cta_color, borderRadius: radius, fontFamily: bFont }}
        >
          Book a Class
        </button>
      </div>

      {/* Hero */}
      <div className="px-4 py-6">
        <p className="text-xl font-black uppercase leading-tight" style={{ color: s.heading_color, fontFamily: hFont }}>
          Dance.<br />Connect.<br />Belong.
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-400" style={{ fontFamily: bFont }}>
          8-week online salsa course. Learn at your own pace with expert instructors.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="px-3 py-1.5 text-[11px] font-bold text-black"
            style={{ backgroundColor: s.cta_color, borderRadius: radius, fontFamily: bFont }}
          >
            Start Learning — €89
          </button>
          <button
            className="px-3 py-1.5 text-[11px] font-bold"
            style={{
              border: `1.5px solid ${s.cta_color}`,
              color: s.cta_color,
              borderRadius: radius,
              fontFamily: bFont,
              background: "transparent",
            }}
          >
            Watch Preview
          </button>
        </div>
      </div>

      {/* Secondary colour section */}
      <div className="px-4 py-5" style={{ backgroundColor: s.secondary_color }}>
        <span
          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: s.cta_color, color: "#000" }}
        >
          What&apos;s Inside
        </span>
        <p className="mt-2 text-xs font-black uppercase text-white" style={{ fontFamily: hFont }}>
          Everything you need to dance salsa
        </p>
        <p className="mt-1 text-[11px] text-white/60" style={{ fontFamily: bFont }}>
          Musicality · Technique · Culture · Community
        </p>
      </div>

      {/* Course card */}
      <div className="p-4">
        <div className="rounded-xl p-3" style={{ border, backgroundColor: "rgba(255,255,255,0.03)" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-white" style={{ fontFamily: hFont }}>Level 1 — Beginner</p>
              <p className="mt-0.5 text-[10px] text-zinc-500" style={{ fontFamily: bFont }}>8 weeks · 4 months access</p>
            </div>
            <span
              className="rounded px-2 py-0.5 text-[10px] font-bold text-black"
              style={{ backgroundColor: s.cta_color, borderRadius: radius }}
            >
              €89
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DesignPage() {
  const [settings, setSettings] = useState<SiteSettings>({
    button_shape:    "rounded",
    cta_color:       "#C9A227",
    secondary_color: "#3D0057",
    heading_color:   "#FFFFFF",
    body_font:       "geist",
    heading_font:    "geist",
    border_strength: "default",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState("")

  // Active font tab: "heading" | "body"
  const [fontTab, setFontTab] = useState<"heading" | "body">("heading")

  // Load all Google Fonts so previews render correctly inside admin
  useEffect(() => {
    ALL_GOOGLE_PARAMS.forEach(param => {
      if (document.querySelector(`link[href*="${encodeURIComponent(param.split(":")[0])}"]`)) return
      const link = document.createElement("link")
      link.rel  = "stylesheet"
      link.href = `https://fonts.googleapis.com/css2?family=${param}&display=swap`
      document.head.appendChild(link)
    })
  }, [])

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(data => { setSettings(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const update = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")
    setSaved(false)
    const res = await fetch("/api/admin/settings", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(settings),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const data = await res.json()
      setError(data.error ?? "Something went wrong")
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    )
  }

  const borderAlpha = { subtle: 0.06, default: 0.15, strong: 0.30 }[settings.border_strength]

  return (
    <div className="p-6 lg:p-8">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Design</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Customise your brand colours, typography, and style. Changes go live across every page.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-900/50 px-3 py-1 text-xs text-green-400">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_300px]">

        {/* ── Settings column ───────────────────────────────────────────── */}
        <div className="max-w-lg space-y-10">

          {/* ── 1. Colour Palette ──────────────────────────────────────── */}
          <section>
            <SectionLabel icon={<Palette className="h-3.5 w-3.5" />}>Colour Palette</SectionLabel>

            {/* Palette harmony card */}
            <div className="mb-6 overflow-hidden rounded-2xl border border-zinc-800">
              {/* Swatch pair */}
              <div className="grid grid-cols-2">
                <div className="flex flex-col gap-1 p-4" style={{ backgroundColor: settings.cta_color }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-black/60">Primary</span>
                  <span className="font-black text-black">{settings.cta_color.toUpperCase()}</span>
                </div>
                <div className="flex flex-col gap-1 p-4" style={{ backgroundColor: settings.secondary_color }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Secondary</span>
                  <span className="font-black text-white">{settings.secondary_color.toUpperCase()}</span>
                </div>
              </div>
              {/* Mini harmony preview */}
              <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: settings.secondary_color }}>
                <button
                  className="rounded px-3 py-1 text-xs font-bold text-black"
                  style={{ backgroundColor: settings.cta_color, borderRadius: "0.375rem" }}
                >
                  Enroll Now
                </button>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-black"
                  style={{ backgroundColor: settings.cta_color }}
                >
                  Available
                </span>
                <span className="text-xs font-semibold text-white">on secondary background</span>
              </div>
            </div>

            {/* Pickers side by side */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <ColorPicker
                label="Primary — buttons, links & highlights"
                value={settings.cta_color}
                onChange={v => update("cta_color", v)}
                presets={PRIMARY_PRESETS}
              />
              <ColorPicker
                label="Secondary — section backgrounds & badges"
                value={settings.secondary_color}
                onChange={v => update("secondary_color", v)}
                presets={SECONDARY_PRESETS}
              />
            </div>
          </section>

          {/* ── 2. Typography ──────────────────────────────────────────── */}
          <section>
            <SectionLabel icon={<Type className="h-3.5 w-3.5" />}>Typography</SectionLabel>

            {/* Tab switcher */}
            <div className="mb-4 inline-flex rounded-xl border border-zinc-700 bg-zinc-900 p-1">
              {(["heading", "body"] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFontTab(tab)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                    fontTab === tab
                      ? "bg-zinc-700 text-white shadow"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab === "heading" ? "Heading Font" : "Body Font"}
                </button>
              ))}
            </div>

            <FontSelector
              value={fontTab === "heading" ? settings.heading_font : settings.body_font}
              onChange={v => update(fontTab === "heading" ? "heading_font" : "body_font", v)}
            />

            {/* Typography live preview */}
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p
                className="text-2xl font-black uppercase leading-tight"
                style={{
                  color: settings.heading_color,
                  fontFamily: FONT_META[settings.heading_font].previewFamily,
                }}
              >
                Learn Salsa Online
              </p>
              <p
                className="mt-2 text-sm text-zinc-400"
                style={{ fontFamily: FONT_META[settings.body_font].previewFamily }}
              >
                Join thousands of dancers. 8-week programme, expert instructors, on-demand access.
              </p>
              <p className="mt-3 text-[11px] text-zinc-600">
                Heading: {FONT_META[settings.heading_font].label} · Body: {FONT_META[settings.body_font].label}
              </p>
            </div>
          </section>

          {/* ── 3. Style & Finish ──────────────────────────────────────── */}
          <section>
            <SectionLabel icon={<Sliders className="h-3.5 w-3.5" />}>Style & Finish</SectionLabel>

            {/* Button shape */}
            <div className="mb-6">
              <p className="mb-3 text-xs font-medium text-zinc-400">Button shape</p>
              <ThreeWay
                options={BUTTON_SHAPES.map(({ value, label, radius }) => ({
                  value,
                  label,
                  preview: (
                    <div
                      className="flex h-7 w-full items-center justify-center text-[10px] font-bold text-black"
                      style={{ backgroundColor: settings.cta_color, borderRadius: radius }}
                    >
                      Book Now
                    </div>
                  ),
                }))}
                value={settings.button_shape}
                onChange={v => update("button_shape", v)}
              />
            </div>

            {/* Border strength */}
            <div className="mb-6">
              <p className="mb-3 text-xs font-medium text-zinc-400">Card border visibility</p>
              <ThreeWay
                options={BORDER_STRENGTHS.map(({ value, label, desc, alpha }) => ({
                  value,
                  label,
                  preview: (
                    <div
                      className="h-7 w-full rounded-md"
                      style={{
                        border: `1px solid rgba(255,255,255,${alpha})`,
                        background: "rgba(255,255,255,0.03)",
                      }}
                    />
                  ),
                }))}
                value={settings.border_strength}
                onChange={v => update("border_strength", v)}
              />
            </div>

            {/* Heading color */}
            <div>
              <p className="mb-3 text-xs font-medium text-zinc-400">Heading colour</p>
              <ColorPicker
                label=""
                value={settings.heading_color}
                onChange={v => update("heading_color", v)}
                presets={HEADING_PRESETS}
              />
            </div>
          </section>

        </div>

        {/* ── Sticky preview column ──────────────────────────────────── */}
        <div className="xl:sticky xl:top-8 xl:self-start">
          <LivePreview s={settings} />

          {/* Quick link to live site */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
          >
            View live site <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </div>

      </div>
    </div>
  )
}
