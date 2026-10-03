-- Staged edition foundation only. No canonical, ownership, mapping or price rows
-- are inserted. Existing readers and publication/assignment paths are unchanged.
begin;

create table if not exists public.jungle_edition_identity_links_v1 (
  id uuid primary key default gen_random_uuid(),
  legacy_card_print_id uuid not null references public.card_prints(id) on delete restrict,
  card_print_id uuid not null references public.card_prints(id) on delete restrict,
  card_printing_id uuid not null references public.card_printings(id) on delete restrict,
  edition text not null check (edition in ('first_edition','unlimited')),
  finish_key text not null check (finish_key in ('normal','holo')),
  state text not null default 'staged' check (state in ('staged','active','retired')),
  manifest_sha256 text not null check (manifest_sha256 ~ '^[a-f0-9]{64}$'),
  review_ref text not null check (length(btrim(review_ref)) > 0),
  created_at timestamptz not null default now(),
  check (legacy_card_print_id <> card_print_id)
);
create unique index if not exists jungle_edition_identity_links_live_edition_v1
  on public.jungle_edition_identity_links_v1(legacy_card_print_id,edition) where state <> 'retired';
create unique index if not exists jungle_edition_identity_links_live_parent_v1
  on public.jungle_edition_identity_links_v1(card_print_id) where state <> 'retired';
create unique index if not exists jungle_edition_identity_links_live_child_v1
  on public.jungle_edition_identity_links_v1(card_printing_id) where state <> 'retired';

create table if not exists public.tcgplayer_jungle_edition_bindings_v1 (
  id uuid primary key default gen_random_uuid(),
  identity_link_id uuid not null references public.jungle_edition_identity_links_v1(id) on delete restrict,
  source text not null default 'tcgplayer' check (source = 'tcgplayer'),
  category_id integer not null default 3 check (category_id = 3),
  product_id integer not null references public.tcgcsv_source_products(product_id) on delete restrict,
  source_subtype text not null check (source_subtype in
    ('Unlimited','Unlimited Holofoil','1st Edition','1st Edition Holofoil')),
  source_product_payload_hash text not null check (source_product_payload_hash ~ '^[a-f0-9]{64}$'),
  manifest_sha256 text not null check (manifest_sha256 ~ '^[a-f0-9]{64}$'),
  review_ref text not null check (length(btrim(review_ref)) > 0),
  state text not null default 'staged' check (state in ('staged','active','retired')),
  created_at timestamptz not null default now()
);
create unique index if not exists tcgplayer_jungle_edition_binding_live_source_v1
  on public.tcgplayer_jungle_edition_bindings_v1(source,category_id,product_id,source_subtype) where state <> 'retired';
create unique index if not exists tcgplayer_jungle_edition_binding_live_link_v1
  on public.tcgplayer_jungle_edition_bindings_v1(identity_link_id) where state <> 'retired';

-- Revalidated at read time as well as admission: later canonical or review drift
-- must invalidate a link instead of reinterpreting the saved copy or price.
create or replace function public.jungle_edition_link_valid_v1(link_id uuid, require_review boolean default true)
returns boolean language sql stable set search_path = public as $$
  select exists (
    select 1 from public.jungle_edition_identity_links_v1 link
    join public.card_prints legacy on legacy.id = link.legacy_card_print_id
    join public.card_prints card on card.id = link.card_print_id
    join public.sets s on s.id = legacy.set_id
    join public.card_printings child on child.id = link.card_printing_id
    where link.id = link_id and link.state <> 'retired'
      and s.code = 'base2' and s.game = 'pokemon' and s.identity_model = 'standard'
      and legacy.set_code = 'base2' and card.set_code = 'base2' and card.set_id = legacy.set_id
      and legacy.identity_domain = 'pokemon_eng_standard' and card.identity_domain = 'pokemon_eng_standard'
      and legacy.set_identity_model = 'standard' and card.set_identity_model = 'standard'
      and coalesce(legacy.variant_key,'') = '' and legacy.printed_identity_modifier is null
      and coalesce(card.variant_key,'') = '' and card.printed_identity_modifier = 'edition:' || link.edition
      and card.name = legacy.name and card.number = legacy.number and card.number_plain = legacy.number_plain
      and legacy.number = legacy.number_plain and legacy.number_plain ~ '^([1-9]|[1-5][0-9]|6[0-4])$'
      and legacy.gv_id = 'GV-PK-JU-' || legacy.number_plain
      and card.gv_id = legacy.gv_id || case link.edition when 'first_edition' then '-FIRST-EDITION' else '-UNLIMITED' end
      and child.card_print_id = card.id and child.finish_key = link.finish_key and child.is_provisional = false
      and child.printing_gv_id = card.gv_id || '-' || upper(link.finish_key)
      and link.finish_key = case when legacy.number_plain in ('1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16') then 'holo' else 'normal' end
      and (not require_review or (
        child.provenance_source = 'MASTER_INDEX_ADDITIVE_PRINTING_REPAIR_V1'
        and child.provenance_ref = 'master-index:' || link.manifest_sha256
        and
        exists (select 1 from public.card_printing_truth_reviews r where r.card_printing_id = child.id
          and r.active and r.review_status = 'verified' and r.public_visibility = 'visible'
          and link.finish_key = any(r.expected_finish_keys)
          and r.source_report_path = 'master-index:' || link.manifest_sha256
          and r.evidence->>'manifest_fingerprint' = link.manifest_sha256
          and r.evidence->>'card_print_id' = card.id::text
          and r.evidence->>'finish_key' = link.finish_key
          and r.evidence->>'review_sha256' ~ '^[a-f0-9]{64}$')
        and not exists (select 1 from public.card_printing_truth_reviews r where r.card_printing_id = child.id
          and r.active and (r.review_status = 'verified' and r.public_visibility = 'visible'
            and link.finish_key = any(r.expected_finish_keys)
            and r.source_report_path = 'master-index:' || link.manifest_sha256
            and r.evidence->>'manifest_fingerprint' = link.manifest_sha256
            and r.evidence->>'card_print_id' = card.id::text
            and r.evidence->>'finish_key' = link.finish_key
            and r.evidence->>'review_sha256' ~ '^[a-f0-9]{64}$') is not true)
      ))
  );
$$;

create or replace function public.tcgplayer_jungle_binding_valid_v1(binding_id uuid, require_active boolean default true)
returns boolean language sql stable set search_path = public as $$
  select exists (
    select 1 from public.tcgplayer_jungle_edition_bindings_v1 binding
    join public.jungle_edition_identity_links_v1 link on link.id = binding.identity_link_id
    join public.card_prints card on card.id = link.card_print_id
    join public.tcgcsv_source_products product on product.product_id = binding.product_id
    where binding.id = binding_id and binding.state <> 'retired'
      and (not require_active or (binding.state = 'active' and link.state = 'active'))
      and public.jungle_edition_link_valid_v1(link.id, require_active)
      and binding.manifest_sha256 = link.manifest_sha256
      and binding.source_subtype = case link.edition when 'first_edition' then '1st Edition' else 'Unlimited' end
        || case link.finish_key when 'holo' then ' Holofoil' else '' end
      and product.category_id = 3 and product.group_id = 635 and product.source_active
      and product.catalog_metadata_status = 'current' and product.payload_hash = binding.source_product_payload_hash
      and product.name in (card.name,card.name || ' (' || card.number_plain || ')',
        case when card.number_plain = '57' and card.name = 'Nidoran ♀' then 'Nidoran F' else card.name end)
      and (select count(*) from jsonb_array_elements(case when jsonb_typeof(product.extended_data) = 'array'
        then product.extended_data else '[]'::jsonb end) item where item->>'name' = 'Number') = 1
      and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(product.extended_data) = 'array'
        then product.extended_data else '[]'::jsonb end) item where item->>'name' = 'Number'
        and item->>'value' in (card.number_plain || '/64',lpad(card.number_plain,2,'0') || '/64'))
  );
$$;

create or replace function public.guard_jungle_edition_foundation_v1()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'edition_history_is_append_only'; end if;
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'state') is distinct from (to_jsonb(old) - 'state') then
      raise exception 'edition_identity_is_immutable';
    end if;
    if old.state = 'retired' and new.state <> 'retired' then raise exception 'retired_edition_cannot_reactivate'; end if;
    if old.state = 'active' and new.state = 'staged' then raise exception 'active_edition_requires_retirement'; end if;
  end if;
  return new;
end;
$$;

-- AFTER validation can read the newly inserted row; an exception rolls the row
-- back atomically. It does not create reviews or promote canonical cards.
create or replace function public.validate_jungle_edition_foundation_v1()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.state = 'retired' then return new; end if;
  if tg_table_name = 'jungle_edition_identity_links_v1' then
    if not public.jungle_edition_link_valid_v1(new.id, new.state = 'active') then
      raise exception 'invalid_jungle_edition_identity';
    end if;
  elsif not public.tcgplayer_jungle_binding_valid_v1(new.id, new.state = 'active') then
    raise exception 'invalid_jungle_edition_source_binding';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_jungle_edition_links_v1 on public.jungle_edition_identity_links_v1;
create trigger guard_jungle_edition_links_v1 before update or delete on public.jungle_edition_identity_links_v1
  for each row execute function public.guard_jungle_edition_foundation_v1();
drop trigger if exists validate_jungle_edition_links_v1 on public.jungle_edition_identity_links_v1;
create trigger validate_jungle_edition_links_v1 after insert or update on public.jungle_edition_identity_links_v1
  for each row execute function public.validate_jungle_edition_foundation_v1();
drop trigger if exists guard_jungle_edition_bindings_v1 on public.tcgplayer_jungle_edition_bindings_v1;
create trigger guard_jungle_edition_bindings_v1 before update or delete on public.tcgplayer_jungle_edition_bindings_v1
  for each row execute function public.guard_jungle_edition_foundation_v1();
drop trigger if exists validate_jungle_edition_bindings_v1 on public.tcgplayer_jungle_edition_bindings_v1;
create trigger validate_jungle_edition_bindings_v1 after insert or update on public.tcgplayer_jungle_edition_bindings_v1
  for each row execute function public.validate_jungle_edition_foundation_v1();

create or replace function public.resolve_tcgplayer_jungle_edition_v1(product_id integer, source_subtype text, product_hash text)
returns table(binding_id uuid,identity_link_id uuid,legacy_card_print_id uuid,card_print_id uuid,
  card_printing_id uuid,edition text,finish_key text,manifest_sha256 text)
language sql stable set search_path = public as $$
  select b.id,l.id,l.legacy_card_print_id,l.card_print_id,l.card_printing_id,l.edition,l.finish_key,l.manifest_sha256
  from public.tcgplayer_jungle_edition_bindings_v1 b
  join public.jungle_edition_identity_links_v1 l on l.id = b.identity_link_id
  where b.product_id = resolve_tcgplayer_jungle_edition_v1.product_id
    and b.source_subtype = resolve_tcgplayer_jungle_edition_v1.source_subtype
    and b.source_product_payload_hash = product_hash
    and public.tcgplayer_jungle_binding_valid_v1(b.id, true)
    -- A partial legacy transition must not expose one edition as the default.
    and (select count(*) from public.jungle_edition_identity_links_v1 pair
      where pair.legacy_card_print_id = l.legacy_card_print_id and pair.state = 'active'
        and pair.manifest_sha256 = l.manifest_sha256
        and public.jungle_edition_link_valid_v1(pair.id,true)) = 2;
$$;

alter table public.jungle_edition_identity_links_v1 enable row level security;
alter table public.tcgplayer_jungle_edition_bindings_v1 enable row level security;
revoke all on public.jungle_edition_identity_links_v1,public.tcgplayer_jungle_edition_bindings_v1 from public,anon,authenticated,service_role;
grant select,insert on public.jungle_edition_identity_links_v1,public.tcgplayer_jungle_edition_bindings_v1 to service_role;
grant update(state) on public.jungle_edition_identity_links_v1,public.tcgplayer_jungle_edition_bindings_v1 to service_role;
revoke all on function public.jungle_edition_link_valid_v1(uuid,boolean),
  public.tcgplayer_jungle_binding_valid_v1(uuid,boolean),public.guard_jungle_edition_foundation_v1(),
  public.validate_jungle_edition_foundation_v1(),public.resolve_tcgplayer_jungle_edition_v1(integer,text,text)
  from public,anon,authenticated;
grant execute on function public.jungle_edition_link_valid_v1(uuid,boolean),
  public.tcgplayer_jungle_binding_valid_v1(uuid,boolean),public.guard_jungle_edition_foundation_v1(),
  public.validate_jungle_edition_foundation_v1(),public.resolve_tcgplayer_jungle_edition_v1(integer,text,text) to service_role;

-- Public resolution contains catalog identifiers only, never reviews or ownership.
-- Staging alone does not change legacy intake. Once a legacy scope has entered
-- active/retired history, incomplete or invalid pairs remain held permanently.
create or replace function public.get_jungle_edition_resolution_v1(p_card_print_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  legacy_id uuid;
  selected public.jungle_edition_identity_links_v1%rowtype;
  choices jsonb;
begin
  select l.* into selected from public.jungle_edition_identity_links_v1 l
    where l.card_print_id = p_card_print_id
      or (l.legacy_card_print_id = p_card_print_id and l.state in ('active','retired'))
    order by (l.state = 'active') desc, l.created_at desc, l.id limit 1;
  if not found then return jsonb_build_object('version',1,'status','not_applicable','options','[]'::jsonb); end if;
  legacy_id := selected.legacy_card_print_id;
  select jsonb_agg(jsonb_build_object('card_print_id',l.card_print_id,'card_printing_id',l.card_printing_id,
    'gv_id',c.gv_id,'printing_gv_id',p.printing_gv_id,'edition',l.edition,'finish_key',l.finish_key)
    order by l.edition) into choices
  from public.jungle_edition_identity_links_v1 l
  join public.card_prints c on c.id = l.card_print_id
  join public.card_printings p on p.id = l.card_printing_id
  join public.finish_keys f on f.key = l.finish_key and f.is_active
  where l.legacy_card_print_id = legacy_id and l.state = 'active'
    and l.manifest_sha256 = selected.manifest_sha256
    and public.catalog_card_print_visible_to_request_v1(c.id)
    and coalesce(c.data_quality_flags #>> '{app_visibility_v1,status}','') <> 'suppressed'
    and public.jungle_edition_link_valid_v1(l.id,true);
  if coalesce(jsonb_array_length(choices),0) <> 2 then choices := '[]'::jsonb; end if;
  return jsonb_build_object('version',1,'legacy_card_print_id',legacy_id,
    'status',case when jsonb_array_length(choices) <> 2 then 'unavailable'
      when p_card_print_id = legacy_id then 'selection_required'
      when selected.state = 'active' then 'ready' else 'unavailable' end,
    'options',choices);
end;
$$;
revoke all on function public.get_jungle_edition_resolution_v1(uuid) from public;
grant execute on function public.get_jungle_edition_resolution_v1(uuid) to anon,authenticated,service_role;

create or replace function public.assert_jungle_edition_intake_v1(p_card_print_id uuid,p_card_printing_id uuid,p_require_printing boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare resolution jsonb;
begin
  resolution := public.get_jungle_edition_resolution_v1(p_card_print_id);
  if resolution->>'status' = 'not_applicable' then return; end if;
  if resolution->>'status' = 'selection_required' then
    raise exception 'JUNGLE_EDITION_REQUIRED' using errcode='P0001',
      detail=resolution::text, hint='Choose First Edition or Unlimited before adding a new copy.';
  end if;
  if resolution->>'status' <> 'ready' then
    raise exception 'JUNGLE_EDITION_UNAVAILABLE' using errcode='P0001',
      hint='Edition choices are being reviewed. Existing saved copies remain available.';
  end if;
  if p_require_printing and not exists (select 1 from jsonb_array_elements(resolution->'options') item
    where item->>'card_print_id'=p_card_print_id::text and item->>'card_printing_id'=p_card_printing_id::text) then
    raise exception 'JUNGLE_EDITION_PRINTING_REQUIRED' using errcode='P0001',
      hint='Choose the verified printing for this edition.';
  end if;
end;
$$;

create or replace function public.guard_jungle_edition_intake_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare parent_id uuid;
begin
  if tg_table_name = 'vault_items' then
    if tg_op = 'UPDATE' then
      if new.card_id is not distinct from old.card_id and coalesce(new.qty,0) <= coalesce(old.qty,0) then return new; end if;
      if new.card_id is distinct from old.card_id and exists (select 1 from public.jungle_edition_identity_links_v1 l
        where old.card_id in (l.legacy_card_print_id,l.card_print_id) and l.state in ('active','retired')) then
        raise exception 'JUNGLE_EDITION_OWNED_RESOLUTION_REQUIRED' using errcode='P0001';
      end if;
    end if;
    if coalesce(new.qty,0) > 0 then perform public.assert_jungle_edition_intake_v1(new.card_id,null,false); end if;
  else
    if tg_op = 'UPDATE' then
      if new.card_print_id is not distinct from old.card_print_id
        and new.card_printing_id is not distinct from old.card_printing_id
        and new.slab_cert_id is not distinct from old.slab_cert_id then return new; end if;
      -- Resolving an existing copy needs a separate owner-authorized CAS writer.
      if exists (select 1 from public.jungle_edition_identity_links_v1 l
        where coalesce(old.card_print_id,
          (select s.card_print_id from public.slab_certs s where s.id=old.slab_cert_id)) in (l.legacy_card_print_id,l.card_print_id)
          and l.state in ('active','retired')) then
        raise exception 'JUNGLE_EDITION_OWNED_RESOLUTION_REQUIRED' using errcode='P0001';
      end if;
    end if;
    parent_id := coalesce(new.card_print_id,(select s.card_print_id from public.slab_certs s where s.id=new.slab_cert_id));
    perform public.assert_jungle_edition_intake_v1(parent_id,new.card_printing_id,true);
  end if;
  return new;
end;
$$;
revoke all on function public.assert_jungle_edition_intake_v1(uuid,uuid,boolean),public.guard_jungle_edition_intake_v1() from public,anon,authenticated;
grant execute on function public.assert_jungle_edition_intake_v1(uuid,uuid,boolean) to service_role;
drop trigger if exists guard_jungle_edition_instance_intake_v1 on public.vault_item_instances;
create trigger guard_jungle_edition_instance_intake_v1 before insert or update of card_print_id,card_printing_id,slab_cert_id
  on public.vault_item_instances for each row execute function public.guard_jungle_edition_intake_v1();
drop trigger if exists guard_jungle_edition_anchor_intake_v1 on public.vault_items;
create trigger guard_jungle_edition_anchor_intake_v1 before insert or update of card_id,qty
  on public.vault_items for each row execute function public.guard_jungle_edition_intake_v1();

-- Discovery is separate from direct/owned reads. Staged edition candidates are
-- held; legacy references leave discovery only after active/retired history.
create or replace function public.get_jungle_edition_discovery_exclusions_v1()
returns uuid[] language sql stable security definer set search_path = '' as $$
  with scoped as (
    select l.legacy_card_print_id as id, true as legacy
    from public.jungle_edition_identity_links_v1 l where l.state in ('active','retired')
    union
    select l.card_print_id, false from public.jungle_edition_identity_links_v1 l
  )
  select coalesce(array_agg(distinct s.id order by s.id), '{}'::uuid[])
  from scoped s
  where public.catalog_card_print_visible_to_request_v1(s.id)
    and (s.legacy or public.get_jungle_edition_resolution_v1(s.id)->>'status' <> 'ready');
$$;
revoke all on function public.get_jungle_edition_discovery_exclusions_v1() from public,anon,authenticated,service_role;
grant execute on function public.get_jungle_edition_discovery_exclusions_v1() to anon,authenticated,service_role;

create or replace function public.get_public_set_card_counts_v1(
  p_set_codes text[]
)
returns table (
  set_code text,
  card_count bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  discovery_exclusions uuid[] := public.get_jungle_edition_discovery_exclusions_v1();
begin
  if p_set_codes is null or cardinality(p_set_codes) = 0 then
    return;
  end if;

  if cardinality(p_set_codes) > 1000 then
    raise exception 'get_public_set_card_counts_v1 accepts at most 1000 set codes';
  end if;

  return query
  select
    card.set_code,
    count(*)::bigint
  from public.card_prints card
  where card.set_code = any(p_set_codes)
    and card.gv_id is not null
    and card.id <> all(discovery_exclusions)
    and coalesce(
      card.data_quality_flags #>> '{app_visibility_v1,status}',
      'visible'
    ) <> 'suppressed'
    and public.catalog_card_print_visible_to_request_v1(card.id)
  group by card.set_code
  order by card.set_code;
end;
$function$;

create or replace function public.get_public_catalog_sets_v2(
  p_game_code text default null
)
returns table (
  id uuid,
  game text,
  code text,
  name text,
  hero_image_url text,
  hero_image_source text,
  set_role text,
  catalog_set_type text,
  printed_set_abbrev text,
  printed_total integer,
  release_date date,
  created_at timestamptz,
  card_count bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  discovery_exclusions uuid[] := public.get_jungle_edition_discovery_exclusions_v1();
  requested_game text := nullif(lower(btrim(coalesce(p_game_code, ''))), '');
  request_role text := coalesce(auth.role(), '');
begin
  if requested_game is not null and length(requested_game) > 64 then
    raise exception 'get_public_catalog_sets_v2 game code is too long';
  end if;

  return query
  with visible_sets as materialized (
    select
      target.id,
      target.game,
      target.code,
      target.name,
      target.hero_image_url,
      target.hero_image_source,
      target.set_role,
      target.source #>> '{scryfall,set_type}' as catalog_set_type,
      target.printed_set_abbrev,
      target.printed_total,
      target.release_date,
      target.created_at,
      lower(target.code) as normalized_code
    from public.sets target
    left join public.catalog_set_release_controls set_control
      on set_control.set_id = target.id
    left join public.catalog_game_release_controls game_control
      on lower(game_control.game_code) = lower(target.game)
    where (requested_game is null or lower(target.game) = requested_game)
      and case
        when set_control.set_id is not null then
          set_control.release_status = 'public'
          or (
            set_control.release_status = 'signed_in'
            and request_role in ('authenticated', 'service_role')
          )
        when lower(target.game) = 'pokemon' then true
        else
          game_control.release_status = 'public'
          or (
            game_control.release_status = 'signed_in'
            and request_role in ('authenticated', 'service_role')
          )
      end
  ),
  visible_card_counts as materialized (
    select
      lower(card.set_code) as normalized_code,
      count(*)::bigint as card_count
    from public.card_prints card
    join visible_sets visible_set
      on visible_set.id = card.set_id
    where card.gv_id is not null
    and card.id <> all(discovery_exclusions)
      and coalesce(
        card.data_quality_flags #>> '{app_visibility_v1,status}',
        'visible'
      ) <> 'suppressed'
    group by lower(card.set_code)
  )
  select
    visible_set.id,
    visible_set.game,
    visible_set.code,
    visible_set.name,
    visible_set.hero_image_url,
    visible_set.hero_image_source,
    visible_set.set_role,
    visible_set.catalog_set_type,
    visible_set.printed_set_abbrev,
    visible_set.printed_total,
    visible_set.release_date,
    visible_set.created_at,
    count_row.card_count
  from visible_sets visible_set
  join visible_card_counts count_row
    on count_row.normalized_code = visible_set.normalized_code
  where count_row.card_count > 0
  order by visible_set.game, visible_set.code, visible_set.id;
end;
$function$;

-- Ordinary discovery is a projection, never a new global visibility rule.
-- Scalar subqueries are InitPlans: one bounded exclusion read per query.
create view public.v_card_prints_discovery_v1 with (security_invoker = true) as
select card.* from public.card_prints card
where card.id <> all ((select public.get_jungle_edition_discovery_exclusions_v1())::uuid[]);
create view public.v_card_printings_discovery_v1 with (security_invoker = true) as
select printing.* from public.card_printings printing
where printing.card_print_id <> all ((select public.get_jungle_edition_discovery_exclusions_v1())::uuid[]);
revoke all on public.v_card_prints_discovery_v1, public.v_card_printings_discovery_v1 from public, anon, authenticated, service_role;
grant select on public.v_card_prints_discovery_v1, public.v_card_printings_discovery_v1 to anon, authenticated, service_role;

create or replace function public.search_game_card_prints_v4(
  game_code_in text,
  q text default null,
  set_code_in text default null,
  number_in text default null,
  illustrator_in text default null,
  language_scope_in text default 'all',
  limit_in integer default 50,
  offset_in integer default 0
)
returns table (
  id uuid,
  gv_id text,
  name text,
  number text,
  number_plain text,
  rarity text,
  artist text,
  image_url text,
  image_alt_url text,
  image_source text,
  image_path text,
  representative_image_url text,
  image_status text,
  image_note text,
  set_code text,
  printed_set_abbrev text,
  external_ids jsonb,
  variant_key text,
  printed_identity_modifier text,
  variants jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_game_code text := nullif(lower(trim(game_code_in)), '');
  v_game_id uuid;
  v_query text := nullif(trim(q), '');
  v_effective_query text := nullif(trim(q), '');
  v_set_code text := nullif(lower(trim(set_code_in)), '');
  v_number text := nullif(lower(trim(number_in)), '');
  v_illustrator text := nullif(lower(trim(illustrator_in)), '');
  v_language_scope text := case
    when lower(trim(coalesce(language_scope_in, 'all'))) in ('en', 'ja')
    then lower(trim(language_scope_in))
    else 'all'
  end;
  v_result_limit integer := least(greatest(coalesce(limit_in, 50), 1), 64);
  v_result_offset integer := least(greatest(coalesce(offset_in, 0), 0), 10000);
  v_first_token text;
begin
  select game.id
  into v_game_id
  from public.games game
  where lower(game.code) = v_game_code
    and (
      public.catalog_game_visible_to_request_v1(game.code)
      or exists (
        select 1
        from public.sets released_set
        where lower(released_set.game) = v_game_code
          and public.catalog_set_visible_to_request_v1(released_set.id)
      )
    )
  limit 1;

  if v_game_id is null then
    return;
  end if;

  if v_query is not null and lower(v_query) like 'gv-%' then
    return query
    select
      card.id,
      card.gv_id,
      card.name,
      card.number,
      card.number_plain,
      card.rarity,
      card.artist,
      card.image_url,
      card.image_alt_url,
      card.image_source,
      card.image_path,
      card.representative_image_url,
      card.image_status,
      card.image_note,
      card.set_code,
      card.printed_set_abbrev,
      card.external_ids,
      card.variant_key,
      card.printed_identity_modifier,
      card.variants
    from public.card_prints card
    where card.game_id = v_game_id
      and lower(card.gv_id) = lower(v_query)
      and public.catalog_card_print_visible_to_request_v1(card.id)
      and coalesce(
        card.data_quality_flags #>> '{app_visibility_v1,status}',
        'visible'
      ) <> 'suppressed'
      and (v_set_code is null or lower(card.set_code) = v_set_code)
      and (
        v_number is null
        or lower(card.number) = v_number
        or lower(card.number_plain) = v_number
      )
      and (v_illustrator is null or lower(card.artist) = v_illustrator)
      and (
        v_game_code <> 'pokemon'
        or v_language_scope = 'all'
        or (
          v_language_scope = 'ja'
          and (
            upper(card.gv_id) like 'GV-PK-JPN-%'
            or upper(card.gv_id) like '%-JPN-%'
          )
        )
        or (
          v_language_scope = 'en'
          and upper(card.gv_id) not like 'GV-PK-JPN-%'
          and upper(card.gv_id) not like '%-JPN-%'
        )
      )
    order by card.id
    limit v_result_limit
    offset v_result_offset;
    return;
  end if;

  if v_set_code is null and v_query is not null and position(' ' in v_query) > 0 then
    v_first_token := lower(split_part(v_query, ' ', 1));

    select lower(candidate.code)
    into v_set_code
    from public.sets candidate
    where lower(candidate.game) = v_game_code
      and lower(candidate.code) = v_first_token
      and public.catalog_set_visible_to_request_v1(candidate.id)
    order by candidate.code
    limit 1;

    if v_set_code is not null then
      v_effective_query := nullif(trim(substr(
        v_query,
        length(split_part(v_query, ' ', 1)) + 1
      )), '');
    end if;
  end if;

  return query
  select
    card.id,
    card.gv_id,
    card.name,
    card.number,
    card.number_plain,
    card.rarity,
    card.artist,
    card.image_url,
    card.image_alt_url,
    card.image_source,
    card.image_path,
    card.representative_image_url,
    card.image_status,
    card.image_note,
    card.set_code,
    card.printed_set_abbrev,
    card.external_ids,
    card.variant_key,
    card.printed_identity_modifier,
    card.variants
  from public.v_card_prints_discovery_v1 card
  where card.game_id = v_game_id
    and public.catalog_card_print_visible_to_request_v1(card.id)
    and coalesce(
      card.data_quality_flags #>> '{app_visibility_v1,status}',
      'visible'
    ) <> 'suppressed'
    and (v_set_code is null or lower(card.set_code) = v_set_code)
    and (
      v_number is null
      or lower(card.number) = v_number
      or lower(card.number_plain) = v_number
    )
    and (v_illustrator is null or lower(card.artist) = v_illustrator)
    and (
      v_effective_query is null
      or lower(card.name) like '%' || lower(v_effective_query) || '%'
    )
    and (
      v_game_code <> 'pokemon'
      or v_language_scope = 'all'
      or (
        v_language_scope = 'ja'
        and (
          upper(card.gv_id) like 'GV-PK-JPN-%'
          or upper(card.gv_id) like '%-JPN-%'
        )
      )
      or (
        v_language_scope = 'en'
        and upper(card.gv_id) not like 'GV-PK-JPN-%'
        and upper(card.gv_id) not like '%-JPN-%'
      )
    )
  order by
    case
      when v_effective_query is not null
        and lower(card.name) = lower(v_effective_query)
      then 0
      else 1
    end,
    card.name,
    card.set_code,
    card.number,
    card.id
  limit v_result_limit
  offset v_result_offset;
end;
$$;

create or replace function public.search_print_identity_v1(
  q text default null,
  set_code_in text default null,
  number_in text default null,
  object_type_in text default null,
  limit_in integer default 50,
  offset_in integer default 0
)
returns table (
  search_document_id text,
  object_type text,
  parent_gv_id text,
  printing_gv_id text,
  display_name text,
  display_discriminator text,
  route_path text,
  route_query text,
  matched_fields text[],
  rank_score integer
)
language sql
stable
security definer
set search_path = public
as $$
  with prepared as not materialized (
    select
      lower(nullif(trim(q), '')) as q_norm,
      regexp_split_to_array(lower(coalesce(nullif(trim(q), ''), '')), '\s+') as q_tokens,
      lower(nullif(trim(set_code_in), '')) as set_code_norm,
      nullif((regexp_match(coalesce(trim(number_in), ''), '(\d+)'))[1], '') as number_digits_norm,
      lower(nullif(trim(object_type_in), '')) as object_type_norm,
      greatest(1, least(coalesce(limit_in, 50), 1000)) as result_limit,
      greatest(0, coalesce(offset_in, 0)) as result_offset
  ),
  parent_identity_seed as materialized (
    select cp.id
    from public.card_prints cp
    cross join prepared p
    where p.q_norm is not null
      and cp.gv_id = upper(p.q_norm)
  ),
  name_seed as materialized (
    select cp.id
    from public.v_card_prints_discovery_v1 cp
    cross join prepared p
    where p.q_norm is not null
      and cp.gv_id is not null
      and public.catalog_parent_gv_id_visible_to_request_v1(cp.gv_id)
      and lower(cp.name) like '%' || p.q_norm || '%'
      and (p.set_code_norm is null or lower(cp.set_code) = p.set_code_norm)
      and (
        p.number_digits_norm is null
        or regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g') = p.number_digits_norm
        or lpad(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), 3, '0') = lpad(p.number_digits_norm, 3, '0')
      )
    order by
      case when lower(cp.name) = p.q_norm then 0 else 1 end,
      cp.name,
      cp.gv_id
    limit greatest(
      100,
      (select (result_limit + result_offset) * 2 from prepared)
    )
  ),
  matching_sets as materialized (
    select s.id
    from public.sets s
    cross join prepared p
    where p.q_norm is not null
      and (
        lower(coalesce(s.code, '')) = p.q_norm
        or lower(coalesce(s.name, '')) like '%' || p.q_norm || '%'
      )
  ),
  set_seed as materialized (
    select cp.id
    from matching_sets matched
    join public.v_card_prints_discovery_v1 cp on cp.set_id = matched.id
    union
    select cp.id
    from public.v_card_prints_discovery_v1 cp
    cross join prepared p
    where p.q_norm is not null
      and lower(cp.set_code) = p.q_norm
  ),
  printing_identity_seed as materialized (
    select cp.id
    from public.card_printings cpn
    join public.card_prints cp on cp.id = cpn.card_print_id
    cross join prepared p
    where p.q_norm is not null
      and cpn.printing_gv_id = upper(p.q_norm)
  ),
  matched_finish_keys as materialized (
    select fk.key
    from public.finish_keys fk
    cross join prepared p
    where p.q_norm is not null
      and (
        lower(fk.key) = p.q_norm
        or lower(coalesce(fk.label, '')) = p.q_norm
      )
  ),
  finish_seed as materialized (
    select cp.id
    from matched_finish_keys matched
    cross join lateral (
      select source.card_print_id
      from public.card_printings source
      where source.finish_key = matched.key
      offset 0
    ) cpn
    join public.v_card_prints_discovery_v1 cp on cp.id = cpn.card_print_id
  ),
  primary_seed as materialized (
    select id from parent_identity_seed
    union
    select id from name_seed
    union
    select id from printing_identity_seed
  ),
  name_seed_sufficient as materialized (
    select
      count(*) >= (select result_limit + result_offset from prepared) as sufficient
    from name_seed
  ),
  cameo_seed as materialized (
    select cp.id
    from public.v_card_print_cameos_public_v1 cameo
    join public.v_card_prints_discovery_v1 cp on cp.gv_id = cameo.gv_id
    cross join prepared p
    where p.q_norm is not null
      and (
        lower(coalesce(cameo.cameo_subject_name, '')) like '%' || p.q_norm || '%'
        or exists (
          select 1
          from unnest(p.q_tokens) token
          where token <> ''
            and token <> 'cameo'
            and lower(concat_ws(
              ' ',
              cameo.cameo_subject_name,
              cameo.pokemon_ndex,
              array_to_string(cameo.cameo_qualifiers, ' '),
              cameo.notes_raw
            )) like '%' || token || '%'
        )
      )
  ),
  fast_seed as materialized (
    select id from primary_seed
    union
    select id from set_seed
    where not (select sufficient from name_seed_sufficient)
    union
    select id from finish_seed
    where not (select sufficient from name_seed_sufficient)
    union
    select id from cameo_seed
    where not (select sufficient from name_seed_sufficient)
  ),
  filtered_seed as materialized (
    select cp.id
    from public.v_card_prints_discovery_v1 cp
    cross join prepared p
    where p.q_norm is null
      and (p.set_code_norm is null or lower(coalesce(cp.set_code, '')) = p.set_code_norm)
      and (
        p.number_digits_norm is null
        or regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g') = p.number_digits_norm
        or lpad(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), 3, '0') = lpad(p.number_digits_norm, 3, '0')
      )
    order by cp.name, cp.gv_id
    limit greatest(
      5000,
      (select (result_limit + result_offset) * 20 from prepared)
    )
  ),
  fallback_seed as materialized (
    select cp.id
    from public.v_card_prints_discovery_v1 cp
    left join public.sets s on s.id = cp.set_id
    cross join prepared p
    where p.q_norm is not null
      and not exists (select 1 from fast_seed)
      and (
        lower(concat_ws(
          ' ',
          cp.gv_id,
          cp.print_identity_key,
          cp.name,
          cp.number,
          cp.number_plain,
          cp.set_code,
          s.name,
          cp.printed_set_abbrev,
          cp.rarity,
          cp.variant_key,
          cp.printed_identity_modifier,
          cp.external_ids::text
        )) like '%' || p.q_norm || '%'
        or not exists (
          select 1
          from unnest(p.q_tokens) token
          where token <> ''
            and lower(concat_ws(
              ' ',
              cp.gv_id,
              cp.print_identity_key,
              cp.name,
              cp.number,
              cp.number_plain,
              cp.set_code,
              s.name,
              cp.printed_set_abbrev,
              cp.rarity,
              cp.variant_key,
              cp.printed_identity_modifier,
              cp.external_ids::text
            )) not like '%' || token || '%'
        )
      )
    order by cp.name, cp.gv_id
    limit 10000
  ),
  candidate_ids as materialized (
    select id from fast_seed
    union
    select id from filtered_seed
    union
    select id from fallback_seed
  ),
  candidate_cards as materialized (
    select cp.*, s.name as joined_set_name
    from candidate_ids candidate
    cross join lateral (
      select source.*
      from public.card_prints source
      where source.id = candidate.id
      offset 0
    ) cp
    left join public.sets s on s.id = cp.set_id
    cross join prepared p
    where cp.gv_id is not null
      and public.catalog_parent_gv_id_visible_to_request_v1(cp.gv_id)
      and (p.set_code_norm is null or lower(coalesce(cp.set_code, '')) = p.set_code_norm)
      and (
        p.number_digits_norm is null
        or regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g') = p.number_digits_norm
        or lpad(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), 3, '0') = lpad(p.number_digits_norm, 3, '0')
      )
  ),
  cameo_agg as materialized (
    select
      cameo.gv_id,
      string_agg(
        lower(concat_ws(
          ' ',
          'cameo',
          case when cameo.cameo_subject_type = 'trainer' then 'trainer' else 'pokemon' end,
          cameo.cameo_subject_name,
          cameo.pokemon_ndex,
          array_to_string(cameo.cameo_qualifiers, ' '),
          cameo.notes_raw
        )),
        ' '
        order by cameo.cameo_subject_name
      ) as cameo_search_text,
      array_agg(
        distinct (
          case when cameo.cameo_subject_type = 'trainer' then 'Cameo trainer: ' else 'Cameo: ' end
          || cameo.cameo_subject_name
          || case
            when array_length(cameo.cameo_qualifiers, 1) > 0
              then ' · ' || array_to_string(cameo.cameo_qualifiers, ', ')
            else ''
          end
        )
      ) as cameo_labels
    from public.v_card_print_cameos_public_v1 cameo
    join candidate_cards cp on cp.gv_id = cameo.gv_id
    group by cameo.gv_id
  ),
  parent_docs as (
    select
      ('parent:' || cp.gv_id)::text as search_document_id,
      'parent_print'::text as object_type,
      cp.gv_id::text as public_id,
      cp.gv_id::text as parent_gv_id,
      null::text as printing_gv_id,
      cp.name::text as display_name,
      null::text as display_discriminator,
      ('/card/' || cp.gv_id)::text as route_path,
      null::text as route_query,
      cp.name::text as name,
      regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g')::text as number_digits,
      case
        when nullif(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), '') is null then null::text
        else lpad(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), 3, '0')
      end as number_padded,
      cp.set_code::text as set_code,
      lower(concat_ws(
        ' ',
        cp.gv_id,
        cp.print_identity_key,
        cp.name,
        cp.number,
        cp.number_plain,
        cp.set_code,
        cp.joined_set_name,
        cp.printed_set_abbrev,
        cp.rarity,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.external_ids::text,
        cameo.cameo_search_text
      ))::text as search_text,
      20::integer as rank_bucket,
      cameo.cameo_search_text::text as cameo_search_text,
      cameo.cameo_labels::text[] as cameo_labels
    from candidate_cards cp
    left join cameo_agg cameo on cameo.gv_id = cp.gv_id
  ),
  child_docs as (
    select
      ('child:' || cpn.printing_gv_id)::text as search_document_id,
      'child_printing'::text as object_type,
      cpn.printing_gv_id::text as public_id,
      cp.gv_id::text as parent_gv_id,
      cpn.printing_gv_id::text as printing_gv_id,
      cp.name::text as display_name,
      coalesce(fk.label, cpn.finish_key)::text as display_discriminator,
      ('/card/' || cp.gv_id)::text as route_path,
      ('printing=' || cpn.printing_gv_id)::text as route_query,
      cp.name::text as name,
      regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g')::text as number_digits,
      case
        when nullif(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), '') is null then null::text
        else lpad(regexp_replace(coalesce(cp.number_plain, cp.number, ''), '\D', '', 'g'), 3, '0')
      end as number_padded,
      cp.set_code::text as set_code,
      lower(concat_ws(
        ' ',
        cpn.printing_gv_id,
        cp.gv_id,
        cp.print_identity_key,
        cp.name,
        cp.number,
        cp.number_plain,
        cp.set_code,
        cp.joined_set_name,
        cp.printed_set_abbrev,
        cp.rarity,
        cp.variant_key,
        cp.printed_identity_modifier,
        cpn.finish_key,
        fk.label,
        cp.external_ids::text
      ))::text as search_text,
      30::integer as rank_bucket,
      null::text as cameo_search_text,
      null::text[] as cameo_labels
    from candidate_cards cp
    cross join lateral (
      select source.*
      from public.card_printings source
      where source.card_print_id = cp.id
        and source.printing_gv_id is not null
      offset 0
    ) cpn
    left join public.finish_keys fk on fk.key = cpn.finish_key
  ),
  docs as materialized (
    select * from parent_docs
    union all
    select * from child_docs
  ),
  scored as (
    select
      d.search_document_id,
      d.object_type,
      d.parent_gv_id,
      d.printing_gv_id,
      d.display_name,
      case
        when p.q_norm is not null
          and d.cameo_search_text is not null
          and (
            d.cameo_search_text like '%' || p.q_norm || '%'
            or exists (
              select 1
              from unnest(p.q_tokens) token
              where token <> ''
                and token <> 'cameo'
                and d.cameo_search_text like '%' || token || '%'
            )
          )
          then coalesce(d.cameo_labels[1], 'Cameo')
        else d.display_discriminator
      end as display_discriminator,
      d.route_path,
      d.route_query,
      array_remove(array[
        case when p.q_norm is not null and lower(coalesce(d.public_id, '')) = p.q_norm then 'public_id' end,
        case when p.q_norm is not null and lower(coalesce(d.parent_gv_id, '')) = p.q_norm then 'parent_gv_id' end,
        case when p.q_norm is not null and lower(coalesce(d.printing_gv_id, '')) = p.q_norm then 'printing_gv_id' end,
        case when p.q_norm is not null and lower(coalesce(d.name, '')) like '%' || p.q_norm || '%' then 'name' end,
        case when p.q_norm is not null and d.search_text like '%' || p.q_norm || '%' then 'search_text' end,
        case when p.q_norm is not null and d.cameo_search_text like '%' || p.q_norm || '%' then 'cameo_search_text' end,
        case when p.q_norm is not null and exists (
          select 1
          from unnest(p.q_tokens) token
          where token <> '' and token <> 'cameo' and d.cameo_search_text like '%' || token || '%'
        ) then 'cameo_token' end,
        case when p.number_digits_norm is not null and d.number_digits = p.number_digits_norm then 'number' end,
        case when p.set_code_norm is not null and lower(coalesce(d.set_code, '')) = p.set_code_norm then 'set_code' end
      ], null)::text[] as matched_fields,
      (
        d.rank_bucket
        + case when p.q_norm is not null and lower(coalesce(d.public_id, '')) = p.q_norm then 10000 else 0 end
        + case when p.q_norm is not null and lower(coalesce(d.printing_gv_id, '')) = p.q_norm then 9500 else 0 end
        + case when p.q_norm is not null and lower(coalesce(d.parent_gv_id, '')) = p.q_norm then 9000 else 0 end
        + case when p.number_digits_norm is not null and d.number_digits = p.number_digits_norm then 1600 else 0 end
        + case when p.number_digits_norm is not null and d.number_padded = lpad(p.number_digits_norm, 3, '0') then 1100 else 0 end
        + case when p.set_code_norm is not null and lower(coalesce(d.set_code, '')) = p.set_code_norm then 1200 else 0 end
        + case when p.q_norm is not null and lower(coalesce(d.name, '')) = p.q_norm then 1800 else 0 end
        + case when p.q_norm is not null and lower(coalesce(d.name, '')) like '%' || p.q_norm || '%' then 800 else 0 end
        + case when p.q_norm is not null and d.search_text like '%' || p.q_norm || '%' then 400 else 0 end
        + case
          when p.q_norm is not null then (
            select count(*)::integer * 120
            from unnest(p.q_tokens) token
            where token <> '' and d.search_text like '%' || token || '%'
          )
          else 0
        end
        + case when p.q_norm is not null and d.cameo_search_text like '%' || p.q_norm || '%' then 300 else 0 end
        + case
          when p.q_norm is not null then (
            select count(*)::integer * 70
            from unnest(p.q_tokens) token
            where token <> '' and token <> 'cameo' and d.cameo_search_text like '%' || token || '%'
          )
          else 0
        end
        + case
          when p.q_norm is not null and 'cameo' = any(p.q_tokens) and d.cameo_search_text is not null then 90
          else 0
        end
      )::integer as rank_score
    from docs d
    cross join prepared p
    where (p.object_type_norm is null or d.object_type = p.object_type_norm)
      and (
        p.q_norm is null
        or lower(coalesce(d.public_id, '')) = p.q_norm
        or lower(coalesce(d.parent_gv_id, '')) = p.q_norm
        or lower(coalesce(d.printing_gv_id, '')) = p.q_norm
        or d.search_text like '%' || p.q_norm || '%'
        or d.cameo_search_text like '%' || p.q_norm || '%'
        or not exists (
          select 1
          from unnest(p.q_tokens) token
          where token <> '' and d.search_text not like '%' || token || '%'
        )
      )
  )
  select
    search_document_id,
    object_type,
    parent_gv_id,
    printing_gv_id,
    display_name,
    display_discriminator,
    route_path,
    route_query,
    matched_fields,
    rank_score
  from scored
  where rank_score > 0
  order by rank_score desc, display_name asc, parent_gv_id asc, coalesce(printing_gv_id, '') asc
  limit (select result_limit from prepared)
  offset (select result_offset from prepared);
$$;

CREATE OR REPLACE FUNCTION public.search_card_prints_v1(q text, limit_n integer DEFAULT 30)
 RETURNS TABLE(lane text, card_print_id uuid, set_code text, set_name text, printed_set_abbrev text, printed_total integer, number text, number_plain text, variant_key text, name text, print_identity_key text, image_url text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
with input as (
  select
    q,
    upper(trim(q)) as q_norm
),
tokens as (
  select
    q_norm,
    regexp_matches(q_norm, '([A-Z0-9]+)') as all_tokens,
    regexp_replace(q_norm, '\s+', ' ', 'g') as q_compact
  from input
),
parsed as (
  select
    q_norm,
    q_compact,
    (regexp_matches(q_norm, '([A-Z0-9]+)'))[1] as leading_token,
    (regexp_matches(q_norm, '([0-9]+)(?:\s*/\s*([0-9]+))?'))[1] as number_plain,
    (regexp_matches(q_norm, '([0-9]+)(?:\s*/\s*([0-9]+))?'))[2] as fraction_total,
    trim(
      regexp_replace(
        q_norm,
        '([0-9]+)(\s*/\s*[0-9]+)?\s*$',
        '',
        'i'
      )
    ) as remainder
  from tokens
),
lanes_abbrev as (
  select
    'abbrev_number'::text as lane,
    cp.id as card_print_id,
    cp.set_code,
    s.name as set_name,
    s.printed_set_abbrev,
    coalesce(cp.printed_total, s.printed_total) as printed_total,
    cp.number,
    cp.number_plain,
    cp.variant_key,
    cp.name,
    cp.print_identity_key,
    cp.image_url
  from parsed p
  join public.sets s
    on s.printed_set_abbrev is not null
   and upper(s.printed_set_abbrev) = p.leading_token
  join public.v_card_prints_discovery_v1 cp
    on cp.set_code = s.code
   and cp.number_plain = p.number_plain
  where p.number_plain is not null
),
lanes_setcode as (
  select
    'setcode_number'::text as lane,
    cp.id as card_print_id,
    cp.set_code,
    s.name as set_name,
    s.printed_set_abbrev,
    coalesce(cp.printed_total, s.printed_total) as printed_total,
    cp.number,
    cp.number_plain,
    cp.variant_key,
    cp.name,
    cp.print_identity_key,
    cp.image_url
  from parsed p
  join public.sets s
    on s.code = p.leading_token
  join public.v_card_prints_discovery_v1 cp
    on cp.set_code = s.code
   and cp.number_plain = p.number_plain
  where p.number_plain is not null
),
lanes_name as (
  select
    'name_number'::text as lane,
    cp.id as card_print_id,
    cp.set_code,
    s.name as set_name,
    s.printed_set_abbrev,
    coalesce(cp.printed_total, s.printed_total) as printed_total,
    cp.number,
    cp.number_plain,
    cp.variant_key,
    cp.name,
    cp.print_identity_key,
    cp.image_url
  from parsed p
  join public.v_card_prints_discovery_v1 cp
    on cp.number_plain = p.number_plain
   and cp.name ilike p.remainder || '%'
  join public.sets s
    on s.code = cp.set_code
  where p.number_plain is not null
),
lanes_setname as (
  select
    'setname_number'::text as lane,
    cp.id as card_print_id,
    cp.set_code,
    s.name as set_name,
    s.printed_set_abbrev,
    coalesce(cp.printed_total, s.printed_total) as printed_total,
    cp.number,
    cp.number_plain,
    cp.variant_key,
    cp.name,
    cp.print_identity_key,
    cp.image_url
  from parsed p
  join public.sets s
    on s.name ilike p.remainder || '%'
  join public.v_card_prints_discovery_v1 cp
    on cp.set_code = s.code
   and cp.number_plain = p.number_plain
  where p.number_plain is not null
),
lanes_text as (
  select
    'text'::text as lane,
    cp.id as card_print_id,
    cp.set_code,
    s.name as set_name,
    s.printed_set_abbrev,
    coalesce(cp.printed_total, s.printed_total) as printed_total,
    cp.number,
    cp.number_plain,
    cp.variant_key,
    cp.name,
    cp.print_identity_key,
    cp.image_url
  from parsed p
  join public.v_card_prints_discovery_v1 cp
    on cp.name ilike '%' || p.q_norm || '%'
  join public.sets s
    on s.code = cp.set_code
  where p.number_plain is null
)
select *
from (
  select * from lanes_abbrev
  union all
  select * from lanes_setcode
  union all
  select * from lanes_name
  union all
  select * from lanes_setname
  union all
  select * from lanes_text
) as results
limit limit_n;
$function$
;

CREATE OR REPLACE FUNCTION public.search_card_prints_v1(q text DEFAULT NULL::text, set_code_in text DEFAULT NULL::text, number_in text DEFAULT NULL::text, limit_in integer DEFAULT 50, offset_in integer DEFAULT 0)
 RETURNS SETOF public.v_card_search
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with discovery as materialized (
    select public.get_jungle_edition_discovery_exclusions_v1() as excluded
  ), normalized as (
    select
      nullif(trim(q), '') as q_norm,
      nullif(trim(lower(set_code_in)), '') as set_code_norm,
      nullif((regexp_match(coalesce(trim(number_in), ''), '(\d+)'))[1], '') as num_digits
  ),
  prepared as (
    select
      q_norm,
      set_code_norm,
      num_digits,
      case when num_digits is null then null else lpad(num_digits, 3, '0') end as num_padded
    from normalized
  )
  select v.*
  from public.v_card_search v
  cross join prepared p
  where v.id <> all ((select excluded from discovery)::uuid[])
    and (p.set_code_norm is null or lower(v.set_code) = p.set_code_norm)
    and (
      p.num_digits is null
      or v.number_digits = p.num_digits
      or v.number_padded = p.num_padded
      or (v.number_slashed is not null and v.number_slashed like p.num_padded || '/%')
    )
    and (
      p.q_norm is null or v.name ilike '%' || p.q_norm || '%'
    )
  order by
    case
      when p.num_digits is not null and v.number_digits = p.num_digits then 0
      when p.num_digits is not null and v.number_padded = p.num_padded then 1
      when p.num_digits is not null and v.number_slashed like p.num_padded || '/%' then 2
      else 3
    end,
    case when p.set_code_norm is not null and lower(v.set_code) = p.set_code_norm then 0 else 1 end,
    v.name asc,
    v.id asc
  limit greatest(1, coalesce(limit_in, 50))
  offset greatest(0, coalesce(offset_in, 0));
$function$
;

create or replace function public.user_set_completion_v1(
  p_user_id uuid,
  p_set_id uuid
)
returns table (
  set_id uuid,
  parent_print_count integer,
  variant_option_count integer,
  owned_variant_option_count integer,
  missing_variant_option_count integer,
  completion_percent integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if p_set_id is null then
    raise exception 'p_set_id is required';
  end if;

  if auth.role() <> 'service_role'
     and (auth.uid() is null or auth.uid() <> p_user_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
  with parent_prints as (
    select cp.id
    from public.v_card_prints_discovery_v1 cp
    where cp.set_id = p_set_id
  ),
  child_options as (
    select
      pp.id as card_print_id,
      cpn.id as card_printing_id
    from parent_prints pp
    join public.card_printings cpn
      on cpn.card_print_id = pp.id
  ),
  fallback_options as (
    select
      pp.id as card_print_id,
      null::uuid as card_printing_id
    from parent_prints pp
    where not exists (
      select 1
      from public.card_printings cpn
      where cpn.card_print_id = pp.id
    )
  ),
  options as (
    select * from child_options
    union all
    select * from fallback_options
  ),
  owned_options as (
    select distinct
      o.card_print_id,
      o.card_printing_id
    from options o
    join public.vault_item_instances vii
      on vii.user_id = p_user_id
     and vii.archived_at is null
     and vii.card_print_id = o.card_print_id
     and (
       (o.card_printing_id is not null and vii.card_printing_id = o.card_printing_id)
       or o.card_printing_id is null
     )
  ),
  counts as (
    select
      (select count(*)::integer from parent_prints) as parent_print_count,
      (select count(*)::integer from options) as variant_option_count,
      (select count(*)::integer from owned_options) as owned_variant_option_count
  )
  select
    p_set_id as set_id,
    c.parent_print_count,
    c.variant_option_count,
    c.owned_variant_option_count,
    greatest(c.variant_option_count - c.owned_variant_option_count, 0)::integer as missing_variant_option_count,
    case
      when c.variant_option_count <= 0 then 0
      else round((c.owned_variant_option_count::numeric / c.variant_option_count::numeric) * 100)::integer
    end as completion_percent
  from counts c;
end;
$$;

create or replace function public.interest_graph_completion_snapshot_for_card_v1(
  p_user_id uuid,
  p_card_print_id uuid
)
returns table (
  subject_type text,
  subject_id uuid,
  completion_percent integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_set_id uuid;
  discovery_exclusions uuid[] := public.get_jungle_edition_discovery_exclusions_v1();
begin
  if auth.uid() is distinct from p_user_id and auth.role() <> 'service_role' then
    raise exception 'not_authorized';
  end if;

  if p_user_id is null or p_card_print_id is null then
    return;
  end if;

  select cp.set_id into v_set_id
  from public.card_prints cp
  where cp.id = p_card_print_id;

  if v_set_id is not null then
    return query
    select
      'set'::text as subject_type,
      usc.set_id as subject_id,
      usc.completion_percent
    from public.user_set_completion_v1(p_user_id, v_set_id) usc;
  end if;

  return query
  with touched_species as (
    select distinct gd.species_id
    from public.v_grookai_dex_card_prints_v1 gd
    where gd.card_print_id = p_card_print_id
      and gd.mapping_active = true
      and gd.counts_for_completion = true
  ),
  denominator as (
    select
      gd.species_id,
      count(distinct gd.card_print_id)::integer as total_print_count
    from public.v_grookai_dex_card_prints_v1 gd
    join touched_species ts on ts.species_id = gd.species_id
    where gd.card_print_id <> all(discovery_exclusions)
      and gd.mapping_active = true
      and gd.counts_for_completion = true
    group by gd.species_id
  ),
  owned as (
    select
      gd.species_id,
      count(distinct vii.card_print_id)::integer as owned_print_count
    from public.v_grookai_dex_card_prints_v1 gd
    join touched_species ts on ts.species_id = gd.species_id
    join public.vault_item_instances vii
      on vii.card_print_id = gd.card_print_id
     and vii.user_id = p_user_id
     and vii.archived_at is null
    where gd.card_print_id <> all(discovery_exclusions)
      and gd.mapping_active = true
      and gd.counts_for_completion = true
    group by gd.species_id
  )
  select
    'character'::text as subject_type,
    d.species_id as subject_id,
    case
      when d.total_print_count <= 0 then 0
      else round((coalesce(o.owned_print_count, 0)::numeric / d.total_print_count::numeric) * 100)::integer
    end as completion_percent
  from denominator d
  left join owned o on o.species_id = d.species_id;
end;
$$;

-- Edition assignments deliberately do not share the product-only mapping or
-- generic finish assignment keys. A refreshed observation appends a new frozen
-- assignment; it must never rewrite the meaning of a previous assignment ID.
create table if not exists public.tcgplayer_jungle_edition_assignments_v1 (
  id uuid primary key default gen_random_uuid(),
  source_observation_id uuid not null references public.tcgcsv_source_price_daily_observations(id) on delete restrict,
  source_sync_run_id uuid not null references public.tcgcsv_source_sync_runs(id) on delete restrict,
  binding_id uuid not null references public.tcgplayer_jungle_edition_bindings_v1(id) on delete restrict,
  assignment_version text not null default 'TCGPLAYER_JUNGLE_EDITION_ASSIGNMENT_V1'
    check (assignment_version = 'TCGPLAYER_JUNGLE_EDITION_ASSIGNMENT_V1'),
  assignment_payload jsonb not null,
  assignment_sha256 text not null unique,
  created_at timestamptz not null default now(),
  check (assignment_sha256 = encode(extensions.digest(assignment_payload::text,'sha256'),'hex'))
);

-- Resolve the edition BEFORE choosing a canonical parent. No join to legacy
-- external_mappings participates in this bounded lane, including as fallback.
create or replace view public.v_tcgplayer_jungle_edition_assignment_candidates_v1
with (security_invoker = true) as
with source_run as materialized (
  select run.* from public.tcgcsv_source_sync_runs run
  where run.sync_mode = 'current_full_sync' and run.status = 'completed'
    and run.failed_count = 0 and run.finished_at is not null
  order by run.finished_at desc,run.created_at desc,run.id desc limit 1
), observations as (
  select observation.*,
    count(*) over (partition by observation.product_id,
      lower(btrim(regexp_replace(observation.subtype_name,'[[:space:]]+',' ','g')))) as duplicate_count
  from public.tcgcsv_source_price_daily_observations observation
  join source_run run on run.id = observation.last_seen_run_id and run.observed_on = observation.observed_on
), resolved as (
  select observation.id as source_observation_id,run.id as source_sync_run_id,binding.id as binding_id,
    jsonb_build_object(
      'version','TCGPLAYER_JUNGLE_EDITION_ASSIGNMENT_V1',
      'source',jsonb_build_object(
        'observation_id',observation.id,'sync_run_id',run.id,
        'run_artifact_hash',run.artifact_hash,'sync_finished_at_epoch',extract(epoch from run.finished_at),
        'observed_on',observation.observed_on,'last_observed_at_epoch',extract(epoch from observation.last_observed_at),
        'price_row_identity',observation.source_price_row_identity,'row_hash',observation.payload_hash,
        'raw_payload',observation.raw_payload,
        'artifact_id',artifact.id,'artifact_hash',artifact.sha256,'artifact_byte_size',artifact.byte_size,
        'product_id',observation.product_id,'product_hash',product.payload_hash,
        'category_id',observation.category_id,'group_id',observation.group_id,
        'subtype',observation.subtype_name,'currency',observation.currency,
        'market_price',observation.market_price,'low_price',observation.low_price,
        'mid_price',observation.mid_price,'high_price',observation.high_price,'direct_low_price',observation.direct_low_price),
      'binding',jsonb_build_object('id',binding.id,'identity_link_id',identity.identity_link_id,
        'manifest_sha256',binding.manifest_sha256,'review_ref',binding.review_ref,'link_review_ref',link.review_ref),
      'canonical',jsonb_build_object('legacy_card_print_id',identity.legacy_card_print_id,
        'card_print_id',card.id,'gv_id',card.gv_id,'card_printing_id',child.id,'printing_gv_id',child.printing_gv_id,
        'edition',identity.edition,'finish_key',identity.finish_key,
        'printed_identity_modifier',card.printed_identity_modifier,
        'provenance_source',child.provenance_source,'provenance_ref',child.provenance_ref),
      'reviews',(select jsonb_agg((to_jsonb(review) - 'reviewed_at' - 'created_at' - 'updated_at') ||
        jsonb_build_object('reviewed_at_epoch',extract(epoch from review.reviewed_at),
          'created_at_epoch',extract(epoch from review.created_at),'updated_at_epoch',extract(epoch from review.updated_at)) order by review.id)
        from public.card_printing_truth_reviews review where review.card_printing_id = child.id and review.active)
    ) as assignment_payload
  from observations observation
  join source_run run on run.id = observation.last_seen_run_id
  join public.tcgcsv_source_products product on product.product_id = observation.product_id
  join public.tcgcsv_source_artifacts artifact on artifact.id = observation.source_artifact_id
  cross join lateral public.resolve_tcgplayer_jungle_edition_v1(
    observation.product_id,observation.subtype_name,product.payload_hash) identity
  join public.tcgplayer_jungle_edition_bindings_v1 binding on binding.id = identity.binding_id
  join public.jungle_edition_identity_links_v1 link on link.id = identity.identity_link_id
  join public.card_prints card on card.id = identity.card_print_id
  join public.card_printings child on child.id = identity.card_printing_id
  where observation.duplicate_count = 1 and observation.category_id = 3 and observation.group_id = 635
    and observation.subtype_name in ('Unlimited','Unlimited Holofoil','1st Edition','1st Edition Holofoil')
    and observation.subtype_name_normalized = lower(observation.subtype_name)
    and observation.currency = 'USD' and observation.market_price > 0
    and observation.market_price::text not in ('NaN','Infinity','-Infinity')
    and length(btrim(observation.source_price_row_identity)) > 0
    and observation.payload_hash ~ '^[a-f0-9]{64}$' and run.artifact_hash ~ '^[a-f0-9]{64}$'
    and run.finished_at >= now() - interval '36 hours' and run.finished_at <= now() + interval '6 minutes'
    and artifact.sync_run_id = run.id and artifact.run_key = run.run_key
    and artifact.artifact_kind = 'prices' and artifact.observed_on = observation.observed_on
    and artifact.category_id = observation.category_id and artifact.group_id = observation.group_id
    and artifact.http_status = 200 and artifact.byte_size > 0 and artifact.sha256 ~ '^[a-f0-9]{64}$'
    and public.get_jungle_edition_resolution_v1(card.id)->>'status' = 'ready'
)
select resolved.*,encode(extensions.digest(assignment_payload::text,'sha256'),'hex') as assignment_sha256
from resolved;

create or replace function public.guard_tcgplayer_jungle_edition_assignment_v1()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op <> 'INSERT' then raise exception 'jungle_edition_assignment_is_immutable'; end if;
  if not exists (
    select 1 from public.v_tcgplayer_jungle_edition_assignment_candidates_v1 candidate
    where candidate.source_observation_id = new.source_observation_id
      and candidate.source_sync_run_id = new.source_sync_run_id and candidate.binding_id = new.binding_id
      and candidate.assignment_payload = new.assignment_payload
      and candidate.assignment_sha256 = new.assignment_sha256
  ) then raise exception 'jungle_edition_assignment_evidence_changed'; end if;
  return new;
end;
$$;
drop trigger if exists guard_tcgplayer_jungle_edition_assignment_v1 on public.tcgplayer_jungle_edition_assignments_v1;
create trigger guard_tcgplayer_jungle_edition_assignment_v1 before insert or update or delete
  on public.tcgplayer_jungle_edition_assignments_v1 for each row
  execute function public.guard_tcgplayer_jungle_edition_assignment_v1();

-- Service-only preparation writes this ledger alone. It neither prepares generic
-- assignments nor creates qualifications, snapshots or a current publication.
create or replace function public.prepare_tcgplayer_jungle_edition_assignments_v1(p_source_sync_run_id uuid)
returns integer language plpgsql set search_path = '' as $$
declare inserted_count integer;
begin
  if p_source_sync_run_id is null or p_source_sync_run_id is distinct from (
    select run.id from public.tcgcsv_source_sync_runs run
    where run.sync_mode = 'current_full_sync' and run.status = 'completed'
      and run.failed_count = 0 and run.finished_at is not null
    order by run.finished_at desc,run.created_at desc,run.id desc limit 1
  ) then raise exception 'jungle_edition_assignment_source_run_changed'; end if;
  insert into public.tcgplayer_jungle_edition_assignments_v1
    (source_observation_id,source_sync_run_id,binding_id,assignment_payload,assignment_sha256)
  select candidate.source_observation_id,candidate.source_sync_run_id,candidate.binding_id,
    candidate.assignment_payload,candidate.assignment_sha256
  from public.v_tcgplayer_jungle_edition_assignment_candidates_v1 candidate
  where candidate.source_sync_run_id = p_source_sync_run_id
  on conflict (assignment_sha256) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

-- Revalidate frozen evidence on EVERY read: retired bindings, changed reviews,
-- quote refresh, source drift, hidden parents and stale runs lose eligibility.
create or replace view public.v_tcgplayer_jungle_edition_current_assignments_v1
with (security_invoker = true) as
select assignment.*,false as publishable
from public.tcgplayer_jungle_edition_assignments_v1 assignment
join public.v_tcgplayer_jungle_edition_assignment_candidates_v1 candidate
  on candidate.source_observation_id = assignment.source_observation_id
  and candidate.source_sync_run_id = assignment.source_sync_run_id and candidate.binding_id = assignment.binding_id
  and candidate.assignment_sha256 = assignment.assignment_sha256
  and candidate.assignment_payload = assignment.assignment_payload;

alter table public.tcgplayer_jungle_edition_assignments_v1 enable row level security;
revoke all on public.tcgplayer_jungle_edition_assignments_v1,
  public.v_tcgplayer_jungle_edition_assignment_candidates_v1,public.v_tcgplayer_jungle_edition_current_assignments_v1
  from public,anon,authenticated,service_role;
grant select,insert on public.tcgplayer_jungle_edition_assignments_v1 to service_role;
grant select on public.v_tcgplayer_jungle_edition_assignment_candidates_v1,
  public.v_tcgplayer_jungle_edition_current_assignments_v1 to service_role;
revoke all on function public.guard_tcgplayer_jungle_edition_assignment_v1(),
  public.prepare_tcgplayer_jungle_edition_assignments_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function public.guard_tcgplayer_jungle_edition_assignment_v1(),
  public.prepare_tcgplayer_jungle_edition_assignments_v1(uuid) to service_role;

-- Keep the existing mapping/assignment foreign keys. Edition rows reference the
-- separate ledger rather than pretending its UUID is a product mapping ID.
alter table public.market_price_pipeline_candidates add column if not exists edition_assignment_id uuid
  references public.tcgplayer_jungle_edition_assignments_v1(id) on delete restrict;
alter table public.market_price_qualification_decisions add column if not exists edition_assignment_id uuid
  references public.tcgplayer_jungle_edition_assignments_v1(id) on delete restrict;
alter table public.market_price_publication_snapshots add column if not exists edition_assignment_id uuid
  references public.tcgplayer_jungle_edition_assignments_v1(id) on delete restrict;
alter table public.market_price_publication_snapshots alter column source_mapping_id drop not null;
alter table public.market_price_publication_snapshots alter column variant_assignment_id drop not null;
alter table public.market_price_publication_snapshots drop constraint if exists market_price_snapshot_assignment_lane_v1;
alter table public.market_price_publication_snapshots add constraint market_price_snapshot_assignment_lane_v1 check (
  (edition_assignment_id is null and source_mapping_id is not null and variant_assignment_id is not null)
  or (edition_assignment_id is not null and source_mapping_id is null and variant_assignment_id is null)
);

-- Preserve every source observation, including held rows, for full-run count
-- reconciliation. The old reader remains intact for old workers. V2 overrides
-- identity only inside the edition lane and never substitutes a legacy mapping.
create or replace view public.v_tcgplayer_market_qualification_candidates_v2
with (security_invoker = true) as
-- Keep immutable source selectors outside the record adapter so PostgreSQL can
-- push source-run/product page filters into the indexed base observation query.
select candidate.source_observation_id,
  candidate.source_sync_run_id,
  candidate.source_artifact_id,
  candidate.source_artifact_date,
  candidate.source_artifact_hash,
  candidate.source_artifact_byte_size,
  candidate.source_artifact_http_status,
  candidate.source_price_row_identity,
  candidate.source_row_hash,
  candidate.source_product_id,
  candidate.category_id,
  candidate.group_id,
  candidate.source_subtype_name,
  candidate.subtype_name_normalized,
  candidate.source_observed_on,
  candidate.source_last_observed_at,
  candidate.duplicate_product_row_count,
  candidate.currency,
  candidate.low_price,
  candidate.mid_price,
  candidate.high_price,
  candidate.market_price,
  candidate.direct_low_price,
  candidate.source_product_name,
  candidate.source_product_active,
  candidate.source_product_catalog_status,
  candidate.source_product_extended_data,
  candidate.source_sync_mode,
  candidate.source_sync_status,
  candidate.source_sync_finished_at,
  candidate.source_sync_failed_count,
  candidate.source_run_artifact_hash,
  adapted.normalized_finish_key,
  adapted.source_mapping_count,
  adapted.card_print_mapping_count,
  adapted.card_printing_mapping_count,
  adapted.identity_domain_count,
  adapted.source_mapping_id,
  adapted.source_mapping_meta,
  adapted.card_print_id,
  adapted.gv_id,
  candidate.card_rarity,
  adapted.identity_domain,
  adapted.card_printing_id,
  adapted.printing_gv_id,
  adapted.finish_key,
  adapted.variant_assignment_id,
  adapted.variant_assignment_status,
  adapted.variant_assignment_version,
  adapted.variant_assignment_confidence,
  candidate.has_printed_number_evidence,
  adapted.mapping_method,
  adapted.mapping_confidence,
  adapted.derived_variant_assignment_status,
  adapted.cosmos_finish_authority,
  assignment.id as edition_assignment_id,
  assignment.binding_id as edition_binding_id,assignment.assignment_sha256 as edition_assignment_sha256,
  assignment.assignment_version as edition_assignment_version,
  assignment.assignment_payload as edition_assignment_payload,
  lane.required as edition_assignment_required,
  (assignment.id is not null) as edition_assignment_current,
  case when assignment.id is not null then candidate.source_sync_finished_at::text end as edition_source_sync_finished_at,
  case when lane.required then assignment.assignment_payload#>>'{canonical,printed_identity_modifier}'
    else parent.printed_identity_modifier end as printed_identity_modifier
from public.v_tcgplayer_market_qualification_candidates_v1 candidate
left join public.card_prints parent on parent.id = candidate.card_print_id
cross join lateral (select (
  (candidate.category_id = 3 and candidate.source_subtype_name ~* '\m(edition|unlimited)\M')
  or coalesce(parent.printed_identity_modifier,'') like 'edition:%'
  or exists(select 1 from public.jungle_edition_identity_links_v1 link
    where link.state in ('active','retired') and candidate.card_print_id in (link.legacy_card_print_id,link.card_print_id))
) as required) lane
left join public.v_tcgplayer_jungle_edition_current_assignments_v1 assignment
  on lane.required and assignment.source_observation_id = candidate.source_observation_id
  and assignment.source_sync_run_id = candidate.source_sync_run_id
cross join lateral jsonb_populate_record(null::public.v_tcgplayer_market_qualification_candidates_v1,
  to_jsonb(candidate) || case when lane.required then jsonb_build_object(
    'source_mapping_id',null,'source_mapping_meta',null,'variant_assignment_id',null,
    'source_mapping_count',case when assignment.id is null then 0 else 1 end,
    'card_print_mapping_count',case when assignment.id is null then 0 else 1 end,
    'card_printing_mapping_count',case when assignment.id is null then 0 else 1 end,
    'identity_domain_count',case when assignment.id is null then 0 else 1 end,
    'identity_domain',case when assignment.id is not null then 'pokemon_eng_standard' end,
    'card_print_id',assignment.assignment_payload#>'{canonical,card_print_id}',
    'card_printing_id',assignment.assignment_payload#>'{canonical,card_printing_id}',
    'gv_id',assignment.assignment_payload#>'{canonical,gv_id}',
    'printing_gv_id',assignment.assignment_payload#>'{canonical,printing_gv_id}',
    'finish_key',assignment.assignment_payload#>'{canonical,finish_key}',
    'normalized_finish_key',assignment.assignment_payload#>'{canonical,finish_key}',
    'variant_assignment_status',case when assignment.id is not null then 'exact_child_finish' end,
    'derived_variant_assignment_status',case when assignment.id is not null then 'exact_child_finish' end,
    'variant_assignment_version',assignment.assignment_version,
    'variant_assignment_confidence',case when assignment.id is not null then 1 end,
    'mapping_method',case when assignment.id is not null then 'jungle_edition_binding_v1' end,
    'mapping_confidence',case when assignment.id is not null then 1 end,
    'cosmos_finish_authority',false
  ) else '{}'::jsonb end) adapted;

-- Used only after narrowing to edition rows. It reads authoritative current
-- assignments; row metadata or a caller-supplied boolean cannot grant admission.
create or replace function public.jungle_edition_price_row_valid_v1(row_data jsonb)
returns boolean language plpgsql stable set search_path = '' as $$
declare frozen jsonb; expected record; field_name text;
begin
  if row_data->>'edition_assignment_id' is null then return false; end if;
  select assignment.assignment_payload into frozen
  from public.v_tcgplayer_jungle_edition_current_assignments_v1 assignment
  where assignment.id = (row_data->>'edition_assignment_id')::uuid;
  if not found then return false; end if;
  if row_data->>'source_mapping_id' is not null or row_data->>'variant_assignment_id' is not null then return false; end if;
  if row_data ? 'edition_assignment_payload' and row_data->'edition_assignment_payload' is distinct from frozen then return false; end if;
  for expected in select * from jsonb_each_text(jsonb_build_object(
    'variant_assignment_version','TCGPLAYER_JUNGLE_EDITION_ASSIGNMENT_V1',
    'variant_assignment_status','exact_child_finish','mapping_method','jungle_edition_binding_v1',
    'language_result','english','finish_result','exact_child_finish','source_integrity_result','passed',
    'duplicate_product_result','unique','freshness_result','fresh'
  )) loop
    if row_data ? expected.key and row_data->>expected.key is distinct from expected.value then return false; end if;
  end loop;
  for expected in select * from jsonb_each_text(jsonb_build_object(
    'source_observation_id',frozen#>'{source,observation_id}','source_sync_run_id',frozen#>'{source,sync_run_id}',
    'source_artifact_id',frozen#>'{source,artifact_id}','source_artifact_hash',frozen#>'{source,artifact_hash}',
    'source_product_id',frozen#>'{source,product_id}','source_subtype_name',frozen#>'{source,subtype}',
    'source_row_hash',frozen#>'{source,row_hash}','source_price_row_identity',frozen#>'{source,price_row_identity}',
    'currency',frozen#>'{source,currency}','card_print_id',frozen#>'{canonical,card_print_id}',
    'card_printing_id',frozen#>'{canonical,card_printing_id}','gv_id',frozen#>'{canonical,gv_id}',
    'printing_gv_id',frozen#>'{canonical,printing_gv_id}','finish_key',frozen#>'{canonical,finish_key}'
  )) loop
    if row_data->>expected.key is distinct from expected.value then return false; end if;
  end loop;
  if (row_data->>'source_artifact_date')::date is distinct from (frozen#>>'{source,observed_on}')::date
    or (row_data->>'source_observed_on')::date is distinct from (frozen#>>'{source,observed_on}')::date
    or (row_data->>'market_price')::numeric is distinct from (frozen#>>'{source,market_price}')::numeric
    or extract(epoch from (row_data->>'source_sync_finished_at')::timestamptz)
      is distinct from (frozen#>>'{source,sync_finished_at_epoch}')::numeric then return false; end if;
  foreach field_name in array array['low_price','mid_price','high_price','direct_low_price'] loop
    if row_data ? field_name and (row_data->>field_name)::numeric
      is distinct from (frozen->'source'->>field_name)::numeric then return false; end if;
  end loop;
  return true;
exception when invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
  return false;
end;
$$;

-- Statement-level validation first narrows the incoming batch using the actual
-- observation and canonical row. Lying about a subtype cannot select the generic
-- lane, and ordinary Pokemon/MTG batches do not revalidate edition views per row.
create or replace function public.guard_jungle_edition_price_batch_v1()
returns trigger language plpgsql set search_path = '' as $$
declare row_data jsonb; matched boolean;
begin
  for row_data in
    select to_jsonb(incoming)
    from new_edition_price_rows incoming
    join public.tcgcsv_source_price_daily_observations observation on observation.id = incoming.source_observation_id
    left join public.card_prints card on card.id = incoming.card_print_id
    where (tg_table_name = 'market_price_publication_snapshots' or to_jsonb(incoming)->>'eligible' = 'true')
      and (incoming.edition_assignment_id is not null
        or (observation.category_id = 3 and observation.subtype_name ~* '\m(edition|unlimited)\M')
        or coalesce(card.printed_identity_modifier,'') like 'edition:%'
        or exists(select 1 from public.jungle_edition_identity_links_v1 link where link.state in ('active','retired')
          and incoming.card_print_id in (link.legacy_card_print_id,link.card_print_id)))
  loop
    if row_data->>'policy_version' <> 'TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3'
      or not public.jungle_edition_price_row_valid_v1(row_data) then
      raise exception 'jungle_edition_price_assignment_invalid';
    end if;
    if tg_table_name = 'market_price_qualification_decisions' then
      select exists(select 1 from public.market_price_pipeline_candidates candidate
        where candidate.id = (row_data->>'pipeline_candidate_id')::uuid
          and candidate.run_id = (row_data->>'run_id')::uuid
          and candidate.edition_assignment_id = (row_data->>'edition_assignment_id')::uuid
          and candidate.source_observation_id = (row_data->>'source_observation_id')::uuid
          and public.jungle_edition_price_row_valid_v1(candidate.candidate_payload)) into matched;
    else
      select exists(select 1 from public.market_price_qualification_decisions qualified
        where qualified.id = (row_data->>'qualification_decision_id')::uuid
          and qualified.run_id = (row_data->>'run_id')::uuid
          and qualified.edition_assignment_id = (row_data->>'edition_assignment_id')::uuid
          and qualified.eligible and qualified.decision = 'publish' and qualified.publication_lane = 'current'
          and public.jungle_edition_price_row_valid_v1(to_jsonb(qualified))) into matched;
    end if;
    if not matched then raise exception 'jungle_edition_price_lineage_invalid'; end if;
  end loop;
  return null;
end;
$$;
drop trigger if exists guard_jungle_edition_qualification_v1 on public.market_price_qualification_decisions;
create trigger guard_jungle_edition_qualification_v1 after insert on public.market_price_qualification_decisions
  referencing new table as new_edition_price_rows for each statement execute function public.guard_jungle_edition_price_batch_v1();
drop trigger if exists guard_jungle_edition_snapshot_v1 on public.market_price_publication_snapshots;
create trigger guard_jungle_edition_snapshot_v1 after insert on public.market_price_publication_snapshots
  referencing new table as new_edition_price_rows for each statement execute function public.guard_jungle_edition_price_batch_v1();

-- The existing atomic activation and rollback functions retain their checks.
-- This additional pointer trigger also covers direct service-role pointer writes.
create or replace function public.guard_jungle_edition_publication_pointer_v1()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists(select 1 from public.market_price_publication_snapshots snapshot
    join public.tcgcsv_source_price_daily_observations observation on observation.id = snapshot.source_observation_id
    left join public.card_prints card on card.id = snapshot.card_print_id
    where snapshot.publication_set_id = new.publication_set_id
      and (snapshot.edition_assignment_id is not null
        or (observation.category_id = 3 and observation.subtype_name ~* '\m(edition|unlimited)\M')
        or coalesce(card.printed_identity_modifier,'') like 'edition:%'
        or exists(select 1 from public.jungle_edition_identity_links_v1 link where link.state in ('active','retired')
          and snapshot.card_print_id in (link.legacy_card_print_id,link.card_print_id)))
      and (snapshot.run_id <> new.run_id or not public.jungle_edition_price_row_valid_v1(to_jsonb(snapshot)))) then
    raise exception 'jungle_edition_publication_assignment_changed';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_jungle_edition_publication_pointer_v1 on public.market_price_current_publication;
create trigger guard_jungle_edition_publication_pointer_v1 before insert or update on public.market_price_current_publication
  for each row execute function public.guard_jungle_edition_publication_pointer_v1();

revoke all on public.v_tcgplayer_market_qualification_candidates_v2 from public,anon,authenticated,service_role;
grant select on public.v_tcgplayer_market_qualification_candidates_v2 to service_role;
revoke all on function public.jungle_edition_price_row_valid_v1(jsonb),public.guard_jungle_edition_price_batch_v1(),
  public.guard_jungle_edition_publication_pointer_v1() from public,anon,authenticated,service_role;
grant execute on function public.jungle_edition_price_row_valid_v1(jsonb),public.guard_jungle_edition_price_batch_v1(),
  public.guard_jungle_edition_publication_pointer_v1() to service_role;

-- Revalidate edition assignments at current read time; historical snapshots stay immutable.
create or replace view public.v_market_price_current_v1 as
with current_snapshots as (
  select
    snapshot.*,
    row_number() over (
      partition by snapshot.card_printing_id
      order by snapshot.source_observed_on desc,
        snapshot.published_at desc,
        snapshot.id desc
    ) as snapshot_rank
  from public.market_price_publication_snapshots snapshot
  join public.market_price_current_publication current_state
    on current_state.publication_set_id = snapshot.publication_set_id
   and current_state.run_id = snapshot.run_id
  join public.market_price_publication_sets publication_set
    on publication_set.id = current_state.publication_set_id
   and publication_set.run_id = current_state.run_id
   and publication_set.publication_state = 'published'
  join public.market_price_pipeline_runs pipeline_run
    on pipeline_run.id = publication_set.run_id
   and pipeline_run.reconciliation_state = 'reconciled'
   and pipeline_run.state in ('published', 'verified')
  join public.market_price_qualification_decisions decision
    on decision.id = snapshot.qualification_decision_id
   and decision.run_id = snapshot.run_id
   and decision.eligible = true
   and decision.decision = 'publish'
   and decision.publication_lane = 'current'
  where snapshot.publication_set_id = publication_set.id
    and snapshot.run_id = pipeline_run.id
    and snapshot.publication_state = 'published'
    and snapshot.freshness_state = 'fresh'
    and (case when snapshot.edition_assignment_id is not null or exists (
        select 1 from public.jungle_edition_identity_links_v1 edition_link
        where edition_link.state in ('active','retired')
          and snapshot.card_print_id in (edition_link.legacy_card_print_id,edition_link.card_print_id)
      ) then public.jungle_edition_price_row_valid_v1(to_jsonb(snapshot)) else true end)
      and snapshot.source_sync_finished_at >= now() - interval '36 hours'
    and not exists (
      select 1
      from public.card_printing_truth_reviews truth_review
      where truth_review.card_printing_id = snapshot.card_printing_id
        and truth_review.active = true
        and truth_review.public_visibility in (
          'hidden_pending_review',
          'hidden_unsupported'
        )
    )
)
select
  snapshot.card_print_id,
  snapshot.card_printing_id,
  snapshot.gv_id,
  snapshot.printing_gv_id,
  snapshot.finish_key,
  snapshot.currency,
  snapshot.market_price,
  snapshot.low_price,
  snapshot.mid_price,
  snapshot.high_price,
  snapshot.direct_low_price,
  snapshot.source_name,
  snapshot.source_label,
  snapshot.source_observed_on,
  snapshot.source_sync_finished_at as observed_at,
  snapshot.published_at,
  'fresh'::text as freshness,
  extract(epoch from (now() - snapshot.source_sync_finished_at))::bigint
    as age_seconds,
  snapshot.provenance_id,
  snapshot.policy_version,
  snapshot.publication_set_id,
  snapshot.run_id
from current_snapshots snapshot
where snapshot.snapshot_rank = 1;

create or replace function public.get_market_pricing_read_model_v1(
  p_card_print_ids uuid[] default null,
  p_card_printing_ids uuid[] default null
)
returns table (
  pricing_scope text,
  card_print_id uuid,
  card_printing_id uuid,
  gv_id text,
  printing_gv_id text,
  finish_key text,
  status text,
  unavailable_reason text,
  currency text,
  market_close numeric,
  source_name text,
  source_label text,
  observed_at timestamptz,
  published_at timestamptz,
  freshness text,
  low_price numeric,
  mid_price numeric,
  high_price numeric,
  direct_low_price numeric,
  is_from_price boolean,
  eligible_printing_count integer,
  lowest_active_ask numeric,
  active_ask_listing_count integer,
  active_ask_observed_at timestamptz,
  provenance_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  with requested_parents as materialized (
    select distinct requested.card_print_id
    from unnest(coalesce(p_card_print_ids, '{}'::uuid[]))
      as requested(card_print_id)
  ),
  requested_printings as materialized (
    select distinct requested.card_printing_id
    from unnest(coalesce(p_card_printing_ids, '{}'::uuid[]))
      as requested(card_printing_id)
  ),
  current_context as materialized (
    select
      current_state.publication_set_id,
      current_state.run_id
    from public.market_price_current_publication current_state
    join public.market_price_publication_sets publication_set
      on publication_set.id = current_state.publication_set_id
     and publication_set.run_id = current_state.run_id
     and publication_set.publication_state = 'published'
    join public.market_price_pipeline_runs pipeline_run
      on pipeline_run.id = publication_set.run_id
     and pipeline_run.reconciliation_state = 'reconciled'
     and pipeline_run.state in ('published', 'verified')
    where current_state.singleton
  ),
  requested_parent_prices as materialized (
    select distinct on (snapshot.card_printing_id)
      snapshot.card_print_id,
      snapshot.card_printing_id,
      snapshot.gv_id,
      snapshot.printing_gv_id,
      snapshot.finish_key,
      snapshot.currency,
      snapshot.market_price,
      snapshot.low_price,
      snapshot.mid_price,
      snapshot.high_price,
      snapshot.direct_low_price,
      snapshot.source_sync_finished_at as observed_at,
      snapshot.published_at,
      'fresh'::text as freshness,
      snapshot.provenance_id
    from requested_parents requested
    join current_context current_state on true
    join public.market_price_publication_snapshots snapshot
      on snapshot.publication_set_id = current_state.publication_set_id
     and snapshot.run_id = current_state.run_id
     and snapshot.card_print_id = requested.card_print_id
    join public.market_price_qualification_decisions decision
      on decision.id = snapshot.qualification_decision_id
     and decision.run_id = snapshot.run_id
     and decision.eligible = true
     and decision.decision = 'publish'
     and decision.publication_lane = 'current'
    where snapshot.publication_state = 'published'
      and snapshot.freshness_state = 'fresh'
      and (case when snapshot.edition_assignment_id is not null or exists (
        select 1 from public.jungle_edition_identity_links_v1 edition_link
        where edition_link.state in ('active','retired')
          and snapshot.card_print_id in (edition_link.legacy_card_print_id,edition_link.card_print_id)
      ) then public.jungle_edition_price_row_valid_v1(to_jsonb(snapshot)) else true end)
      and snapshot.source_sync_finished_at >= now() - interval '36 hours'
      and not exists (
        select 1
        from public.card_printing_truth_reviews truth_review
        where truth_review.card_printing_id = snapshot.card_printing_id
          and truth_review.active = true
          and truth_review.public_visibility in (
            'hidden_pending_review',
            'hidden_unsupported'
          )
      )
    order by
      snapshot.card_printing_id,
      snapshot.source_observed_on desc,
      snapshot.published_at desc,
      snapshot.id desc
  ),
  requested_printing_prices as materialized (
    select distinct on (snapshot.card_printing_id)
      snapshot.card_print_id,
      snapshot.card_printing_id,
      snapshot.gv_id,
      snapshot.printing_gv_id,
      snapshot.finish_key,
      snapshot.currency,
      snapshot.market_price,
      snapshot.low_price,
      snapshot.mid_price,
      snapshot.high_price,
      snapshot.direct_low_price,
      snapshot.source_sync_finished_at as observed_at,
      snapshot.published_at,
      'fresh'::text as freshness,
      snapshot.provenance_id
    from requested_printings requested
    join current_context current_state on true
    join public.market_price_publication_snapshots snapshot
      on snapshot.publication_set_id = current_state.publication_set_id
     and snapshot.run_id = current_state.run_id
     and snapshot.card_printing_id = requested.card_printing_id
    join public.market_price_qualification_decisions decision
      on decision.id = snapshot.qualification_decision_id
     and decision.run_id = snapshot.run_id
     and decision.eligible = true
     and decision.decision = 'publish'
     and decision.publication_lane = 'current'
    where snapshot.publication_state = 'published'
      and snapshot.freshness_state = 'fresh'
      and (case when snapshot.edition_assignment_id is not null or exists (
        select 1 from public.jungle_edition_identity_links_v1 edition_link
        where edition_link.state in ('active','retired')
          and snapshot.card_print_id in (edition_link.legacy_card_print_id,edition_link.card_print_id)
      ) then public.jungle_edition_price_row_valid_v1(to_jsonb(snapshot)) else true end)
      and snapshot.source_sync_finished_at >= now() - interval '36 hours'
      and not exists (
        select 1
        from public.card_printing_truth_reviews truth_review
        where truth_review.card_printing_id = snapshot.card_printing_id
          and truth_review.active = true
          and truth_review.public_visibility in (
            'hidden_pending_review',
            'hidden_unsupported'
          )
      )
    order by
      snapshot.card_printing_id,
      snapshot.source_observed_on desc,
      snapshot.published_at desc,
      snapshot.id desc
  ),
  ranked_parent_prices as materialized (
    select
      current_price.*,
      count(*) over (
        partition by current_price.card_print_id
      )::integer as eligible_printing_count,
      row_number() over (
        partition by current_price.card_print_id
        order by
          current_price.market_price asc,
          current_price.published_at desc,
          current_price.observed_at desc,
          current_price.card_printing_id asc
      ) as parent_price_rank
    from requested_parent_prices current_price
  ),
  parent_active_asks as materialized (
    select
      current_price.card_print_id,
      min(active_ask.lowest_active_ask)::numeric as lowest_active_ask,
      sum(coalesce(active_ask.listing_count, 0))::integer
        as active_ask_listing_count,
      max(active_ask.observed_at) as active_ask_observed_at
    from requested_parent_prices current_price
    left join public.mv_market_listing_active_ask_current_v1 active_ask
      on active_ask.card_printing_id = current_price.card_printing_id
    group by current_price.card_print_id
  ),
  parent_summaries as materialized (
    select
      selected.card_print_id,
      selected.card_printing_id,
      selected.gv_id,
      selected.printing_gv_id,
      selected.finish_key,
      selected.currency,
      selected.market_price::numeric as market_close,
      selected.eligible_printing_count,
      (selected.eligible_printing_count > 1) as is_from_price,
      selected.observed_at,
      selected.published_at,
      selected.freshness,
      selected.provenance_id,
      active_ask.lowest_active_ask,
      active_ask.active_ask_listing_count,
      active_ask.active_ask_observed_at
    from ranked_parent_prices selected
    left join parent_active_asks active_ask
      on active_ask.card_print_id = selected.card_print_id
    where selected.parent_price_rank = 1
  ),
  latest_parent_decisions as materialized (
    select
      requested.card_print_id,
      latest.reason_codes,
      latest.freshness_result,
      latest.publication_lane
    from requested_parents requested
    left join lateral (
      select
        decision.reason_codes,
        decision.freshness_result,
        decision.publication_lane
      from public.market_price_qualification_decisions decision
      join public.market_price_pipeline_runs pipeline_run
        on pipeline_run.id = decision.run_id
       and pipeline_run.run_mode in ('canary', 'production')
       and pipeline_run.state not in ('failed', 'rolled_back')
      where decision.card_print_id = requested.card_print_id
      order by decision.evaluated_at desc, decision.id desc
      limit 1
    ) latest on true
  ),
  latest_printing_decisions as materialized (
    select
      requested.card_printing_id,
      latest.reason_codes,
      latest.freshness_result,
      latest.publication_lane
    from requested_printings requested
    left join lateral (
      select
        decision.reason_codes,
        decision.freshness_result,
        decision.publication_lane
      from public.market_price_qualification_decisions decision
      join public.market_price_pipeline_runs pipeline_run
        on pipeline_run.id = decision.run_id
       and pipeline_run.run_mode in ('canary', 'production')
       and pipeline_run.state not in ('failed', 'rolled_back')
      where decision.card_printing_id = requested.card_printing_id
      order by decision.evaluated_at desc, decision.id desc
      limit 1
    ) latest on true
  )
  select
    'parent'::text,
    requested.card_print_id,
    parent.card_printing_id,
    card.gv_id,
    parent.printing_gv_id,
    parent.finish_key,
    case when parent.card_print_id is null then 'unavailable' else 'available' end,
    case
      when parent.card_print_id is not null then null::text
      when latest.freshness_result = 'delayed'
        then 'source_freshness_delayed'
      when latest.freshness_result = 'suppressed_stale'
        then 'suppressed_stale'
      when cardinality(latest.reason_codes) > 0 then latest.reason_codes[1]
      else 'no_current_qualified_market_price'
    end,
    parent.currency,
    parent.market_close,
    'tcgplayer'::text,
    case
      when parent.is_from_price then 'From TCGPlayer Market'
      else 'TCGPlayer Market'
    end,
    parent.observed_at,
    parent.published_at,
    coalesce(parent.freshness, latest.freshness_result, 'unavailable'),
    null::numeric,
    null::numeric,
    null::numeric,
    null::numeric,
    coalesce(parent.is_from_price, false),
    coalesce(parent.eligible_printing_count, 0),
    parent.lowest_active_ask,
    parent.active_ask_listing_count,
    parent.active_ask_observed_at,
    parent.provenance_id
  from requested_parents requested
  left join public.card_prints card
    on card.id = requested.card_print_id
  left join parent_summaries parent
    on parent.card_print_id = requested.card_print_id
  left join latest_parent_decisions latest
    on latest.card_print_id = requested.card_print_id

  union all

  select
    'card_printing'::text,
    printing.card_print_id,
    requested.card_printing_id,
    card.gv_id,
    printing.printing_gv_id,
    printing.finish_key,
    case when exact.card_printing_id is null then 'unavailable' else 'available' end,
    case
      when exact.card_printing_id is not null then null::text
      when latest.freshness_result = 'delayed'
        then 'source_freshness_delayed'
      when latest.freshness_result = 'suppressed_stale'
        then 'suppressed_stale'
      when cardinality(latest.reason_codes) > 0 then latest.reason_codes[1]
      else 'no_current_qualified_market_price'
    end,
    exact.currency,
    exact.market_price,
    'tcgplayer'::text,
    'TCGPlayer Market'::text,
    exact.observed_at,
    exact.published_at,
    coalesce(exact.freshness, latest.freshness_result, 'unavailable'),
    exact.low_price,
    exact.mid_price,
    exact.high_price,
    exact.direct_low_price,
    false,
    case when exact.card_printing_id is null then 0 else 1 end,
    active_ask.lowest_active_ask,
    active_ask.listing_count,
    active_ask.observed_at,
    exact.provenance_id
  from requested_printings requested
  left join public.card_printings printing
    on printing.id = requested.card_printing_id
  left join public.card_prints card
    on card.id = printing.card_print_id
  left join requested_printing_prices exact
    on exact.card_printing_id = requested.card_printing_id
  left join public.mv_market_listing_active_ask_current_v1 active_ask
    on active_ask.card_printing_id = requested.card_printing_id
  left join latest_printing_decisions latest
    on latest.card_printing_id = requested.card_printing_id
  order by 1, 2, 6 nulls first;
$$;

notify pgrst, 'reload schema';
commit;
