import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

function createToken(secret: string): string {
  const payload = JSON.stringify({ iat: Date.now() })
  const encoded = Buffer.from(payload).toString("base64url")
  const sig = sign(encoded, secret)
  return `${encoded}.${sig}`
}

/**
 * Stateless token validation — no server-side session store required.
 * Works correctly across Vercel serverless cold starts.
 */
export function isValidAdminToken(token: string | undefined): boolean {
  if (!token) return false
  const secret = process.env.ADMIN_PASSWORD
  if (!secret) return false

  const dotIndex = token.lastIndexOf(".")
  if (dotIndex === -1) return false
  const encoded = token.slice(0, dotIndex)
  const sig = token.slice(dotIndex + 1)
  if (!encoded || !sig) return false

  // Timing-safe HMAC comparison
  try {
    const expectedSig = sign(encoded, secret)
    const sigBuf = Buffer.from(sig, "hex")
    const expectedBuf = Buffer.from(expectedSig, "hex")
    if (sigBuf.length !== expectedBuf.length) return false
    if (!timingSafeEqual(sigBuf, expectedBuf)) return false
  } catch {
    return false
  }

  // Verify expiry
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"))
    if (typeof payload.iat !== "number") return false
    if (Date.now() - payload.iat > SESSION_DURATION_MS) return false
  } catch {
    return false
  }

  return true
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { password } = body
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    return NextResponse.json({ error: "ADMIN_PASSWORD not configured" }, { status: 500 })
  }

  if (typeof password !== "string" || password !== adminPassword) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
  }

  const token = createToken(adminPassword)

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
