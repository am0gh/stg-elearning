/**
 * Zod validation schemas for all admin API routes.
 *
 * Centralising schemas here means:
 *  - One place to audit what data the API accepts
 *  - Types are derived from the schemas (single source of truth)
 *  - Consistent validation error messages across every endpoint
 */

import { z } from "zod"
import { NextResponse } from "next/server"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex colour (e.g. #C9A227)")

const httpUrl = z
  .string()
  .url("Must be a valid URL")
  .refine(u => u.startsWith("https://") || u.startsWith("http://"), "Must start with http(s)://")

// ─── Course schemas ───────────────────────────────────────────────────────────

export const CourseCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be under 200 characters").trim(),
  description: z.string().max(5000, "Description must be under 5 000 characters").trim().optional().nullable(),
  price_eur: z.number({ invalid_type_error: "Price must be a number" }).min(0, "Price cannot be negative").max(10_000, "Price seems unreasonably high"),
  level: z.enum(["beginner", "intermediate", "advanced"], {
    errorMap: () => ({ message: "Level must be beginner, intermediate, or advanced" }),
  }).optional().nullable(),
  thumbnail_url: httpUrl.optional().nullable(),
  instructor_name: z.string().max(100).trim().optional().nullable(),
  published: z.boolean().optional(),
  slug: z.string().max(100).regex(/^[a-z0-9-]*$/, "Slug may only contain lowercase letters, numbers, and hyphens").optional().nullable(),
})

export const CourseUpdateSchema = CourseCreateSchema.partial()

export type CourseCreate = z.infer<typeof CourseCreateSchema>
export type CourseUpdate = z.infer<typeof CourseUpdateSchema>

// ─── Lesson schemas ───────────────────────────────────────────────────────────

export const LessonCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be under 200 characters").trim(),
  description: z.string().max(2000).trim().optional().nullable(),
  // Mux playback IDs are alphanumeric + hyphens/underscores
  video_url: z.string().max(200).regex(/^[a-zA-Z0-9_-]+$/, "Invalid video ID").optional().nullable(),
  order_index: z.number().int("Order must be a whole number").positive("Order must be positive").optional(),
  // The form sends `is_free` — keep the field name consistent with the DB column
  is_free: z.boolean().optional(),
  // Draft/publish status — new lessons default to draft (false) until explicitly published
  is_published: z.boolean().optional(),
  duration_minutes: z.number().int().min(0).max(1440, "Duration cannot exceed 24 hours").optional().nullable(),
  content_intro: z.string().max(10_000).trim().optional().nullable(),
  content_notes: z.string().max(10_000).trim().optional().nullable(),
  content_tips: z.array(z.string().max(500)).max(20).optional().nullable(),
  content_checklist: z.array(z.string().max(500)).max(20).optional().nullable(),
})

export const LessonUpdateSchema = LessonCreateSchema.partial()

export type LessonCreate = z.infer<typeof LessonCreateSchema>
export type LessonUpdate = z.infer<typeof LessonUpdateSchema>

// ─── Discount schemas ─────────────────────────────────────────────────────────

export const DiscountCreateSchema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code must be under 50 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Code may only contain letters, numbers, hyphens, and underscores")
    .transform(v => v.trim().toLowerCase()),
  description: z.string().max(200).trim().optional().nullable(),
  discount_percent: z.number().min(0).max(100, "Percentage must be 0–100").optional().nullable(),
  discount_amount_eur: z.number().positive("Amount must be positive").max(10_000).optional().nullable(),
  max_uses: z.number().int().positive("Max uses must be a positive integer").optional().nullable(),
  max_uses_per_user: z.number().int().positive("Max uses per user must be a positive integer").optional().nullable(),
  starts_at: z.string().datetime({ offset: true }).optional().nullable(),
  expires_at: z.string().datetime({ offset: true }).optional().nullable(),
}).refine(
  d => !(d.discount_percent != null && d.discount_amount_eur != null),
  { message: "Set either a percentage or a euro amount — not both", path: ["discount_percent"] }
).refine(
  d => d.discount_percent != null || d.discount_amount_eur != null,
  { message: "Either a discount percentage or a euro amount is required", path: ["discount_percent"] }
).refine(
  d => !(d.starts_at && d.expires_at && new Date(d.starts_at) >= new Date(d.expires_at)),
  { message: "Start date must be before end date", path: ["starts_at"] }
)

export const DiscountPatchSchema = z.object({
  is_active: z.boolean({ required_error: "is_active must be a boolean" }),
}).strict() // reject any extra fields — PATCH on discounts should only toggle active status

export type DiscountCreate = z.infer<typeof DiscountCreateSchema>
export type DiscountPatch = z.infer<typeof DiscountPatchSchema>

// ─── Integrations schema ──────────────────────────────────────────────────────

export const IntegrationsUpdateSchema = z.object({
  n8n_webhook_url: httpUrl.optional().nullable(),
  // room to add more integration fields later
}).strict()

export type IntegrationsUpdate = z.infer<typeof IntegrationsUpdateSchema>

// ─── Parse helper ─────────────────────────────────────────────────────────────

/**
 * Parse and validate a JSON request body against a Zod schema.
 *
 * Returns `{ data }` on success or `{ response }` (a 422 NextResponse) on
 * failure.  The caller should return `response` immediately on failure.
 *
 * @example
 * const parsed = await parseBody(req, CourseCreateSchema)
 * if ("response" in parsed) return parsed.response
 * const data = parsed.data  // fully typed, validated
 */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<{ data: T } | { response: NextResponse }> {
  let raw: unknown

  try {
    raw = await (req as Request).json()
  } catch {
    return {
      response: NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 }
      ),
    }
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues.map(i => ({
      field: i.path.join(".") || "body",
      message: i.message,
    }))
    return {
      response: NextResponse.json(
        { error: "Validation failed", issues },
        { status: 422 }
      ),
    }
  }

  return { data: result.data }
}
