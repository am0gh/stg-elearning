import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12" style={{ background: "#0a0a0a" }}>
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Authentication Error</CardTitle>
          <CardDescription>
            Something went wrong during the authentication process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This could happen if the link has expired or has already been used.
            Please try signing in again or contact us at{" "}
            <a
              href="mailto:contact@salsategusta.nl"
              className="underline"
              style={{ color: "#C9A227" }}
            >
              contact@salsategusta.nl
            </a>{" "}
            if the problem persists.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" asChild>
            <Link href="/auth/login">Try Again</Link>
          </Button>
          <Link
            href="/"
            className="text-sm transition-colors"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            ← Return to Salsa te Gusta
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
