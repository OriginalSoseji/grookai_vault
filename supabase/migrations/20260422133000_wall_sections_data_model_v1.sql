begin;

-- WALL_SECTIONS_DATA_MODEL_V1
-- Wall is derived, not stored. Custom Sections are durable user-owned entities.

create table if not exists public.wall_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  is_active boolean not null default true,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wall_sections_name_nonempty check (btrim(name) <> ''),
  constraint wall_sections_name_length check (char_length(btrim(name)) <= 80),
  constraint wall_sections_position_nonnegative check (position >= 0)
);

comment on table public.wall_sections is
'Durable custom Wall section entities. Contract capacity and entitlement limits are enforced in service logic; Wall itself remains derived.';

comment on column public.wall_sections.is_active is
'Controls active section usage. Entitlement limits apply to active sections, not stored section rows.';

comment on column public.wall_sections.is_public is
'Controls whether the section can appear on public collector surfaces and section share routes.';

create index if not exists idx_wall_sections_user
  on public.wall_sections (user_id);

create index if not exists idx_wall_sections_user_active_position
  on public.wall_sections (user_id, is_active, position);

create index if not exists idx_wall_sections_public_active_position
  on public.wall_sections (user_id, position)
  where is_active = true and is_public = true;

drop trigger if exists trg_wall_sections_updated_at on public.wall_sections;

create trigger trg_wall_sections_updated_at
before update on public.wall_sections
for each row
execute function public.set_timestamp_updated_at();

create table if not exists public.wall_section_memberships (
  section_id uuid not null references public.wall_sections(id) on delete cascade,
  vault_item_instance_id uuid not null references public.vault_item_instances(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (section_id, vault_item_instance_id)
);

comment on table public.wall_section_memberships is
'Instance-level many-to-many membership between custom Wall sections and vault_item_instances.';

comment on column public.wall_section_memberships.vault_item_instance_id is
'Membership is per exact owned copy (GVVI), never grouped by card_print or legacy vault_items.';

create index if not exists idx_wsm_section
  on public.wall_section_memberships (section_id);

create index if not exists idx_wsm_instance
  on public.wall_section_memberships (vault_item_instance_id);

create index if not exists idx_wsm_instance_section
  on public.wall_section_memberships (vault_item_instance_id, section_id);

create or replace function public.enforce_wall_section_membership_owner_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.wall_sections ws
    join public.vault_item_instances vii
      on vii.id = new.vault_item_instance_id
    where ws.id = new.section_id
      and ws.user_id = vii.user_id
      and vii.archived_at is null
  ) then
    raise exception 'wall_section_membership_owner_mismatch'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function public.enforce_wall_section_membership_owner_v1() is
'Prevents a section from containing another user''s vault_item_instances row or an archived instance.';

drop trigger if exists trg_wall_section_memberships_owner_guard on public.wall_section_memberships;

create trigger trg_wall_section_memberships_owner_guard
before insert or update on public.wall_section_memberships
for each row
execute function public.enforce_wall_section_membership_owner_v1();

alter table public.wall_sections enable row level security;
alter table public.wall_section_memberships enable row level security;

revoke all on table public.wall_sections from anon;
revoke all on table public.wall_sections from authenticated;
grant select on table public.wall_sections to anon, authenticated;
grant insert, update, delete on table public.wall_sections to authenticated;
grant all on table public.wall_sections to service_role;

revoke all on table public.wall_section_memberships from anon;
revoke all on table public.wall_section_memberships from authenticated;
grant select on table public.wall_section_memberships to anon, authenticated;
grant insert, update, delete on table public.wall_section_memberships to authenticated;
grant all on table public.wall_section_memberships to service_role;

drop policy if exists wall_sections_owner_select_v1 on public.wall_sections;
drop policy if exists wall_sections_owner_insert_v1 on public.wall_sections;
drop policy if exists wall_sections_owner_update_v1 on public.wall_sections;
drop policy if exists wall_sections_owner_delete_v1 on public.wall_sections;
drop policy if exists wall_sections_public_select_v1 on public.wall_sections;
drop policy if exists wall_sections_service_role_all_v1 on public.wall_sections;

create policy wall_sections_owner_select_v1
on public.wall_sections
for select
to authenticated
using (
  auth.uid() is not null
  and user_id = auth.uid()
);

create policy wall_sections_owner_insert_v1
on public.wall_sections
for insert
to authenticated
with check (
  auth.uid() is not null
  and user_id = auth.uid()
);

create policy wall_sections_owner_update_v1
on public.wall_sections
for update
to authenticated
using (
  auth.uid() is not null
  and user_id = auth.uid()
)
with check (
  auth.uid() is not null
  and user_id = auth.uid()
);

create policy wall_sections_owner_delete_v1
on public.wall_sections
for delete
to authenticated
using (
  auth.uid() is not null
  and user_id = auth.uid()
);

create policy wall_sections_public_select_v1
on public.wall_sections
for select
to anon, authenticated
using (
  is_active = true
  and is_public = true
  and exists (
    select 1
    from public.public_profiles pp
    where pp.user_id = wall_sections.user_id
      and pp.public_profile_enabled = true
      and pp.vault_sharing_enabled = true
  )
);

create policy wall_sections_service_role_all_v1
on public.wall_sections
for all
to service_role
using (true)
with check (true);

drop policy if exists wall_section_memberships_owner_select_v1 on public.wall_section_memberships;
drop policy if exists wall_section_memberships_owner_insert_v1 on public.wall_section_memberships;
drop policy if exists wall_section_memberships_owner_update_v1 on public.wall_section_memberships;
drop policy if exists wall_section_memberships_owner_delete_v1 on public.wall_section_memberships;
drop policy if exists wall_section_memberships_public_select_v1 on public.wall_section_memberships;
drop policy if exists wall_section_memberships_service_role_all_v1 on public.wall_section_memberships;

create policy wall_section_memberships_owner_select_v1
on public.wall_section_memberships
for select
to authenticated
using (
  exists (
    select 1
    from public.wall_sections ws
    where ws.id = wall_section_memberships.section_id
      and ws.user_id = auth.uid()
  )
);

create policy wall_section_memberships_owner_insert_v1
on public.wall_section_memberships
for insert
to authenticated
with check (
  exists (
    select 1
    from public.wall_sections ws
    join public.vault_item_instances vii
      on vii.id = wall_section_memberships.vault_item_instance_id
    where ws.id = wall_section_memberships.section_id
      and ws.user_id = auth.uid()
      and vii.user_id = auth.uid()
      and vii.archived_at is null
  )
);

create policy wall_section_memberships_owner_update_v1
on public.wall_section_memberships
for update
to authenticated
using (
  exists (
    select 1
    from public.wall_sections ws
    where ws.id = wall_section_memberships.section_id
      and ws.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.wall_sections ws
    join public.vault_item_instances vii
      on vii.id = wall_section_memberships.vault_item_instance_id
    where ws.id = wall_section_memberships.section_id
      and ws.user_id = auth.uid()
      and vii.user_id = auth.uid()
      and vii.archived_at is null
  )
);

create policy wall_section_memberships_owner_delete_v1
on public.wall_section_memberships
for delete
to authenticated
using (
  exists (
    select 1
    from public.wall_sections ws
    where ws.id = wall_section_memberships.section_id
      and ws.user_id = auth.uid()
  )
);

create policy wall_section_memberships_public_select_v1
on public.wall_section_memberships
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.wall_sections ws
    join public.public_profiles pp
      on pp.user_id = ws.user_id
    join public.vault_item_instances vii
      on vii.id = wall_section_memberships.vault_item_instance_id
     and vii.user_id = ws.user_id
    where ws.id = wall_section_memberships.section_id
      and ws.is_active = true
      and ws.is_public = true
      and pp.public_profile_enabled = true
      and pp.vault_sharing_enabled = true
      and vii.archived_at is null
  )
);

create policy wall_section_memberships_service_role_all_v1
on public.wall_section_memberships
for all
to service_role
using (true)
with check (true);

-- LOCK: The universal Wall is derived from instance intent and public profile gates.
-- LOCK: Do not create a stored Wall table.
create or replace view public.v_wall_cards_v1 as
select
  vii.id as instance_id,
  vii.gv_vi_id,
  vii.legacy_vault_item_id as vault_item_id,
  vii.user_id as owner_user_id,
  pp.slug as owner_slug,
  pp.display_name as owner_display_name,
  coalesce(vii.card_print_id, slab.card_print_id) as card_print_id,
  vii.intent,
  vii.slab_cert_id,
  vii.condition_label,
  vii.is_graded,
  vii.grade_company,
  vii.grade_value,
  vii.grade_label,
  vii.created_at,
  cp.gv_id,
  cp.name,
  cp.set_code,
  sets.name as set_name,
  cp.number,
  nullif(btrim(coalesce(vii.photo_url, vii.image_url, cp.image_url, cp.image_alt_url, cp.representative_image_url)), '') as image_url,
  cp.representative_image_url,
  cp.image_status,
  cp.image_note,
  nullif(btrim(coalesce(vii.photo_url, vii.image_url, cp.image_url, cp.image_alt_url, cp.representative_image_url)), '') as display_image_url,
  case
    when nullif(btrim(coalesce(vii.photo_url, vii.image_url, cp.image_url, cp.image_alt_url)), '') is not null then 'exact'
    when nullif(btrim(cp.representative_image_url), '') is not null then 'representative'
    else 'missing'
  end as display_image_kind,
  shared.public_note,
  shared.price_display_mode,
  shared.wall_category as legacy_wall_category
from public.vault_item_instances vii
left join public.slab_certs slab
  on slab.id = vii.slab_cert_id
join public.card_prints cp
  on cp.id = coalesce(vii.card_print_id, slab.card_print_id)
left join public.sets
  on sets.id = cp.set_id
join public.public_profiles pp
  on pp.user_id = vii.user_id
left join public.shared_cards shared
  on shared.user_id = vii.user_id
 and shared.card_id = cp.id
 and shared.is_shared = true
where vii.archived_at is null
  and vii.intent in ('trade', 'sell', 'showcase')
  and pp.public_profile_enabled = true
  and pp.vault_sharing_enabled = true;

create or replace view public.v_wall_sections_v1 as
select
  ws.id,
  ws.user_id as owner_user_id,
  pp.slug as owner_slug,
  pp.display_name as owner_display_name,
  ws.name,
  ws.position,
  ws.is_active,
  ws.is_public,
  ws.created_at,
  ws.updated_at,
  count(wsm.vault_item_instance_id) filter (
    where vii.id is not null
      and vii.archived_at is null
      and vii.user_id = ws.user_id
  )::integer as item_count
from public.wall_sections ws
join public.public_profiles pp
  on pp.user_id = ws.user_id
left join public.wall_section_memberships wsm
  on wsm.section_id = ws.id
left join public.vault_item_instances vii
  on vii.id = wsm.vault_item_instance_id
where ws.is_active = true
  and ws.is_public = true
  and pp.public_profile_enabled = true
  and pp.vault_sharing_enabled = true
group by
  ws.id,
  ws.user_id,
  pp.slug,
  pp.display_name,
  ws.name,
  ws.position,
  ws.is_active,
  ws.is_public,
  ws.created_at,
  ws.updated_at;

-- LOCK: Section card reads are public-safe and instance-level.
-- LOCK: shared_cards remains compatibility metadata only, not section authority.
create or replace view public.v_section_cards_v1 as
select
  ws.id as section_id,
  ws.name as section_name,
  ws.position as section_position,
  vii.id as instance_id,
  vii.gv_vi_id,
  vii.legacy_vault_item_id as vault_item_id,
  vii.user_id as owner_user_id,
  pp.slug as owner_slug,
  pp.display_name as owner_display_name,
  coalesce(vii.card_print_id, slab.card_print_id) as card_print_id,
  vii.intent,
  vii.slab_cert_id,
  vii.condition_label,
  vii.is_graded,
  vii.grade_company,
  vii.grade_value,
  vii.grade_label,
  wsm.created_at as section_added_at,
  vii.created_at as instance_created_at,
  cp.gv_id,
  cp.name,
  cp.set_code,
  sets.name as set_name,
  cp.number,
  nullif(btrim(coalesce(vii.photo_url, vii.image_url, cp.image_url, cp.image_alt_url, cp.representative_image_url)), '') as image_url,
  cp.representative_image_url,
  cp.image_status,
  cp.image_note,
  nullif(btrim(coalesce(vii.photo_url, vii.image_url, cp.image_url, cp.image_alt_url, cp.representative_image_url)), '') as display_image_url,
  case
    when nullif(btrim(coalesce(vii.photo_url, vii.image_url, cp.image_url, cp.image_alt_url)), '') is not null then 'exact'
    when nullif(btrim(cp.representative_image_url), '') is not null then 'representative'
    else 'missing'
  end as display_image_kind,
  shared.public_note,
  shared.price_display_mode,
  shared.wall_category as legacy_wall_category
from public.wall_sections ws
join public.public_profiles pp
  on pp.user_id = ws.user_id
join public.wall_section_memberships wsm
  on wsm.section_id = ws.id
join public.vault_item_instances vii
  on vii.id = wsm.vault_item_instance_id
 and vii.user_id = ws.user_id
 and vii.archived_at is null
left join public.slab_certs slab
  on slab.id = vii.slab_cert_id
join public.card_prints cp
  on cp.id = coalesce(vii.card_print_id, slab.card_print_id)
left join public.sets
  on sets.id = cp.set_id
left join public.shared_cards shared
  on shared.user_id = ws.user_id
 and shared.card_id = cp.id
 and shared.is_shared = true
where ws.is_active = true
  and ws.is_public = true
  and pp.public_profile_enabled = true
  and pp.vault_sharing_enabled = true;

grant select on table public.v_wall_cards_v1 to anon, authenticated;
grant select on table public.v_wall_sections_v1 to anon, authenticated;
grant select on table public.v_section_cards_v1 to anon, authenticated;

commit;
