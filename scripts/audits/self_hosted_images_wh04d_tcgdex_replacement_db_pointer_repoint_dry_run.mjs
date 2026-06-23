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
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh04b_tcgdex_replacement_upload_manifest_v1.jsonl');
const UPLOAD_RESULT_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh04c_tcgdex_replacement_storage_upload_apply_result_v1.jsonl');
const PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh04d_tcgdex_replacement_db_pointer_repoint_plan_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh04d_tcgdex_replacement_db_pointer_repoint_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh04d_tcgdex_replacement_db_pointer_repoint_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-04D-TCGDEX-REPLACEMENT-DB-POINTER-REPOINT-DRY-RUN';

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

function topEntries(counts, limit = 30) {
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
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function latestUploadResults(rows) {
  const latest = new Map();
  for (const row of rows) {
    latest.set(`${row.target_storage_bucket}:${row.target_storage_path}`, row);
  }
  return latest;
}

function isCompletedUpload(row) {
  return row?.uploaded === true || row?.status === 'skipped_existing_object';
}

async function fetchCurrentRows(client, ids) {
  if (!ids.length) return new Map();
  const output = new Map();
  for (const batch of chunk(ids, 1000)) {
    const result = await client.query(
      `select id, gv_id, name, set_code, number, image_source, image_path, image_status, image_note
       from public.card_prints
       where id = any($1::uuid[])`,
      [batch],
    );
    for (const row of result.rows) output.set(row.id, row);
  }
  return output;
}

function proposedImageSource(row) {
  return clean(row.target_storage_path) ? 'identity' : null;
}

function upstreamImageSource(row) {
  return clean(row.proposed_db_plan?.proposed_image_source) ?? clean(row.proposed_image_source);
}

function proposedImageNote(row) {
  const planned = clean(row.proposed_db_plan?.proposed_image_note);
  if (planned) return planned;
  return `Self-hosted replacement planned by ${PACKAGE_ID}; exact image claim is not changed.`;
}

function planForManifestRow(row, currentRow) {
  const currentPath = clean(currentRow?.image_path);
  const currentSource = clean(currentRow?.image_source);
  const proposedPath = clean(row.proposed_db_plan?.proposed_image_path) ?? clean(row.target_storage_path);
  const proposedSource = proposedImageSource(row);
  const proposedStatus = clean(row.proposed_db_plan?.proposed_image_status) ?? clean(row.proposed_image_status);
  const currentStatus = clean(currentRow?.image_status);
  const statusClaimWouldChange = Boolean(proposedStatus && currentStatus && proposedStatus !== currentStatus);

  return {
    package_id: PACKAGE_ID,
    plan_type: 'metadata_pointer_repoint',
    audit_key: `${row.source_table}:${row.source_row_id}:metadata_pointer`,
    source_audit_key: row.source_audit_key,
    target_table: 'card_prints',
    target_row_id: row.source_row_id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    number: row.number,
    replacement_route: row.replacement_route,
    replacement_confidence: row.replacement_confidence,
    proposed_display_image_kind: row.proposed_display_image_kind,
    target_storage_bucket: row.target_storage_bucket,
    target_storage_path: row.target_storage_path,
    source_final_url: row.source_final_url,
    source_sha256: row.source_sha256,
    current_values: {
      image_source: currentSource,
      image_path: currentPath,
      image_status: currentStatus,
      image_note: clean(currentRow?.image_note),
    },
    proposed_values: {
      image_source: proposedSource,
      image_path: proposedPath,
      image_status: currentStatus,
      image_note: clean(currentRow?.image_note),
    },
    upstream_source_provenance: upstreamImageSource(row),
    proposed_status_from_source_audit: proposedStatus,
    proposed_note_from_source_audit: proposedImageNote(row),
    image_status_preserved: true,
    image_note_preserved: true,
    exact_image_claim_change: false,
    status_claim_would_change_if_status_updated: statusClaimWouldChange,
    db_write_performed: false,
    storage_write_performed: false,
  };
}

async function main() {
  const manifestRows = await readJsonl(MANIFEST_JSONL);
  const uploadRows = await readJsonl(UPLOAD_RESULT_JSONL);
  const latestUploads = latestUploadResults(uploadRows);
  const completedManifestRows = manifestRows.filter((row) => (
    row.source_table === 'card_prints'
      && isCompletedUpload(latestUploads.get(`${row.target_storage_bucket}:${row.target_storage_path}`))
  ));
  const incompleteManifestRows = manifestRows.filter((row) => (
    row.source_table !== 'card_prints'
      || !isCompletedUpload(latestUploads.get(`${row.target_storage_bucket}:${row.target_storage_path}`))
  ));

  const uniqueRowIds = [...new Set(completedManifestRows.map((row) => row.source_row_id))].sort();
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let currentRows;
  try {
    currentRows = await fetchCurrentRows(client, uniqueRowIds);
  } finally {
    await client.end();
  }

  const plans = completedManifestRows.map((row) => planForManifestRow(row, currentRows.get(row.source_row_id)));
  const missingCurrentRows = plans.filter((row) => !currentRows.has(row.target_row_id));
  const missingProposedPathRows = plans.filter((row) => !clean(row.proposed_values.image_path));
  const missingProposedSourceRows = plans.filter((row) => !clean(row.proposed_values.image_source));
  const statusClaimWouldChangeRows = plans.filter((row) => row.status_claim_would_change_if_status_updated);
  const noOpRows = plans.filter((row) =>
    clean(row.current_values.image_source) === clean(row.proposed_values.image_source)
      && clean(row.current_values.image_path) === clean(row.proposed_values.image_path));

  const stopFindings = [
    ...(incompleteManifestRows.length ? ['incomplete_or_unsupported_manifest_rows'] : []),
    ...(missingCurrentRows.length ? ['missing_current_db_rows'] : []),
    ...(missingProposedPathRows.length ? ['missing_proposed_storage_paths'] : []),
    ...(missingProposedSourceRows.length ? ['missing_proposed_image_sources'] : []),
  ];

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(PLAN_JSONL, plans.map((row) => JSON.stringify(row)).join('\n') + (plans.length ? '\n' : ''), 'utf8');

  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    upload_result_jsonl: path.relative(ROOT, UPLOAD_RESULT_JSONL),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    manifest_rows: manifestRows.length,
    completed_manifest_rows: completedManifestRows.length,
    incomplete_or_unsupported_manifest_rows: incompleteManifestRows.length,
    unique_card_print_rows_in_scope: uniqueRowIds.length,
    metadata_pointer_plan_rows: plans.length,
    no_op_plan_rows: noOpRows.length,
    effective_metadata_pointer_updates: plans.length - noOpRows.length,
    missing_current_db_rows: missingCurrentRows.length,
    missing_proposed_storage_paths: missingProposedPathRows.length,
    missing_proposed_image_sources: missingProposedSourceRows.length,
    status_claim_would_change_if_status_updated: statusClaimWouldChangeRows.length,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    runtime_public_url_field_writes_planned: false,
    preserved_columns: ['image_status', 'image_note'],
    target_tables: countBy(plans, (row) => row.target_table),
    proposed_image_sources: countBy(plans, (row) => row.proposed_values.image_source),
    upstream_source_provenance: countBy(plans, (row) => row.upstream_source_provenance),
    proposed_display_image_kinds: countBy(plans, (row) => row.proposed_display_image_kind),
    replacement_routes: countBy(plans, (row) => row.replacement_route),
    stop_findings: stopFindings,
    ready_for_apply_package: stopFindings.length === 0,
    samples: {
      metadata_pointer_repoint: plans.slice(0, 20),
      status_claim_would_change_if_status_updated: statusClaimWouldChangeRows.slice(0, 20),
      no_op_plan_rows: noOpRows.slice(0, 20),
    },
  };
  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    completed_manifest_rows: summary.completed_manifest_rows,
    unique_card_print_rows_in_scope: summary.unique_card_print_rows_in_scope,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
    preserved_columns: summary.preserved_columns,
    target_tables: summary.target_tables,
    proposed_image_sources: summary.proposed_image_sources,
    upstream_source_provenance: summary.upstream_source_provenance,
    proposed_display_image_kinds: summary.proposed_display_image_kinds,
    plan_rows: plans.map((row) => ({
      target_table: row.target_table,
      target_row_id: row.target_row_id,
      image_source: row.proposed_values.image_source,
      image_path: row.proposed_values.image_path,
      image_status: row.proposed_values.image_status,
      image_note: row.proposed_values.image_note,
    })),
  });

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Manifest rows: ${summary.manifest_rows}
- Completed manifest rows: ${summary.completed_manifest_rows}
- Incomplete or unsupported manifest rows: ${summary.incomplete_or_unsupported_manifest_rows}
- Unique card_print rows in scope: ${summary.unique_card_print_rows_in_scope}
- Metadata pointer plan rows: ${summary.metadata_pointer_plan_rows}
- No-op plan rows: ${summary.no_op_plan_rows}
- Effective metadata pointer updates: ${summary.effective_metadata_pointer_updates}
- Missing current DB rows: ${summary.missing_current_db_rows}
- Missing proposed storage paths: ${summary.missing_proposed_storage_paths}
- Missing proposed image sources: ${summary.missing_proposed_image_sources}
- Status claim would change if status updated: ${summary.status_claim_would_change_if_status_updated}
- Ready for apply package: ${summary.ready_for_apply_package}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- Runtime public URL field writes planned: ${summary.runtime_public_url_field_writes_planned}
- Preserved columns: ${summary.preserved_columns.join(', ')}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}

## Target Tables

${markdownTable(topEntries(summary.target_tables))}

## Proposed Image Sources

${markdownTable(topEntries(summary.proposed_image_sources))}

## Upstream Source Provenance

${markdownTable(topEntries(summary.upstream_source_provenance))}

## Display Image Kinds

${markdownTable(topEntries(summary.proposed_display_image_kinds))}

## Replacement Routes

${markdownTable(topEntries(summary.replacement_routes))}
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    fingerprint: summary.fingerprint,
    ready_for_apply_package: summary.ready_for_apply_package,
    stop_findings: summary.stop_findings,
    effective_metadata_pointer_updates: summary.effective_metadata_pointer_updates,
    preserved_columns: summary.preserved_columns,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
