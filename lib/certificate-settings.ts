/**
 * Certificate design settings
 * ────────────────────────────
 * Stored as a single JSON blob under key `certificate_settings` in site_settings.
 * Admins edit these from /admin/certificate — no code deploy needed.
 */

import { createAdminClient } from "@/lib/supabase/admin"

// ─── Border styles ────────────────────────────────────────────────────────────

export type BorderStyle =
  | "bars"        // gold top + bottom bars (original)
  | "full"        // solid border around the whole cert
  | "double"      // double-line border
  | "corners"     // decorative corner marks only
  | "none"        // no border decoration

// ─── Name font options ────────────────────────────────────────────────────────

export type NameFont =
  | "georgia"       // Georgia (serif, elegant — browser-safe)
  | "playfair"      // Playfair Display (Google Font, classic certificates)
  | "cormorant"     // Cormorant Garamond (Google Font, refined)
  | "libre"         // Libre Baskerville (Google Font, formal)
  | "montserrat"    // Montserrat (sans-serif, modern)
  | "greatvibes"    // Great Vibes (Google Font, cursive script)

export const NAME_FONT_META: Record<NameFont, {
  label:       string
  family:      string
  googleParam: string | null
}> = {
  georgia:     { label: "Georgia",              family: "Georgia, serif",                        googleParam: null },
  playfair:    { label: "Playfair Display",      family: "'Playfair Display', serif",             googleParam: "Playfair+Display:ital,wght@0,700;1,700" },
  cormorant:   { label: "Cormorant Garamond",   family: "'Cormorant Garamond', serif",           googleParam: "Cormorant+Garamond:ital,wght@0,600;1,600" },
  libre:       { label: "Libre Baskerville",    family: "'Libre Baskerville', serif",            googleParam: "Libre+Baskerville:ital,wght@0,700;1,700" },
  montserrat:  { label: "Montserrat",           family: "'Montserrat', sans-serif",              googleParam: "Montserrat:wght@700;800" },
  greatvibes:  { label: "Great Vibes (script)", family: "'Great Vibes', cursive",               googleParam: "Great+Vibes" },
}

// ─── Settings type ────────────────────────────────────────────────────────────

export interface CertificateSettings {
  // Header
  org_name:          string   // e.g. "SALSA TE GUSTA"
  org_tagline:       string   // e.g. "ONLINE DANCE ACADEMY"
  logo_url:          string   // uploaded image shown in header (empty = text only)

  // Body copy
  preamble:          string   // "This is to certify that"
  body_text:         string   // "has successfully completed the course"

  // Signature / footer
  signature_url:     string   // uploaded signature image (empty = skip)
  instructor_title:  string   // e.g. "INSTRUCTOR" (label under name)
  footer_website:    string   // e.g. "salsategusta.nl"
  show_credential:   boolean  // show credential ID in footer

  // Design
  accent_color:      string   // hex — bars, badge, course title, divider
  header_bg:         string   // hex — header band background
  body_bg:           string   // hex — main certificate body background
  name_font:         NameFont
  border_style:      BorderStyle
  border_color:      string   // hex — used for full/double/corners border
}

// ─── Defaults (matches original design) ──────────────────────────────────────

export const DEFAULT_CERTIFICATE_SETTINGS: CertificateSettings = {
  org_name:          "SALSA TE GUSTA",
  org_tagline:       "ONLINE DANCE ACADEMY",
  logo_url:          "",

  preamble:          "This is to certify that",
  body_text:         "has successfully completed the course",

  signature_url:     "",
  instructor_title:  "INSTRUCTOR",
  footer_website:    "salsategusta.nl",
  show_credential:   true,

  accent_color:      "#C9A227",
  header_bg:         "#0a0a0a",
  body_bg:           "#ffffff",
  name_font:         "georgia",
  border_style:      "bars",
  border_color:      "#C9A227",
}

// ─── Fetch from DB ────────────────────────────────────────────────────────────

export async function getCertificateSettings(): Promise<CertificateSettings> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "certificate_settings")
      .single()

    if (!data?.value) return DEFAULT_CERTIFICATE_SETTINGS

    const parsed = JSON.parse(data.value as string)
    return { ...DEFAULT_CERTIFICATE_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_CERTIFICATE_SETTINGS
  }
}
