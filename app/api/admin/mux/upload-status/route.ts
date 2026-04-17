import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth/admin"

// GET /api/admin/mux/upload-status?uploadId=xxx
// Polls a Mux direct upload, then its resulting asset.
// Returns: { status: "waiting"|"processing"|"ready"|"errored", playback_id?, duration? }
export async function GET(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const uploadId = searchParams.get("uploadId")

  if (!uploadId) {
    return NextResponse.json({ error: "uploadId is required" }, { status: 400 })
  }

  const tokenId = process.env.MUX_TOKEN_ID
  const tokenSecret = process.env.MUX_TOKEN_SECRET

  if (!tokenId || !tokenSecret) {
    return NextResponse.json({ error: "MUX credentials not configured" }, { status: 500 })
  }

  const credentials = Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64")
  const headers = { Authorization: `Basic ${credentials}` }

  // Step 1: check the upload
  const uploadRes = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, { headers })
  if (!uploadRes.ok) {
    return NextResponse.json({ error: "Failed to fetch upload status" }, { status: uploadRes.status })
  }

  const uploadJson = await uploadRes.json()
  const upload = uploadJson.data

  // upload.status: "waiting" | "asset_created" | "cancelled" | "timed_out" | "errored"
  if (upload.status === "waiting") {
    return NextResponse.json({ status: "uploading" })
  }

  if (upload.status === "errored" || upload.status === "cancelled" || upload.status === "timed_out") {
    return NextResponse.json({ status: "errored" })
  }

  // Step 2: upload is done — check the asset
  if (!upload.asset_id) {
    // upload.status === "asset_created" but asset_id not propagated yet — briefly processing
    return NextResponse.json({ status: "processing" })
  }

  const assetRes = await fetch(`https://api.mux.com/video/v1/assets/${upload.asset_id}`, { headers })
  if (!assetRes.ok) {
    return NextResponse.json({ error: "Failed to fetch asset" }, { status: assetRes.status })
  }

  const assetJson = await assetRes.json()
  const asset = assetJson.data

  // asset.status: "preparing" | "ready" | "errored"
  if (asset.status !== "ready") {
    return NextResponse.json({ status: "processing" })
  }

  const playback_id = asset.playback_ids?.find((p: any) => p.policy === "public")?.id ?? null

  return NextResponse.json({
    status: "ready",
    playback_id,
    duration: asset.duration ?? null,
    asset_id: asset.id,
  })
}
