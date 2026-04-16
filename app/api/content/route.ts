/**
 * Public endpoint — returns homepage content without authentication.
 * Used by the Header client component to fetch nav text on every page.
 * Content is public (it's already rendered on the homepage).
 */
import { NextResponse } from "next/server"
import { getHomepageContent } from "@/lib/homepage-content"

export async function GET() {
  const content = await getHomepageContent()
  // Only expose the fields the client actually needs
  return NextResponse.json(
    { nav_logo: content.nav_logo, nav_cta: content.nav_cta, logo_url: content.logo_url },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  )
}
