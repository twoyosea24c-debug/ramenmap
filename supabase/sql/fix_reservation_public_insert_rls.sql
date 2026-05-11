alter table public.reservations enable row level security;

drop policy if exists "Allow public reservation insert" on public.reservations;

create policy "Allow public reservation insert"
on public.reservations
for insert
to anon, authenticated
with check (
  shop_id is not null
  and shop_name is not null
  and customer_name is not null
  and customer_phone is not null
  and customer_email is not null
  and reservation_datetime is not null
  and party_size between 1 and 20
  and status = 'pending'
);
