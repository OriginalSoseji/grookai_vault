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
  computePointerPlanHash,
  createDataClient,
  createStorageClient,
  inspectStorageAsset,
  mapLimit,
  proofHash,
  readJson,
  readJsonl,
  targetBindingFromEnvironment,
  targetBindingsEqual,
  validateManifestSemantics,
  writeJsonl,
} from './self_hosted_images_wh23_common.mjs';

dotenv.config({ path: process.env.IMG_HOST_ENV_FILE ?? '.env.local', quiet: true });
dotenv.config({ quiet: true });

const PACKAGE_ID = 'IMG-HOST-WH-23C-POCKET-NATIVE-DB-POINTER-DRY-RUN';
const SOURCE_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh23a_pocket_native_upload_dry_run_summary_v1.json');
const ASSET_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh23a_pocket_native_asset_manifest_v1.jsonl');
const ROW_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh23a_pocket_native_row_manifest_v1.jsonl');
const PLAN_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh23c_pocket_native_db_pointer_plan_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh23c_pocket_native_db_pointer_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh23c_pocket_native_db_pointer_dry_run_summary_v1.md');

async function fetchCurrentRows(ids) {
  const client = createDataClient();
  const { data, error } = await client.from('card_prints').select('*').in('id', ids).order('gv_id');
  if (error) throw new Error(`current_snapshot_read_failed:${error.message}`);
  return data ?? [];
}

async function inspectAllStorage(assetRows) {
  const supabase = createStorageClient();
  return mapLimit(assetRows, FETCH_CONCURRENCY, async (asset) => {
    try {
      const inspection = await inspectStorageAsset(supabase, asset);
      return { asset_id: asset.asset_id, ...inspection };
    } catch (error) {
      return { asset_id: asset.asset_id, exists: false, valid: false, observation: null, errors: [`inspection_exception:${error instanceof Error ? error.message : String(error)}`] };
    }
  });
}

function buildPointerRows(rowRows, currentRows, storageRows) {
  const currentById = new Map(currentRows.map((row) => [row.id, row]));
  const storageByAsset = new Map(storageRows.map((row) => [row.asset_id, row]));
  return rowRows.map((manifest) => {
    const current = currentById.get(manifest.target_row_id) ?? null;
    const currentHash = current ? proofHash(current) : null;
    const before = currentHash === manifest.current_row_snapshot_hash;
    const after = currentHash === manifest.expected_after_snapshot_hash;
    const storage = storageByAsset.get(manifest.asset_id) ?? null;
    const validationErrors = [];
    if (!current) validationErrors.push('current_row_missing');
    else if (!before && !after) validationErrors.push('complete_row_snapshot_drift');
    return {
      package_id: PACKAGE_ID,
      plan_type: 'complete_row_compare_and_swap_after_storage_phase',
      target_table: 'card_prints',
      target_row_id: manifest.target_row_id,
      gv_id: manifest.gv_id,
      name: manifest.name,
      number: manifest.number,
      set_code: manifest.set_code,
      set_id: manifest.set_id,
      identity_domain: manifest.identity_domain,
      asset_id: manifest.asset_id,
      target_storage_bucket: manifest.target_storage_bucket,
      target_storage_path: manifest.target_storage_path,
      manifest_before_snapshot_hash: manifest.current_row_snapshot_hash,
      manifest_after_snapshot_hash: manifest.expected_after_snapshot_hash,
      current_snapshot_hash: currentHash,
      current_matches_manifest_before: before,
      current_matches_manifest_after: after,
      row_disposition: after ? 'already_applied_no_op' : (before ? 'guarded_pointer_update_required' : 'blocked_row_drift'),
      proposed_values: manifest.proposed_values,
      allowed_apply_columns: ALLOWED_APPLY_COLUMNS,
      storage_currently_exists: storage?.exists === true,
      storage_currently_verified: storage?.valid === true,
      storage_validation_errors: storage?.errors ?? ['storage_observation_missing'],
      storage_precondition: 'must be exact and is reverified by WH23D before any database transaction',
      validation_errors: validationErrors,
      db_write_performed: false,
      storage_write_performed: false,
    };
  });
}

async function main() {
  const [sourceSummary, assetRows, rowRows, codeBundle] = await Promise.all([
    readJson(SOURCE_SUMMARY_JSON),
    readJsonl(ASSET_MANIFEST_JSONL),
    readJsonl(ROW_MANIFEST_JSONL),
    computeCodeBundleHash(),
  ]);
  const [targetBinding, currentRows, storageRows] = await Promise.all([
    targetBindingFromEnvironment(),
    fetchCurrentRows(rowRows.map((row) => row.target_row_id)),
    inspectAllStorage(assetRows),
  ]);
  const fingerprint = computeManifestFingerprint(assetRows, rowRows, targetBinding, codeBundle.hash);
  const pointerRows = buildPointerRows(rowRows, currentRows, storageRows).sort((a, b) => Number(a.number) - Number(b.number));
  const pointerPlanHash = computePointerPlanHash(fingerprint, targetBinding, codeBundle.hash, pointerRows);
  const mutationContractHash = proofHash(POINTER_MUTATION_CONTRACT);
  const semanticErrors = validateManifestSemantics(assetRows, rowRows, targetBinding);
  const driftRows = pointerRows.filter((row) => row.validation_errors.length);
  const effective = pointerRows.filter((row) => row.row_disposition === 'guarded_pointer_update_required');
  const noOps = pointerRows.filter((row) => row.row_disposition === 'already_applied_no_op');
  const verifiedStorage = storageRows.filter((row) => row.valid);
  const invalidCollisions = storageRows.filter((row) => row.exists && !row.valid);
  const stopFindings = [
    ...(sourceSummary.fingerprint !== fingerprint ? ['source_manifest_fingerprint_mismatch'] : []),
    ...(!targetBindingsEqual(sourceSummary.target_binding, targetBinding) ? ['target_binding_mismatch'] : []),
    ...(sourceSummary.code_bundle_hash !== codeBundle.hash ? ['code_bundle_hash_mismatch'] : []),
    ...(rowRows.length !== 27 || assetRows.length !== 27 || pointerRows.length !== 27 ? ['scope_not_exactly_27'] : []),
    ...(driftRows.length ? ['complete_row_snapshot_drift'] : []),
    ...(invalidCollisions.length ? ['storage_integrity_collision'] : []),
    ...(semanticErrors.length ? ['manifest_semantic_failure'] : []),
  ];
  const readyAfterStorage = stopFindings.length === 0 && effective.length + noOps.length === 27;
  const summary = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    fingerprint,
    pointer_plan_hash: pointerPlanHash,
    mutation_contract_hash: mutationContractHash,
    target_binding: targetBinding,
    code_bundle_hash: codeBundle.hash,
    parent_row_mappings: pointerRows.length,
    unique_assets: assetRows.length,
    complete_row_cas_updates: effective.length,
    already_applied_no_ops: noOps.length,
    complete_row_snapshot_drift: driftRows.length,
    verified_storage_assets_now: verifiedStorage.length,
    pending_storage_assets: storageRows.filter((row) => !row.exists).length,
    invalid_storage_collisions: invalidCollisions.length,
    storage_sequence_note: 'Pending objects are expected before WH23B; WH23D revalidates all 27 exact objects before BEGIN.',
    mutation_contract: POINTER_MUTATION_CONTRACT,
    planned_columns: ALLOWED_APPLY_COLUMNS.map((column) => `card_prints.${column}`),
    preserved_columns: ['all card_prints columns outside the four proposed fields'],
    stop_findings: stopFindings,
    semantic_validation_errors: semanticErrors,
    ready_for_db_apply_after_storage_phase: readyAfterStorage,
    ready_for_db_apply_now: readyAfterStorage && verifiedStorage.length === 27,
    storage_writes_performed: false,
    db_writes_performed: false,
    migrations_created: false,
  };
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await writeJsonl(PLAN_JSONL, pointerRows);
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, `# ${PACKAGE_ID}\n\n- Mode: dry-run/no-write\n- Approval fingerprint: \`${fingerprint}\`\n- Pointer plan hash: \`${pointerPlanHash}\`\n- Mutation contract hash: \`${mutationContractHash}\`\n- Complete-row CAS updates: ${effective.length}\n- Current verified storage: ${verifiedStorage.length} / 27\n- Ready after WH23B storage phase: ${summary.ready_for_db_apply_after_storage_phase}\n- Ready right now: ${summary.ready_for_db_apply_now}\n- Stop findings: ${stopFindings.length ? stopFindings.join(', ') : 'none'}\n- Database writes performed: false\n- Storage writes performed: false\n- Migrations created: false\n\nMissing storage before WH23B is a sequenced precondition, not permission to weaken the database guard. WH23D must verify all 27 content hashes and dimensions before opening its single 27-row transaction.\n`, 'utf8');
  console.log(JSON.stringify({ package_id: PACKAGE_ID, mode: summary.mode, fingerprint, pointer_plan_hash: pointerPlanHash, mutation_contract_hash: mutationContractHash, complete_row_cas_updates: effective.length, verified_storage_assets_now: verifiedStorage.length, pending_storage_assets: summary.pending_storage_assets, ready_for_db_apply_after_storage_phase: summary.ready_for_db_apply_after_storage_phase, ready_for_db_apply_now: summary.ready_for_db_apply_now, stop_findings: stopFindings, summary_json: path.relative(ROOT, SUMMARY_JSON) }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
