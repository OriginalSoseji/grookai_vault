begin;

create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  email text null,
  tier text not null default 'free',
  role text not null default 'collector',
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  source text not null default 'manual',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_entitlements_user_or_email_chk check (user_id is not null or nullif(btrim(email), '') is not null),
  constraint user_entitlements_tier_chk check (tier in ('free', 'premium', 'vendor', 'founder_admin')),
  constraint user_entitlements_role_chk check (role in ('collector', 'subscriber', 'vendor', 'founder', 'internal')),
  constraint user_entitlements_features_object_chk check (jsonb_typeof(features) = 'object')
);

create unique index if not exists user_entitlements_active_user_id_uidx
on public.user_entitlements (user_id)
where user_id is not null and is_active;

create unique index if not exists user_entitlements_active_email_uidx
on public.user_entitlements (lower(email))
where email is not null and is_active;

create index if not exists user_entitlements_tier_active_idx
on public.user_entitlements (tier, is_active);

create or replace function public.set_user_entitlements_updated_at_v1()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.email := nullif(lower(btrim(new.email)), '');
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_user_entitlements_updated_at_v1 on public.user_entitlements;
create trigger set_user_entitlements_updated_at_v1
before insert or update on public.user_entitlements
for each row
execute function public.set_user_entitlements_updated_at_v1();

alter table public.user_entitlements enable row level security;

revoke all on table public.user_entitlements from public, anon, authenticated;
grant select on table public.user_entitlements to authenticated;
grant all on table public.user_entitlements to service_role;

drop policy if exists user_entitlements_read_own on public.user_entitlements;
create policy user_entitlements_read_own
on public.user_entitlements
for select
to authenticated
using (
  is_active
  and (
    user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists user_entitlements_service_role_all on public.user_entitlements;
create policy user_entitlements_service_role_all
on public.user_entitlements
for all
to service_role
using (true)
with check (true);

insert into public.user_entitlements (
  email,
  tier,
  role,
  features,
  source,
  notes
)
select
  'ccabrl@gmail.com',
  'founder_admin',
  'founder',
  jsonb_build_object(
    'assistant', true,
    'vendor_tools', true,
    'founder_tools', true,
    'grookai_intelligence', true,
    'internal_debug', true,
    'catalog_audits', true
  ),
  'bootstrap_migration',
  'Founder admin bootstrap entitlement. Manage future access from public.user_entitlements.'
where not exists (
  select 1
  from public.user_entitlements
  where is_active
    and lower(email) = 'ccabrl@gmail.com'
);

commit;
