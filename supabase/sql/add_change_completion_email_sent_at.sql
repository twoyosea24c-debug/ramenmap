alter table public.reservations
add column if not exists change_completion_email_sent_at timestamptz;
