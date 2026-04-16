import { createAdminClient } from "@/lib/supabase/admin"
import { unstable_cache } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ButtonShape    = "rounded" | "square" | "pill"
export type BorderStrength = "subtle" | "default" | "strong"
export type FontChoice     = "geist" | "inter" | "montserrat" | "poppins" | "raleway" | "dm-sans"

export interface SiteSettings {
  button_shape:     ButtonShape
  cta_color:        string   // hex — primary accent (buttons, links, highlights)
  secondary_color:  string   // hex — secondary accent (section backgrounds, badges)
  heading_color:    string   // hex, e.g. "#FFFFFF"
  body_font:        FontChoice
  heading_font:     FontChoice
  border_strength:  BorderStrength
}

export const DEFAULT_SETTINGS: SiteSettings = {
  button_shape:     "rounded",
  cta_color:        "#C9A227",
  secondary_color:  "#3D0057",
  heading_color:    "#FFFFFF",
  body_font:        "geist",
  heading_font:     "geist",
  border_strength:  "default",
}

// ─── CSS value sanitization ───────────────────────────────────────────────────

function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

function sanitizeCss(value: string): string {
  // Strip anything that could break out of a CSS value context
  return value.replace(/[<>"'`\\]/g, "")
}

// ─── Font metadata ────────────────────────────────────────────────────────────

export const FONT_META: Record<FontChoice, {
  label: string
  family: string                // CSS font-family value
  googleParam?: string          // URL param for Google Fonts API
  previewFamily: string         // for inline style previews
}> = {
  "geist": {
    label: "Geist",
    family: "'Geist', 'Geist Fallback', sans-serif",
    previewFamily: "Geist, sans-serif",
  },
  "inter": {
    label: "Inter",
    family: "'Inter', sans-serif",
    googleParam: "Inter:wght@400;500;600;700;800",
    previewFamily: "Inter, sans-serif",
  },
  "montserrat": {
    label: "Montserrat",
    family: "'Montserrat', sans-serif",
    googleParam: "Montserrat:wght@400;500;600;700;800;900",
    previewFamily: "Montserrat, sans-serif",
  },
  "poppins": {
    label: "Poppins",
    family: "'Poppins', sans-serif",
    googleParam: "Poppins:wght@400;500;600;700;800",
    previewFamily: "Poppins, sans-serif",
  },
  "raleway": {
    label: "Raleway",
    family: "'Raleway', sans-serif",
    googleParam: "Raleway:wght@400;500;600;700;800;900",
    previewFamily: "Raleway, sans-serif",
  },
  "dm-sans": {
    label: "DM Sans",
    family: "'DM Sans', sans-serif",
    googleParam: "DM+Sans:wght@400;500;600;700",
    previewFamily: "'DM Sans', sans-serif",
  },
}

// ─── Hex color helpers ────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").padEnd(6, "0")
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function shiftBrightness(hex: string, amount: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, v))
  const [r, g, b] = hexToRgb(hex)
  return "#" + [r, g, b].map(c => clamp(c + amount).toString(16).padStart(2, "0")).join("")
}

// ─── Fetch from Supabase (cached) ─────────────────────────────────────────────

export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")

      if (error || !data) return DEFAULT_SETTINGS

      const map = Object.fromEntries(
        data.map((r: { key: string; value: string }) => [r.key, r.value])
      )

      return {
        button_shape:     (map.button_shape    as ButtonShape)    ?? DEFAULT_SETTINGS.button_shape,
        cta_color:        map.cta_color                           ?? DEFAULT_SETTINGS.cta_color,
        secondary_color:  map.secondary_color                     ?? DEFAULT_SETTINGS.secondary_color,
        heading_color:    map.heading_color                       ?? DEFAULT_SETTINGS.heading_color,
        body_font:        (map.body_font       as FontChoice)     ?? DEFAULT_SETTINGS.body_font,
        heading_font:     (map.heading_font    as FontChoice)     ?? DEFAULT_SETTINGS.heading_font,
        border_strength:  (map.border_strength as BorderStrength) ?? DEFAULT_SETTINGS.border_strength,
      }
    } catch {
      return DEFAULT_SETTINGS
    }
  },
  ['site-settings'],
  { revalidate: 60, tags: ['site-settings'] }
)

// ─── Google Font links needed for the current settings ───────────────────────

export function getRequiredFontLinks(settings: SiteSettings): string[] {
  const params = new Set<string>()
  const bodyMeta    = FONT_META[settings.body_font]
  const headingMeta = FONT_META[settings.heading_font]
  if (bodyMeta.googleParam)    params.add(bodyMeta.googleParam)
  if (headingMeta.googleParam) params.add(headingMeta.googleParam)
  return Array.from(params).map(
    p => `https://fonts.googleapis.com/css2?family=${p}&display=swap`
  )
}

// ─── Build CSS override block ─────────────────────────────────────────────────

export function buildSettingsCSS(settings: SiteSettings): string {
  const rootVars: string[] = []
  const extra: string[]    = []

  // ── Button shape ──────────────────────────────────────────────────────────
  // Only --btn-radius is changed — never --radius or --radius-* so that
  // content cards, stat boxes, and other containers keep their natural shape.
  const btnRadius =
    settings.button_shape === "square"  ? "0px"
    : settings.button_shape === "pill"  ? "9999px"
    : "0.375rem" // "rounded" default
  rootVars.push(`--btn-radius: ${btnRadius}`)

  // ── Secondary / accent color ─────────────────────────────────────────────
  // Exposes --brand-purple so section backgrounds, badges, and other
  // secondary-coloured elements track the admin setting at runtime.
  const secondary = isValidHex(settings.secondary_color) ? settings.secondary_color : DEFAULT_SETTINGS.secondary_color
  rootVars.push(
    `--brand-purple: ${secondary}`,
    `--secondary: ${secondary}`,
    `--color-secondary: ${secondary}`,
  )

  // ── CTA / accent color ───────────────────────────────────────────────────
  // 1. --brand-gold  → picked up by page.tsx / header.tsx inline styles
  //    (those files use GOLD = "var(--brand-gold)")
  // 2. --color-amber-* → picked up by any Tailwind amber utility classes
  // 3. Semantic shadcn vars (--primary, --ring) for UI components
  const cta = isValidHex(settings.cta_color) ? settings.cta_color : DEFAULT_SETTINGS.cta_color
  const ctaLight = shiftBrightness(cta, 24)   // ~amber-400 hover state
  const ctaDark  = shiftBrightness(cta, -24)  // ~amber-600 active state
  rootVars.push(
    // Brand token — used by inline styles throughout landing page & header
    `--brand-gold: ${cta}`,
    // Tailwind v4 amber palette overrides
    `--color-amber-300: ${shiftBrightness(cta, 48)}`,
    `--color-amber-400: ${ctaLight}`,
    `--color-amber-500: ${cta}`,
    `--color-amber-600: ${ctaDark}`,
    `--color-amber-700: ${shiftBrightness(cta, -48)}`,
    // Semantic vars used by shadcn UI components
    `--primary: ${cta}`,
    `--color-primary: ${cta}`,
    `--ring: ${cta}`,
    `--color-ring: ${cta}`,
    `--sidebar-primary: ${cta}`,
    `--sidebar-ring: ${cta}`,
  )

  // ── Heading color ─────────────────────────────────────────────────────────
  // Use !important to reliably override explicit text-* utility classes on headings
  const headingColor = isValidHex(settings.heading_color) ? settings.heading_color : DEFAULT_SETTINGS.heading_color
  if (headingColor !== DEFAULT_SETTINGS.heading_color) {
    extra.push(
      `h1,h2,h3,h4,h5,h6{color:${headingColor}!important}`
    )
  }

  // ── Border strength ───────────────────────────────────────────────────────
  if (settings.border_strength === "subtle") {
    rootVars.push("--border: oklch(0.13 0 0)", "--color-border: oklch(0.13 0 0)")
  } else if (settings.border_strength === "strong") {
    rootVars.push("--border: oklch(0.28 0 0)", "--color-border: oklch(0.28 0 0)")
  }

  // ── Body font ─────────────────────────────────────────────────────────────
  if (settings.body_font !== "geist") {
    const family = sanitizeCss(FONT_META[settings.body_font].family)
    rootVars.push(`--font-sans: ${family}`)
    // Also target body directly with !important to override the font-sans utility
    extra.push(`body{font-family:${family}!important}`)
  }

  // ── Heading font ──────────────────────────────────────────────────────────
  if (settings.heading_font !== "geist") {
    const family = sanitizeCss(FONT_META[settings.heading_font].family)
    extra.push(
      `h1,h2,h3,h4,h5,h6,[class*="font-black"],[class*="font-bold"]{font-family:${family}!important}`
    )
  }

  const parts: string[] = []
  if (rootVars.length > 0) parts.push(`:root{${rootVars.join(";")}}`)
  if (extra.length > 0)    parts.push(...extra)
  return parts.join("\n")
}
