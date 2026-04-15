import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { BookOpen, Plus, Users } from "lucide-react"

export default async function AdminDashboard() {
  const supabase = createAdminClient()

  const [{ data: courses }, { count: enrollmentCount }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, level, is_published, price")
      .order("created_at", { ascending: true }),
    supabase.from("enrollments").select("id", { count: "exact", head: true }),
  ])

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage your courses and content</p>
        </div>
        <Link
          href="/admin/courses/new"
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400"
        >
          <Plus className="h-4 w-4" />
          New Course
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <BookOpen className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{courses?.length ?? 0}</p>
              <p className="text-xs text-zinc-500">Courses</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Users className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{enrollmentCount ?? 0}</p>
              <p className="text-xs text-zinc-500">Enrollments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Courses table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-6 py-4">
          <h2 className="font-semibold text-white">Courses</h2>
        </div>

        {!courses || courses.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-zinc-500">No courses yet.</p>
            <Link href="/admin/courses/new" className="mt-3 inline-block text-sm text-amber-500 hover:text-amber-400">
              Create your first course →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {courses.map(course => (
              <div key={course.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-white">{course.title}</p>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-xs capitalize text-zinc-500">{course.level}</span>
                    <span className="text-xs text-zinc-600">·</span>
                    <span className="text-xs text-zinc-500">€{course.price}</span>
                    <span className="text-xs text-zinc-600">·</span>
                    <span
                      className={`text-xs font-semibold ${
                        course.is_published ? "text-green-500" : "text-zinc-500"
                      }`}
                    >
                      {course.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/admin/courses/${course.id}`}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-600 hover:text-white"
                >
                  Manage
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
