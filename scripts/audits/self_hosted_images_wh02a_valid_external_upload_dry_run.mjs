import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const SOURCE_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh01a_results_v1.jsonl');
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh02a_valid_external_upload_manifest_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh02a_valid_external_upload_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh02a_valid_external_upload_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-02A-VALID-EXTERNAL-UPLOAD-DRY-RUN';
const STORAGE_BUCKET = process.env.SELF_HOSTED_IMAGES_STORAGE_BUCKET ?? 'user-card-images';

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

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
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

async function readJsonl(file) {
  const raw = await fs.readFile(file, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function isExternalValidatedUploadCandidate(row) {
  return row.fetch_ok === true
    && row.proposed_storage_path
    && !['supabase_storage_path', 'supabase_public_url'].includes(row.source_lane);
}

function proposedDbPlan(row) {
  const base = {
    target_table: row.source_table,
    target_row_id: row.source_row_id,
    current_field_name: row.field_name,
    current_image_value: row.raw_image_value,
    proposed_image_source: 'identity',
    proposed_image_path: row.proposed_storage_path,
    proposed_image_status: row.image_status ?? 'exact',
    proposed_image_note: `Self-hosted copy planned by ${PACKAGE_ID}; original source preserved in dry-run manifest.`,
  };

  if (row.source_table === 'card_printings') {
    return {
      ...base,
      allowed_future_columns: ['image_source', 'image_path', 'image_status', 'image_note'],
      blocked_future_columns: ['card_print_id', 'printing_gv_id', 'finish_key', 'image_url', 'image_alt_url'],
      parent_overwrite_allowed: false,
    };
  }

  return {
    ...base,
    allowed_future_columns: row.field_name === 'representative_image_url'
      ? ['representative_image_url', 'image_source', 'image_status', 'image_note']
      : ['image_source', 'image_path', 'image_status', 'image_note'],
    blocked_future_columns: ['id', 'gv_id', 'name', 'set_code', 'number', 'image_url', 'image_alt_url'],
    parent_overwrite_allowed: row.source_table === 'card_prints',
  };
}

function toManifestRow(row) {
  const exactness = row.image_status === 'exact' || row.field_name === 'image_url'
    ? 'preserve_current_status'
    : row.field_name === 'representative_image_url'
      ? 'representative_preserved'
      : 'preserve_current_status';

  return {
    package_id: PACKAGE_ID,
    audit_key: row.audit_key,
    source_table: row.source_table,
    source_row_id: row.source_row_id,
    card_print_id: row.card_print_id,
    card_printing_id: row.card_printing_id,
    gv_id: row.gv_id,
    printing_gv_id: row.printing_gv_id,
    name: row.name,
    set_code: row.set_code,
    number: row.number,
    source_lane: row.source_lane,
    source_field_name: row.field_name,
    source_image_value: row.raw_image_value,
    source_final_url: row.final_url ?? row.resolved_url,
    source_content_type: row.content_type,
    source_size_bytes: row.size_bytes,
    source_sha256: row.sha256,
    source_dimensions: row.dimensions,
    target_storage_bucket: STORAGE_BUCKET,
    target_storage_path: row.proposed_storage_path,
    target_object_exists_probe_performed: false,
    upload_performed: false,
    db_write_performed: false,
    exact_image_claim_change: false,
    image_truth_handling: exactness,
    proposed_db_plan: proposedDbPlan(row),
  };
}

function findDuplicateMap(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    const bucket = map.get(key) ?? [];
    bucket.push(row);
    map.set(key, bucket);
  }
  return [...map.entries()]
    .filter(([, bucket]) => bucket.length > 1)
    .map(([key, bucket]) => ({
      key,
      count: bucket.length,
      rows: bucket.slice(0, 20).map((row) => ({
        audit_key: row.audit_key,
        gv_id: row.gv_id,
        printing_gv_id: row.printing_gv_id,
        source_table: row.source_table,
        source_row_id: row.source_row_id,
        source_field_name: row.source_field_name,
      })),
    }));
}

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    const bucket = map.get(key) ?? [];
    bucket.push(row);
    map.set(key, bucket);
  }
  return map;
}

async function main() {
  const sourceRows = await readJsonl(SOURCE_JSONL);
  const candidates = sourceRows.filter(isExternalValidatedUploadCandidate);
  const manifestRows = candidates.map(toManifestRow);
  const targetPathGroups = groupBy(manifestRows, (row) => row.target_storage_path);
  const duplicateTargetPaths = findDuplicateMap(manifestRows, (row) => row.target_storage_path);
  const targetPathConflictGroups = [...targetPathGroups.entries()]
    .map(([key, bucket]) => {
      const integrityKeys = new Set(bucket.map((row) => [
        row.source_sha256,
        row.source_size_bytes,
        row.source_content_type,
      ].join(':')));
      return { key, bucket, integrityKeys };
    })
    .filter((entry) => entry.integrityKeys.size > 1)
    .map((entry) => ({
      key: entry.key,
      count: entry.bucket.length,
      distinct_integrity_values: entry.integrityKeys.size,
      rows: entry.bucket.slice(0, 20).map((row) => ({
        audit_key: row.audit_key,
        gv_id: row.gv_id,
        printing_gv_id: row.printing_gv_id,
        source_table: row.source_table,
        source_row_id: row.source_row_id,
        source_field_name: row.source_field_name,
        source_sha256: row.source_sha256,
        source_size_bytes: row.source_size_bytes,
        source_content_type: row.source_content_type,
      })),
    }));
  const duplicateTargetRows = findDuplicateMap(manifestRows, (row) => `${row.source_table}:${row.source_row_id}:${row.source_field_name}`);
  const duplicateSourceHashes = findDuplicateMap(manifestRows, (row) => row.source_sha256);
  const stopFindings = [];

  if (targetPathConflictGroups.length > 0) stopFindings.push('conflicting_duplicate_target_storage_paths');
  if (duplicateTargetRows.length > 0) stopFindings.push('duplicate_source_row_field_targets');
  if (manifestRows.some((row) => !row.source_sha256 || !row.source_size_bytes || !row.source_dimensions)) {
    stopFindings.push('missing_asset_integrity_metadata');
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(
    MANIFEST_JSONL,
    `${manifestRows.map((row) => JSON.stringify(row)).join('\n')}\n`,
    'utf8',
  );

  const bySourceLane = countBy(manifestRows, (row) => row.source_lane);
  const bySourceTable = countBy(manifestRows, (row) => row.source_table);
  const bySetCode = countBy(manifestRows, (row) => row.set_code);
  const byFieldName = countBy(manifestRows, (row) => row.source_field_name);
  const byContentType = countBy(manifestRows, (row) => row.source_content_type);
  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_upload_manifest_dry_run',
    source_result_jsonl: path.relative(ROOT, SOURCE_JSONL),
    output_manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    source_rows_total: sourceRows.length,
    upload_candidate_rows: manifestRows.length,
    target_storage_bucket: STORAGE_BUCKET,
    unique_upload_object_count: targetPathGroups.size,
    unique_target_storage_paths: new Set(manifestRows.map((row) => row.target_storage_path)).size,
    unique_source_hashes: new Set(manifestRows.map((row) => row.source_sha256)).size,
    duplicate_target_storage_path_reuse_groups: duplicateTargetPaths.length,
    conflicting_duplicate_target_storage_path_groups: targetPathConflictGroups.length,
    duplicate_source_row_field_target_groups: duplicateTargetRows.length,
    duplicate_source_hash_groups: duplicateSourceHashes.length,
    stop_findings: stopFindings,
    ready_for_storage_upload_apply: stopFindings.length === 0,
    by_source_lane: bySourceLane,
    by_source_table: bySourceTable,
    by_field_name: byFieldName,
    by_content_type: byContentType,
    top_sets: topEntries(bySetCode, 50),
    duplicate_target_storage_path_reuse_samples: duplicateTargetPaths.slice(0, 25),
    conflicting_duplicate_target_storage_path_samples: targetPathConflictGroups.slice(0, 25),
    duplicate_source_row_field_target_samples: duplicateTargetRows.slice(0, 25),
    duplicate_source_hash_samples: duplicateSourceHashes.slice(0, 25),
    policy: {
      dry_run_only: true,
      no_db_writes: true,
      no_storage_uploads: true,
      no_parent_overwrites_without_later_approval: true,
      no_exact_image_claim_changes: true,
      no_price_writes: true,
      no_identity_table_writes: true,
      no_deletes: true,
      no_merges: true,
      no_migrations: true,
    },
  };

  summary.proof_hash = proofHash({
    package_id: summary.package_id,
    upload_candidate_rows: summary.upload_candidate_rows,
    unique_upload_object_count: summary.unique_upload_object_count,
    unique_target_storage_paths: summary.unique_target_storage_paths,
    unique_source_hashes: summary.unique_source_hashes,
    duplicate_target_storage_path_reuse_groups: summary.duplicate_target_storage_path_reuse_groups,
    conflicting_duplicate_target_storage_path_groups: summary.conflicting_duplicate_target_storage_path_groups,
    duplicate_source_row_field_target_groups: summary.duplicate_source_row_field_target_groups,
    stop_findings: summary.stop_findings,
    by_source_lane: summary.by_source_lane,
    by_source_table: summary.by_source_table,
    by_field_name: summary.by_field_name,
  });

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Proof hash: \`${summary.proof_hash}\`
- Source result JSONL: \`${summary.source_result_jsonl}\`
- Manifest JSONL: \`${summary.output_manifest_jsonl}\`
- DB writes performed: ${summary.db_writes_performed}
- Storage uploads performed: ${summary.storage_uploads_performed}
- Migrations created: ${summary.migrations_created}
- Ready for storage upload apply: ${summary.ready_for_storage_upload_apply}

## Counts

- Source rows total: ${summary.source_rows_total}
- Upload candidate rows: ${summary.upload_candidate_rows}
- Unique upload objects: ${summary.unique_upload_object_count}
- Unique target storage paths: ${summary.unique_target_storage_paths}
- Unique source hashes: ${summary.unique_source_hashes}
- Duplicate target path reuse groups: ${summary.duplicate_target_storage_path_reuse_groups}
- Conflicting duplicate target path groups: ${summary.conflicting_duplicate_target_storage_path_groups}
- Duplicate source row/field target groups: ${summary.duplicate_source_row_field_target_groups}
- Duplicate source hash groups: ${summary.duplicate_source_hash_groups}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}

## Source Lanes

${markdownTable(topEntries(summary.by_source_lane, 20))}

## Source Tables

${markdownTable(topEntries(summary.by_source_table, 20))}

## Fields

${markdownTable(topEntries(summary.by_field_name, 20))}

## Content Types

${markdownTable(topEntries(summary.by_content_type, 20))}

## Top Sets

${markdownTable(summary.top_sets.slice(0, 30))}

## Policy

- No storage upload was performed.
- No database write was performed.
- No exact image claim was changed.
- No identity, price, delete, merge, or migration operation was performed.
- This manifest is only an upload/readiness plan for currently validated external images.
`, 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    proof_hash: summary.proof_hash,
    upload_candidate_rows: summary.upload_candidate_rows,
    ready_for_storage_upload_apply: summary.ready_for_storage_upload_apply,
    stop_findings: summary.stop_findings,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
