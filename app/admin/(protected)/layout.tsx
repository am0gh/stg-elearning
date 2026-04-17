import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/auth/admin"
import { AdminSidebar } from "./admin-sidebar"

// Always render fresh — never let Vercel CDN cache the admin shell
export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authed = await isAdmin()
  if (!authed) redirect("/admin/login")

  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      <AdminSidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
