import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Play, Star } from "lucide-react"

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const GOLD = "#C9A227"
const PURPLE = "#3D0057"
const BLACK = "#0a0a0a"

// ─── Reusable inline button styles ───────────────────────────────────────────
const btnGold = {
  background: GOLD,
  color: BLACK,
  padding: "0.75rem 1.75rem",
  borderRadius: "0.375rem",
  fontWeight: 700,
  fontSize: "0.95rem",
  display: "inline-block",
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
} as const

const btnOutline = {
  background: "transparent",
  color: GOLD,
  padding: "0.75rem 1.75rem",
  borderRadius: "0.375rem",
  fontWeight: 700,
  fontSize: "0.95rem",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  textDecoration: "none",
  border: `2px solid ${GOLD}`,
  cursor: "pointer",
} as const

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: BLACK, color: "white" }}>
      <Header />

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section
          style={{
            background: BLACK,
            borderBottom: "1px solid rgba(201,162,39,0.12)",
          }}
          className="py-24 md:py-36"
        >
          <div className="container mx-auto max-w-5xl px-4 text-center">
            <h1
              className="mb-5 text-5xl font-black tracking-tight md:text-7xl"
              style={{ color: "white", lineHeight: 1.05, letterSpacing: "-0.02em" }}
            >
              LEARN SALSA{" "}
              <span style={{ color: GOLD }}>AT HOME</span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg md:text-xl" style={{ color: "rgba(255,255,255,0.7)" }}>
              Self-paced video courses taught by a National Dutch Salsa Champion.
              Watch anywhere, anytime.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/courses/level-1" style={btnGold}>
                Buy Course
              </Link>
              <Link href="/courses/level-1#free-lesson" style={btnOutline}>
                <Play className="h-4 w-4" style={{ flexShrink: 0 }} />
                Watch Free Lesson
              </Link>
            </div>

            {/* Stats row */}
            <div
              className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4"
            >
              {[
                { value: "500+", label: "Students Enrolled" },
                { value: "Self-paced", label: "Watch on your own time" },
                { value: "HD Video", label: "Crystal-clear lessons" },
                { value: "Instant Access", label: "Start right away" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg p-4 text-center"
                  style={{ background: "rgba(201,162,39,0.07)", border: "1px solid rgba(201,162,39,0.2)" }}
                >
                  <div className="text-xl font-bold md:text-2xl" style={{ color: GOLD }}>
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Course Cards ─────────────────────────────────────────────── */}
        <section id="courses" className="py-24" style={{ background: BLACK }}>
          <div className="container mx-auto max-w-5xl px-4">
            <h2
              className="mb-12 text-center text-3xl font-black tracking-tight md:text-4xl"
              style={{ color: "white" }}
            >
              CHOOSE YOUR LEVEL
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Level 1 */}
              <div
                className="flex flex-col rounded-lg p-8"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid rgba(201,162,39,0.3)`,
                }}
              >
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <span
                      className="mb-3 inline-block rounded px-3 py-1 text-xs font-bold tracking-wider"
                      style={{ background: GOLD, color: BLACK }}
                    >
                      AVAILABLE NOW
                    </span>
                    <h3 className="text-2xl font-black" style={{ color: "white" }}>
                      Level 1 — Beginners
                    </h3>
                  </div>
                </div>

                <p className="mb-6 text-base" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Start from zero. Learn the essential steps, timing, and figures
                  through structured HD video lessons — at your own pace, from
                  your own home.
                </p>

                <ul className="mb-8 space-y-2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {["Instant access after purchase", "Self-paced — watch any time", "4 months of access"].map(
                    (item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span style={{ color: GOLD }}>✓</span>
                        {item}
                      </li>
                    )
                  )}
                </ul>

                <div className="mt-auto">
                  <div className="mb-4 flex items-baseline gap-2">
                    <span className="text-4xl font-black" style={{ color: GOLD }}>
                      €89
                    </span>
                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                      one-time
                    </span>
                  </div>
                  <Link href="/courses/level-1" style={{ ...btnGold, display: "block", textAlign: "center" }}>
                    Buy Now
                  </Link>
                </div>
              </div>

              {/* Level 2 */}
              <div
                className="flex flex-col rounded-lg p-8"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  opacity: 0.75,
                }}
              >
                <div className="mb-5">
                  <span
                    className="mb-3 inline-block rounded px-3 py-1 text-xs font-bold tracking-wider"
                    style={{ background: PURPLE, color: "white" }}
                  >
                    COMING Q4 2026
                  </span>
                  <h3 className="text-2xl font-black" style={{ color: "white" }}>
                    Level 2 — Intermediate
                  </h3>
                </div>

                <p className="mb-6 text-base" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Take your dancing further with advanced combinations, musicality,
                  and styling — all from the comfort of your home.
                </p>

                <ul className="mb-8 space-y-2 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {["Advanced figures & combinations", "Musicality deep-dives", "Styling & performance tips"].map(
                    (item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span style={{ color: "rgba(201,162,39,0.5)" }}>✓</span>
                        {item}
                      </li>
                    )
                  )}
                </ul>

                <div className="mt-auto">
                  <div className="mb-4">
                    <span className="text-lg font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Price TBA
                    </span>
                  </div>
                  <Link
                    href="#notify"
                    style={{
                      ...btnOutline,
                      display: "block",
                      textAlign: "center",
                      justifyContent: "center",
                      borderColor: "rgba(255,255,255,0.2)",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    Get Notified
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── What's Inside ────────────────────────────────────────────── */}
        <section id="included" className="py-24" style={{ background: PURPLE }}>
          <div className="container mx-auto max-w-5xl px-4">
            <h2
              className="mb-4 text-center text-3xl font-black tracking-tight md:text-4xl"
              style={{ color: "white" }}
            >
              WHAT'S INSIDE THE COURSE?
            </h2>
            <p className="mx-auto mb-14 max-w-xl text-center text-base" style={{ color: "rgba(255,255,255,0.65)" }}>
              Everything you need to go from zero to dancing — delivered straight
              to your screen.
            </p>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  emoji: "🎥",
                  title: "HD Video Lessons",
                  desc: "Recorded by a National Dutch Salsa Champion — clear, close-up, and easy to follow at any speed.",
                },
                {
                  emoji: "🎵",
                  title: "Musicality Training",
                  desc: "Learn to feel and interpret the music, not just count beats. Salsa starts with the song.",
                },
                {
                  emoji: "💃",
                  title: "Technique & Styling",
                  desc: "Body movement, posture, leading and following broken down step by step so nothing is left to guesswork.",
                },
                {
                  emoji: "🌍",
                  title: "Salsa History & Culture",
                  desc: "Understand the roots of what you're dancing — because context makes every move more meaningful.",
                },
                {
                  emoji: "📖",
                  title: "Study Guides",
                  desc: "Downloadable PDFs to support each module so you can review key points offline.",
                },
                {
                  emoji: "👥",
                  title: "Online Community",
                  desc: "Connect with fellow students inside the course platform — share progress, ask questions, stay motivated.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg p-6"
                  style={{
                    background: "rgba(0,0,0,0.25)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div className="mb-3 text-3xl">{item.emoji}</div>
                  <h3 className="mb-2 text-base font-bold" style={{ color: GOLD }}>
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Reviews ──────────────────────────────────────────────────── */}
        <section className="py-24" style={{ background: BLACK }}>
          <div className="container mx-auto max-w-5xl px-4">
            <h2
              className="mb-14 text-center text-3xl font-black tracking-tight md:text-4xl"
              style={{ color: "white" }}
            >
              WHAT OUR STUDENTS SAY
            </h2>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  quote:
                    "I've tried other salsa videos on YouTube but this is on another level. The structure makes it so easy to follow.",
                  name: "Yoshja A.",
                },
                {
                  quote:
                    "Perfect for learning at home. I re-watch lessons multiple times and always pick up something new.",
                  name: "Mark L.",
                },
                {
                  quote:
                    "Clear instructions, great energy. You can tell it's made by someone who really knows salsa.",
                  name: "Roos d.B.",
                },
              ].map((review) => (
                <div
                  key={review.name}
                  className="flex flex-col rounded-lg p-6"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {/* Stars */}
                  <div className="mb-4 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-4 w-4" style={{ color: GOLD, fill: GOLD }} />
                    ))}
                  </div>

                  <p className="mb-5 flex-1 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
                    &ldquo;{review.quote}&rdquo;
                  </p>

                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                      style={{ background: GOLD, color: BLACK }}
                    >
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "white" }}>
                        {review.name}
                      </p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                        Verified student
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ───────────────────────────────────────────────── */}
        <section className="py-20" style={{ background: GOLD }}>
          <div className="container mx-auto max-w-3xl px-4 text-center">
            <h2
              className="mb-3 text-3xl font-black tracking-tight md:text-4xl"
              style={{ color: BLACK }}
            >
              Ready to Start Dancing?
            </h2>
            <p className="mb-8 text-base font-medium" style={{ color: "rgba(0,0,0,0.7)" }}>
              Get instant access to Level 1 and start your first lesson today.
            </p>
            <Link
              href="/courses/level-1"
              style={{
                background: BLACK,
                color: "white",
                padding: "0.875rem 2.25rem",
                borderRadius: "0.375rem",
                fontWeight: 700,
                fontSize: "1rem",
                display: "inline-block",
                textDecoration: "none",
              }}
            >
              Buy Course — €89
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
