import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import dotenv from 'dotenv';
import pg from 'pg';

import { classifyCrossTcgSealedProductV1 } from
  '../../backend/pricing/cross_tcg_sealed_product_identity_v1.mjs';
import {
  MTG_SEALED_GAME_KEY,
  MTG_SEALED_REVIEWER_ID,
  MTG_SEALED_WORLD_V1,
  buildMtgSealedWorldPlanV1,
  hashMtgSealedV1,
  validateMtgSealedWorldPlanV1,
} from '../../backend/pricing/mtg_sealed_world_v1.mjs';
import { pgSslConfig } from './japanese_master_index_v4/read_only_guard_v1.mjs';

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_OUT = path.join(ROOT, 'docs', 'audits', 'pricing',
  'mtg_sealed_world_v1', 'operator_v1');

function parseArgs(argv) {
  const args = { mode: '', expectedHeadSha: '', expectedPlanFingerprint: '',
    expectedSourceFingerprint: '', expectedCounts: null, execute: false,
    envFile: 'C:\\grookai_vault\\.env.local', outDir: DEFAULT_OUT };
  for (const argument of argv) {
    if (argument.startsWith('--mode=')) args.mode = argument.slice(7);
    else if (argument.startsWith('--expected-head-sha=')) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith('--expected-plan-fingerprint=')) {
      args.expectedPlanFingerprint = argument.slice(28).trim().toLowerCase();
    } else if (argument.startsWith('--expected-source-fingerprint=')) {
      args.expectedSourceFingerprint = argument
        .slice('--expected-source-fingerprint='.length).trim().toLowerCase();
    } else if (argument.startsWith('--expected-counts-json=')) {
      args.expectedCounts = JSON.parse(
        argument.slice('--expected-counts-json='.length));
    } else if (argument === '--execute-durable-apply') args.execute = true;
    else if (argument.startsWith('--env-file=')) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith('--out-dir=')) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!['plan', 'preflight', 'canary', 'apply', 'readback'].includes(args.mode)) {
    throw new Error('--mode=plan|preflight|canary|apply|readback is required');
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error('Exact --expected-head-sha is required');
  }
  if (args.mode !== 'plan' &&
      !/^[0-9a-f]{64}$/.test(args.expectedPlanFingerprint)) {
    throw new Error('Exact --expected-plan-fingerprint is required');
  }
  if (args.mode === 'apply' && !args.execute) {
    throw new Error('Apply requires --execute-durable-apply');
  }
  if (args.mode === 'apply' &&
      !/^[0-9a-f]{64}$/.test(args.expectedSourceFingerprint)) {
    throw new Error('Apply requires exact --expected-source-fingerprint');
  }
  if (args.mode === 'apply' &&
      (!args.expectedCounts || Array.isArray(args.expectedCounts) ||
       typeof args.expectedCounts !== 'object')) {
    throw new Error('Apply requires exact --expected-counts-json');
  }
  return args;
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function repository(args) {
  const result = { branch: git('branch', '--show-current') || '(detached)',
    commit_sha: git('rev-parse', 'HEAD'), tracked_worktree_clean:
      git('status', '--porcelain', '--untracked-files=no') === '' };
  if (result.commit_sha !== args.expectedHeadSha || !result.tracked_worktree_clean) {
    throw new Error('Repository is not the exact clean sealed-world producer');
  }
  return result;
}

function options(connectionString, mode) {
  return { connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 30_000, query_timeout: 1_200_000,
    statement_timeout: 1_200_000,
    application_name: `mtg-sealed-world-${mode}-v1` };
}

function numeric(value) {
  if (Array.isArray(value)) return value.map(numeric);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) =>
      [key, numeric(entry)]));
  }
  return typeof value === 'string' && /^-?\d+$/.test(value) ? Number(value) : value;
}

async function sourceRows(client) {
  return (await client.query(`select
      product.product_id::bigint,product.category_id::bigint,
      product.group_id::bigint,product.name,product.clean_name,
      product.source_url,product.presale_info,product.extended_data,
      product.payload_hash,product.source_active,product.catalog_metadata_status,
      category.name as category_name,
      category.display_name as category_display_name,
      category.non_sealed_label,source_group.name as group_name
    from public.tcgcsv_source_products product
    join public.tcgcsv_source_categories category
      on category.category_id=product.category_id
    left join public.tcgcsv_source_groups source_group
      on source_group.group_id=product.group_id
    where product.category_id=1 and product.source_active
    order by product.product_id`)).rows.map(numeric);
}

async function latestPriceRows(client, productIds) {
  if (!productIds.length) return [];
  return (await client.query(`select distinct on
      (price.product_id,price.subtype_name_normalized)
      price.product_id::bigint,price.source_price_row_identity,
      price.subtype_name_normalized,price.observed_on::text,price.currency,
      price.market_price::text,price.low_price::text,price.mid_price::text,
      price.high_price::text,price.direct_low_price::text,price.payload_hash
    from public.tcgcsv_source_price_daily_observations price
    where price.product_id=any($1::bigint[])
    order by price.product_id,price.subtype_name_normalized,
      price.observed_on desc,price.updated_at desc,price.id desc`,
  [productIds])).rows.map((row) => ({ ...row,
    product_id: Number(row.product_id),
    market_price: row.market_price === null ? null : Number(row.market_price),
    low_price: row.low_price === null ? null : Number(row.low_price),
    mid_price: row.mid_price === null ? null : Number(row.mid_price),
    high_price: row.high_price === null ? null : Number(row.high_price),
    direct_low_price: row.direct_low_price === null
      ? null : Number(row.direct_low_price) }));
}

async function latestSync(client) {
  const row = (await client.query(`select id::text,run_key,status,
      observed_on::text,product_count::bigint,price_row_count::bigint,
      finished_at,worker_version,parser_version,schema_contract_version,
      artifact_hash
    from public.tcgcsv_source_sync_runs
    where sync_mode='current_full_sync' and status='completed'
    order by created_at desc,id desc limit 1`)).rows[0];
  return row ? numeric({ ...row, finished_at: row.finished_at
    ? new Date(row.finished_at).toISOString() : null }) : null;
}

async function buildLivePlan(client, producerCommit) {
  const sources = await sourceRows(client);
  const candidateIds = sources.filter((row) => {
    const classification = classifyCrossTcgSealedProductV1(row);
    return classification.classification === 'sealed_candidate' &&
      classification.candidate_identity.package_form;
  }).map((row) => Number(row.product_id));
  const [prices, sync] = await Promise.all([
    latestPriceRows(client, candidateIds), latestSync(client),
  ]);
  const plan = buildMtgSealedWorldPlanV1({ sourceRows: sources,
    latestPriceRows: prices, latestSync: sync, producerCommit });
  const validation = validateMtgSealedWorldPlanV1(plan);
  if (!validation.valid) throw new Error(validation.findings.join(','));
  return { plan, source_row_count: sources.length,
    candidate_price_product_count: candidateIds.length,
    latest_price_row_count: prices.length };
}

const GAME_TABLE_QUERIES = Object.freeze({
  families: `select to_jsonb(row) as value from public.sealed_product_families row
    where row.game_key=$1 order by row.id`,
  variants: `select to_jsonb(row) as value from public.sealed_product_variants row
    join public.sealed_product_families family on family.id=row.family_id
    where family.game_key=$1 order by row.id`,
  candidates: `select to_jsonb(row) as value from public.sealed_product_candidates row
    where row.candidate_identity->>'game_key'=$1 order by row.id`,
  reviews: `select to_jsonb(row) as value
    from public.sealed_product_candidate_reviews row
    join public.sealed_product_candidates candidate on candidate.id=row.candidate_id
    where candidate.candidate_identity->>'game_key'=$1 order by row.id`,
  mappings: `select to_jsonb(row) as value
    from public.sealed_product_source_mappings row
    join public.sealed_product_variants variant on variant.id=row.variant_id
    join public.sealed_product_families family on family.id=variant.family_id
    where family.game_key=$1 order by row.id`,
  evidence: `select to_jsonb(row) as value
    from public.sealed_product_variant_evidence row
    join public.sealed_product_variants variant on variant.id=row.variant_id
    join public.sealed_product_families family on family.id=variant.family_id
    where family.game_key=$1 order by row.id`,
  qualifications: `select to_jsonb(row) as value
    from public.sealed_product_pricing_lane_qualifications row
    join public.sealed_product_variants variant on variant.id=row.variant_id
    join public.sealed_product_families family on family.id=variant.family_id
    where family.game_key=$1 order by row.id`,
  releases: `select to_jsonb(row) as value from public.sealed_product_releases row
    where row.game_key=$1 order by row.id`,
  members: `select to_jsonb(row) as value
    from public.sealed_product_release_members row
    join public.sealed_product_releases release on release.id=row.release_id
    where release.game_key=$1 order by row.id`,
  pointer: `select to_jsonb(row) as value from public.sealed_product_release_pointer row
    where row.game_key=$1 order by row.game_key`,
});

async function gameBoundary(client, gameKey) {
  const tables = {};
  for (const [name, query] of Object.entries(GAME_TABLE_QUERIES)) {
    const rows = (await client.query(query, [gameKey])).rows.map((row) => row.value);
    tables[name] = { count: rows.length, sha256: hashMtgSealedV1(rows) };
  }
  return { game_key: gameKey, tables,
    boundary_sha256: hashMtgSealedV1(tables) };
}

async function schemaProof(client) {
  const row = (await client.query(`select
    exists(select 1 from information_schema.columns where table_schema='public'
      and table_name='sealed_product_releases' and column_name='game_key')
      as release_game_key,
    exists(select 1 from information_schema.columns where table_schema='public'
      and table_name='sealed_product_release_pointer' and column_name='game_key')
      as pointer_game_key,
    to_regclass('public.sealed_product_game_release_controls') is not null
      as sealed_release_control,
    to_regprocedure('public.sealed_product_game_visible_to_request_v1(text)')
      is not null as sealed_visibility_function,
    to_regprocedure('public.get_active_sealed_product_pricing_v2(text,text,integer,integer)')
      is not null as read_rpc_v2,
    (select release_status from public.catalog_game_release_controls
      where game_code='mtg') as mtg_catalog_release_status,
    (select release_status from public.sealed_product_game_release_controls
      where game_key='mtg') as mtg_sealed_release_status`)).rows[0];
  return { ...row, valid: row.release_game_key === true &&
    row.pointer_game_key === true && row.sealed_release_control === true &&
    row.sealed_visibility_function === true && row.read_rpc_v2 === true &&
    row.mtg_sealed_release_status === 'hidden' };
}

function emptyBoundary(boundary) {
  return Object.values(boundary.tables).every((table) => table.count === 0);
}

async function hiddenRpcProof(client) {
  const rows = (await client.query(
    "select * from public.get_active_sealed_product_pricing_v2('mtg',null,100,0)",
  )).rows;
  return { rows_returned: rows.length, valid: rows.length === 0 };
}

function expectedProjection(plan) {
  const payload = plan.payload;
  return {
    families: payload.families.map((row) => [row.id, row.identity_fingerprint]),
    variants: payload.variants.map((row) => [row.id, row.identity_fingerprint]),
    candidates: payload.candidates.map((row) =>
      [row.id, row.source_product_id, row.source_payload_hash]),
    reviews: payload.reviews.map((row) => [row.id, row.candidate_id]),
    mappings: payload.mappings.map((row) => [row.id, row.mapping_fingerprint]),
    evidence: payload.evidence.map((row) => [row.id, row.evidence_fingerprint]),
    qualifications: payload.qualifications.map((row) =>
      [row.id, row.source_observation_fingerprint, row.qualification_status]),
    releases: payload.releases.map((row) => [row.id, row.manifest_fingerprint]),
    members: payload.members.map((row) => [row.id, row.member_fingerprint]),
  };
}

const PROJECTION_QUERIES = Object.freeze({
  families: `select id::text,identity_fingerprint from public.sealed_product_families
    where game_key='mtg' order by id`,
  variants: `select variant.id::text,variant.identity_fingerprint
    from public.sealed_product_variants variant
    join public.sealed_product_families family on family.id=variant.family_id
    where family.game_key='mtg' order by variant.id`,
  candidates: `select id::text,source_product_id::bigint,source_payload_hash
    from public.sealed_product_candidates
    where candidate_identity->>'game_key'='mtg' order by id`,
  reviews: `select review.id::text,review.candidate_id::text
    from public.sealed_product_candidate_reviews review
    join public.sealed_product_candidates candidate on candidate.id=review.candidate_id
    where candidate.candidate_identity->>'game_key'='mtg' order by review.id`,
  mappings: `select mapping.id::text,mapping.mapping_fingerprint
    from public.sealed_product_source_mappings mapping
    join public.sealed_product_variants variant on variant.id=mapping.variant_id
    join public.sealed_product_families family on family.id=variant.family_id
    where family.game_key='mtg' order by mapping.id`,
  evidence: `select evidence.id::text,evidence.evidence_fingerprint
    from public.sealed_product_variant_evidence evidence
    join public.sealed_product_variants variant on variant.id=evidence.variant_id
    join public.sealed_product_families family on family.id=variant.family_id
    where family.game_key='mtg' order by evidence.id`,
  qualifications: `select qualification.id::text,
      qualification.source_observation_fingerprint,
      qualification.qualification_status
    from public.sealed_product_pricing_lane_qualifications qualification
    join public.sealed_product_variants variant on variant.id=qualification.variant_id
    join public.sealed_product_families family on family.id=variant.family_id
    where family.game_key='mtg' order by qualification.id`,
  releases: `select id::text,manifest_fingerprint from public.sealed_product_releases
    where game_key='mtg' order by id`,
  members: `select member.id::text,member.member_fingerprint
    from public.sealed_product_release_members member
    join public.sealed_product_releases release on release.id=member.release_id
    where release.game_key='mtg' order by member.id`,
});

async function readback(client, plan, onePieceBefore) {
  const actual = {};
  for (const [key, query] of Object.entries(PROJECTION_QUERIES)) {
    actual[key] = (await client.query(query)).rows.map((row) =>
      Object.values(numeric(row)));
  }
  const expected = expectedProjection(plan);
  for (const rows of Object.values(expected)) rows.sort((left, right) =>
    String(left[0]).localeCompare(String(right[0])));
  const projectionExact = Object.fromEntries(Object.keys(expected).map((key) =>
    [key, hashMtgSealedV1(actual[key]) === hashMtgSealedV1(expected[key])]));
  const pointer = (await client.query(`select game_key,release_id::text,
      previous_release_id::text,pointer_contract_version
    from public.sealed_product_release_pointer where game_key='mtg'`)).rows[0];
  const release = (await client.query(`select id::text,game_key,release_state,
      manifest_fingerprint,expected_member_count,frozen_by::text,
      frozen_at is not null as frozen
    from public.sealed_product_releases where id=$1`,
  [plan.payload.releases[0].id])).rows[0];
  const onePieceAfter = await gameBoundary(client, 'one_piece');
  const rpc = await hiddenRpcProof(client);
  const valid = Object.values(projectionExact).every(Boolean) &&
    pointer?.release_id === plan.payload.releases[0].id &&
    pointer?.previous_release_id === null &&
    pointer?.pointer_contract_version ===
      'CROSS_TCG_SEALED_PRODUCT_RELEASE_POINTER_V2' &&
    release?.release_state === 'frozen' && release?.frozen === true &&
    release?.frozen_by === MTG_SEALED_REVIEWER_ID &&
    Number(release?.expected_member_count) === plan.payload.members.length &&
    onePieceAfter.boundary_sha256 === onePieceBefore.boundary_sha256 && rpc.valid;
  return { valid, projection_exact: projectionExact, pointer, release,
    one_piece_before: onePieceBefore, one_piece_after: onePieceAfter,
    one_piece_unchanged:
      onePieceAfter.boundary_sha256 === onePieceBefore.boundary_sha256,
    hidden_rpc: rpc };
}

async function insertRows(client, rows, sql, batchSize = 500) {
  for (let index = 0; index < rows.length; index += batchSize) {
    await client.query(sql, [JSON.stringify(rows.slice(index, index + batchSize))]);
  }
}

async function insertPlan(client, plan) {
  const p = plan.payload;
  await insertRows(client, p.candidates, `insert into public.sealed_product_candidates
    (id,source_provider,source_category_id,source_group_id,source_product_id,
     source_product_name,source_payload_hash,classifier_version,classification,
     confidence,evidence,candidate_identity,ambiguity_reasons,requires_review,
     promotion_eligible,canonical_authority,publication_authority)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,source_provider text,
     source_category_id bigint,source_group_id bigint,source_product_id bigint,
     source_product_name text,source_payload_hash text,classifier_version text,
     classification text,confidence numeric,evidence jsonb,candidate_identity jsonb,
     ambiguity_reasons text[],requires_review boolean,promotion_eligible boolean,
     canonical_authority boolean,publication_authority boolean)`);
  await insertRows(client, p.families, `insert into public.sealed_product_families
    (id,game_key,family_key,canonical_name,manufacturer_name,product_line_key,
     identity_contract_version,identity_fingerprint)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,game_key text,
     family_key text,canonical_name text,manufacturer_name text,product_line_key text,
     identity_contract_version text,identity_fingerprint text)`);
  await insertRows(client, p.variants, `insert into public.sealed_product_variants
    (id,family_id,variant_key,canonical_name,package_form,language_code,region_code,
     edition,wave,explicit_contents,manufacturer_sku,upc,release_date,
     identity_contract_version,identity_fingerprint)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,family_id uuid,
     variant_key text,canonical_name text,package_form text,language_code text,
     region_code text,edition text,wave text,explicit_contents jsonb,
     manufacturer_sku text,upc text,release_date date,
     identity_contract_version text,identity_fingerprint text)`);
  await insertRows(client, p.reviews, `insert into public.sealed_product_candidate_reviews
    (id,candidate_id,decision,promotion_authorized,reviewed_by,decision_evidence,
     review_contract_version)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,candidate_id uuid,
     decision text,promotion_authorized boolean,reviewed_by uuid,
     decision_evidence jsonb,review_contract_version text)`);
  await insertRows(client, p.mappings, `insert into public.sealed_product_source_mappings
    (id,variant_id,candidate_id,review_id,candidate_classification,review_decision,
     promotion_authorized,source_provider,source_category_id,source_group_id,
     source_product_id,source_product_name,source_url,source_payload_hash,
     classifier_version,mapping_contract_version,mapping_status,mapping_fingerprint)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,variant_id uuid,
     candidate_id uuid,review_id uuid,candidate_classification text,
     review_decision text,promotion_authorized boolean,source_provider text,
     source_category_id bigint,source_group_id bigint,source_product_id bigint,
     source_product_name text,source_url text,source_payload_hash text,
     classifier_version text,mapping_contract_version text,mapping_status text,
     mapping_fingerprint text)`);
  await insertRows(client, p.evidence, `insert into public.sealed_product_variant_evidence
    (id,variant_id,source_mapping_id,evidence_dimension,source_provider,
     source_object_identity,source_field,source_value,normalized_value,
     evidence_strength,confidence,source_payload_hash,evidence_fingerprint,observed_at)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,variant_id uuid,
     source_mapping_id uuid,evidence_dimension text,source_provider text,
     source_object_identity text,source_field text,source_value text,
     normalized_value jsonb,evidence_strength text,confidence numeric,
     source_payload_hash text,evidence_fingerprint text,observed_at timestamptz)`);
  await insertRows(client, p.qualifications,
    `insert into public.sealed_product_pricing_lane_qualifications
    (id,variant_id,source_mapping_id,source_price_row_identity,
     source_subtype_name_normalized,observed_on,currency,qualification_status,
     qualification_evidence,source_observation_fingerprint,
     qualification_contract_version,publication_authority)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,variant_id uuid,
     source_mapping_id uuid,source_price_row_identity text,
     source_subtype_name_normalized text,observed_on date,currency text,
     qualification_status text,qualification_evidence jsonb,
     source_observation_fingerprint text,qualification_contract_version text,
     publication_authority boolean)`);
  await insertRows(client, p.releases, `insert into public.sealed_product_releases
    (id,game_key,release_key,release_state,source_audit_producer_sha,
     source_sample_logical_hash,release_contract_version,manifest_fingerprint,
     expected_member_count,created_by)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,game_key text,
     release_key text,release_state text,source_audit_producer_sha text,
     source_sample_logical_hash text,release_contract_version text,
     manifest_fingerprint text,expected_member_count integer,created_by uuid)`);
  await insertRows(client, p.members, `insert into public.sealed_product_release_members
    (id,release_id,variant_id,source_mapping_id,qualification_id,
     qualification_status,member_fingerprint)
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,release_id uuid,
     variant_id uuid,source_mapping_id uuid,qualification_id uuid,
     qualification_status text,member_fingerprint text)`);
  const release = p.releases[0];
  await client.query('select public.sealed_product_freeze_release_v1($1,$2,$3)',
    [release.id, release.manifest_fingerprint, MTG_SEALED_REVIEWER_ID]);
  await client.query('select * from public.sealed_product_set_active_release_v1($1,$2,$3)',
    [release.id, null, MTG_SEALED_REVIEWER_ID]);
}

async function preflight(client, live, expectedFingerprint) {
  const [schema, target, onePiece] = await Promise.all([
    schemaProof(client), gameBoundary(client, MTG_SEALED_GAME_KEY),
    gameBoundary(client, 'one_piece'),
  ]);
  const valid = schema.valid && emptyBoundary(target) &&
    live.plan.plan_fingerprint_sha256 === expectedFingerprint &&
    onePiece.tables.pointer.count === 1;
  return { valid, schema, target, target_empty: emptyBoundary(target),
    one_piece: onePiece, live_plan_fingerprint_sha256:
      live.plan.plan_fingerprint_sha256 };
}

async function writeArtifacts(dir, files, producer) {
  await fs.mkdir(dir, { recursive: true });
  const artifacts = {};
  for (const [name, value] of Object.entries(files)) {
    const body = Buffer.isBuffer(value) ? value : name.endsWith('.json')
      ? Buffer.from(`${JSON.stringify(value, null, 2)}\n`)
      : Buffer.from(String(value));
    await fs.writeFile(path.join(dir, name), body);
    artifacts[name] = { bytes: body.length, sha256: hashMtgSealedV1(body) };
  }
  const hashes = { hash_algorithm: 'sha256', producer_commit_sha: producer,
    artifacts };
  await fs.writeFile(path.join(dir, 'artifact_hashes.json'),
    `${JSON.stringify(hashes, null, 2)}\n`);
}

function summaryForPlan(repo, live) {
  return { status: 'mtg_sealed_world_plan_frozen', version: MTG_SEALED_WORLD_V1,
    repository: repo, plan_fingerprint_sha256:
      live.plan.plan_fingerprint_sha256, source_fingerprint_sha256:
      live.plan.source_fingerprint_sha256, counts: live.plan.counts,
    qualification_status_counts: live.plan.qualification_status_counts,
    source_row_count: live.source_row_count,
    candidate_price_product_count: live.candidate_price_product_count,
    latest_price_row_count: live.latest_price_row_count,
    boundaries: live.plan.boundaries };
}

async function independentReadback(connectionString, args, plan, onePieceBefore) {
  const client = new Client(options(connectionString, 'independent-readback'));
  await client.connect();
  try {
    await client.query('begin transaction isolation level repeatable read read only');
    const live = await buildLivePlan(client, args.expectedHeadSha);
    const result = live.plan.plan_fingerprint_sha256 ===
      args.expectedPlanFingerprint
      ? await readback(client, plan, onePieceBefore)
      : { valid: false, error: 'live_plan_fingerprint_changed' };
    await client.query('commit');
    return result;
  } finally {
    await client.end();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is required');
  const client = new Client(options(connectionString, args.mode));
  await client.connect();
  let summary;
  let plan;
  try {
    if (args.mode === 'plan' || args.mode === 'preflight' ||
        args.mode === 'readback') {
      await client.query('begin transaction isolation level repeatable read read only');
      const live = await buildLivePlan(client, repo.commit_sha);
      plan = live.plan;
      if (args.mode !== 'plan' && plan.plan_fingerprint_sha256 !==
          args.expectedPlanFingerprint) {
        throw new Error('Live sealed-world plan fingerprint changed');
      }
      if (args.mode === 'plan') summary = summaryForPlan(repo, live);
      else if (args.mode === 'preflight') {
        const proof = await preflight(client, live, args.expectedPlanFingerprint);
        summary = { status: proof.valid ? 'mtg_sealed_preflight_passed' :
          'mtg_sealed_preflight_failed', version: MTG_SEALED_WORLD_V1,
        repository: repo, plan_fingerprint_sha256:
          plan.plan_fingerprint_sha256, proof, database_writes: 0 };
        if (!proof.valid) throw new Error('MTG sealed preflight failed');
      } else {
        const onePiece = await gameBoundary(client, 'one_piece');
        const result = await readback(client, plan, onePiece);
        summary = { status: result.valid ? 'mtg_sealed_readback_passed' :
          'mtg_sealed_readback_failed', version: MTG_SEALED_WORLD_V1,
        repository: repo, plan_fingerprint_sha256:
          plan.plan_fingerprint_sha256, readback: result, database_writes: 0 };
        if (!result.valid) throw new Error('MTG sealed independent readback failed');
      }
      await client.query('commit');
    } else {
      await client.query('begin transaction isolation level repeatable read');
      await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',
        ['mtg_sealed_world_v1']);
      const live = await buildLivePlan(client, repo.commit_sha);
      plan = live.plan;
      if (plan.plan_fingerprint_sha256 !== args.expectedPlanFingerprint) {
        throw new Error('Live sealed-world plan fingerprint changed');
      }
      if (args.mode === 'apply' &&
          plan.source_fingerprint_sha256 !== args.expectedSourceFingerprint) {
        throw new Error('Live sealed-world source fingerprint changed');
      }
      if (args.mode === 'apply' &&
          hashMtgSealedV1(plan.counts) !== hashMtgSealedV1(args.expectedCounts)) {
        throw new Error('Live sealed-world payload counts changed');
      }
      const proof = await preflight(client, live, args.expectedPlanFingerprint);
      if (!proof.valid) throw new Error('MTG sealed transactional preflight failed');
      await insertPlan(client, plan);
      const transactionReadback = await readback(client, plan, proof.one_piece);
      if (!transactionReadback.valid) {
        throw new Error('MTG sealed transaction readback failed');
      }
      if (args.mode === 'canary') {
        await client.query('rollback');
        const check = new Client(options(connectionString, 'post-rollback'));
        await check.connect();
        try {
          await check.query('begin transaction read only');
          const target = await gameBoundary(check, MTG_SEALED_GAME_KEY);
          const onePieceAfter = await gameBoundary(check, 'one_piece');
          await check.query('commit');
          const zeroResidue = emptyBoundary(target) &&
            onePieceAfter.boundary_sha256 === proof.one_piece.boundary_sha256;
          summary = { status: zeroResidue
            ? 'mtg_sealed_rollback_canary_passed_zero_residue'
            : 'mtg_sealed_rollback_canary_failed', version: MTG_SEALED_WORLD_V1,
          repository: repo, plan_fingerprint_sha256:
            plan.plan_fingerprint_sha256, transaction_readback: transactionReadback,
          post_rollback_target: target, post_rollback_one_piece: onePieceAfter,
          database_writes_committed: 0 };
          if (!zeroResidue) throw new Error('Rollback canary left residue');
        } finally {
          await check.end();
        }
      } else {
        await client.query('commit');
        const result = await independentReadback(connectionString, args, plan,
          proof.one_piece);
        summary = { status: result.valid
          ? 'mtg_sealed_world_applied_and_verified'
          : 'mtg_sealed_world_apply_verification_failed',
        version: MTG_SEALED_WORLD_V1, repository: repo,
        plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
        counts: plan.counts, readback: result,
        database_rows_written: Object.values(plan.counts)
          .reduce((sum, count) => sum + Number(count), 0),
        card_writes: 0, storage_writes: 0, vault_writes: 0,
        catalog_release_control_writes: 0, one_piece_writes: 0 };
        if (!result.valid) throw new Error('Post-commit verification failed');
      }
    }
  } finally {
    if (!client.ended) await client.query('rollback').catch(() => {});
    await client.end().catch(() => {});
  }
  const report = `# MTG Sealed World V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Plan fingerprint: \`${summary.plan_fingerprint_sha256}\`\n` +
    `- Database writes committed: \`${summary.database_writes_committed ?? 0}\`\n`;
  await writeArtifacts(args.outDir, {
    'run_plan.json': { version: MTG_SEALED_WORLD_V1, mode: args.mode,
      repository: repo, expected_plan_fingerprint:
        args.expectedPlanFingerprint || null,
      expected_source_fingerprint: args.expectedSourceFingerprint || null,
      expected_counts: args.expectedCounts,
      boundaries: { cards: 'no writes', storage: 'no writes',
        vault: 'no writes', catalog_release: 'no writes',
        one_piece: 'must remain unchanged' } },
    'sealed_world_plan.json.gz': gzipSync(Buffer.from(JSON.stringify(plan))),
    'summary.json': summary,
    'REPORT.md': report,
  }, repo.commit_sha);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
