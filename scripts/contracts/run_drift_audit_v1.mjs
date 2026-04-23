import '../../backend/env.mjs';

import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_PATH = path.join(__dirname, 'drift_audit_v1.sql');

const { Client } = pg;

export function classifyDriftSeverityBucketV1(severityBucket) {
  switch (severityBucket) {
    case 'critical_enforce_now':
    case 'unexpected_regression':
      return 'critical_fail';
    case 'deferred_known_debt':
      return 'known_deferred_debt';
    default:
      return 'informational';
  }
}

export function summarizeDriftAuditRowsV1(rows) {
  const normalized_rows = rows.map((row) => ({
    ...row,
    gate_category: classifyDriftSeverityBucketV1(row.severity_bucket),
  }));

  return {
    total_checks: normalized_rows.length,
    critical_fail_checks: normalized_rows.filter(
      (row) => Number(row.row_count ?? 0) > 0 && row.gate_category === 'critical_fail',
    ).length,
    known_deferred_debt_checks: normalized_rows.filter(
      (row) => Number(row.row_count ?? 0) > 0 && row.gate_category === 'known_deferred_debt',
    ).length,
    informational_checks: normalized_rows.filter(
      (row) => Number(row.row_count ?? 0) > 0 && row.gate_category === 'informational',
    ).length,
  };
}

export async function runDriftAuditV1(connectionString = process.env.SUPABASE_DB_URL) {
  if (!connectionString) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const sql = await fs.readFile(SQL_PATH, 'utf8');
  const client = new Client({
    connectionString,
  });

  await client.connect();
  try {
    const { rows } = await client.query(sql);
    const summary = summarizeDriftAuditRowsV1(rows);
    return {
      summary,
      rows: rows.map((row) => ({
        ...row,
        gate_category: classifyDriftSeverityBucketV1(row.severity_bucket),
      })),
    };
  } finally {
    await client.end();
  }
}

async function main() {
  const result = await runDriftAuditV1();
  console.log(JSON.stringify(result, null, 2));
  if (result.summary.critical_fail_checks > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
