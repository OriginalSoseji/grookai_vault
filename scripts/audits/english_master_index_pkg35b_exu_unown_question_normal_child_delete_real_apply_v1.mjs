import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const ARTIFACT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg35b_exu_unown_question_normal_child_delete_dry_run_artifact_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg35b_exu_unown_question_normal_child_delete_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg35b_exu_unown_question_normal_child_delete_real_apply_v1.md');

const APPROVED_PACKAGE_ID = 'PKG-35B-EXU-UNOWN-QUESTION-NORMAL-CHILD-DELETE';
const APPROVED_FINGERPRINT = 'd890f6e2b240b132645614ab3231a29317b6a53549b1104ccc68bd64a2cbb2b6';
const APPROVED_SQL_HASH = 'be9693f346d0c692eca356b6b97e67cb1c86c8f0d3eb0522d8e532a9a1325689';
const APPROVED_SCOPE = {
  target_rows: 1,
  child_deletes_in_dry_run: 1,
  parent_writes: 0,
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
  if (actual !== expected) throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
}

function assertScope(actual) {
  for (const [key, expected] of Object.entries(APPROVED_SCOPE)) {
    assertEqual(`scope.${key}`, Number(actual?.[key] ?? Number.NaN), expected);
  }
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

async function capturePostApplyProof(client, row) {
  const remainingUnsupportedChild = await client.query(
    `select count(*)::int as count
     from public.card_printings
     where id = $1::uuid`,
    [row.card_printing_id],
  );
  const parent = await client.query(
    `select cp.id::text, cp.set_code, cp.number, cp.name
     from public.card_prints cp
     where cp.id = $1::uuid`,
    [row.card_print_id],
  );
  const supportedChild = await client.query(
    `select count(*)::int as count
     from public.card_printings
     where id = $1::uuid
       and card_print_id = $2::uuid
       and finish_key = 'holo'`,
    [row.supported_child_printing_id, row.card_print_id],
  );
  const normalChildren = await client.query(
    `select count(*)::int as count
     from public.card_printings
     where card_print_id = $1::uuid
       and finish_key = 'normal'`,
    [row.card_print_id],
  );
  const parentMappings = await client.query(
    `select count(*)::int as count
     from public.external_mappings
     where card_print_id = $1::uuid`,
    [row.card_print_id],
  );
  return {
    unsupported_normal_child_remaining: Number(remainingUnsupportedChild.rows[0]?.count ?? 0),
    parent_rows_remaining: parent.rows.length,
    parent_set_code: parent.rows[0]?.set_code ?? null,
    parent_number: parent.rows[0]?.number ?? null,
    parent_name: parent.rows[0]?.name ?? null,
    supported_holo_child_remaining: Number(supportedChild.rows[0]?.count ?? 0),
    normal_children_remaining_on_parent: Number(normalChildren.rows[0]?.count ?? 0),
    external_mappings_preserved_on_parent: Number(parentMappings.rows[0]?.count ?? 0),
  };
}

async function executeRealApply(artifact) {
  const conn = connectionString();
  if (!conn) throw new Error('Database connection unavailable');
  const dryRunSql = await fs.readFile(artifact.sql_path, 'utf8');
  const dryRunHash = sha256(dryRunSql);
  assertEqual('sql_hash', dryRunHash, APPROVED_SQL_HASH);
  const realApplySql = buildRealApplySql(dryRunSql);
  const client = new Client({ connectionString: conn });
  const notices = [];
  client.on('notice', (notice) => notices.push(notice.message));
  await client.connect();
  try {
    const result = await client.query(realApplySql);
    const postApplyProof = await capturePostApplyProof(client, artifact.rows[0]);
    return {
      apply_status: 'pkg35b_real_apply_committed',
      committed: true,
      dry_run_sql_hash: dryRunHash,
      real_apply_sql_hash: sha256(realApplySql),
      result_count: Array.isArray(result) ? result.length : 1,
      notices,
      post_apply_proof: postApplyProof,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildMarkdown(report) {
  return `# PKG-35B EXU Unown Question Normal Child Delete Real Apply V1

Real apply completed for the explicitly approved PKG-35B scope only.

No migrations were created. No parent writes, merges, quarantine, or global apply were performed.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['dry_run_sql_hash', report.execution.dry_run_sql_hash],
    ['real_apply_sql_hash', report.execution.real_apply_sql_hash],
    ['apply_status', report.execution.apply_status],
    ['committed', report.execution.committed],
    ['unsupported_normal_child_remaining', report.execution.post_apply_proof.unsupported_normal_child_remaining],
    ['supported_holo_child_remaining', report.execution.post_apply_proof.supported_holo_child_remaining],
    ['parent_rows_remaining', report.execution.post_apply_proof.parent_rows_remaining],
    ['normal_children_remaining_on_parent', report.execution.post_apply_proof.normal_children_remaining_on_parent],
  ])}
`;
}

async function main() {
  const artifact = await readJson(ARTIFACT_JSON);
  assertEqual('package_id', artifact.package_id, APPROVED_PACKAGE_ID);
  assertEqual('fingerprint', artifact.fingerprint, APPROVED_FINGERPRINT);
  assertEqual('artifact.sql_hash', artifact.sql_hash, APPROVED_SQL_HASH);
  assertScope(artifact.summary);

  const execution = await executeRealApply(artifact);
  const proof = execution.post_apply_proof;
  assertEqual('post_apply.unsupported_normal_child_remaining', proof.unsupported_normal_child_remaining, 0);
  assertEqual('post_apply.parent_rows_remaining', proof.parent_rows_remaining, 1);
  assertEqual('post_apply.parent_set_code', proof.parent_set_code, 'exu');
  assertEqual('post_apply.parent_number', proof.parent_number, '?');
  assertEqual('post_apply.parent_name', proof.parent_name, 'Unown');
  assertEqual('post_apply.supported_holo_child_remaining', proof.supported_holo_child_remaining, 1);
  assertEqual('post_apply.normal_children_remaining_on_parent', proof.normal_children_remaining_on_parent, 0);

  const report = {
    package_id: artifact.package_id,
    generated_at: new Date().toISOString(),
    fingerprint: artifact.fingerprint,
    artifact_json: path.relative(process.cwd(), ARTIFACT_JSON),
    safety: {
      no_global_apply: true,
      migrations_created: false,
      parent_writes: false,
      merges: false,
      quarantine: false,
    },
    execution,
    summary: {
      child_deletes: artifact.summary.child_deletes_in_dry_run,
      parent_writes: 0,
    },
    rows: artifact.rows,
  };
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(process.cwd(), OUTPUT_JSON),
    output_md: path.relative(process.cwd(), OUTPUT_MD),
    fingerprint: report.fingerprint,
    dry_run_sql_hash: execution.dry_run_sql_hash,
    real_apply_sql_hash: execution.real_apply_sql_hash,
    post_apply_proof: execution.post_apply_proof,
  }, null, 2));
}

await main();
