alter table public.reservations
add column if not exists cancel_completion_email_sent_at timestamptz;
