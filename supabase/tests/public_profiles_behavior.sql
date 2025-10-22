-- Behavior test: anon should only see rows where is_public=true
-- This test avoids seeding due to FK on user_profiles.id -> auth.users(id).

-- Run visibility checks conditionally based on existing data
do $$
declare
  total_public bigint;
  total_private bigint;
  anon_public bigint;
  anon_private bigint;
begin
  -- Tally as superuser (bypass RLS)
  select count(*) into total_public  from public.user_profiles where is_public = true;
  select count(*) into total_private from public.user_profiles where is_public = false;

  -- Query as anon role (RLS enforced)
  perform set_config('role', 'anon', true);

  select count(*) into anon_public  from public.user_profiles where is_public = true;
  select count(*) into anon_private from public.user_profiles where is_public = false;

  -- Expect anon can see all public rows
  if total_public <> anon_public then
    raise exception 'public_profiles_behavior: anon public count % != total public %', anon_public, total_public;
  end if;

  -- Expect anon cannot see any private rows (if any exist)
  if total_private > 0 and anon_private <> 0 then
    raise exception 'public_profiles_behavior: anon can see % private rows', anon_private;
  end if;
end$$;

