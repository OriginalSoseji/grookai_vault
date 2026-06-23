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
const DRY_RUN_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh03c_runtime_public_url_rollback_dry_run_summary_v1.json');
const DRY_RUN_PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh03c_runtime_public_url_rollback_plan_v1.jsonl');
const RESULT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh03c_runtime_public_url_rollback_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh03c_runtime_public_url_rollback_apply_result_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-03C-RUNTIME-PUBLIC-URL-ROLLBACK-APPLY';
const ALLOWED_TABLES = new Set(['card_prints', 'card_printings']);
const ALLOWED_FIELDS = new Set(['image_url', 'image_alt_url', 'representative_image_url']);

function parseArgs(argv) {
  const args = {
    apply: false,
    fingerprint: null,
    chunkSize: Number.parseInt(process.env.SELF_HOSTED_IMAGES_DB_REPOINT_CHUNK_SIZE ?? '500', 10),
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--fingerprint') args.fingerprint = argv[++index] ?? null;
    else if (arg === '--chunk-size') args.chunkSize = Number.parseInt(argv[++index] ?? '500', 10);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.chunkSize = Math.max(1, Math.min(args.chunkSize || 500, 1000));
  return args;
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

function chunk(values, size) {
  const output = [];
  for (let index = 0; index < values.length; index += size) output.push(values.slice(index, index + size));
  return output;
}

function assertSafe(value, allowed) {
  if (!allowed.has(value)) throw new Error(`Unsupported identifier: ${value}`);
}

function buildPlan(summary, rows) {
  const stopFindings = [];
  if (!summary.ready_for_apply_package) stopFindings.push(...(summary.stop_findings ?? ['source_dry_run_not_ready']));
  for (const row of rows) {
    if (!ALLOWED_TABLES.has(row.target_table)) stopFindings.push(`unsupported_table:${row.target_table}`);
    if (!ALLOWED_FIELDS.has(row.field_name)) stopFindings.push(`unsupported_field:${row.target_table}.${row.field_name}`);
    if (row.blocked_without_fresh_current_match) stopFindings.push(`blocked_current_mismatch:${row.target_table}:${row.target_row_id}:${row.field_name}`);
  }
  const plan = {
    package_id: PACKAGE_ID,
    mode: 'guarded_apply',
    generated_at: new Date().toISOString(),
    source_dry_run_package_id: summary.package_id,
    source_dry_run_fingerprint: summary.fingerprint,
    runtime_rollback_rows: rows.length,
    target_tables: countBy(rows, (row) => row.target_table),
    runtime_fields: countBy(rows, (row) => `${row.target_table}.${row.field_name}`),
    preserved_columns: ['image_path', 'image_source', 'image_status', 'image_note'],
    db_writes_planned: true,
    storage_writes_performed: false,
    metadata_pointer_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    stop_findings: [...new Set(stopFindings)].slice(0, 200),
  };
  plan.ready_for_apply = plan.stop_findings.length === 0;
  plan.fingerprint = summary.fingerprint;
  return plan;
}

async function updateBatch(client, tableName, fieldName, rows) {
  assertSafe(tableName, ALLOWED_TABLES);
  assertSafe(fieldName, ALLOWED_FIELDS);
  const valuesSql = rows
    .map((_, index) => `($${index * 3 + 1}::uuid, $${index * 3 + 2}::text, $${index * 3 + 3}::text)`)
    .join(', ');
  const values = rows.flatMap((row) => [
    row.target_row_id,
    row.expected_invalid_public_value,
    row.proposed_rollback_value,
  ]);
  const result = await client.query(`
    with updates(id, expected_value, rollback_value) as (
      values ${valuesSql}
    )
    update public.${tableName} target
    set ${fieldName} = updates.rollback_value
    from updates
    where target.id = updates.id
      and coalesce(target.${fieldName}, '') = coalesce(updates.expected_value, '')
    returning target.id::text as id
  `, values);
  return result.rowCount;
}

async function applyRollback(rows, args) {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const results = [];
  try {
    await client.query('begin');
    const groups = new Map();
    for (const row of rows) {
      const key = `${row.target_table}.${row.field_name}`;
      const group = groups.get(key) ?? [];
      group.push(row);
      groups.set(key, group);
    }
    for (const [key, group] of groups.entries()) {
      const [tableName, fieldName] = key.split('.');
      let updatedCount = 0;
      for (const batch of chunk(group, args.chunkSize)) {
        updatedCount += await updateBatch(client, tableName, fieldName, batch);
      }
      results.push({ key, expected_count: group.length, updated_count: updatedCount });
      if (updatedCount !== group.length) {
        throw new Error(`Rollback guard mismatch for ${key}: expected ${group.length}, updated ${updatedCount}`);
      }
    }
    await client.query('commit');
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve original error.
    }
    throw error;
  } finally {
    await client.end();
  }
  return results;
}

function renderResultMarkdown(result) {
  const rows = result.runtime_results
    .map((row) => `| ${row.key} | ${row.expected_count} | ${row.updated_count} |`)
    .join('\n');
  return `# ${PACKAGE_ID}

- Completed: ${result.ended_at}
- Fingerprint: \`${result.fingerprint}\`
- Proof hash: \`${result.proof_hash}\`
- Runtime rollback rows: ${result.runtime_rollback_rows}
- DB writes performed: ${result.db_writes_performed}
- Storage writes performed: ${result.storage_writes_performed}
- Metadata pointer writes performed: ${result.metadata_pointer_writes_performed}
- Preserved columns: ${result.preserved_columns.join(', ')}
- Migrations created: ${result.migrations_created}
- Exact image claim changes performed: ${result.exact_image_claim_changes_performed}

## Runtime Results

| field | expected | updated |
| --- | ---: | ---: |
${rows}
`;
}

async function main() {
  const args = parseArgs(process.argv);
  const summary = await readJson(DRY_RUN_SUMMARY_JSON);
  const rows = await readJsonl(DRY_RUN_PLAN_JSONL);
  const plan = buildPlan(summary, rows);
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    mode: args.apply ? 'guarded_apply' : 'plan_only',
    fingerprint: plan.fingerprint,
    ready_for_apply: plan.ready_for_apply,
    stop_findings: plan.stop_findings,
    runtime_rollback_rows: plan.runtime_rollback_rows,
    runtime_fields: plan.runtime_fields,
    preserved_columns: plan.preserved_columns,
  }, null, 2));

  if (!args.apply) return;
  if (!plan.ready_for_apply) throw new Error(`Plan is not apply-ready: ${plan.stop_findings.join(', ')}`);
  if (args.fingerprint !== plan.fingerprint) {
    throw new Error(`Fingerprint mismatch. Expected ${plan.fingerprint}.`);
  }

  const startedAt = new Date().toISOString();
  const runtimeResults = await applyRollback(rows, args);
  const result = {
    package_id: PACKAGE_ID,
    mode: 'guarded_apply_result',
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    fingerprint: plan.fingerprint,
    source_dry_run_fingerprint: plan.source_dry_run_fingerprint,
    runtime_rollback_rows: plan.runtime_rollback_rows,
    runtime_results: runtimeResults,
    db_writes_performed: true,
    storage_writes_performed: false,
    metadata_pointer_writes_performed: false,
    preserved_columns: plan.preserved_columns,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
  };
  result.proof_hash = proofHash({
    package_id: result.package_id,
    fingerprint: result.fingerprint,
    runtime_results: result.runtime_results,
    preserved_columns: result.preserved_columns,
  });
  await fs.writeFile(RESULT_JSON, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await fs.writeFile(RESULT_MD, renderResultMarkdown(result), 'utf8');
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    result_json: path.relative(ROOT, RESULT_JSON),
    result_md: path.relative(ROOT, RESULT_MD),
    proof_hash: result.proof_hash,
    runtime_rollback_rows: result.runtime_rollback_rows,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
