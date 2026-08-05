import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import {
  readVerifiedArtifact,
  writeShardedRows,
} from './artifact_rows_v1.mjs';
import {
  buildArtifact,
  contentFingerprint,
  stableJson,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';
import { assertAuditOnlyArgs } from './read_only_guard_v1.mjs';

export const IMAGE_STORAGE_CANARY_PLAN_VERSION =
  'JPN-MASTER-INDEX-V4-IMAGE-STORAGE-CANARY-PLAN-V1';
export const EXPECTED_STORAGE_CANARY_ROWS = 17;
export const TARGET_SUPABASE_PROJECT_REF = 'ycdxbpibncqcchqiihfz';
export const TARGET_STORAGE_BUCKET = 'user-card-images';

const READINESS_ARTIFACT =
  'docs/audits/japanese_master_index_v4/image_acquisition_readiness_v1/'
  + 'jpn_image_acquisition_readiness_v1.json';
const EXPECTED_READINESS_FINGERPRINT =
  '0cd2ef5619f4e90247aa5222ee5ca0d5645ddd005f5060a6bdae8c8fec5aaaa8';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/image_storage_canary_plan_v1';
const CODE_BUNDLE_PATHS = Object.freeze([
  'scripts/audits/japanese_master_index_v4/image_acquisition_readiness_v1.mjs',
  'scripts/audits/japanese_master_index_v4/image_storage_canary_plan_v1.mjs',
  'scripts/audits/japanese_master_index_v4/image_storage_canary_apply_v1.mjs',
]);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function loadDataset(descriptor) {
  const rows = [];
  for (const shardPath of descriptor.shard_paths) {
    const { artifact } = await readVerifiedArtifact(shardPath);
    rows.push(...artifact.content.rows);
  }
  if (rows.length !== descriptor.row_count
    || contentFingerprint(rows) !== descriptor.content_fingerprint_sha256) {
    throw new Error(`Dataset verification failed: ${descriptor.dataset_key}`);
  }
  return rows;
}

export async function computeStorageCanaryCodeBundle() {
  const files = [];
  for (const relativePath of CODE_BUNDLE_PATHS) {
    const bytes = await fs.readFile(relativePath);
    files.push({ relative_path: relativePath, sha256: sha256(bytes) });
  }
  return { files, hash: contentFingerprint(files) };
}

function parseArgs(argv) {
  assertAuditOnlyArgs(argv);
  let outputRoot = DEFAULT_OUTPUT_ROOT;
  for (const argument of argv) {
    if (argument.startsWith('--output-root=')) {
      outputRoot = argument.slice('--output-root='.length);
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  return { outputRoot };
}

export function buildStorageCanaryAssets(canaryRows) {
  const ready = canaryRows
    .filter((row) => row.status === 'ready_for_future_storage_canary')
    .sort((left, right) => left.canary_position - right.canary_position);
  if (ready.length !== EXPECTED_STORAGE_CANARY_ROWS) {
    throw new Error(`Storage canary scope changed: ${ready.length}`);
  }
  const assets = ready.map((row, index) => ({
    position: index + 1,
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    number: row.number,
    source_authority: row.source_identity_authority,
    source_url: row.selected_source.source_url,
    source_expected: {
      content_type: row.selected_source.content_type,
      size_bytes: row.selected_source.size_bytes,
      sha256: row.selected_source.sha256,
      width: row.selected_source.width,
      height: row.selected_source.height,
      format: row.selected_source.format,
      quality_band: row.selected_source.quality_band,
    },
    local_cache_path: row.local_cache_path,
    local_cache_sha256: row.local_cache_sha256,
    target_storage_bucket: TARGET_STORAGE_BUCKET,
    target_storage_path: row.target_storage_path,
    upload_policy: {
      upsert: false,
      overwrite_allowed: false,
      cache_control: '31536000',
    },
    canary_lifecycle: 'upload_readback_then_remove_and_verify_absent',
    database_pointer_update_allowed: false,
    human_visual_identity_confirmation: row.visual_identity_reconfirmation,
  }));
  if (new Set(assets.map((row) => row.card_print_id)).size !== assets.length
    || new Set(assets.map((row) => row.target_storage_path)).size !== assets.length
    || assets.some((row) => row.source_expected.quality_band !== 'high')
    || assets.some((row) => !row.source_url.startsWith('https://www.pokemon-card.com/'))
    || assets.some((row) => !row.target_storage_path.startsWith(
      'warehouse-derived/self-hosted-images-v1/card_prints/',
    ))) {
    throw new Error('Storage canary assets violate scope or quality policy.');
  }
  return assets;
}

export function approvalPayload(assets, bundleHash) {
  return {
    plan_version: IMAGE_STORAGE_CANARY_PLAN_VERSION,
    source_readiness_fingerprint_sha256: EXPECTED_READINESS_FINGERPRINT,
    target: {
      supabase_project_ref: TARGET_SUPABASE_PROJECT_REF,
      storage_bucket: TARGET_STORAGE_BUCKET,
    },
    code_bundle_hash_sha256: bundleHash,
    assets,
    execution_policy: {
      exact_assets: EXPECTED_STORAGE_CANARY_ROWS,
      source_bytes_staged_before_first_storage_access: true,
      existing_target_object_is_hard_stop: true,
      upsert: false,
      overwrite_allowed: false,
      readback_hash_size_dimensions_required: true,
      remove_all_new_objects_after_readback: true,
      post_remove_absence_verification_required: true,
      durable_storage_objects_expected: 0,
      database_reads_allowed: false,
      database_writes_allowed: false,
      image_pointer_writes_allowed: false,
    },
  };
}

export function storagePlanHash(approvalFingerprint, bundleHash) {
  return contentFingerprint({
    plan_version: IMAGE_STORAGE_CANARY_PLAN_VERSION,
    approval_fingerprint_sha256: approvalFingerprint,
    code_bundle_hash_sha256: bundleHash,
    transient_storage_mutations: ['upload', 'download_readback', 'remove'],
    durable_storage_objects_expected: 0,
    database_writes_expected: 0,
  });
}

async function verifyLocalCache(assets) {
  const results = [];
  for (const asset of assets) {
    const bytes = await fs.readFile(asset.local_cache_path);
    const observedHash = sha256(bytes);
    results.push({
      gv_id: asset.gv_id,
      local_cache_path: asset.local_cache_path,
      expected_sha256: asset.source_expected.sha256,
      observed_sha256: observedHash,
      expected_size_bytes: asset.source_expected.size_bytes,
      observed_size_bytes: bytes.length,
      verified: observedHash === asset.source_expected.sha256
        && bytes.length === asset.source_expected.size_bytes,
    });
  }
  if (results.some((row) => !row.verified)) {
    throw new Error('Local cache verification failed.');
  }
  return results;
}

function markdown(report) {
  return `# Japanese Master Index V4 Image Storage Canary Plan V1

Generated: ${report.generated_at}

- Assets: ${report.scope.assets}
- Supabase project: \`${report.target.supabase_project_ref}\`
- Storage bucket: \`${report.target.storage_bucket}\`
- Approval fingerprint: \`${report.approval_fingerprint_sha256}\`
- Storage plan hash: \`${report.storage_plan_hash_sha256}\`
- Code bundle hash: \`${report.code_bundle.hash}\`
- Storage access performed: false
- Database access performed: false
- Ready for separate approval: ${report.ready_for_separate_storage_approval}

The future canary must stage and verify all 17 official source images before
the first Storage call. It then requires each target to be absent, uploads with
\`upsert: false\`, downloads and verifies exact bytes, removes every object
created by the canary, and verifies all targets are absent again. It cannot
write database image pointers and leaves zero durable Storage objects.

Future apply command after explicit approval:

\`node scripts/audits/japanese_master_index_v4/image_storage_canary_apply_v1.mjs --apply --fingerprint=${report.approval_fingerprint_sha256} --plan-hash=${report.storage_plan_hash_sha256}\`
`;
}

async function main() {
  const { outputRoot } = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const { artifact: readiness } = await readVerifiedArtifact(READINESS_ARTIFACT);
  if (readiness.content_fingerprint_sha256 !== EXPECTED_READINESS_FINGERPRINT) {
    throw new Error('Image-readiness artifact changed.');
  }
  const canaryRows = await loadDataset(readiness.content.canary_dataset);
  const assets = buildStorageCanaryAssets(canaryRows);
  const [bundle, cacheReadback] = await Promise.all([
    computeStorageCanaryCodeBundle(),
    verifyLocalCache(assets),
  ]);
  const payload = approvalPayload(assets, bundle.hash);
  const approvalFingerprint = contentFingerprint(payload);
  const planHash = storagePlanHash(approvalFingerprint, bundle.hash);
  const retrieval = {
    access_mode: 'verified_local_artifact_and_cache_only',
    source_fetches: false,
    database_reads: false,
    database_writes: false,
    storage_access: false,
    storage_writes: false,
  };
  const assetDataset = await writeShardedRows({
    outputRoot,
    datasetKey: 'jpn_image_storage_canary_assets_v1',
    packageId: `${IMAGE_STORAGE_CANARY_PLAN_VERSION}-ASSETS`,
    rows: assets,
    generatedAt,
    retrieval,
  });
  const report = {
    plan_version: IMAGE_STORAGE_CANARY_PLAN_VERSION,
    generated_at: generatedAt,
    status: 'plan_complete_no_storage_access',
    source_readiness_fingerprint_sha256: readiness.content_fingerprint_sha256,
    target: payload.target,
    scope: { assets: assets.length },
    asset_dataset: assetDataset,
    code_bundle: bundle,
    approval_fingerprint_sha256: approvalFingerprint,
    storage_plan_hash_sha256: planHash,
    execution_policy: payload.execution_policy,
    local_cache_readback: {
      verified_rows: cacheReadback.filter((row) => row.verified).length,
      rows: cacheReadback,
      cache_committed: false,
    },
    ready_for_separate_storage_approval: true,
    execution_boundary: {
      source_fetches: false,
      database_reads: false,
      database_writes: false,
      storage_reads: false,
      storage_writes: false,
      image_pointer_writes: false,
      durable_storage_objects_created: 0,
    },
  };
  await writeJsonArtifact(
    path.join(outputRoot, 'jpn_image_storage_canary_plan_v1.json'),
    buildArtifact({
      packageId: IMAGE_STORAGE_CANARY_PLAN_VERSION,
      generatedAt,
      retrieval,
      content: report,
    }),
  );
  await fs.writeFile(
    path.join(outputRoot, 'jpn_image_storage_canary_plan_v1.md'),
    markdown(report),
  );
  process.stdout.write(stableJson({
    status: report.status,
    assets: assets.length,
    approval_fingerprint_sha256: approvalFingerprint,
    storage_plan_hash_sha256: planHash,
    output_root: outputRoot,
  }));
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
