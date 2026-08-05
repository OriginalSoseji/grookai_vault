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
import { inspectImageBuffer } from './image_acquisition_readiness_v1.mjs';
import { assertAuditOnlyArgs } from './read_only_guard_v1.mjs';
import {
  TARGET_STORAGE_BUCKET,
  TARGET_SUPABASE_PROJECT_REF,
} from './image_storage_canary_plan_v1.mjs';

export const IMAGE_STORAGE_PERMANENT_PLAN_VERSION =
  'JPN-MASTER-INDEX-V4-IMAGE-STORAGE-PERMANENT-PLAN-V1';
export const EXPECTED_PERMANENT_STORAGE_ROWS = 53;
export const EXPECTED_SOURCE_LANES = Object.freeze({
  original_high_resolution_canary: 17,
  deterministic_source_remediation: 36,
});

const CANARY_PLAN_ARTIFACT =
  'docs/audits/japanese_master_index_v4/image_storage_canary_plan_v1/'
  + 'jpn_image_storage_canary_plan_v1.json';
const CANARY_PLAN_FINGERPRINT =
  '123693d3ef4d7757eacbb6f09c01a949c1096715521112b2050b86e849b57f72';
const REMEDIATION_ARTIFACT =
  'docs/audits/japanese_master_index_v4/image_source_remediation_v1/'
  + 'jpn_image_source_remediation_v1.json';
const REMEDIATION_FINGERPRINT =
  '34d55e59a676a0011bac0e4a29a0eea81037b6f60005d1cd805afb569f6db9f5';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/image_storage_permanent_plan_v1';
const CODE_BUNDLE_PATHS = Object.freeze([
  'scripts/audits/japanese_master_index_v4/artifact_rows_v1.mjs',
  'scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs',
  'scripts/audits/japanese_master_index_v4/image_acquisition_readiness_v1.mjs',
  'scripts/audits/japanese_master_index_v4/image_storage_canary_plan_v1.mjs',
  'scripts/audits/japanese_master_index_v4/image_storage_permanent_plan_v1.mjs',
  'scripts/audits/japanese_master_index_v4/image_storage_permanent_apply_v1.mjs',
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

export async function computePermanentStorageCodeBundle() {
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

function baseAsset({
  position,
  sourceLane,
  cardPrintId,
  gvId,
  name,
  setCode,
  number,
  printedNameJa,
  printedSetAbbrev,
  sourceAuthority,
  sourceUrl,
  sourcePageUrl,
  sourceAssertionKey,
  expected,
  localCachePath,
  localCacheSha256,
  targetStoragePath,
  humanVisualIdentityConfirmation,
}) {
  return {
    position,
    source_lane: sourceLane,
    card_print_id: cardPrintId,
    gv_id: gvId,
    name,
    set_code: setCode,
    number,
    printed_name_ja: printedNameJa ?? null,
    printed_set_abbrev: printedSetAbbrev ?? null,
    source_authority: sourceAuthority,
    source_url: sourceUrl,
    source_page_url: sourcePageUrl ?? null,
    source_assertion_key: sourceAssertionKey ?? null,
    source_expected: {
      content_type: expected.content_type,
      size_bytes: expected.size_bytes,
      sha256: expected.sha256,
      width: expected.width,
      height: expected.height,
      format: expected.format,
      quality_band: expected.quality_band,
    },
    local_cache_path: localCachePath,
    local_cache_sha256: localCacheSha256,
    target_storage_bucket: TARGET_STORAGE_BUCKET,
    target_storage_path: targetStoragePath,
    upload_policy: {
      upsert: false,
      overwrite_allowed: false,
      cache_control: '31536000',
    },
    success_lifecycle: 'upload_readback_verify_and_retain',
    failure_recovery: 'remove_only_objects_created_by_this_execution',
    database_pointer_update_allowed: false,
    human_visual_identity_confirmation: humanVisualIdentityConfirmation,
  };
}

export function buildPermanentStorageAssets(canaryRows, remediationRows) {
  if (canaryRows.length !== EXPECTED_SOURCE_LANES.original_high_resolution_canary) {
    throw new Error(`Original canary scope changed: ${canaryRows.length}`);
  }
  const remediationReady = remediationRows
    .filter((row) => row.disposition === 'ready_high_resolution_source')
    .sort((left, right) => left.position - right.position);
  if (remediationReady.length
    !== EXPECTED_SOURCE_LANES.deterministic_source_remediation) {
    throw new Error(`Remediation-ready scope changed: ${remediationReady.length}`);
  }

  const original = [...canaryRows]
    .sort((left, right) => left.position - right.position)
    .map((row, index) => baseAsset({
      position: index + 1,
      sourceLane: 'original_high_resolution_canary',
      cardPrintId: row.card_print_id,
      gvId: row.gv_id,
      name: row.name,
      setCode: row.set_code,
      number: row.number,
      sourceAuthority: row.source_authority,
      sourceUrl: row.source_url,
      expected: row.source_expected,
      localCachePath: row.local_cache_path,
      localCacheSha256: row.local_cache_sha256,
      targetStoragePath: row.target_storage_path,
      humanVisualIdentityConfirmation: row.human_visual_identity_confirmation,
    }));
  const remediated = remediationReady.map((row, index) => {
    const candidate = row.selected_candidate;
    if (!candidate) throw new Error(`${row.gv_id}: selected candidate missing.`);
    return baseAsset({
      position: original.length + index + 1,
      sourceLane: 'deterministic_source_remediation',
      cardPrintId: row.card_print_id,
      gvId: row.gv_id,
      name: row.name,
      setCode: row.set_code,
      number: row.number,
      printedNameJa: row.printed_name_ja,
      printedSetAbbrev: row.printed_set_abbrev,
      sourceAuthority: candidate.authority,
      sourceUrl: candidate.source_image_url,
      sourcePageUrl: candidate.source_page_url,
      sourceAssertionKey: candidate.source_assertion_key,
      expected: candidate,
      localCachePath: candidate.local_cache_path,
      localCacheSha256: candidate.local_cache_sha256,
      targetStoragePath: row.proposed_target_storage_path,
      humanVisualIdentityConfirmation: row.human_visual_identity_confirmation,
    });
  });
  const assets = [...original, ...remediated];

  const errors = [];
  if (assets.length !== EXPECTED_PERMANENT_STORAGE_ROWS) errors.push('row_count');
  for (const key of ['card_print_id', 'gv_id', 'target_storage_path']) {
    if (new Set(assets.map((row) => row[key])).size !== assets.length) {
      errors.push(`duplicate_${key}`);
    }
  }
  for (const asset of assets) {
    const host = new URL(asset.source_url).hostname.toLowerCase();
    const allowedHost = host === 'www.pokemon-card.com'
      || host === 'www.serebii.net';
    const expectedSuffix = `/${asset.source_expected.sha256.slice(0, 24)}`
      + `.${asset.source_expected.format}`;
    if (!allowedHost) errors.push(`${asset.gv_id}:source_host`);
    if (asset.source_expected.quality_band !== 'high') {
      errors.push(`${asset.gv_id}:quality_band`);
    }
    if (asset.local_cache_sha256 !== asset.source_expected.sha256) {
      errors.push(`${asset.gv_id}:cache_hash`);
    }
    if (asset.target_storage_bucket !== TARGET_STORAGE_BUCKET
      || !asset.target_storage_path.startsWith(
        'warehouse-derived/self-hosted-images-v1/card_prints/',
      )
      || !asset.target_storage_path.endsWith(expectedSuffix)) {
      errors.push(`${asset.gv_id}:target_path`);
    }
    if (!asset.gv_id.startsWith('GV-PK-JPN-')
      || asset.database_pointer_update_allowed
      || asset.upload_policy.upsert
      || asset.upload_policy.overwrite_allowed) {
      errors.push(`${asset.gv_id}:boundary`);
    }
  }
  if (errors.length) {
    throw new Error(`Permanent Storage asset policy failed: ${errors.join(',')}`);
  }
  return assets;
}

export function permanentStorageApprovalPayload(assets, bundleHash) {
  return {
    plan_version: IMAGE_STORAGE_PERMANENT_PLAN_VERSION,
    source_artifacts: {
      transient_canary_plan_fingerprint_sha256: CANARY_PLAN_FINGERPRINT,
      source_remediation_fingerprint_sha256: REMEDIATION_FINGERPRINT,
    },
    target: {
      supabase_project_ref: TARGET_SUPABASE_PROJECT_REF,
      storage_bucket: TARGET_STORAGE_BUCKET,
    },
    code_bundle_hash_sha256: bundleHash,
    assets,
    execution_policy: {
      exact_assets: EXPECTED_PERMANENT_STORAGE_ROWS,
      source_bytes_staged_before_first_storage_access: true,
      all_target_objects_must_be_absent_before_first_upload: true,
      existing_target_object_is_hard_stop: true,
      upsert: false,
      overwrite_allowed: false,
      exact_readback_hash_size_dimensions_format_required: true,
      successful_uploads_are_retained: true,
      rollback_on_any_failure: true,
      rollback_scope: 'only_objects_created_by_this_execution',
      post_rollback_absence_verification_required: true,
      durable_storage_objects_expected_on_success: EXPECTED_PERMANENT_STORAGE_ROWS,
      durable_storage_objects_expected_on_failure: 0,
      database_reads_allowed: false,
      database_writes_allowed: false,
      image_pointer_writes_allowed: false,
    },
  };
}

export function permanentStoragePlanHash(approvalFingerprint, bundleHash) {
  return contentFingerprint({
    plan_version: IMAGE_STORAGE_PERMANENT_PLAN_VERSION,
    approval_fingerprint_sha256: approvalFingerprint,
    code_bundle_hash_sha256: bundleHash,
    durable_storage_mutations: ['upload', 'download_readback', 'retain_on_success'],
    failure_recovery: ['remove_new_objects', 'verify_absent'],
    durable_storage_objects_expected_on_success: EXPECTED_PERMANENT_STORAGE_ROWS,
    database_writes_expected: 0,
  });
}

async function verifyLocalCache(assets) {
  const rows = [];
  for (const asset of assets) {
    const bytes = await fs.readFile(asset.local_cache_path);
    const observed = inspectImageBuffer(bytes, asset.source_expected.content_type);
    const errors = [];
    for (const key of ['size_bytes', 'sha256', 'width', 'height', 'format']) {
      if (observed[key] !== asset.source_expected[key]) errors.push(`${key}_mismatch`);
    }
    rows.push({
      gv_id: asset.gv_id,
      local_cache_path: asset.local_cache_path,
      observed,
      verified: errors.length === 0,
      errors,
    });
  }
  if (rows.some((row) => !row.verified)) {
    throw new Error('Permanent Storage local-cache verification failed.');
  }
  return rows;
}

function markdown(report) {
  return `# Japanese Master Index V4 Permanent Image Storage Plan V1

Generated: ${report.generated_at}

- Assets: ${report.scope.assets}
- Original canary lane: ${report.scope.source_lanes.original_high_resolution_canary}
- Remediated lane: ${report.scope.source_lanes.deterministic_source_remediation}
- Supabase project: \`${report.target.supabase_project_ref}\`
- Storage bucket: \`${report.target.storage_bucket}\`
- Approval fingerprint: \`${report.approval_fingerprint_sha256}\`
- Storage plan hash: \`${report.storage_plan_hash_sha256}\`
- Code bundle hash: \`${report.code_bundle.hash}\`
- Local cache verified: ${report.local_cache_readback.verified_rows}/53
- Storage access performed: false
- Database access performed: false
- Ready for separate approval: ${report.ready_for_separate_storage_approval}

The future apply must stage all 53 exact source images before Storage access,
prove all 53 target paths are absent, upload with \`upsert: false\`, and verify
each stored image by hash, size, dimensions, and format. A successful run
retains all 53 objects. Any failure removes only objects created by that run
and verifies those paths absent. Database image pointers remain excluded.

Future apply command after explicit approval:

\`node scripts/audits/japanese_master_index_v4/image_storage_permanent_apply_v1.mjs --apply --fingerprint=${report.approval_fingerprint_sha256} --plan-hash=${report.storage_plan_hash_sha256}\`
`;
}

async function main() {
  const { outputRoot } = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const [{ artifact: canaryPlan }, { artifact: remediation }] = await Promise.all([
    readVerifiedArtifact(CANARY_PLAN_ARTIFACT),
    readVerifiedArtifact(REMEDIATION_ARTIFACT),
  ]);
  if (canaryPlan.content_fingerprint_sha256 !== CANARY_PLAN_FINGERPRINT
    || remediation.content_fingerprint_sha256 !== REMEDIATION_FINGERPRINT) {
    throw new Error('Permanent Storage source artifact changed.');
  }
  const [canaryRows, remediationRows] = await Promise.all([
    loadDataset(canaryPlan.content.asset_dataset),
    loadDataset(remediation.content.row_dataset),
  ]);
  const assets = buildPermanentStorageAssets(canaryRows, remediationRows);
  const [bundle, cacheReadback] = await Promise.all([
    computePermanentStorageCodeBundle(),
    verifyLocalCache(assets),
  ]);
  const approval = permanentStorageApprovalPayload(assets, bundle.hash);
  const approvalFingerprint = contentFingerprint(approval);
  const planHash = permanentStoragePlanHash(approvalFingerprint, bundle.hash);
  const retrieval = {
    access_mode: 'verified_local_artifacts_and_cache_only',
    source_fetches: false,
    database_reads: false,
    database_writes: false,
    storage_access: false,
    storage_writes: false,
  };
  const assetDataset = await writeShardedRows({
    outputRoot,
    datasetKey: 'jpn_image_storage_permanent_assets_v1',
    packageId: `${IMAGE_STORAGE_PERMANENT_PLAN_VERSION}-ASSETS`,
    rows: assets,
    generatedAt,
    retrieval,
  });
  const sourceLanes = Object.fromEntries(
    Object.keys(EXPECTED_SOURCE_LANES).map((lane) => [
      lane,
      assets.filter((row) => row.source_lane === lane).length,
    ]),
  );
  const report = {
    plan_version: IMAGE_STORAGE_PERMANENT_PLAN_VERSION,
    generated_at: generatedAt,
    status: 'permanent_upload_plan_complete_no_storage_access',
    source_artifacts: approval.source_artifacts,
    target: approval.target,
    scope: { assets: assets.length, source_lanes: sourceLanes },
    asset_dataset: assetDataset,
    code_bundle: bundle,
    approval_fingerprint_sha256: approvalFingerprint,
    storage_plan_hash_sha256: planHash,
    execution_policy: approval.execution_policy,
    local_cache_readback: {
      verified_rows: cacheReadback.filter((row) => row.verified).length,
      rows: cacheReadback,
      cache_committed: false,
    },
    collision_preflight: {
      planned: true,
      performed: false,
      timing: 'after_source_staging_and_before_first_upload',
      required_state: 'all_53_targets_absent',
    },
    rollback_strategy: {
      trigger: 'any_upload_or_readback_failure',
      scope: 'only_objects_created_by_this_execution',
      absence_verification_required: true,
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
    path.join(outputRoot, 'jpn_image_storage_permanent_plan_v1.json'),
    buildArtifact({
      packageId: IMAGE_STORAGE_PERMANENT_PLAN_VERSION,
      generatedAt,
      retrieval,
      content: report,
    }),
  );
  await fs.writeFile(
    path.join(outputRoot, 'jpn_image_storage_permanent_plan_v1.md'),
    markdown(report),
  );
  process.stdout.write(stableJson({
    status: report.status,
    assets: assets.length,
    approval_fingerprint_sha256: approvalFingerprint,
    storage_plan_hash_sha256: planHash,
    storage_access_performed: false,
    database_access_performed: false,
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
