-- PKG-28B-EXTERNAL-MAPPING-TRANSFER-CHILD-DELETE GUARDED DRY-RUN TRANSACTION V1
-- Generated for review only. This artifact intentionally ends with ROLLBACK.
-- Package fingerprint: 9a4b671f19abe698262b55d2c5d9cbe7dc3ab068b74146e2341489de5cfea9ee
-- Scope: 4 external mapping transfers and 4 unsupported child deletes.
-- No parent writes. No migrations. No global apply.

begin;

create temporary table pkg28b_targets (
  mapping_id uuid primary key,
  source_card_printing_id uuid not null,
  target_card_printing_id uuid not null,
  set_key text not null,
  card_name text not null,
  finish_key text not null,
  source text not null,
  external_id text not null
) on commit drop;

insert into pkg28b_targets (
  mapping_id,
  source_card_printing_id,
  target_card_printing_id,
  set_key,
  card_name,
  finish_key,
  source,
  external_id
) values
  ('ab277b4a-19d9-4fb4-8a59-9723cf348a2c'::uuid, 'be415b20-0da5-4493-a30c-10f0cdfe34cb'::uuid, '37a6be79-4e47-4aec-a567-5ad9865c872b'::uuid, 'ecard2', 'Ampharos', 'holo', 'tcgdex', 'ecard2-H01'),
  ('11f1dc82-9ceb-4443-9ba5-712b1451b406'::uuid, '6971fe2c-bcdf-4671-bf82-28738595ce96'::uuid, 'e0295a7f-de79-4a1f-a95b-28ce8b3b4105'::uuid, 'ecard2', 'Bellossom', 'holo', 'tcgdex', 'ecard2-H05'),
  ('21e03600-abc5-41ef-9bb3-68c24e7a4abb'::uuid, '390b57da-d2dc-4815-9069-312516ecba23'::uuid, 'ffe8d593-ffc2-4539-8795-0e64b8d7c858'::uuid, 'ecard2', 'Blissey', 'holo', 'tcgdex', 'ecard2-H06'),
  ('8a3b635a-f459-4026-ae37-9fb6b2c347c7'::uuid, '50940a33-ce3f-48ed-b7c3-3aa65bac051e'::uuid, '50c11bac-6547-4c74-8b59-459a84c0bb32'::uuid, 'ecard3', 'Magcargo', 'holo', 'tcgdex', 'ecard3-H17');

do $$
declare
  v_targets integer;
  v_bad_mapping_refs integer;
  v_missing_children integer;
  v_finish_mismatch integer;
  v_duplicate_target_mappings integer;
  v_other_external_mapping_refs integer;
  v_vault_refs integer;
  v_warehouse_refs integer;
  v_updated integer;
  v_deleted integer;
begin
  select count(*) into v_targets from pkg28b_targets;
  if v_targets <> 4 then
    raise exception 'PKG-28B-EXTERNAL-MAPPING-TRANSFER-CHILD-DELETE target guard failed: expected 4, got %', v_targets;
  end if;

  select count(*) into v_bad_mapping_refs
  from pkg28b_targets t
  left join public.external_printing_mappings em on em.id = t.mapping_id
  where em.id is null
     or em.card_printing_id <> t.source_card_printing_id
     or em.source <> t.source
     or em.external_id <> t.external_id;
  if v_bad_mapping_refs <> 0 then
    raise exception 'PKG-28B-EXTERNAL-MAPPING-TRANSFER-CHILD-DELETE mapping ownership guard failed: %', v_bad_mapping_refs;
  end if;

  select count(*) into v_missing_children
  from pkg28b_targets t
  left join public.card_printings source_child on source_child.id = t.source_card_printing_id
  left join public.card_printings target_child on target_child.id = t.target_card_printing_id
  where source_child.id is null
     or target_child.id is null
     or source_child.id = target_child.id;
  if v_missing_children <> 0 then
    raise exception 'PKG-28B-EXTERNAL-MAPPING-TRANSFER-CHILD-DELETE child existence guard failed: %', v_missing_children;
  end if;

  select count(*) into v_finish_mismatch
  from pkg28b_targets t
  join public.card_printings source_child on source_child.id = t.source_card_printing_id
  join public.card_printings target_child on target_child.id = t.target_card_printing_id
  where source_child.finish_key <> t.finish_key
     or target_child.finish_key <> t.finish_key;
  if v_finish_mismatch <> 0 then
    raise exception 'PKG-28B-EXTERNAL-MAPPING-TRANSFER-CHILD-DELETE finish guard failed: %', v_finish_mismatch;
  end if;

  select count(*) into v_duplicate_target_mappings
  from pkg28b_targets t
  join public.external_printing_mappings em
    on em.card_printing_id = t.target_card_printing_id
   and em.source = t.source
   and em.external_id = t.external_id
   and em.id <> t.mapping_id;
  if v_duplicate_target_mappings <> 0 then
    raise exception 'PKG-28B-EXTERNAL-MAPPING-TRANSFER-CHILD-DELETE target duplicate mapping guard failed: %', v_duplicate_target_mappings;
  end if;

  select count(*) into v_other_external_mapping_refs
  from public.external_printing_mappings em
  join pkg28b_targets t on t.source_card_printing_id = em.card_printing_id
  where em.id <> t.mapping_id;
  if v_other_external_mapping_refs <> 0 then
    raise exception 'PKG-28B-EXTERNAL-MAPPING-TRANSFER-CHILD-DELETE source child extra external mapping guard failed: %', v_other_external_mapping_refs;
  end if;

  select count(*) into v_vault_refs
  from public.vault_item_instances vii
  join pkg28b_targets t on t.source_card_printing_id = vii.card_printing_id
  where vii.archived_at is null;
  if v_vault_refs <> 0 then
    raise exception 'PKG-28B-EXTERNAL-MAPPING-TRANSFER-CHILD-DELETE vault dependency guard failed: %', v_vault_refs;
  end if;

  select count(*) into v_warehouse_refs
  from public.canon_warehouse_candidates cwc
  join pkg28b_targets t on t.source_card_printing_id = cwc.promoted_card_printing_id;
  if v_warehouse_refs <> 0 then
    raise exception 'PKG-28B-EXTERNAL-MAPPING-TRANSFER-CHILD-DELETE warehouse dependency guard failed: %', v_warehouse_refs;
  end if;

  update public.external_printing_mappings em
  set
    card_printing_id = t.target_card_printing_id,
    meta = coalesce(em.meta, '{}'::jsonb)
      || jsonb_build_object(
        'pkg28b_transferred_from_card_printing_id', t.source_card_printing_id::text,
        'pkg28b_transfer_reason', 'external mapping belongs to existing master-verified H-number child',
        'pkg28b_package_fingerprint', '9a4b671f19abe698262b55d2c5d9cbe7dc3ab068b74146e2341489de5cfea9ee'
      )
  from pkg28b_targets t
  where em.id = t.mapping_id;
  get diagnostics v_updated = row_count;
  if v_updated <> 4 then
    raise exception 'PKG-28B-EXTERNAL-MAPPING-TRANSFER-CHILD-DELETE mapping update guard failed: expected 4, got %', v_updated;
  end if;

  delete from public.card_printings cpr
  using pkg28b_targets t
  where cpr.id = t.source_card_printing_id;
  get diagnostics v_deleted = row_count;
  if v_deleted <> 4 then
    raise exception 'PKG-28B-EXTERNAL-MAPPING-TRANSFER-CHILD-DELETE child delete guard failed: expected 4, got %', v_deleted;
  end if;

  raise notice 'PKG-28B-EXTERNAL-MAPPING-TRANSFER-CHILD-DELETE dry-run passed: mappings transferred %, children deleted %, fingerprint 9a4b671f19abe698262b55d2c5d9cbe7dc3ab068b74146e2341489de5cfea9ee', v_updated, v_deleted;
end $$;

rollback;
