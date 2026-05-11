alter table public.reservations
add column if not exists change_applied_at timestamptz,
add column if not exists change_before_datetime timestamptz,
add column if not exists change_before_party_size integer,
add column if not exists change_after_datetime timestamptz,
add column if not exists change_after_party_size integer,
add column if not exists change_applied_note text;
