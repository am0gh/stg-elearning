import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://salsategusta.nl"

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep student portals, admin, and auth pages out of search engines
        disallow: [
          "/admin/",
          "/dashboard/",
          "/profile/",
          "/auth/",
          "/courses/*/learn",
          "/certificate/",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
