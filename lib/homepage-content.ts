import { createAdminClient } from "@/lib/supabase/admin"
import { unstable_cache } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HomepageContent {
  // Navigation
  nav_logo:              string
  nav_cta:               string
  logo_url:              string   // uploaded image logo (empty = use text)

  // Hero
  hero_headline:         string   // e.g. "LEARN SALSA"
  hero_headline_accent:  string   // e.g. "AT HOME" (rendered in brand gold)
  hero_subtext:          string
  hero_cta_primary:      string   // e.g. "Buy Course"
  hero_cta_secondary:    string   // e.g. "Watch Free Lesson"

  // Stats (4 tiles below the hero)
  stat_1_value: string; stat_1_label: string
  stat_2_value: string; stat_2_label: string
  stat_3_value: string; stat_3_label: string
  stat_4_value: string; stat_4_label: string

  // Courses section
  courses_title:         string   // "CHOOSE YOUR LEVEL"

  // What's Inside section
  included_title:        string
  included_subtext:      string
  feature_1_emoji:       string   // optional — leave empty to hide
  feature_1_title:       string
  feature_1_desc:        string
  feature_2_emoji:       string
  feature_2_title:       string
  feature_2_desc:        string
  feature_3_emoji:       string
  feature_3_title:       string
  feature_3_desc:        string
  feature_4_emoji:       string
  feature_4_title:       string
  feature_4_desc:        string
  feature_5_emoji:       string
  feature_5_title:       string
  feature_5_desc:        string
  feature_6_emoji:       string
  feature_6_title:       string
  feature_6_desc:        string

  // CTA Banner
  banner_headline:       string
  banner_subtext:        string
  banner_cta:            string
}

export const DEFAULT_CONTENT: HomepageContent = {
  nav_logo:             "Start Salsa",
  nav_cta:              "Start Learning",
  logo_url:             "",

  hero_headline:        "LEARN SALSA",
  hero_headline_accent: "AT HOME",
  hero_subtext:         "Self-paced video courses you can watch at home, on your own schedule. Watch anywhere, anytime.",
  hero_cta_primary:     "Buy Course",
  hero_cta_secondary:   "Watch Free Lesson",

  stat_1_value: "500+",          stat_1_label: "Students Enrolled",
  stat_2_value: "Self-paced",    stat_2_label: "Watch on your own time",
  stat_3_value: "HD Video",      stat_3_label: "Crystal-clear lessons",
  stat_4_value: "Instant Access",stat_4_label: "Start right away",

  courses_title:        "CHOOSE YOUR LEVEL",

  included_title:       "WHAT'S INSIDE THE COURSE?",
  included_subtext:     "Everything you need to go from zero to dancing — delivered straight to your screen.",
  feature_1_emoji:      "",
  feature_1_title:      "HD Video Lessons",
  feature_1_desc:       "Professionally recorded lessons — clear, close-up, and easy to follow at any speed.",
  feature_2_emoji:      "",
  feature_2_title:      "Musicality Training",
  feature_2_desc:       "Learn to feel and interpret the music, not just count beats. Salsa starts with the song.",
  feature_3_emoji:      "",
  feature_3_title:      "Technique & Styling",
  feature_3_desc:       "Body movement, posture, leading and following broken down step by step so nothing is left to guesswork.",
  feature_4_emoji:      "",
  feature_4_title:      "Salsa History & Culture",
  feature_4_desc:       "Understand the roots of what you're dancing — because context makes every move more meaningful.",
  feature_5_emoji:      "",
  feature_5_title:      "Study Guides",
  feature_5_desc:       "Downloadable PDFs to support each module so you can review key points offline.",
  feature_6_emoji:      "",
  feature_6_title:      "Online Community",
  feature_6_desc:       "Connect with fellow students inside the course platform — share progress, ask questions, stay motivated.",

  banner_headline:      "Ready to Start Dancing?",
  banner_subtext:       "Get instant access to Level 1 and start your first lesson today.",
  banner_cta:           "Buy Course — €89",
}

// ─── Fetch from Supabase (cached) ─────────────────────────────────────────────

export const getHomepageContent = unstable_cache(
  async (): Promise<HomepageContent> => {
    try {
      const supabase = createAdminClient()
      // Reuse the existing site_settings table — keys don't overlap with design settings
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")

      if (error || !data) return DEFAULT_CONTENT

      const map = Object.fromEntries(
        data.map((r: { key: string; value: string }) => [r.key, r.value])
      )

      // Merge with defaults so missing keys always fall back gracefully
      return { ...DEFAULT_CONTENT, ...map } as HomepageContent
    } catch {
      return DEFAULT_CONTENT
    }
  },
  ['homepage-content'],
  { revalidate: 60, tags: ['homepage-content'] }
)
