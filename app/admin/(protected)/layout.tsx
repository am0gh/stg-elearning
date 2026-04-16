import { redirect } from "next/navigation"
import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { BookOpen, FileText, LayoutDashboard, Paintbrush, Tag } from "lucide-react"
import { SignOutButton } from "./sign-out-button"
import { isAdmin } from "@/lib/auth/admin"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authed = await isAdmin()
  if (!authed) redirect("/admin/login")

  // Fetch courses for sidebar
  const supabase = createAdminClient()
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, level")
    .order("created_at", { ascending: true })

  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
        {/* Logo */}
        <div className="border-b border-zinc-800 px-4 py-4">
          <span className="text-sm font-black text-amber-400">Salsa te Gusta</span>
          <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500">
            Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>

          <Link
            href="/admin/design"
            className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <Paintbrush className="h-4 w-4" />
            Design
          </Link>

          <Link
            href="/admin/content"
            className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <FileText className="h-4 w-4" />
            Content
          </Link>

          <Link
            href="/admin/discounts"
            className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <Tag className="h-4 w-4" />
            Discounts
          </Link>

          <div className="mt-3 px-4 pb-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
              Courses
            </p>
          </div>

          {courses?.map(course => (
            <Link
              key={course.id}
              href={`/admin/courses/${course.id}`}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{course.title}</span>
            </Link>
          ))}

          <div className="px-4 pt-2">
            <Link
              href="/admin/courses/new"
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 hover:text-amber-400"
            >
              + New course
            </Link>
          </div>
        </nav>

        {/* Sign out */}
        <div className="border-t border-zinc-800 p-4">
          <SignOutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
