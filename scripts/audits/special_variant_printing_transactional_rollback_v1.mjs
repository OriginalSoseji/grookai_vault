import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const pg = require('pg');
for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false, quiet: true });
}

export const VERSION = 'SPECIAL_VARIANT_PRINTING_TRANSACTIONAL_ROLLBACK_V1';
export const INPUT_JSON = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_authority_v1',
  'special_variant_printing_guarded_manifest_v1.json',
);
export const OUT_JSON = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_authority_v1',
  'special_variant_printing_transactional_rollback_v1.json',
);
export const OUT_MD = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_authority_v1',
  'special_variant_printing_transactional_rollback_v1.md',
);
export const FAILURE_JSON = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_authority_v1',
  'special_variant_printing_transactional_rollback_attempt_v1.json',
);
export const FAILURE_MD = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_authority_v1',
  'special_variant_printing_transactional_rollback_attempt_v1.md',
);

const READY_STATUS = 'ready_for_transactional_rollback_dry_run';
const CREATED_BY = 'special_variant_printing_authority_v1';
const SOURCE_REPORT_PATH = 'docs/audits/special_variant_printing_authority_v1/special_variant_printing_authority_v1.json';

function connectionString() {
  return process.env.SUPABASE_POOLER_URL
    ?? process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL;
}

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

export function deterministicUuid(seed) {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), 'hex');
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function buildTargets(manifest) {
  return (manifest.rows ?? [])
    .filter((row) => row.live_status === READY_STATUS)
    .map((row) => ({
      child_id: deterministicUuid(`${VERSION}:child:${row.printing_gv_id}`),
      review_id: deterministicUuid(`${VERSION}:review:${row.printing_gv_id}`),
      card_print_id: row.card_print_id,
      parent_gv_id: row.parent_gv_id,
      name: row.name,
      number: row.number,
      set_code: row.set_code,
      variant_key: row.variant_key,
      finish_key: row.finish_key,
      printing_gv_id: row.printing_gv_id,
      image_status: row.image_status,
      provenance_source: row.provenance_source,
      provenance_ref: row.provenance_ref,
      discovery_external_id: row.discovery_external_id,
      source_product_id: row.source_product_id,
      source_url: row.source_url,
      source_product_title: row.source_product_title,
      source_product_payload_hash: row.source_product_payload_hash,
      source_finish_payload_hashes: row.source_finish_payload_hashes,
      authority_fingerprint_sha256: row.authority_fingerprint_sha256,
      required_review_status: row.required_truth_review.review_status,
      required_public_visibility: row.required_truth_review.public_visibility,
    }))
    .sort((left, right) => left.printing_gv_id.localeCompare(right.printing_gv_id));
}

async function snapshot(client, targets) {
  const result = await client.query(`
    with target as (
      select * from jsonb_to_recordset($1::jsonb) as t(
        card_print_id uuid,
        printing_gv_id text,
        finish_key text
      )
    )
    select
      cpr.id::text as card_printing_id,
      cpr.card_print_id::text,
      cpr.finish_key,
      cpr.printing_gv_id,
      cpr.is_provisional,
      cpr.provenance_source,
      cpr.provenance_ref,
      review.id::text as review_id,
      review.review_status,
      review.public_visibility,
      review.active as review_active
    from public.card_printings cpr
    left join public.card_printing_truth_reviews review
      on review.card_printing_id = cpr.id and review.active = true
    where cpr.card_print_id in (select card_print_id from target)
       or cpr.printing_gv_id in (select printing_gv_id from target)
    order by cpr.card_print_id, cpr.finish_key, cpr.printing_gv_id, cpr.id
  `, [JSON.stringify(targets)]);
  return {
    rows: result.rows,
    count: result.rows.length,
    fingerprint_sha256: sha256(stableJson(result.rows)),
  };
}

async function runRollbackSimulation(client, targets) {
  const before = await snapshot(client, targets);
  let guard;
  let transient;
  let transactionStarted = false;
  try {
    await client.query('begin');
    transactionStarted = true;
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(`
      create temporary table special_variant_printing_targets_v1 (
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
      insert into special_variant_printing_targets_v1
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

    const guardResult = await client.query(`
      select
        (select count(*)::int from special_variant_printing_targets_v1) as target_count,
        (select count(distinct child_id)::int from special_variant_printing_targets_v1) as distinct_child_ids,
        (select count(distinct review_id)::int from special_variant_printing_targets_v1) as distinct_review_ids,
        (select count(distinct printing_gv_id)::int from special_variant_printing_targets_v1) as distinct_printing_gv_ids,
        (select count(*)::int
          from special_variant_printing_targets_v1 target
          join public.card_prints cp
            on cp.id = target.card_print_id
           and cp.gv_id = target.parent_gv_id
           and cp.name = target.name
           and cp.number = target.number
           and cp.set_code = target.set_code
           and cp.variant_key = target.variant_key) as exact_parent_count,
        (select count(*)::int
          from special_variant_printing_targets_v1 target
          join public.finish_keys fk on fk.key = target.finish_key and fk.is_active = true) as active_finish_count,
        (select count(*)::int
          from special_variant_printing_targets_v1 target
          join public.card_print_identity identity on identity.card_print_id = target.card_print_id and identity.is_active = true) as active_identity_count,
        (select count(*)::int
          from special_variant_printing_targets_v1 target
          join public.external_mappings mapping
            on mapping.card_print_id = target.card_print_id
           and mapping.source = 'justtcg'
           and mapping.external_id = target.discovery_external_id
           and mapping.active = true) as exact_discovery_mapping_count,
        (select count(*)::int
          from special_variant_printing_targets_v1 target
          join public.card_printings child on child.card_print_id = target.card_print_id and child.finish_key = target.finish_key) as existing_finish_collision_count,
        (select count(*)::int
          from special_variant_printing_targets_v1 target
          join public.card_printings child on child.printing_gv_id = target.printing_gv_id) as printing_gv_collision_count,
        (select count(*)::int
          from special_variant_printing_targets_v1 target
          join public.card_printings child on child.id = target.child_id) as child_id_collision_count,
        (select count(*)::int
          from special_variant_printing_targets_v1 target
          join public.card_printing_truth_reviews review on review.id = target.review_id) as review_id_collision_count,
        (select count(*)::int
          from special_variant_printing_targets_v1
          where finish_key = 'stamped') as forbidden_stamped_finish_count,
        (select count(*)::int
          from special_variant_printing_targets_v1
          where required_review_status = 'quarantined_candidate'
            and required_public_visibility = 'hidden_pending_review') as exact_hidden_review_policy_count
    `);
    guard = guardResult.rows[0];
    const targetCount = targets.length;
    const requiredEqualCounts = [
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
    const zeroCounts = [
      'existing_finish_collision_count',
      'printing_gv_collision_count',
      'child_id_collision_count',
      'review_id_collision_count',
      'forbidden_stamped_finish_count',
    ];
    if (requiredEqualCounts.some((key) => guard[key] !== targetCount)
      || zeroCounts.some((key) => guard[key] !== 0)) {
      throw new Error(`Rollback simulation guard failed: ${JSON.stringify(guard)}`);
    }

    const childInsert = await client.query(`
      insert into public.card_printings (
        id,
        card_print_id,
        finish_key,
        is_provisional,
        provenance_source,
        provenance_ref,
        created_by,
        printing_gv_id,
        image_status
      )
      select
        child_id,
        card_print_id,
        finish_key,
        false,
        provenance_source,
        provenance_ref,
        $1::text,
        printing_gv_id,
        image_status
      from special_variant_printing_targets_v1
      returning id::text, card_print_id::text, finish_key, printing_gv_id
    `, [CREATED_BY]);

    const reviewInsert = await client.query(`
      insert into public.card_printing_truth_reviews (
        id,
        card_printing_id,
        review_status,
        public_visibility,
        active,
        reason,
        confidence,
        evidence_sources_checked,
        evidence_sources_for_finish,
        expected_finish_keys,
        evidence,
        source_report_path
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
          'tcgplayer_product_id', source_product_id,
          'source_url', source_url,
          'source_product_title', source_product_title,
          'source_product_payload_hash', source_product_payload_hash,
          'source_finish_payload_hashes', source_finish_payload_hashes,
          'justtcg_external_id', discovery_external_id,
          'justtcg_authority', 'discovery_only'
        ),
        $2::text
      from special_variant_printing_targets_v1
      returning id::text, card_printing_id::text, review_status, public_visibility, active
    `, [VERSION, SOURCE_REPORT_PATH]);

    const proofResult = await client.query(`
      select
        (select count(*)::int
          from special_variant_printing_targets_v1 target
          join public.card_printings child
            on child.id = target.child_id
           and child.card_print_id = target.card_print_id
           and child.finish_key = target.finish_key
           and child.printing_gv_id = target.printing_gv_id
           and child.is_provisional = false) as exact_transient_child_count,
        (select count(*)::int
          from special_variant_printing_targets_v1 target
          join public.card_printing_truth_reviews review
            on review.id = target.review_id
           and review.card_printing_id = target.child_id
           and review.review_status = 'quarantined_candidate'
           and review.public_visibility = 'hidden_pending_review'
           and review.active = true) as exact_transient_review_count,
        (select count(*)::int
          from special_variant_printing_targets_v1 target
          join public.v_card_printing_truth_current_v1 current
            on current.card_printing_id = target.child_id
           and current.review_status = 'quarantined_candidate'
           and current.public_visibility = 'hidden_pending_review') as exact_current_view_count
    `);
    transient = {
      child_insert_count: childInsert.rowCount,
      review_insert_count: reviewInsert.rowCount,
      ...proofResult.rows[0],
    };
    if (Object.values(transient).some((value) => value !== targets.length)) {
      throw new Error(`Transient proof mismatch: ${JSON.stringify(transient)}`);
    }
  } finally {
    if (transactionStarted) await client.query('rollback');
  }

  const after = await snapshot(client, targets);
  return {
    before,
    guard,
    transient,
    after,
    durable_state_unchanged: before.fingerprint_sha256 === after.fingerprint_sha256,
  };
}

function renderMarkdown(report) {
  return `# Special Variant Printing Transactional Rollback V1

Generated: ${report.generated_at}

## Result

- Targets: ${report.summary.target_count}
- Transient child inserts: ${report.summary.transient_child_count}
- Transient hidden review inserts: ${report.summary.transient_review_count}
- Durable child inserts: 0
- Durable review inserts: 0
- Before fingerprint: \`${report.simulation.before.fingerprint_sha256}\`
- After fingerprint: \`${report.simulation.after.fingerprint_sha256}\`
- Durable state unchanged: ${report.simulation.durable_state_unchanged}
- Transaction committed: false

## Safety

The script has no apply mode and no commit path. Every transient insert is inside one transaction that is unconditionally rolled back. Each prospective child is paired with an active \`quarantined_candidate\` review sidecar and \`hidden_pending_review\` visibility.

## Next Gate

Perform a bounded real apply only after explicit approval. Start with a small subset, insert child and hidden review sidecar atomically, read back exact counts and provenance, and stop before approval or public visibility.
`;
}

export async function main() {
  if (process.argv.includes('--apply')) throw new Error('This proof has no apply mode.');
  const manifest = JSON.parse(await fs.readFile(INPUT_JSON, 'utf8'));
  const targets = buildTargets(manifest);
  if (targets.length === 0) throw new Error('No rollback-dry-run targets found.');
  if (targets.length !== manifest.summary.ready_count) {
    throw new Error(`Target reconciliation mismatch: ${targets.length} != ${manifest.summary.ready_count}`);
  }
  const url = connectionString();
  if (!url) throw new Error('Missing SUPABASE_POOLER_URL or database URL.');
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    statement_timeout: 120000,
  });
  await client.connect();
  let simulation;
  try {
    simulation = await runRollbackSimulation(client, targets);
  } finally {
    await client.end();
  }
  if (!simulation.durable_state_unchanged) {
    throw new Error('Durable database fingerprint changed after rollback simulation.');
  }
  const reportBase = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    mode: 'transactional_rollback_dry_run',
    transaction_committed: false,
    durable_db_writes_performed: false,
    approvals_performed: false,
    public_visibility_changed: false,
    source_manifest_version: manifest.version,
    source_manifest_fingerprint_sha256: manifest.fingerprint_sha256,
    summary: {
      target_count: targets.length,
      transient_child_count: simulation.transient.child_insert_count,
      transient_review_count: simulation.transient.review_insert_count,
      durable_child_count: 0,
      durable_review_count: 0,
    },
    simulation,
  };
  const report = { ...reportBase, fingerprint_sha256: sha256(stableJson(reportBase)) };
  await Promise.all([
    fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`),
    fs.writeFile(OUT_MD, renderMarkdown(report)),
  ]);
  process.stdout.write(`${JSON.stringify({
    summary: report.summary,
    durable_state_unchanged: simulation.durable_state_unchanged,
    before_fingerprint: simulation.before.fingerprint_sha256,
    after_fingerprint: simulation.after.fingerprint_sha256,
  }, null, 2)}\n`);
}

async function recordFailure(error) {
  let manifest = null;
  try {
    manifest = JSON.parse(await fs.readFile(INPUT_JSON, 'utf8'));
  } catch {
    // The failure artifact still records that the frozen manifest could not be read.
  }
  const connectivityFailure = ['ETIMEDOUT', 'ECONNREFUSED', 'ENETUNREACH'].includes(error?.code)
    || error?.errors?.some((item) => ['ETIMEDOUT', 'ECONNREFUSED', 'ENETUNREACH'].includes(item?.code));
  const payload = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    status: connectivityFailure
      ? 'blocked_database_connectivity_before_transaction'
      : 'blocked_transactional_rollback_proof_failed',
    error_code: error?.code ?? null,
    error_name: error?.name ?? 'Error',
    error_message: String(error?.message ?? error).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[database-url-redacted]'),
    source_manifest_version: manifest?.version ?? null,
    source_manifest_fingerprint_sha256: manifest?.fingerprint_sha256 ?? null,
    target_count: manifest?.summary?.ready_count ?? null,
    transaction_started: connectivityFailure ? false : null,
    transaction_committed: false,
    transient_child_count: connectivityFailure ? 0 : null,
    transient_review_count: connectivityFailure ? 0 : null,
    durable_db_writes_performed: connectivityFailure ? false : null,
    approvals_performed: false,
    public_visibility_changed: false,
    retry_safe: connectivityFailure,
    next_gate: 'Retry this identical rollback-only proof from a host with working PostgreSQL connectivity. Do not apply child rows before the rollback proof passes.',
  };
  payload.fingerprint_sha256 = sha256(stableJson(payload));
  const markdown = `# Special Variant Printing Transactional Rollback Attempt V1

Generated: ${payload.generated_at}

- Status: ${payload.status}
- Error code: ${payload.error_code ?? 'none'}
- Frozen target count: ${payload.target_count ?? 'unknown'}
- Transaction started: ${payload.transaction_started ?? 'not proven'}
- Transaction committed: false
- Transient writes: ${payload.transient_child_count ?? 'not proven'}
- Durable writes: ${payload.durable_db_writes_performed === false ? 0 : 'not proven'}
- Approvals: 0
- Public visibility changes: 0

${connectivityFailure
    ? 'The database connection timed out before a transaction opened.'
    : 'The rollback proof failed and must be investigated before any apply.'} Retry the identical rollback-only proof from a host with PostgreSQL connectivity. Do not apply child rows before that proof passes.
`;
  await Promise.all([
    fs.writeFile(FAILURE_JSON, `${JSON.stringify(payload, null, 2)}\n`),
    fs.writeFile(FAILURE_MD, markdown),
  ]);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    await recordFailure(error);
    console.error(`${error?.name ?? 'Error'}: ${error?.message ?? error}`);
    process.exitCode = 1;
  }
}
