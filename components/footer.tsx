"use client"

import Link from "next/link"

const GOLD = "#C9A227"

// Simple SVG social icons — no external icon lib dependency
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

export function Footer() {
  return (
    <footer style={{ background: "#0a0a0a", borderTop: "1px solid rgba(201,162,39,0.15)" }}>
      <div className="container mx-auto max-w-7xl px-4 pt-16 pb-8">
        {/* Top: logo + 3 columns */}
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/">
              <span className="text-xl font-bold" style={{ color: GOLD }}>
                Salsa te Gusta
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
              Online salsa courses. Learn anywhere.
            </p>
            {/* Social icons */}
            <div className="mt-5 flex gap-4">
              {[
                { href: "https://instagram.com", icon: <InstagramIcon />, label: "Instagram" },
                { href: "https://facebook.com", icon: <FacebookIcon />, label: "Facebook" },
                { href: "https://linkedin.com", icon: <LinkedInIcon />, label: "LinkedIn" },
              ].map(({ href, icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="transition-colors"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = GOLD }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)" }}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Learn */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>
              Learn
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: "/courses/level-1", label: "Level 1 — Beginners" },
                { href: "/courses/level-2", label: "Level 2 — Intermediate" },
                { href: "/courses/level-1#free-lesson", label: "Watch a Free Lesson" },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm transition-colors"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = GOLD }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)" }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>
              Support
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: "/#faq", label: "FAQ" },
                { href: "mailto:contact@salsategusta.nl", label: "Contact" },
                { href: "/privacy", label: "Privacy Policy" },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm transition-colors"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = GOLD }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)" }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>
              Contact
            </h4>
            <ul className="space-y-2.5 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              <li>
                <a
                  href="mailto:contact@salsategusta.nl"
                  className="transition-colors"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = GOLD }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)" }}
                >
                  contact@salsategusta.nl
                </a>
              </li>
              <li>+31 (0)6 288 106 06</li>
              <li>
                <a
                  href="https://wa.me/31628810606"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = GOLD }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)" }}
                >
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 pt-6 text-center text-sm"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)" }}
        >
          © 2026 Salsa te Gusta Online Academy
        </div>
      </div>
    </footer>
  )
}
