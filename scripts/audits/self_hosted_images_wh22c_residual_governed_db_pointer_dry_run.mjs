import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import {
  ALLOWED_APPLY_COLUMNS,
  FETCH_CONCURRENCY,
  OUTPUT_DIR,
  POINTER_MUTATION_CONTRACT,
  ROOT,
  computeCodeBundleHash,
  computeManifestFingerprint,
  countBy,
  createDataClient,
  createStorageClient,
  inspectStorageAsset,
  mapLimit,
  markdownTable,
  proofHash,
  readJson,
  readJsonl,
  targetBindingFromEnvironment,
  targetBindingsEqual,
  validateManifestSemantics,
  writeJsonl,
} from './self_hosted_images_wh22_common.mjs';

dotenv.config({ path: process.env.IMG_HOST_ENV_FILE ?? '.env.local', quiet: true });
dotenv.config({ quiet: true });

const PACKAGE_ID = 'IMG-HOST-WH-22C-RESIDUAL-GOVERNED-DB-POINTER-DRY-RUN';
const SOURCE_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh22a_residual_governed_upload_dry_run_summary_v1.json');
const ASSET_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh22a_residual_governed_asset_manifest_v1.jsonl');
const ROW_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh22a_residual_governed_row_manifest_v1.jsonl');
const PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh22c_residual_governed_db_pointer_plan_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh22c_residual_governed_db_pointer_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh22c_residual_governed_db_pointer_dry_run_summary_v1.md');

async function fetchCurrentSnapshots(ids) {
  const client = createDataClient();
  const { data, error } = await client.from('card_prints').select('*').in('id', ids).order('gv_id');
  if (error) throw new Error(`card_prints_current_snapshot_read_failed:${error.message}`);
  return data ?? [];
}

async function verifyStorage(assetRows) {
  const supabase = createStorageClient();
  return mapLimit(assetRows, FETCH_CONCURRENCY, async (asset) => {
    try {
      const inspection = await inspectStorageAsset(supabase, { ...asset, expected: asset.source_expected });
      return {
        asset_id: asset.asset_id,
        target_storage_bucket: asset.target_storage_bucket,
        target_storage_path: asset.target_storage_path,
        exists: inspection.exists,
        valid: inspection.valid,
        observation: inspection.observation,
        errors: inspection.errors,
      };
    } catch (error) {
      return {
        asset_id: asset.asset_id,
        target_storage_bucket: asset.target_storage_bucket,
        target_storage_path: asset.target_storage_path,
        exists: false,
        valid: false,
        observation: null,
        errors: [`storage_inspection_exception:${error instanceof Error ? error.message : String(error)}`],
      };
    }
  });
}

function buildPointerPlans(rowRows, currentSnapshots, storageByAsset) {
  const currentById = new Map(currentSnapshots.map((row) => [row.id, row]));
  return rowRows.map((manifestRow) => {
    const current = currentById.get(manifestRow.target_row_id) ?? null;
    const currentHash = current ? proofHash(current) : null;
    const beforeMatch = currentHash === manifestRow.current_row_snapshot_hash;
    const afterMatch = currentHash === manifestRow.expected_after_snapshot_hash;
    const storage = storageByAsset.get(manifestRow.asset_id) ?? null;
    const errors = [];
    if (!current) errors.push('current_row_missing');
    else if (!beforeMatch && !afterMatch) errors.push('full_current_row_snapshot_drift');
    if (!storage?.exists) errors.push('storage_object_missing');
    else if (!storage.valid) errors.push('storage_object_integrity_mismatch');
    return {
      package_id: PACKAGE_ID,
      plan_type: 'full_snapshot_compare_and_swap_pointer_repoint',
      target_table: 'card_prints',
      target_row_id: manifestRow.target_row_id,
      gv_id: manifestRow.gv_id,
      name: manifestRow.name,
      set_code: manifestRow.set_code,
      number: manifestRow.number,
      asset_id: manifestRow.asset_id,
      image_claim_role: manifestRow.image_claim_role,
      target_storage_bucket: manifestRow.target_storage_bucket,
      target_storage_path: manifestRow.target_storage_path,
      manifest_before_snapshot_hash: manifestRow.current_row_snapshot_hash,
      manifest_after_snapshot_hash: manifestRow.expected_after_snapshot_hash,
      current_snapshot_hash: currentHash,
      current_matches_manifest_before: beforeMatch,
      current_matches_manifest_after: afterMatch,
      row_disposition: afterMatch ? 'already_applied_no_op' : (beforeMatch ? 'guarded_pointer_update_required' : 'blocked_row_drift'),
      proposed_values: manifestRow.proposed_values,
      verified_fallback_url: manifestRow.verified_fallback_url,
      fallback_column_assessment: manifestRow.fallback_column_assessment,
      fallback_field: manifestRow.fallback_field,
      fallback_column_write_in_wh22: true,
      allowed_apply_columns: ALLOWED_APPLY_COLUMNS,
      changed_columns: manifestRow.changed_columns,
      preserved_columns: manifestRow.preserved_columns,
      storage_verified: storage?.valid === true,
      validation_errors: errors,
      db_write_performed: false,
      storage_write_performed: false,
    };
  });
}

function renderSummaryMarkdown(summary) {
  return `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Approval fingerprint: \`${summary.fingerprint}\`
- Pointer plan hash: \`${summary.pointer_plan_hash}\`
- Mutation contract hash: \`${summary.mutation_contract_hash}\`
- Parent-row mappings: ${summary.parent_row_mappings}
- Verified storage assets: ${summary.verified_storage_assets} / ${summary.unique_assets}
- Missing storage assets: ${summary.missing_storage_assets}
- Effective guarded pointer updates: ${summary.effective_guarded_pointer_updates}
- Already-applied no-ops: ${summary.already_applied_no_ops}
- Full-row snapshot drift: ${summary.full_row_snapshot_drift}
- Ready for database apply: ${summary.ready_for_db_apply}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- Planned columns: ${summary.planned_columns.join(', ')}
- Preserved columns: ${summary.preserved_columns.join(', ')}
- Fallback column write in WH22: ${summary.fallback_column_write_in_wh22}
- Database writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}

## Row disposition

${markdownTable(Object.entries(summary.by_row_disposition).map(([disposition, count]) => ({ disposition, count })))}

The dry run compares the complete current \`card_prints\` row with the immutable before/after snapshots. Apply bootstraps the pinned Supabase certificate chain without sending credentials, reconnects with \`rejectUnauthorized: true\`, then locks and updates all 24 rows in one compare-and-swap transaction with full readback before commit.
`;
}

async function main() {
  const sourceSummary = await readJson(SOURCE_SUMMARY_JSON);
  const assetRows = await readJsonl(ASSET_MANIFEST_JSONL);
  const rowRows = await readJsonl(ROW_MANIFEST_JSONL);
  const targetBinding = await targetBindingFromEnvironment();
  const codeBundle = await computeCodeBundleHash();
  const recomputedFingerprint = computeManifestFingerprint(assetRows, rowRows, targetBinding, codeBundle.hash);
  const semanticErrors = validateManifestSemantics(assetRows, rowRows, targetBinding);
  const storageRows = await verifyStorage(assetRows);
  const currentSnapshots = await fetchCurrentSnapshots(rowRows.map((row) => row.target_row_id));
  const storageByAsset = new Map(storageRows.map((row) => [row.asset_id, row]));
  const pointerPlans = buildPointerPlans(rowRows, currentSnapshots, storageByAsset)
    .sort((left, right) => left.gv_id.localeCompare(right.gv_id));
  const pointerPlanHash = proofHash({
    package_id: PACKAGE_ID,
    fingerprint: recomputedFingerprint,
    target_binding: targetBinding,
    code_bundle_hash: codeBundle.hash,
    mutation_contract: POINTER_MUTATION_CONTRACT,
    allowed_apply_columns: ALLOWED_APPLY_COLUMNS,
    rows: pointerPlans.map((row) => ({
      target_row_id: row.target_row_id,
      gv_id: row.gv_id,
      asset_id: row.asset_id,
      manifest_before_snapshot_hash: row.manifest_before_snapshot_hash,
      manifest_after_snapshot_hash: row.manifest_after_snapshot_hash,
      proposed_values: row.proposed_values,
      target_storage_bucket: row.target_storage_bucket,
      target_storage_path: row.target_storage_path,
    })),
  });
  const missingStorage = storageRows.filter((row) => !row.exists);
  const invalidStorage = storageRows.filter((row) => row.exists && !row.valid);
  const driftRows = pointerPlans.filter((row) => row.row_disposition === 'blocked_row_drift');
  const missingRows = rowRows.length - currentSnapshots.length;
  const effective = pointerPlans.filter((row) => row.row_disposition === 'guarded_pointer_update_required');
  const noOps = pointerPlans.filter((row) => row.row_disposition === 'already_applied_no_op');
  const stopFindings = [
    ...(sourceSummary.fingerprint !== recomputedFingerprint ? ['source_manifest_fingerprint_mismatch'] : []),
    ...(!targetBindingsEqual(sourceSummary.target_binding, targetBinding) ? ['target_binding_mismatch'] : []),
    ...(sourceSummary.code_bundle_hash !== codeBundle.hash ? ['code_bundle_hash_mismatch'] : []),
    ...(semanticErrors.length ? ['manifest_semantic_validation_failures'] : []),
    ...(rowRows.length !== 24 ? ['row_manifest_count_not_24'] : []),
    ...(assetRows.length !== 21 ? ['asset_manifest_count_not_21'] : []),
    ...(missingStorage.length ? ['missing_storage_objects'] : []),
    ...(invalidStorage.length ? ['storage_object_integrity_failures'] : []),
    ...(missingRows ? ['missing_current_db_rows'] : []),
    ...(driftRows.length ? ['full_current_row_snapshot_drift'] : []),
    ...(pointerPlans.some((row) => row.fallback_column_write_in_wh22 !== true) ? ['fallback_column_scope_drift'] : []),
  ];
  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    fingerprint: recomputedFingerprint,
    target_binding: targetBinding,
    code_bundle_hash: codeBundle.hash,
    pointer_plan_hash: pointerPlanHash,
    mutation_contract_hash: proofHash(POINTER_MUTATION_CONTRACT),
    source_summary_json: path.relative(ROOT, SOURCE_SUMMARY_JSON),
    asset_manifest_jsonl: path.relative(ROOT, ASSET_MANIFEST_JSONL),
    row_manifest_jsonl: path.relative(ROOT, ROW_MANIFEST_JSONL),
    pointer_plan_jsonl: path.relative(ROOT, PLAN_JSONL),
    parent_row_mappings: rowRows.length,
    unique_assets: assetRows.length,
    verified_storage_assets: storageRows.filter((row) => row.valid).length,
    missing_storage_assets: missingStorage.length,
    invalid_storage_assets: invalidStorage.length,
    effective_guarded_pointer_updates: effective.length,
    already_applied_no_ops: noOps.length,
    full_row_snapshot_drift: driftRows.length,
    missing_current_db_rows: missingRows,
    by_row_disposition: countBy(pointerPlans, (row) => row.row_disposition),
    planned_columns: ALLOWED_APPLY_COLUMNS.map((column) => `card_prints.${column}`),
    preserved_columns: [
      'card_prints.image_note',
      'card_prints.image_alt_url',
      'all other card_prints columns',
    ],
    fallback_column_write_in_wh22: true,
    semantic_validation_errors: semanticErrors,
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    stop_findings: stopFindings,
    ready_for_db_apply: stopFindings.length === 0 && effective.length + noOps.length === 24,
    storage_failures: storageRows.filter((row) => !row.valid),
    drift_rows: driftRows.map((row) => ({ gv_id: row.gv_id, current_snapshot_hash: row.current_snapshot_hash })),
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await writeJsonl(PLAN_JSONL, pointerPlans);
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, renderSummaryMarkdown(summary), 'utf8');
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    fingerprint: summary.fingerprint,
    pointer_plan_hash: summary.pointer_plan_hash,
    mutation_contract_hash: summary.mutation_contract_hash,
    parent_row_mappings: summary.parent_row_mappings,
    verified_storage_assets: summary.verified_storage_assets,
    missing_storage_assets: summary.missing_storage_assets,
    effective_guarded_pointer_updates: summary.effective_guarded_pointer_updates,
    already_applied_no_ops: summary.already_applied_no_ops,
    full_row_snapshot_drift: summary.full_row_snapshot_drift,
    ready_for_db_apply: summary.ready_for_db_apply,
    stop_findings: summary.stop_findings,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
