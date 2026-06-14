-- PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER GUARDED DRY-RUN TRANSACTION ARTIFACT V1
-- Generated for review only. Do not run without explicit operator approval.
-- Package fingerprint: 21a4bfe4e443cf098d7ae257216fbfcd8daa5be06b9232af56328dc531b42d0a
-- Scope: 21 duplicate parent rows, 23 duplicate child printing rows.
-- This artifact may update external_mappings and delete duplicate child/parent rows inside a transaction.
-- This dry-run artifact contains ROLLBACK and intentionally contains no COMMIT.

begin;

create temporary table pkg02f_parent_merge_targets (
  blocked_card_print_id uuid primary key,
  survivor_card_print_id uuid not null,
  set_key text not null,
  target_number text not null,
  target_name text not null
) on commit drop;

create temporary table pkg02f_child_merge_targets (
  blocked_card_printing_id uuid primary key,
  survivor_card_printing_id uuid not null,
  blocked_card_print_id uuid not null,
  survivor_card_print_id uuid not null,
  finish_key text not null
) on commit drop;

insert into pkg02f_parent_merge_targets (
  blocked_card_print_id,
  survivor_card_print_id,
  set_key,
  target_number,
  target_name
) values
  ('2fdd39c8-7afa-4031-be84-649ac28a7b72'::uuid, '96794036-5dd7-42e5-a90f-516d90eeb3b9'::uuid, 'ex10', '113', 'Entei ★'),
  ('043dbc47-0815-4ef4-b31d-2027f70f2338'::uuid, '64269238-e6e3-4fd2-9c14-b9fb6367c0d5'::uuid, 'ex10', '114', 'Raikou ★'),
  ('584c31ad-d7ac-4356-b9cc-4de3152511b2'::uuid, '0aa71fae-b6ec-4a12-ac8d-35dbc3c769bf'::uuid, 'ex10', '115', 'Suicune ★'),
  ('6419894a-137f-4fc7-8db1-fa853872b190'::uuid, '5f64ad81-93ff-4b77-aa94-06f8522b3f1e'::uuid, 'mep', '001', 'Meganium'),
  ('b75d4730-3c1a-42ca-9d18-e8ca736ae41f'::uuid, '95dca2c2-c3e7-43b4-bc02-227fddc4910d'::uuid, 'mep', '002', 'Inteleon'),
  ('aa9f207d-c9ea-4607-bbc5-448648bca47f'::uuid, '718508f6-7825-43e8-98e1-a57b58dd490f'::uuid, 'mep', '003', 'Alakazam'),
  ('bf523703-271c-49fe-b8aa-c31c57cb9b32'::uuid, 'cddc521f-ebbe-4460-85d5-d78278672f95'::uuid, 'mep', '004', 'Lunatone'),
  ('04e533ae-dd17-478c-ab46-220859079b2c'::uuid, 'c5b19da0-1f2d-4b86-844f-90284539099d'::uuid, 'mep', '005', 'Drifloon'),
  ('ac2b6cf7-6873-44e8-96b9-e03a179fae51'::uuid, '69572cf4-a580-49cc-90d2-36c053f510a9'::uuid, 'mep', '006', 'Drifblim'),
  ('870f45fe-0680-4a92-b77b-dd03a6018bd3'::uuid, 'a683bb41-182d-440b-9e6c-d82ebfd38f1d'::uuid, 'mep', '007', 'Psyduck'),
  ('47f874b2-ea20-4b89-af44-085905bb1f60'::uuid, '5dd278a1-ccaa-48e6-84c2-7190ee63c9d8'::uuid, 'mep', '008', 'Golduck'),
  ('a3624761-be25-4841-83e4-c5936ec434fe'::uuid, '26726d70-a78d-4210-9ccc-d79abd215099'::uuid, 'mep', '009', 'Alakazam'),
  ('242de512-f2fb-4994-9615-6c1e2c55ac02'::uuid, 'a8259bb9-d94d-4aee-af25-28f0a9656a60'::uuid, 'mep', '010', 'Riolu'),
  ('8c817161-627f-4ff5-aa27-127757b88213'::uuid, 'dd5bea69-e103-425d-9d45-adc5ff62d372'::uuid, 'pl2', '71', 'Nidoran ♀'),
  ('bc120b0e-4aad-47c1-989b-a733435a2000'::uuid, '0104fc59-640f-4470-8f46-17a8fea55b9a'::uuid, 'pl2', '72', 'Nidoran ♂'),
  ('460e6437-4bc8-4a1c-90fc-546481f225e2'::uuid, '1c2cef32-b323-4e64-b9ae-51439d5cd9b0'::uuid, 'pl4', '94', 'Arceus LV.X'),
  ('c5125a59-32a9-4a0f-98af-4cf4ad5d6d64'::uuid, '7e583fc5-66d0-4142-bea2-ec1f927a1bdc'::uuid, 'pl4', '95', 'Arceus LV.X'),
  ('ad751d34-d43b-4644-ae2e-622725f781cd'::uuid, '4196309e-77f4-4bc6-93ac-5a5583a99a8e'::uuid, 'pl4', '96', 'Arceus LV.X'),
  ('1352eb03-1519-4e31-b7ad-a2d4af24ef65'::uuid, 'c2c128a7-8b1b-4e15-a857-723292b1a1a3'::uuid, 'pl4', '97', 'Gengar LV.X'),
  ('2fb3462d-4a19-4412-b8cd-848a669549a0'::uuid, '71d24e24-10ee-4047-93b1-14ab71bdaa1a'::uuid, 'pl4', '98', 'Salamence LV.X'),
  ('b319332c-aea7-4f3c-ad4c-02f0874b2d60'::uuid, '0b036f80-3ee6-47c4-8a08-fd128e273358'::uuid, 'pl4', '99', 'Tangrowth LV.X');

insert into pkg02f_child_merge_targets (
  blocked_card_printing_id,
  survivor_card_printing_id,
  blocked_card_print_id,
  survivor_card_print_id,
  finish_key
) values
  ('597aa8d8-7e4d-4f0a-b4ce-ebb96ed800e8'::uuid, '8a688e28-242a-42b4-8ff7-99c0596e8c46'::uuid, '2fdd39c8-7afa-4031-be84-649ac28a7b72'::uuid, '96794036-5dd7-42e5-a90f-516d90eeb3b9'::uuid, 'holo'),
  ('90eb803f-345c-46f0-b5f3-6fd62af386d5'::uuid, 'f60ef6d8-25e4-491d-bea8-3ef02e4a5f64'::uuid, '043dbc47-0815-4ef4-b31d-2027f70f2338'::uuid, '64269238-e6e3-4fd2-9c14-b9fb6367c0d5'::uuid, 'holo'),
  ('4d6df833-3363-46a8-ad80-12ad715d9aec'::uuid, 'f0d6e039-67d0-4aa0-a284-499107fd5a56'::uuid, '584c31ad-d7ac-4356-b9cc-4de3152511b2'::uuid, '0aa71fae-b6ec-4a12-ac8d-35dbc3c769bf'::uuid, 'holo'),
  ('2e4cadb9-44b8-490a-94af-3ea6f45f021f'::uuid, 'fe043f63-7cd6-4095-a64b-5da01d4f48c0'::uuid, '6419894a-137f-4fc7-8db1-fa853872b190'::uuid, '5f64ad81-93ff-4b77-aa94-06f8522b3f1e'::uuid, 'holo'),
  ('1d168cec-7194-42e4-9e62-691e5f1f8698'::uuid, '42918a6d-7aeb-42fe-9163-9489ea3070c5'::uuid, 'b75d4730-3c1a-42ca-9d18-e8ca736ae41f'::uuid, '95dca2c2-c3e7-43b4-bc02-227fddc4910d'::uuid, 'holo'),
  ('7357533d-7e4b-430c-b8ce-f73c6d08cb55'::uuid, 'c3fa605e-3e7f-419a-b09e-c5131e73664a'::uuid, 'aa9f207d-c9ea-4607-bbc5-448648bca47f'::uuid, '718508f6-7825-43e8-98e1-a57b58dd490f'::uuid, 'holo'),
  ('cab49274-d396-43b7-a09a-9e43bd310abf'::uuid, '6f650737-4528-4b75-9b85-3037ce800dc2'::uuid, 'bf523703-271c-49fe-b8aa-c31c57cb9b32'::uuid, 'cddc521f-ebbe-4460-85d5-d78278672f95'::uuid, 'holo'),
  ('52313084-cf51-490b-9b7d-ed4e00d30735'::uuid, '119ea6b4-8e8c-4f06-b5a1-a882fc9ddd23'::uuid, '04e533ae-dd17-478c-ab46-220859079b2c'::uuid, 'c5b19da0-1f2d-4b86-844f-90284539099d'::uuid, 'holo'),
  ('e7102e38-efbc-4e3b-bf6f-fe4770b78b0d'::uuid, '09b92739-e605-4e7b-9e2f-78af37b9c744'::uuid, 'ac2b6cf7-6873-44e8-96b9-e03a179fae51'::uuid, '69572cf4-a580-49cc-90d2-36c053f510a9'::uuid, 'holo'),
  ('e54ac5bb-df1a-4fc0-8298-668e4f4f42f9'::uuid, '40163317-cb48-4a16-859e-ed40e9a52253'::uuid, '870f45fe-0680-4a92-b77b-dd03a6018bd3'::uuid, 'a683bb41-182d-440b-9e6c-d82ebfd38f1d'::uuid, 'holo'),
  ('7c71fdbc-98d3-4e80-a8b3-2e8c89cb4d30'::uuid, '5cf6846f-dd2d-4701-9fec-08fc1456d58c'::uuid, '47f874b2-ea20-4b89-af44-085905bb1f60'::uuid, '5dd278a1-ccaa-48e6-84c2-7190ee63c9d8'::uuid, 'holo'),
  ('b2cb6ae1-c137-4013-b9b1-ccdbd58c9549'::uuid, '7a730508-9c9b-4b2e-8ddc-2eb75bb81990'::uuid, 'a3624761-be25-4841-83e4-c5936ec434fe'::uuid, '26726d70-a78d-4210-9ccc-d79abd215099'::uuid, 'holo'),
  ('def4cbb4-1cc1-4ea4-86ed-e7d73c5dc5e0'::uuid, '10f0ed13-c908-4ac2-b03c-8c5db021f95b'::uuid, '242de512-f2fb-4994-9615-6c1e2c55ac02'::uuid, 'a8259bb9-d94d-4aee-af25-28f0a9656a60'::uuid, 'holo'),
  ('9845afbb-0b55-4f96-9022-4083c6ed71f0'::uuid, '41dd323a-cbda-43a0-8a5e-fa6235d54d1f'::uuid, '8c817161-627f-4ff5-aa27-127757b88213'::uuid, 'dd5bea69-e103-425d-9d45-adc5ff62d372'::uuid, 'normal'),
  ('964e7f55-9290-4080-b26b-9e4188904654'::uuid, '07a5dd10-702a-41bb-96d8-a8cf0081ba1d'::uuid, '8c817161-627f-4ff5-aa27-127757b88213'::uuid, 'dd5bea69-e103-425d-9d45-adc5ff62d372'::uuid, 'reverse'),
  ('65b6be37-a970-4308-8eec-82071cac0ba6'::uuid, '7bbc940e-a956-4b13-a88a-2f8bcc100b8c'::uuid, 'bc120b0e-4aad-47c1-989b-a733435a2000'::uuid, '0104fc59-640f-4470-8f46-17a8fea55b9a'::uuid, 'normal'),
  ('784a887f-4b92-4cc9-9d5d-4e7ebd2e67f0'::uuid, '491361c0-ce32-4567-9d00-bd765b39328e'::uuid, 'bc120b0e-4aad-47c1-989b-a733435a2000'::uuid, '0104fc59-640f-4470-8f46-17a8fea55b9a'::uuid, 'reverse'),
  ('99c5947d-6376-4954-98cc-2534b0e1eb4d'::uuid, 'ae5bd188-0613-422b-906c-414a45adcbac'::uuid, '460e6437-4bc8-4a1c-90fc-546481f225e2'::uuid, '1c2cef32-b323-4e64-b9ae-51439d5cd9b0'::uuid, 'holo'),
  ('e4a86716-ad79-4747-a09d-b7bd7b0b4f71'::uuid, 'b609bfb9-c417-4108-bd23-809b1400f6bd'::uuid, 'c5125a59-32a9-4a0f-98af-4cf4ad5d6d64'::uuid, '7e583fc5-66d0-4142-bea2-ec1f927a1bdc'::uuid, 'holo'),
  ('e06a2a7a-b1e6-49a1-9fcf-105732fa7230'::uuid, 'a403b284-475d-4047-94e7-991b9b80e865'::uuid, 'ad751d34-d43b-4644-ae2e-622725f781cd'::uuid, '4196309e-77f4-4bc6-93ac-5a5583a99a8e'::uuid, 'holo'),
  ('53bc5d29-3a55-4797-93dd-819ca5cbc923'::uuid, '90d31b85-ca12-4045-a952-2abc8c7aebe2'::uuid, '1352eb03-1519-4e31-b7ad-a2d4af24ef65'::uuid, 'c2c128a7-8b1b-4e15-a857-723292b1a1a3'::uuid, 'holo'),
  ('e66af8cf-cc16-4ff8-93eb-c5c4f13bb75b'::uuid, 'bf2b56a9-fc25-4d3b-96ba-400be1b902b2'::uuid, '2fb3462d-4a19-4412-b8cd-848a669549a0'::uuid, '71d24e24-10ee-4047-93b1-14ab71bdaa1a'::uuid, 'holo'),
  ('aefe2eb1-ad38-418a-b814-320048008924'::uuid, 'b5d81327-3537-4fa4-9407-79a0abec6d48'::uuid, 'b319332c-aea7-4f3c-ad4c-02f0874b2d60'::uuid, '0b036f80-3ee6-47c4-8a08-fd128e273358'::uuid, 'holo');

do $$
declare
  v_parent_targets integer;
  v_child_targets integer;
  v_child_refs integer;
begin
  select count(*) into v_parent_targets from pkg02f_parent_merge_targets;
  if v_parent_targets <> 21 then
    raise exception 'PKG-02F parent target guard failed: expected 21, got %', v_parent_targets;
  end if;

  select count(*) into v_child_targets from pkg02f_child_merge_targets;
  if v_child_targets <> 23 then
    raise exception 'PKG-02F child target guard failed: expected 23, got %', v_child_targets;
  end if;

  if exists (
    select 1
    from pkg02f_parent_merge_targets target
    left join public.card_prints blocked on blocked.id = target.blocked_card_print_id
    left join public.card_prints survivor on survivor.id = target.survivor_card_print_id
    where blocked.id is null or survivor.id is null
  ) then
    raise exception 'PKG-02F parent target row missing';
  end if;

  if exists (
    select 1
    from pkg02f_child_merge_targets target
    left join public.card_printings blocked on blocked.id = target.blocked_card_printing_id
    left join public.card_printings survivor on survivor.id = target.survivor_card_printing_id
    where blocked.id is null
       or survivor.id is null
       or blocked.card_print_id <> target.blocked_card_print_id
       or survivor.card_print_id <> target.survivor_card_print_id
       or blocked.finish_key <> target.finish_key
       or survivor.finish_key <> target.finish_key
  ) then
    raise exception 'PKG-02F child target row mismatch';
  end if;

  select
    (select count(*) from public.vault_item_instances where card_printing_id in (select blocked_card_printing_id from pkg02f_child_merge_targets))
    + (select count(*) from public.external_printing_mappings where card_printing_id in (select blocked_card_printing_id from pkg02f_child_merge_targets))
    + (select count(*) from public.canon_warehouse_candidates where promoted_card_printing_id in (select blocked_card_printing_id from pkg02f_child_merge_targets))
  into v_child_refs;

  if v_child_refs <> 0 then
    raise exception 'PKG-02F blocked child dependency guard failed: % refs found', v_child_refs;
  end if;
end $$;

-- Preserve useful source mappings from duplicate parents when the survivor does not already own the same source/external_id.
update public.external_mappings em
set card_print_id = target.survivor_card_print_id
from pkg02f_parent_merge_targets target
where em.card_print_id = target.blocked_card_print_id
  and not exists (
    select 1
    from public.external_mappings existing
    where existing.card_print_id = target.survivor_card_print_id
      and existing.source = em.source
      and existing.external_id = em.external_id
  );

-- Duplicate external_mappings left on blocked parents are expected to cascade with the blocked parent delete.
delete from public.card_printings cpr
using pkg02f_child_merge_targets target
where cpr.id = target.blocked_card_printing_id;

delete from public.card_prints cp
using pkg02f_parent_merge_targets target
where cp.id = target.blocked_card_print_id;

do $$
declare
  v_blocked_parents integer;
  v_blocked_children integer;
  v_survivor_parents integer;
  v_survivor_children integer;
begin
  select count(*) into v_blocked_parents
  from public.card_prints
  where id in (select blocked_card_print_id from pkg02f_parent_merge_targets);

  select count(*) into v_blocked_children
  from public.card_printings
  where id in (select blocked_card_printing_id from pkg02f_child_merge_targets);

  select count(*) into v_survivor_parents
  from public.card_prints
  where id in (select survivor_card_print_id from pkg02f_parent_merge_targets);

  select count(*) into v_survivor_children
  from public.card_printings
  where id in (select survivor_card_printing_id from pkg02f_child_merge_targets);

  if v_blocked_parents <> 0 then
    raise exception 'PKG-02F blocked parent delete verification failed: % remain', v_blocked_parents;
  end if;
  if v_blocked_children <> 0 then
    raise exception 'PKG-02F blocked child delete verification failed: % remain', v_blocked_children;
  end if;
  if v_survivor_parents <> 21 then
    raise exception 'PKG-02F survivor parent verification failed: expected 21, got %', v_survivor_parents;
  end if;
  if v_survivor_children <> 23 then
    raise exception 'PKG-02F survivor child verification failed: expected 23, got %', v_survivor_children;
  end if;
end $$;

rollback;
