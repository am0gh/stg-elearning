import { createClient } from "@supabase/supabase-js"

/**
 * Supabase client using the service role key — bypasses RLS.
 * Only use in server-side admin API routes, never in client components.
 * Falls back to anon key if service role key is not set.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
