/**
 * PUT /api/profile
 * ─────────────────
 * Updates the logged-in student's display name and/or avatar.
 * Accepts multipart/form-data so the avatar file can be uploaded directly.
 *
 * Fields:
 *   name    string   — new display name
 *   avatar  File?    — new avatar image (jpeg/png/webp, max 2 MB)
 *
 * Returns: { ok: true, avatar_url?: string }
 *
 * Storage: avatars go to the Supabase `avatars` bucket at
 *          avatars/{userId}/avatar.{ext}
 *          Make sure the bucket exists and has a public policy.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES    = ["image/jpeg", "image/png", "image/webp"]

export async function PUT(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // ── Parse multipart form ─────────────────────────────────────────────────────
  const formData = await req.formData()
  const name     = (formData.get("name") as string | null)?.trim()
  const avatar   = formData.get("avatar") as File | null

  if (!name && !avatar) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const admin = createAdminClient()
  let avatarUrl: string | undefined

  // ── Avatar upload ─────────────────────────────────────────────────────────────
  if (avatar && avatar.size > 0) {
    if (!ALLOWED_TYPES.includes(avatar.type)) {
      return NextResponse.json(
        { error: "Avatar must be a JPEG, PNG, or WebP image" },
        { status: 400 }
      )
    }
    if (avatar.size > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        { error: "Avatar must be under 2 MB" },
        { status: 400 }
      )
    }

    const ext      = avatar.type.split("/")[1].replace("jpeg", "jpg")
    const path     = `${user.id}/avatar.${ext}`
    const buffer   = Buffer.from(await avatar.arrayBuffer())

    const { error: uploadError } = await admin.storage
      .from("avatars")
      .upload(path, buffer, {
        contentType:  avatar.type,
        upsert:       true,           // overwrite if already exists
        cacheControl: "3600",
      })

    if (uploadError) {
      console.error("[profile] Avatar upload failed:", uploadError)
      return NextResponse.json(
        { error: "Failed to upload avatar" },
        { status: 500 }
      )
    }

    const { data: publicData } = admin.storage.from("avatars").getPublicUrl(path)
    // Append a cache-buster so the browser fetches the new image
    avatarUrl = `${publicData.publicUrl}?t=${Date.now()}`
  }

  // ── Update profiles table ─────────────────────────────────────────────────────
  const updates: Record<string, string> = { updated_at: new Date().toISOString() }
  if (name)      updates.full_name  = name
  if (avatarUrl) updates.avatar_url = avatarUrl

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: user.id, ...updates }, { onConflict: "id" })

  if (profileError) {
    console.error("[profile] Profile update failed:", profileError)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // ── Also update user metadata so it's consistent ──────────────────────────────
  if (name) {
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { full_name: name },
    })
  }

  return NextResponse.json({ ok: true, avatar_url: avatarUrl })
}
