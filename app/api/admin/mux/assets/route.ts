import { NextResponse } from "next/server"
import { cookies } from "next/headers"

async function isAdmin() {
  const cookieStore = await cookies()
  return cookieStore.get("admin_session")?.value === process.env.ADMIN_PASSWORD
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tokenId = process.env.MUX_TOKEN_ID
  const tokenSecret = process.env.MUX_TOKEN_SECRET

  if (!tokenId || !tokenSecret) {
    return NextResponse.json({ error: "MUX_TOKEN_ID / MUX_TOKEN_SECRET not configured" }, { status: 500 })
  }

  const credentials = Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64")

  const res = await fetch("https://api.mux.com/video/v1/assets?limit=100", {
    headers: { Authorization: `Basic ${credentials}` },
    next: { revalidate: 60 }, // cache 60 seconds
  })

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch Mux assets" }, { status: res.status })
  }

  const json = await res.json()

  // Shape the response — only send what the client needs
  const assets = (json.data ?? []).map((asset: any) => ({
    id: asset.id,
    status: asset.status,
    duration: asset.duration ?? null,
    created_at: asset.created_at,
    playback_id: asset.playback_ids?.find((p: any) => p.policy === "public")?.id ?? null,
    // Mux doesn't have titles by default; use the asset ID as fallback
    title: asset.meta?.title ?? null,
    // Thumbnail: construct from playback_id if available
    thumbnail: asset.playback_ids?.[0]?.id
      ? `https://image.mux.com/${asset.playback_ids[0].id}/thumbnail.jpg?time=5`
      : null,
  }))

  return NextResponse.json(assets)
}
