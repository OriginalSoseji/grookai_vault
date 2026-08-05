import crypto from 'node:crypto';
import fs from 'node:fs/promises';

import { createClient } from '@supabase/supabase-js';

import { readVerifiedArtifact } from './artifact_rows_v1.mjs';
import { contentFingerprint } from './deterministic_artifact_v1.mjs';
import { inspectImageBuffer } from './image_acquisition_readiness_v1.mjs';
import {
  TARGET_STORAGE_BUCKET,
  TARGET_SUPABASE_PROJECT_REF,
} from './image_storage_canary_plan_v1.mjs';

export const IMAGE_POINTER_PLAN_VERSION =
  'JPN-MASTER-INDEX-V4-IMAGE-POINTER-PLAN-V1';
export const EXPECTED_IMAGE_POINTER_ROWS = 53;
export const ALLOWED_IMAGE_POINTER_COLUMNS = Object.freeze([
  'image_note',
  'image_path',
  'image_status',
]);
export const IMAGE_POINTER_NOTE =
  'Self-hosted exact Japanese V4 identity image; external image_url preserved as fallback.';
export const IMAGE_POINTER_MUTATION_CONTRACT = Object.freeze({
  target_table: 'public.card_prints',
  exact_row_scope: EXPECTED_IMAGE_POINTER_ROWS,
  allowed_apply_columns: ALLOWED_IMAGE_POINTER_COLUMNS,
  image_url_policy: 'preserve_existing_exact_external_fallback',
  image_source_policy: 'preserve_identity',
  compare_and_swap: 'complete_to_jsonb_card_prints_row',
  locking: 'all_53_rows_for_update_before_first_mutation',
  atomicity: 'single_53_row_transaction',
  rollback_proof: 'mandatory_before_real_apply_approval',
  failure_recovery: 'database_transaction_rollback',
  storage_precondition: 'all_53_objects_reverified_before_begin',
  postcondition: 'complete_row_readback_hash_for_all_53_rows_before_commit',
});

export const STORAGE_PLAN_ARTIFACT =
  'docs/audits/japanese_master_index_v4/image_storage_permanent_plan_v1/'
  + 'jpn_image_storage_permanent_plan_v1.json';
export const STORAGE_PLAN_CONTENT_FINGERPRINT =
  '9f124fc23f7f6dcfcfeb26f0f4a54ec4624eea426f785f124e87be81aa63c5d9';
export const STORAGE_APPLY_RESULT =
  'docs/audits/japanese_master_index_v4/image_storage_permanent_apply_v1/'
  + 'jpn_image_storage_permanent_apply_v1.json';
export const STORAGE_APPLY_PROOF_HASH =
  '56c1957683e3ef444b28fe74da0aae711d70d588e70d291ab59c188da225c353';

const CODE_BUNDLE_PATHS = Object.freeze([
  'scripts/audits/japanese_master_index_v4/artifact_rows_v1.mjs',
  'scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs',
  'scripts/audits/japanese_master_index_v4/image_acquisition_readiness_v1.mjs',
  'scripts/audits/japanese_master_index_v4/image_pointer_common_v1.mjs',
  'scripts/audits/japanese_master_index_v4/image_pointer_plan_v1.mjs',
  'scripts/audits/japanese_master_index_v4/image_pointer_rollback_proof_v1.mjs',
  'scripts/audits/self_hosted_images_wh22_common.mjs',
]);

export function proofHash(value) {
  return contentFingerprint(value);
}

export async function computeImagePointerCodeBundle() {
  const files = [];
  for (const relativePath of CODE_BUNDLE_PATHS) {
    const bytes = await fs.readFile(relativePath);
    files.push({
      relative_path: relativePath,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    });
  }
  return { files, hash: proofHash(files) };
}

async function loadDataset(descriptor) {
  const rows = [];
  for (const shardPath of descriptor.shard_paths) {
    const { artifact } = await readVerifiedArtifact(shardPath);
    rows.push(...artifact.content.rows);
  }
  if (rows.length !== descriptor.row_count
    || proofHash(rows) !== descriptor.content_fingerprint_sha256) {
    throw new Error(`Dataset verification failed: ${descriptor.dataset_key}`);
  }
  return rows;
}

export async function loadPermanentStorageAssets() {
  const { artifact } = await readVerifiedArtifact(STORAGE_PLAN_ARTIFACT);
  if (artifact.content_fingerprint_sha256 !== STORAGE_PLAN_CONTENT_FINGERPRINT) {
    throw new Error('Permanent Storage plan artifact changed.');
  }
  const assets = await loadDataset(artifact.content.asset_dataset);
  if (assets.length !== EXPECTED_IMAGE_POINTER_ROWS) {
    throw new Error(`Permanent Storage asset scope changed: ${assets.length}`);
  }
  const applyResult = JSON.parse(await fs.readFile(STORAGE_APPLY_RESULT, 'utf8'));
  const { proof_hash_sha256: applyProof, ...applyPayload } = applyResult;
  if (applyProof !== STORAGE_APPLY_PROOF_HASH
    || proofHash(applyPayload) !== applyProof
    || applyResult.status !== 'uploaded_verified_and_retained'
    || applyResult.durable_objects_after_run !== EXPECTED_IMAGE_POINTER_ROWS) {
    throw new Error('Permanent Storage apply proof is not valid.');
  }
  return assets;
}

function projectRefFromUrl(value) {
  const parsed = new URL(value);
  const match = parsed.hostname.toLowerCase().match(/^([a-z0-9]+)\.supabase\.co$/);
  if (parsed.protocol !== 'https:' || !match) {
    throw new Error('SUPABASE_URL is not a project-scoped HTTPS origin.');
  }
  return match[1];
}

export function createProductionSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase HTTPS credentials are unavailable.');
  const projectRef = projectRefFromUrl(url);
  if (projectRef !== TARGET_SUPABASE_PROJECT_REF) {
    throw new Error(`Wrong Supabase project: ${projectRef}`);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from(
    { length: Math.min(limit, values.length) },
    () => worker(),
  ));
  return output;
}

export async function reverifyStorageAssets(client, assets) {
  const rows = await mapLimit(assets, 8, async (asset) => {
    const { data, error } = await client.storage
      .from(asset.target_storage_bucket)
      .download(asset.target_storage_path);
    if (error || !data) {
      return {
        card_print_id: asset.card_print_id,
        gv_id: asset.gv_id,
        target_storage_path: asset.target_storage_path,
        verified: false,
        errors: [`download_failed:${error?.message ?? 'no data'}`],
      };
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    const observed = inspectImageBuffer(buffer, asset.source_expected.content_type);
    const errors = [];
    for (const key of ['size_bytes', 'sha256', 'width', 'height', 'format']) {
      if (observed[key] !== asset.source_expected[key]) errors.push(`${key}_mismatch`);
    }
    return {
      card_print_id: asset.card_print_id,
      gv_id: asset.gv_id,
      target_storage_bucket: asset.target_storage_bucket,
      target_storage_path: asset.target_storage_path,
      expected: asset.source_expected,
      observed,
      verified: errors.length === 0,
      errors,
    };
  });
  const failures = rows.filter((row) => !row.verified);
  if (failures.length) {
    throw new Error(`Storage reverification failed: ${JSON.stringify(failures)}`);
  }
  return rows;
}

export function proposedImageValues(current, asset) {
  return {
    image_note: IMAGE_POINTER_NOTE,
    image_path: asset.target_storage_path,
    image_status: 'exact',
  };
}

export function buildImagePointerRows(assets, currentRows, storageRows) {
  const currentById = new Map(currentRows.map((row) => [row.id, row]));
  const storageById = new Map(storageRows.map((row) => [row.card_print_id, row]));
  return assets.map((asset) => {
    const current = currentById.get(asset.card_print_id) ?? null;
    const storage = storageById.get(asset.card_print_id) ?? null;
    const validationErrors = [];
    if (!current) validationErrors.push('current_row_missing');
    if (!storage?.verified) validationErrors.push('storage_not_verified');
    if (current) {
      if (current.gv_id !== asset.gv_id) validationErrors.push('gv_id_mismatch');
      if (current.image_source !== 'identity') {
        validationErrors.push('image_source_not_identity');
      }
      if (!['ok', 'exact'].includes(current.image_status)) {
        validationErrors.push('image_status_not_legacy_ok_or_exact');
      }
      if (typeof current.image_url !== 'string' || !current.image_url.trim()) {
        validationErrors.push('exact_external_fallback_missing');
      }
      if (current.image_path && current.image_path !== asset.target_storage_path) {
        validationErrors.push('different_existing_hosted_path');
      }
    }
    const proposedValues = current ? proposedImageValues(current, asset) : null;
    const expectedAfter = current ? { ...current, ...proposedValues } : null;
    const beforeHash = current ? proofHash(current) : null;
    const afterHash = expectedAfter ? proofHash(expectedAfter) : null;
    const alreadyAfter = current && beforeHash === afterHash;
    return {
      plan_version: IMAGE_POINTER_PLAN_VERSION,
      target_table: 'public.card_prints',
      target_row_id: asset.card_print_id,
      gv_id: asset.gv_id,
      name: asset.name,
      set_code: asset.set_code,
      number: asset.number,
      source_lane: asset.source_lane,
      target_storage_bucket: asset.target_storage_bucket,
      target_storage_path: asset.target_storage_path,
      storage_verified: storage?.verified === true,
      storage_observation: storage?.observed ?? null,
      current_row_snapshot: current,
      current_row_snapshot_hash: beforeHash,
      proposed_values: proposedValues,
      expected_after_snapshot: expectedAfter,
      expected_after_snapshot_hash: afterHash,
      preserved_values: current ? {
        image_url: current.image_url,
        image_source: current.image_source,
        representative_image_url: current.representative_image_url,
      } : null,
      allowed_apply_columns: ALLOWED_IMAGE_POINTER_COLUMNS,
      row_disposition: validationErrors.length
        ? 'blocked'
        : alreadyAfter
          ? 'already_applied_no_op'
          : 'rollback_proof_update_required',
      validation_errors: validationErrors,
      database_write_performed: false,
      storage_write_performed: false,
    };
  });
}

export function pointerPackageFingerprint(assets, pointerRows, codeBundleHash) {
  return proofHash({
    plan_version: IMAGE_POINTER_PLAN_VERSION,
    target: {
      supabase_project_ref: TARGET_SUPABASE_PROJECT_REF,
      storage_bucket: TARGET_STORAGE_BUCKET,
      table: 'public.card_prints',
    },
    permanent_storage_plan_fingerprint_sha256: STORAGE_PLAN_CONTENT_FINGERPRINT,
    permanent_storage_apply_proof_hash_sha256: STORAGE_APPLY_PROOF_HASH,
    code_bundle_hash_sha256: codeBundleHash,
    mutation_contract: IMAGE_POINTER_MUTATION_CONTRACT,
    assets: assets.map((asset) => ({
      card_print_id: asset.card_print_id,
      gv_id: asset.gv_id,
      target_storage_path: asset.target_storage_path,
      source_expected: asset.source_expected,
    })),
    pointer_rows: pointerRows,
  });
}

export function pointerPlanHash(fingerprint, codeBundleHash, pointerRows) {
  return proofHash({
    plan_version: IMAGE_POINTER_PLAN_VERSION,
    fingerprint,
    code_bundle_hash_sha256: codeBundleHash,
    mutation_contract: IMAGE_POINTER_MUTATION_CONTRACT,
    rows: pointerRows.map((row) => ({
      target_row_id: row.target_row_id,
      gv_id: row.gv_id,
      current_row_snapshot_hash: row.current_row_snapshot_hash,
      expected_after_snapshot_hash: row.expected_after_snapshot_hash,
      proposed_values: row.proposed_values,
      target_storage_path: row.target_storage_path,
      row_disposition: row.row_disposition,
    })),
  });
}
