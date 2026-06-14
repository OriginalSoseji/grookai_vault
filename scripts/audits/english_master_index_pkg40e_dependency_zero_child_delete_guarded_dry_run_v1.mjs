import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg40a_residual_unsupported_source_adjudication_v1.json');
const CURRENT_UNSUPPORTED_JSON = path.join(AUDIT_DIR, 'english_master_index_current_unsupported_reconciliation_lanes_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg40e_dependency_zero_child_delete_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg40e_dependency_zero_child_delete_guarded_dry_run_v1.md');

const PACKAGE_ID = 'PKG-40E-DEPENDENCY-ZERO-CHILD-DELETE';
const ALLOWED_STATUSES = new Set([
  'delete_candidate_no_reverse_evidence_after_holo_suffix_verified',
  'delete_candidate_no_reverse_evidence_holo_normal_preserved',
  'delete_candidate_suffix_normalization_duplicate',
  'delete_candidate_no_reverse_evidence_suffix_normalization_duplicate',
]);
const OPTIONAL_DEPENDENCY_TABLES = ['justtcg_grookai_mappings', 'card_printing_truth_reviews'];

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
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function unsupportedIds(payload) {
  return new Set((payload.unsupported_rows ?? payload.rows ?? []).map((row) => row.card_printing_id));
}

function buildTargets(source, currentUnsupported) {
  const currentIds = unsupportedIds(currentUnsupported);
  const targets = [];
  const blocked = [];
  const seen = new Set();
  for (const row of source.rows ?? []) {
    if (!ALLOWED_STATUSES.has(row.proposed_status)) continue;
    const dependencyRefs = row.dependency_refs ?? {};
    const dependencyTotal = Object.values(dependencyRefs).reduce((sum, value) => sum + Number(value ?? 0), 0);
    const id = row.card_printing_id;
    const allowed = id
      && !seen.has(id)
      && currentIds.has(id)
      && dependencyTotal === 0
      && ['reverse', 'holo'].includes(normalizeText(row.current_finish_key));
    if (!allowed) {
      blocked.push({
        card_printing_id: id,
        card_print_id: row.card_print_id,
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        finish_key: row.current_finish_key,
        proposed_status: row.proposed_status,
        blocked_reason: seen.has(id)
          ? 'duplicate_card_printing_id'
          : !currentIds.has(id)
            ? 'not_currently_unsupported'
            : dependencyTotal !== 0
              ? 'dependency_refs_present'
              : 'target_shape_not_allowed_for_pkg40e',
      });
      continue;
    }
    seen.add(id);
    targets.push({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.current_finish_key,
      printed_identity_modifier: row.current_printed_identity_modifier ?? '',
      variant_key: row.current_variant_key ?? '',
      proposed_status: row.proposed_status,
      evidence_urls: row.evidence.map((item) => item.source_url),
    });
  }
  return {
    targets: targets.sort((left, right) => (
      String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name))
      || String(left.finish_key).localeCompare(String(right.finish_key))
    )),
    blocked,
  };
}

async function existingOptionalTables(client) {
  const result = await client.query(
    `select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1::text[])`,
    [OPTIONAL_DEPENDENCY_TABLES],
  );
  return new Set(result.rows.map((row) => row.table_name));
}

async function captureSnapshot(client, targets) {
  const ids = targets.map((row) => row.card_printing_id);
  const rows = await client.query(
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
  const existingTables = await existingOptionalTables(client);
  const refs = await client.query(
    `select
       (select count(*)::int from public.card_printings where id = any($1::uuid[])) as child_rows,
       (select count(*)::int from public.vault_item_instances where card_printing_id = any($1::uuid[]) and archived_at is null) as vault_item_instance_refs,
       (select count(*)::int from public.external_printing_mappings where card_printing_id = any($1::uuid[])) as external_printing_mapping_refs,
       (select count(*)::int from public.canon_warehouse_candidates where promoted_card_printing_id = any($1::uuid[])) as canon_warehouse_candidate_refs`,
    [ids],
  );
  const impactCounts = refs.rows[0];
  impactCounts.truth_review_refs = 0;
  if (existingTables.has('card_printing_truth_reviews')) {
    const truth = await client.query(
      `select count(*)::int as refs from public.card_printing_truth_reviews where card_printing_id = any($1::uuid[])`,
      [ids],
    );
    impactCounts.truth_review_refs = truth.rows[0].refs;
  }
  impactCounts.justtcg_mapping_refs = 0;
  if (existingTables.has('justtcg_grookai_mappings')) {
    const justtcg = await client.query(
      `select count(*)::int as refs from public.justtcg_grookai_mappings where card_printing_id = any($1::uuid[])`,
      [ids],
    );
    impactCounts.justtcg_mapping_refs = justtcg.rows[0].refs;
  }
  return {
    captured_at: new Date().toISOString(),
    rows: rows.rows,
    hash_sha256: sha256(stableJson(rows.rows)),
    impact_counts: impactCounts,
  };
}

async function runDryRun(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  const beforeRefs = beforeSnapshot.impact_counts;
  if (
    beforeRefs.child_rows !== targets.length
    || beforeRefs.vault_item_instance_refs !== 0
    || beforeRefs.external_printing_mapping_refs !== 0
    || beforeRefs.canon_warehouse_candidate_refs !== 0
    || beforeRefs.truth_review_refs !== 0
    || beforeRefs.justtcg_mapping_refs !== 0
  ) {
    return {
      dry_run_status: 'blocked_before_dry_run_live_dependency_mismatch',
      before_snapshot: beforeSnapshot,
      after_snapshot: beforeSnapshot,
      rollback_proof_hash_match: true,
      stop_findings: ['live_dependency_or_shape_mismatch'],
    };
  }

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '60s'");
    await client.query(
      `create temporary table pkg40e_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         finish_key text not null,
         proposed_status text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg40e_targets
       select row.card_printing_id::uuid, row.card_print_id::uuid, row.finish_key, row.proposed_status
       from jsonb_to_recordset($1::jsonb) as row(
         card_printing_id text,
         card_print_id text,
         finish_key text,
         proposed_status text
       )`,
      [JSON.stringify(targets)],
    );
    const existingTables = await existingOptionalTables(client);
    const guards = await client.query(
      `select
         (select count(*)::int from pkg40e_targets) as target_rows,
         (select count(*)::int from pkg40e_targets where finish_key not in ('reverse', 'holo')) as disallowed_finish_rows,
         (select count(*)::int
          from pkg40e_targets
          where proposed_status not in (
            'delete_candidate_no_reverse_evidence_after_holo_suffix_verified',
            'delete_candidate_no_reverse_evidence_holo_normal_preserved',
            'delete_candidate_suffix_normalization_duplicate',
            'delete_candidate_no_reverse_evidence_suffix_normalization_duplicate'
          )) as disallowed_status_rows,
         (select count(*)::int
          from public.card_printings cpr
          join pkg40e_targets t on t.card_printing_id = cpr.id and t.card_print_id = cpr.card_print_id and t.finish_key = cpr.finish_key) as matching_child_rows,
         (select count(*)::int from public.vault_item_instances vii join pkg40e_targets t on t.card_printing_id = vii.card_printing_id and vii.archived_at is null) as vault_item_instance_refs,
         (select count(*)::int from public.external_printing_mappings epm join pkg40e_targets t on t.card_printing_id = epm.card_printing_id) as external_printing_mapping_refs,
         (select count(*)::int from public.canon_warehouse_candidates cwc join pkg40e_targets t on t.card_printing_id = cwc.promoted_card_printing_id) as canon_warehouse_candidate_refs`,
    );
    const guard = guards.rows[0];
    guard.truth_review_refs = 0;
    if (existingTables.has('card_printing_truth_reviews')) {
      const truth = await client.query(
        `select count(*)::int as refs from public.card_printing_truth_reviews ctr join pkg40e_targets t on t.card_printing_id = ctr.card_printing_id`,
      );
      guard.truth_review_refs = truth.rows[0].refs;
    }
    guard.justtcg_mapping_refs = 0;
    if (existingTables.has('justtcg_grookai_mappings')) {
      const justtcg = await client.query(
        `select count(*)::int as refs from public.justtcg_grookai_mappings jgm join pkg40e_targets t on t.card_printing_id = jgm.card_printing_id`,
      );
      guard.justtcg_mapping_refs = justtcg.rows[0].refs;
    }
    if (
      guard.target_rows !== targets.length
      || guard.disallowed_finish_rows !== 0
      || guard.disallowed_status_rows !== 0
      || guard.matching_child_rows !== targets.length
      || guard.vault_item_instance_refs !== 0
      || guard.external_printing_mapping_refs !== 0
      || guard.canon_warehouse_candidate_refs !== 0
      || guard.truth_review_refs !== 0
      || guard.justtcg_mapping_refs !== 0
    ) {
      throw new Error(`PKG-40E guard failed: ${JSON.stringify(guard)}`);
    }
    const deleteResult = await client.query(
      `delete from public.card_printings cpr
       using pkg40e_targets target
       where cpr.id = target.card_printing_id`,
    );
    if (deleteResult.rowCount !== targets.length) {
      throw new Error(`PKG-40E delete simulation mismatch: ${deleteResult.rowCount}`);
    }
    await client.query('rollback');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }

  const afterSnapshot = await captureSnapshot(client, targets);
  return {
    dry_run_status: 'pkg40e_guarded_dry_run_passed_rolled_back_no_durable_change',
    before_snapshot: beforeSnapshot,
    after_snapshot: afterSnapshot,
    rollback_proof_hash_match: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
    stop_findings: [],
  };
}

function renderMarkdown(report) {
  return `# PKG-40E Dependency-Zero Child Delete Guarded Dry Run V1

Rollback-only dry run for residual unsupported child rows with zero dependencies.

## Safety

- dry_run_only: ${report.dry_run_only}
- db_writes_performed: ${report.db_writes_performed}
- durable_writes_performed: ${report.durable_writes_performed}
- migrations_created: ${report.migrations_created}
- parent_writes_performed: ${report.parent_writes_performed}
- mapping_writes_performed: ${report.mapping_writes_performed}

## Scope

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.package_fingerprint],
    ['target_child_deletes', report.scope.target_child_deletes],
    ['rollback_proof_hash_match', report.execution.rollback_proof_hash_match],
  ])}

## Targets

${markdownTable(
    ['set', 'number', 'card', 'finish', 'variant', 'status'],
    report.targets.map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.finish_key,
      row.variant_key,
      row.proposed_status,
    ]),
  )}

## Recommended Real Apply Approval

\`\`\`text
${report.recommended_real_apply_approval_text}
\`\`\`
`;
}

const source = await readJson(SOURCE_JSON);
const currentUnsupported = await readJson(CURRENT_UNSUPPORTED_JSON);
const { targets, blocked } = buildTargets(source, currentUnsupported);
if (targets.length !== 4) throw new Error(`PKG-40E expected 4 targets, found ${targets.length}`);

const packageFingerprint = sha256(stableJson({
  package_id: PACKAGE_ID,
  source_fingerprint: source.fingerprint_sha256,
  targets,
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
  version: 'english_master_index_pkg40e_dependency_zero_child_delete_guarded_dry_run_v1',
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  dry_run_only: true,
  db_writes_performed: false,
  durable_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  parent_writes_performed: false,
  mapping_writes_performed: false,
  source_artifacts: {
    adjudication: path.relative(ROOT, SOURCE_JSON),
    current_unsupported: path.relative(ROOT, CURRENT_UNSUPPORTED_JSON),
  },
  scope: {
    target_child_deletes: targets.length,
    blocked_source_rows: blocked.length,
    by_set: countBy(targets, (row) => row.set_key),
    by_finish: countBy(targets, (row) => row.finish_key),
    by_status: countBy(targets, (row) => row.proposed_status),
  },
  execution,
  targets,
  blocked,
};
report.recommended_real_apply_approval_text = `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} dependency-zero unsupported child deletes; finishes ${Object.entries(report.scope.by_finish).map(([finish, count]) => `${finish}=${count}`).join(', ')}; sets ${Object.entries(report.scope.by_set).map(([set, count]) => `${set}=${count}`).join(', ')}. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_snapshot.hash_sha256}. No global apply. No migrations. No parent writes. No mapping writes. No merges. No quarantine. Supported canonical rows preserved.`;

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON),
  output_md: path.relative(ROOT, OUTPUT_MD),
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  scope: report.scope,
  rollback_proof_hash_match: execution.rollback_proof_hash_match,
  recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
  db_writes_performed: false,
  durable_writes_performed: false,
  migrations_created: false,
}, null, 2));
