# Implementation Prompt — Security & Quality Fixes
# Salsa te Gusta E-Learning Platform
# 
# NOTE: Stripe payment integration is intentionally excluded — handle separately.
# Work through each section in order. Do NOT skip any item.
# After completing all changes, run `pnpm build` and fix any TypeScript/build errors.

---

## CONTEXT

This is a Next.js 15 App Router e-learning platform for "Salsa te Gusta," a Dutch salsa dance academy.
Stack: Next.js 15, TypeScript, Supabase (auth + DB + storage), Mux (video), Tailwind CSS, shadcn/ui.
Deployment target: Vercel.

The codebase is at the project root. All files are accessible.

---

## SECTION 1 — CRITICAL SECURITY FIXES

### 1.1 — Fix the Next.js middleware (currently not running at all)

The file `proxy.ts` at the project root is NOT recognized by Next.js as middleware.
Next.js requires a file named `middleware.ts` that exports a default function.

**Steps:**
1. Read `proxy.ts`
2. Create `middleware.ts` at the project root with the following content:

```ts
import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

3. Delete `proxy.ts`

---

### 1.2 — Fix the learn page auth gate (paid content exposed to everyone)

File: `app/courses/[id]/learn/page.tsx`

The auth and enrollment check is commented out. Uncomment it and make it work correctly.

**Steps:**
1. Read the file
2. Find the commented-out block starting with `// Auth check — disabled for testing`
3. Replace the entire auth section (lines that include the commented block and the existing `const { data: { user } }` line) with:

```ts
  // Auth check — require login and enrollment
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?redirect=/courses/${id}/learn`)
  }

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", id)
    .single()

  if (!enrollment) {
    redirect(`/courses/${id}`)
  }
```

4. Remove ALL commented-out code from the file (the `/* ... */` block)
5. Update the progress fetch below — it no longer needs the `user ?` conditional since user is guaranteed at this point:

Change:
```ts
  const { data: progress } = user
    ? await supabase
        .from("lesson_progress")
        ...
    : { data: [] }
```
To:
```ts
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", user.id)
    .in("lesson_id", lessons.map(l => l.id))
```

---

### 1.3 — Fix admin session: don't store the password as the cookie token

Currently `app/api/admin/auth/route.ts` sets the cookie value TO the admin password itself, which is a security vulnerability. Replace with a cryptographic random session token.

**Steps:**
1. Read `app/api/admin/auth/route.ts`
2. Replace the entire file content with:

```ts
import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"

// In-memory session store (sufficient for single-admin use; survives Vercel function warm instances)
// For multi-instance production, move this to Redis or a DB table.
const SESSION_STORE = new Map<string, { expiresAt: number }>()

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
```

3. Now update EVERY file that calls `isAdmin()` to use the exported `isValidAdminToken` from this file instead of re-implementing the check. The files to update are:

- `app/api/admin/courses/route.ts`
- `app/api/admin/courses/[courseId]/route.ts`
- `app/api/admin/courses/[courseId]/lessons/route.ts`
- `app/api/admin/courses/[courseId]/lessons/[lessonId]/route.ts`
- `app/api/admin/mux/assets/route.ts`
- `app/api/admin/settings/route.ts`
- `app/api/admin/homepage/route.ts`
- `app/api/admin/upload-logo/route.ts`

In each of those files, replace the local `isAdmin` / `isAuthenticated` function AND its cookie/password comparison with a call to the shared utility. Create a shared helper file first:

Create `lib/auth/admin.ts`:
```ts
import { cookies } from "next/headers"
import { isValidAdminToken } from "@/app/api/admin/auth/route"

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_session")?.value
  return isValidAdminToken(token)
}
```

Then in each API route file, replace:
```ts
async function isAdmin() {
  const cookieStore = await cookies()
  return cookieStore.get("admin_session")?.value === process.env.ADMIN_PASSWORD
}
```
with:
```ts
import { isAdmin } from "@/lib/auth/admin"
```
(remove the local function definition entirely)

4. Update `app/admin/(protected)/layout.tsx` to use the same shared helper. Replace its `isAuthenticated()` function body with a call to `isAdmin()` from `@/lib/auth/admin`.

---

### 1.4 — Fix upload-image endpoint: wrong auth method

File: `app/api/admin/upload-image/route.ts`

This route checks for a Supabase user session (any student can pass this check), while all other admin routes check the admin cookie. Fix it to use the admin check.

**Steps:**
1. Read the file
2. Remove the Supabase client import and user auth check at the top of the POST handler
3. Replace:
```ts
  // Verify the user is an authenticated admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }
```
With:
```ts
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }
```
4. Add the import: `import { isAdmin } from "@/lib/auth/admin"`
5. Remove the now-unused `import { createClient } from "@/lib/supabase/server"` line

---

### 1.5 — Sanitize CSS values before injection (XSS via dangerouslySetInnerHTML)

File: `lib/site-settings.ts`

The `buildSettingsCSS()` function injects raw database values into a `<style>` tag. Add validation.

**Steps:**
1. Read `lib/site-settings.ts`
2. Add this validation function near the top of the file (after the type definitions):

```ts
function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

function sanitizeCss(value: string): string {
  // Strip anything that could break out of a CSS value context
  return value.replace(/[<>"'`\\]/g, "")
}
```

3. In `buildSettingsCSS()`, wrap color values with validation:

Replace:
```ts
  const cta      = settings.cta_color
```
With:
```ts
  const cta = isValidHex(settings.cta_color) ? settings.cta_color : DEFAULT_SETTINGS.cta_color
```

Replace the heading color usage:
```ts
  if (settings.heading_color !== DEFAULT_SETTINGS.heading_color) {
    extra.push(
      `h1,h2,h3,h4,h5,h6{color:${settings.heading_color}!important}`
    )
  }
```
With:
```ts
  const headingColor = isValidHex(settings.heading_color) ? settings.heading_color : DEFAULT_SETTINGS.heading_color
  if (headingColor !== DEFAULT_SETTINGS.heading_color) {
    extra.push(
      `h1,h2,h3,h4,h5,h6{color:${headingColor}!important}`
    )
  }
```

4. Also sanitize font-family values in the font sections — wrap each `family` usage with `sanitizeCss(family)`:
```ts
  if (settings.body_font !== "geist") {
    const family = sanitizeCss(FONT_META[settings.body_font].family)
    ...
  }
```
Do the same for `heading_font`.

5. In the settings PUT route (`app/api/admin/settings/route.ts`), add validation of hex color values before upserting. After `const body = await req.json()`, add:
```ts
  // Validate color fields
  if (body.cta_color && !/^#[0-9a-fA-F]{6}$/.test(body.cta_color)) {
    return NextResponse.json({ error: "Invalid cta_color: must be a 6-digit hex color" }, { status: 400 })
  }
  if (body.heading_color && !/^#[0-9a-fA-F]{6}$/.test(body.heading_color)) {
    return NextResponse.json({ error: "Invalid heading_color: must be a 6-digit hex color" }, { status: 400 })
  }
```

---

### 1.6 — Fix open redirect in auth callback and login

File: `app/auth/callback/route.ts`

**Steps:**
1. Replace:
```ts
  const next = searchParams.get('next') ?? '/'
```
With:
```ts
  const rawNext = searchParams.get('next') ?? '/'
  // Only allow relative paths starting with / (not //) to prevent open redirect
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'
```

File: `app/auth/login/page.tsx`

2. The `redirectTo` value from `?redirect=` is passed to `router.push()`. Add validation in `LoginForm`:

Replace:
```ts
  const redirectTo = searchParams.get("redirect") ?? "/dashboard"
```
With:
```ts
  const rawRedirect = searchParams.get("redirect") ?? "/dashboard"
  const redirectTo = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') 
    ? rawRedirect 
    : "/dashboard"
```

---

## SECTION 2 — ARCHITECTURE & CODE QUALITY

### 2.1 — Enable TypeScript build checking

File: `next.config.mjs`

Remove the `typescript.ignoreBuildErrors` block entirely:

Replace:
```js
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}
```
With:
```js
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'image.mux.com',
      },
    ],
  },
}
```

This also re-enables image optimization (which was globally disabled) and whitelists the two image domains actually used (Supabase storage and Mux thumbnails).

---

### 2.2 — Add caching to getSiteSettings and getHomepageContent

Both functions are called on every page render including the root layout (meaning 1-2 extra DB queries per request sitewide).

File: `lib/site-settings.ts`

1. Add the Next.js cache import at the top:
```ts
import { unstable_cache } from 'next/cache'
```

2. Wrap the existing `getSiteSettings` export:

Replace the export of `getSiteSettings` with:
```ts
export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")

      if (error || !data) return DEFAULT_SETTINGS

      const map = Object.fromEntries(
        data.map((r: { key: string; value: string }) => [r.key, r.value])
      )

      return {
        button_shape:    (map.button_shape    as ButtonShape)    ?? DEFAULT_SETTINGS.button_shape,
        cta_color:       map.cta_color                           ?? DEFAULT_SETTINGS.cta_color,
        heading_color:   map.heading_color                       ?? DEFAULT_SETTINGS.heading_color,
        body_font:       (map.body_font       as FontChoice)     ?? DEFAULT_SETTINGS.body_font,
        heading_font:    (map.heading_font    as FontChoice)     ?? DEFAULT_SETTINGS.heading_font,
        border_strength: (map.border_strength as BorderStrength) ?? DEFAULT_SETTINGS.border_strength,
      }
    } catch {
      return DEFAULT_SETTINGS
    }
  },
  ['site-settings'],
  { revalidate: 60, tags: ['site-settings'] }
)
```

File: `lib/homepage-content.ts`

3. Add the import at the top: `import { unstable_cache } from 'next/cache'`

4. Wrap `getHomepageContent` the same way:

```ts
export const getHomepageContent = unstable_cache(
  async (): Promise<HomepageContent> => {
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")

      if (error || !data) return DEFAULT_CONTENT

      const map = Object.fromEntries(
        data.map((r: { key: string; value: string }) => [r.key, r.value])
      )

      return { ...DEFAULT_CONTENT, ...map } as HomepageContent
    } catch {
      return DEFAULT_CONTENT
    }
  },
  ['homepage-content'],
  { revalidate: 60, tags: ['homepage-content'] }
)
```

5. In the admin API routes that update settings/homepage content, add cache revalidation after successful upsert. In `app/api/admin/settings/route.ts` and `app/api/admin/homepage/route.ts`, add at the top:
```ts
import { revalidateTag } from 'next/cache'
```
And after a successful upsert in each PUT handler, add:
```ts
  revalidateTag('site-settings')
  revalidateTag('homepage-content')
```

---

### 2.3 — Fix the free-lesson page using admin client unnecessarily

File: `app/free-lesson/page.tsx`

This is a public page doing a simple read query. It should use the anon Supabase client, not the service role client.

Replace:
```ts
import { createAdminClient } from "@/lib/supabase/admin"
...
  const supabase = createAdminClient()
```
With:
```ts
import { createClient } from "@/lib/supabase/server"
...
  const supabase = await createClient()
```

---

## SECTION 3 — DEAD LINKS & MISSING PAGES

### 3.1 — Fix dead `/courses/level-1` links (homepage and footer both 404)

The homepage and footer link to `/courses/level-1` which doesn't exist. Courses use UUID-based URLs.

Create a redirect route at `app/courses/level-1/page.tsx`:

```tsx
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function Level1Redirect() {
  const supabase = await createClient()
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("level", "beginner")
    .eq("is_published", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (!course) redirect("/courses")
  redirect(`/courses/${course.id}`)
}
```

Do the same for `app/courses/level-2/page.tsx`:
```tsx
import { redirect } from "next/navigation"

export default function Level2Redirect() {
  redirect("/courses")
}
```

---

### 3.2 — Create a Profile page stub

File: `app/profile/page.tsx`

The header dropdown links every logged-in user to `/profile`. Create a basic page:

```tsx
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

const GOLD = "var(--brand-gold)"
const BLACK = "#0a0a0a"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login?redirect=/profile")

  return (
    <div className="flex min-h-screen flex-col" style={{ background: BLACK, color: "white" }}>
      <Header />
      <main className="flex-1 py-12">
        <div className="container mx-auto max-w-2xl px-4">
          <h1 className="mb-8 text-3xl font-black" style={{ color: "white" }}>
            My Profile
          </h1>
          <div
            className="rounded-lg p-6 space-y-4"
            style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Name</p>
              <p style={{ color: "white" }}>{user.user_metadata?.full_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Email</p>
              <p style={{ color: "white" }}>{user.email}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Member Since</p>
              <p style={{ color: "white" }}>
                {new Date(user.created_at).toLocaleDateString("nl-NL", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
```

---

### 3.3 — Create a Privacy Policy page stub

File: `app/privacy/page.tsx`

Required by Dutch/GDPR law for any commercial platform collecting personal data and processing payments.

```tsx
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

const BLACK = "#0a0a0a"

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: BLACK, color: "white" }}>
      <Header />
      <main className="flex-1 py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <h1 className="mb-8 text-4xl font-black" style={{ color: "white" }}>
            Privacy Policy
          </h1>
          <div className="prose prose-invert max-w-none space-y-6 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
            <p>
              <strong style={{ color: "white" }}>Salsa te Gusta</strong> is committed to protecting your personal data.
              This Privacy Policy explains how we collect, use, and protect your information when you use our platform.
            </p>
            <h2 className="text-xl font-bold mt-8" style={{ color: "white" }}>Data We Collect</h2>
            <p>We collect your name and email address when you register, and your course progress data as you use the platform.</p>
            <h2 className="text-xl font-bold mt-8" style={{ color: "white" }}>How We Use Your Data</h2>
            <p>Your data is used solely to provide access to your courses and track your learning progress. We do not sell your data to third parties.</p>
            <h2 className="text-xl font-bold mt-8" style={{ color: "white" }}>Your Rights (GDPR)</h2>
            <p>Under GDPR, you have the right to access, correct, or delete your personal data. Contact us at <a href="mailto:contact@salsategusta.nl" style={{ color: "var(--brand-gold)" }}>contact@salsategusta.nl</a> to exercise these rights.</p>
            <h2 className="text-xl font-bold mt-8" style={{ color: "white" }}>Contact</h2>
            <p>
              Salsa te Gusta<br />
              contact@salsategusta.nl<br />
              +31 (0)6 288 106 06
            </p>
            <p className="mt-8 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              Last updated: {new Date().getFullYear()}. This policy will be updated as the platform evolves.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
```

---

### 3.4 — Add a password reset page

File: `app/auth/forgot-password/page.tsx`

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"

const GOLD = "var(--brand-gold)"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12" style={{ background: "#0a0a0a" }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto mb-4 block">
            <span className="text-2xl font-black" style={{ color: GOLD }}>Start Salsa</span>
          </Link>
          <CardTitle className="text-2xl">Reset your password</CardTitle>
          <CardDescription>Enter your email and we'll send you a reset link</CardDescription>
        </CardHeader>

        {sent ? (
          <CardContent>
            <div className="rounded-lg p-4 text-center text-sm" style={{ background: "rgba(201,162,39,0.1)", border: "1px solid rgba(201,162,39,0.3)" }}>
              <p style={{ color: "white" }}>Check your inbox.</p>
              <p className="mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                We've sent a password reset link to <strong>{email}</strong>.
              </p>
            </div>
            <div className="mt-4 text-center">
              <Link href="/auth/login" className="text-sm font-medium" style={{ color: GOLD }}>
                Back to sign in
              </Link>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Field>
              </FieldGroup>
              {error && (
                <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Spinner className="mr-2 h-4 w-4" />}
                Send reset link
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{" "}
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
```

Then update `app/auth/login/page.tsx` — add a "Forgot password?" link below the password field (after the `<Field>` for password, before the closing `</FieldGroup>`):

```tsx
              <div className="text-right">
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-medium hover:underline"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  Forgot password?
                </Link>
              </div>
```

---

## SECTION 4 — BRANDING & COPY FIXES

### 4.1 — Fix HTML lang attribute

File: `app/layout.tsx`

Change:
```tsx
<html lang="en" className="bg-background">
```
To:
```tsx
<html lang="nl" className="bg-background">
```

### 4.2 — Remove v0 generator metadata

File: `app/layout.tsx`

Remove the line:
```ts
  generator: 'v0.app',
```

### 4.3 — Fix footer branding (social links, copyright, name)

File: `components/footer.tsx`

1. Update social links to Salsa te Gusta's actual accounts:
```tsx
{ href: "https://www.instagram.com/salsategusta", icon: <InstagramIcon />, label: "Instagram" },
{ href: "https://www.facebook.com/salsategusta", icon: <FacebookIcon />, label: "Facebook" },
{ href: "https://www.linkedin.com/company/salsategusta", icon: <LinkedInIcon />, label: "LinkedIn" },
```
(Note: if you don't have the exact URLs, use these as placeholders — they're better than linking to the generic homepages)

2. Fix the copyright line at the bottom. Replace the hardcoded year and name:
```tsx
© {new Date().getFullYear()} Salsa te Gusta
```

3. Fix the brand logo text in the footer from "Start Salsa" to "Salsa te Gusta"

### 4.4 — Fix admin sidebar branding

File: `app/admin/(protected)/layout.tsx`

Change "Start Salsa" to "Salsa te Gusta" in the sidebar logo area.

### 4.5 — Fix auth pages branding

Files: `app/auth/login/page.tsx`, `app/auth/sign-up/page.tsx`

Change "Start Salsa" to "Salsa te Gusta" in the logo links on both pages.

### 4.6 — Fix LessonPlayer branding

File: `app/courses/[id]/learn/lesson-player.tsx`

In the top bar header, change "Start Salsa" to "Salsa te Gusta".

---

## SECTION 5 — UX FIXES

### 5.1 — Add error.tsx boundary for the app

Create `app/error.tsx`:

```tsx
"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-4" style={{ background: "#0a0a0a" }}>
      <h1 className="mb-2 text-4xl font-black" style={{ color: "white" }}>Something went wrong</h1>
      <p className="mb-8 text-base" style={{ color: "rgba(255,255,255,0.5)" }}>
        An unexpected error occurred. Please try again.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-5 py-2.5 text-sm font-bold rounded"
          style={{ background: "var(--brand-gold)", color: "#0a0a0a" }}
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 text-sm font-bold rounded"
          style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }}
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
```

### 5.2 — Add not-found.tsx for the app

Create `app/not-found.tsx`:

```tsx
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

const GOLD = "var(--brand-gold)"
const BLACK = "#0a0a0a"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: BLACK }}>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center text-center px-4">
        <p className="mb-3 text-sm font-bold uppercase tracking-widest" style={{ color: GOLD }}>404</p>
        <h1 className="mb-4 text-4xl font-black" style={{ color: "white" }}>Page not found</h1>
        <p className="mb-8 text-base max-w-md" style={{ color: "rgba(255,255,255,0.5)" }}>
          We couldn't find what you were looking for. Head back to our courses and keep dancing.
        </p>
        <Link
          href="/courses"
          className="px-6 py-3 text-sm font-bold rounded"
          style={{ background: GOLD, color: BLACK }}
        >
          Browse courses
        </Link>
      </main>
      <Footer />
    </div>
  )
}
```

---

## SECTION 6 — FINAL STEPS

### 6.1 — Run the build and fix all TypeScript errors

```bash
pnpm build
```

Fix every TypeScript error that surfaces. Do not re-add `ignoreBuildErrors: true`.

### 6.2 — Verify the following manually after implementation:

1. ✅ Navigate to `/courses/[uuid]/learn` without being logged in → should redirect to `/auth/login`
2. ✅ Log in as a regular user (not enrolled) and navigate to `/courses/[uuid]/learn` → should redirect to `/courses/[uuid]`
3. ✅ Navigate to `/admin` without a session cookie → should redirect to `/admin/login`
4. ✅ Navigate to `/api/admin/courses` without admin cookie → should return `{ error: "Unauthorized" }` 401
5. ✅ Navigate to `/courses/level-1` → should redirect to the Level 1 course detail page
6. ✅ Navigate to `/profile` while logged in → should show the profile page (not 404)
7. ✅ Navigate to `/privacy` → should show the privacy policy page (not 404)
8. ✅ Confirm `/auth/forgot-password` loads and the form submits without error
9. ✅ In the admin Design panel, set `cta_color` to something invalid like `red` → should be rejected by the API with a 400

---

## IMPORTANT NOTES

- **Do not implement Stripe** in this session — payment integration will be done separately
- The `ADMIN_PASSWORD` env var should be rotated to something strong (20+ char random string) before any real deployment. The in-memory session store in the new auth route will work correctly on Vercel (each function instance maintains its own store, and the 7-day cookie handles reconnection seamlessly for a single-admin setup)
- After implementing Section 1.3, the first admin login after deploy will create a new random token — the old password-as-cookie sessions will no longer be valid, which is the desired behavior
- The `unstable_cache` in Section 2.2 requires Next.js 14+ which this project already uses
