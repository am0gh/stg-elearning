-- Add fixed-euro discount support to discount_codes
-- discount_percent is now nullable (either percent OR amount must be set)
-- discount_amount_eur is a fixed deduction in euros (e.g. 10.00 = €10 off)

alter table public.discount_codes
  alter column discount_percent drop not null,
  alter column discount_percent drop default;

alter table public.discount_codes
  add column if not exists discount_amount_eur numeric(10, 2) default null;

-- Ensure at least one of the two fields is always set
alter table public.discount_codes
  drop constraint if exists discount_codes_type_check;

alter table public.discount_codes
  add constraint discount_codes_type_check check (
    (discount_percent is not null) <> (discount_amount_eur is not null)
    or (discount_percent is not null and discount_amount_eur is null)
    or (discount_amount_eur is not null and discount_percent is null)
  );
