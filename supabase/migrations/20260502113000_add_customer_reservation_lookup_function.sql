create or replace function public.fetch_reservation_for_customer(
  reservation_id uuid,
  customer_email_input text
)
returns table (
  id uuid,
  shop_name text,
  customer_name text,
  reservation_datetime timestamptz,
  party_size integer,
  status text,
  note text,
  cancel_reason text
)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    r.shop_name,
    r.customer_name,
    r.reservation_datetime,
    r.party_size,
    r.status,
    r.note,
    r.cancel_reason
  from public.reservations as r
  where r.id = reservation_id
    and lower(r.customer_email) = lower(customer_email_input)
  limit 1;
$$;

grant execute on function public.fetch_reservation_for_customer(uuid, text) to anon, authenticated;
