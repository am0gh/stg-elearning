"use client"

import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

export function DeleteLessonButton({ lessonId, courseId }: { lessonId: string; courseId: string }) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm("Delete this lesson? This cannot be undone.")) return
    await fetch(`/api/admin/courses/${courseId}/lessons/${lessonId}`, { method: "DELETE" })
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      className="rounded border border-zinc-700 p-1.5 text-zinc-600 hover:border-red-800 hover:text-red-400"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

export function DeleteCourseButton({ courseId }: { courseId: string }) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm("Delete this course and all its lessons? This cannot be undone.")) return
    await fetch(`/api/admin/courses/${courseId}`, { method: "DELETE" })
    router.push("/admin")
  }

  return (
    <button
      onClick={handleDelete}
      className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-2 text-xs font-medium text-red-500 hover:border-red-900 hover:bg-red-950/30"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Delete
    </button>
  )
}
