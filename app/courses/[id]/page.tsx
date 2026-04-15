import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/server"
import { CheckCircle2, Clock, Lock, Play, PlayCircle, Star } from "lucide-react"
import { EnrollButton } from "./enroll-button"

const GOLD = "#C9A227"
const BLACK = "#0a0a0a"

interface PageProps {
  params: Promise<{ id: string }>
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

  const totalDuration = lessons?.reduce((acc, l) => acc + l.duration_minutes, 0) ?? 0
  const hours = Math.floor(totalDuration / 60)
  const minutes = totalDuration % 60

  return (
    <div className="flex min-h-screen flex-col" style={{ background: BLACK, color: "white" }}>
      <Header />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section
          className="py-14"
          style={{ background: "rgba(201,162,39,0.05)", borderBottom: "1px solid rgba(201,162,39,0.12)" }}
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
                    <span>{lessons?.length ?? 0} lessons</span>
                  </div>
                  <span
                    className="rounded px-2 py-0.5 text-xs font-semibold"
                    style={{ background: "rgba(201,162,39,0.15)", color: GOLD }}
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
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>National Dutch Salsa Champion</p>
                  </div>
                </div>
              </div>

              {/* Right: purchase card */}
              <div className="lg:col-span-1">
                <div
                  className="sticky top-24 overflow-hidden rounded-lg"
                  style={{ border: `1px solid rgba(201,162,39,0.3)`, background: "rgba(255,255,255,0.04)" }}
                >
                  {/* Thumbnail with play overlay */}
                  <div className="relative aspect-video">
                    <Image
                      src={course.thumbnail_url ?? "/placeholder.svg"}
                      alt={course.title}
                      fill
                      className="object-cover"
                    />
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
                    <div className="mb-5 text-center">
                      <span className="text-4xl font-black" style={{ color: GOLD }}>
                        {course.price === 0 ? "Free" : `€${course.price}`}
                      </span>
                      {course.price > 0 && (
                        <span className="ml-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>one-time</span>
                      )}
                    </div>

                    {isEnrolled ? (
                      <Button
                        className="w-full gap-2 font-bold"
                        size="lg"
                        style={{ background: GOLD, color: BLACK }}
                        asChild
                      >
                        <Link href={`/courses/${id}/learn`}>
                          <Play className="h-4 w-4" />
                          Continue Watching
                        </Link>
                      </Button>
                    ) : (
                      <EnrollButton courseId={id} isLoggedIn={!!user} />
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

        {/* ── Lesson list ──────────────────────────────────────────────── */}
        <section className="py-14">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="lg:pr-[calc(33.333%+2.5rem)]">
              <h2 className="mb-2 text-2xl font-black" style={{ color: "white" }}>
                Course Content
              </h2>
              <p className="mb-6 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                {lessons?.length ?? 0} lessons
                {hours > 0 || minutes > 0 ? ` · ${hours > 0 ? `${hours}h ` : ""}${minutes > 0 ? `${minutes}m` : ""} total` : ""}
              </p>

              <div className="space-y-2">
                {lessons?.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className="flex items-center gap-4 rounded-lg p-4 transition-colors"
                    style={{
                      border: "1px solid rgba(255,255,255,0.07)",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                      style={{ background: "rgba(201,162,39,0.12)", color: GOLD }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold" style={{ color: "white" }}>{lesson.title}</h3>
                      {lesson.description && (
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>{lesson.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                      <span>{lesson.duration_minutes} min</span>
                      {lesson.is_free ? (
                        <span
                          className="rounded px-2 py-0.5 text-xs font-bold"
                          style={{ background: "rgba(201,162,39,0.15)", color: GOLD }}
                        >
                          Free preview
                        </span>
                      ) : !isEnrolled ? (
                        <Lock className="h-4 w-4" />
                      ) : null}
                    </div>
                  </div>
                ))}
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
