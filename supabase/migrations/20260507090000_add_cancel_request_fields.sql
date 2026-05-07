alter table public.reservations
  add column if not exists cancel_requested_at timestamptz,
  add column if not exists cancel_request_reason text;

create or replace function public.fetch_reservations_by_customer_email(
  input_email text,
  input_code text
)
returns table (
  id uuid,
  shop_id text,
  shop_name text,
  customer_name text,
  customer_phone text,
  customer_email text,
  reservation_datetime timestamptz,
  party_size integer,
  status text,
  note text,
  cancel_reason text,
  admin_memo text,
  cancel_requested_at timestamptz,
  cancel_request_reason text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    r.shop_id,
    r.shop_name,
    r.customer_name,
    r.customer_phone,
    r.customer_email,
    r.reservation_datetime,
    r.party_size,
    r.status,
    r.note,
    r.cancel_reason,
    r.admin_memo,
    r.cancel_requested_at,
    r.cancel_request_reason,
    r.created_at,
    r.updated_at
  from public.reservations r
  where lower(r.customer_email) = lower(input_email)
    and exists (
      select 1
      from public.reservation_verification_codes v
      where lower(v.email) = lower(input_email)
        and v.code = input_code
        and v.used_at is not null
        and v.used_at >= now() - interval '10 minutes'
    )
  order by r.reservation_datetime asc;
$$;

grant execute on function public.fetch_reservations_by_customer_email(text, text) to anon, authenticated;
