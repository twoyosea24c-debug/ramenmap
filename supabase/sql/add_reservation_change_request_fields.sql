alter table public.reservations
add column if not exists change_requested_at timestamptz,
add column if not exists change_request_datetime timestamptz,
add column if not exists change_request_party_size integer,
add column if not exists change_request_note text;
