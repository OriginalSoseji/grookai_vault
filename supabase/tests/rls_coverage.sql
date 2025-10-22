-- RLS Coverage Audit for key tables
-- Fails with exception if any expected RLS or policy is missing

-- Helper: assert boolean with message
do $$
begin
  perform 1; -- placeholder to allow file to run in one DO $$ block if desired
end$$;

-- Check RLS enabled flags
do $$
declare v_enabled boolean; begin
  select c.relrowsecurity into v_enabled
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='vault_items';
  if coalesce(v_enabled,false) = false then
    raise exception 'RLS not enabled on public.vault_items';
  end if;

  select c.relrowsecurity into v_enabled
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='price_observations';
  if coalesce(v_enabled,false) = false then
    raise exception 'RLS not enabled on public.price_observations';
  end if;

  select c.relrowsecurity into v_enabled
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='user_profiles';
  if coalesce(v_enabled,false) = false then
    raise exception 'RLS not enabled on public.user_profiles';
  end if;
end$$;

-- Check vault_items has owner policies for all CRUD
do $$
declare v_count int; begin
  select count(*) into v_count from pg_policies p
  where p.schemaname='public' and p.tablename='vault_items' and p.policyname='owner read' and p.polcmd='select';
  if v_count = 0 then raise exception 'Missing policy: vault_items owner read (select)'; end if;

  select count(*) into v_count from pg_policies p
  where p.schemaname='public' and p.tablename='vault_items' and p.policyname='owner insert' and p.polcmd='insert';
  if v_count = 0 then raise exception 'Missing policy: vault_items owner insert (insert)'; end if;

  select count(*) into v_count from pg_policies p
  where p.schemaname='public' and p.tablename='vault_items' and p.policyname='owner update' and p.polcmd='update';
  if v_count = 0 then raise exception 'Missing policy: vault_items owner update (update)'; end if;

  select count(*) into v_count from pg_policies p
  where p.schemaname='public' and p.tablename='vault_items' and p.policyname='owner delete' and p.polcmd='delete';
  if v_count = 0 then raise exception 'Missing policy: vault_items owner delete (delete)'; end if;
end$$;

-- Check price_observations read-any and service-only write
do $$
declare v_count int; begin
  select count(*) into v_count from pg_policies p
  where p.schemaname='public' and p.tablename='price_observations' and p.policyname='price_obs_read_any' and p.polcmd='select';
  if v_count = 0 then raise exception 'Missing policy: price_observations price_obs_read_any (select)'; end if;

  select count(*) into v_count from pg_policies p
  where p.schemaname='public' and p.tablename='price_observations' and p.policyname='price_obs_write_service_only' and p.polcmd='all';
  if v_count = 0 then raise exception 'Missing policy: price_observations price_obs_write_service_only (all)'; end if;
end$$;

-- Check user_profiles self policies and service manage
do $$
declare v_count int; begin
  select count(*) into v_count from pg_policies p
  where p.schemaname='public' and p.tablename='user_profiles' and p.policyname='profiles_self_select' and p.polcmd='select';
  if v_count = 0 then raise exception 'Missing policy: user_profiles profiles_self_select (select)'; end if;

  select count(*) into v_count from pg_policies p
  where p.schemaname='public' and p.tablename='user_profiles' and p.policyname='profiles_self_insert' and p.polcmd='insert';
  if v_count = 0 then raise exception 'Missing policy: user_profiles profiles_self_insert (insert)'; end if;

  select count(*) into v_count from pg_policies p
  where p.schemaname='public' and p.tablename='user_profiles' and p.policyname='profiles_self_update' and p.polcmd='update';
  if v_count = 0 then raise exception 'Missing policy: user_profiles profiles_self_update (update)'; end if;

  select count(*) into v_count from pg_policies p
  where p.schemaname='public' and p.tablename='user_profiles' and p.policyname='profiles_service_manage' and p.polcmd='all';
  if v_count = 0 then raise exception 'Missing policy: user_profiles profiles_service_manage (all)'; end if;
end$$;

-- Check user_profiles public read policy for anon/authenticated
do $$
declare v_count int; begin
  select count(*) into v_count from pg_policies p
  where p.schemaname='public' and p.tablename='user_profiles' and p.policyname='profiles_public_read' and p.polcmd='select';
  if v_count = 0 then raise exception 'Missing policy: user_profiles profiles_public_read (select)'; end if;
end$$;

-- Optional: human-readable summary
select
  p.schemaname as schema,
  p.tablename  as table,
  p.policyname as policy,
  p.polcmd     as command
from pg_policies p
where (p.schemaname='public' and p.tablename in ('vault_items','price_observations','user_profiles'))
order by 1,2,4,3;
