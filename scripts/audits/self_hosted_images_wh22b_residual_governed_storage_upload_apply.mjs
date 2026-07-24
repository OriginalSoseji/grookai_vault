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
  fetchImage,
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
} from './self_hosted_images_wh22_common.mjs';

dotenv.config({ path: process.env.IMG_HOST_ENV_FILE ?? '.env.local', quiet: true });
dotenv.config({ quiet: true });

const PACKAGE_ID = 'IMG-HOST-WH-22B-RESIDUAL-GOVERNED-STORAGE-UPLOAD-APPLY';
const SOURCE_SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh22a_residual_governed_upload_dry_run_summary_v1.json');
const ASSET_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh22a_residual_governed_asset_manifest_v1.jsonl');
const ROW_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh22a_residual_governed_row_manifest_v1.jsonl');
const PLAN_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh22b_residual_governed_storage_upload_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh22b_residual_governed_storage_upload_apply_plan_v1.md');
const RESULT_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh22b_residual_governed_storage_upload_apply_result_v1.jsonl');
const RESULT_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh22b_residual_governed_storage_upload_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh22b_residual_governed_storage_upload_apply_result_v1.md');

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
  const recomputedFingerprint = computeManifestFingerprint(assetRows, rowRows, targetBinding, codeBundle.hash);
  const semanticErrors = validateManifestSemantics(assetRows, rowRows, targetBinding);
  const uploadAssets = assetRows.filter((row) => row.upload_required);
  const reuseAssets = assetRows.filter((row) => row.initial_storage_disposition === 'reuse_existing_first_party');
  const planHash = proofHash({
    package_id: PACKAGE_ID,
    source_manifest_fingerprint: recomputedFingerprint,
    target_binding: targetBinding,
    code_bundle_hash: codeBundle.hash,
    overwrite_allowed: false,
    upload_assets: uploadAssets.map((row) => ({
      asset_id: row.asset_id,
      source_url: row.verified_fallback_url,
      source_expected: row.source_expected,
      target_storage_bucket: row.target_storage_bucket,
      target_storage_path: row.target_storage_path,
    })),
    reuse_assets: reuseAssets.map((row) => ({
      asset_id: row.asset_id,
      source_expected: row.source_expected,
      target_storage_bucket: row.target_storage_bucket,
      target_storage_path: row.target_storage_path,
    })),
  });
  const stopFindings = [
    ...(summary.fingerprint !== recomputedFingerprint ? ['source_manifest_fingerprint_mismatch'] : []),
    ...(!targetBindingsEqual(summary.target_binding, targetBinding) ? ['target_binding_mismatch'] : []),
    ...(summary.code_bundle_hash !== codeBundle.hash ? ['code_bundle_hash_mismatch'] : []),
    ...(semanticErrors.length ? ['manifest_semantic_validation_failures'] : []),
    ...(summary.ready_for_storage_apply !== true ? ['wh22a_not_storage_apply_ready'] : []),
    ...(rowRows.length !== 24 ? ['row_manifest_count_not_24'] : []),
    ...(assetRows.length !== 21 ? ['asset_manifest_count_not_21'] : []),
    ...(uploadAssets.length !== 19 ? ['initial_upload_plan_count_not_19'] : []),
    ...(reuseAssets.length !== 2 ? ['reuse_asset_count_not_2'] : []),
    ...(assetRows.some((row) => row.overwrite_allowed !== false) ? ['overwrite_policy_drift'] : []),
  ];
  return {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: args.apply ? 'guarded_apply' : 'plan_only',
    source_summary_json: path.relative(ROOT, SOURCE_SUMMARY_JSON),
    asset_manifest_jsonl: path.relative(ROOT, ASSET_MANIFEST_JSONL),
    row_manifest_jsonl: path.relative(ROOT, ROW_MANIFEST_JSONL),
    fingerprint: recomputedFingerprint,
    target_binding: targetBinding,
    code_bundle_hash: codeBundle.hash,
    storage_plan_hash: planHash,
    parent_row_mappings: rowRows.length,
    unique_assets: assetRows.length,
    new_uploads_planned: uploadAssets.length,
    existing_first_party_assets_reused: reuseAssets.length,
    staged_before_first_upload: true,
    post_upload_download_verification_required: true,
    overwrite_allowed: false,
    storage_upload_option: { upsert: false },
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    stop_findings: stopFindings,
    semantic_validation_errors: semanticErrors,
    ready_for_apply: stopFindings.length === 0,
  };
}

async function stageAllAssets(supabase, assetRows) {
  return mapLimit(assetRows, FETCH_CONCURRENCY, async (asset) => {
    const source = await fetchImage(asset.verified_fallback_url);
    const sourceErrors = verifyImageObservation(source.observation, asset.source_expected, { requireHttpSuccess: true });
    const storage = await inspectStorageAsset(supabase, {
      ...asset,
      expected: asset.source_expected,
    });
    const reuseRequired = asset.initial_storage_disposition === 'reuse_existing_first_party';
    const errors = [...sourceErrors];
    if (storage.exists && !storage.valid) errors.push(...storage.errors.map((error) => `storage:${error}`));
    if (reuseRequired && !storage.exists) errors.push('required_reuse_object_missing');
    return {
      asset,
      source_buffer: source.buffer,
      source_observation: source.observation,
      storage,
      action: storage.exists ? 'verify_existing' : (reuseRequired ? 'blocked_missing_reuse' : 'upload_new'),
      errors,
    };
  });
}

async function uploadAndVerify(supabase, staged) {
  if (staged.action === 'verify_existing') {
    return {
      asset_id: staged.asset.asset_id,
      target_storage_bucket: staged.asset.target_storage_bucket,
      target_storage_path: staged.asset.target_storage_path,
      status: 'verified_existing_object',
      uploaded: false,
      storage_observed: staged.storage.observation,
      validation_errors: [],
    };
  }
  const { error } = await supabase.storage
    .from(staged.asset.target_storage_bucket)
    .upload(staged.asset.target_storage_path, staged.source_buffer, {
      upsert: false,
      contentType: staged.asset.source_expected.content_type,
      cacheControl: '31536000',
    });
  if (error) {
    return {
      asset_id: staged.asset.asset_id,
      target_storage_bucket: staged.asset.target_storage_bucket,
      target_storage_path: staged.asset.target_storage_path,
      status: 'upload_failed',
      uploaded: false,
      storage_observed: null,
      validation_errors: [error.message],
    };
  }
  const downloaded = await downloadStorageImage(
    supabase,
    staged.asset.target_storage_bucket,
    staged.asset.target_storage_path,
  );
  const errors = verifyImageObservation(downloaded.observation, staged.asset.source_expected);
  return {
    asset_id: staged.asset.asset_id,
    target_storage_bucket: staged.asset.target_storage_bucket,
    target_storage_path: staged.asset.target_storage_path,
    status: errors.length ? 'uploaded_readback_integrity_failure' : 'uploaded_and_verified',
    uploaded: true,
    storage_observed: downloaded.observation,
    validation_errors: errors,
  };
}

function renderPlanMarkdown(plan) {
  return `# ${PACKAGE_ID}

- Generated: ${plan.generated_at}
- Mode: ${plan.mode}
- Approval fingerprint: \`${plan.fingerprint}\`
- Storage plan hash: \`${plan.storage_plan_hash}\`
- Code bundle hash: \`${plan.code_bundle_hash}\`
- Supabase project: \`${plan.target_binding.supabase_project_ref}\`
- Parent-row mappings: ${plan.parent_row_mappings}
- Unique assets: ${plan.unique_assets}
- New uploads planned: ${plan.new_uploads_planned}
- Existing first-party assets reused: ${plan.existing_first_party_assets_reused}
- Overwrite allowed: ${plan.overwrite_allowed}
- Upload uses \`upsert: false\`: ${plan.storage_upload_option.upsert === false}
- All payloads staged before first upload: ${plan.staged_before_first_upload}
- Post-upload download verification required: ${plan.post_upload_download_verification_required}
- Ready for apply: ${plan.ready_for_apply}
- Stop findings: ${plan.stop_findings.length ? plan.stop_findings.join(', ') : 'none'}
- Database writes performed: ${plan.db_writes_performed}
- Storage writes performed: ${plan.storage_writes_performed}
- Migrations created: ${plan.migrations_created}
`;
}

async function main() {
  const args = parseArgs(process.argv);
  const summary = await readJson(SOURCE_SUMMARY_JSON);
  const assetRows = await readJsonl(ASSET_MANIFEST_JSONL);
  const rowRows = await readJsonl(ROW_MANIFEST_JSONL);
  const targetBinding = await targetBindingFromEnvironment();
  const codeBundle = await computeCodeBundleHash();
  const plan = buildPlan(summary, assetRows, rowRows, targetBinding, codeBundle, args);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(PLAN_JSON, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await fs.writeFile(PLAN_MD, renderPlanMarkdown(plan), 'utf8');

  if (!args.apply) {
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      mode: 'plan_only',
      fingerprint: plan.fingerprint,
      storage_plan_hash: plan.storage_plan_hash,
      unique_assets: plan.unique_assets,
      new_uploads_planned: plan.new_uploads_planned,
      existing_first_party_assets_reused: plan.existing_first_party_assets_reused,
      ready_for_apply: plan.ready_for_apply,
      stop_findings: plan.stop_findings,
      plan_json: path.relative(ROOT, PLAN_JSON),
      plan_md: path.relative(ROOT, PLAN_MD),
    }, null, 2));
    return;
  }

  if (!plan.ready_for_apply) throw new Error(`Plan is not apply-ready: ${plan.stop_findings.join(', ')}`);
  if (args.fingerprint !== plan.fingerprint) throw new Error(`Fingerprint mismatch. Expected ${plan.fingerprint}.`);
  if (args.planHash !== plan.storage_plan_hash) throw new Error(`Storage plan hash mismatch. Expected ${plan.storage_plan_hash}.`);

  const supabase = createStorageClient();
  const startedAt = new Date().toISOString();
  const staged = await stageAllAssets(supabase, assetRows);
  const preflightFailures = staged.filter((row) => row.errors.length > 0);
  if (preflightFailures.length > 0) {
    throw new Error(`Preflight failed before first upload: ${JSON.stringify(preflightFailures.map((row) => ({ asset_id: row.asset.asset_id, errors: row.errors })))}`);
  }

  const results = [];
  for (const entry of staged) {
    results.push(await uploadAndVerify(supabase, entry));
  }
  const failures = results.filter((row) => row.validation_errors.length > 0 || !['verified_existing_object', 'uploaded_and_verified'].includes(row.status));
  await writeJsonl(RESULT_JSONL, results.map((row) => ({ ...row, fingerprint: plan.fingerprint })));
  const result = {
    package_id: PACKAGE_ID,
    mode: 'guarded_apply_result',
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    fingerprint: plan.fingerprint,
    storage_plan_hash: plan.storage_plan_hash,
    unique_assets: assetRows.length,
    new_uploads_planned: plan.new_uploads_planned,
    uploaded_and_verified: results.filter((row) => row.status === 'uploaded_and_verified').length,
    verified_existing_objects: results.filter((row) => row.status === 'verified_existing_object').length,
    failures: failures.length,
    failure_rows: failures,
    storage_writes_performed: results.some((row) => row.uploaded),
    db_writes_performed: false,
    migrations_created: false,
  };
  result.proof_hash = proofHash(result);
  await fs.writeFile(RESULT_JSON, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await fs.writeFile(RESULT_MD, `# ${PACKAGE_ID}

- Completed: ${result.ended_at}
- Fingerprint: \`${result.fingerprint}\`
- Storage plan hash: \`${result.storage_plan_hash}\`
- Proof hash: \`${result.proof_hash}\`
- Uploaded and verified: ${result.uploaded_and_verified}
- Verified existing objects: ${result.verified_existing_objects}
- Failures: ${result.failures}
- Database writes performed: ${result.db_writes_performed}
- Storage writes performed: ${result.storage_writes_performed}
- Migrations created: ${result.migrations_created}
`, 'utf8');
  console.log(JSON.stringify(result, null, 2));
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
