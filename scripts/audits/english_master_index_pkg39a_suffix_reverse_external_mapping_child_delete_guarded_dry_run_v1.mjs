import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg28a_dependency_blocked_mapping_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg39a_suffix_reverse_external_mapping_child_delete_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg39a_suffix_reverse_external_mapping_child_delete_guarded_dry_run_v1.md');

const PACKAGE_ID = 'PKG-39A-SUFFIX-REVERSE-EXTERNAL-MAPPING-CHILD-DELETE';
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
    const mappings = row.external_mappings ?? [];
    const mapping = mappings[0] ?? null;
    const allowed = row.classification === 'blocked_external_number_not_master_verified'
      && row.lane === 'dependency_blocked_unsupported_child'
      && row.finish_key === 'reverse'
      && row.external_printing_mapping_refs === 1
      && row.child_dependency_total === 1
      && row.vault_item_instance_refs === 0
      && row.canon_warehouse_candidate_refs === 0
      && row.truth_review_refs === 0
      && row.justtcg_mapping_refs === 0
      && row.exact_master_fact_count === 0
      && mappings.length === 1
      && mapping.source === 'tcgdex'
      && mapping.active === true
      && /^.+-\d+a$/i.test(mapping.external_id ?? '')
      && String(mapping.meta?.runner ?? mapping.meta?.lane ?? '').toLowerCase().includes('suffix')
      && !row.known_index_finishes?.includes('reverse')
      && !seen.has(row.card_printing_id);
    if (!allowed) {
      blocked.push({
        card_printing_id: row.card_printing_id,
        card_print_id: row.card_print_id,
        set_code: row.set_code,
        number: row.number,
        card_name: row.card_name,
        finish_key: row.finish_key,
        blocked_reason: seen.has(row.card_printing_id)
          ? 'duplicate_card_printing_id'
          : 'not_safe_for_pkg39a_suffix_reverse_mapping_child_delete',
      });
      continue;
    }
    seen.add(row.card_printing_id);
    targets.push({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      external_mapping_id: mapping.id,
      source: mapping.source,
      external_id: mapping.external_id,
      set_code: row.set_code,
      canonical_set_key: row.canonical_set_key,
      number: row.number,
      number_plain: row.number_plain,
      card_name: row.card_name,
      finish_key: row.finish_key,
      known_index_finishes: row.known_index_finishes ?? [],
      classification: row.classification,
    });
  }
  targets.sort((left, right) => (
    String(left.set_code).localeCompare(String(right.set_code))
    || String(left.number).localeCompare(String(right.number), undefined, { numeric: true })
    || String(left.card_name).localeCompare(String(right.card_name))
    || String(left.card_printing_id).localeCompare(String(right.card_printing_id))
  ));
  return { targets, blocked };
}

async function captureSnapshot(client, targets) {
  const childIds = targets.map((row) => row.card_printing_id);
  const mappingIds = targets.map((row) => row.external_mapping_id);
  const children = await client.query(
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
    [childIds],
  );
  const mappings = await client.query(
    `select id::text, card_printing_id::text, source, external_id, active, meta
     from public.external_printing_mappings
     where id = any($1::uuid[])
     order by source, external_id, id`,
    [mappingIds],
  );
  const refs = await client.query(
    `select
       (select count(*)::int from public.card_printings where id = any($1::uuid[])) as child_rows,
       (select count(*)::int from public.external_printing_mappings where id = any($2::uuid[])) as external_mapping_rows,
       (select count(*)::int from public.vault_item_instances where card_printing_id = any($1::uuid[]) and archived_at is null) as vault_item_instance_refs,
       (select count(*)::int from public.external_printing_mappings where card_printing_id = any($1::uuid[]) and not (id = any($2::uuid[]))) as non_target_external_mapping_refs,
       (select count(*)::int from public.canon_warehouse_candidates where promoted_card_printing_id = any($1::uuid[])) as canon_warehouse_candidate_refs`,
    [childIds, mappingIds],
  );
  const impactCounts = refs.rows[0];
  impactCounts.justtcg_mapping_refs = 0;
  if ((await existingOptionalTables(client)).has('justtcg_grookai_mappings')) {
    const justtcg = await client.query(
      `select count(*)::int as refs
       from public.justtcg_grookai_mappings
       where card_printing_id = any($1::uuid[])`,
      [childIds],
    );
    impactCounts.justtcg_mapping_refs = justtcg.rows[0].refs;
  }
  const payload = { children: children.rows, mappings: mappings.rows };
  return {
    captured_at: new Date().toISOString(),
    ...payload,
    hash_sha256: sha256(stableJson(payload)),
    impact_counts: impactCounts,
  };
}

async function runDryRun(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  const before = beforeSnapshot.impact_counts;
  const stopFindings = [];
  if (before.child_rows !== targets.length) stopFindings.push(`before_child_rows_not_target_count:${before.child_rows}`);
  if (before.external_mapping_rows !== targets.length) stopFindings.push(`before_external_mapping_rows_not_target_count:${before.external_mapping_rows}`);
  if (before.vault_item_instance_refs !== 0) stopFindings.push('before_vault_item_instance_refs_present');
  if (before.non_target_external_mapping_refs !== 0) stopFindings.push('before_non_target_external_mapping_refs_present');
  if (before.canon_warehouse_candidate_refs !== 0) stopFindings.push('before_canon_warehouse_candidate_refs_present');
  if (before.justtcg_mapping_refs !== 0) stopFindings.push('before_justtcg_mapping_refs_present');
  if (stopFindings.length) {
    return {
      dry_run_status: 'blocked_before_dry_run_live_shape_mismatch',
      before_snapshot: beforeSnapshot,
      after_snapshot: beforeSnapshot,
      rollback_proof_hash_match: true,
      stop_findings: stopFindings,
    };
  }

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '180s'");
    await client.query(
      `create temporary table pkg39a_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         external_mapping_id uuid not null,
         finish_key text not null,
         source text not null,
         external_id text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg39a_targets
       select
         row.card_printing_id::uuid,
         row.card_print_id::uuid,
         row.external_mapping_id::uuid,
         row.finish_key,
         row.source,
         row.external_id
       from jsonb_to_recordset($1::jsonb) as row(
         card_printing_id text,
         card_print_id text,
         external_mapping_id text,
         finish_key text,
         source text,
         external_id text
       )`,
      [JSON.stringify(targets)],
    );
    const guards = await client.query(
      `select
         (select count(*)::int from pkg39a_targets) as target_rows,
         (select count(*)::int from pkg39a_targets where finish_key <> 'reverse') as disallowed_finish_rows,
         (select count(*)::int from pkg39a_targets where source <> 'tcgdex' or external_id !~ '^[a-z0-9.]+-[0-9]+a$') as disallowed_mapping_shape_rows,
         (select count(*)::int from public.card_printings cpr join pkg39a_targets t on t.card_printing_id = cpr.id and t.card_print_id = cpr.card_print_id and t.finish_key = cpr.finish_key) as matching_child_rows,
         (select count(*)::int from public.external_printing_mappings epm join pkg39a_targets t on t.external_mapping_id = epm.id and t.card_printing_id = epm.card_printing_id and t.source = epm.source and t.external_id = epm.external_id) as matching_external_mapping_rows,
         (select count(*)::int from public.vault_item_instances vii join pkg39a_targets t on t.card_printing_id = vii.card_printing_id and vii.archived_at is null) as vault_item_instance_refs,
         (select count(*)::int from public.external_printing_mappings epm join pkg39a_targets t on t.card_printing_id = epm.card_printing_id and epm.id <> t.external_mapping_id) as non_target_external_mapping_refs,
         (select count(*)::int from public.canon_warehouse_candidates cwc join pkg39a_targets t on t.card_printing_id = cwc.promoted_card_printing_id) as canon_warehouse_candidate_refs`,
    );
    const guard = guards.rows[0];
    guard.justtcg_mapping_refs = 0;
    if ((await existingOptionalTables(client)).has('justtcg_grookai_mappings')) {
      const justtcg = await client.query(
        `select count(*)::int as refs
         from public.justtcg_grookai_mappings jgm
         join pkg39a_targets t on t.card_printing_id = jgm.card_printing_id`,
      );
      guard.justtcg_mapping_refs = justtcg.rows[0].refs;
    }
    if (
      guard.target_rows !== targets.length
      || guard.disallowed_finish_rows !== 0
      || guard.disallowed_mapping_shape_rows !== 0
      || guard.matching_child_rows !== targets.length
      || guard.matching_external_mapping_rows !== targets.length
      || guard.vault_item_instance_refs !== 0
      || guard.non_target_external_mapping_refs !== 0
      || guard.canon_warehouse_candidate_refs !== 0
      || guard.justtcg_mapping_refs !== 0
    ) {
      throw new Error(`PKG-39A guard failed: ${JSON.stringify(guard)}`);
    }
    const mappingDelete = await client.query(
      `delete from public.external_printing_mappings epm
       using pkg39a_targets target
       where epm.id = target.external_mapping_id`,
    );
    if (mappingDelete.rowCount !== targets.length) {
      throw new Error(`PKG-39A mapping delete simulation mismatch: ${mappingDelete.rowCount}`);
    }
    const childDelete = await client.query(
      `delete from public.card_printings cpr
       using pkg39a_targets target
       where cpr.id = target.card_printing_id`,
    );
    if (childDelete.rowCount !== targets.length) {
      throw new Error(`PKG-39A child delete simulation mismatch: ${childDelete.rowCount}`);
    }
    await client.query('rollback');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }

  const afterSnapshot = await captureSnapshot(client, targets);
  return {
    dry_run_status: 'pkg39a_guarded_dry_run_passed_rolled_back_no_durable_change',
    before_snapshot: beforeSnapshot,
    after_snapshot: afterSnapshot,
    rollback_proof_hash_match: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
    stop_findings: [],
  };
}

function renderMarkdown(report) {
  return `# PKG-39A Suffix Reverse External Mapping Child Delete Guarded Dry Run V1

Rollback-only dry run for unsupported reverse child rows whose only dependency is a stale TCGdex suffix external mapping.

No DB writes were performed. No migrations were created. No parent writes, merges, quarantine, or global apply are authorized by this report.

## Scope

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.package_fingerprint],
    ['target_child_deletes', report.scope.target_child_deletes],
    ['target_external_mapping_deletes', report.scope.target_external_mapping_deletes],
    ['blocked_source_rows', report.scope.blocked_source_rows],
    ['rollback_proof_hash_match', report.execution.rollback_proof_hash_match],
  ])}

## Sets

${markdownTable(['set', 'rows'], Object.entries(report.scope.by_set).map(([set, count]) => [set, count]))}

## Recommended Real Apply Approval

\`\`\`text
${report.recommended_real_apply_approval_text}
\`\`\`
`;
}

const source = await readJson(SOURCE_JSON);
const { targets, blocked } = buildTargets(source);
if (targets.length !== 7) throw new Error(`PKG-39A expected 7 targets, found ${targets.length}`);

const packageFingerprint = sha256(stableJson({
  package_id: PACKAGE_ID,
  source_generated_at: source.generated_at,
  source_fingerprint: source.fingerprint,
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
  version: 'english_master_index_pkg39a_suffix_reverse_external_mapping_child_delete_guarded_dry_run_v1',
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  dry_run_only: true,
  db_writes_performed: false,
  durable_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  source_artifact: path.relative(process.cwd(), SOURCE_JSON),
  source_generated_at: source.generated_at,
  source_fingerprint: source.fingerprint,
  scope: {
    target_child_deletes: targets.length,
    target_external_mapping_deletes: targets.length,
    blocked_source_rows: blocked.length,
    by_set: countBy(targets, (row) => row.canonical_set_key ?? row.set_code ?? 'unknown'),
    by_finish: countBy(targets, (row) => row.finish_key),
    by_source: countBy(targets, (row) => row.source),
  },
  execution,
  targets,
  blocked,
};

report.recommended_real_apply_approval_text = `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} unsupported suffix reverse child deletes and ${targets.length} stale TCGdex external mapping deletes; sets ${Object.entries(report.scope.by_set).map(([set, count]) => `${set}=${count}`).join(', ')}; finish reverse=${targets.length}. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_snapshot.hash_sha256}. No global apply. No migrations. No parent writes. No merges. No quarantine. Supported holo/normal rows preserved.`;

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: path.relative(process.cwd(), OUTPUT_JSON),
  output_md: path.relative(process.cwd(), OUTPUT_MD),
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  scope: report.scope,
  rollback_proof_hash_match: execution.rollback_proof_hash_match,
  recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
