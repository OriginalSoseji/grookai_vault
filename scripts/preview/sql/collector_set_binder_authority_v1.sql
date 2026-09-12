-- Candidate fragment. Only the isolated replay builder may apply this locally.
create table if not exists public.binder_set_slot_releases_v1 (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.sets(id),
  source_reference text not null check (length(btrim(source_reference)) > 0),
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  expected_slot_count integer not null check (expected_slot_count between 1 and 25000),
  slots jsonb not null check (jsonb_typeof(slots) = 'array'),
  manifest_sha256 text not null check (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (id, set_id),
  check (jsonb_array_length(slots) = expected_slot_count)
);
create table if not exists public.binder_set_slot_pointers_v1 (
  set_id uuid primary key references public.sets(id),
  release_id uuid not null,
  foreign key (release_id, set_id) references public.binder_set_slot_releases_v1(id, set_id)
);
alter table public.binder_set_slot_releases_v1 enable row level security;
alter table public.binder_set_slot_pointers_v1 enable row level security;
revoke all on public.binder_set_slot_releases_v1, public.binder_set_slot_pointers_v1
  from public, anon, authenticated, service_role;
grant select on public.binder_set_slot_releases_v1, public.binder_set_slot_pointers_v1 to service_role;

create or replace function public.binder_set_release_guard_v1()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare n integer; positions integer; identities integer; first_position integer; last_position integer;
begin
  if tg_op <> 'INSERT' then raise exception 'immutable_set_slot_release'; end if;
  new.manifest_sha256 := encode(sha256(convert_to(new.slots::text, 'UTF8')), 'hex');
  select count(*), count(distinct s.position), count(distinct (s.card_print_id, s.card_printing_id)),
         min(s.position), max(s.position)
    into n, positions, identities, first_position, last_position
    from jsonb_to_recordset(new.slots) s("position" integer, card_print_id uuid,
      card_printing_id uuid, parent_only_authorized boolean);
  if n <> new.expected_slot_count or positions <> n or identities <> n
     or first_position <> 0 or last_position <> n - 1 then
    raise exception 'invalid_set_slot_manifest';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(new.slots) s("position" integer, card_print_id uuid,
      card_printing_id uuid, parent_only_authorized boolean)
    where s.card_print_id is null
      or (s.card_printing_id is null and s.parent_only_authorized is distinct from true)
      or (s.card_printing_id is not null and coalesce(s.parent_only_authorized, false))
  ) then raise exception 'invalid_set_slot_identity'; end if;
  if exists (
    select 1 from jsonb_to_recordset(new.slots) s(card_print_id uuid, card_printing_id uuid)
    group by s.card_print_id having count(*) > 1 and bool_or(s.card_printing_id is null)
  ) then raise exception 'overlapping_set_slots'; end if;
  return new;
end;
$$;
drop trigger if exists binder_set_release_guard_v1 on public.binder_set_slot_releases_v1;
create trigger binder_set_release_guard_v1 before insert or update or delete
on public.binder_set_slot_releases_v1 for each row execute function public.binder_set_release_guard_v1();
revoke all on function public.binder_set_release_guard_v1() from public, anon, authenticated, service_role;

create or replace function public.binder_set_slots_authority_v1(p_set_id uuid)
returns table ("position" integer, slot_id uuid, card_print_id uuid, card_printing_id uuid, required_quantity integer)
language sql stable security definer set search_path = pg_catalog, public as $$
  with release as materialized (
    select r.* from public.binder_set_slot_pointers_v1 p
    join public.binder_set_slot_releases_v1 r on r.id = p.release_id and r.set_id = p.set_id
    join public.sets s on s.id = r.set_id
    left join public.catalog_set_release_controls sc on sc.set_id = s.id
    where p.set_id = p_set_id and case when sc.set_id is not null then sc.release_status = 'public'
      else lower(s.game) = 'pokemon' or exists (
        select 1 from public.catalog_game_release_controls gc
        where lower(gc.game_code) = lower(s.game) and gc.release_status = 'public'
      ) end
  ), valid as materialized (
    select x.position, coalesce(x.card_printing_id, x.card_print_id) as slot_id,
      x.card_print_id, x.card_printing_id, 1::integer as required_quantity
    from release r cross join lateral jsonb_to_recordset(r.slots)
      x("position" integer, card_print_id uuid, card_printing_id uuid, parent_only_authorized boolean)
    join public.card_prints cp on cp.id = x.card_print_id and cp.set_id = r.set_id
    left join public.card_printings cpn on cpn.id = x.card_printing_id and cpn.card_print_id = cp.id
    where coalesce(cp.data_quality_flags #>> '{app_visibility_v1,status}', 'visible') <> 'suppressed'
      and ((x.card_printing_id is not null and cpn.id is not null and cpn.is_provisional is false)
        or (x.card_printing_id is null and x.parent_only_authorized is true and not exists (
          select 1 from public.card_printings child where child.card_print_id = cp.id and child.is_provisional is false
        )))
  ) select v.* from valid v where (select count(*) from valid) = (select expected_slot_count from release)
    and (select count(distinct slot_id) from valid) = (select expected_slot_count from release)
  order by v.position;
$$;
revoke all on function public.binder_set_slots_authority_v1(uuid) from public, anon, authenticated, service_role;
grant execute on function public.binder_set_slots_authority_v1(uuid) to service_role;

create or replace function public.binder_set_progress_counts_v1(p_binder_id uuid)
returns table (total integer, member_completed integer, link_completed integer, public_completed integer, active_count integer)
language sql stable security definer set search_path = pg_catalog, public as $$
  with target as (select * from public.binders where id = p_binder_id and target_kind = 'set'),
  slots as materialized (select s.* from target b cross join lateral public.binder_set_slots_authority_v1(b.set_id) s),
  valid as materialized (
    select c.vault_item_instance_id, c.snapshot_card_print_id as card_print_id,
      c.snapshot_card_printing_id as card_printing_id, m.content_scope,
      m.content_consent_epoch = m.membership_epoch
        and m.content_consent_revision = b.external_projection_revision as consent_current
    from target b join public.binder_contributions c on c.binder_id = b.id and c.state = 'active'
    join public.binder_members m on m.id = c.contributor_member_id
    where public.binder_contribution_current_valid_v1(c.id)
  ), coverage as (
    select s.slot_id,
      count(distinct v.vault_item_instance_id) as member_qty,
      count(distinct v.vault_item_instance_id) filter (where v.consent_current and v.content_scope in ('link','public')) as link_qty,
      count(distinct v.vault_item_instance_id) filter (where v.consent_current and v.content_scope = 'public') as public_qty
    from slots s left join valid v on v.card_print_id = s.card_print_id
      and v.card_printing_id is not distinct from s.card_printing_id
    group by s.slot_id
  ) select count(*)::integer, count(*) filter (where member_qty > 0)::integer,
    count(*) filter (where link_qty > 0)::integer, count(*) filter (where public_qty > 0)::integer,
    (select count(distinct vault_item_instance_id)::integer from valid) from coverage;
$$;
revoke all on function public.binder_set_progress_counts_v1(uuid) from public, anon, authenticated, service_role;
grant execute on function public.binder_set_progress_counts_v1(uuid) to service_role;
