import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"

// Anchor to globalThis so the store is shared across all module instances
// in the same Node.js process (Next.js can bundle route handlers separately).
const g = globalThis as typeof globalThis & {
  __adminSessions?: Map<string, { expiresAt: number }>
}
if (!g.__adminSessions) {
  g.__adminSessions = new Map()
}
const SESSION_STORE = g.__adminSessions

// Clean up expired sessions periodically
function pruneExpired() {
  const now = Date.now()
  for (const [token, { expiresAt }] of SESSION_STORE.entries()) {
    if (expiresAt < now) SESSION_STORE.delete(token)
  }
}

export function isValidAdminToken(token: string | undefined): boolean {
  if (!token) return false
  pruneExpired()
  const session = SESSION_STORE.get(token)
  if (!session) return false
  if (session.expiresAt < Date.now()) {
    SESSION_STORE.delete(token)
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
    // Constant-time-ish: always return same response shape for wrong password
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
  }

  const token = randomBytes(32).toString("hex")
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days

  SESSION_STORE.set(token, { expiresAt })

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
