-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: discount start dates + enrollment tracking of discount codes
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add starts_at to discount_codes (null = active immediately)
ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Track which discount code was used at enrollment time
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS discount_code_id UUID
    REFERENCES public.discount_codes(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS enrollments_discount_code_id_idx
  ON public.enrollments (discount_code_id)
  WHERE discount_code_id IS NOT NULL;
