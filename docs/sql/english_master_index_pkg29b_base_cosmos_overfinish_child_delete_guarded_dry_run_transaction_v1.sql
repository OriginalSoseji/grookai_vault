-- PKG-29B-BASE-COSMOS-OVERFINISH-CHILD-DELETE GUARDED DRY-RUN TRANSACTION V1
-- Generated for review only. This artifact intentionally ends with ROLLBACK.
-- Package fingerprint: 141eb3c42c6c0218db926e01ff72105bd6b200c839f3cd1d092bbfbb6683ef74
-- Scope: 4 base cosmos overfinish child deletes.
-- No parent writes. No migrations. No global apply.

begin;

create temporary table pkg29b_targets (
  card_printing_id uuid primary key,
  card_print_id uuid not null,
  set_key text not null,
  card_number text not null,
  card_name text not null,
  finish_key text not null
) on commit drop;

insert into pkg29b_targets (
  card_printing_id,
  card_print_id,
  set_key,
  card_number,
  card_name,
  finish_key
) values
  ('7236391b-6297-4946-96f3-dc85e69e9cc1'::uuid, 'dd251220-bc75-49f5-b80b-146ec6a839c0'::uuid, 'sv06.5', '002', 'Galvantula', 'cosmos'),
  ('ed3fdf71-5b1c-4fa1-b31b-eb97e86a7ba0'::uuid, 'd1455a62-d371-4ae7-b24c-4411b61c19e0'::uuid, 'swsh12.5', '135', 'Lost Vacuum', 'cosmos'),
  ('a1283a03-9ccf-4916-80e0-f9b4c7121936'::uuid, '947dbf04-4e65-4206-bc80-d702e7b93109'::uuid, 'swsh12.5', '145', 'Trekking Shoes', 'cosmos'),
  ('3a4ca694-58a2-4a9a-a184-207e0261f9fd'::uuid, '6ec60f4d-c8ae-42f5-8941-47ab73aab6f1'::uuid, 'swsh12.5', '146', 'Ultra Ball', 'cosmos');

do $$
declare
  v_targets integer;
  v_identity_mismatch integer;
  v_dependency_refs integer;
  v_deleted integer;
begin
  select count(*) into v_targets from pkg29b_targets;
  if v_targets <> 4 then
    raise exception 'PKG-29B-BASE-COSMOS-OVERFINISH-CHILD-DELETE target guard failed: expected 4, got %', v_targets;
  end if;

  select count(*) into v_identity_mismatch
  from pkg29b_targets t
  left join public.card_printings cpr on cpr.id = t.card_printing_id
  left join public.card_prints cp on cp.id = cpr.card_print_id
  where cpr.id is null
     or cp.id is null
     or cpr.card_print_id <> t.card_print_id
     or cpr.finish_key <> 'cosmos'
     or coalesce(cp.set_code, '') <> t.set_key
     or coalesce(cp.name, '') <> t.card_name
     or coalesce(cp.printed_identity_modifier, '') <> ''
     or coalesce(cp.variant_key, '') <> '';
  if v_identity_mismatch <> 0 then
    raise exception 'PKG-29B-BASE-COSMOS-OVERFINISH-CHILD-DELETE identity guard failed: %', v_identity_mismatch;
  end if;

  select
    coalesce((select count(*) from public.external_printing_mappings em join pkg29b_targets t on t.card_printing_id = em.card_printing_id), 0)
    + coalesce((select count(*) from public.vault_item_instances vii join pkg29b_targets t on t.card_printing_id = vii.card_printing_id where vii.archived_at is null), 0)
    + coalesce((select count(*) from public.canon_warehouse_candidates cwc join pkg29b_targets t on t.card_printing_id = cwc.promoted_card_printing_id), 0)
  into v_dependency_refs;
  if v_dependency_refs <> 0 then
    raise exception 'PKG-29B-BASE-COSMOS-OVERFINISH-CHILD-DELETE dependency guard failed: %', v_dependency_refs;
  end if;

  delete from public.card_printings cpr
  using pkg29b_targets t
  where cpr.id = t.card_printing_id;
  get diagnostics v_deleted = row_count;
  if v_deleted <> 4 then
    raise exception 'PKG-29B-BASE-COSMOS-OVERFINISH-CHILD-DELETE child delete guard failed: expected 4, got %', v_deleted;
  end if;

  raise notice 'PKG-29B-BASE-COSMOS-OVERFINISH-CHILD-DELETE dry-run passed: children deleted %, fingerprint 141eb3c42c6c0218db926e01ff72105bd6b200c839f3cd1d092bbfbb6683ef74', v_deleted;
end $$;

rollback;
