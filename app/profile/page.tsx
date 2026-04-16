import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

const BLACK = "#0a0a0a"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login?redirect=/profile")

  return (
    <div className="flex min-h-screen flex-col" style={{ background: BLACK, color: "white" }}>
      <Header />
      <main className="flex-1 py-12">
        <div className="container mx-auto max-w-2xl px-4">
          <h1 className="mb-8 text-3xl font-black" style={{ color: "white" }}>
            My Profile
          </h1>
          <div
            className="rounded-lg p-6 space-y-4"
            style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Name</p>
              <p style={{ color: "white" }}>{user.user_metadata?.full_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Email</p>
              <p style={{ color: "white" }}>{user.email}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Member Since</p>
              <p style={{ color: "white" }}>
                {new Date(user.created_at).toLocaleDateString("nl-NL", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
