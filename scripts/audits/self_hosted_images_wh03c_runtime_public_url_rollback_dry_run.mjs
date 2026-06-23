import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const WH03A_PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh03a_db_pointer_repoint_plan_v1.jsonl');
const WH03B_RESULT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh03b_db_pointer_repoint_apply_result_v1.json');
const PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh03c_runtime_public_url_rollback_plan_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh03c_runtime_public_url_rollback_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh03c_runtime_public_url_rollback_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-03C-RUNTIME-PUBLIC-URL-ROLLBACK-DRY-RUN';

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function requireDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return sha256Hex(JSON.stringify(canonicalizeJson(value)));
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function readJsonl(file) {
  const raw = await fs.readFile(file, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function topEntries(counts, limit = 25) {
  return Object.entries(counts)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function markdownTable(rows) {
  if (!rows.length) return '_None._';
  return [
    '| key | count |',
    '| --- | ---: |',
    ...rows.map((row) => `| ${String(row.key).replace(/\|/g, '\\|')} | ${row.count} |`),
  ].join('\n');
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

async function fetchCurrentRows(client, tableName, fieldName, ids) {
  const output = new Map();
  for (const batch of chunk(ids, 1000)) {
    const result = await client.query(
      `select id::text, ${fieldName} from public.${tableName} where id = any($1::uuid[])`,
      [batch],
    );
    for (const row of result.rows) output.set(row.id, clean(row[fieldName]));
  }
  return output;
}

async function main() {
  const wh03bResult = await readJson(WH03B_RESULT_JSON);
  const wh03aPlanRows = await readJsonl(WH03A_PLAN_JSONL);
  const runtimeRows = wh03aPlanRows.filter((row) => row.plan_type === 'runtime_field_repoint');

  const idsByTableField = new Map();
  for (const row of runtimeRows) {
    const key = `${row.target_table}.${row.source_field_name}`;
    const set = idsByTableField.get(key) ?? new Set();
    set.add(row.target_row_id);
    idsByTableField.set(key, set);
  }

  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const currentByTableField = new Map();
  try {
    for (const [key, ids] of idsByTableField.entries()) {
      const [tableName, fieldName] = key.split('.');
      currentByTableField.set(key, await fetchCurrentRows(client, tableName, fieldName, [...ids]));
    }
  } finally {
    await client.end();
  }

  const plans = runtimeRows.map((row) => {
    const key = `${row.target_table}.${row.source_field_name}`;
    const currentValue = currentByTableField.get(key)?.get(row.target_row_id) ?? null;
    const expectedInvalidPublicValue = clean(row.proposed_value);
    const proposedRollbackValue = clean(row.expected_current_value);
    const currentMatchesExpectedInvalid = currentValue === expectedInvalidPublicValue;
    return {
      package_id: PACKAGE_ID,
      source_apply_package_id: wh03bResult.package_id,
      source_apply_fingerprint: wh03bResult.fingerprint,
      audit_key: row.audit_key,
      target_table: row.target_table,
      target_row_id: row.target_row_id,
      field_name: row.source_field_name,
      gv_id: row.gv_id,
      printing_gv_id: row.printing_gv_id,
      name: row.name,
      set_code: row.set_code,
      number: row.number,
      current_value: currentValue,
      expected_invalid_public_value: expectedInvalidPublicValue,
      proposed_rollback_value: proposedRollbackValue,
      current_matches_expected_invalid: currentMatchesExpectedInvalid,
      blocked_without_fresh_current_match: !currentMatchesExpectedInvalid,
      db_write_performed: false,
      storage_write_performed: false,
      metadata_pointer_write_performed: false,
      image_path_preserved: true,
      image_status_preserved: true,
      image_note_preserved: true,
    };
  });

  const blocked = plans.filter((row) => row.blocked_without_fresh_current_match);
  const stopFindings = [
    ...(blocked.length ? ['runtime_current_value_mismatch'] : []),
    ...(wh03bResult.db_writes_performed !== true ? ['source_wh03b_apply_not_confirmed'] : []),
  ];

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(PLAN_JSONL, plans.map((row) => JSON.stringify(row)).join('\n') + '\n', 'utf8');

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    source_apply_package_id: wh03bResult.package_id,
    source_apply_fingerprint: wh03bResult.fingerprint,
    source_apply_proof_hash: wh03bResult.proof_hash,
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    runtime_rollback_plan_rows: plans.length,
    blocked_current_mismatch_rows: blocked.length,
    target_tables: countBy(plans, (row) => row.target_table),
    runtime_fields: countBy(plans, (row) => `${row.target_table}.${row.field_name}`),
    db_writes_performed: false,
    storage_writes_performed: false,
    metadata_pointer_writes_performed: false,
    image_path_preserved: true,
    image_status_preserved: true,
    image_note_preserved: true,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    stop_findings: stopFindings,
    ready_for_apply_package: stopFindings.length === 0,
    samples: {
      rollback: plans.slice(0, 10),
      blocked_current_mismatch: blocked.slice(0, 20),
    },
  };
  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    source_apply_fingerprint: summary.source_apply_fingerprint,
    runtime_rollback_plan_rows: summary.runtime_rollback_plan_rows,
    target_tables: summary.target_tables,
    runtime_fields: summary.runtime_fields,
    plans: plans.map((row) => ({
      target_table: row.target_table,
      target_row_id: row.target_row_id,
      field_name: row.field_name,
      expected_invalid_public_value: row.expected_invalid_public_value,
      proposed_rollback_value: row.proposed_rollback_value,
    })),
  });

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Source WH03B fingerprint: \`${summary.source_apply_fingerprint}\`
- Source WH03B proof hash: \`${summary.source_apply_proof_hash}\`
- Runtime rollback plan rows: ${summary.runtime_rollback_plan_rows}
- Blocked current mismatch rows: ${summary.blocked_current_mismatch_rows}
- Ready for apply package: ${summary.ready_for_apply_package}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Metadata pointer writes performed: ${summary.metadata_pointer_writes_performed}
- Image path preserved: ${summary.image_path_preserved}
- Image status preserved: ${summary.image_status_preserved}
- Image note preserved: ${summary.image_note_preserved}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}

## Runtime Fields

${markdownTable(topEntries(summary.runtime_fields))}
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    fingerprint: summary.fingerprint,
    ready_for_apply_package: summary.ready_for_apply_package,
    stop_findings: summary.stop_findings,
    runtime_rollback_plan_rows: summary.runtime_rollback_plan_rows,
    blocked_current_mismatch_rows: summary.blocked_current_mismatch_rows,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
