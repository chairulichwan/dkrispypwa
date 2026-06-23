-- Alert read state enhancement
alter table if exists public.alerts
  add column if not exists read_at timestamptz null;

create index if not exists alerts_user_read_dismiss_idx
  on public.alerts (user_id, read_at, dismissed_at, created_at desc);
