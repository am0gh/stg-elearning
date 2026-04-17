import { NextRequest, NextResponse } from "next/server"
import { createAdminToken, isValidAdminToken } from "@/lib/auth/admin"

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
