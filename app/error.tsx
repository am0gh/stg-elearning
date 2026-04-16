"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-4" style={{ background: "#0a0a0a" }}>
      <h1 className="mb-2 text-4xl font-black" style={{ color: "white" }}>Something went wrong</h1>
      <p className="mb-8 text-base" style={{ color: "rgba(255,255,255,0.5)" }}>
        An unexpected error occurred. Please try again.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-5 py-2.5 text-sm font-bold rounded"
          style={{ background: "var(--brand-gold)", color: "#0a0a0a" }}
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 text-sm font-bold rounded"
          style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }}
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
