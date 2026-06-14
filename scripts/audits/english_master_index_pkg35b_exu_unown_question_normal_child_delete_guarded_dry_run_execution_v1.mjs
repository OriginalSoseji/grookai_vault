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
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg35b_exu_unown_question_normal_child_delete_guarded_dry_run_execution_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg35b_exu_unown_question_normal_child_delete_guarded_dry_run_execution_v1.md');

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

async function executeDryRun(sqlPath) {
  const conn = connectionString();
  if (!conn) throw new Error('Database connection unavailable');
  const sql = await fs.readFile(sqlPath, 'utf8');
  if (!/\nrollback;\s*$/i.test(sql)) {
    throw new Error('Refusing to execute dry-run SQL that does not end with rollback');
  }
  if (/commit;\s*$/i.test(sql)) {
    throw new Error('Refusing to execute dry-run SQL that contains a trailing commit');
  }
  const client = new Client({ connectionString: conn });
  const notices = [];
  client.on('notice', (notice) => notices.push(notice.message));
  await client.connect();
  try {
    const result = await client.query(sql);
    return {
      dry_run_executed: true,
      committed: false,
      sql_hash: sha256(sql),
      result_count: Array.isArray(result) ? result.length : 1,
      notices,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildMarkdown(report) {
  return `# PKG-35B EXU Unown Question Normal Child Delete Guarded Dry-Run Execution V1

Rollback-only execution proof for PKG-35B.

No DB writes were committed. No migrations were created. No global apply was performed.

${markdownTable(['metric', 'value'], [
    ['package_id', report.package_id],
    ['fingerprint', report.fingerprint],
    ['sql_hash', report.sql_hash],
    ['dry_run_executed', report.execution.dry_run_executed],
    ['committed', report.execution.committed],
    ['notice', report.execution.notices.join(' | ')],
    ['db_writes_committed', false],
    ['migrations_created', false],
  ])}
`;
}

async function main() {
  const artifact = await readJson(ARTIFACT_JSON);
  const execution = await executeDryRun(artifact.sql_path);
  if (execution.sql_hash !== artifact.sql_hash) {
    throw new Error(`SQL hash mismatch: artifact=${artifact.sql_hash} execution=${execution.sql_hash}`);
  }
  const report = {
    package_id: artifact.package_id,
    generated_at: new Date().toISOString(),
    fingerprint: artifact.fingerprint,
    sql_hash: artifact.sql_hash,
    artifact_json: path.relative(process.cwd(), ARTIFACT_JSON),
    safety: {
      db_writes_committed: false,
      migrations_created: false,
      real_apply_authorized: false,
    },
    execution,
    summary: artifact.summary,
  };
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(process.cwd(), OUTPUT_JSON),
    output_md: path.relative(process.cwd(), OUTPUT_MD),
    fingerprint: report.fingerprint,
    sql_hash: report.sql_hash,
    execution: report.execution,
  }, null, 2));
}

await main();
