import Link from "next/link"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { ChevronLeft, Edit, Plus, Trash2, Video } from "lucide-react"
import { DeleteLessonButton, DeleteCourseButton } from "./actions"

interface PageProps {
  params: Promise<{ courseId: string }>
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { courseId } = await params
  const supabase = createAdminClient()

  const [{ data: course }, { data: lessons }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", courseId).single(),
    supabase.from("lessons").select("*").eq("course_id", courseId).order("order_index"),
  ])

  if (!course) notFound()

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-zinc-500 hover:text-white">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white">{course.title}</h1>
            <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
              <span className="capitalize">{course.level}</span>
              <span>·</span>
              <span>€{course.price}</span>
              <span>·</span>
              <span className={course.is_published ? "text-green-500" : "text-zinc-500"}>
                {course.is_published ? "Published" : "Draft"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/courses/${courseId}/edit`}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-500 hover:text-white"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit Course
          </Link>
          <DeleteCourseButton courseId={courseId} />
        </div>
      </div>

      {/* Lessons section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="font-semibold text-white">Lessons</h2>
            <p className="mt-0.5 text-xs text-zinc-500">{lessons?.length ?? 0} lessons</p>
          </div>
          <Link
            href={`/admin/courses/${courseId}/lessons/new`}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black hover:bg-amber-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Lesson
          </Link>
        </div>

        {!lessons || lessons.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-zinc-500">No lessons yet.</p>
            <Link
              href={`/admin/courses/${courseId}/lessons/new`}
              className="mt-2 inline-block text-sm text-amber-500 hover:text-amber-400"
            >
              Add the first lesson →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {lessons.map((lesson, i) => (
              <div key={lesson.id} className="flex items-center gap-4 px-6 py-4">
                {/* Order number */}
                <span className="w-6 shrink-0 text-center text-sm font-bold text-zinc-600">
                  {lesson.order_index}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-white">{lesson.title}</p>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                    <span>{lesson.duration_minutes} min</span>
                    {lesson.video_url && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-green-500">
                          <Video className="h-3 w-3" /> Video set
                        </span>
                      </>
                    )}
                    {lesson.is_free && (
                      <>
                        <span>·</span>
                        <span className="text-amber-500">Free preview</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/courses/${courseId}/learn?lesson=${lesson.id}`}
                    target="_blank"
                    className="rounded border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white"
                  >
                    Preview
                  </Link>
                  <Link
                    href={`/admin/courses/${courseId}/lessons/${lesson.id}/edit`}
                    className="rounded border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Link>
                  <DeleteLessonButton lessonId={lesson.id} courseId={courseId} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
