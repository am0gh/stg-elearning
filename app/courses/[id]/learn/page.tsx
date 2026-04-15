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
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect(`/auth/login?redirect=/courses/${id}/learn`)
  }

  // Check if user is enrolled
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", id)
    .single()

  if (!enrollment) {
    redirect(`/courses/${id}`)
  }

  // Get course with lessons
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single()

  if (!course) {
    notFound()
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", id)
    .order("order_index", { ascending: true })

  if (!lessons || lessons.length === 0) {
    notFound()
  }

  // Get user's progress for all lessons
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", user.id)
    .in("lesson_id", lessons.map(l => l.id))

  const progressMap = new Map(progress?.map(p => [p.lesson_id, p]) ?? [])

  // Determine current lesson
  const currentLessonId = lessonId ?? lessons[0].id
  const currentLesson = lessons.find(l => l.id === currentLessonId) ?? lessons[0]
  const currentProgress = progressMap.get(currentLesson.id)

  return (
    <LessonPlayer
      course={course}
      lessons={lessons}
      currentLesson={currentLesson}
      progressMap={Object.fromEntries(progressMap)}
      initialProgress={currentProgress?.progress_seconds ?? 0}
    />
  )
}
