-- Discount codes table
create table if not exists public.discount_codes (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null unique,
  description          text,
  discount_percent     integer default null check (discount_percent >= 0 and discount_percent <= 100),
  discount_amount_eur  numeric(10,2) default null,
  is_active            boolean not null default true,
  max_uses             integer default null,       -- null = unlimited
  uses_count           integer not null default 0,
  expires_at           timestamptz default null,   -- null = never expires
  created_at           timestamptz not null default now(),
  -- exactly one of percent or amount must be set
  constraint discount_codes_type_check check (
    num_nonnulls(discount_percent, discount_amount_eur) = 1
  )
);

-- Index for fast code lookups (case-insensitive)
create index if not exists discount_codes_code_lower_idx on public.discount_codes (lower(code));

-- Seed: testing phase code — 100% off, unlimited uses, never expires
insert into public.discount_codes (code, description, discount_percent, is_active)
values ('testingphase', 'Testing phase — 100% off for internal use', 100, true)
on conflict (code) do nothing;
