import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth/admin"

export async function POST(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tokenId = process.env.MUX_TOKEN_ID
  const tokenSecret = process.env.MUX_TOKEN_SECRET

  if (!tokenId || !tokenSecret) {
    return NextResponse.json({ error: "MUX_TOKEN_ID / MUX_TOKEN_SECRET not configured" }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const credentials = Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64")

  // Create a Mux Direct Upload — Mux gives us a signed upload URL
  // the browser PUT's the video file directly to that URL (never passes through our server)
  const res = await fetch("https://api.mux.com/video/v1/uploads", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cors_origin: appUrl,
      new_asset_settings: {
        playback_policy: ["public"],
        // mp4_support: "standard", // uncomment if you want downloadable mp4s
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error("Mux create upload failed:", err)
    return NextResponse.json({ error: "Failed to create Mux upload URL" }, { status: res.status })
  }

  const json = await res.json()
  const upload = json.data

  // Return the upload URL (browser will PUT file here) and the upload ID (for polling)
  return NextResponse.json({
    uploadId: upload.id,
    uploadUrl: upload.url,
  })
}
