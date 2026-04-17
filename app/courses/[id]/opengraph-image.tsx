/**
 * Dynamic OG image for course detail pages.
 * Generates a 1200×630 branded card showing the course title, level badge,
 * and Salsa te Gusta branding — perfect for WhatsApp, LinkedIn, Twitter previews.
 *
 * Next.js automatically serves this at /courses/[id]/opengraph-image
 */

import { ImageResponse } from "next/og"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const size    = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function CourseOGImage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: course } = await supabase
    .from("courses")
    .select("title, level, description, instructor_name")
    .eq("id", id)
    .eq("is_published", true)
    .single()

  const title       = course?.title       ?? "Salsa Course"
  const level       = course?.level       ?? ""
  const description = course?.description ?? ""
  const instructor  = course?.instructor_name ?? "Salsa te Gusta"

  // Truncate description to ~120 chars for the card
  const shortDesc = description.length > 120
    ? description.slice(0, 117) + "…"
    : description

  const levelLabel = level
    ? level.replace("-", " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
    : ""

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            right: "-200px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(201,162,39,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(61,0,87,0.4) 0%, transparent 70%)",
          }}
        />

        {/* Top: branding + level badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ color: "#C9A227", fontSize: "20px", fontWeight: 900, letterSpacing: "0.05em" }}>
              SALSA TE GUSTA
            </span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
              Online Dance Academy
            </span>
          </div>

          {levelLabel && (
            <div
              style={{
                background: "#C9A227",
                color: "#0a0a0a",
                padding: "8px 20px",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {levelLabel}
            </div>
          )}
        </div>

        {/* Middle: course title */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1, justifyContent: "center" }}>
          <h1
            style={{
              color: "#ffffff",
              fontSize: title.length > 30 ? "52px" : "68px",
              fontWeight: 900,
              lineHeight: 1.1,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h1>

          {shortDesc && (
            <p
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "22px",
                lineHeight: 1.4,
                margin: 0,
                maxWidth: "800px",
              }}
            >
              {shortDesc}
            </p>
          )}
        </div>

        {/* Bottom: instructor + divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(201,162,39,0.25)",
            paddingTop: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "#C9A227",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0a0a0a",
                fontWeight: 900,
                fontSize: "18px",
              }}
            >
              {instructor.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#ffffff", fontSize: "16px", fontWeight: 600 }}>
                {instructor}
              </span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
                Lead Instructor
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "14px" }}>
              salsategusta.nl
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
