import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // Allow SVG + raster formats for logos
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: JPEG, PNG, WebP, SVG." },
      { status: 400 }
    )
  }

  // Max 2 MB for logos
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Maximum size is 2 MB." }, { status: 400 })
  }

  const ext = file.type === "image/svg+xml" ? "svg" : (file.name.split(".").pop() ?? "png")
  const filename = `logo-${Date.now()}.${ext}`
  const path = `logos/${filename}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const admin = createAdminClient()

  const { error: uploadError } = await admin.storage
    .from("course-images")
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage
    .from("course-images")
    .getPublicUrl(path)

  // Persist logo_url in site_settings so it survives deploys
  await admin
    .from("site_settings")
    .upsert({ key: "logo_url", value: publicUrl, updated_at: new Date().toISOString() }, { onConflict: "key" })

  return NextResponse.json({ url: publicUrl })
}

// DELETE — clear the logo (set logo_url back to empty string)
export async function DELETE() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }

  const admin = createAdminClient()
  await admin
    .from("site_settings")
    .upsert({ key: "logo_url", value: "", updated_at: new Date().toISOString() }, { onConflict: "key" })

  return NextResponse.json({ ok: true })
}
