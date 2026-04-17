-- Add refund tracking to enrollments
-- refunded_at: timestamp when the refund was processed — NULL means active.
-- Keeping the row (rather than deleting) preserves the audit trail and
-- lets us show refund history in the admin panel.

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ DEFAULT NULL;

-- Index: admin pages frequently filter/sort by refund status
CREATE INDEX IF NOT EXISTS idx_enrollments_refunded
  ON public.enrollments (refunded_at)
  WHERE refunded_at IS NOT NULL;
