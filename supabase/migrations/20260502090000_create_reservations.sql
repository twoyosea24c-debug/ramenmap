create extension if not exists "pgcrypto";

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  shop_id text not null,
  shop_name text not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  reservation_datetime timestamptz not null,
  party_size integer not null check (party_size > 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'canceled', 'visited')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reservations_shop_id_idx on public.reservations (shop_id);
create index if not exists reservations_datetime_idx on public.reservations (reservation_datetime);
create index if not exists reservations_status_idx on public.reservations (status);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists reservations_set_updated_at on public.reservations;
create trigger reservations_set_updated_at
before update on public.reservations
for each row execute function public.set_updated_at();
