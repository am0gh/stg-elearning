import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProfileForm } from "./profile-form"

const BLACK = "#0a0a0a"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login?redirect=/profile")

  // Fetch profile row (has full_name, avatar_url)
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single()

  // Fetch enrollments + course info for progress history
  const { data: enrollments } = await admin
    .from("enrollments")
    .select(`
      id,
      enrolled_at,
      completed_at,
      course_id,
      courses (
        id,
        title,
        level,
        thumbnail_url
      )
    `)
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false })

  // For each enrollment, get lesson completion count
  const enriched = await Promise.all(
    (enrollments ?? []).map(async (e) => {
      const course = Array.isArray(e.courses) ? e.courses[0] : e.courses
      if (!course) return null

      const { data: lessons } = await admin
        .from("lessons")
        .select("id")
        .eq("course_id", course.id)

      const totalLessons = lessons?.length ?? 0

      const { count: completedLessons } = await admin
        .from("lesson_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("completed", true)
        .in("lesson_id", (lessons ?? []).map(l => l.id))

      const pct = totalLessons > 0
        ? Math.round(((completedLessons ?? 0) / totalLessons) * 100)
        : 0

      return {
        enrollmentId: e.id,
        courseId:     course.id,
        courseTitle:  course.title,
        courseLevel:  course.level,
        thumbnail:    course.thumbnail_url,
        enrolledAt:   e.enrolled_at,
        completedAt:  e.completed_at,
        totalLessons,
        completedLessons: completedLessons ?? 0,
        progressPct: pct,
      }
    })
  )

  const courseHistory = enriched.filter(Boolean) as NonNullable<typeof enriched[0]>[]

  return (
    <div className="flex min-h-screen flex-col" style={{ background: BLACK, color: "white" }}>
      <Header />
      <main className="flex-1 py-12">
        <div className="container mx-auto max-w-2xl px-4">
          <h1 className="mb-8 text-3xl font-black" style={{ color: "white" }}>
            My Profile
          </h1>

          <ProfileForm
            userId={user.id}
            email={user.email ?? ""}
            initialName={profile?.full_name ?? user.user_metadata?.full_name ?? ""}
            initialAvatarUrl={profile?.avatar_url ?? null}
            memberSince={user.created_at}
            courseHistory={courseHistory}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
