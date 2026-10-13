import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

import { evaluateTcgplayerMarketQualificationV1 } from
  '../../backend/pricing/tcgplayer_market_publication_policy_v1.mjs';

const root = process.cwd();
const migrationPath = path.join(root, 'supabase', 'migrations',
  '20261012193000_pokemon_tcgplayer_reviewed_finish_override_v1.sql');
const rehearsalPath = path.join(root, 'docs', 'audits', 'pricing',
  'pokemon_tcgplayer_variant_repair_20261012', 'batch_02',
  'mep_schema_rollback_rehearsal.json');
const migrationBytes = await fs.readFile(migrationPath);
const migration = migrationBytes.toString('utf8')
  .replace(/^begin;\s*/i, '').replace(/commit;\s*$/i, '');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

const client = new pg.Client({
  host: '127.0.0.1', port: 5432, user: 'postgres', password: 'postgres',
  database: 'postgres', application_name: 'pokemon_tcgplayer_finish_override_rehearsal_v1',
});

const setup = String.raw`
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;
create table public.tcgcsv_source_price_daily_observations(
  id uuid primary key,source_artifact_id uuid,product_id integer,category_id integer,group_id integer,
  subtype_name text,subtype_name_normalized text,last_seen_run_id uuid,source_price_row_identity text,
  payload_hash text,observed_on date,market_price numeric,currency text);
create table public.tcgcsv_source_products(product_id integer primary key,payload_hash text,name text);
create table public.tcgcsv_source_artifacts(id uuid primary key,sha256 text);
create table public.external_mappings(id bigint primary key,source text,external_id text,active boolean,card_print_id uuid);
create table public.card_prints(id uuid primary key,gv_id text);
create table public.card_print_identity(card_print_id uuid,identity_domain text,is_active boolean);
create table public.card_printings(id uuid primary key,card_print_id uuid,finish_key text,printing_gv_id text);
create table public.card_printing_truth_reviews(
  id uuid primary key,card_printing_id uuid,active boolean,public_visibility text);
create table public.market_evidence_variant_assignments(
  id uuid primary key,contract_version text,source_family text,source_table text,source_row_id uuid,
  observation_id uuid,raw_snapshot_id uuid,card_print_id uuid,gv_id text,card_printing_id uuid,
  printing_gv_id text,source_finish_hint text,normalized_finish_key text,assigned_finish_key text,
  variant_assignment_status text,variant_assignment_confidence numeric,variant_assignment_version text,
  variant_assignment_reason text,variant_assignment_flags text[],assignment_payload jsonb,needs_review boolean,
  publishable boolean,app_visible boolean,market_truth boolean,created_at timestamptz);
create table public.v_tcgplayer_market_qualification_candidates_v2(
  source_observation_id uuid,source_sync_run_id uuid,source_artifact_id uuid,source_artifact_date date,
  source_artifact_hash text,source_artifact_byte_size bigint,source_artifact_http_status integer,
  source_price_row_identity text,source_row_hash text,source_product_id integer,category_id integer,group_id integer,
  source_subtype_name text,subtype_name_normalized text,source_observed_on date,source_last_observed_at timestamptz,
  duplicate_product_row_count integer,currency text,low_price numeric,mid_price numeric,high_price numeric,
  market_price numeric,direct_low_price numeric,source_product_name text,source_product_active boolean,
  source_product_catalog_status text,source_product_extended_data jsonb,source_sync_mode text,
  source_sync_status text,source_sync_finished_at timestamptz,source_sync_failed_count integer,
  source_run_artifact_hash text,normalized_finish_key text,source_mapping_count integer,
  card_print_mapping_count integer,card_printing_mapping_count integer,identity_domain_count integer,
  source_mapping_id bigint,source_mapping_meta jsonb,card_print_id uuid,gv_id text,card_rarity text,
  identity_domain text,card_printing_id uuid,printing_gv_id text,finish_key text,variant_assignment_id uuid,
  variant_assignment_status text,variant_assignment_version text,variant_assignment_confidence numeric,
  has_printed_number_evidence boolean,mapping_method text,mapping_confidence numeric,
  derived_variant_assignment_status text,cosmos_finish_authority boolean,edition_assignment_id uuid,
  edition_binding_id uuid,edition_assignment_sha256 text,edition_assignment_version text,
  edition_assignment_payload jsonb,edition_assignment_required boolean,edition_assignment_current boolean,
  edition_source_sync_finished_at text,printed_identity_modifier text);
`;

const rows = [
  {
    product: 654596, observation: '2664dc1d-4e03-43cb-8346-0ca5f10c4b19',
    parent: '95dca2c2-c3e7-43b4-bc02-227fddc4910d', gv: 'GV-PK-MEP-002',
    printing: '42918a6d-7aeb-42fe-9163-9489ea3070c5', printingGv: 'GV-PK-MEP-002-HOLO',
    productHash: '65988cf3a595e676cc5ac8417d261f93330742ac1a612c4f155e3eec1d42457d',
    candidate: 'd1509f19057ae377d983ea6640fd02e47487deea1732278179aadcf248a54b59',
    gap: '9360612f-a90c-4236-a5b9-29de21a8b875',
    rowHash: '805ec6c5626b16379810d29c22f426f994c90f580e8b9f63997c9d15aa8140a0',
    priceIdentity: 'tcgplayer:654596:normal', price: '12.21', name: 'Inteleon', mapping: 351663,
  },
  {
    product: 654598, observation: 'e626cae7-60cf-4f41-a30f-531ccb3f3432',
    parent: 'cddc521f-ebbe-4460-85d5-d78278672f95', gv: 'GV-PK-MEP-004',
    printing: '6f650737-4528-4b75-9b85-3037ce800dc2', printingGv: 'GV-PK-MEP-004-HOLO',
    productHash: 'da3644e729758eb2cb8e978b83bd8e4b315823ed4791725a0d5ba772ac814f73',
    candidate: '790628b1719919a066b06fca06b9d7e5b90f015843f1fca05914663ba535f2ce',
    gap: '47ff952e-ee35-445e-98bd-adb69949c42a',
    rowHash: '7e71d9924a5d2fe4ad97f84430070b723270e487deb64af2861442ee72c98207',
    priceIdentity: 'tcgplayer:654598:normal', price: '18.20', name: 'Lunatone', mapping: 351664,
  },
];
const runId = 'e429784c-55f2-4922-94dc-0cc560acda8d';
const artifactId = '2d2e6471-7b21-4748-b843-f6a70821039c';
const artifactHash = '368ce87a576166ae265ddecaa1289ed4f0bd233523c3a717ae2a626721a62697';
const assignmentId = product => `00000000-0000-5000-a000-${String(product).padStart(12, '0')}`;

await client.connect();
try {
  assert.equal(client.connectionParameters.host, '127.0.0.1');
  assert.equal(Number(client.connectionParameters.port), 5432);
  await client.query('begin');
  await client.query(setup);
  await client.query(migration);
  await client.query('insert into public.tcgcsv_source_artifacts(id,sha256) values($1,$2)',
    [artifactId, artifactHash]);

  for (const row of rows) {
    const payload = {
      source_product_id: row.product,
      source_product_sha256: row.productHash,
      reviewed_source_products_payload_sha256:
        '0d15963655e06bddfba508af38ac21f64a0bfd0cec20011cb09e72d3d8ffb957',
      source_candidate_fingerprint: row.candidate,
      mapping_gap_observation_id: row.gap,
      source_sync_run_id: runId,
      source_artifact_id: artifactId,
      source_artifact_hash: artifactHash,
      source_price_row_identity: row.priceIdentity,
      source_row_hash: row.rowHash,
      source_observed_on: '2026-10-12T06:00:00.000Z',
      authority_plan_fingerprint:
        'ced09a10c3194b404452b360a932e79b32e8e11c3c69d18989ca5f1f6d93e495',
    };
    await client.query('insert into public.tcgcsv_source_products values($1,$2,$3)',
      [row.product, row.productHash, row.name]);
    await client.query('insert into public.card_prints values($1,$2)', [row.parent, row.gv]);
    await client.query('insert into public.card_print_identity values($1,$2,true)',
      [row.parent, 'pokemon_eng_standard']);
    await client.query('insert into public.card_printings values($1,$2,$3,$4)',
      [row.printing, row.parent, 'holo', row.printingGv]);
    await client.query('insert into public.external_mappings values($1,$2,$3,true,$4)',
      [row.mapping, 'tcgplayer', String(row.product), row.parent]);
    await client.query(`insert into public.tcgcsv_source_price_daily_observations
      values($1,$2,$3,3,24451,'Normal','normal',$4,$5,$6,'2026-10-12',$7,'USD')`,
    [row.observation, artifactId, row.product, runId, row.priceIdentity, row.rowHash, row.price]);
    await client.query(`insert into public.market_evidence_variant_assignments values(
      $1,'MARKET_EVIDENCE_VARIANT_ASSIGNMENT_V1','tcgcsv_market_close',
      'tcgcsv_source_price_daily_observations',$2,$2,$3,$4,$5,$6,$7,'Normal','normal','holo',
      'exact_child_finish',1.0000,'MEE_TCGPLAYER_REVIEWED_FINISH_OVERRIDE_V1',
      'reviewed exact override',array['reviewed_source_finish_override'],$8,false,false,false,false,now())`,
    [assignmentId(row.product), row.observation, artifactId, row.parent, row.gv,
      row.printing, row.printingGv, payload]);
    await client.query(`insert into public.v_tcgplayer_market_qualification_candidates_v2(
      source_observation_id,source_sync_run_id,source_artifact_id,source_artifact_date,
      source_artifact_hash,source_artifact_byte_size,source_artifact_http_status,
      source_price_row_identity,source_row_hash,source_product_id,category_id,group_id,
      source_subtype_name,subtype_name_normalized,source_observed_on,source_last_observed_at,
      duplicate_product_row_count,currency,market_price,source_product_name,source_product_active,
      source_product_catalog_status,source_product_extended_data,source_sync_mode,source_sync_status,
      source_sync_finished_at,source_sync_failed_count,source_run_artifact_hash,normalized_finish_key,
      source_mapping_count,card_print_mapping_count,card_printing_mapping_count,identity_domain_count,
      source_mapping_id,source_mapping_meta,card_print_id,gv_id,identity_domain,
      variant_assignment_status,variant_assignment_version,variant_assignment_confidence,
      has_printed_number_evidence,mapping_method,mapping_confidence,
      derived_variant_assignment_status,cosmos_finish_authority,edition_assignment_required,
      edition_assignment_current)
      values($1,$2,$3,'2026-10-12',$4,100,200,$5,$6,$7,3,24451,'Normal','normal',
      '2026-10-12','2026-10-12T12:00:00Z',1,'USD',$8,$9,true,'current',
      '[{"name":"Number","value":"001"}]','current_full_sync','completed',
      '2026-10-12T12:00:00Z',0,$4,'normal',1,1,0,1,$10,
      '{"mapping_method":"exact_reviewed_fixture","confidence":0.99}',$11,$12,
      'pokemon_eng_standard','no_matching_child_finish','MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1',
      0,true,'exact_reviewed_fixture',0.99,'no_matching_child_finish',false,false,false)`,
    [row.observation, runId, artifactId, artifactHash, row.priceIdentity, row.rowHash,
      row.product, row.price, row.name, row.mapping, row.parent, row.gv]);
  }

  const projected = (await client.query(
    'select * from public.v_tcgplayer_market_qualification_candidates_v3 order by source_product_id')).rows;
  assert.equal(projected.length, 2);
  for (const row of projected) {
    const expected = rows.find(item => item.product === row.source_product_id);
    assert.equal(row.source_subtype_name, 'Normal');
    assert.equal(row.normalized_finish_key, 'holo');
    assert.equal(row.finish_key, 'holo');
    assert.equal(row.card_printing_id, expected.printing);
    assert.equal(row.printing_gv_id, expected.printingGv);
    assert.equal(row.variant_assignment_version, 'MEE_TCGPLAYER_REVIEWED_FINISH_OVERRIDE_V1');
    assert.equal(row.mapping_method, 'reviewed_finish_override_v1');
    const decision = evaluateTcgplayerMarketQualificationV1(
      { ...row, source_group_name: 'Mega Evolution Promo' },
      { now: new Date('2026-10-12T13:00:00Z') });
    assert.equal(decision.eligible, true, `${expected.product}:${decision.reason_codes}`);
  }

  await client.query(`update public.market_evidence_variant_assignments
    set assignment_payload=jsonb_set(assignment_payload,'{source_row_hash}',to_jsonb($1::text))
    where source_row_id=$2`, ['0'.repeat(64), rows[0].observation]);
  const drifted = (await client.query(
    'select * from public.v_tcgplayer_market_qualification_candidates_v3 where source_product_id=$1',
  [rows[0].product])).rows[0];
  assert.equal(drifted.normalized_finish_key, 'normal');
  assert.equal(drifted.card_printing_id, null);
  assert.equal(drifted.derived_variant_assignment_status, 'no_matching_child_finish');

  await client.query(`insert into public.card_printing_truth_reviews
    values('00000000-0000-5000-b000-000000654598',$1,true,'hidden_pending_review')`,
  [rows[1].printing]);
  const quarantined = (await client.query(
    'select * from public.v_tcgplayer_market_qualification_candidates_v3 where source_product_id=$1',
  [rows[1].product])).rows[0];
  assert.equal(quarantined.normalized_finish_key, 'normal');
  assert.equal(quarantined.card_printing_id, null);
  assert.equal(quarantined.derived_variant_assignment_status, 'no_matching_child_finish');

  const receipt = {
    version: 'POKEMON_TCGPLAYER_REVIEWED_FINISH_OVERRIDE_SCHEMA_REHEARSAL_V1',
    status: 'passed_rolled_back',
    migration_sha256: sha256(migrationBytes),
    target: { host: '127.0.0.1', port: 5432, database: 'postgres' },
    exact_override_rows: projected.map(row => ({
      source_product_id: row.source_product_id,
      source_observation_id: row.source_observation_id,
      raw_source_subtype_name: row.source_subtype_name,
      assigned_finish_key: row.finish_key,
      card_printing_id: row.card_printing_id,
      variant_assignment_version: row.variant_assignment_version,
      local_policy_eligible: true,
    })),
    drift_test: {
      changed_field: 'assignment_payload.source_row_hash',
      override_rejected: true,
      fallback_status: drifted.derived_variant_assignment_status,
    },
    truth_quarantine_test: {
      public_visibility: 'hidden_pending_review',
      override_rejected: true,
      fallback_status: quarantined.derived_variant_assignment_status,
    },
    database_writes_committed: 0,
    price_publication_writes: 0,
    customer_state_writes: 0,
    rollback_proof_equal: true,
  };
  await client.query('rollback');
  const absent = (await client.query(`select
    to_regclass('public.v_tcgplayer_market_qualification_candidates_v3') as view_name,
    to_regprocedure('public.pokemon_tcgplayer_reviewed_finish_override_valid_v1(uuid,uuid)') as function_name`)).rows[0];
  assert.equal(absent.view_name, null);
  assert.equal(absent.function_name, null);
  await fs.writeFile(rehearsalPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  await client.query('rollback').catch(() => {});
  throw error;
} finally {
  await client.end();
}
