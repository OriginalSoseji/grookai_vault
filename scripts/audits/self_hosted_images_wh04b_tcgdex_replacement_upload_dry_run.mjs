import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const SOURCE_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh04a_tcgdex_failed_replacement_source_audit_v1.jsonl');
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh04b_tcgdex_replacement_upload_manifest_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh04b_tcgdex_replacement_upload_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh04b_tcgdex_replacement_upload_dry_run_summary_v1.md');
const PACKAGE_ID = 'IMG-HOST-WH-04B-TCGDEX-REPLACEMENT-UPLOAD-DRY-RUN';
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

function isApplyReadyReplacement(row) {
  return row.replacement_found === true
    && row.is_tcg_pocket !== true
    && clean(row.proposed_url)
    && clean(row.proposed_storage_path)
    && clean(row.proposed_sha256)
    && row.exact_image_claim_change === false;
}

function proposedDbPlan(row) {
  const representativeOnly = row.proposed_display_image_kind === 'representative';
  const base = {
    target_table: row.source_table,
    target_row_id: row.source_row_id,
    source_field_name: row.field_name,
    original_failed_url: row.original_failed_url,
    proposed_image_source: row.proposed_image_source,
    proposed_image_path: row.proposed_storage_path,
    proposed_image_status: row.proposed_image_status,
    proposed_image_note: representativeOnly
      ? `Self-hosted representative replacement planned by ${PACKAGE_ID}; exact image claim is not changed.`
      : `Self-hosted exact replacement planned by ${PACKAGE_ID}; source URL repaired or source-backed. Exact claim preserved from source audit.`,
    exact_image_claim_change: false,
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
    allowed_future_columns: representativeOnly
      ? ['representative_image_url', 'image_source', 'image_status', 'image_note']
      : ['image_source', 'image_path', 'image_status', 'image_note'],
    blocked_future_columns: ['id', 'gv_id', 'name', 'set_code', 'number', 'image_url', 'image_alt_url'],
    parent_overwrite_allowed: row.source_table === 'card_prints' && !representativeOnly,
  };
}

function manifestRow(row) {
  return {
    package_id: PACKAGE_ID,
    source_audit_package_id: row.package_id,
    source_audit_key: row.audit_key,
    source_table: row.source_table,
    source_row_id: row.source_row_id,
    card_print_id: row.card_print_id,
    card_printing_id: row.card_printing_id,
    gv_id: row.gv_id,
    printing_gv_id: row.printing_gv_id,
    name: row.name,
    set_code: row.set_code,
    number: row.number,
    source_field_name: row.field_name,
    replacement_route: row.replacement_route,
    replacement_confidence: row.replacement_confidence,
    proposed_image_source: row.proposed_image_source,
    proposed_image_status: row.proposed_image_status,
    proposed_display_image_kind: row.proposed_display_image_kind,
    source_url: row.proposed_url,
    source_final_url: row.proposed_final_url,
    source_content_type: row.proposed_content_type,
    source_size_bytes: row.proposed_size_bytes,
    source_sha256: row.proposed_sha256,
    source_dimensions: row.proposed_dimensions,
    target_storage_bucket: STORAGE_BUCKET,
    target_storage_path: row.proposed_storage_path,
    upload_performed: false,
    db_write_performed: false,
    exact_image_claim_change: false,
    excluded_tcg_pocket: false,
    proposed_db_plan: proposedDbPlan(row),
  };
}

function fieldPriority(value) {
  const normalized = clean(value);
  if (normalized === 'image_path') return 1;
  if (normalized === 'image_url') return 2;
  if (normalized === 'image_alt_url') return 3;
  if (normalized === 'representative_image_url') return 4;
  return 99;
}

function displayKindPriority(value) {
  const normalized = clean(value);
  if (normalized === 'exact') return 1;
  if (normalized === 'representative') return 2;
  return 99;
}

function dedupeApplyReadyRows(rows) {
  const chosen = new Map();
  const sorted = [...rows].sort((left, right) =>
    displayKindPriority(left.proposed_display_image_kind) - displayKindPriority(right.proposed_display_image_kind)
    || fieldPriority(left.field_name) - fieldPriority(right.field_name)
    || String(left.proposed_storage_path ?? '').localeCompare(String(right.proposed_storage_path ?? ''))
    || String(left.audit_key ?? '').localeCompare(String(right.audit_key ?? '')));

  for (const row of sorted) {
    const key = `${row.source_table}:${row.source_row_id}:${row.proposed_display_image_kind}`;
    if (!chosen.has(key)) {
      chosen.set(key, row);
    }
  }
  return [...chosen.values()];
}

function duplicateGroups(rows, keyFn) {
  const buckets = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    const bucket = buckets.get(key) ?? [];
    bucket.push(row);
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .filter(([, bucket]) => bucket.length > 1)
    .map(([key, bucket]) => ({ key, count: bucket.length, rows: bucket.slice(0, 20) }));
}

async function main() {
  const sourceRows = await readJsonl(SOURCE_JSONL);
  const excludedTcgPocketRows = sourceRows.filter((row) => row.replacement_found === true && row.is_tcg_pocket === true);
  const rawCandidates = sourceRows.filter(isApplyReadyReplacement);
  const candidates = dedupeApplyReadyRows(rawCandidates);
  const manifestRows = candidates.map(manifestRow);
  await fs.writeFile(MANIFEST_JSONL, manifestRows.map((row) => JSON.stringify(row)).join('\n') + (manifestRows.length ? '\n' : ''));

  const duplicateTargetPaths = duplicateGroups(manifestRows, (row) => row.target_storage_path);
  const conflictingTargetPaths = duplicateTargetPaths.filter((group) => {
    const hashes = new Set(group.rows.map((row) => row.source_sha256));
    return hashes.size > 1;
  });
  const duplicateTargetRows = duplicateGroups(manifestRows, (row) => `${row.source_table}:${row.source_row_id}:${row.proposed_display_image_kind}`);
  const stopFindings = [];
  if (conflictingTargetPaths.length > 0) stopFindings.push('conflicting_duplicate_target_storage_paths');
  if (duplicateTargetRows.length > 0) stopFindings.push('duplicate_target_rows');

  const summaryBase = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_upload_manifest_dry_run',
    source_result_jsonl: path.relative(ROOT, SOURCE_JSONL),
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    target_storage_bucket: STORAGE_BUCKET,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    exact_image_claim_changes_performed: false,
    source_replacement_rows: sourceRows.length,
    raw_apply_ready_replacement_rows: rawCandidates.length,
    deduped_replacement_rows: rawCandidates.length - candidates.length,
    apply_ready_manifest_rows: manifestRows.length,
    excluded_tcg_pocket_review_rows: excludedTcgPocketRows.length,
    duplicate_target_path_groups: duplicateTargetPaths.length,
    conflicting_target_path_groups: conflictingTargetPaths.length,
    duplicate_target_row_groups: duplicateTargetRows.length,
    stop_findings: stopFindings,
    ready_for_upload_apply: stopFindings.length === 0,
    by_replacement_route: countBy(manifestRows, (row) => row.replacement_route),
    by_replacement_confidence: countBy(manifestRows, (row) => row.replacement_confidence),
    by_display_image_kind: countBy(manifestRows, (row) => row.proposed_display_image_kind),
    by_source_table: countBy(manifestRows, (row) => row.source_table),
    by_set_code_top: topEntries(countBy(manifestRows, (row) => row.set_code ?? 'unknown'), 30),
    representative_only_sets_top: topEntries(
      countBy(manifestRows.filter((row) => row.proposed_display_image_kind === 'representative'), (row) => row.set_code ?? 'unknown'),
      30,
    ),
  };
  const summary = {
    ...summaryBase,
    proof_hash: proofHash(summaryBase),
  };

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`);
  await fs.writeFile(SUMMARY_MD, [
    `# ${PACKAGE_ID}`,
    '',
    `- Generated: ${summary.generated_at}`,
    '- Mode: read_only_upload_manifest_dry_run',
    `- Proof hash: \`${summary.proof_hash}\``,
    `- Source JSONL: \`${summary.source_result_jsonl}\``,
    `- Manifest JSONL: \`${summary.manifest_jsonl}\``,
    `- Target storage bucket: \`${summary.target_storage_bucket}\``,
    '- DB writes performed: false',
    '- Storage uploads performed: false',
    '- Migrations created: false',
    '- Exact image claim changes performed: false',
    '',
    '## Counts',
    '',
    `- Source replacement rows: ${summary.source_replacement_rows}`,
    `- Raw apply-ready replacement rows: ${summary.raw_apply_ready_replacement_rows}`,
    `- Deduped replacement rows: ${summary.deduped_replacement_rows}`,
    `- Apply-ready manifest rows: ${summary.apply_ready_manifest_rows}`,
    `- Excluded TCG Pocket review rows: ${summary.excluded_tcg_pocket_review_rows}`,
    `- Duplicate target path groups: ${summary.duplicate_target_path_groups}`,
    `- Conflicting target path groups: ${summary.conflicting_target_path_groups}`,
    `- Duplicate target row groups: ${summary.duplicate_target_row_groups}`,
    `- Ready for upload apply: ${summary.ready_for_upload_apply}`,
    '',
    '## By Replacement Route',
    '',
    markdownTable(topEntries(summary.by_replacement_route, 30)),
    '',
    '## By Confidence',
    '',
    markdownTable(topEntries(summary.by_replacement_confidence, 30)),
    '',
    '## By Display Image Kind',
    '',
    markdownTable(topEntries(summary.by_display_image_kind, 30)),
    '',
    '## Top Sets',
    '',
    markdownTable(summary.by_set_code_top),
    '',
    '## Representative-Only Sets',
    '',
    markdownTable(summary.representative_only_sets_top),
    '',
    '## Policy',
    '',
    '- Read-only upload manifest dry-run.',
    '- No uploads, database writes, migrations, deletes, merges, identity writes, price writes, or exact-image claim changes.',
    '- TCG Pocket candidates are explicitly excluded from this English physical replacement apply lane.',
    '- Representative-only rows must remain representative in later DB updates; they cannot be promoted to exact image claims.',
  ].join('\n'));

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    proof_hash: summary.proof_hash,
    apply_ready_manifest_rows: summary.apply_ready_manifest_rows,
    excluded_tcg_pocket_review_rows: summary.excluded_tcg_pocket_review_rows,
    ready_for_upload_apply: summary.ready_for_upload_apply,
    stop_findings: summary.stop_findings,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
