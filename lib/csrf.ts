/**
 * CSRF Protection — Origin Validation
 * ─────────────────────────────────────
 * Defence-in-depth on top of sameSite:lax cookies.
 *
 * Strategy: "origin checking" (OWASP recommended)
 *
 *  - Every browser-initiated fetch() includes an `Origin` header.
 *  - We verify it matches the app's own origin before processing any
 *    state-changing admin request (POST, PUT, PATCH, DELETE).
 *  - Legitimate admin traffic always originates from the same host,
 *    so this never trips for real users.
 *  - A cross-site attacker (different origin) is rejected with 403 even
 *    if they somehow obtained a valid session cookie.
 *
 * Why not a token-based approach?
 *  Stateless JWT-style tokens or double-submit cookies are the other
 *  common option, but they require either:
 *    a) a server-side token store (adds infra), or
 *    b) sending a token in every page HTML and threading it through
 *       every fetch call in every admin component.
 *  For a single-admin platform, origin checking provides the same
 *  protection with far less complexity.
 *
 * Caveats:
 *  - Does not protect against same-origin attacks (XSS).
 *    The XSS mitigation is the Content-Security-Policy header.
 *  - Origin header can be null for privacy-sensitive navigations;
 *    we fall back to checking Referer in that case.
 */

import { NextResponse } from "next/server"

/**
 * Returns the allowed origin for the app.
 * Uses NEXT_PUBLIC_APP_URL in production, falls back to localhost in dev.
 */
function getAllowedOrigin(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    try {
      return new URL(appUrl).origin
    } catch {
      // fall through to default
    }
  }
  return "http://localhost:3000"
}

/**
 * Validates that a state-changing admin request originates from our own app.
 *
 * Returns `null` if the request is allowed, or a 403 NextResponse if it
 * should be rejected.  Call this at the top of every mutating admin route:
 *
 * @example
 * const csrf = validateAdminOrigin(req)
 * if (csrf) return csrf
 */
export function validateAdminOrigin(req: Request): NextResponse | null {
  const method = req.method?.toUpperCase() ?? "GET"

  // Safe methods — nothing to protect
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null

  const allowed = getAllowedOrigin()

  // Primary check: Origin header (always present for cross-site fetch)
  const origin = req.headers.get("origin")
  if (origin) {
    if (origin === allowed) return null
    console.warn(`[csrf] blocked request — origin "${origin}" !== "${allowed}"`)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Fallback: Referer header (set for navigations that strip Origin)
  const referer = req.headers.get("referer")
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin
      if (refOrigin === allowed) return null
      console.warn(`[csrf] blocked request — referer origin "${refOrigin}" !== "${allowed}"`)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    } catch {
      // Malformed referer — reject to be safe
      console.warn("[csrf] blocked request — malformed Referer header")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  // Neither Origin nor Referer present.
  // This happens legitimately for: server-to-server calls (Stripe webhook
  // verifies its own signature), admin CLI scripts, or some older clients.
  // We allow these through because admin routes still require a valid
  // admin_session cookie — an attacker can't forge that.
  return null
}
