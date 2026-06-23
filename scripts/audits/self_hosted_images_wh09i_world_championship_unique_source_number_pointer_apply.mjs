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
const SOURCE_SUMMARY_JSON = path.join(
  OUTPUT_DIR,
  'self_hosted_images_wh09h_world_championship_unique_source_number_pointer_dry_run_summary_v1.json',
);
const SOURCE_PLAN_JSONL = path.join(
  OUTPUT_DIR,
  'self_hosted_images_wh09h_world_championship_unique_source_number_pointer_plan_v1.jsonl',
);
const APPLY_PLAN_JSON = path.join(
  OUTPUT_DIR,
  'self_hosted_images_wh09i_world_championship_unique_source_number_pointer_apply_plan_v1.json',
);
const APPLY_PLAN_MD = path.join(
  OUTPUT_DIR,
  'self_hosted_images_wh09i_world_championship_unique_source_number_pointer_apply_plan_v1.md',
);
const APPLY_RESULT_JSON = path.join(
  OUTPUT_DIR,
  'self_hosted_images_wh09i_world_championship_unique_source_number_pointer_apply_result_v1.json',
);
const APPLY_RESULT_MD = path.join(
  OUTPUT_DIR,
  'self_hosted_images_wh09i_world_championship_unique_source_number_pointer_apply_result_v1.md',
);

const PACKAGE_ID = 'IMG-HOST-WH-09I-WORLD-CHAMPIONSHIP-UNIQUE-SOURCE-NUMBER-POINTER-APPLY';
const SOURCE_DRY_RUN_PACKAGE_ID = 'IMG-HOST-WH-09H-WORLD-CHAMPIONSHIP-UNIQUE-SOURCE-NUMBER-POINTER-DRY-RUN';
const APPROVED_SOURCE_FINGERPRINT = '9d73e7353674845d3334d1bb2e09f31baf594d2d31e00f84fd49b07c9311eae9';
const APPROVED_PLAN_FILE_HASH = '09e37e1d8d8bca85e73d17ea4913fb8f0bfd0b041258c45f43c3626c37c4b638';
const EXPECTED_UPDATE_COUNT = 28;
const ALLOWED_COLUMNS = ['image_source', 'image_path', 'image_status', 'image_note'];

function parseArgs(argv) {
  const args = { apply: false, chunkSize: Number.parseInt(process.env.WCD_RESIDUAL_POINTER_CHUNK_SIZE ?? '250', 10) };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--chunk-size') args.chunkSize = Number.parseInt(argv[++index] ?? '250', 10);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.chunkSize = Math.max(1, Math.min(args.chunkSize || 250, 1000));
  return args;
}

function dbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function clean(value) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((output, key) => {
      output[key] = canonicalize(value[key]);
      return output;
    }, {});
}

function proofHash(value) {
  return sha256Hex(JSON.stringify(canonicalize(value)));
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function topEntries(counts, limit = 50) {
  return Object.entries(counts)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function markdownTable(rows) {
  if (!rows.length) return '_None._';
  return ['| key | count |', '| --- | ---: |', ...rows.map((row) => `| ${String(row.key).replace(/\|/g, '\\|')} | ${row.count} |`)].join('\n');
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function readJsonl(file) {
  const raw = await fs.readFile(file, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

async function fetchRows(client, ids) {
  const rows = new Map();
  for (const batch of chunk(ids, 1000)) {
    const result = await client.query(
      `select id::text, gv_id, set_code, variant_key, image_source, image_path, image_status, image_note
       from public.card_prints
       where id = any($1::uuid[])`,
      [batch],
    );
    for (const row of result.rows) rows.set(row.id, row);
  }
  return rows;
}

function valuesMatch(left, right) {
  return clean(left) === clean(right);
}

function validatePlan(summary, planRows, planFileHash) {
  const stopFindings = [];
  if (summary.package_id !== SOURCE_DRY_RUN_PACKAGE_ID) stopFindings.push(`source_package_mismatch:${summary.package_id}`);
  if (summary.fingerprint !== APPROVED_SOURCE_FINGERPRINT) stopFindings.push(`source_fingerprint_mismatch:${summary.fingerprint}`);
  if (planFileHash !== APPROVED_PLAN_FILE_HASH) stopFindings.push(`plan_file_hash_mismatch:${planFileHash}`);
  if (summary.ready_for_apply_package !== true) stopFindings.push('source_not_apply_ready');
  if (summary.storage_writes_performed !== false) stopFindings.push('source_storage_write_flag');
  if (summary.child_writes_performed !== false) stopFindings.push('source_child_write_flag');
  if (summary.exact_image_claim_changes_performed !== false) stopFindings.push('source_exact_image_claim_change_flag');
  if (summary.runtime_public_url_field_writes_planned !== false) stopFindings.push('source_runtime_public_url_write_flag');
  if (planRows.length !== EXPECTED_UPDATE_COUNT) stopFindings.push(`unexpected_plan_row_count:${planRows.length}`);

  const seenIds = new Set();
  const updates = [];
  for (const row of planRows) {
    if (row.package_id !== PACKAGE_ID) stopFindings.push(`package_id_mismatch:${row.package_id}:${row.target_row_id}`);
    if (row.source_dry_run_package_id !== SOURCE_DRY_RUN_PACKAGE_ID) stopFindings.push(`source_dry_run_package_mismatch:${row.target_row_id}`);
    if (row.plan_type !== 'metadata_pointer_repoint') stopFindings.push(`unsupported_plan_type:${row.plan_type}:${row.target_row_id}`);
    if (row.target_table !== 'card_prints') stopFindings.push(`unsupported_table:${row.target_table}:${row.target_row_id}`);
    if (!String(row.set_code ?? '').startsWith('wcd')) stopFindings.push(`unsupported_set_code:${row.set_code}:${row.target_row_id}`);
    if (row.variant_key !== 'world_championship_deck_replica') stopFindings.push(`unsupported_variant_key:${row.variant_key}:${row.target_row_id}`);
    if (seenIds.has(row.target_row_id)) stopFindings.push(`duplicate_target_row:${row.target_row_id}`);
    seenIds.add(row.target_row_id);
    if (row.exact_image_claim_change === true) stopFindings.push(`exact_image_claim_change:${row.target_row_id}`);
    if (row.storage_write_performed === true) stopFindings.push(`storage_write_flag:${row.target_row_id}`);
    if (row.runtime_public_url_field_write_planned === true) stopFindings.push(`runtime_public_url_write:${row.target_row_id}`);

    const changedColumns = row.changed_columns ?? [];
    const disallowed = changedColumns.filter((column) => !ALLOWED_COLUMNS.includes(column));
    if (disallowed.length) stopFindings.push(`disallowed_changed_columns:${row.target_row_id}:${disallowed.join(',')}`);

    const proposed = row.proposed_values ?? {};
    const imageSource = clean(proposed.image_source);
    const imagePath = clean(proposed.image_path);
    const imageStatus = clean(proposed.image_status);
    const imageNote = clean(proposed.image_note);
    if (imageSource !== 'identity') stopFindings.push(`non_identity_source:${row.target_row_id}`);
    if (!imagePath?.startsWith('warehouse-derived/self-hosted-images-v1/card_prints/')) stopFindings.push(`non_self_hosted_path:${row.target_row_id}`);
    if (imagePath?.toLowerCase().includes('/wcd')) stopFindings.push(`wcd_exact_like_path:${row.target_row_id}`);
    if (imageStatus !== 'representative_shared') stopFindings.push(`unsupported_status:${imageStatus}:${row.target_row_id}`);
    if (!imageNote?.includes('not an exact') || !imageNote.includes('exact WCD image remains uncataloged')) {
      stopFindings.push(`missing_honesty_note:${row.target_row_id}`);
    }

    updates.push({
      target_row_id: row.target_row_id,
      gv_id: row.gv_id,
      set_code: row.set_code,
      deck_year: row.deck_year,
      current_values: row.current_values ?? {},
      image_source: imageSource,
      image_path: imagePath,
      image_status: imageStatus,
      image_note: imageNote,
    });
  }
  return { updates, stopFindings: [...new Set(stopFindings)].slice(0, 200) };
}

async function validateCurrentRows(updates) {
  const url = dbUrl();
  if (!url) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const currentRows = await fetchRows(client, updates.map((row) => row.target_row_id));
    const stopFindings = [];
    for (const row of updates) {
      const current = currentRows.get(row.target_row_id);
      if (!current) {
        stopFindings.push(`missing_current_row:${row.target_row_id}`);
        continue;
      }
      if (current.gv_id !== row.gv_id) stopFindings.push(`gv_id_drift:${row.target_row_id}`);
      if (current.set_code !== row.set_code) stopFindings.push(`set_code_drift:${row.target_row_id}`);
      if (!String(current.set_code ?? '').startsWith('wcd')) stopFindings.push(`current_non_wcd:${row.target_row_id}`);
      if (current.variant_key !== 'world_championship_deck_replica') stopFindings.push(`current_variant_drift:${row.target_row_id}`);
      for (const column of ALLOWED_COLUMNS) {
        if (!valuesMatch(current[column], row.current_values[column])) stopFindings.push(`current_value_drift:${row.target_row_id}:${column}`);
      }
    }
    return { stopFindings: [...new Set(stopFindings)].slice(0, 200) };
  } finally {
    await client.end();
  }
}

function buildApplyPlan(args, summary, planFileHash, validation, currentValidation) {
  const updates = validation.updates;
  const stopFindings = [...validation.stopFindings, ...currentValidation.stopFindings];
  const plan = {
    package_id: PACKAGE_ID,
    mode: args.apply ? 'guarded_apply' : 'plan_only',
    generated_at: new Date().toISOString(),
    source_dry_run_package_id: summary.package_id,
    source_dry_run_fingerprint: summary.fingerprint,
    actual_plan_file_hash: planFileHash,
    approved_plan_file_hash: APPROVED_PLAN_FILE_HASH,
    metadata_pointer_update_count: updates.length,
    planned_columns: ALLOWED_COLUMNS,
    set_codes: countBy(updates, (row) => row.set_code),
    deck_years: countBy(updates, (row) => String(row.deck_year)),
    proposed_image_sources: countBy(updates, (row) => row.image_source),
    proposed_image_statuses: countBy(updates, (row) => row.image_status),
    db_writes_planned: true,
    db_writes_performed: false,
    storage_writes_performed: false,
    child_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    runtime_public_url_field_writes_planned: false,
    global_apply_performed: false,
    stop_findings: [...new Set(stopFindings)].slice(0, 200),
  };
  plan.ready_for_apply = plan.stop_findings.length === 0
    && plan.metadata_pointer_update_count === EXPECTED_UPDATE_COUNT
    && plan.actual_plan_file_hash === APPROVED_PLAN_FILE_HASH;
  plan.fingerprint = summary.fingerprint;
  plan.sql_hash = proofHash({
    package_id: plan.package_id,
    source_dry_run_fingerprint: plan.source_dry_run_fingerprint,
    approved_plan_file_hash: plan.approved_plan_file_hash,
    metadata_pointer_update_count: plan.metadata_pointer_update_count,
    planned_columns: plan.planned_columns,
    updates: updates.map((row) => ({
      target_row_id: row.target_row_id,
      image_source: row.image_source,
      image_path: row.image_path,
      image_status: row.image_status,
      image_note: row.image_note,
    })),
  });
  return plan;
}

async function updateBatch(client, updates) {
  const placeholders = updates
    .map((_, index) => `($${index * 5 + 1}::uuid, $${index * 5 + 2}::text, $${index * 5 + 3}::text, $${index * 5 + 4}::text, $${index * 5 + 5}::text)`)
    .join(', ');
  const values = updates.flatMap((row) => [row.target_row_id, row.image_source, row.image_path, row.image_status, row.image_note]);
  const result = await client.query(
    `with updates(id, image_source, image_path, image_status, image_note) as (values ${placeholders})
     update public.card_prints target
     set image_source = updates.image_source,
         image_path = updates.image_path,
         image_status = updates.image_status,
         image_note = updates.image_note
     from updates
     where target.id = updates.id
     returning target.id::text as id`,
    values,
  );
  return result.rowCount;
}

async function applyUpdates(plan, updates, args) {
  const url = dbUrl();
  if (!url) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const startedAt = new Date().toISOString();
  try {
    await client.query('begin');
    let updatedRows = 0;
    const batchResults = [];
    for (const batch of chunk(updates, args.chunkSize)) {
      const rowCount = await updateBatch(client, batch);
      updatedRows += rowCount;
      batchResults.push({ batch_size: batch.length, updated_rows: rowCount });
      if (rowCount !== batch.length) throw new Error(`Batch row count mismatch: expected ${batch.length}, got ${rowCount}`);
    }

    const afterRows = await fetchRows(client, updates.map((row) => row.target_row_id));
    const postApplyFindings = [];
    for (const row of updates) {
      const after = afterRows.get(row.target_row_id);
      if (!after) {
        postApplyFindings.push(`missing_after_row:${row.target_row_id}`);
        continue;
      }
      for (const column of ALLOWED_COLUMNS) {
        if (!valuesMatch(after[column], row[column])) postApplyFindings.push(`after_value_mismatch:${row.target_row_id}:${column}`);
      }
    }
    if (postApplyFindings.length) throw new Error(`Post-apply verification failed: ${postApplyFindings.slice(0, 20).join('; ')}`);

    await client.query('commit');
    const result = {
      ...plan,
      mode: 'guarded_apply',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      db_writes_performed: true,
      updated_rows: updatedRows,
      batch_results: batchResults,
      post_apply_findings: [],
      ready_for_apply: true,
      applied: true,
    };
    result.result_hash = proofHash({
      package_id: result.package_id,
      source_dry_run_fingerprint: result.source_dry_run_fingerprint,
      approved_plan_file_hash: result.approved_plan_file_hash,
      updated_rows: result.updated_rows,
      planned_columns: result.planned_columns,
      deck_years: result.deck_years,
      proposed_image_statuses: result.proposed_image_statuses,
    });
    return result;
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function writeApplyPlan(plan) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(APPLY_PLAN_JSON, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await fs.writeFile(APPLY_PLAN_MD, `# ${PACKAGE_ID} Plan

- Generated: ${plan.generated_at}
- Mode: ${plan.mode}
- Source dry-run fingerprint: \`${plan.source_dry_run_fingerprint}\`
- Actual plan file hash: \`${plan.actual_plan_file_hash}\`
- SQL hash: \`${plan.sql_hash}\`
- Metadata pointer update count: ${plan.metadata_pointer_update_count}
- Ready for apply: ${plan.ready_for_apply}
- Stop findings: ${plan.stop_findings.length ? plan.stop_findings.join(', ') : 'none'}
- Planned columns: ${plan.planned_columns.join(', ')}
- DB writes planned: ${plan.db_writes_planned}
- DB writes performed: ${plan.db_writes_performed}
- Storage writes performed: ${plan.storage_writes_performed}
- Child writes performed: ${plan.child_writes_performed}
- Migrations created: ${plan.migrations_created}
- Exact image claim changes performed: ${plan.exact_image_claim_changes_performed}
- Runtime public URL field writes planned: ${plan.runtime_public_url_field_writes_planned}

## Deck Years

${markdownTable(topEntries(plan.deck_years, 30))}

## Proposed Image Statuses

${markdownTable(topEntries(plan.proposed_image_statuses))}

## Largest Sets

${markdownTable(topEntries(plan.set_codes, 60))}
`, 'utf8');
}

async function writeApplyResult(result) {
  await fs.writeFile(APPLY_RESULT_JSON, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await fs.writeFile(APPLY_RESULT_MD, `# ${PACKAGE_ID} Result

- Started: ${result.started_at}
- Completed: ${result.completed_at}
- Source dry-run fingerprint: \`${result.source_dry_run_fingerprint}\`
- Actual plan file hash: \`${result.actual_plan_file_hash}\`
- SQL hash: \`${result.sql_hash}\`
- Result hash: \`${result.result_hash}\`
- Applied: ${result.applied}
- Updated rows: ${result.updated_rows}
- Planned columns: ${result.planned_columns.join(', ')}
- DB writes performed: ${result.db_writes_performed}
- Storage writes performed: ${result.storage_writes_performed}
- Child writes performed: ${result.child_writes_performed}
- Migrations created: ${result.migrations_created}
- Identity table writes performed: ${result.identity_table_writes_performed}
- Price writes performed: ${result.price_writes_performed}
- Deletes or merges performed: ${result.deletes_or_merges_performed}
- Exact image claim changes performed: ${result.exact_image_claim_changes_performed}
- Runtime public URL field writes planned: ${result.runtime_public_url_field_writes_planned}
- Global apply performed: ${result.global_apply_performed}
- Post-apply findings: ${result.post_apply_findings.length ? result.post_apply_findings.join(', ') : 'none'}

## Deck Years

${markdownTable(topEntries(result.deck_years, 30))}

## Proposed Image Statuses

${markdownTable(topEntries(result.proposed_image_statuses))}

## Largest Sets

${markdownTable(topEntries(result.set_codes, 60))}
`, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv);
  const summary = await readJson(SOURCE_SUMMARY_JSON);
  const planRaw = await fs.readFile(SOURCE_PLAN_JSONL, 'utf8');
  const planFileHash = sha256Hex(planRaw);
  const planRows = await readJsonl(SOURCE_PLAN_JSONL);
  const validation = validatePlan(summary, planRows, planFileHash);
  const currentValidation = await validateCurrentRows(validation.updates);
  const applyPlan = buildApplyPlan(args, summary, planFileHash, validation, currentValidation);
  await writeApplyPlan(applyPlan);

  if (!applyPlan.ready_for_apply) throw new Error(`Apply not ready: ${applyPlan.stop_findings.join('; ')}`);
  if (!args.apply) {
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      mode: 'plan_only',
      apply_plan_json: path.relative(ROOT, APPLY_PLAN_JSON),
      apply_plan_md: path.relative(ROOT, APPLY_PLAN_MD),
      fingerprint: applyPlan.fingerprint,
      sql_hash: applyPlan.sql_hash,
      actual_plan_file_hash: applyPlan.actual_plan_file_hash,
      metadata_pointer_update_count: applyPlan.metadata_pointer_update_count,
      ready_for_apply: applyPlan.ready_for_apply,
    }, null, 2));
    return;
  }

  const result = await applyUpdates(applyPlan, validation.updates, args);
  await writeApplyResult(result);
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    mode: 'guarded_apply',
    apply_plan_json: path.relative(ROOT, APPLY_PLAN_JSON),
    apply_result_json: path.relative(ROOT, APPLY_RESULT_JSON),
    fingerprint: result.fingerprint,
    sql_hash: result.sql_hash,
    result_hash: result.result_hash,
    actual_plan_file_hash: result.actual_plan_file_hash,
    updated_rows: result.updated_rows,
    applied: result.applied,
    post_apply_findings: result.post_apply_findings,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
