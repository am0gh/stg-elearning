import { NextRequest, NextResponse } from "next/server"
import { createAdminToken, isValidAdminToken } from "@/lib/auth/admin"
import {
  checkRateLimit,
  resetRateLimit,
  getClientIp,
  buildRateLimitResponse,
} from "@/lib/rate-limit"

// ─── Config ───────────────────────────────────────────────────────────────────
// 5 failed attempts within 15 minutes → 15-minute lockout.
// Successful logins reset the counter so a typo doesn't punish a real admin.
const ADMIN_AUTH_LIMIT = {
  limit: 5,
  windowMs: 15 * 60 * 1000,   // 15 min window
  lockoutMs: 15 * 60 * 1000,  // 15 min lockout after breach
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rateLimitKey = `admin-auth:${ip}`

  const body = await req.json().catch(() => ({}))
  const { password } = body
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    // Don't expose config details — log server-side only
    console.error("[admin/auth] ADMIN_PASSWORD environment variable is not set")
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }

  if (typeof password !== "string" || password !== adminPassword) {
    // Only count failed attempts toward the rate limit
    const rl = checkRateLimit(rateLimitKey, ADMIN_AUTH_LIMIT)
    if (!rl.allowed) {
      return buildRateLimitResponse(
        rl.retryAfter,
        `Too many failed login attempts. Try again in ${Math.ceil(rl.retryAfter / 60)} minute${rl.retryAfter >= 120 ? "s" : ""}.`
      ) as NextResponse
    }

    return NextResponse.json(
      {
        error: "Incorrect password",
        // Tell the UI how many attempts remain so it can warn the admin
        attemptsRemaining: rl.remaining,
      },
      { status: 401 }
    )
  }

  // ── Successful login ───────────────────────────────────────────────────────
  // Clear any failed-attempt counter for this IP so a typo earlier this session
  // doesn't leave the real admin closer to a lockout than they expect.
  resetRateLimit(rateLimitKey)

  const token = createAdminToken(adminPassword)
  const res = NextResponse.json({ ok: true })
  res.cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete("admin_session")
  return res
}

// Re-export for any code that imported isValidAdminToken from this file
export { isValidAdminToken }
