"use client"

import { LogOut } from "lucide-react"

export function SignOutButton() {
  const handleSignOut = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" })
    window.location.href = "/admin/login"
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign out
    </button>
  )
}
