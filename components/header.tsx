"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LayoutDashboard, LogOut, Menu, User, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

const GOLD = "#C9A227"

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const navLinks = [
    { href: "/courses", label: "Courses" },
    { href: "/#included", label: "What's Included" },
    { href: "/#faq", label: "FAQ" },
    ...(user ? [{ href: "/dashboard", label: "My Courses" }] : []),
  ]

  return (
    <header
      className="sticky top-0 z-50 w-full border-b"
      style={{ background: "#0a0a0a", borderColor: "rgba(201,162,39,0.15)" }}
    >
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span
            className="text-xl font-bold tracking-wide"
            style={{ color: GOLD }}
          >
            Salsa te Gusta
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors"
              style={{
                color: pathname === link.href ? GOLD : "rgba(255,255,255,0.75)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = GOLD }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  pathname === link.href ? GOLD : "rgba(255,255,255,0.75)"
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-9 w-28 animate-pulse rounded" style={{ background: "rgba(201,162,39,0.15)" }} />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email ?? ""} />
                    <AvatarFallback style={{ background: GOLD, color: "#0a0a0a" }}>
                      {user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.user_metadata?.full_name ?? "Student"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    My Courses
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-3 sm:flex">
              <Link
                href="/auth/login"
                className="text-sm font-medium transition-colors"
                style={{ color: "rgba(255,255,255,0.7)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = GOLD }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)" }}
              >
                Login
              </Link>
              <Link
                href="/courses"
                className="rounded px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: GOLD, color: "#0a0a0a" }}
              >
                Start Learning
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className="flex items-center justify-center rounded p-1.5 md:hidden"
            style={{ color: "white" }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t md:hidden" style={{ borderColor: "rgba(201,162,39,0.15)", background: "#0a0a0a" }}>
          <nav className="container mx-auto flex flex-col gap-1 px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded px-3 py-2.5 text-sm font-medium transition-colors"
                style={{ color: pathname === link.href ? GOLD : "rgba(255,255,255,0.75)" }}
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <>
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded px-3 py-2.5 text-sm font-medium"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  Login
                </Link>
                <Link
                  href="/courses"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-1 rounded px-3 py-2.5 text-center text-sm font-semibold"
                  style={{ background: GOLD, color: "#0a0a0a" }}
                >
                  Start Learning
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
