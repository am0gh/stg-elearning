import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { LessonForm } from "../../lesson-form"

interface PageProps {
  params: Promise<{ courseId: string; lessonId: string }>
}

export default async function EditLessonPage({ params }: PageProps) {
  const { courseId, lessonId } = await params
  const supabase = createAdminClient()
  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", lessonId).single()

  if (!lesson) notFound()

  return (
    <LessonForm
      courseId={courseId}
      lessonId={lessonId}
      initial={{
        title:             lesson.title,
        description:       lesson.description ?? "",
        order_index:       lesson.order_index,
        duration_minutes:  lesson.duration_minutes,
        is_free:           lesson.is_free,
        video_url:         lesson.video_url ?? "",
        content_intro:     lesson.content_intro ?? "",
        content_notes:     lesson.content_notes ?? "",
        content_tips:      lesson.content_tips ?? [],
        content_checklist: lesson.content_checklist ?? [],
      }}
    />
  )
}
