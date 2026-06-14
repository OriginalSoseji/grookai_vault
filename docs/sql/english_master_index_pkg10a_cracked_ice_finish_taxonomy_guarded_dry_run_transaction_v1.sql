-- English Master Index PKG-10A-CRACKED-ICE-FINISH-TAXONOMY-ACTIVATION guarded dry-run transaction V1
-- Rollback-only artifact. No COMMIT path.
-- Source artifact fingerprint: 382e2fab7154d290b90f4f0bda40941b4b353e8844459c4d03a7225b158d026b
-- Package fingerprint: 883bd24d352b7029e8e9fed6241ca058f1ec1ed12cb82ec37e247a188d4bf1e5

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

insert into public.finish_keys (key, label, sort_order, is_active, meta)
values (
  'cracked_ice',
  'Cracked Ice Holo',
  36,
  true,
  jsonb_build_object(
    'source_contract', 'VERIFIED_MASTER_SET_INDEX_V1',
    'source_package', 'PKG-10A-CRACKED-ICE-FINISH-TAXONOMY-ACTIVATION',
    'source_readiness_fingerprint', '382e2fab7154d290b90f4f0bda40941b4b353e8844459c4d03a7225b158d026b',
    'notes', 'Source-backed cracked ice holo finish used by verified English Master Index printings. Taxonomy activation only; no child printings are inserted by this package.'
  )
)
on conflict (key) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = true,
  meta = public.finish_keys.meta || excluded.meta;

do $$
declare
  active_count int;
  candidate_count int := 131;
begin
  select count(*) into active_count
  from public.finish_keys
  where key = 'cracked_ice'
    and label = 'Cracked Ice Holo'
    and sort_order = 36
    and is_active = true;

  if active_count <> 1 then
    raise exception 'PKG-10A cracked_ice finish activation proof failed: %', active_count;
  end if;

  if candidate_count <> 131 then
    raise exception 'PKG-10A cracked_ice candidate count drift: %', candidate_count;
  end if;
end $$;

select
  'PKG-10A-CRACKED-ICE-FINISH-TAXONOMY-ACTIVATION'::text as package_id,
  '382e2fab7154d290b90f4f0bda40941b4b353e8844459c4d03a7225b158d026b'::text as source_readiness_fingerprint,
  '883bd24d352b7029e8e9fed6241ca058f1ec1ed12cb82ec37e247a188d4bf1e5'::text as package_fingerprint,
  'cracked_ice'::text as finish_key,
  'Cracked Ice Holo'::text as finish_label,
  36::int as finish_sort_order,
  (select count(*) from public.finish_keys where key = 'cracked_ice' and is_active = true)::int as activated_finish_rows,
  131::int as cracked_ice_candidate_rows;

rollback;
