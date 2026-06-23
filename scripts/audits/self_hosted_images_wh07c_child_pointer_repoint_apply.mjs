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
const WH07B_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh07b_child_pointer_repoint_dry_run_summary_v1.json');
const WH07B_PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh07b_child_pointer_repoint_plan_v1.jsonl');
const PLAN_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh07c_child_pointer_repoint_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh07c_child_pointer_repoint_apply_plan_v1.md');
const RESULT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh07c_child_pointer_repoint_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh07c_child_pointer_repoint_apply_result_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-07C-CHILD-POINTER-REPOINT-APPLY';
const APPROVED_SOURCE_FINGERPRINT = '147101f1eb51d2eea5e4a0fc02a6c3fa719263061fe153fec89c76a4917458e3';
const ALLOWED_TABLES = new Set(['card_printings']);
const ALLOWED_COLUMNS = ['image_source', 'image_path', 'image_status', 'image_note'];
const ALLOWED_FAMILIES = new Set(['mcdonalds', 'trainer_kit']);

function parseArgs(argv) {
  const args = {
    apply: false,
    fingerprint: null,
    chunkSize: Number.parseInt(process.env.CHILD_POINTER_DB_REPOINT_CHUNK_SIZE ?? '250', 10),
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--fingerprint') args.fingerprint = argv[++index] ?? null;
    else if (arg === '--chunk-size') args.chunkSize = Number.parseInt(argv[++index] ?? '250', 10);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.chunkSize = Math.max(1, Math.min(args.chunkSize || 250, 1000));
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

function topEntries(counts, limit = 50) {
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

function buildUpdates(summary, planRows) {
  const stopFindings = [];
  if (summary.fingerprint !== APPROVED_SOURCE_FINGERPRINT) {
    stopFindings.push(`source_fingerprint_mismatch:${summary.fingerprint}`);
  }
  if (!summary.ready_for_apply_package) {
    stopFindings.push(`wh07b_not_apply_ready:${(summary.stop_findings ?? []).join(',')}`);
  }
  if (summary.runtime_public_url_field_writes_planned !== false) {
    stopFindings.push('runtime_public_url_field_writes_planned');
  }
  if (summary.exact_image_claim_changes_performed !== false) {
    stopFindings.push('exact_image_claim_change_in_source_summary');
  }

  const updates = [];
  for (const row of planRows) {
    if (row.plan_type !== 'child_metadata_pointer_repoint') {
      stopFindings.push(`unsupported_plan_type:${row.plan_type}`);
      continue;
    }
    if (!ALLOWED_TABLES.has(row.target_table)) {
      stopFindings.push(`unsupported_table:${row.target_table}`);
      continue;
    }
    if (!ALLOWED_FAMILIES.has(row.family)) {
      stopFindings.push(`unsupported_family:${row.family}:${row.target_row_id}`);
      continue;
    }
    if (row.exact_image_claim_change === true) {
      stopFindings.push(`exact_image_claim_change:${row.target_row_id}`);
      continue;
    }
    if (row.storage_write_required === true) {
      stopFindings.push(`storage_write_required:${row.target_row_id}`);
      continue;
    }
    if (row.runtime_public_url_field_write_required === true) {
      stopFindings.push(`runtime_public_url_field_write:${row.target_row_id}`);
      continue;
    }

    const proposed = row.proposed_values ?? {};
    const imageSource = clean(proposed.image_source);
    const imagePath = clean(proposed.image_path);
    const imageStatus = clean(proposed.image_status);
    const imageNote = clean(proposed.image_note);
    if (imageSource !== 'identity') stopFindings.push(`non_identity_source:${row.target_row_id}`);
    if (!imagePath?.startsWith('warehouse-derived/self-hosted-images-v1/')) {
      stopFindings.push(`non_self_hosted_path:${row.target_row_id}`);
    }
    if (!imageStatus?.startsWith('representative_')) {
      stopFindings.push(`non_representative_child_status:${imageStatus}:${row.target_row_id}`);
    }
    if (!imageNote) stopFindings.push(`missing_image_note:${row.target_row_id}`);
    if (!row.changed_columns?.length) continue;

    const disallowedChangedColumns = row.changed_columns.filter((column) => !ALLOWED_COLUMNS.includes(column));
    if (disallowedChangedColumns.length) {
      stopFindings.push(`disallowed_changed_columns:${row.target_row_id}:${disallowedChangedColumns.join(',')}`);
      continue;
    }

    updates.push({
      target_table: row.target_table,
      target_row_id: row.target_row_id,
      printing_gv_id: row.printing_gv_id,
      parent_gv_id: row.parent_gv_id,
      set_code: row.set_code,
      family: row.family,
      image_source: imageSource,
      image_path: imagePath,
      image_status: imageStatus,
      image_note: imageNote,
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
    source_plan_jsonl: path.relative(ROOT, WH07B_PLAN_JSONL),
    metadata_pointer_update_count: updates.updates.length,
    total_update_count: updates.updates.length,
    target_tables: countBy(updates.updates, (row) => row.target_table),
    families: countBy(updates.updates, (row) => row.family),
    set_codes: countBy(updates.updates, (row) => row.set_code),
    proposed_image_sources: countBy(updates.updates, (row) => row.image_source),
    proposed_image_statuses: countBy(updates.updates, (row) => row.image_status),
    planned_columns: ALLOWED_COLUMNS,
    runtime_public_url_field_writes_planned: false,
    db_writes_planned: true,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    parent_overwrites_performed: false,
    global_apply_performed: false,
    stop_findings: updates.stopFindings,
  };
  plan.ready_for_apply = plan.stop_findings.length === 0;
  plan.fingerprint = summary.fingerprint;
  plan.plan_hash = proofHash({
    package_id: plan.package_id,
    source_dry_run_fingerprint: plan.source_dry_run_fingerprint,
    metadata_pointer_update_count: plan.metadata_pointer_update_count,
    planned_columns: plan.planned_columns,
    updates: updates.updates,
  });
  return plan;
}

async function updateMetadataBatch(client, updates) {
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
    update public.card_printings target
    set image_source = updates.image_source,
        image_path = updates.image_path,
        image_status = updates.image_status,
        image_note = updates.image_note
    from updates
    where target.id = updates.id
    returning target.id::text as id
  `, values);
  return result.rowCount;
}

async function applyUpdates(plan, updates, args) {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const startedAt = new Date().toISOString();
  const metadataResults = [];
  try {
    await client.query('begin');
    let updatedCount = 0;
    for (const batch of chunk(updates.updates, args.chunkSize)) {
      updatedCount += await updateMetadataBatch(client, batch);
    }
    metadataResults.push({
      key: 'card_printings',
      expected_count: updates.updates.length,
      updated_count: updatedCount,
    });
    if (updatedCount !== updates.updates.length) {
      throw new Error(`Metadata update mismatch for card_printings: expected ${updates.updates.length}, updated ${updatedCount}`);
    }
    await client.query('commit');
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve the original error.
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
    plan_hash: plan.plan_hash,
    source_dry_run_fingerprint: plan.source_dry_run_fingerprint,
    metadata_pointer_update_count: plan.metadata_pointer_update_count,
    metadata_results: metadataResults,
    target_tables: plan.target_tables,
    families: plan.families,
    set_codes: plan.set_codes,
    proposed_image_sources: plan.proposed_image_sources,
    proposed_image_statuses: plan.proposed_image_statuses,
    planned_columns: plan.planned_columns,
    db_writes_performed: true,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    runtime_public_url_field_writes_performed: false,
    parent_overwrites_performed: false,
    global_apply_performed: false,
  };
  result.proof_hash = proofHash({
    package_id: result.package_id,
    fingerprint: result.fingerprint,
    plan_hash: result.plan_hash,
    metadata_results: result.metadata_results,
    planned_columns: result.planned_columns,
    families: result.families,
    proposed_image_statuses: result.proposed_image_statuses,
    set_codes: result.set_codes,
  });
  return result;
}

function renderPlanMarkdown(plan) {
  return `# ${PACKAGE_ID}

- Generated: ${plan.generated_at}
- Mode: ${plan.mode}
- Fingerprint: \`${plan.fingerprint}\`
- Plan hash: \`${plan.plan_hash}\`
- Source dry run fingerprint: \`${plan.source_dry_run_fingerprint}\`
- Metadata pointer updates: ${plan.metadata_pointer_update_count}
- Total updates: ${plan.total_update_count}
- Ready for apply: ${plan.ready_for_apply}
- Stop findings: ${plan.stop_findings.length ? plan.stop_findings.join(', ') : 'none'}
- Runtime public URL field writes planned: ${plan.runtime_public_url_field_writes_planned}
- Planned columns: ${plan.planned_columns.join(', ')}
- DB writes planned: ${plan.db_writes_planned}
- DB writes performed: ${plan.db_writes_performed}
- Storage writes performed: ${plan.storage_writes_performed}
- Migrations created: ${plan.migrations_created}
- Exact image claim changes performed: ${plan.exact_image_claim_changes_performed}
- Parent overwrites performed: ${plan.parent_overwrites_performed}
- Global apply performed: ${plan.global_apply_performed}

## Target Tables

${markdownTable(topEntries(plan.target_tables))}

## Families

${markdownTable(topEntries(plan.families))}

## Proposed Image Sources

${markdownTable(topEntries(plan.proposed_image_sources))}

## Proposed Image Statuses

${markdownTable(topEntries(plan.proposed_image_statuses))}

## Sets

${markdownTable(topEntries(plan.set_codes))}
`;
}

function renderResultMarkdown(result) {
  return `# ${PACKAGE_ID}

- Completed: ${result.ended_at}
- Fingerprint: \`${result.fingerprint}\`
- Plan hash: \`${result.plan_hash}\`
- Proof hash: \`${result.proof_hash}\`
- Metadata pointer updates: ${result.metadata_pointer_update_count}
- Planned columns: ${result.planned_columns.join(', ')}
- DB writes performed: ${result.db_writes_performed}
- Storage writes performed: ${result.storage_writes_performed}
- Migrations created: ${result.migrations_created}
- Exact image claim changes performed: ${result.exact_image_claim_changes_performed}
- Runtime public URL field writes performed: ${result.runtime_public_url_field_writes_performed}
- Parent overwrites performed: ${result.parent_overwrites_performed}
- Global apply performed: ${result.global_apply_performed}

## Metadata Results

${markdownTable(result.metadata_results.map((row) => ({ key: row.key, count: row.updated_count })))}

## Families

${markdownTable(topEntries(result.families))}

## Proposed Image Statuses

${markdownTable(topEntries(result.proposed_image_statuses))}

## Sets

${markdownTable(topEntries(result.set_codes))}
`;
}

async function main() {
  const args = parseArgs(process.argv);
  const wh07bSummary = await readJson(WH07B_SUMMARY_JSON);
  const wh07bPlanRows = await readJsonl(WH07B_PLAN_JSONL);
  const updates = buildUpdates(wh07bSummary, wh07bPlanRows);
  const plan = buildPlan(args, wh07bSummary, updates);

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
      plan_hash: plan.plan_hash,
      ready_for_apply: plan.ready_for_apply,
      stop_findings: plan.stop_findings,
      metadata_pointer_update_count: plan.metadata_pointer_update_count,
      planned_columns: plan.planned_columns,
    }, null, 2));
    return;
  }

  if (!plan.ready_for_apply) throw new Error(`Plan is not apply-ready: ${plan.stop_findings.join(', ')}`);
  if (args.fingerprint !== plan.fingerprint) {
    throw new Error(`Fingerprint mismatch. Expected ${plan.fingerprint}.`);
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
    proposed_image_statuses: result.proposed_image_statuses,
    families: result.families,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
