import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import {
  FETCH_CONCURRENCY,
  OUTPUT_DIR,
  ROOT,
  computeCodeBundleHash,
  computeManifestFingerprint,
  createStorageClient,
  downloadStorageImage,
  fetchPocketImage,
  inspectStorageAsset,
  mapLimit,
  proofHash,
  readJson,
  readJsonl,
  targetBindingFromEnvironment,
  targetBindingsEqual,
  validateManifestSemantics,
  verifyImageObservation,
  writeJsonl,
} from './self_hosted_images_wh23_common.mjs';

dotenv.config({ path: process.env.IMG_HOST_ENV_FILE ?? '.env.local', quiet: true });
dotenv.config({ quiet: true });

const PACKAGE_ID = 'IMG-HOST-WH-23B-POCKET-NATIVE-STORAGE-UPLOAD-APPLY';
const SOURCE_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh23a_pocket_native_upload_dry_run_summary_v1.json');
const ASSET_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh23a_pocket_native_asset_manifest_v1.jsonl');
const ROW_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh23a_pocket_native_row_manifest_v1.jsonl');
const PLAN_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh23b_pocket_native_storage_upload_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh23b_pocket_native_storage_upload_apply_plan_v1.md');
const RESULT_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh23b_pocket_native_storage_upload_apply_result_v1.jsonl');
const RESULT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh23b_pocket_native_storage_upload_apply_result_v1.json');

function parseArgs(argv) {
  const args = { apply: false, fingerprint: null, planHash: null };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--fingerprint') args.fingerprint = argv[++index] ?? null;
    else if (arg === '--plan-hash') args.planHash = argv[++index] ?? null;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function buildPlan(summary, assetRows, rowRows, targetBinding, codeBundle, args) {
  const fingerprint = computeManifestFingerprint(assetRows, rowRows, targetBinding, codeBundle.hash);
  const semanticErrors = validateManifestSemantics(assetRows, rowRows, targetBinding);
  const storagePlanHash = proofHash({
    package_id: PACKAGE_ID,
    fingerprint,
    target_binding: targetBinding,
    code_bundle_hash: codeBundle.hash,
    overwrite_allowed: false,
    storage_upload_option: { upsert: false },
    assets: assetRows.map((asset) => ({
      asset_id: asset.asset_id,
      source_url: asset.source_url,
      source_expected: asset.source_expected,
      target_storage_bucket: asset.target_storage_bucket,
      target_storage_path: asset.target_storage_path,
    })),
  });
  const stopFindings = [
    ...(summary.fingerprint !== fingerprint ? ['source_manifest_fingerprint_mismatch'] : []),
    ...(!targetBindingsEqual(summary.target_binding, targetBinding) ? ['target_binding_mismatch'] : []),
    ...(summary.code_bundle_hash !== codeBundle.hash ? ['code_bundle_hash_mismatch'] : []),
    ...(summary.ready_for_storage_apply !== true ? ['wh23a_not_storage_apply_ready'] : []),
    ...(assetRows.length !== 27 || rowRows.length !== 27 ? ['scope_not_exactly_27'] : []),
    ...(assetRows.some((row) => row.overwrite_allowed !== false) ? ['overwrite_policy_drift'] : []),
    ...(semanticErrors.length ? ['manifest_semantic_failure'] : []),
  ];
  return {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: args.apply ? 'guarded_apply' : 'plan_only',
    fingerprint,
    storage_plan_hash: storagePlanHash,
    target_binding: targetBinding,
    code_bundle_hash: codeBundle.hash,
    unique_assets: assetRows.length,
    exact_native_source_bytes: true,
    staged_before_first_upload: true,
    overwrite_allowed: false,
    storage_upload_option: { upsert: false },
    post_upload_download_verification_required: true,
    stop_findings: stopFindings,
    semantic_validation_errors: semanticErrors,
    ready_for_apply: stopFindings.length === 0,
    storage_writes_performed: false,
    db_writes_performed: false,
    migrations_created: false,
  };
}

async function stageAllAssets(supabase, assetRows) {
  return mapLimit(assetRows, FETCH_CONCURRENCY, async (asset) => {
    const source = await fetchPocketImage(asset.source_url);
    const errors = verifyImageObservation(source.observation, asset.source_expected, { requireHttpSuccess: true });
    const storage = await inspectStorageAsset(supabase, asset);
    if (storage.exists && !storage.valid) errors.push(...storage.errors.map((error) => `storage_collision:${error}`));
    return {
      asset,
      source_buffer: source.buffer,
      source_observation: source.observation,
      storage,
      action: storage.exists ? 'verify_existing_exact' : 'upload_new',
      errors,
    };
  });
}

async function uploadOne(supabase, staged) {
  if (staged.action === 'verify_existing_exact') {
    return { asset_id: staged.asset.asset_id, status: 'verified_existing_exact', uploaded: false, observation: staged.storage.observation, validation_errors: [] };
  }
  const { error } = await supabase.storage.from(staged.asset.target_storage_bucket).upload(
    staged.asset.target_storage_path,
    staged.source_buffer,
    { upsert: false, contentType: staged.asset.source_expected.content_type, cacheControl: '31536000' },
  );
  if (error) return { asset_id: staged.asset.asset_id, status: 'upload_failed', uploaded: false, observation: null, validation_errors: [error.message] };
  const downloaded = await downloadStorageImage(supabase, staged.asset.target_storage_bucket, staged.asset.target_storage_path);
  const validationErrors = verifyImageObservation(downloaded.observation, staged.asset.source_expected);
  return {
    asset_id: staged.asset.asset_id,
    status: validationErrors.length ? 'uploaded_readback_integrity_failure' : 'uploaded_and_verified',
    uploaded: true,
    observation: downloaded.observation,
    validation_errors: validationErrors,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const [summary, assetRows, rowRows, codeBundle] = await Promise.all([
    readJson(SOURCE_SUMMARY_JSON),
    readJsonl(ASSET_MANIFEST_JSONL),
    readJsonl(ROW_MANIFEST_JSONL),
    computeCodeBundleHash(),
  ]);
  const targetBinding = await targetBindingFromEnvironment();
  const plan = buildPlan(summary, assetRows, rowRows, targetBinding, codeBundle, args);
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(PLAN_JSON, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await fs.writeFile(PLAN_MD, `# ${PACKAGE_ID}\n\n- Mode: ${plan.mode}\n- Approval fingerprint: \`${plan.fingerprint}\`\n- Storage plan hash: \`${plan.storage_plan_hash}\`\n- Code bundle hash: \`${plan.code_bundle_hash}\`\n- Assets: ${plan.unique_assets}\n- Exact native bytes: ${plan.exact_native_source_bytes}\n- Upsert/overwrite: false\n- Ready for apply: ${plan.ready_for_apply}\n- Stop findings: ${plan.stop_findings.length ? plan.stop_findings.join(', ') : 'none'}\n- Storage writes performed: false\n- Database writes performed: false\n- Migrations created: false\n`, 'utf8');
  if (!args.apply) {
    console.log(JSON.stringify({ package_id: PACKAGE_ID, mode: 'plan_only', fingerprint: plan.fingerprint, storage_plan_hash: plan.storage_plan_hash, code_bundle_hash: plan.code_bundle_hash, ready_for_apply: plan.ready_for_apply, stop_findings: plan.stop_findings, plan_json: path.relative(ROOT, PLAN_JSON) }, null, 2));
    return;
  }
  if (!plan.ready_for_apply) throw new Error(`Plan is not apply-ready: ${plan.stop_findings.join(', ')}`);
  if (args.fingerprint !== plan.fingerprint) throw new Error(`Fingerprint mismatch. Expected ${plan.fingerprint}.`);
  if (args.planHash !== plan.storage_plan_hash) throw new Error(`Storage plan hash mismatch. Expected ${plan.storage_plan_hash}.`);
  const supabase = createStorageClient();
  const staged = await stageAllAssets(supabase, assetRows);
  const preflightFailures = staged.filter((row) => row.errors.length > 0);
  if (preflightFailures.length) throw new Error(`Preflight failed before first upload: ${JSON.stringify(preflightFailures.map((row) => ({ asset_id: row.asset.asset_id, errors: row.errors })))}`);
  const results = [];
  for (const entry of staged) results.push(await uploadOne(supabase, entry));
  const failures = results.filter((row) => row.validation_errors.length || !['verified_existing_exact', 'uploaded_and_verified'].includes(row.status));
  await writeJsonl(RESULT_JSONL, results);
  const result = {
    package_id: PACKAGE_ID,
    ended_at: new Date().toISOString(),
    fingerprint: plan.fingerprint,
    storage_plan_hash: plan.storage_plan_hash,
    uploaded_and_verified: results.filter((row) => row.status === 'uploaded_and_verified').length,
    verified_existing_exact: results.filter((row) => row.status === 'verified_existing_exact').length,
    failures: failures.length,
    failure_rows: failures,
    storage_writes_performed: results.some((row) => row.uploaded),
    db_writes_performed: false,
    migrations_created: false,
  };
  result.proof_hash = proofHash(result);
  await fs.writeFile(RESULT_JSON, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(result, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
