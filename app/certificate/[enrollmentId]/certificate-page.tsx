"use client"

import Link from "next/link"
import { ArrowLeft, Download } from "lucide-react"
import { CertificateTemplate, type CertificateData } from "@/components/certificate-template"
import type { CertificateSettings } from "@/lib/certificate-settings"

interface CertificatePageProps {
  data:     CertificateData
  settings: CertificateSettings
}

export function CertificatePage({ data, settings }: CertificatePageProps) {
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .no-print-margin { margin: 0 !important; padding: 0 !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .cert-wrapper {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          @page { size: A4 landscape; margin: 0; }
        }
        @media screen {
          .cert-wrapper { box-shadow: 0 25px 60px rgba(0,0,0,0.6); }
        }
      `}</style>

      <div
        className="no-print-margin min-h-screen py-8 px-4"
        style={{ background: "#0a0a0a" }}
      >
        {/* Toolbar */}
        <div className="no-print mx-auto mb-6 flex max-w-4xl items-center justify-between">
          <Link
            href="/profile"
            className="flex items-center gap-2 text-sm"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to profile
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold"
            style={{ background: "#C9A227", color: "#0a0a0a" }}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>

        {/* Certificate */}
        <div className="mx-auto max-w-4xl">
          <CertificateTemplate settings={settings} data={data} loadFonts />
        </div>

        <p className="no-print mt-4 text-center text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          Click &ldquo;Download PDF&rdquo; to save or print this certificate
        </p>
      </div>
    </>
  )
}
