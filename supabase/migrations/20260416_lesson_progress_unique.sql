-- Deduplicate lesson_progress rows: keep the most-complete row per (user_id, lesson_id)
-- (prefer completed=true rows; among ties keep the latest updated_at / created_at)
delete from public.lesson_progress
where id in (
  select id from (
    select
      id,
      row_number() over (
        partition by user_id, lesson_id
        order by
          completed desc,          -- prefer completed=true
          updated_at desc nulls last,
          completed_at desc nulls last
      ) as rn
    from public.lesson_progress
  ) ranked
  where rn > 1
);

-- Add unique constraint so future upserts use onConflict correctly
alter table public.lesson_progress
  drop constraint if exists lesson_progress_user_lesson_unique;

alter table public.lesson_progress
  add constraint lesson_progress_user_lesson_unique
  unique (user_id, lesson_id);
