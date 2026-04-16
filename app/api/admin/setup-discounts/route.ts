/**
 * One-time setup route — creates the discount_codes table and seeds the
 * "testingphase" code if it doesn't already exist.
 *
 * Call once as an admin:  POST /api/admin/setup-discounts
 * Can be safely called multiple times (all statements are idempotent).
 */
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/auth/admin"

export async function POST() {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createAdminClient()

  // 1. Create table
  const { error: tableError } = await supabase.rpc("exec_sql" as never, {
    query: `
      create table if not exists public.discount_codes (
        id               uuid primary key default gen_random_uuid(),
        code             text not null unique,
        description      text,
        discount_percent integer not null check (discount_percent >= 0 and discount_percent <= 100),
        is_active        boolean not null default true,
        max_uses         integer default null,
        uses_count       integer not null default 0,
        expires_at       timestamptz default null,
        created_at       timestamptz not null default now()
      );
      create index if not exists discount_codes_code_lower_idx
        on public.discount_codes (lower(code));
    `,
  } as never)

  // Supabase PostgREST doesn't expose exec_sql by default — use direct insert
  // instead and rely on the table already existing (created via dashboard or CLI).
  // If exec_sql failed we still attempt the seed below.
  const tableNote = tableError
    ? `Table creation via RPC failed (${tableError.message}) — table may already exist or needs to be created manually.`
    : "Table ensured."

  // 2. Seed testingphase code
  const { error: seedError } = await supabase
    .from("discount_codes")
    .upsert(
      {
        code: "testingphase",
        description: "Testing phase — 100% off for internal use",
        discount_percent: 100,
        is_active: true,
      },
      { onConflict: "code" }
    )

  if (seedError) {
    return NextResponse.json({
      tableNote,
      error: `Seed failed: ${seedError.message}`,
      hint: "Make sure the discount_codes table exists in Supabase first. Run the SQL in supabase/migrations/20260416_discount_codes.sql from the Supabase SQL Editor.",
    }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    tableNote,
    seeded: "testingphase (100% off)",
  })
}
