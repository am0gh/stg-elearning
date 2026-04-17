import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LessonPlayer } from "./lesson-player"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ lesson?: string }>
}

export default async function LearnPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { lesson: lessonId } = await searchParams
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()

  // Get course
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single()

  if (!course) notFound()

  // Get lessons
  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", id)
    .order("order_index", { ascending: true })

  if (!lessons || lessons.length === 0) notFound()

  const currentLessonId = lessonId ?? lessons[0].id
  const requestedLesson = lessons.find(l => l.id === currentLessonId) ?? lessons[0]

  // Allow unenrolled (or logged-out) users to view free preview lessons
  const isFreeLesson = requestedLesson.is_free

  if (!isFreeLesson) {
    // Paid lesson — require login
    if (!user) {
      redirect(`/auth/login?redirect=/courses/${id}/learn?lesson=${currentLessonId}`)
    }
    // And require enrollment
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", id)
      .single()
    if (!enrollment) {
      redirect(`/courses/${id}`)
    }
  }

  // Get progress (only if logged in)
  const { data: progress } = user
    ? await supabase
        .from("lesson_progress")
        .select("*")
        .eq("user_id", user.id)
        .in("lesson_id", lessons.map(l => l.id))
    : { data: null }

  const progressMap = new Map(progress?.map(p => [p.lesson_id, p]) ?? [])

  // Fetch enrollmentId so the completion banner can link to the certificate
  let enrollmentId: string | null = null
  if (user) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id, completed_at")
      .eq("user_id", user.id)
      .eq("course_id", id)
      .single()
    enrollmentId = enrollment?.id ?? null
  }

  const currentLesson = requestedLesson
  const currentProgress = progressMap.get(currentLesson.id)

  return (
    <LessonPlayer
      course={course}
      lessons={lessons}
      currentLesson={currentLesson}
      progressMap={Object.fromEntries(progressMap)}
      initialProgress={currentProgress?.progress_seconds ?? 0}
      enrollmentId={enrollmentId}
    />
  )
}
