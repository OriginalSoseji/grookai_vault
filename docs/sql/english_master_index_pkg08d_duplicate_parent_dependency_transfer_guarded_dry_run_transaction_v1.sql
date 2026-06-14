-- PKG-08D-DUPLICATE-PARENT-DEPENDENCY-TRANSFER GUARDED DRY-RUN TRANSACTION ARTIFACT V1
-- Generated for review only. Do not run without explicit operator approval.
-- Package fingerprint: b0c474d462d824e14197629a108f7b6868e87cab38c0fc4155dff9ad77d126c8
-- Scope: 39 duplicate parent rows.
-- This artifact updates dependency references and deletes duplicate parent rows inside a transaction.
-- This dry-run artifact contains ROLLBACK and intentionally contains no COMMIT.

begin;

create temporary table pkg08d_parent_transfer_targets (
  blocked_card_print_id uuid primary key,
  survivor_card_print_id uuid not null,
  set_key text not null,
  card_number text not null,
  card_name text not null
) on commit drop;

insert into pkg08d_parent_transfer_targets (
  blocked_card_print_id,
  survivor_card_print_id,
  set_key,
  card_number,
  card_name
) values
  ('127e4fd8-9199-4dfb-8ccd-55221fbac5c0'::uuid, '1bf5dbe7-81a5-4e2e-8dad-585073c2c5ae'::uuid, 'ex3', '19', 'Salamence'),
  ('88905c59-919f-41ea-adf9-41f63879c33a'::uuid, '1bf5dbe7-81a5-4e2e-8dad-585073c2c5ae'::uuid, 'ex3', '19', 'Salamence'),
  ('ac43bf72-1e09-4415-8153-d9658e534188'::uuid, 'a04082c2-0a6d-47f4-bd24-843ff7bbc72d'::uuid, 'ex5', '50', 'Swalot'),
  ('4681202c-00b3-4245-a3dc-f5d721ba4035'::uuid, '41385b05-89d1-434a-819a-355a61ae1e69'::uuid, 'ex7', '37', 'Dark Houndoom'),
  ('0381d41b-87ed-4d43-adf0-1a85f04627a2'::uuid, '55b5f96b-5ebd-458a-a7f6-17da38e4728a'::uuid, 'ex8', '38', 'Manectric'),
  ('58374d21-274d-45dd-aada-47f9d93f4f90'::uuid, 'bfd0c432-a09e-4a89-9efe-97260f780656'::uuid, 'ex9', '29', 'Grumpig'),
  ('a0da1a62-f9e8-4545-991f-a916185085db'::uuid, '48139214-02b3-4b38-ab5a-34021c3aca30'::uuid, 'ex12', '45', 'Tentacruel'),
  ('7199362c-b4a7-40c4-a7cb-1508a5f3911a'::uuid, '0dff140a-e128-4137-a521-342c9a402c2e'::uuid, 'smp', 'SM198', 'Bulbasaur'),
  ('2b4e4ff4-4295-482c-aa50-9c0195a22461'::uuid, '0a1c41ff-c58d-4d2f-9512-599e710a784b'::uuid, 'smp', 'SM199', 'Psyduck'),
  ('cdaa3f83-6d5f-40a9-b157-6c52d344a40c'::uuid, '5d97bf40-e235-4a96-acfa-50d29785274f'::uuid, 'smp', 'SM200', 'Snubbull'),
  ('3f6b58d9-8a30-4ad4-afa1-ddacd1a2ef65'::uuid, '0e419a5c-140e-4bf7-b70e-a5ba62dc349c'::uuid, 'swsh7', '112', 'Dialga'),
  ('e51a28bf-febc-4aa9-a1bb-ff959f051955'::uuid, 'e9a1e9f3-5c50-401a-925e-320da68239e8'::uuid, 'swsh7', '124', 'Regidrago'),
  ('f0fcc467-328d-4a6b-b0de-6e7d3153f0e1'::uuid, 'f484d2c5-14e6-42be-804d-33a41a49c70f'::uuid, 'swsh9', '147', 'Professor''s Research'),
  ('8ad3820a-d318-4d6c-afe3-20409fe4e2c2'::uuid, '36875b74-dce5-4e37-b4d4-1b26115f177b'::uuid, 'swsh10', '147', 'Irida'),
  ('21ce1b75-1ca6-4a0f-a9e0-78e887aa023d'::uuid, '09335fad-6bd8-4c5e-9f82-533f3447d99e'::uuid, 'swsh11', '66', 'Gengar'),
  ('b2ab4d44-23b9-4646-a909-ae889d4d716d'::uuid, '90e29952-bf73-46c0-900c-d7be40e426f3'::uuid, 'swsh11', '84', 'Hisuian Arcanine'),
  ('8a648bf8-1703-49ed-b6f7-ecab24a2442a'::uuid, '8aa19ef4-2383-4860-8b33-40926220cb8b'::uuid, 'sv01', '54', 'Quaquaval'),
  ('b75a518d-a4f1-4765-91aa-2036c5f86027'::uuid, 'c8e1771d-5cc2-460a-8652-c47513fc1055'::uuid, 'sv01', '61', 'Dondozo'),
  ('161894ab-543c-435b-af80-7333912a990d'::uuid, '88614c6c-1760-4e62-8a90-4572f2514c18'::uuid, 'sv01', '76', 'Pawmot'),
  ('05c961ad-c08f-4521-ae46-c88b1e0b3a18'::uuid, '8b7df965-aff6-43c2-afc1-eedf2f7f48a4'::uuid, 'sv01', '96', 'Klefki'),
  ('04080343-a4bc-4f28-9590-f80f3e308cdf'::uuid, '4c8c4bbe-7d43-4079-b982-0cb6a2828c35'::uuid, 'sv01', '109', 'Annihilape'),
  ('7026595e-752d-4fd2-9661-7702d4049818'::uuid, '01aec74e-316e-4627-a844-cd45e0da6a3e'::uuid, 'sv01', '118', 'Hawlucha'),
  ('eab48e1a-2344-4aa5-8d54-ef317e8bff47'::uuid, 'dacf0fbd-89e1-42aa-987e-591e91775fcb'::uuid, 'sv02', '135', 'Tyranitar'),
  ('9390f6f1-ef10-434f-ab84-0ccc048be581'::uuid, '9bc544ad-f07f-4c7c-b806-7ab465c5726d'::uuid, 'sv03.5', '132', 'Ditto'),
  ('8bc20a50-7661-4601-b38c-8d1aab05ef84'::uuid, 'a582bdb5-4e56-4348-8b5d-035a9fb0792f'::uuid, 'sv04', '104', 'Garganacl'),
  ('90b77bf6-3051-4da4-9dfd-0de90a7a636b'::uuid, '2b9af948-67ba-406f-835a-d75ff9fb3c0d'::uuid, 'sv04', '123', 'Brute Bonnet'),
  ('148c3963-3ff7-4b3c-8088-0a02c2e608af'::uuid, '37c0ac6b-0b69-4a8f-ab2b-87d8ea92448e'::uuid, 'sv05', '129', 'Dudunsparce'),
  ('8894ca68-34af-4346-b509-dac7a9e60ded'::uuid, '0207f568-d0ce-405a-969d-80c7f2e56809'::uuid, 'sv05', '24', 'Rabsca'),
  ('ae60fada-fe43-464d-82b5-9346359d5159'::uuid, '49775e0d-e6f2-417d-9a58-18d96917357d'::uuid, 'sv05', '118', 'Iron Treads'),
  ('22178b82-3b06-4abb-8b44-adf0edb0b7c3'::uuid, 'a524d59b-26b4-4be2-8839-338585171310'::uuid, 'sv06', '111', 'Okidogi'),
  ('0e31158e-5c60-477d-8a70-bb3a55a49b8b'::uuid, '1dd005a1-ce85-4088-9cb1-99185d961506'::uuid, 'sv07', '119', 'Bouffalant'),
  ('cdba0afe-8462-4200-aa54-50de6db3d456'::uuid, '0f4e2409-f4d7-4243-aebd-e1335f680b9a'::uuid, 'sv10', '020', 'Team Rocket''s Spidops'),
  ('754de6c8-92cf-48f5-a9ca-1fd5e10d8761'::uuid, '816d4e8a-a675-4355-be76-38537ac17364'::uuid, 'sv10', '034', 'Ethan''s Typhlosion'),
  ('31a4d0b3-fde0-483f-82c8-928b2d427251'::uuid, 'e60efc97-6e90-426e-a681-61b33a026bb2'::uuid, 'sv10', '051', 'Team Rocket''s Articuno'),
  ('711581ed-55d7-47b3-9448-aadd92e36504'::uuid, '030d432b-54fb-4512-861c-1a768923d20b'::uuid, 'sv10', '36', 'Ethan''s Magcargo'),
  ('34daf81d-77b6-49c1-9f73-23085ad8d694'::uuid, '7ea78370-117e-43d3-a5a9-c8ec87e81bee'::uuid, 'sv10', '70', 'Team Rocket''s Zapdos'),
  ('30fb09bf-b3f5-4097-976a-be86fee9505d'::uuid, 'c478d96a-a186-441e-af16-c8fcc1471ccb'::uuid, 'sv10', '103', 'Cynthia''s Gabite'),
  ('656146e4-40d2-4c0a-8cfb-3c62c0a54e03'::uuid, '9ec45c4c-3e58-491b-bb85-e6799935ed63'::uuid, 'sv10', '174', 'Team Rocket''s Giovanni'),
  ('c09ddb18-a83c-4fac-92bc-43588bca9d0d'::uuid, '1de01a51-cfa0-4bfe-90c2-a75942e88932'::uuid, 'me01', '104', 'Mega Kangaskhan ex');

do $$
declare
  v_targets integer;
  v_blocked_children integer;
  v_disallowed_refs integer := 0;
  v_dynamic_refs integer;
  r record;
begin
  select count(*) into v_targets from pkg08d_parent_transfer_targets;
  if v_targets <> 39 then
    raise exception 'PKG-08D target guard failed: expected 39, got %', v_targets;
  end if;

  if exists (
    select 1
    from pkg08d_parent_transfer_targets target
    left join public.card_prints blocked on blocked.id = target.blocked_card_print_id
    left join public.card_prints survivor on survivor.id = target.survivor_card_print_id
    where blocked.id is null
       or survivor.id is null
       or coalesce(blocked.set_code, '') <> coalesce(survivor.set_code, '')
       or coalesce(blocked.name, '') <> coalesce(survivor.name, '')
  ) then
    raise exception 'PKG-08D target parent identity guard failed';
  end if;

  select count(*) into v_blocked_children
  from public.card_printings
  where card_print_id in (select blocked_card_print_id from pkg08d_parent_transfer_targets);
  if v_blocked_children <> 0 then
    raise exception 'PKG-08D blocked parent child guard failed: % child rows found', v_blocked_children;
  end if;

  for r in
    select
      rel_ns.nspname as schema_name,
      rel.relname as table_name,
      att.attname as column_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace rel_ns on rel_ns.oid = rel.relnamespace
    join pg_class ref on ref.oid = con.confrelid
    join unnest(con.conkey) with ordinality as cols(attnum, ord) on true
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = cols.attnum
    where con.contype = 'f'
      and rel_ns.nspname = 'public'
      and ref.relname = 'card_prints'
      and rel.relname <> all(array[
        'canon_warehouse_candidates',
        'card_print_species',
        'external_mappings',
        'justtcg_variant_price_snapshots',
        'justtcg_variant_prices_latest',
        'justtcg_variants'
      ])
  loop
    execute format(
      'select count(*) from %I.%I where %I in (select blocked_card_print_id from pkg08d_parent_transfer_targets)',
      r.schema_name,
      r.table_name,
      r.column_name
    ) into v_dynamic_refs;
    v_disallowed_refs := v_disallowed_refs + v_dynamic_refs;
  end loop;

  if v_disallowed_refs <> 0 then
    raise exception 'PKG-08D disallowed dependency guard failed: % refs found', v_disallowed_refs;
  end if;
end $$;

update public.external_mappings em
set card_print_id = target.survivor_card_print_id
from pkg08d_parent_transfer_targets target
where em.card_print_id = target.blocked_card_print_id;

-- Remove redundant active species rows that would violate the active species unique index after transfer.
delete from public.card_print_species cps
using pkg08d_parent_transfer_targets target
where cps.card_print_id = target.blocked_card_print_id
  and cps.active = true
  and exists (
    select 1
    from public.card_print_species existing
    where existing.card_print_id = target.survivor_card_print_id
      and existing.species_id = cps.species_id
      and existing.role = cps.role
      and existing.active = true
  );

update public.card_print_species cps
set card_print_id = target.survivor_card_print_id
from pkg08d_parent_transfer_targets target
where cps.card_print_id = target.blocked_card_print_id;

update public.canon_warehouse_candidates cwc
set promoted_card_print_id = target.survivor_card_print_id
from pkg08d_parent_transfer_targets target
where cwc.promoted_card_print_id = target.blocked_card_print_id;

update public.justtcg_variant_price_snapshots js
set card_print_id = target.survivor_card_print_id
from pkg08d_parent_transfer_targets target
where js.card_print_id = target.blocked_card_print_id;

update public.justtcg_variant_prices_latest jl
set card_print_id = target.survivor_card_print_id
from pkg08d_parent_transfer_targets target
where jl.card_print_id = target.blocked_card_print_id;

update public.justtcg_variants jv
set card_print_id = target.survivor_card_print_id
from pkg08d_parent_transfer_targets target
where jv.card_print_id = target.blocked_card_print_id;

delete from public.card_prints cp
using pkg08d_parent_transfer_targets target
where cp.id = target.blocked_card_print_id;

do $$
declare
  v_blocked_parents integer;
  v_survivor_parents integer;
  v_remaining_refs integer;
begin
  select count(*) into v_blocked_parents
  from public.card_prints
  where id in (select blocked_card_print_id from pkg08d_parent_transfer_targets);
  if v_blocked_parents <> 0 then
    raise exception 'PKG-08D blocked parent delete verification failed: % remain', v_blocked_parents;
  end if;

  select count(*) into v_survivor_parents
  from public.card_prints
  where id in (select survivor_card_print_id from pkg08d_parent_transfer_targets);
  if v_survivor_parents <> (select count(distinct survivor_card_print_id) from pkg08d_parent_transfer_targets) then
    raise exception 'PKG-08D survivor parent verification failed';
  end if;

  select
    (select count(*) from public.external_mappings where card_print_id in (select blocked_card_print_id from pkg08d_parent_transfer_targets))
    + (select count(*) from public.card_print_species where card_print_id in (select blocked_card_print_id from pkg08d_parent_transfer_targets))
    + (select count(*) from public.canon_warehouse_candidates where promoted_card_print_id in (select blocked_card_print_id from pkg08d_parent_transfer_targets))
    + (select count(*) from public.justtcg_variant_price_snapshots where card_print_id in (select blocked_card_print_id from pkg08d_parent_transfer_targets))
    + (select count(*) from public.justtcg_variant_prices_latest where card_print_id in (select blocked_card_print_id from pkg08d_parent_transfer_targets))
    + (select count(*) from public.justtcg_variants where card_print_id in (select blocked_card_print_id from pkg08d_parent_transfer_targets))
  into v_remaining_refs;

  if v_remaining_refs <> 0 then
    raise exception 'PKG-08D blocked dependency verification failed: % refs remain', v_remaining_refs;
  end if;
end $$;

rollback;
