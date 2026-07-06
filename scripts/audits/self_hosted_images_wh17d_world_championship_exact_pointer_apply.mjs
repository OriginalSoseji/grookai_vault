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
const SOURCE_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh17c_world_championship_exact_pointer_dry_run_summary_v1.json');
const SOURCE_PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh17c_world_championship_exact_pointer_plan_v1.jsonl');
const PLAN_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh17d_world_championship_exact_pointer_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh17d_world_championship_exact_pointer_apply_plan_v1.md');
const RESULT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh17d_world_championship_exact_pointer_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh17d_world_championship_exact_pointer_apply_result_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-17D-WORLD-CHAMPIONSHIP-EXACT-POINTER-APPLY';
const APPROVED_SQL_HASH = '4423d05aa86aec549e82542d41afcb4c35211432378754a4d4d7e18004fea677';

function parseArgs(argv) {
  const args = {
    apply: false,
    fingerprint: null,
    sqlHash: null,
    chunkSize: Number.parseInt(process.env.SELF_HOSTED_IMAGES_DB_REPOINT_CHUNK_SIZE ?? '500', 10),
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--fingerprint') args.fingerprint = argv[++index] ?? null;
    else if (arg === '--sql-hash') args.sqlHash = argv[++index] ?? null;
    else if (arg === '--chunk-size') args.chunkSize = Number.parseInt(argv[++index] ?? '500', 10);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.chunkSize = Math.max(1, Math.min(args.chunkSize || 500, 1000));
  return args;
}

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

function markdownTable(rows) {
  if (!rows.length) return '_None._';
  return [
    '| key | count |',
    '| --- | ---: |',
    ...rows.map((row) => `| ${String(row.key).replace(/\|/g, '\\|')} | ${row.count} |`),
  ].join('\n');
}

function topEntries(counts, limit = 25) {
  return Object.entries(counts)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

function buildUpdates(summary, planRows) {
  const stopFindings = [];
  if (summary.ready_for_apply_package !== true) {
    stopFindings.push(`wh17c_not_apply_ready:${(summary.stop_findings ?? []).join(',')}`);
  }
  if (summary.sql_hash !== APPROVED_SQL_HASH) stopFindings.push(`sql_hash_drift:${summary.sql_hash}`);
  if (summary.runtime_public_url_field_writes_planned === true) stopFindings.push('runtime_public_url_write_planned');

  const updates = [];
  for (const row of planRows) {
    if (row.plan_type !== 'exact_world_championship_parent_pointer') {
      stopFindings.push(`unsupported_plan_type:${row.plan_type}`);
      continue;
    }
    if (row.target_table !== 'card_prints') {
      stopFindings.push(`unsupported_table:${row.target_table}`);
      continue;
    }
    if (row.validation_findings?.length) {
      stopFindings.push(`row_validation_findings:${row.gv_id}:${row.validation_findings.join(',')}`);
      continue;
    }
    if (row.target_storage_bucket !== 'user-card-images') {
      stopFindings.push(`unsupported_storage_bucket:${row.gv_id}:${row.target_storage_bucket}`);
      continue;
    }
    if (row.proposed_values?.image_source !== 'identity') {
      stopFindings.push(`non_identity_source:${row.gv_id}`);
      continue;
    }
    if (row.proposed_values?.image_status !== 'exact') {
      stopFindings.push(`non_exact_status:${row.gv_id}`);
      continue;
    }
    if (!clean(row.proposed_values?.image_path)) {
      stopFindings.push(`missing_image_path:${row.gv_id}`);
      continue;
    }
    if (!clean(row.proposed_values?.image_note)?.includes('PriceCharting direct product page')) {
      stopFindings.push(`missing_source_note:${row.gv_id}`);
      continue;
    }

    for (const column of row.changed_columns ?? []) {
      if (!['image_source', 'image_path', 'image_status', 'image_note'].includes(column)) {
        stopFindings.push(`unsupported_changed_column:${column}:${row.gv_id}`);
      }
    }

    updates.push({
      target_row_id: row.target_row_id,
      gv_id: row.gv_id,
      set_code: row.set_code,
      name: row.name,
      number: row.number,
      source_url: row.source_url,
      image_source: row.proposed_values.image_source,
      image_path: row.proposed_values.image_path,
      image_status: row.proposed_values.image_status,
      image_note: row.proposed_values.image_note,
    });
  }

  return {
    updates,
    stopFindings: [...new Set(stopFindings)].slice(0, 200),
  };
}

function buildPlan(args, summary, updates) {
  const plan = {
    package_id: PACKAGE_ID,
    mode: args.apply ? 'guarded_apply' : 'plan_only',
    generated_at: new Date().toISOString(),
    source_dry_run_package_id: summary.package_id,
    source_dry_run_fingerprint: summary.fingerprint,
    source_sql_hash: summary.sql_hash,
    approved_sql_hash: APPROVED_SQL_HASH,
    source_plan_jsonl: path.relative(ROOT, SOURCE_PLAN_JSONL),
    metadata_pointer_update_count: updates.updates.length,
    total_update_count: updates.updates.length,
    target_tables: { card_prints: updates.updates.length },
    by_set_code: countBy(updates.updates, (row) => row.set_code),
    proposed_statuses: countBy(updates.updates, (row) => row.image_status),
    planned_columns: ['image_source', 'image_path', 'image_status', 'image_note'],
    runtime_public_url_field_writes_planned: false,
    db_writes_planned: true,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_planned: updates.updates.length,
    exact_image_claim_changes_performed: false,
    parent_identity_overwrites_performed: false,
    child_writes_performed: false,
    stop_findings: updates.stopFindings,
  };
  plan.ready_for_apply = plan.stop_findings.length === 0
    && plan.metadata_pointer_update_count === summary.effective_metadata_pointer_updates
    && plan.metadata_pointer_update_count > 0;
  plan.fingerprint = summary.fingerprint;
  return plan;
}

async function updateBatch(client, updates) {
  const valuesSql = updates
    .map((_, index) => `($${index * 5 + 1}::uuid, $${index * 5 + 2}::text, $${index * 5 + 3}::text, $${index * 5 + 4}::text, $${index * 5 + 5}::text)`)
    .join(', ');
  const values = updates.flatMap((row) => [
    row.target_row_id,
    row.image_source,
    row.image_path,
    row.image_status,
    row.image_note,
  ]);
  const result = await client.query(`
    with updates(id, image_source, image_path, image_status, image_note) as (
      values ${valuesSql}
    )
    update public.card_prints cp
    set
      image_source = updates.image_source,
      image_path = updates.image_path,
      image_status = updates.image_status,
      image_note = updates.image_note
    from updates
    where cp.id = updates.id
      and (
        cp.image_source is distinct from updates.image_source
        or cp.image_path is distinct from updates.image_path
        or cp.image_status is distinct from updates.image_status
        or cp.image_note is distinct from updates.image_note
      )
    returning cp.id::text as id
  `, values);
  return result.rowCount;
}

async function applyUpdates(plan, updates, args) {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const startedAt = new Date().toISOString();
  let updatedCount = 0;
  try {
    await client.query('begin');
    for (const batch of chunk(updates.updates, args.chunkSize)) {
      updatedCount += await updateBatch(client, batch);
    }
    if (updatedCount !== updates.updates.length) {
      throw new Error(`Metadata update mismatch: expected ${updates.updates.length}, updated ${updatedCount}`);
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

  const result = {
    package_id: PACKAGE_ID,
    mode: 'guarded_apply_result',
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    fingerprint: plan.fingerprint,
    sql_hash: plan.source_sql_hash,
    source_dry_run_fingerprint: plan.source_dry_run_fingerprint,
    metadata_pointer_update_count: plan.metadata_pointer_update_count,
    metadata_results: [{ key: 'card_prints', expected_count: updates.updates.length, updated_count: updatedCount }],
    db_writes_performed: true,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: updates.updates.length,
    runtime_public_url_field_writes_performed: false,
    parent_identity_overwrites_performed: false,
    child_writes_performed: false,
    planned_columns: plan.planned_columns,
  };
  result.proof_hash = proofHash({
    package_id: result.package_id,
    fingerprint: result.fingerprint,
    sql_hash: result.sql_hash,
    metadata_results: result.metadata_results,
    planned_columns: result.planned_columns,
    exact_image_claim_changes_performed: result.exact_image_claim_changes_performed,
  });
  return result;
}

function renderPlanMarkdown(plan) {
  return `# ${PACKAGE_ID}

- Generated: ${plan.generated_at}
- Mode: ${plan.mode}
- Fingerprint: \`${plan.fingerprint}\`
- SQL hash: \`${plan.source_sql_hash}\`
- Metadata pointer updates: ${plan.metadata_pointer_update_count}
- Ready for apply: ${plan.ready_for_apply}
- Stop findings: ${plan.stop_findings.length ? plan.stop_findings.join(', ') : 'none'}
- Runtime public URL field writes planned: ${plan.runtime_public_url_field_writes_planned}
- Planned columns: ${plan.planned_columns.join(', ')}
- DB writes planned: ${plan.db_writes_planned}
- Storage writes performed: ${plan.storage_writes_performed}
- Migrations created: ${plan.migrations_created}
- Exact image claim changes planned: ${plan.exact_image_claim_changes_planned}
- Deletes or merges performed: ${plan.deletes_or_merges_performed}

## By Set

${markdownTable(topEntries(plan.by_set_code))}

## Proposed Statuses

${markdownTable(topEntries(plan.proposed_statuses))}
`;
}

function renderResultMarkdown(result) {
  return `# ${PACKAGE_ID}

- Completed: ${result.ended_at}
- Fingerprint: \`${result.fingerprint}\`
- SQL hash: \`${result.sql_hash}\`
- Proof hash: \`${result.proof_hash}\`
- Metadata pointer updates: ${result.metadata_pointer_update_count}
- DB writes performed: ${result.db_writes_performed}
- Storage writes performed: ${result.storage_writes_performed}
- Migrations created: ${result.migrations_created}
- Exact image claim changes performed: ${result.exact_image_claim_changes_performed}
- Runtime public URL field writes performed: ${result.runtime_public_url_field_writes_performed}
- Parent identity overwrites performed: ${result.parent_identity_overwrites_performed}
- Child writes performed: ${result.child_writes_performed}
- Planned columns: ${result.planned_columns.join(', ')}
`;
}

async function main() {
  const args = parseArgs(process.argv);
  const summary = await readJson(SOURCE_SUMMARY_JSON);
  const planRows = await readJsonl(SOURCE_PLAN_JSONL);
  const updates = buildUpdates(summary, planRows);
  const plan = buildPlan(args, summary, updates);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(PLAN_JSON, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await fs.writeFile(PLAN_MD, renderPlanMarkdown(plan), 'utf8');

  if (!args.apply) {
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      mode: 'plan_only',
      plan_json: path.relative(ROOT, PLAN_JSON),
      plan_md: path.relative(ROOT, PLAN_MD),
      fingerprint: plan.fingerprint,
      sql_hash: plan.source_sql_hash,
      ready_for_apply: plan.ready_for_apply,
      stop_findings: plan.stop_findings,
      metadata_pointer_update_count: plan.metadata_pointer_update_count,
      planned_columns: plan.planned_columns,
      exact_image_claim_changes_planned: plan.exact_image_claim_changes_planned,
    }, null, 2));
    return;
  }

  if (!plan.ready_for_apply) throw new Error(`Plan is not apply-ready: ${plan.stop_findings.join(', ')}`);
  if (args.fingerprint !== plan.fingerprint) throw new Error(`Fingerprint mismatch. Expected ${plan.fingerprint}.`);
  if (args.sqlHash !== plan.source_sql_hash || args.sqlHash !== APPROVED_SQL_HASH) {
    throw new Error(`SQL hash mismatch. Expected ${plan.source_sql_hash}.`);
  }

  const result = await applyUpdates(plan, updates, args);
  await fs.writeFile(RESULT_JSON, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await fs.writeFile(RESULT_MD, renderResultMarkdown(result), 'utf8');
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    result_json: path.relative(ROOT, RESULT_JSON),
    result_md: path.relative(ROOT, RESULT_MD),
    proof_hash: result.proof_hash,
    metadata_pointer_update_count: result.metadata_pointer_update_count,
    exact_image_claim_changes_performed: result.exact_image_claim_changes_performed,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
