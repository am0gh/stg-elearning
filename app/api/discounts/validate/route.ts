import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  checkRateLimit,
  getClientIp,
  buildRateLimitResponse,
} from "@/lib/rate-limit"

// ─── Config ───────────────────────────────────────────────────────────────────
// 20 attempts per minute per IP — generous enough for any real user flow,
// tight enough to prevent automated code enumeration.
const DISCOUNT_VALIDATE_LIMIT = {
  limit: 20,
  windowMs: 60 * 1000,        // 1 min window
  lockoutMs: 3 * 60 * 1000,   // 3 min lockout after breach
}

export async function POST(req: NextRequest) {
  // Rate-limit before touching the DB
  const ip = getClientIp(req)
  const rl = checkRateLimit(`discount-validate:${ip}`, DISCOUNT_VALIDATE_LIMIT)
  if (!rl.allowed) {
    return buildRateLimitResponse(
      rl.retryAfter,
      "Too many discount code attempts. Please wait a moment before trying again."
    ) as NextResponse
  }

  const body = await req.json().catch(() => ({}))
  const { code } = body

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code is required" }, { status: 400 })
  }

  // Basic format guard — codes are lowercase alphanumeric + hyphen/underscore
  const normalised = code.trim().toLowerCase()
  if (!/^[a-z0-9_-]{1,50}$/.test(normalised)) {
    return NextResponse.json({ error: "Invalid or expired discount code" }, { status: 404 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("discount_codes")
    .select("id, code, discount_percent, discount_amount_eur, max_uses, max_uses_per_user, uses_count, starts_at, expires_at, is_active")
    .eq("is_active", true)
    .ilike("code", normalised)
    .single()

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ error: "Discount codes are not yet configured — contact support" }, { status: 503 })
    }
    return NextResponse.json({ error: "Invalid or expired discount code" }, { status: 404 })
  }

  if (!data) {
    return NextResponse.json({ error: "Invalid or expired discount code" }, { status: 404 })
  }

  const now = new Date()

  if (data.starts_at && new Date(data.starts_at) > now) {
    return NextResponse.json({ error: "This discount code is not active yet" }, { status: 410 })
  }

  if (data.expires_at && new Date(data.expires_at) < now) {
    return NextResponse.json({ error: "This discount code has expired" }, { status: 410 })
  }

  if (data.max_uses !== null && data.uses_count >= data.max_uses) {
    return NextResponse.json({ error: "This discount code has reached its usage limit" }, { status: 410 })
  }

  // Per-user limit — only check when a user is signed in
  if (data.max_uses_per_user !== null) {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()

    if (user) {
      const { count } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("discount_code_id", data.id)

      if ((count ?? 0) >= data.max_uses_per_user) {
        return NextResponse.json({
          error: data.max_uses_per_user === 1
            ? "You have already used this discount code"
            : `You can only use this code ${data.max_uses_per_user} time${data.max_uses_per_user > 1 ? "s" : ""}`,
        }, { status: 410 })
      }
    }
  }

  return NextResponse.json({
    valid: true,
    id: data.id,
    code: data.code,
    discount_percent: data.discount_percent ?? null,
    discount_amount_eur: data.discount_amount_eur ?? null,
  })
}
