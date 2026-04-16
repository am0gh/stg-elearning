import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"

const GOLD = "var(--brand-gold)"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12" style={{ background: "#0a0a0a" }}>
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--brand-gold) 15%, transparent)" }}
          >
            <Mail className="h-8 w-8" style={{ color: GOLD }} />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent you a confirmation link to verify your email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Click the link in your email to complete your registration and access
            your course. If you don&apos;t see the email, check your spam folder.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/auth/login">Back to Sign In</Link>
          </Button>
          <Link
            href="/"
            className="text-sm transition-colors"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            ← Return to Start Salsa
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
