/**
 * Admin authentication utilities.
 *
 * All token logic lives HERE (in lib/) so that:
 *  - Route handlers can import from this file
 *  - Nothing imports from a route file (which breaks in production
 *    because Next.js compiles each route as an isolated serverless function)
 */

import { cookies } from "next/headers"
import { createHmac, timingSafeEqual } from "crypto"

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

/** Create a signed, time-stamped session token. */
export function createAdminToken(secret: string): string {
  const payload = JSON.stringify({ iat: Date.now() })
  const encoded = Buffer.from(payload).toString("base64url")
  const sig = sign(encoded, secret)
  return `${encoded}.${sig}`
}

/** Validate a session token — timing-safe HMAC check + expiry. */
export function isValidAdminToken(token: string | undefined): boolean {
  if (!token) return false
  const secret = process.env.ADMIN_PASSWORD
  if (!secret) return false

  const dotIndex = token.lastIndexOf(".")
  if (dotIndex === -1) return false
  const encoded = token.slice(0, dotIndex)
  const sig = token.slice(dotIndex + 1)
  if (!encoded || !sig) return false

  try {
    const expectedSig = sign(encoded, secret)
    const sigBuf = Buffer.from(sig, "hex")
    const expectedBuf = Buffer.from(expectedSig, "hex")
    if (sigBuf.length !== expectedBuf.length) return false
    if (!timingSafeEqual(sigBuf, expectedBuf)) return false
  } catch {
    return false
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"))
    if (typeof payload.iat !== "number") return false
    if (Date.now() - payload.iat > SESSION_DURATION_MS) return false
  } catch {
    return false
  }

  return true
}

/** Server-side check — reads the admin_session cookie. */
export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_session")?.value
  return isValidAdminToken(token)
}
