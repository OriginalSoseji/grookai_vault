import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg22a_product_promo_governance_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg36a_bwp_promo_zero_pad_overfinish_child_delete_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg36a_bwp_promo_zero_pad_overfinish_child_delete_guarded_dry_run_v1.md');

const PACKAGE_ID = 'PKG-36A-BWP-PROMO-ZERO-PAD-OVERFINISH-CHILD-DELETE';
const TARGET_BUCKET = 'product_promo_base_finish_overgeneration_candidate';
const ALLOWED_FINISHES = new Set(['normal', 'reverse']);
const OPTIONAL_DEPENDENCY_TABLES = ['justtcg_grookai_mappings'];

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

async function existingOptionalTables(client) {
  const result = await client.query(
    `select table_name
     from information_schema.tables
     where table_schema = 'public'
       and table_name = any($1::text[])`,
    [OPTIONAL_DEPENDENCY_TABLES],
  );
  return new Set(result.rows.map((row) => row.table_name));
}

function buildTargets(source) {
  const targets = [];
  const blocked = [];
  const seen = new Set();

  for (const row of source.rows ?? []) {
    const dependencyTotal = Number(row.child_dependency_total ?? 0);
    const variant = String(row.variant_key ?? '').trim();
    const modifier = String(row.printed_identity_modifier ?? '').trim();
    const knownFinishes = row.known_index_finishes ?? [];
    const allowedShape = row.governance_bucket === TARGET_BUCKET
      && row.cleanup_readiness === 'dry_run_candidate'
      && row.canonical_set_key === 'bwp'
      && row.card_printing_id
      && row.card_print_id
      && dependencyTotal === 0
      && (variant === '' || variant === 'base')
      && modifier === ''
      && ALLOWED_FINISHES.has(row.finish_key)
      && knownFinishes.includes('holo')
      && !knownFinishes.includes(row.finish_key);

    if (!allowedShape || seen.has(row.card_printing_id)) {
      blocked.push({
        ...row,
        blocked_reason: seen.has(row.card_printing_id)
          ? 'duplicate_card_printing_id'
          : 'target_shape_not_allowed_for_pkg36a',
      });
      continue;
    }

    seen.add(row.card_printing_id);
    targets.push({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      canonical_set_key: row.canonical_set_key,
      card_number: row.card_number,
      number: row.number,
      number_plain: row.number_plain,
      card_name: row.card_name,
      finish_key: row.finish_key,
      governance_bucket: row.governance_bucket,
      known_index_finishes: knownFinishes,
    });
  }

  targets.sort((left, right) => (
    String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
    || String(left.card_name).localeCompare(String(right.card_name))
    || String(left.finish_key).localeCompare(String(right.finish_key))
    || String(left.card_printing_id).localeCompare(String(right.card_printing_id))
  ));

  return { targets, blocked };
}

async function captureSnapshot(client, targets) {
  const ids = targets.map((row) => row.card_printing_id);
  const result = await client.query(
    `select
       cpr.id::text as card_printing_id,
       cpr.card_print_id::text,
       cpr.finish_key,
       cpr.is_provisional,
       cpr.provenance_source,
       cpr.provenance_ref,
       cpr.created_by,
       cpr.created_at,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.printed_identity_modifier,
       cp.variant_key
     from public.card_printings cpr
     join public.card_prints cp on cp.id = cpr.card_print_id
     where cpr.id = any($1::uuid[])
     order by cp.set_code, coalesce(cp.number_plain, cp.number), cp.name, cpr.finish_key, cpr.id`,
    [ids],
  );
  const refs = await client.query(
    `select
       (select count(*)::int from public.card_printings where id = any($1::uuid[])) as child_rows,
       (select count(*)::int from public.vault_item_instances where card_printing_id = any($1::uuid[]) and archived_at is null) as vault_item_instance_refs,
       (select count(*)::int from public.external_printing_mappings where card_printing_id = any($1::uuid[])) as external_printing_mapping_refs,
       (select count(*)::int from public.canon_warehouse_candidates where promoted_card_printing_id = any($1::uuid[])) as canon_warehouse_candidate_refs`,
    [ids],
  );
  const impactCounts = refs.rows[0];
  impactCounts.justtcg_mapping_refs = 0;
  if ((await existingOptionalTables(client)).has('justtcg_grookai_mappings')) {
    const justtcg = await client.query(
      `select count(*)::int as refs
       from public.justtcg_grookai_mappings
       where card_printing_id = any($1::uuid[])`,
      [ids],
    );
    impactCounts.justtcg_mapping_refs = justtcg.rows[0].refs;
  }
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    impact_counts: impactCounts,
  };
}

async function runDryRun(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  const before = beforeSnapshot.impact_counts;
  const beforeFindings = [];
  if (before.child_rows !== targets.length) beforeFindings.push(`before_child_rows_not_target_count:${before.child_rows}`);
  if (before.vault_item_instance_refs !== 0) beforeFindings.push('before_vault_item_instance_refs_present');
  if (before.external_printing_mapping_refs !== 0) beforeFindings.push('before_external_printing_mapping_refs_present');
  if (before.canon_warehouse_candidate_refs !== 0) beforeFindings.push('before_canon_warehouse_candidate_refs_present');
  if (before.justtcg_mapping_refs !== 0) beforeFindings.push('before_justtcg_mapping_refs_present');
  if (beforeFindings.length) {
    return {
      dry_run_status: 'blocked_before_dry_run_live_shape_mismatch',
      before_snapshot: beforeSnapshot,
      after_snapshot: beforeSnapshot,
      rollback_proof_hash_match: true,
      stop_findings: beforeFindings,
    };
  }

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '180s'");
    await client.query(
      `create temporary table pkg36a_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         finish_key text not null,
         governance_bucket text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg36a_targets
       select row.card_printing_id::uuid, row.card_print_id::uuid, row.finish_key, row.governance_bucket
       from jsonb_to_recordset($1::jsonb) as row(
         card_printing_id text,
         card_print_id text,
         finish_key text,
         governance_bucket text
       )`,
      [JSON.stringify(targets)],
    );
    const guards = await client.query(
      `select
         (select count(*)::int from pkg36a_targets) as target_rows,
         (select count(*)::int from pkg36a_targets where finish_key not in ('normal', 'reverse')) as disallowed_finish_rows,
         (select count(*)::int from pkg36a_targets where governance_bucket <> 'product_promo_base_finish_overgeneration_candidate') as disallowed_bucket_rows,
         (select count(*)::int from public.card_printings cpr join pkg36a_targets t on t.card_printing_id = cpr.id and t.card_print_id = cpr.card_print_id and t.finish_key = cpr.finish_key) as matching_child_rows,
         (select count(*)::int from public.card_prints cp join pkg36a_targets t on t.card_print_id = cp.id where cp.set_code <> 'bwp' or coalesce(cp.variant_key, '') not in ('', 'base') or coalesce(cp.printed_identity_modifier, '') <> '') as disallowed_parent_shape_rows,
         (select count(*)::int from public.vault_item_instances vii join pkg36a_targets t on t.card_printing_id = vii.card_printing_id and vii.archived_at is null) as vault_item_instance_refs,
         (select count(*)::int from public.external_printing_mappings epm join pkg36a_targets t on t.card_printing_id = epm.card_printing_id) as external_printing_mapping_refs,
         (select count(*)::int from public.canon_warehouse_candidates cwc join pkg36a_targets t on t.card_printing_id = cwc.promoted_card_printing_id) as canon_warehouse_candidate_refs`,
    );
    const guard = guards.rows[0];
    guard.justtcg_mapping_refs = 0;
    if ((await existingOptionalTables(client)).has('justtcg_grookai_mappings')) {
      const justtcg = await client.query(
        `select count(*)::int as refs
         from public.justtcg_grookai_mappings jgm
         join pkg36a_targets t on t.card_printing_id = jgm.card_printing_id`,
      );
      guard.justtcg_mapping_refs = justtcg.rows[0].refs;
    }
    if (
      guard.target_rows !== targets.length
      || guard.disallowed_finish_rows !== 0
      || guard.disallowed_bucket_rows !== 0
      || guard.matching_child_rows !== targets.length
      || guard.disallowed_parent_shape_rows !== 0
      || guard.vault_item_instance_refs !== 0
      || guard.external_printing_mapping_refs !== 0
      || guard.canon_warehouse_candidate_refs !== 0
      || guard.justtcg_mapping_refs !== 0
    ) {
      throw new Error(`PKG-36A guard failed: ${JSON.stringify(guard)}`);
    }
    const deleteResult = await client.query(
      `delete from public.card_printings cpr
       using pkg36a_targets target
       where cpr.id = target.card_printing_id`,
    );
    if (deleteResult.rowCount !== targets.length) {
      throw new Error(`PKG-36A delete simulation mismatch: ${deleteResult.rowCount}`);
    }
    await client.query('rollback');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }

  const afterSnapshot = await captureSnapshot(client, targets);
  return {
    dry_run_status: 'pkg36a_guarded_dry_run_passed_rolled_back_no_durable_change',
    before_snapshot: beforeSnapshot,
    after_snapshot: afterSnapshot,
    rollback_proof_hash_match: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
    stop_findings: [],
  };
}

function renderMarkdown(report) {
  return `# PKG-36A BWP Promo Zero-Pad Overfinish Child Delete Guarded Dry Run V1

Rollback-only dry run for BWP promo child rows exposed after BW promo zero-padding reconciliation.

## Safety

- dry_run_only: ${report.dry_run_only}
- db_writes_performed: ${report.db_writes_performed}
- durable_writes_performed: ${report.durable_writes_performed}
- migrations_created: ${report.migrations_created}

## Scope

- target_child_deletes: ${report.scope.target_child_deletes}
- blocked_source_rows: ${report.scope.blocked_source_rows}

${markdownTable(['finish', 'rows'], Object.entries(report.scope.by_finish).map(([finish, count]) => [finish, count]))}

${markdownTable(['set', 'rows'], Object.entries(report.scope.by_set).map(([set, count]) => [set, count]))}

## Proof

- before_hash: ${report.execution.before_snapshot.hash_sha256}
- after_hash: ${report.execution.after_snapshot.hash_sha256}
- rollback_proof_hash_match: ${report.execution.rollback_proof_hash_match}

## Recommended Real Apply Approval

\`\`\`text
${report.recommended_real_apply_approval_text}
\`\`\`
`;
}

const source = await readJson(SOURCE_JSON);
const { targets, blocked } = buildTargets(source);
if (targets.length !== 4) throw new Error(`PKG-36A expected 4 targets, found ${targets.length}`);

const packageFingerprint = sha256(stableJson({
  package_id: PACKAGE_ID,
  source_generated_at: source.generated_at,
  source_fingerprint: source.package_fingerprint,
  targets: targets.map((row) => ({
    card_printing_id: row.card_printing_id,
    card_print_id: row.card_print_id,
    canonical_set_key: row.canonical_set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    governance_bucket: row.governance_bucket,
  })),
}));

const conn = connectionString();
if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available.');
const client = new Client({ connectionString: conn });
await client.connect();
let execution;
try {
  execution = await runDryRun(client, targets);
} finally {
  await client.end().catch(() => {});
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg36a_bwp_promo_zero_pad_overfinish_child_delete_guarded_dry_run_v1',
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  dry_run_only: true,
  db_writes_performed: false,
  durable_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  source_artifact: SOURCE_JSON,
  source_generated_at: source.generated_at,
  source_fingerprint: source.package_fingerprint,
  scope: {
    target_child_deletes: targets.length,
    blocked_source_rows: blocked.length,
    by_set: countBy(targets, (row) => row.canonical_set_key ?? row.set_code ?? 'unknown'),
    by_finish: countBy(targets, (row) => row.finish_key),
  },
  execution,
  targets,
};

report.recommended_real_apply_approval_text = `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} BWP promo zero-pad overfinish child deletes; finishes ${Object.entries(report.scope.by_finish).map(([finish, count]) => `${finish}=${count}`).join(', ')}; target rows Reshiram BW04 normal/reverse and Zekrom BW05 normal/reverse. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_snapshot.hash_sha256}. No global apply. No migrations. No parent writes. No merges. No quarantine. Holo rows preserved.`;

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  scope: report.scope,
  rollback_proof_hash_match: execution.rollback_proof_hash_match,
  recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
  db_writes_performed: false,
  durable_writes_performed: false,
  migrations_created: false,
}, null, 2));
