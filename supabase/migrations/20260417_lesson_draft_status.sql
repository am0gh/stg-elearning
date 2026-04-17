-- Add draft/publish status to lessons
-- is_published defaults to TRUE so all existing lessons remain visible.
-- New lessons created via the admin panel will default to FALSE (draft)
-- until explicitly published.

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;

-- Existing lessons are live, so mark them all published.
-- New lessons inserted after this migration will default to FALSE
-- (the application layer sends is_published = false on create).
-- We update the default after backfilling so existing rows stay published.
UPDATE public.lessons SET is_published = TRUE WHERE is_published IS DISTINCT FROM TRUE;

-- Change the column default to FALSE for new rows going forward.
ALTER TABLE public.lessons ALTER COLUMN is_published SET DEFAULT FALSE;

-- Index for the common query pattern: published lessons for a course
CREATE INDEX IF NOT EXISTS idx_lessons_course_published
  ON public.lessons (course_id, is_published, order_index);
