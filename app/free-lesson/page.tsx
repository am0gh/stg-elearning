/**
 * /free-lesson — server-side redirect to the first free lesson of Level 1.
 * Looks up the course and lesson IDs at request time so no UUIDs are
 * hardcoded in the frontend.
 */
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function FreeLessonRedirect() {
  const supabase = await createClient()

  // Find the Level 1 (beginner) course
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("level", "beginner")
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (!course) redirect("/courses")

  // Find the first free lesson ordered by position
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", course.id)
    .eq("is_free", true)
    .order("order_index", { ascending: true })
    .limit(1)
    .single()

  if (!lesson) redirect(`/courses`)

  redirect(`/courses/${course.id}/learn?lesson=${lesson.id}`)
}
