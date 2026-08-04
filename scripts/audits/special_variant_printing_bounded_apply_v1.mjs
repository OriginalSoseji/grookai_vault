import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import { buildTargets } from './special_variant_printing_transactional_rollback_v1.mjs';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const pg = require('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false, quiet: true });
}

export const VERSION = 'SPECIAL_VARIANT_PRINTING_BOUNDED_APPLY_V1';
export const MAX_APPLY_BATCH_SIZE = 25;
export const INPUT_JSON = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_authority_v1',
  'special_variant_printing_guarded_manifest_v1.json',
);
const DEFAULT_OUT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_authority_v1',
  'bounded_apply_runs',
);
const CREATED_BY = 'special_variant_printing_bounded_apply_v1';
const SOURCE_REPORT_PATH = 'docs/audits/special_variant_printing_authority_v1/special_variant_printing_authority_v1.json';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function databaseUrl() {
  return process.env.SUPABASE_POOLER_URL
    ?? process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL;
}

export function parseIntegerFlag(argv, name, fallback) {
  const prefix = `--${name}=`;
  const value = argv.find((item) => item.startsWith(prefix));
  if (!value) return fallback;
  const parsed = Number.parseInt(value.slice(prefix.length), 10);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer.`);
  return parsed;
}

export function selectBatch(targets, offset, size, { reconcileOnly = false } = {}) {
  if (!Number.isInteger(offset) || offset < 0) throw new Error('batch-offset must be zero or greater.');
  const maximum = reconcileOnly ? targets.length : MAX_APPLY_BATCH_SIZE;
  if (!Number.isInteger(size) || size < 1 || size > maximum) {
    throw new Error(`batch-size must be between 1 and ${maximum}.`);
  }
  const selected = targets.slice(offset, offset + size);
  if (selected.length !== size) {
    throw new Error(`Selected ${selected.length} targets; expected exactly ${size}.`);
  }
  return selected;
}

export function expectedApprovalToken(manifestFingerprint, offset, size) {
  return `${VERSION}:${manifestFingerprint}:${offset}:${size}`;
}

function currentCommitSha() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
}

function assertCleanTrackedTree() {
  const status = execFileSync(
    'git',
    ['status', '--porcelain', '--untracked-files=no'],
    { cwd: ROOT, encoding: 'utf8' },
  ).trim();
  if (status) throw new Error('Apply mode requires a clean tracked working tree.');
}

function outputPath({ offset, size, reconcileOnly, failed = false }) {
  const outDir = process.env.SPECIAL_VARIANT_PRINTING_OUTPUT_DIR
    ? path.resolve(ROOT, process.env.SPECIAL_VARIANT_PRINTING_OUTPUT_DIR)
    : DEFAULT_OUT_DIR;
  const suffix = failed ? '_failure' : '';
  const mode = reconcileOnly ? 'reconcile' : 'apply';
  return {
    outDir,
    file: path.join(
      outDir,
      `special_variant_printing_bounded_${mode}_v1_${String(offset).padStart(3, '0')}_${String(size).padStart(3, '0')}${suffix}.json`,
    ),
  };
}

async function createTargetTable(client, targets) {
  await client.query(`
    create temporary table special_variant_printing_apply_targets_v1 (
      child_id uuid primary key,
      review_id uuid unique not null,
      card_print_id uuid not null,
      parent_gv_id text not null,
      name text not null,
      number text not null,
      set_code text not null,
      variant_key text not null,
      finish_key text not null,
      printing_gv_id text unique not null,
      image_status text not null,
      provenance_source text not null,
      provenance_ref text not null,
      discovery_external_id text not null,
      source_product_id integer not null,
      source_url text not null,
      source_product_title text not null,
      source_product_payload_hash text not null,
      source_finish_payload_hashes jsonb not null,
      authority_fingerprint_sha256 text not null,
      required_review_status text not null,
      required_public_visibility text not null
    ) on commit drop
  `);
  await client.query(`
    insert into special_variant_printing_apply_targets_v1
    select * from jsonb_to_recordset($1::jsonb) as t(
      child_id uuid,
      review_id uuid,
      card_print_id uuid,
      parent_gv_id text,
      name text,
      number text,
      set_code text,
      variant_key text,
      finish_key text,
      printing_gv_id text,
      image_status text,
      provenance_source text,
      provenance_ref text,
      discovery_external_id text,
      source_product_id integer,
      source_url text,
      source_product_title text,
      source_product_payload_hash text,
      source_finish_payload_hashes jsonb,
      authority_fingerprint_sha256 text,
      required_review_status text,
      required_public_visibility text
    )
  `, [JSON.stringify(targets)]);
}

async function guardForApply(client, expectedCount) {
  const result = await client.query(`
    select
      (select count(*)::int from special_variant_printing_apply_targets_v1) as target_count,
      (select count(distinct child_id)::int from special_variant_printing_apply_targets_v1) as distinct_child_ids,
      (select count(distinct review_id)::int from special_variant_printing_apply_targets_v1) as distinct_review_ids,
      (select count(distinct printing_gv_id)::int from special_variant_printing_apply_targets_v1) as distinct_printing_gv_ids,
      (select count(*)::int
         from special_variant_printing_apply_targets_v1 target
         join public.card_prints parent
           on parent.id = target.card_print_id
          and parent.gv_id = target.parent_gv_id
          and parent.name = target.name
          and parent.number = target.number
          and parent.set_code = target.set_code
          and parent.variant_key = target.variant_key) as exact_parent_count,
      (select count(*)::int
         from special_variant_printing_apply_targets_v1 target
         join public.finish_keys finish
           on finish.key = target.finish_key and finish.is_active = true) as active_finish_count,
      (select count(*)::int
         from special_variant_printing_apply_targets_v1 target
         join public.card_print_identity identity
           on identity.card_print_id = target.card_print_id and identity.is_active = true) as active_identity_count,
      (select count(*)::int
         from special_variant_printing_apply_targets_v1 target
         join public.external_mappings mapping
           on mapping.card_print_id = target.card_print_id
          and mapping.source = 'justtcg'
          and mapping.external_id = target.discovery_external_id
          and mapping.active = true) as exact_discovery_mapping_count,
      (select count(*)::int
         from special_variant_printing_apply_targets_v1 target
         join public.card_printings child
           on child.card_print_id = target.card_print_id and child.finish_key = target.finish_key) as existing_finish_collision_count,
      (select count(*)::int
         from special_variant_printing_apply_targets_v1 target
         join public.card_printings child on child.printing_gv_id = target.printing_gv_id) as printing_gv_collision_count,
      (select count(*)::int
         from special_variant_printing_apply_targets_v1 target
         join public.card_printings child on child.id = target.child_id) as child_id_collision_count,
      (select count(*)::int
         from special_variant_printing_apply_targets_v1 target
         join public.card_printing_truth_reviews review on review.id = target.review_id) as review_id_collision_count,
      (select count(*)::int
         from special_variant_printing_apply_targets_v1 where finish_key = 'stamped') as forbidden_stamped_finish_count,
      (select count(*)::int
         from special_variant_printing_apply_targets_v1
        where required_review_status = 'quarantined_candidate'
          and required_public_visibility = 'hidden_pending_review') as exact_hidden_review_policy_count
  `);
  const guard = result.rows[0];
  const equal = [
    'target_count',
    'distinct_child_ids',
    'distinct_review_ids',
    'distinct_printing_gv_ids',
    'exact_parent_count',
    'active_finish_count',
    'active_identity_count',
    'exact_discovery_mapping_count',
    'exact_hidden_review_policy_count',
  ];
  const zero = [
    'existing_finish_collision_count',
    'printing_gv_collision_count',
    'child_id_collision_count',
    'review_id_collision_count',
    'forbidden_stamped_finish_count',
  ];
  if (equal.some((key) => guard[key] !== expectedCount) || zero.some((key) => guard[key] !== 0)) {
    throw new Error(`Apply guard failed: ${JSON.stringify(guard)}`);
  }
  return guard;
}

async function insertTargets(client, manifest) {
  const childInsert = await client.query(`
    insert into public.card_printings (
      id, card_print_id, finish_key, is_provisional, provenance_source,
      provenance_ref, created_by, printing_gv_id, image_status
    )
    select
      child_id, card_print_id, finish_key, false, provenance_source,
      provenance_ref, $1::text, printing_gv_id, image_status
    from special_variant_printing_apply_targets_v1
    returning id::text, card_print_id::text, finish_key, printing_gv_id
  `, [CREATED_BY]);

  const reviewInsert = await client.query(`
    insert into public.card_printing_truth_reviews (
      id, card_printing_id, review_status, public_visibility, active, reason,
      confidence, evidence_sources_checked, evidence_sources_for_finish,
      expected_finish_keys, evidence, source_report_path
    )
    select
      review_id,
      child_id,
      required_review_status,
      required_public_visibility,
      true,
      'Exact catalog variant identity and finish evidence; hidden pending human review.',
      'high',
      array['tcgcsv_tcgplayer_catalog', 'verified_master_set_index_v1', 'justtcg_discovery_only']::text[],
      array['tcgcsv_tcgplayer_catalog']::text[],
      array[finish_key]::text[],
      jsonb_build_object(
        'authority_version', $1::text,
        'authority_fingerprint_sha256', authority_fingerprint_sha256,
        'manifest_version', $2::text,
        'manifest_fingerprint_sha256', $3::text,
        'apply_version', $4::text,
        'tcgplayer_product_id', source_product_id,
        'source_url', source_url,
        'source_product_title', source_product_title,
        'source_product_payload_hash', source_product_payload_hash,
        'source_finish_payload_hashes', source_finish_payload_hashes,
        'justtcg_external_id', discovery_external_id,
        'justtcg_authority', 'discovery_only'
      ),
      $5::text
    from special_variant_printing_apply_targets_v1
    returning id::text, card_printing_id::text, review_status, public_visibility, active
  `, [
    manifest.source_authority_version,
    manifest.version,
    manifest.fingerprint_sha256,
    VERSION,
    SOURCE_REPORT_PATH,
  ]);
  return { child_insert_count: childInsert.rowCount, review_insert_count: reviewInsert.rowCount };
}

async function exactReadback(client, targets) {
  const result = await client.query(`
    with target as (
      select * from jsonb_to_recordset($1::jsonb) as t(
        child_id uuid,
        review_id uuid,
        card_print_id uuid,
        finish_key text,
        printing_gv_id text,
        provenance_source text,
        provenance_ref text,
        image_status text
      )
    )
    select
      child.id::text as card_printing_id,
      child.card_print_id::text,
      child.finish_key,
      child.printing_gv_id,
      child.is_provisional,
      child.provenance_source,
      child.provenance_ref,
      child.created_by,
      child.image_status,
      review.id::text as review_id,
      review.review_status,
      review.public_visibility,
      review.active as review_active,
      current.review_status as current_review_status,
      current.public_visibility as current_public_visibility
    from target
    join public.card_printings child
      on child.id = target.child_id
     and child.card_print_id = target.card_print_id
     and child.finish_key = target.finish_key
     and child.printing_gv_id = target.printing_gv_id
     and child.provenance_source = target.provenance_source
     and child.provenance_ref = target.provenance_ref
     and child.image_status = target.image_status
     and child.is_provisional = false
    join public.card_printing_truth_reviews review
      on review.id = target.review_id
     and review.card_printing_id = target.child_id
     and review.review_status = 'quarantined_candidate'
     and review.public_visibility = 'hidden_pending_review'
     and review.active = true
    join public.v_card_printing_truth_current_v1 current
      on current.card_printing_id = target.child_id
     and current.review_status = 'quarantined_candidate'
     and current.public_visibility = 'hidden_pending_review'
    order by child.printing_gv_id
  `, [JSON.stringify(targets)]);
  return result.rows;
}

async function publicLeakCount(client, targets) {
  const result = await client.query(`
    with target as (
      select * from jsonb_to_recordset($1::jsonb) as t(child_id uuid, card_print_id uuid)
    )
    select count(*)::int as leak_count
    from target
    join lateral public.get_public_card_printing_options_v1(
      array[target.card_print_id],
      1000,
      0
    ) public_option on public_option.id = target.child_id
  `, [JSON.stringify(targets)]);
  return result.rows[0].leak_count;
}

function validateReadback(rows, expectedCount, leakCount) {
  if (rows.length !== expectedCount) {
    throw new Error(`Exact readback mismatch: ${rows.length} != ${expectedCount}.`);
  }
  if (leakCount !== 0) throw new Error(`Public printing option leak detected: ${leakCount}.`);
  if (rows.some((row) => row.created_by !== CREATED_BY
    || row.review_status !== 'quarantined_candidate'
    || row.public_visibility !== 'hidden_pending_review'
    || row.current_review_status !== 'quarantined_candidate'
    || row.current_public_visibility !== 'hidden_pending_review'
    || row.review_active !== true
    || row.is_provisional !== false)) {
    throw new Error('Readback contains a row outside the frozen hidden-review policy.');
  }
}

async function connect() {
  const url = databaseUrl();
  if (!url) throw new Error('Missing SUPABASE_POOLER_URL or database URL.');
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    statement_timeout: 120000,
  });
  await client.connect();
  return client;
}

async function reconcile(client, targets) {
  const rows = await exactReadback(client, targets);
  const leakCount = await publicLeakCount(client, targets);
  validateReadback(rows, targets.length, leakCount);
  return { rows, leak_count: leakCount, fingerprint_sha256: sha256(stableJson(rows)) };
}

async function applyBatch(client, manifest, targets) {
  let transactionStarted = false;
  try {
    await client.query('begin');
    transactionStarted = true;
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query("select pg_advisory_xact_lock(hashtext('special_variant_printing_bounded_apply_v1'))");
    await createTargetTable(client, targets);
    const guard = await guardForApply(client, targets.length);
    const inserted = await insertTargets(client, manifest);
    if (inserted.child_insert_count !== targets.length || inserted.review_insert_count !== targets.length) {
      throw new Error(`Insert count mismatch: ${JSON.stringify(inserted)}`);
    }
    const rows = await exactReadback(client, targets);
    const leakCount = await publicLeakCount(client, targets);
    validateReadback(rows, targets.length, leakCount);
    await client.query('commit');
    transactionStarted = false;
    return { guard, inserted, transactional_readback_count: rows.length, transactional_public_leak_count: leakCount };
  } finally {
    if (transactionStarted) await client.query('rollback');
  }
}

export async function main(argv = process.argv.slice(2)) {
  const apply = argv.includes('--apply');
  const reconcileOnly = argv.includes('--reconcile-only');
  if (apply === reconcileOnly) {
    throw new Error('Choose exactly one mode: --apply or --reconcile-only.');
  }
  const manifest = JSON.parse(await fs.readFile(INPUT_JSON, 'utf8'));
  const allTargets = buildTargets(manifest);
  if (allTargets.length !== manifest.summary.ready_count) {
    throw new Error(`Manifest target mismatch: ${allTargets.length} != ${manifest.summary.ready_count}.`);
  }
  const offset = parseIntegerFlag(argv, 'batch-offset', 0);
  const size = parseIntegerFlag(argv, 'batch-size', reconcileOnly ? allTargets.length : MAX_APPLY_BATCH_SIZE);
  const targets = selectBatch(allTargets, offset, size, { reconcileOnly });
  const commitSha = currentCommitSha();

  if (apply) {
    assertCleanTrackedTree();
    const expectedSha = process.env.SPECIAL_VARIANT_PRINTING_EXPECTED_SHA;
    const expectedManifest = process.env.SPECIAL_VARIANT_PRINTING_EXPECTED_MANIFEST_FINGERPRINT;
    const approval = process.env.SPECIAL_VARIANT_PRINTING_APPLY_APPROVAL;
    if (!expectedSha || expectedSha !== commitSha) throw new Error('Frozen commit SHA approval mismatch.');
    if (!expectedManifest || expectedManifest !== manifest.fingerprint_sha256) {
      throw new Error('Frozen manifest fingerprint approval mismatch.');
    }
    if (approval !== expectedApprovalToken(manifest.fingerprint_sha256, offset, size)) {
      throw new Error('Bounded apply approval token mismatch.');
    }
  }

  const output = outputPath({ offset, size, reconcileOnly });
  await fs.mkdir(output.outDir, { recursive: true });
  const client = await connect();
  let transaction = null;
  let durable;
  try {
    if (apply) transaction = await applyBatch(client, manifest, targets);
    durable = await reconcile(client, targets);
  } finally {
    await client.end();
  }

  const reportBase = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    mode: reconcileOnly ? 'reconcile_only' : 'bounded_apply',
    commit_sha: commitSha,
    source_manifest_version: manifest.version,
    source_manifest_fingerprint_sha256: manifest.fingerprint_sha256,
    batch: { offset, size },
    selected_printing_gv_ids: targets.map((target) => target.printing_gv_id),
    transaction,
    durable: {
      exact_child_and_review_count: durable.rows.length,
      public_option_leak_count: durable.leak_count,
      fingerprint_sha256: durable.fingerprint_sha256,
      rows: durable.rows,
    },
    approvals_performed: false,
    public_visibility_changed: false,
    canonical_parent_rows_changed: 0,
    durable_child_rows_created: apply ? targets.length : 0,
    durable_review_rows_created: apply ? targets.length : 0,
  };
  const report = { ...reportBase, fingerprint_sha256: sha256(stableJson(reportBase)) };
  await fs.writeFile(output.file, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    mode: report.mode,
    batch: report.batch,
    exact_child_and_review_count: report.durable.exact_child_and_review_count,
    public_option_leak_count: report.durable.public_option_leak_count,
    artifact: path.relative(ROOT, output.file),
    fingerprint_sha256: report.fingerprint_sha256,
  }, null, 2)}\n`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(async (error) => {
    const offset = parseIntegerFlag(process.argv.slice(2), 'batch-offset', 0);
    const size = parseIntegerFlag(process.argv.slice(2), 'batch-size', MAX_APPLY_BATCH_SIZE);
    const output = outputPath({ offset, size, reconcileOnly: process.argv.includes('--reconcile-only'), failed: true });
    const failure = {
      version: VERSION,
      generated_at: new Date().toISOString(),
      status: 'failed',
      mode: process.argv.includes('--reconcile-only') ? 'reconcile_only' : 'bounded_apply',
      batch: { offset, size },
      error_code: error?.code ?? null,
      error_name: error?.name ?? 'Error',
      error_message: String(error?.message ?? error).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[database-url-redacted]'),
    };
    failure.fingerprint_sha256 = sha256(stableJson(failure));
    await fs.mkdir(output.outDir, { recursive: true });
    await fs.writeFile(output.file, `${JSON.stringify(failure, null, 2)}\n`);
    console.error(error);
    process.exitCode = 1;
  });
}
