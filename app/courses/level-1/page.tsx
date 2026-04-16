import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function Level1Redirect() {
  const supabase = await createClient()
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("level", "beginner")
    .eq("is_published", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (!course) redirect("/courses")
  redirect(`/courses/${course.id}`)
}
