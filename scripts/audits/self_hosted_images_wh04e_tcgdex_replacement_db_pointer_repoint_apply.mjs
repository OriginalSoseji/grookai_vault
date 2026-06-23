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
const WH04D_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh04d_tcgdex_replacement_db_pointer_repoint_dry_run_summary_v1.json');
const WH04D_PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh04d_tcgdex_replacement_db_pointer_repoint_plan_v1.jsonl');
const PLAN_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh04e_tcgdex_replacement_db_pointer_repoint_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh04e_tcgdex_replacement_db_pointer_repoint_apply_plan_v1.md');
const RESULT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh04e_tcgdex_replacement_db_pointer_repoint_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh04e_tcgdex_replacement_db_pointer_repoint_apply_result_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-04E-TCGDEX-REPLACEMENT-DB-POINTER-REPOINT-APPLY';
const ALLOWED_TABLES = new Set(['card_prints']);

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

function buildUpdates(wh04dSummary, wh04dPlanRows) {
  const stopFindings = [];
  if (!wh04dSummary.ready_for_apply_package) {
    stopFindings.push(`wh04d_not_apply_ready:${(wh04dSummary.stop_findings ?? []).join(',')}`);
  }

  const updates = [];
  for (const row of wh04dPlanRows) {
    if (row.plan_type !== 'metadata_pointer_repoint') {
      stopFindings.push(`unsupported_plan_type:${row.plan_type}`);
      continue;
    }
    if (!ALLOWED_TABLES.has(row.target_table)) {
      stopFindings.push(`unsupported_table:${row.target_table}`);
      continue;
    }
    if (!clean(row.proposed_values?.image_source) || !clean(row.proposed_values?.image_path)) {
      stopFindings.push(`missing_metadata_pointer_value:${row.target_row_id}`);
      continue;
    }
    if (clean(row.proposed_values.image_source) !== 'identity') {
      stopFindings.push(`non_identity_self_hosted_source:${row.target_row_id}`);
      continue;
    }
    if (row.exact_image_claim_change === true) {
      stopFindings.push(`exact_image_claim_change:${row.target_row_id}`);
      continue;
    }
    if (
      clean(row.current_values?.image_source) === clean(row.proposed_values.image_source)
      && clean(row.current_values?.image_path) === clean(row.proposed_values.image_path)
    ) {
      continue;
    }
    updates.push({
      target_table: row.target_table,
      target_row_id: row.target_row_id,
      image_source: clean(row.proposed_values.image_source),
      image_path: clean(row.proposed_values.image_path),
    });
  }

  return {
    updates,
    stopFindings: [...new Set(stopFindings)].slice(0, 200),
  };
}

function buildPlan(args, wh04dSummary, updates) {
  const plan = {
    package_id: PACKAGE_ID,
    mode: args.apply ? 'guarded_apply' : 'plan_only',
    generated_at: new Date().toISOString(),
    source_dry_run_package_id: wh04dSummary.package_id,
    source_dry_run_fingerprint: wh04dSummary.fingerprint,
    source_plan_jsonl: path.relative(ROOT, WH04D_PLAN_JSONL),
    metadata_pointer_update_count: updates.updates.length,
    total_update_count: updates.updates.length,
    target_tables: countBy(updates.updates, (row) => row.target_table),
    proposed_image_sources: countBy(updates.updates, (row) => row.image_source),
    preserved_columns: ['image_status', 'image_note'],
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
    stop_findings: updates.stopFindings,
  };
  plan.ready_for_apply = plan.stop_findings.length === 0;
  plan.fingerprint = proofHash({
    package_id: plan.package_id,
    source_dry_run_fingerprint: plan.source_dry_run_fingerprint,
    metadata_pointer_update_count: plan.metadata_pointer_update_count,
    preserved_columns: plan.preserved_columns,
    updates: updates.updates,
  });
  return plan;
}

async function updateMetadataBatch(client, updates) {
  const valuesSql = updates
    .map((_, index) => `($${index * 3 + 1}::uuid, $${index * 3 + 2}::text, $${index * 3 + 3}::text)`)
    .join(', ');
  const values = updates.flatMap((row) => [row.target_row_id, row.image_source, row.image_path]);
  const result = await client.query(`
    with updates(id, image_source, image_path) as (
      values ${valuesSql}
    )
    update public.card_prints target
    set image_source = updates.image_source,
        image_path = updates.image_path
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
      key: 'card_prints',
      expected_count: updates.updates.length,
      updated_count: updatedCount,
    });
    if (updatedCount !== updates.updates.length) {
      throw new Error(`Metadata update mismatch for card_prints: expected ${updates.updates.length}, updated ${updatedCount}`);
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
    source_dry_run_fingerprint: plan.source_dry_run_fingerprint,
    metadata_pointer_update_count: plan.metadata_pointer_update_count,
    metadata_results: metadataResults,
    db_writes_performed: true,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    runtime_public_url_field_writes_performed: false,
    preserved_columns: plan.preserved_columns,
  };
  result.proof_hash = proofHash({
    package_id: result.package_id,
    fingerprint: result.fingerprint,
    metadata_results: result.metadata_results,
    preserved_columns: result.preserved_columns,
  });
  return result;
}

function renderPlanMarkdown(plan) {
  return `# ${PACKAGE_ID}

- Generated: ${plan.generated_at}
- Mode: ${plan.mode}
- Fingerprint: \`${plan.fingerprint}\`
- Source dry run fingerprint: \`${plan.source_dry_run_fingerprint}\`
- Metadata pointer updates: ${plan.metadata_pointer_update_count}
- Total updates: ${plan.total_update_count}
- Ready for apply: ${plan.ready_for_apply}
- Stop findings: ${plan.stop_findings.length ? plan.stop_findings.join(', ') : 'none'}
- Runtime public URL field writes planned: ${plan.runtime_public_url_field_writes_planned}
- Preserved columns: ${plan.preserved_columns.join(', ')}
- DB writes planned: ${plan.db_writes_planned}
- DB writes performed: ${plan.db_writes_performed}
- Storage writes performed: ${plan.storage_writes_performed}
- Migrations created: ${plan.migrations_created}
- Exact image claim changes performed: ${plan.exact_image_claim_changes_performed}
- Deletes or merges performed: ${plan.deletes_or_merges_performed}

## Target Tables

${markdownTable(topEntries(plan.target_tables))}

## Proposed Image Sources

${markdownTable(topEntries(plan.proposed_image_sources))}
`;
}

function renderResultMarkdown(result) {
  return `# ${PACKAGE_ID}

- Completed: ${result.ended_at}
- Fingerprint: \`${result.fingerprint}\`
- Proof hash: \`${result.proof_hash}\`
- Metadata pointer updates: ${result.metadata_pointer_update_count}
- DB writes performed: ${result.db_writes_performed}
- Storage writes performed: ${result.storage_writes_performed}
- Migrations created: ${result.migrations_created}
- Exact image claim changes performed: ${result.exact_image_claim_changes_performed}
- Runtime public URL field writes performed: ${result.runtime_public_url_field_writes_performed}
- Preserved columns: ${result.preserved_columns.join(', ')}
`;
}

async function main() {
  const args = parseArgs(process.argv);
  const wh04dSummary = await readJson(WH04D_SUMMARY_JSON);
  const wh04dPlanRows = await readJsonl(WH04D_PLAN_JSONL);
  const updates = buildUpdates(wh04dSummary, wh04dPlanRows);
  const plan = buildPlan(args, wh04dSummary, updates);

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
      ready_for_apply: plan.ready_for_apply,
      stop_findings: plan.stop_findings,
      metadata_pointer_update_count: plan.metadata_pointer_update_count,
      preserved_columns: plan.preserved_columns,
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
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
