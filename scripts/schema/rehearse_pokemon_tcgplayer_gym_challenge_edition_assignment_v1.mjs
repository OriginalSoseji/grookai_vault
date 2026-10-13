import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

import { evaluateTcgplayerMarketQualificationV1 } from
  '../../backend/pricing/tcgplayer_market_publication_policy_v1.mjs';

const root = process.cwd();
const migrationPath = path.join(root, 'supabase', 'migrations',
  '20261013123000_pokemon_tcgplayer_gym_challenge_edition_assignment_v1.sql');
const planPath = path.join(root, 'docs', 'audits', 'pricing',
  'pokemon_tcgplayer_variant_repair_20261012', 'batch_02', 'rehearsal.json');
const receiptPath = path.join(root, 'docs', 'audits', 'pricing',
  'pokemon_tcgplayer_variant_repair_20261012', 'batch_02',
  'gym_edition_assignment_rollback_rehearsal.json');
const migrationBytes = await fs.readFile(migrationPath);
const migration = migrationBytes.toString('utf8')
  .replace(/^begin;\s*/i, '').replace(/commit;\s*$/i, '');
const plan = JSON.parse(await fs.readFile(planPath, 'utf8'));
const rows = plan.gym_rows;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

const client = new pg.Client({
  host: '127.0.0.1', port: 5432, user: 'postgres', password: 'postgres',
  database: 'postgres',
  application_name: 'pokemon_tcgplayer_gym_challenge_edition_rehearsal_v1',
});

const setup = String.raw`
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create table public.sets(id uuid primary key,code text,game text,identity_model text);
create table public.card_prints(
  id uuid primary key,set_id uuid,set_code text,name text,number text,number_plain text,
  gv_id text,identity_domain text,set_identity_model text,variant_key text,
  printed_identity_modifier text,external_ids jsonb,image_status text);
create table public.card_print_identity(
  id uuid primary key,card_print_id uuid,identity_domain text,set_code_identity text,
  printed_number text,normalized_printed_name text,source_name_raw text,
  identity_payload jsonb,identity_key_version text,identity_key_hash text,is_active boolean);
create table public.card_printings(
  id uuid primary key,card_print_id uuid,finish_key text,printing_gv_id text,
  is_provisional boolean,provenance_source text,provenance_ref text,created_by text);
create table public.card_printing_truth_reviews(
  id uuid primary key,card_printing_id uuid,active boolean,public_visibility text);
create table public.tcgcsv_source_products(
  product_id integer primary key,category_id integer,group_id integer,name text,
  payload_hash text,source_active boolean,catalog_metadata_status text,extended_data jsonb);
create table public.tcgcsv_source_sync_runs(
  id uuid primary key,run_key text,observed_on date,artifact_hash text,finished_at timestamptz,
  failed_count integer,status text,sync_mode text,created_at timestamptz);
create table public.tcgcsv_source_artifacts(
  id uuid primary key,sync_run_id uuid,run_key text,artifact_kind text,observed_on date,
  category_id integer,group_id integer,http_status integer,byte_size bigint,sha256 text);
create table public.tcgcsv_source_price_daily_observations(
  id uuid primary key,source_artifact_id uuid,product_id integer,category_id integer,
  group_id integer,subtype_name text,subtype_name_normalized text,last_seen_run_id uuid,
  source_price_row_identity text,payload_hash text,observed_on date,last_observed_at timestamptz,
  market_price numeric,low_price numeric,mid_price numeric,high_price numeric,
  direct_low_price numeric,currency text,raw_payload jsonb);
create table public.external_mappings(
  id bigint primary key,source text,external_id text,active boolean,card_print_id uuid);
create table public.tcgplayer_jungle_edition_assignments_v1(id uuid primary key);
create table public.v_tcgplayer_jungle_edition_current_assignments_v1(
  id uuid,assignment_payload jsonb);
create table public.jungle_edition_identity_links_v1(
  legacy_card_print_id uuid,card_print_id uuid,state text);
create table public.market_price_pipeline_candidates(
  id uuid primary key default gen_random_uuid(),run_id uuid,source_observation_id uuid,
  source_mapping_id bigint,variant_assignment_id uuid,
  edition_assignment_id uuid references public.tcgplayer_jungle_edition_assignments_v1(id),
  card_print_id uuid,candidate_payload jsonb);
create table public.market_price_qualification_decisions(
  id uuid primary key default gen_random_uuid(),run_id uuid,pipeline_candidate_id uuid,
  source_observation_id uuid,source_mapping_id bigint,variant_assignment_id uuid,
  edition_assignment_id uuid references public.tcgplayer_jungle_edition_assignments_v1(id),
  card_print_id uuid,eligible boolean,decision text,publication_lane text,policy_version text);
create table public.market_price_publication_snapshots(
  id uuid primary key default gen_random_uuid(),publication_set_id uuid,run_id uuid,
  qualification_decision_id uuid,source_observation_id uuid,source_mapping_id bigint not null,
  variant_assignment_id uuid not null,
  edition_assignment_id uuid references public.tcgplayer_jungle_edition_assignments_v1(id),
  card_print_id uuid,policy_version text);
alter table public.market_price_publication_snapshots
  add constraint market_price_snapshot_assignment_lane_v1 check (
    (edition_assignment_id is null and source_mapping_id is not null and variant_assignment_id is not null)
    or (edition_assignment_id is not null and source_mapping_id is null and variant_assignment_id is null));
create table public.v_tcgplayer_market_qualification_candidates_v3(
  source_observation_id uuid,source_sync_run_id uuid,source_artifact_id uuid,
  source_artifact_date date,source_artifact_hash text,source_artifact_byte_size bigint,
  source_artifact_http_status integer,source_price_row_identity text,source_row_hash text,
  source_product_id integer,category_id integer,group_id integer,source_subtype_name text,
  subtype_name_normalized text,source_observed_on date,source_last_observed_at timestamptz,
  duplicate_product_row_count integer,currency text,low_price numeric,mid_price numeric,
  high_price numeric,market_price numeric,direct_low_price numeric,source_product_name text,
  source_product_active boolean,source_product_catalog_status text,
  source_product_extended_data jsonb,source_sync_mode text,source_sync_status text,
  source_sync_finished_at timestamptz,source_sync_failed_count integer,
  source_run_artifact_hash text,normalized_finish_key text,source_mapping_count integer,
  card_print_mapping_count integer,card_printing_mapping_count integer,
  identity_domain_count integer,source_mapping_id bigint,source_mapping_meta jsonb,
  card_print_id uuid,gv_id text,card_rarity text,identity_domain text,
  card_printing_id uuid,printing_gv_id text,finish_key text,variant_assignment_id uuid,
  variant_assignment_status text,variant_assignment_version text,
  variant_assignment_confidence numeric,has_printed_number_evidence boolean,
  mapping_method text,mapping_confidence numeric,derived_variant_assignment_status text,
  cosmos_finish_authority boolean,edition_assignment_id uuid,edition_binding_id uuid,
  edition_assignment_sha256 text,edition_assignment_version text,
  edition_assignment_payload jsonb,edition_assignment_required boolean,
  edition_assignment_current boolean,edition_source_sync_finished_at text,
  printed_identity_modifier text);
`;

const runId = 'e429784c-55f2-4922-94dc-0cc560acda8d';
const artifactId = '10000000-0000-4000-8000-000000000001';
const artifactHash = '2'.repeat(64);
const runHash = '3'.repeat(64);
const setId = 'bb258610-a859-4f71-b54a-21a8591a5fad';
const legacy = new Map([
  [85720, { id: 'b12ba460-4fc9-4c73-892e-11ea0cf27176', gv: 'GV-PK-G2-75' }],
  [85721, { id: 'c864fcfa-fe67-4ec2-8932-a81b7a02c7e1', gv: 'GV-PK-G2-76' }],
]);

await client.connect();
try {
  assert.equal(client.connectionParameters.host, '127.0.0.1');
  assert.equal(Number(client.connectionParameters.port), 5432);
  await client.query('begin');
  await client.query(setup);
  await client.query(migration);
  await client.query(`insert into public.sets values($1,'gym2','pokemon','standard')`, [setId]);
  await client.query(`insert into public.tcgcsv_source_sync_runs values(
    $1,'gym-rehearsal','2026-10-12',$2,'2026-10-13T17:00:00Z',0,
    'completed','current_full_sync','2026-10-13T16:00:00Z')`, [runId, runHash]);
  await client.query(`insert into public.tcgcsv_source_artifacts values(
    $1,$2,'gym-rehearsal','prices','2026-10-12',3,1440,200,4096,$3)`,
  [artifactId, runId, artifactHash]);

  for (const [productId, base] of legacy) {
    const sample = rows.find(row => row.source_observation.product_id === productId);
    await client.query(`insert into public.card_prints values(
      $1,$2,'gym2',$3,$4,$4,$5,'pokemon_eng_standard','standard','',null,'{}','missing')`,
    [base.id, setId, sample.card_print.name, sample.card_print.number, base.gv]);
    await client.query(`insert into public.tcgcsv_source_products values(
      $1,3,1440,$2,$3,true,'current',$4)`, [productId, sample.card_print.name,
      sample.source_binding_template.source_product_sha256,
      JSON.stringify([{ name: 'Number', value: `${sample.card_print.number}/132` }])]);
    await client.query(`insert into public.external_mappings values(
      $1,'tcgplayer',$2,true,$3)`, [350000 + productId, String(productId), base.id]);
  }

  for (const row of rows) {
    const card = row.card_print, identity = row.card_print_identity;
    const printing = row.card_printing, observation = row.source_observation;
    const binding = row.source_binding_template;
    await client.query(`insert into public.card_prints values(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [card.id, card.set_id, card.set_code, card.name, card.number, card.number_plain,
      card.gv_id, card.identity_domain, card.set_identity_model, card.variant_key,
      card.printed_identity_modifier, card.external_ids, card.image_status]);
    await client.query(`insert into public.card_print_identity values(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)`,
    [identity.id, identity.card_print_id, identity.identity_domain,
      identity.set_code_identity, identity.printed_number,
      identity.normalized_printed_name, identity.source_name_raw,
      identity.identity_payload, identity.identity_key_version,
      sha256(JSON.stringify(identity.identity_payload))]);
    await client.query(`insert into public.card_printings values(
      $1,$2,$3,$4,false,$5,$6,$7)`,
    [printing.id, printing.card_print_id, printing.finish_key,
      printing.printing_gv_id, printing.provenance_source,
      printing.provenance_ref, printing.created_by]);
    await client.query(`insert into public.tcgcsv_source_price_daily_observations values(
      $1,$2,$3,3,1440,$4,lower($4),$5,$6,$7,'2026-10-12','2026-10-13T16:59:00Z',
      $8,$8,$8,$8,$8,'USD',$9)`,
    [observation.source_observation_id, artifactId, observation.product_id,
      observation.subtype_name, runId,
      `tcgplayer:${observation.product_id}:${observation.subtype_name.toLowerCase()}`,
      observation.payload_hash, observation.market_price,
      JSON.stringify({ productId: observation.product_id, subtypeName: observation.subtype_name })]);
    await client.query(`insert into public.v_tcgplayer_market_qualification_candidates_v3(
      source_observation_id,source_sync_run_id,source_artifact_id,source_artifact_date,
      source_artifact_hash,source_artifact_byte_size,source_artifact_http_status,
      source_price_row_identity,source_row_hash,source_product_id,category_id,group_id,
      source_subtype_name,subtype_name_normalized,source_observed_on,source_last_observed_at,
      duplicate_product_row_count,currency,low_price,mid_price,high_price,market_price,
      direct_low_price,source_product_name,source_product_active,source_product_catalog_status,
      source_product_extended_data,source_sync_mode,source_sync_status,source_sync_finished_at,
      source_sync_failed_count,source_run_artifact_hash,normalized_finish_key,
      source_mapping_count,card_print_mapping_count,card_printing_mapping_count,
      identity_domain_count,source_mapping_id,source_mapping_meta,has_printed_number_evidence,
      mapping_confidence,derived_variant_assignment_status,cosmos_finish_authority,
      edition_assignment_required,edition_assignment_current)
      values($1,$2,$3,'2026-10-12',$4,4096,200,$5,$6,$7,3,1440,$8,lower($8),
      '2026-10-12','2026-10-13T16:59:00Z',1,'USD',$9,$9,$9,$9,$9,$10,true,'current',
      $11,'current_full_sync','completed','2026-10-13T17:00:00Z',0,$12,'normal',
      0,0,0,0,null,null,true,1,'no_matching_child_finish',false,true,false)`,
    [observation.source_observation_id, runId, artifactId, artifactHash,
      `tcgplayer:${observation.product_id}:${observation.subtype_name.toLowerCase()}`,
      observation.payload_hash, observation.product_id, observation.subtype_name,
      observation.market_price, card.name,
      JSON.stringify([{ name: 'Number', value: `${card.number}/132` }]), runHash]);
    await client.query(`insert into public.tcgplayer_gym_challenge_edition_bindings_v1(
      id,contract_version,source,category_id,group_id,product_id,source_subtype,
      source_products_payload_sha256,source_product_sha256,source_observation_id,
      source_price_row_hash,source_sync_run_id,card_print_id,card_printing_id,
      assigned_edition,assigned_finish_key,authority_plan_fingerprint,state,
      publishable,app_visible,market_truth)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
        'staged',false,false,false)`,
    [binding.id, binding.contract_version, binding.source, binding.category_id,
      binding.group_id, binding.product_id, binding.source_subtype,
      binding.source_product_payload_sha256, binding.source_product_sha256,
      binding.source_observation_id, binding.source_price_row_hash,
      binding.source_sync_run_id, binding.card_print_id, binding.card_printing_id,
      binding.assigned_edition, binding.assigned_finish_key,
      plan.authority_plan_fingerprint]);
  }

  await client.query(`update public.tcgplayer_gym_challenge_edition_bindings_v1
    set state='active'`);
  assert.equal((await client.query(
    `select count(*)::int n from public.tcgplayer_gym_challenge_edition_bindings_v1
      where public.pokemon_tcgplayer_gym_challenge_binding_valid_v1(id,true)`)).rows[0].n, 4);
  assert.equal((await client.query(
    `select public.prepare_tcgplayer_gym_challenge_edition_assignments_v1($1) n`,
    [runId])).rows[0].n, 4);
  assert.equal((await client.query(
    `select public.prepare_tcgplayer_gym_challenge_edition_assignments_v1($1) n`,
    [runId])).rows[0].n, 0);

  const projected = (await client.query(
    `select * from public.v_tcgplayer_market_qualification_candidates_v4
      order by source_product_id,source_subtype_name`)).rows;
  assert.equal(projected.length, 4);
  const decisions = projected.map(row => evaluateTcgplayerMarketQualificationV1(
    { ...row, source_group_name: 'Gym Challenge' },
    { now: new Date('2026-10-13T18:00:00Z') }));
  assert.ok(decisions.every(decision => decision.eligible),
    decisions.map(decision => decision.reason_codes).join(';'));
  assert.ok(projected.every(row => row.edition_assignment_id === null &&
    row.gym_edition_assignment_id && row.source_mapping_id === null &&
    row.variant_assignment_id === null));

  const first = projected[0];
  await client.query(`insert into public.market_price_pipeline_candidates(
    run_id,source_observation_id,source_mapping_id,variant_assignment_id,
    edition_assignment_id,gym_edition_assignment_id,card_print_id,candidate_payload)
    values(gen_random_uuid(),$1,null,null,null,$2,$3,$4)`,
  [first.source_observation_id, first.gym_edition_assignment_id,
    first.card_print_id, first]);
  await client.query('savepoint wrong_fk_lane');
  await assert.rejects(client.query(`insert into public.market_price_pipeline_candidates(
    run_id,source_observation_id,source_mapping_id,variant_assignment_id,
    edition_assignment_id,gym_edition_assignment_id,card_print_id,candidate_payload)
    values(gen_random_uuid(),$1,null,null,$2,null,$3,$4)`,
  [first.source_observation_id, first.gym_edition_assignment_id,
    first.card_print_id, first]), /foreign key/i);
  await client.query('rollback to savepoint wrong_fk_lane');

  await client.query(`update public.tcgcsv_source_price_daily_observations
    set payload_hash=$1 where id=$2`, ['0'.repeat(64), rows[0].source_observation.source_observation_id]);
  const drifted = (await client.query(
    `select * from public.v_tcgplayer_market_qualification_candidates_v4
      where source_observation_id=$1`, [rows[0].source_observation.source_observation_id])).rows[0];
  assert.equal(drifted.gym_edition_assignment_id, null);
  assert.equal(evaluateTcgplayerMarketQualificationV1(
    { ...drifted, source_group_name: 'Gym Challenge' },
    { now: new Date('2026-10-13T18:00:00Z') }).eligible, false);
  await client.query(`update public.tcgcsv_source_price_daily_observations
    set payload_hash=$1 where id=$2`, [rows[0].source_observation.payload_hash,
    rows[0].source_observation.source_observation_id]);

  await client.query(`insert into public.card_printing_truth_reviews
    values(gen_random_uuid(),$1,true,'hidden_pending_review')`,
  [rows[1].card_printing.id]);
  const quarantined = (await client.query(
    `select * from public.v_tcgplayer_market_qualification_candidates_v4
      where source_observation_id=$1`, [rows[1].source_observation.source_observation_id])).rows[0];
  assert.equal(quarantined.gym_edition_assignment_id, null);

  const receipt = {
    version: 'POKEMON_TCGPLAYER_GYM_CHALLENGE_EDITION_ASSIGNMENT_SCHEMA_REHEARSAL_V1',
    status: 'passed_rolled_back',
    migration_sha256: sha256(migrationBytes),
    authority_plan_fingerprint: plan.authority_plan_fingerprint,
    target: { host: '127.0.0.1', port: 5432, database: 'postgres' },
    exact_binding_rows: projected.map(row => ({
      source_product_id: row.source_product_id,
      source_observation_id: row.source_observation_id,
      source_subtype_name: row.source_subtype_name,
      card_print_id: row.card_print_id,
      card_printing_id: row.card_printing_id,
      local_policy_eligible: true,
    })),
    separate_fk_lane: { accepted_gym_fk: true, rejected_as_jungle_fk: true },
    idempotent_prepare: { first_inserted: 4, second_inserted: 0 },
    drift_test: { changed_field: 'source_observation.payload_hash', assignment_rejected: true },
    truth_quarantine_test: {
      public_visibility: 'hidden_pending_review', assignment_rejected: true,
    },
    historical_deleted_identifiers_reused: false,
    database_writes_committed: 0,
    price_publication_writes: 0,
    customer_state_writes: 0,
    rollback_proof_equal: true,
  };
  await client.query('rollback');
  const absent = (await client.query(`select
    to_regclass('public.tcgplayer_gym_challenge_edition_bindings_v1') binding_table,
    to_regclass('public.tcgplayer_gym_challenge_edition_assignments_v1') assignment_table,
    to_regclass('public.v_tcgplayer_market_qualification_candidates_v4') candidate_view`)).rows[0];
  assert.deepEqual(absent, { binding_table: null, assignment_table: null, candidate_view: null });
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  await client.query('rollback').catch(() => {});
  throw error;
} finally {
  await client.end();
}
