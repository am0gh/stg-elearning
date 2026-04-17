import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendNotification } from "@/lib/notifications"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code    = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? "/dashboard"

  // Only allow relative paths starting with / (not //) to prevent open redirect
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/"

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // ── Fire user.signup notification ──────────────────────────────────────
      // We check created_at ≈ now to only fire on first-ever email confirmation,
      // not on subsequent logins or password resets that go through this callback.
      const createdAt  = new Date(data.user.created_at).getTime()
      const now        = Date.now()
      const isNewUser  = now - createdAt < 5 * 60 * 1000 // within last 5 minutes

      if (isNewUser) {
        const admin = createAdminClient()
        const { data: profile } = await admin
          .from("profiles")
          .select("full_name")
          .eq("id", data.user.id)
          .single()

        const name = profile?.full_name
          ?? data.user.user_metadata?.full_name
          ?? ""

        // Non-blocking — do not await, let the redirect happen immediately
        sendNotification({
          event: "user.signup",
          data: {
            user_id: data.user.id,
            email:   data.user.email ?? "",
            name,
          },
        }).catch(() => {/* swallowed */})
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
