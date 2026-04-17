/**
 * POST /api/admin/certificate-settings/upload
 * ─────────────────────────────────────────────
 * Uploads a certificate image (logo or signature) to Supabase Storage.
 *
 * Form fields:
 *   file  File    — image (jpeg/png/webp/svg, max 2 MB)
 *   type  string  — "logo" | "signature"
 *
 * Returns: { url: string }
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"

const MAX_BYTES    = 2 * 1024 * 1024
const ALLOWED      = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }

  const formData = await req.formData()
  const file     = formData.get("file") as File | null
  const type     = formData.get("type") as string | null

  if (!file || !type) {
    return NextResponse.json({ error: "file and type are required" }, { status: 400 })
  }

  if (!["logo", "signature"].includes(type)) {
    return NextResponse.json({ error: "type must be logo or signature" }, { status: 400 })
  }

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Must be JPEG, PNG, WebP, or SVG" },
      { status: 400 }
    )
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be under 2 MB" }, { status: 400 })
  }

  const ext    = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1].replace("jpeg", "jpg")
  const path   = `certificate/${type}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const supabase = createAdminClient()
  const { error } = await supabase.storage
    .from("avatars")               // reuse existing public bucket
    .upload(path, buffer, {
      contentType:  file.type,
      upsert:       true,
      cacheControl: "3600",
    })

  if (error) {
    return NextResponse.json({ error: "Upload failed: " + error.message }, { status: 500 })
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path)
  const url = `${data.publicUrl}?t=${Date.now()}`

  return NextResponse.json({ url })
}
