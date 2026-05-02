create table if not exists public.reservation_verification_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reservation_verification_codes_code_format check (code ~ '^[0-9]{6}$')
);

create index if not exists reservation_verification_codes_email_idx
  on public.reservation_verification_codes (lower(email));
create index if not exists reservation_verification_codes_expires_at_idx
  on public.reservation_verification_codes (expires_at);

alter table public.reservation_verification_codes enable row level security;

revoke all on table public.reservation_verification_codes from anon, authenticated;

drop policy if exists "service role can manage verification codes" on public.reservation_verification_codes;
create policy "service role can manage verification codes"
  on public.reservation_verification_codes
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.verify_reservation_code(
  input_email text,
  input_code text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  matched record;
begin
  select *
  into matched
  from public.reservation_verification_codes
  where lower(email) = lower(input_email)
    and code = input_code
  order by created_at desc
  limit 1;

  if matched is null then
    return 'invalid';
  end if;

  if matched.used_at is not null then
    return 'invalid';
  end if;

  if matched.expires_at < now() then
    return 'expired';
  end if;

  update public.reservation_verification_codes
  set used_at = now()
  where id = matched.id;

  return 'verified';
end;
$$;

grant execute on function public.verify_reservation_code(text, text) to anon, authenticated;


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
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select r.*
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
