import { Suspense } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CourseCard } from "@/components/course-card"
import { createClient } from "@/lib/supabase/server"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import Link from "next/link"

const GOLD = "var(--brand-gold)"

interface PageProps {
  searchParams: Promise<{ level?: string; search?: string }>
}

async function CourseList({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from("courses")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false })

  if (params.level) {
    query = query.eq("level", params.level)
  }

  if (params.search) {
    query = query.ilike("title", `%${params.search}%`)
  }

  const { data: courses } = await query

  if (!courses || courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Search className="mb-4 h-10 w-10" style={{ color: "rgba(255,255,255,0.25)" }} />
        <h3 className="mb-2 text-xl font-semibold" style={{ color: "white" }}>No courses found</h3>
        <p style={{ color: "rgba(255,255,255,0.5)" }}>Try a different search term or clear the filter.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/courses">Clear filters</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  )
}

export default async function CoursesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const levels = [
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
  ]

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#0a0a0a", color: "white" }}>
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto max-w-7xl px-4">
          {/* Page Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-black tracking-tight" style={{ color: "white" }}>
              COURSES
            </h1>
            <p className="mt-2" style={{ color: "rgba(255,255,255,0.5)" }}>
              Self-paced video courses you can watch at home, on your schedule.
            </p>
          </div>

          {/* Search + level filters */}
          <div
            className="mb-8 flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
            style={{ borderColor: "color-mix(in srgb, var(--brand-gold) 20%, transparent)", background: "rgba(255,255,255,0.03)" }}
          >
            <form className="flex flex-1 gap-2" action="/courses">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.35)" }} />
                <Input
                  name="search"
                  placeholder="Search courses…"
                  defaultValue={params.search}
                  className="pl-9"
                />
              </div>
              <Button type="submit">Search</Button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              {levels.map(({ value, label }) => (
                <Link key={value} href={`/courses?level=${value}`}>
                  <Badge
                    variant={params.level === value ? "default" : "outline"}
                    className="cursor-pointer"
                    style={
                      params.level === value
                        ? { background: GOLD, color: "#0a0a0a", border: "none" }
                        : { borderColor: "color-mix(in srgb, var(--brand-gold) 35%, transparent)", color: "rgba(255,255,255,0.6)" }
                    }
                  >
                    {label}
                  </Badge>
                </Link>
              ))}
              {params.level && (
                <Link href="/courses">
                  <Badge variant="outline" className="cursor-pointer" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Clear
                  </Badge>
                </Link>
              )}
            </div>
          </div>

          {/* Course Grid */}
          <Suspense fallback={<CourseGridSkeleton />}>
            <CourseList searchParams={searchParams} />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function CourseGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border" style={{ borderColor: "color-mix(in srgb, var(--brand-gold) 15%, transparent)" }}>
          <div className="aspect-video animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="space-y-3 p-4">
            <div className="h-5 w-3/4 animate-pulse rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="h-4 w-full animate-pulse rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
        </div>
      ))}
    </div>
  )
}
