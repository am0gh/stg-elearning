"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { createClient } from "@/lib/supabase/client"

const GOLD = "var(--brand-gold)"

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push("/auth/login"), 2500)
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12" style={{ background: "#0a0a0a" }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto mb-4 block">
            <span className="text-2xl font-black" style={{ color: GOLD }}>Salsa te Gusta</span>
          </Link>
          <CardTitle className="text-2xl">Set a new password</CardTitle>
          <CardDescription>Choose a strong password for your account</CardDescription>
        </CardHeader>

        {done ? (
          <CardContent>
            <div
              className="rounded-lg p-4 text-center text-sm"
              style={{ background: "rgba(201,162,39,0.1)", border: "1px solid rgba(201,162,39,0.3)" }}
            >
              <p style={{ color: "white" }}>Password updated!</p>
              <p className="mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                Redirecting you to sign in…
              </p>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="password">New Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirm">Confirm Password</FieldLabel>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Repeat your new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    minLength={6}
                    required
                  />
                </Field>
              </FieldGroup>

              {error && (
                <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Spinner className="mr-2 h-4 w-4" />}
                Update Password
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Remember it now?{" "}
                <Link href="/auth/login" className="font-medium hover:underline" style={{ color: GOLD }}>
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}
