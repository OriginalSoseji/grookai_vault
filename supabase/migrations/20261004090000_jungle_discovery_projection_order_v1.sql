-- Preserve the live discovery projection order explicitly. SELECT * inherited
-- different card_prints storage order on fresh replay. No card data changes.
begin;
do $guard$
declare actual text[]; canonical constant text[] := array['id','game_id','set_id','name','number','variant_key','rarity','image_url','tcgplayer_id','external_ids','updated_at','set_code','artist','regulation_mark','image_alt_url','image_source','variants','created_at','last_synced_at','print_identity_key','ai_metadata','image_hash','data_quality_flags','image_status','image_res','image_last_checked_at','printed_set_abbrev','printed_total','number_plain','gv_id','image_path','identity_domain','printed_identity_modifier','set_identity_model','representative_image_url','image_note']::text[];
  replay_order constant text[] := array['id','game_id','set_id','name','number','variant_key','rarity','image_url','tcgplayer_id','external_ids','updated_at','set_code','number_plain','artist','regulation_mark','image_alt_url','image_source','variants','created_at','last_synced_at','print_identity_key','ai_metadata','image_hash','data_quality_flags','image_status','image_res','image_last_checked_at','printed_set_abbrev','printed_total','gv_id','image_path','identity_domain','printed_identity_modifier','set_identity_model','representative_image_url','image_note']::text[];
begin
  select array_agg(attname::text order by attnum) into actual from pg_attribute
   where attrelid='public.v_card_prints_discovery_v1'::regclass and attnum>0 and not attisdropped;
  if actual is distinct from canonical and actual is distinct from replay_order then
    raise exception 'JUNGLE_DISCOVERY_UNEXPECTED_PROJECTION';
  end if;
  if not exists(select 1 from pg_class where oid='public.v_card_prints_discovery_v1'::regclass
    and relkind='v' and relowner=(select oid from pg_roles where rolname='postgres')
    and reloptions @> array['security_invoker=true']) then
    raise exception 'JUNGLE_DISCOVERY_UNEXPECTED_SECURITY';
  end if;
  -- The attested production view already has canonical order and retains its OID.
  -- Only the historical fresh-replay layout needs replacement. RESTRICT refuses
  -- unexpected stored dependents; never cascade or alter the base table.
  if actual = replay_order then
    drop view public.v_card_prints_discovery_v1 restrict;
  end if;
end;
$guard$;
create or replace view public.v_card_prints_discovery_v1 with (security_invoker=true) as
select
  card.id,
  card.game_id,
  card.set_id,
  card.name,
  card.number,
  card.variant_key,
  card.rarity,
  card.image_url,
  card.tcgplayer_id,
  card.external_ids,
  card.updated_at,
  card.set_code,
  card.artist,
  card.regulation_mark,
  card.image_alt_url,
  card.image_source,
  card.variants,
  card.created_at,
  card.last_synced_at,
  card.print_identity_key,
  card.ai_metadata,
  card.image_hash,
  card.data_quality_flags,
  card.image_status,
  card.image_res,
  card.image_last_checked_at,
  card.printed_set_abbrev,
  card.printed_total,
  card.number_plain,
  card.gv_id,
  card.image_path,
  card.identity_domain,
  card.printed_identity_modifier,
  card.set_identity_model,
  card.representative_image_url,
  card.image_note
from public.card_prints card
where card.id <> all ((select public.get_jungle_edition_discovery_exclusions_v1())::uuid[]);
revoke all on public.v_card_prints_discovery_v1 from public,anon,authenticated,service_role;
grant select on public.v_card_prints_discovery_v1 to anon,authenticated,service_role;
commit;
