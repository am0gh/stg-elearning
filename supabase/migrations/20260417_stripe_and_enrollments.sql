-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260417_stripe_and_enrollments
-- Adds stripe_session_id to enrollments for idempotent webhook handling.
-- Adds completed_at to enrollments for course completion tracking.
-- Creates increment_discount_usage RPC for atomic counter increments.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add stripe_session_id (nullable — free enrollments won't have one)
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- Unique constraint so we can't double-enroll from duplicate webhook calls
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_stripe_session_id_key
  ON enrollments (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- 2. Add completed_at so we can stamp course completion and avoid duplicate
--    notification fires
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 3. Atomic increment for discount code usage
--    Used by the Stripe webhook to avoid race conditions
CREATE OR REPLACE FUNCTION increment_discount_usage(code_id UUID)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE discount_codes
  SET    uses_count = COALESCE(uses_count, 0) + 1
  WHERE  id = code_id;
$$;
