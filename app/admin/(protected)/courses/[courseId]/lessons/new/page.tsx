import { LessonForm } from "../lesson-form"

interface PageProps {
  params: Promise<{ courseId: string }>
}

export default async function NewLessonPage({ params }: PageProps) {
  const { courseId } = await params
  return <LessonForm courseId={courseId} />
}
