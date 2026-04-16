import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Play, Star } from "lucide-react"
import { getHomepageContent } from "@/lib/homepage-content"

// ─── Brand tokens ─────────────────────────────────────────────────────────────
// GOLD uses a CSS variable so the admin Design panel can override it at runtime.
// color-mix() is used for transparent variants so they track the variable too.
const GOLD   = "var(--brand-gold)"
const PURPLE = "var(--brand-purple)"
const BLACK  = "#0a0a0a"
const GOLD_12  = "color-mix(in srgb, var(--brand-gold) 12%, transparent)"
const GOLD_15  = "color-mix(in srgb, var(--brand-gold) 15%, transparent)"
const GOLD_20  = "color-mix(in srgb, var(--brand-gold) 20%, transparent)"
const GOLD_30  = "color-mix(in srgb, var(--brand-gold) 30%, transparent)"
const GOLD_50  = "color-mix(in srgb, var(--brand-gold) 50%, transparent)"
const GOLD_7   = "color-mix(in srgb, var(--brand-gold) 7%, transparent)"

// ─── Reusable inline button styles ───────────────────────────────────────────
const btnGold = {
  background: GOLD,
  color: BLACK,
  padding: "0.75rem 1.75rem",
  borderRadius: "var(--btn-radius)",
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
  borderRadius: "var(--btn-radius)",
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
export default async function HomePage() {
  const c = await getHomepageContent()

  return (
    <div className="flex min-h-screen flex-col" style={{ background: BLACK, color: "white" }}>
      <Header navLogo={c.nav_logo} navCta={c.nav_cta} logoUrl={c.logo_url} />

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section
          style={{
            background: BLACK,
            borderBottom: `1px solid ${GOLD_12}`,
          }}
          className="py-24 md:py-36"
        >
          <div className="container mx-auto max-w-5xl px-4 text-center">
            <h1
              className="mb-5 text-5xl font-black tracking-tight md:text-7xl"
              style={{ color: "white", lineHeight: 1.05, letterSpacing: "-0.02em" }}
            >
              {c.hero_headline}{" "}
              <span style={{ color: GOLD }}>{c.hero_headline_accent}</span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg md:text-xl" style={{ color: "rgba(255,255,255,0.7)" }}>
              {c.hero_subtext}
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/courses" style={btnGold}>
                {c.hero_cta_primary}
              </Link>
              <Link href="/free-lesson" style={btnOutline}>
                <Play className="h-4 w-4" style={{ flexShrink: 0 }} />
                {c.hero_cta_secondary}
              </Link>
            </div>

            {/* Stats row */}
            <div
              className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4"
            >
              {[
                { value: c.stat_1_value, label: c.stat_1_label },
                { value: c.stat_2_value, label: c.stat_2_label },
                { value: c.stat_3_value, label: c.stat_3_label },
                { value: c.stat_4_value, label: c.stat_4_label },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg p-4 text-center"
                  style={{ background: GOLD_7, border: `1px solid ${GOLD_20}` }}
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
              {c.courses_title}
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Level 1 */}
              <div
                className="flex flex-col rounded-lg p-8"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${GOLD_30}`,
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
                        <span style={{ color: GOLD_50 }}>✓</span>
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
              {c.included_title}
            </h2>
            <p className="mx-auto mb-14 max-w-xl text-center text-base" style={{ color: "rgba(255,255,255,0.65)" }}>
              {c.included_subtext}
            </p>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {([1, 2, 3, 4, 5, 6] as const).map((n) => {
                const emoji = c[`feature_${n}_emoji` as keyof typeof c]
                const title = c[`feature_${n}_title` as keyof typeof c]
                const desc  = c[`feature_${n}_desc`  as keyof typeof c]
                if (!title) return null
                return (
                  <div
                    key={n}
                    className="rounded-lg p-6"
                    style={{
                      background: "rgba(0,0,0,0.25)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {emoji && <div className="mb-3 text-3xl">{emoji}</div>}
                    <h3 className="mb-2 text-base font-bold" style={{ color: GOLD }}>
                      {title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                      {desc}
                    </p>
                  </div>
                )
              })}
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
        <section className="py-20" style={{ background: "var(--brand-gold)" }}>
          <div className="container mx-auto max-w-3xl px-4 text-center">
            <h2
              className="mb-3 text-3xl font-black tracking-tight md:text-4xl"
              style={{ color: BLACK }}
            >
              {c.banner_headline}
            </h2>
            <p className="mb-8 text-base font-medium" style={{ color: "rgba(0,0,0,0.7)" }}>
              {c.banner_subtext}
            </p>
            <Link
              href="/courses"
              style={{
                background: BLACK,
                color: "white",
                padding: "0.875rem 2.25rem",
                borderRadius: "var(--btn-radius)",
                fontWeight: 700,
                fontSize: "1rem",
                display: "inline-block",
                textDecoration: "none",
              }}
            >
              {c.banner_cta}
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
