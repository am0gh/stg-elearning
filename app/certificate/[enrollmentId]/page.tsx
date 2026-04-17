import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { CertificatePage } from "./certificate-page"

interface PageProps {
  params: Promise<{ enrollmentId: string }>
}

export default async function Certificate({ params }: PageProps) {
  const { enrollmentId } = await params

  // Must be logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?redirect=/certificate/${enrollmentId}`)

  const admin = createAdminClient()

  // Fetch enrollment — must belong to this user and be completed
  const { data: enrollment } = await admin
    .from("enrollments")
    .select(`
      id,
      user_id,
      enrolled_at,
      completed_at,
      course_id,
      courses (
        title,
        level,
        instructor_name,
        instructor_avatar
      )
    `)
    .eq("id", enrollmentId)
    .eq("user_id", user.id)
    .single()

  if (!enrollment || !enrollment.completed_at) notFound()

  const course = Array.isArray(enrollment.courses)
    ? enrollment.courses[0]
    : enrollment.courses

  if (!course) notFound()

  // Get student name
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single()

  const studentName = profile?.full_name
    ?? user.user_metadata?.full_name
    ?? user.email?.split("@")[0]
    ?? "Student"

  return (
    <CertificatePage
      studentName={studentName}
      courseTitle={course.title}
      courseLevel={course.level}
      instructorName={course.instructor_name}
      completedAt={enrollment.completed_at}
      enrollmentId={enrollmentId}
    />
  )
}
