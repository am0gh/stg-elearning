"use client"

import { useRef } from "react"
import Link from "next/link"
import { ArrowLeft, Download } from "lucide-react"

interface CertificatePageProps {
  studentName:    string
  courseTitle:    string
  courseLevel:    string
  instructorName: string
  completedAt:    string
  enrollmentId:   string
}

export function CertificatePage({
  studentName,
  courseTitle,
  courseLevel,
  instructorName,
  completedAt,
  enrollmentId,
}: CertificatePageProps) {
  const certRef = useRef<HTMLDivElement>(null)

  const completedDate = new Date(completedAt).toLocaleDateString("nl-NL", {
    year: "numeric", month: "long", day: "numeric",
  })

  const levelLabel = courseLevel
    ? courseLevel.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase())
    : ""

  const handleDownload = () => {
    window.print()
  }

  return (
    <>
      {/* ── Print CSS injected via style tag ─────────────────────────── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .cert-wrapper {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }

        @media screen {
          .cert-wrapper {
            box-shadow: 0 25px 60px rgba(0,0,0,0.6);
          }
        }
      `}</style>

      {/* ── Screen chrome (hidden on print) ──────────────────────────── */}
      <div
        className="no-print min-h-screen py-8 px-4"
        style={{ background: "#0a0a0a" }}
      >
        {/* Back + Download buttons */}
        <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between">
          <Link
            href="/profile"
            className="flex items-center gap-2 text-sm"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to profile
          </Link>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold"
            style={{ background: "#C9A227", color: "#0a0a0a" }}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>

        {/* Certificate card */}
        <div className="mx-auto max-w-4xl" ref={certRef}>
          <Certificate
            studentName={studentName}
            courseTitle={courseTitle}
            levelLabel={levelLabel}
            instructorName={instructorName}
            completedDate={completedDate}
            enrollmentId={enrollmentId}
          />
        </div>

        <p className="no-print mt-4 text-center text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          Click &ldquo;Download PDF&rdquo; to save or print this certificate
        </p>
      </div>

      {/* ── Print-only: certificate fills the page ───────────────────── */}
      <div
        className="hidden"
        style={{ display: "none" }}
      >
        {/* The .cert-wrapper below is made visible by @media print */}
      </div>

      {/* Actual certificate — visible at all times, styled for both screen + print */}
      <div
        id="certificate-print-target"
        className="cert-wrapper"
        style={{
          background: "white",
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
          display: "none",
        }}
      />
    </>
  )
}

// ─── Pure certificate component (screen + print) ──────────────────────────────

function Certificate({
  studentName,
  courseTitle,
  levelLabel,
  instructorName,
  completedDate,
  enrollmentId,
}: {
  studentName:    string
  courseTitle:    string
  levelLabel:     string
  instructorName: string
  completedDate:  string
  enrollmentId:   string
}) {
  return (
    <div
      className="cert-wrapper"
      style={{
        background: "white",
        borderRadius: "16px",
        overflow: "hidden",
        width: "100%",
        aspectRatio: "1.414 / 1",  // A4 landscape ratio
        display: "flex",
        flexDirection: "column",
        position: "relative",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      {/* Gold top border */}
      <div style={{ height: "8px", background: "linear-gradient(90deg, #C9A227 0%, #e8c84a 50%, #C9A227 100%)" }} />

      {/* Purple + black header band */}
      <div
        style={{
          background: "#0a0a0a",
          padding: "32px 56px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo / brand */}
        <div>
          <div style={{ color: "#C9A227", fontSize: "22px", fontWeight: 900, letterSpacing: "0.05em", fontFamily: "sans-serif" }}>
            SALSA TE GUSTA
          </div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", letterSpacing: "0.1em", fontFamily: "sans-serif", marginTop: "2px" }}>
            ONLINE DANCE ACADEMY
          </div>
        </div>

        {/* Level badge */}
        {levelLabel && (
          <div
            style={{
              background: "#C9A227",
              color: "#0a0a0a",
              padding: "6px 18px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              fontFamily: "sans-serif",
              textTransform: "uppercase",
            }}
          >
            {levelLabel}
          </div>
        )}
      </div>

      {/* Main certificate body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "36px 56px",
          background: "white",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Watermark glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(201,162,39,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <p style={{ color: "#888", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px", fontFamily: "sans-serif" }}>
          Certificate of Completion
        </p>

        <p style={{ color: "#333", fontSize: "15px", marginBottom: "4px", fontFamily: "sans-serif" }}>
          This is to certify that
        </p>

        <h1
          style={{
            color: "#0a0a0a",
            fontSize: "46px",
            fontWeight: 700,
            margin: "8px 0 16px",
            lineHeight: 1.15,
            fontStyle: "italic",
          }}
        >
          {studentName}
        </h1>

        <p style={{ color: "#555", fontSize: "15px", marginBottom: "8px", fontFamily: "sans-serif" }}>
          has successfully completed the course
        </p>

        <h2
          style={{
            color: "#C9A227",
            fontSize: "28px",
            fontWeight: 700,
            margin: "0 0 24px",
            fontFamily: "sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          {courseTitle}
        </h2>

        {/* Divider */}
        <div style={{ width: "80px", height: "2px", background: "linear-gradient(90deg, transparent, #C9A227, transparent)", marginBottom: "24px" }} />

        {/* Date + instructor */}
        <div style={{ display: "flex", gap: "60px", alignItems: "flex-start" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ height: "1px", width: "120px", background: "#ddd", marginBottom: "6px" }} />
            <p style={{ color: "#0a0a0a", fontSize: "14px", fontWeight: 600, fontFamily: "sans-serif" }}>
              {completedDate}
            </p>
            <p style={{ color: "#aaa", fontSize: "11px", fontFamily: "sans-serif", marginTop: "2px", letterSpacing: "0.05em" }}>
              DATE
            </p>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ height: "1px", width: "160px", background: "#ddd", marginBottom: "6px" }} />
            <p style={{ color: "#0a0a0a", fontSize: "14px", fontWeight: 600, fontFamily: "sans-serif" }}>
              {instructorName}
            </p>
            <p style={{ color: "#aaa", fontSize: "11px", fontFamily: "sans-serif", marginTop: "2px", letterSpacing: "0.05em" }}>
              INSTRUCTOR
            </p>
          </div>
        </div>
      </div>

      {/* Gold bottom border + credential ID */}
      <div
        style={{
          background: "#f9f6ee",
          padding: "10px 56px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid #eee",
        }}
      >
        <p style={{ color: "#bbb", fontSize: "10px", fontFamily: "sans-serif", letterSpacing: "0.05em" }}>
          salsategusta.nl
        </p>
        <p style={{ color: "#bbb", fontSize: "10px", fontFamily: "sans-serif", letterSpacing: "0.05em" }}>
          CREDENTIAL ID: {enrollmentId.slice(0, 8).toUpperCase()}
        </p>
      </div>

      {/* Gold bottom bar */}
      <div style={{ height: "5px", background: "linear-gradient(90deg, #C9A227 0%, #e8c84a 50%, #C9A227 100%)" }} />
    </div>
  )
}
