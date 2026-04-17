-- Add per-user usage cap to discount_codes
-- null = no per-user limit (default behaviour)
ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS max_uses_per_user INTEGER DEFAULT NULL;
