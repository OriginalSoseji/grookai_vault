import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg32a_parenthetical_name_qualifier_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg32a_parenthetical_name_qualifier_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg32a_parenthetical_name_qualifier_real_apply_v1.md');

const APPROVED_PACKAGE_ID = 'PKG-32A-PARENTHETICAL-NAME-QUALIFIER-PARENT-UPDATES';
const APPROVED_FINGERPRINT = 'ee81961d70dd94f3fcee5718efcc745bc6bcba47ad08e0e86c83ee2355509298';
const APPROVED_SQL_HASH = '2312c1110b922f56f17a5c5429f6a383638b6be91ed9960bc725009321fc4303';
const APPROVED_SCOPE = {
  parent_updates: 6,
  affected_child_rows: 9,
  child_writes: 0,
};

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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
  }
}

function assertScope(summary) {
  assertEqual('scope.parent_updates_in_dry_run', Number(summary.parent_updates_in_dry_run), APPROVED_SCOPE.parent_updates);
  assertEqual('scope.affected_child_rows', Number(summary.affected_child_rows), APPROVED_SCOPE.affected_child_rows);
}

function buildRealApplySql(dryRunSql) {
  if (!/\nrollback;\s*$/i.test(dryRunSql)) {
    throw new Error('Refusing real apply: source SQL does not end with rollback');
  }
  if (/commit;\s*$/i.test(dryRunSql)) {
    throw new Error('Refusing real apply: source SQL already ends with commit');
  }
  return dryRunSql.replace(/\nrollback;\s*$/i, '\ncommit;\n');
}

async function capturePostApplyProof(client, rows) {
  const parentIds = rows.map((row) => row.card_print_id);
  const parentResult = await client.query(
    `select count(*)::int as count
     from public.card_prints cp
     join unnest($1::uuid[], $2::text[]) as target(card_print_id, new_name)
       on target.card_print_id = cp.id
      and target.new_name = cp.name`,
    [parentIds, rows.map((row) => row.new_name)],
  );
  const oldNameResult = await client.query(
    `select count(*)::int as count
     from public.card_prints cp
     join unnest($1::uuid[], $2::text[]) as target(card_print_id, old_name)
       on target.card_print_id = cp.id
      and target.old_name = cp.name`,
    [parentIds, rows.map((row) => row.old_name)],
  );
  const childResult = await client.query(
    `select count(*)::int as count
     from public.card_printings
     where card_print_id = any($1::uuid[])`,
    [parentIds],
  );
  const identityResult = await client.query(
    `select count(*)::int as count
     from public.card_print_identity
     where card_print_id = any($1::uuid[])
       and is_active is true`,
    [parentIds],
  );
  return {
    target_parent_names_present: Number(parentResult.rows[0]?.count ?? 0),
    old_parent_names_remaining: Number(oldNameResult.rows[0]?.count ?? 0),
    affected_child_rows_present: Number(childResult.rows[0]?.count ?? 0),
    active_identity_rows_on_targets: Number(identityResult.rows[0]?.count ?? 0),
  };
}

async function executeRealApply(artifact) {
  const conn = connectionString();
  if (!conn) throw new Error('Database connection unavailable');
  const dryRunSql = await fs.readFile(artifact.sql_path, 'utf8');
  const dryRunHash = sha256(dryRunSql);
  assertEqual('dry_run_sql_hash', dryRunHash, APPROVED_SQL_HASH);
  const realApplySql = buildRealApplySql(dryRunSql);
  const realApplySqlHash = sha256(realApplySql);

  const client = new Client({ connectionString: conn });
  const notices = [];
  client.on('notice', (notice) => notices.push(notice.message));
  await client.connect();
  try {
    const result = await client.query(realApplySql);
    const postApplyProof = await capturePostApplyProof(client, artifact.candidates);
    return {
      apply_status: 'pkg32a_real_apply_committed',
      committed: true,
      dry_run_sql_hash: dryRunHash,
      real_apply_sql_hash: realApplySqlHash,
      result_count: Array.isArray(result) ? result.length : 1,
      notices,
      post_apply_proof: postApplyProof,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildMarkdown(report) {
  return `# PKG-32A Parenthetical Name Qualifier Real Apply V1

Real apply completed for the explicitly approved PKG-32A scope only.

No migrations were created. No child writes, deletes, merges, quarantine, or global apply were performed.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['dry_run_sql_hash', report.execution.dry_run_sql_hash],
    ['real_apply_sql_hash', report.execution.real_apply_sql_hash],
    ['apply_status', report.execution.apply_status],
    ['committed', report.execution.committed],
    ['parent_updates', report.summary.parent_updates],
    ['child_writes', report.summary.child_writes],
    ['target_parent_names_present', report.execution.post_apply_proof.target_parent_names_present],
    ['old_parent_names_remaining', report.execution.post_apply_proof.old_parent_names_remaining],
    ['affected_child_rows_present', report.execution.post_apply_proof.affected_child_rows_present],
    ['active_identity_rows_on_targets', report.execution.post_apply_proof.active_identity_rows_on_targets],
  ])}
`;
}

async function main() {
  const artifact = await readJson(ARTIFACT_JSON);
  assertEqual('package_id', artifact.package_id, APPROVED_PACKAGE_ID);
  assertEqual('fingerprint', artifact.fingerprint, APPROVED_FINGERPRINT);
  assertEqual('artifact.sql_hash', artifact.sql_hash, APPROVED_SQL_HASH);
  assertScope(artifact.summary);
  if (artifact.execution?.committed !== false) {
    throw new Error('Refusing real apply: dry-run artifact does not prove committed=false');
  }

  const execution = await executeRealApply(artifact);
  const proof = execution.post_apply_proof;
  assertEqual('post_apply.target_parent_names_present', proof.target_parent_names_present, APPROVED_SCOPE.parent_updates);
  assertEqual('post_apply.old_parent_names_remaining', proof.old_parent_names_remaining, 0);
  assertEqual('post_apply.affected_child_rows_present', proof.affected_child_rows_present, APPROVED_SCOPE.affected_child_rows);
  assertEqual('post_apply.active_identity_rows_on_targets', proof.active_identity_rows_on_targets, 0);

  const report = {
    package_id: artifact.package_id,
    generated_at: new Date().toISOString(),
    fingerprint: artifact.fingerprint,
    artifact_json: path.relative(process.cwd(), ARTIFACT_JSON),
    safety: {
      no_global_apply: true,
      migrations_created: false,
      child_writes: false,
      deletes: false,
      merges: false,
      quarantine: false,
    },
    summary: {
      parent_updates: APPROVED_SCOPE.parent_updates,
      affected_child_rows: APPROVED_SCOPE.affected_child_rows,
      child_writes: APPROVED_SCOPE.child_writes,
    },
    execution,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(process.cwd(), OUTPUT_JSON),
    output_md: path.relative(process.cwd(), OUTPUT_MD),
    fingerprint: report.fingerprint,
    execution,
  }, null, 2));
}

await main();
