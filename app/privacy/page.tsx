import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

const BLACK = "#0a0a0a"

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: BLACK, color: "white" }}>
      <Header />
      <main className="flex-1 py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <h1 className="mb-8 text-4xl font-black" style={{ color: "white" }}>
            Privacy Policy
          </h1>
          <div className="prose prose-invert max-w-none space-y-6 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
            <p>
              <strong style={{ color: "white" }}>Salsa te Gusta</strong> is committed to protecting your personal data.
              This Privacy Policy explains how we collect, use, and protect your information when you use our platform.
            </p>
            <h2 className="text-xl font-bold mt-8" style={{ color: "white" }}>Data We Collect</h2>
            <p>We collect your name and email address when you register, and your course progress data as you use the platform.</p>
            <h2 className="text-xl font-bold mt-8" style={{ color: "white" }}>How We Use Your Data</h2>
            <p>Your data is used solely to provide access to your courses and track your learning progress. We do not sell your data to third parties.</p>
            <h2 className="text-xl font-bold mt-8" style={{ color: "white" }}>Your Rights (GDPR)</h2>
            <p>Under GDPR, you have the right to access, correct, or delete your personal data. Contact us at <a href="mailto:contact@salsategusta.nl" style={{ color: "var(--brand-gold)" }}>contact@salsategusta.nl</a> to exercise these rights.</p>
            <h2 className="text-xl font-bold mt-8" style={{ color: "white" }}>Contact</h2>
            <p>
              Salsa te Gusta<br />
              contact@salsategusta.nl<br />
              +31 (0)6 288 106 06
            </p>
            <p className="mt-8 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              Last updated: {new Date().getFullYear()}. This policy will be updated as the platform evolves.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
