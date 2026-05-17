-- MEP DUPLICATE RESOLUTION DESIGN 2026-05-17
-- STATUS: PLAN ONLY. DO NOT EXECUTE WRITE SECTIONS AGAINST PRODUCTION.
--
-- This file is safe by default. The first section is read-only.
-- Future write statements are commented and require separate approval.

begin transaction read only;

-- Fixed scope from the no-write MEP duplicate-resolution matrix.
with mep_pairs(duplicate_card_print_id, survivor_card_print_id, card_name, duplicate_number, survivor_gv_id) as (
  values
    ('6419894a-137f-4fc7-8db1-fa853872b190'::uuid, '5f64ad81-93ff-4b77-aa94-06f8522b3f1e'::uuid, 'Meganium', '1', 'GV-PK-MEP-001'),
    ('b75d4730-3c1a-42ca-9d18-e8ca736ae41f'::uuid, '95dca2c2-c3e7-43b4-bc02-227fddc4910d'::uuid, 'Inteleon', '2', 'GV-PK-MEP-002'),
    ('aa9f207d-c9ea-4607-bbc5-448648bca47f'::uuid, '718508f6-7825-43e8-98e1-a57b58dd490f'::uuid, 'Alakazam', '3', 'GV-PK-MEP-003'),
    ('bf523703-271c-49fe-b8aa-c31c57cb9b32'::uuid, 'cddc521f-ebbe-4460-85d5-d78278672f95'::uuid, 'Lunatone', '4', 'GV-PK-MEP-004'),
    ('04e533ae-dd17-478c-ab46-220859079b2c'::uuid, 'c5b19da0-1f2d-4b86-844f-90284539099d'::uuid, 'Drifloon', '5', 'GV-PK-MEP-005'),
    ('ac2b6cf7-6873-44e8-96b9-e03a179fae51'::uuid, '69572cf4-a580-49cc-90d2-36c053f510a9'::uuid, 'Drifblim', '6', 'GV-PK-MEP-006'),
    ('870f45fe-0680-4a92-b77b-dd03a6018bd3'::uuid, 'a683bb41-182d-440b-9e6c-d82ebfd38f1d'::uuid, 'Psyduck', '7', 'GV-PK-MEP-007'),
    ('47f874b2-ea20-4b89-af44-085905bb1f60'::uuid, '5dd278a1-ccaa-48e6-84c2-7190ee63c9d8'::uuid, 'Golduck', '8', 'GV-PK-MEP-008'),
    ('a3624761-be25-4841-83e4-c5936ec434fe'::uuid, '26726d70-a78d-4210-9ccc-d79abd215099'::uuid, 'Alakazam', '9', 'GV-PK-MEP-009'),
    ('242de512-f2fb-4994-9615-6c1e2c55ac02'::uuid, 'a8259bb9-d94d-4aee-af25-28f0a9656a60'::uuid, 'Riolu', '10', 'GV-PK-MEP-010')
),
live_pairs as (
  select
    p.*,
    d.name as duplicate_live_name,
    d.number as duplicate_live_number,
    d.number_plain as duplicate_live_number_plain,
    d.gv_id as duplicate_live_gv_id,
    s.name as survivor_live_name,
    s.number as survivor_live_number,
    s.number_plain as survivor_live_number_plain,
    s.gv_id as survivor_live_gv_id
  from mep_pairs p
  join public.card_prints d on d.id = p.duplicate_card_print_id
  join public.card_prints s on s.id = p.survivor_card_print_id
)
select
  count(*)::int as pair_count,
  count(*) filter (where duplicate_live_gv_id is null)::int as duplicate_rows_missing_gv_id,
  count(*) filter (where survivor_live_gv_id = survivor_gv_id)::int as survivor_rows_still_public_owner,
  count(*) filter (
    where lower(regexp_replace(duplicate_live_name, '[^a-zA-Z0-9]+', ' ', 'g')) =
          lower(regexp_replace(survivor_live_name, '[^a-zA-Z0-9]+', ' ', 'g'))
      and coalesce(nullif(ltrim(duplicate_live_number_plain, '0'), ''), '0') =
          coalesce(nullif(ltrim(survivor_live_number_plain, '0'), ''), '0')
  )::int as normalized_identity_matches
from live_pairs;

-- Source mapping preservation gate.
with mep_pairs(duplicate_card_print_id, survivor_card_print_id) as (
  values
    ('6419894a-137f-4fc7-8db1-fa853872b190'::uuid, '5f64ad81-93ff-4b77-aa94-06f8522b3f1e'::uuid),
    ('b75d4730-3c1a-42ca-9d18-e8ca736ae41f'::uuid, '95dca2c2-c3e7-43b4-bc02-227fddc4910d'::uuid),
    ('aa9f207d-c9ea-4607-bbc5-448648bca47f'::uuid, '718508f6-7825-43e8-98e1-a57b58dd490f'::uuid),
    ('bf523703-271c-49fe-b8aa-c31c57cb9b32'::uuid, 'cddc521f-ebbe-4460-85d5-d78278672f95'::uuid),
    ('04e533ae-dd17-478c-ab46-220859079b2c'::uuid, 'c5b19da0-1f2d-4b86-844f-90284539099d'::uuid),
    ('ac2b6cf7-6873-44e8-96b9-e03a179fae51'::uuid, '69572cf4-a580-49cc-90d2-36c053f510a9'::uuid),
    ('870f45fe-0680-4a92-b77b-dd03a6018bd3'::uuid, 'a683bb41-182d-440b-9e6c-d82ebfd38f1d'::uuid),
    ('47f874b2-ea20-4b89-af44-085905bb1f60'::uuid, '5dd278a1-ccaa-48e6-84c2-7190ee63c9d8'::uuid),
    ('a3624761-be25-4841-83e4-c5936ec434fe'::uuid, '26726d70-a78d-4210-9ccc-d79abd215099'::uuid),
    ('242de512-f2fb-4994-9615-6c1e2c55ac02'::uuid, 'a8259bb9-d94d-4aee-af25-28f0a9656a60'::uuid)
)
select
  'duplicate_side' as side,
  em.source,
  count(*)::int as active_mapping_rows,
  count(distinct em.external_id)::int as distinct_external_ids
from mep_pairs p
join public.external_mappings em
  on em.card_print_id = p.duplicate_card_print_id
where em.active = true
group by em.source
union all
select
  'survivor_side' as side,
  em.source,
  count(*)::int as active_mapping_rows,
  count(distinct em.external_id)::int as distinct_external_ids
from mep_pairs p
join public.external_mappings em
  on em.card_print_id = p.survivor_card_print_id
where em.active = true
group by em.source
order by side, source;

-- User/market reference hard-stop gate.
with mep_duplicate_ids(card_print_id) as (
  values
    ('6419894a-137f-4fc7-8db1-fa853872b190'::uuid),
    ('b75d4730-3c1a-42ca-9d18-e8ca736ae41f'::uuid),
    ('aa9f207d-c9ea-4607-bbc5-448648bca47f'::uuid),
    ('bf523703-271c-49fe-b8aa-c31c57cb9b32'::uuid),
    ('04e533ae-dd17-478c-ab46-220859079b2c'::uuid),
    ('ac2b6cf7-6873-44e8-96b9-e03a179fae51'::uuid),
    ('870f45fe-0680-4a92-b77b-dd03a6018bd3'::uuid),
    ('47f874b2-ea20-4b89-af44-085905bb1f60'::uuid),
    ('a3624761-be25-4841-83e4-c5936ec434fe'::uuid),
    ('242de512-f2fb-4994-9615-6c1e2c55ac02'::uuid)
)
select 'pricing_watch.card_print_id' as reference_table, count(*)::int as reference_rows
from public.pricing_watch pw
join mep_duplicate_ids d on d.card_print_id = pw.card_print_id
union all
select 'vault_item_instances.card_print_id', count(*)::int
from public.vault_item_instances vii
join mep_duplicate_ids d on d.card_print_id = vii.card_print_id
union all
select 'vault_items.card_id', count(*)::int
from public.vault_items vi
join mep_duplicate_ids d on d.card_print_id = vi.card_id
union all
select 'justtcg_variants.card_print_id', count(*)::int
from public.justtcg_variants jv
join mep_duplicate_ids d on d.card_print_id = jv.card_print_id;

-- Public ID safety: unpadded MEP IDs must remain absent.
select
  count(*)::int as unpadded_public_mep_ids
from public.card_prints
where gv_id in (
  'GV-PK-MEP-1',
  'GV-PK-MEP-2',
  'GV-PK-MEP-3',
  'GV-PK-MEP-4',
  'GV-PK-MEP-5',
  'GV-PK-MEP-6',
  'GV-PK-MEP-7',
  'GV-PK-MEP-8',
  'GV-PK-MEP-9',
  'GV-PK-MEP-10'
);

rollback;

-- FUTURE WRITE SECTION - COMMENTED BY DESIGN.
-- Do not uncomment without fresh evidence, explicit approval, rollback snapshots,
-- and a reviewed execution matrix generated from live DB.
--
-- begin;
--
-- -- Future preflight table should be populated from a reviewed matrix.
-- -- create temporary table tmp_mep_duplicate_resolution_approved_v1 (
-- --   duplicate_card_print_id uuid primary key,
-- --   survivor_card_print_id uuid not null,
-- --   tcgdex_external_id text not null
-- -- ) on commit drop;
--
-- -- Guard: duplicate rows must still have no user/market references.
-- -- select count(*) as duplicate_reference_blockers
-- -- from tmp_mep_duplicate_resolution_approved_v1 a
-- -- left join public.pricing_watch pw on pw.card_print_id = a.duplicate_card_print_id
-- -- left join public.vault_item_instances vii on vii.card_print_id = a.duplicate_card_print_id
-- -- left join public.vault_items vi on vi.card_id = a.duplicate_card_print_id
-- -- left join public.justtcg_variants jv on jv.card_print_id = a.duplicate_card_print_id
-- -- where pw.card_print_id is not null
-- --    or vii.card_print_id is not null
-- --    or vi.card_id is not null
-- --    or jv.card_print_id is not null;
--
-- -- Guard: survivors must still own padded public GV IDs.
-- -- select count(*) as survivor_public_id_blockers
-- -- from tmp_mep_duplicate_resolution_approved_v1 a
-- -- join public.card_prints cp on cp.id = a.survivor_card_print_id
-- -- where cp.gv_id !~ '^GV-PK-MEP-[0-9]{3}$';
--
-- -- Future source preservation shape only. No card_prints.gv_id writes.
-- -- update public.external_mappings em
-- -- set card_print_id = a.survivor_card_print_id
-- -- from tmp_mep_duplicate_resolution_approved_v1 a
-- -- where em.card_print_id = a.duplicate_card_print_id
-- --   and em.source = 'tcgdex'
-- --   and em.external_id = a.tcgdex_external_id
-- --   and em.active = true;
--
-- -- Duplicate row retirement requires a supported non-public alias/quarantine mechanism.
-- -- No card row removal belongs in this plan.
--
-- rollback;
