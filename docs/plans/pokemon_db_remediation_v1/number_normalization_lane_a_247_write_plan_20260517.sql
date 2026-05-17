-- LANE A 247-ROW NUMBER NORMALIZATION WRITE PLAN 2026-05-17
-- STATUS: PLAN ONLY. DO NOT EXECUTE WRITE SECTIONS AGAINST PRODUCTION.
--
-- This file is safe by default. The active section is read-only.
-- Future write statements are commented and require separate approval.

begin transaction read only;

-- Read-only scope sanity: the excluded referenced row must remain outside
-- the future 247-row write candidate lane.
select
  cp.id::text as card_print_id,
  s.code as set_code,
  cp.name as card_name,
  cp.number,
  cp.number_plain,
  cp.external_ids->>'tcgdex' as tcgdex_external_id
from public.card_prints cp
join public.sets s on s.id = cp.set_id
where cp.id = '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid;

-- Read-only reference inventory for the excluded row.
select 'pricing_watch.card_print_id' as reference_source, count(*)::int as reference_rows
from public.pricing_watch
where card_print_id = '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid
union all
select 'shared_cards.card_id', count(*)::int
from public.shared_cards
where card_id = '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid
union all
select 'slab_certs.card_print_id', count(*)::int
from public.slab_certs
where card_print_id = '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid
union all
select 'vault_item_instances.card_print_id', count(*)::int
from public.vault_item_instances
where card_print_id = '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid
union all
select 'vault_items.card_id', count(*)::int
from public.vault_items
where card_id = '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid
union all
select 'justtcg_variants.card_print_id', count(*)::int
from public.justtcg_variants
where card_print_id = '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid
union all
select 'justtcg_variant_prices_latest.card_print_id', count(*)::int
from public.justtcg_variant_prices_latest
where card_print_id = '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid
union all
select 'justtcg_variant_price_snapshots.card_print_id', count(*)::int
from public.justtcg_variant_price_snapshots
where card_print_id = '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid;

rollback;

-- FUTURE WRITE SECTION - COMMENTED BY DESIGN.
-- Do not uncomment without fresh evidence, explicit approval, and operator review.
--
-- begin;
--
-- -- Candidate table must be populated only from:
-- -- docs/plans/pokemon_db_remediation_v1/number_normalization_lane_a_247_write_plan_matrix_20260517.json
-- -- Expected exact row count: 247.
-- create temporary table tmp_number_normalization_lane_a_247_approved_v1 (
--   card_print_id uuid primary key,
--   expected_set_code text not null,
--   approved_number text not null,
--   approved_number_plain text not null,
--   expected_source_external_id text not null,
--   approval_note text not null
-- ) on commit drop;
--
-- -- Populate tmp_number_normalization_lane_a_247_approved_v1 from the reviewed matrix.
-- -- Do not hand-add rows outside the matrix.
--
-- -- Snapshot before-values for rollback.
-- create temporary table tmp_number_normalization_lane_a_247_snapshot_v1 as
-- select
--   cp.id,
--   cp.number,
--   cp.number_plain,
--   cp.print_identity_key,
--   cp.gv_id,
--   cp.updated_at
-- from public.card_prints cp
-- join tmp_number_normalization_lane_a_247_approved_v1 a on a.card_print_id = cp.id;
--
-- -- Guard: exact row count.
-- select count(*) as approved_row_count
-- from tmp_number_normalization_lane_a_247_approved_v1;
--
-- -- Guard: Grey Felt Hat Pikachu must be absent.
-- select count(*) as grey_felt_hat_scope_violation
-- from tmp_number_normalization_lane_a_247_approved_v1
-- where card_print_id = '50386954-ded6-4909-8d17-6b391aeb53e4'::uuid;
--
-- -- Guard: no hard-stop, review-stop, or me01 rows.
-- select count(*) as excluded_set_scope_violation
-- from tmp_number_normalization_lane_a_247_approved_v1 a
-- join public.card_prints cp on cp.id = a.card_print_id
-- join public.sets s on s.id = cp.set_id
-- where s.code in (
--   'pgo','swsh10.5','sv04.5','sv4pt5','sv06.5','sv6pt5','sv08.5','sv8pt5',
--   'bog','bp','tk-ex-latia','tk-ex-latio','tk-ex-m','tk-ex-p','tk1a','tk1b','tk2a','tk2b',
--   'me01'
-- );
--
-- -- Guard: target rows still have both number fields missing.
-- select count(*) as stale_candidate_violation
-- from tmp_number_normalization_lane_a_247_approved_v1 a
-- join public.card_prints cp on cp.id = a.card_print_id
-- where cp.number is not null
--    or cp.number_plain is not null;
--
-- -- Guard: approved values are numeric only.
-- select count(*) as non_numeric_approved_value_violation
-- from tmp_number_normalization_lane_a_247_approved_v1 a
-- where a.approved_number !~ '^[0-9]+$'
--    or a.approved_number_plain !~ '^[0-9]+$';
--
-- -- Guard: no same-set direct number or number_plain collision.
-- select count(*) as same_set_number_collision_violation
-- from tmp_number_normalization_lane_a_247_approved_v1 a
-- join public.card_prints cp on cp.id = a.card_print_id
-- join public.card_prints existing
--   on existing.set_id = cp.set_id
--  and existing.id <> cp.id
--  and (
--    existing.number = a.approved_number
--    or existing.number_plain = a.approved_number_plain
--  );
--
-- -- Guard: no user/market references on the 247-row write lane.
-- select count(*) as user_market_reference_violation
-- from tmp_number_normalization_lane_a_247_approved_v1 a
-- left join public.pricing_watch pw on pw.card_print_id = a.card_print_id
-- left join public.shared_cards sc on sc.card_id = a.card_print_id
-- left join public.slab_certs slab on slab.card_print_id = a.card_print_id
-- left join public.vault_item_instances vii on vii.card_print_id = a.card_print_id
-- left join public.vault_items vi on vi.card_id = a.card_print_id
-- left join public.justtcg_variants jv on jv.card_print_id = a.card_print_id
-- left join public.justtcg_variant_prices_latest jvl on jvl.card_print_id = a.card_print_id
-- left join public.justtcg_variant_price_snapshots jvs on jvs.card_print_id = a.card_print_id
-- where pw.card_print_id is not null
--    or sc.card_id is not null
--    or slab.card_print_id is not null
--    or vii.card_print_id is not null
--    or vi.card_id is not null
--    or jv.card_print_id is not null
--    or jvl.card_print_id is not null
--    or jvs.card_print_id is not null;
--
-- -- Future write shape only. Replace rollback with commit only after explicit approval.
-- update public.card_prints cp
-- set
--   number = a.approved_number,
--   number_plain = a.approved_number_plain,
--   updated_at = now()
-- from tmp_number_normalization_lane_a_247_approved_v1 a
-- where cp.id = a.card_print_id
--   and (cp.number is null or btrim(cp.number) = '')
--   and (cp.number_plain is null or btrim(cp.number_plain) = '');
--
-- -- Post-write verification must prove exactly 247 approved rows now match the matrix.
-- select count(*) as rows_matching_approved_numbers
-- from tmp_number_normalization_lane_a_247_approved_v1 a
-- join public.card_prints cp on cp.id = a.card_print_id
-- where cp.number = a.approved_number
--   and cp.number_plain = a.approved_number_plain;
--
-- rollback;
