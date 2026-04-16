import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { getSiteSettings, buildSettingsCSS, getRequiredFontLinks } from '@/lib/site-settings'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Start Salsa — Online Salsa Courses',
  description: 'Self-paced video courses. Learn salsa at home, watch anywhere, anytime.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Fetch design settings server-side (falls back to defaults if DB unavailable)
  const settings    = await getSiteSettings()
  const settingsCSS = buildSettingsCSS(settings)
  const fontLinks   = getRequiredFontLinks(settings)

  return (
    <html lang="nl" className="bg-background">
      <body className="font-sans antialiased">
        {/* Google Font stylesheets — React 19 hoists <link rel="stylesheet"> to <head> */}
        {fontLinks.map(href => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        {/* CSS variable overrides from design settings */}
        {settingsCSS && (
          <style dangerouslySetInnerHTML={{ __html: settingsCSS }} />
        )}
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
