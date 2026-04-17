import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { CheckCircle2, Circle, Clock, Lock, Play, PlayCircle, Star } from "lucide-react"
import type { LessonProgress } from "@/lib/types"
import { EnrollButton } from "./enroll-button"

const GOLD = "var(--brand-gold)"
const BLACK = "#0a0a0a"

interface PageProps {
  params: Promise<{ id: string }>
}

// ── SEO metadata ──────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: course } = await supabase
    .from("courses")
    .select("title, description, level, instructor_name, thumbnail_url")
    .eq("id", id)
    .eq("is_published", true)
    .single()

  if (!course) return { title: "Course Not Found" }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://salsategusta.nl"
  const levelLabel = course.level
    ? course.level.replace("-", " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
    : ""

  const title       = `${course.title} | Salsa te Gusta`
  const description = course.description
    ? course.description.slice(0, 160)
    : `Learn ${course.title} with Salsa te Gusta. Professional online salsa courses by ${course.instructor_name}.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Salsa te Gusta",
      locale: "nl_NL",
      alternateLocale: "en_GB",
      images: course.thumbnail_url
        ? [{ url: course.thumbnail_url, width: 1200, height: 630, alt: course.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    other: {
      // Structured data for Google rich results
      "application/ld+json": JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Course",
        name: course.title,
        description: course.description,
        provider: {
          "@type": "Organization",
          name: "Salsa te Gusta",
          url: baseUrl,
        },
        instructor: {
          "@type": "Person",
          name: course.instructor_name,
        },
        courseLevel: levelLabel,
        url: `${baseUrl}/courses/${id}`,
      }),
    },
  }
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .single()

  if (!course) notFound()

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", id)
    .order("order_index", { ascending: true })

  const { data: { user } } = await supabase.auth.getUser()
  let isEnrolled = false

  if (user) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", id)
      .single()
    isEnrolled = !!enrollment
  }

  // ── Progress data (enrolled users only) ────────────────────────────────────
  let progressMap: Record<string, LessonProgress> = {}
  let resumeLessonId: string | null = null

  if (isEnrolled && user && lessons && lessons.length > 0) {
    const { data: progressData } = await supabase
      .from("lesson_progress")
      .select("*")
      .in("lesson_id", lessons.map(l => l.id))
      .eq("user_id", user.id)

    if (progressData) {
      for (const p of progressData) {
        progressMap[p.lesson_id] = p
      }
    }

    // Resume from first non-completed lesson, fall back to lesson 1
    resumeLessonId =
      lessons.find(l => !progressMap[l.id]?.completed)?.id ?? lessons[0].id
  }

  const completedCount = Object.values(progressMap).filter(p => p.completed).length
  const totalLessons = lessons?.length ?? 0
  const overallPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  const totalDuration = lessons?.reduce((acc, l) => acc + l.duration_minutes, 0) ?? 0
  const hours = Math.floor(totalDuration / 60)
  const minutes = totalDuration % 60

  // Label for the CTA button
  const ctaLabel =
    !isEnrolled ? "Start Learning"
    : completedCount === 0 ? "Start Learning"
    : completedCount === totalLessons ? "Review Course"
    : "Continue Learning"

  const ctaHref = isEnrolled && resumeLessonId
    ? `/courses/${id}/learn?lesson=${resumeLessonId}`
    : `/courses/${id}/learn`

  return (
    <div className="flex min-h-screen flex-col" style={{ background: BLACK, color: "white" }}>
      <Header />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section
          className="py-14"
          style={{ background: "color-mix(in srgb, var(--brand-gold) 5%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--brand-gold) 12%, transparent)" }}
        >
          <div className="container mx-auto max-w-7xl px-4">
            <div className="grid gap-10 lg:grid-cols-3">
              {/* Left: course info */}
              <div className="lg:col-span-2">
                <span
                  className="mb-4 inline-block rounded px-3 py-1 text-xs font-bold tracking-wider capitalize"
                  style={{ background: GOLD, color: BLACK }}
                >
                  {course.level}
                </span>

                <h1
                  className="mb-4 text-3xl font-black tracking-tight md:text-4xl"
                  style={{ color: "white" }}
                >
                  {course.title}
                </h1>

                <p className="mb-6 text-lg" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {course.description}
                </p>

                {/* Meta row */}
                <div className="mb-6 flex flex-wrap items-center gap-5 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4" style={{ color: GOLD, fill: GOLD }} />
                    <span className="font-semibold" style={{ color: "white" }}>4.9</span>
                    <span>rating</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{hours > 0 ? `${hours}h ` : ""}{minutes > 0 ? `${minutes}m` : ""} of video</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Play className="h-4 w-4" />
                    <span>{totalLessons} lessons</span>
                  </div>
                  <span
                    className="rounded px-2 py-0.5 text-xs font-semibold"
                    style={{ background: "color-mix(in srgb, var(--brand-gold) 15%, transparent)", color: GOLD }}
                  >
                    Self-paced · 4 months access
                  </span>
                </div>

                {/* Instructor */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={course.instructor_avatar ?? undefined} />
                    <AvatarFallback style={{ background: GOLD, color: BLACK }}>
                      {course.instructor_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold" style={{ color: "white" }}>{course.instructor_name}</p>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>Lead Instructor</p>
                  </div>
                </div>
              </div>

              {/* Right: purchase / progress card */}
              <div className="lg:col-span-1">
                <div
                  className="sticky top-24 overflow-hidden rounded-lg"
                  style={{ border: `1px solid color-mix(in srgb, var(--brand-gold) 30%, transparent)`, background: "rgba(255,255,255,0.04)" }}
                >
                  {/* Thumbnail with play overlay */}
                  <div className="relative aspect-video">
                    {course.thumbnail_url ? (
                      <Image
                        src={course.thumbnail_url}
                        alt={course.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #1a0a2e 0%, #3D0057 60%, #0a0a0a 100%)" }}
                      >
                        <span className="text-6xl select-none" aria-hidden="true">💃</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
                      <div
                        className="flex h-16 w-16 items-center justify-center rounded-full transition-transform hover:scale-110"
                        style={{ background: GOLD }}
                      >
                        <PlayCircle className="h-8 w-8" style={{ color: BLACK }} />
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {isEnrolled ? (
                      /* ── Enrolled: show progress ───────────────────── */
                      <div className="mb-5">
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span style={{ color: "rgba(255,255,255,0.5)" }}>Your progress</span>
                          <span className="font-bold tabular-nums" style={{ color: GOLD }}>{overallPct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--brand-gold) 12%, transparent)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${overallPct}%`, background: GOLD }}
                          />
                        </div>
                        <p className="mt-1.5 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {completedCount} of {totalLessons} lessons complete
                        </p>
                      </div>
                    ) : (
                      /* ── Not enrolled: show price ──────────────────── */
                      <div className="mb-5 text-center">
                        <span className="text-4xl font-black" style={{ color: GOLD }}>
                          {course.price === 0 ? "Free" : `€${course.price}`}
                        </span>
                        {course.price > 0 && (
                          <span className="ml-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>one-time</span>
                        )}
                      </div>
                    )}

                    {/* CTA */}
                    {isEnrolled ? (
                      <Link
                        href={ctaHref}
                        className="flex w-full items-center justify-center gap-2 rounded font-bold"
                        style={{ background: GOLD, color: BLACK, padding: "0.875rem 1rem", fontSize: "1rem" }}
                      >
                        <Play className="h-4 w-4" />
                        {ctaLabel}
                      </Link>
                    ) : (
                      <EnrollButton
                        courseId={id}
                        coursePrice={course.price}
                        isLoggedIn={!!user}
                      />
                    )}

                    {/* What's included */}
                    <div className="mt-6 space-y-2.5">
                      <h4 className="text-sm font-bold" style={{ color: "white" }}>This course includes:</h4>
                      {[
                        "Instant access after purchase",
                        "Self-paced — watch any time, any device",
                        "4 months of full access",
                        "HD video lessons",
                        "Downloadable study guides",
                        "Access to the online student community",
                      ].map((item) => (
                        <div key={item} className="flex items-start gap-2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Lesson overview ──────────────────────────────────────────── */}
        <section className="py-14">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="lg:pr-[calc(33.333%+2.5rem)]">
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <h2 className="mb-1 text-2xl font-black" style={{ color: "white" }}>
                    Course Content
                  </h2>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {totalLessons} lessons
                    {hours > 0 || minutes > 0 ? ` · ${hours > 0 ? `${hours}h ` : ""}${minutes > 0 ? `${minutes}m` : ""} total` : ""}
                  </p>
                </div>
                {isEnrolled && totalLessons > 0 && (
                  <span className="text-sm font-bold tabular-nums" style={{ color: GOLD }}>
                    {completedCount} / {totalLessons} done
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {lessons?.map((lesson, index) => {
                  // Per-lesson completion percentage
                  const prog = progressMap[lesson.id]
                  const lessonPct = prog?.completed
                    ? 100
                    : prog?.progress_seconds && (lesson.content_checklist?.length ?? 0) > 0
                      ? Math.min(100, Math.round((prog.progress_seconds / lesson.content_checklist!.length) * 100))
                      : 0

                  const rowContent = (
                    <>
                      {/* Number / status icon */}
                      {isEnrolled ? (
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                          style={{
                            background: lessonPct === 100 ? GOLD : "color-mix(in srgb, var(--brand-gold) 12%, transparent)",
                            color: lessonPct === 100 ? BLACK : GOLD,
                          }}
                        >
                          {lessonPct === 100
                            ? <CheckCircle2 className="h-4 w-4" />
                            : <span className="text-sm font-bold">{index + 1}</span>
                          }
                        </div>
                      ) : (
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                          style={{ background: "color-mix(in srgb, var(--brand-gold) 12%, transparent)", color: GOLD }}
                        >
                          {index + 1}
                        </div>
                      )}

                      {/* Title + description */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold" style={{ color: "white" }}>{lesson.title}</h3>
                        {lesson.description && (
                          <p className="text-sm truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
                            {lesson.description}
                          </p>
                        )}
                        {/* Inline progress bar for in-progress lessons */}
                        {isEnrolled && lessonPct > 0 && lessonPct < 100 && (
                          <div className="mt-1.5 h-1 w-24 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--brand-gold) 12%, transparent)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${lessonPct}%`, background: GOLD }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Right side: duration + progress badge */}
                      <div className="flex shrink-0 items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                        <span>{lesson.duration_minutes} min</span>
                        {isEnrolled ? (
                          lessonPct === 100 ? (
                            <span
                              className="rounded px-2 py-0.5 text-xs font-bold"
                              style={{ background: "color-mix(in srgb, var(--brand-gold) 15%, transparent)", color: GOLD }}
                            >
                              Complete
                            </span>
                          ) : lessonPct > 0 ? (
                            <span
                              className="rounded px-2 py-0.5 text-xs font-bold tabular-nums"
                              style={{ background: "color-mix(in srgb, var(--brand-gold) 10%, transparent)", color: GOLD }}
                            >
                              {lessonPct}%
                            </span>
                          ) : (
                            <Circle className="h-4 w-4" style={{ color: "rgba(255,255,255,0.2)" }} />
                          )
                        ) : lesson.is_free ? (
                          <span
                            className="rounded px-2 py-0.5 text-xs font-bold"
                            style={{ background: "color-mix(in srgb, var(--brand-gold) 15%, transparent)", color: GOLD }}
                          >
                            Free preview
                          </span>
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </div>
                    </>
                  )

                  const rowStyle = {
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.03)",
                  }

                  // Enrolled users OR free-preview lessons are clickable
                  if (isEnrolled || lesson.is_free) {
                    return (
                      <Link
                        key={lesson.id}
                        href={`/courses/${id}/learn?lesson=${lesson.id}`}
                        className="flex items-center gap-4 rounded-lg p-4 transition-colors hover:border-amber-500/30 hover:bg-white/5"
                        style={rowStyle}
                      >
                        {rowContent}
                      </Link>
                    )
                  }

                  return (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-4 rounded-lg p-4"
                      style={rowStyle}
                    >
                      {rowContent}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── What you'll learn ────────────────────────────────────────── */}
        <section
          className="py-14"
          style={{ background: "rgba(61,0,87,0.3)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="container mx-auto max-w-7xl px-4">
            <div className="lg:pr-[calc(33.333%+2.5rem)]">
              <h2 className="mb-8 text-2xl font-black" style={{ color: "white" }}>
                What You&apos;ll Learn
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  "The essential salsa steps, timing, and basic figures",
                  "How to hear and move to the music — not just count beats",
                  "Proper body posture, movement quality, and footwork",
                  "Leading and following technique broken down clearly",
                  "The history and cultural roots of salsa",
                  "How to practise effectively on your own at home",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GOLD }} />
                    <span style={{ color: "rgba(255,255,255,0.7)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
