import { cookies } from "next/headers"
import { isValidAdminToken } from "@/app/api/admin/auth/route"

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_session")?.value
  return isValidAdminToken(token)
}
