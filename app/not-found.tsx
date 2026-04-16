import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

const GOLD = "var(--brand-gold)"
const BLACK = "#0a0a0a"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: BLACK }}>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center text-center px-4">
        <p className="mb-3 text-sm font-bold uppercase tracking-widest" style={{ color: GOLD }}>404</p>
        <h1 className="mb-4 text-4xl font-black" style={{ color: "white" }}>Page not found</h1>
        <p className="mb-8 text-base max-w-md" style={{ color: "rgba(255,255,255,0.5)" }}>
          We couldn&apos;t find what you were looking for. Head back to our courses and keep dancing.
        </p>
        <Link
          href="/courses"
          className="px-6 py-3 text-sm font-bold rounded"
          style={{ background: GOLD, color: BLACK }}
        >
          Browse courses
        </Link>
      </main>
      <Footer />
    </div>
  )
}
