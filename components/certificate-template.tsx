/**
 * CertificateTemplate
 * ────────────────────
 * Pure presentational component — no data fetching, no side effects.
 * Accepts both the certificate design settings and the student/course data.
 *
 * Used in two places:
 *   1. /certificate/[enrollmentId]   — the real, printable certificate
 *   2. /admin/certificate            — live design preview (with dummy data)
 */

import type { CertificateSettings, NameFont } from "@/lib/certificate-settings"
import { NAME_FONT_META } from "@/lib/certificate-settings"

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CertificateData {
  studentName:    string
  courseTitle:    string
  levelLabel:     string
  instructorName: string
  completedDate:  string
  enrollmentId:   string
}

interface CertificateTemplateProps {
  settings:     CertificateSettings
  data:         CertificateData
  /** When true, injects <link> tags for Google Fonts (use in real certificate).
   *  In admin preview these are loaded by the page-level font loader. */
  loadFonts?:   boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "").padEnd(6, "0")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function fontFamily(font: NameFont) {
  return NAME_FONT_META[font]?.family ?? "Georgia, serif"
}

// ─── Border renderers ─────────────────────────────────────────────────────────

function BorderBars({ color }: { color: string }) {
  const gradient = `linear-gradient(90deg, ${color} 0%, ${lighten(color)} 50%, ${color} 100%)`
  return (
    <>
      <div style={{ height: "8px", background: gradient, flexShrink: 0 }} />
      <div style={{ height: "5px", background: gradient, flexShrink: 0 }} />
    </>
  )
}

function lighten(hex: string): string {
  const h = hex.replace("#", "").padEnd(6, "0")
  const shift = (v: number) => Math.min(255, v + 50).toString(16).padStart(2, "0")
  return "#" + shift(parseInt(h.slice(0, 2), 16)) + shift(parseInt(h.slice(2, 4), 16)) + shift(parseInt(h.slice(4, 6), 16))
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CertificateTemplate({
  settings: s,
  data: d,
  loadFonts = false,
}: CertificateTemplateProps) {
  const fontMeta    = NAME_FONT_META[s.name_font]
  const nameFontCss = fontFamily(s.name_font)

  const hasBorderBars    = s.border_style === "bars"
  const hasBorderFull    = s.border_style === "full"
  const hasBorderDouble  = s.border_style === "double"
  const hasBorderCorners = s.border_style === "corners"

  // Outer wrapper border for full/double styles
  const outerBorder =
    hasBorderFull   ? `3px solid ${s.border_color}` :
    hasBorderDouble ? `3px double ${s.border_color}` :
    "none"

  const innerBorder =
    hasBorderDouble ? `1px solid ${s.border_color}` : "none"

  return (
    <>
      {/* Google Font links */}
      {loadFonts && fontMeta.googleParam && (
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?family=${fontMeta.googleParam}&display=swap`}
        />
      )}

      <div
        className="cert-wrapper"
        style={{
          background:   s.body_bg,
          borderRadius: "12px",
          overflow:     "hidden",
          width:        "100%",
          aspectRatio:  "1.414 / 1",
          display:      "flex",
          flexDirection: "column",
          position:     "relative",
          fontFamily:   "Georgia, serif",
          border:       outerBorder,
        }}
      >
        {/* Inner double-border inset */}
        {hasBorderDouble && (
          <div
            style={{
              position: "absolute",
              inset:    "8px",
              border:   innerBorder,
              borderRadius: "6px",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />
        )}

        {/* Corner ornaments */}
        {hasBorderCorners && (
          <>
            {[
              { top: 12, left: 12 },
              { top: 12, right: 12 },
              { bottom: 12, left: 12 },
              { bottom: 12, right: 12 },
            ].map((pos, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: "40px",
                  height: "40px",
                  borderTop:    i < 2 ? `3px solid ${s.border_color}` : "none",
                  borderBottom: i >= 2 ? `3px solid ${s.border_color}` : "none",
                  borderLeft:   i % 2 === 0 ? `3px solid ${s.border_color}` : "none",
                  borderRight:  i % 2 === 1 ? `3px solid ${s.border_color}` : "none",
                  pointerEvents: "none",
                  zIndex: 2,
                  ...pos,
                }}
              />
            ))}
          </>
        )}

        {/* ── Top bar ── */}
        {hasBorderBars && (
          <div style={{ height: "8px", background: `linear-gradient(90deg, ${s.accent_color} 0%, ${lighten(s.accent_color)} 50%, ${s.accent_color} 100%)`, flexShrink: 0 }} />
        )}

        {/* ── Header band ── */}
        <div
          style={{
            background:     s.header_bg,
            padding:        "28px 52px 24px",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            flexShrink:     0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* Logo image */}
            {s.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.logo_url}
                alt="Logo"
                style={{ height: "40px", width: "auto", objectFit: "contain" }}
              />
            )}
            {/* Org name + tagline */}
            <div>
              <div style={{
                color:       s.accent_color,
                fontSize:    "20px",
                fontWeight:  900,
                letterSpacing: "0.06em",
                fontFamily:  "sans-serif",
                lineHeight:  1.2,
              }}>
                {s.org_name}
              </div>
              {s.org_tagline && (
                <div style={{
                  color:       hexToRgba("#ffffff", 0.45),
                  fontSize:    "11px",
                  letterSpacing: "0.1em",
                  fontFamily:  "sans-serif",
                  marginTop:   "2px",
                }}>
                  {s.org_tagline}
                </div>
              )}
            </div>
          </div>

          {/* Level badge */}
          {d.levelLabel && (
            <div style={{
              background:    s.accent_color,
              color:         "#0a0a0a",
              padding:       "6px 18px",
              borderRadius:  "4px",
              fontSize:      "12px",
              fontWeight:    700,
              letterSpacing: "0.08em",
              fontFamily:    "sans-serif",
              textTransform: "uppercase" as const,
              flexShrink:    0,
            }}>
              {d.levelLabel}
            </div>
          )}
        </div>

        {/* ── Main body ── */}
        <div
          style={{
            flex:           1,
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            padding:        "28px 52px",
            background:     s.body_bg,
            textAlign:      "center",
            position:       "relative",
          }}
        >
          {/* Background glow */}
          <div style={{
            position:   "absolute",
            top:        "50%",
            left:       "50%",
            transform:  "translate(-50%, -50%)",
            width:      "400px",
            height:     "400px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${hexToRgba(s.accent_color, 0.06)} 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />

          <p style={{
            color:         "#888",
            fontSize:      "11px",
            letterSpacing: "0.2em",
            textTransform: "uppercase" as const,
            marginBottom:  "10px",
            fontFamily:    "sans-serif",
          }}>
            Certificate of Completion
          </p>

          {s.preamble && (
            <p style={{ color: "#555", fontSize: "14px", marginBottom: "4px", fontFamily: "sans-serif" }}>
              {s.preamble}
            </p>
          )}

          {/* Student name */}
          <h1 style={{
            color:      "#0a0a0a",
            fontSize:   d.studentName.length > 20 ? "38px" : "48px",
            fontWeight: 700,
            margin:     "6px 0 14px",
            lineHeight: 1.15,
            fontStyle:  "italic",
            fontFamily: nameFontCss,
          }}>
            {d.studentName}
          </h1>

          {s.body_text && (
            <p style={{ color: "#555", fontSize: "14px", marginBottom: "6px", fontFamily: "sans-serif" }}>
              {s.body_text}
            </p>
          )}

          {/* Course title */}
          <h2 style={{
            color:         s.accent_color,
            fontSize:      "24px",
            fontWeight:    700,
            margin:        "0 0 20px",
            fontFamily:    "sans-serif",
            letterSpacing: "-0.01em",
          }}>
            {d.courseTitle}
          </h2>

          {/* Divider */}
          <div style={{
            width:      "80px",
            height:     "2px",
            background: `linear-gradient(90deg, transparent, ${s.accent_color}, transparent)`,
            marginBottom: "20px",
          }} />

          {/* Date + instructor */}
          <div style={{ display: "flex", gap: "52px", alignItems: "flex-start" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ height: "1px", width: "120px", background: "#ddd", marginBottom: "5px" }} />
              <p style={{ color: "#0a0a0a", fontSize: "13px", fontWeight: 600, fontFamily: "sans-serif" }}>
                {d.completedDate}
              </p>
              <p style={{ color: "#aaa", fontSize: "10px", fontFamily: "sans-serif", marginTop: "2px", letterSpacing: "0.05em" }}>
                DATE
              </p>
            </div>

            <div style={{ textAlign: "center" }}>
              {s.signature_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.signature_url}
                  alt="Signature"
                  style={{ height: "32px", width: "auto", objectFit: "contain", display: "block", margin: "0 auto 2px" }}
                />
              )}
              <div style={{ height: "1px", width: "160px", background: "#ddd", marginBottom: "5px" }} />
              <p style={{ color: "#0a0a0a", fontSize: "13px", fontWeight: 600, fontFamily: "sans-serif" }}>
                {d.instructorName}
              </p>
              <p style={{ color: "#aaa", fontSize: "10px", fontFamily: "sans-serif", marginTop: "2px", letterSpacing: "0.05em" }}>
                {s.instructor_title}
              </p>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          background:     "#f9f6ee",
          padding:        "8px 52px",
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          borderTop:      "1px solid #eee",
          flexShrink:     0,
        }}>
          <p style={{ color: "#bbb", fontSize: "10px", fontFamily: "sans-serif", letterSpacing: "0.05em" }}>
            {s.footer_website}
          </p>
          {s.show_credential && (
            <p style={{ color: "#bbb", fontSize: "10px", fontFamily: "sans-serif", letterSpacing: "0.05em" }}>
              CREDENTIAL ID: {d.enrollmentId.slice(0, 8).toUpperCase()}
            </p>
          )}
        </div>

        {/* ── Bottom bar ── */}
        {hasBorderBars && (
          <div style={{ height: "5px", background: `linear-gradient(90deg, ${s.accent_color} 0%, ${lighten(s.accent_color)} 50%, ${s.accent_color} 100%)`, flexShrink: 0 }} />
        )}
      </div>
    </>
  )
}
