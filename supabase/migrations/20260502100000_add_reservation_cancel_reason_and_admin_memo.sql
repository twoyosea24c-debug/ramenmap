alter table public.reservations
  add column if not exists cancel_reason text,
  add column if not exists admin_memo text;
