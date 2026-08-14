import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  EXPECTED_ASSET_COUNT,
  ONE_PIECE_ST01_READINESS_FINGERPRINT,
  ONE_PIECE_ST01_READINESS_ROWS_SHA256,
  TARGET_STORAGE_BUCKET,
  TARGET_SUPABASE_PROJECT_REF,
  validateOnePieceSt01StorageAssets,
} from "./one_piece_st01_storage_collision_preflight_v1.mjs";
import {
  sha256,
  stableJson,
} from "./one_piece_st01_language_and_image_readiness_v1.mjs";

export const ONE_PIECE_ST01_STORAGE_PERMANENT_VERSION =
  "ONE_PIECE_ST01_STORAGE_PERMANENT_V1";
export const ONE_PIECE_ST01_STORAGE_PREFLIGHT_FINGERPRINT =
  "760733af1a85a828b56206334fdebab8acd3d8246cd938a9d82f05632c4be01b";
export const ONE_PIECE_ST01_STORAGE_PREFLIGHT_RUN_PLAN_SHA256 =
  "de07430b33e079675d0f04ba2ecb8e5d18eacc01c6c739c4b9c5c507952ca4a8";
export const ONE_PIECE_ST01_STORAGE_PREFLIGHT_COLLISION_ROWS_SHA256 =
  "46aecb10a27b73cff095790564c3cf064fa4adc9f559a7f36285459b4b4927da";
export const ONE_PIECE_ST01_STORAGE_PREFLIGHT_CACHE_READBACK_SHA256 =
  "8105b3e808a141a7666eb092b207564569e03e81014733910b74f390b9c9782d";
export const ONE_PIECE_ST01_STORAGE_PREFLIGHT_SUMMARY_SHA256 =
  "42bc07db978c58cc061c79f080c880831e6bf0d78e6112b0b6fc8612413478b2";

export const ONE_PIECE_ST01_STORAGE_CODE_BUNDLE_PATHS = Object.freeze([
  "backend/pricing/one_piece_st01_language_and_image_readiness_v1.mjs",
  "backend/pricing/one_piece_st01_storage_collision_preflight_v1.mjs",
  "backend/pricing/one_piece_st01_storage_permanent_v1.mjs",
  "scripts/audits/one_piece_st01_storage_permanent_plan_v1.mjs",
  "scripts/audits/one_piece_st01_storage_permanent_apply_v1.mjs",
]);

export async function computeOnePieceSt01StorageCodeBundle(root) {
  const files = [];
  for (const relativePath of ONE_PIECE_ST01_STORAGE_CODE_BUNDLE_PATHS) {
    const bytes = await fs.readFile(path.join(root, relativePath));
    files.push({ path: relativePath, bytes: bytes.length, sha256: sha256(bytes) });
  }
  return { files, sha256: sha256(stableJson(files)) };
}

export function buildOnePieceSt01PermanentAssets(preflightAssets) {
  const assets = preflightAssets.map((asset) => ({
    ...asset,
    success_lifecycle: "upload_readback_verify_and_retain",
    failure_recovery: "remove_only_objects_created_by_this_execution",
  }));
  const findings = validateOnePieceSt01PermanentAssets(assets);
  if (findings.length > 0) {
    throw new Error(`Permanent Storage assets invalid: ${findings.join(",")}`);
  }
  return assets;
}

export function validateOnePieceSt01PermanentAssets(assets) {
  const findings = [...validateOnePieceSt01StorageAssets(assets)];
  for (const asset of assets) {
    const extension = asset.source_expected?.format === "jpg"
      ? "jpg"
      : asset.source_expected?.format;
    const expectedSuffix = `/${asset.source_expected?.sha256?.slice(0, 24)}.${extension}`;
    if (!asset.target_storage_path?.endsWith(expectedSuffix)) {
      findings.push(`content_address_mismatch:${asset.source_product_id}`);
    }
    if (asset.success_lifecycle !== "upload_readback_verify_and_retain" ||
        asset.failure_recovery !== "remove_only_objects_created_by_this_execution") {
      findings.push(`lifecycle_mismatch:${asset.source_product_id}`);
    }
  }
  return [...new Set(findings)];
}

export function permanentStorageApprovalPayload({ assets, codeBundleSha256 }) {
  return {
    version: ONE_PIECE_ST01_STORAGE_PERMANENT_VERSION,
    source_evidence: {
      readiness_fingerprint_sha256: ONE_PIECE_ST01_READINESS_FINGERPRINT,
      readiness_rows_sha256: ONE_PIECE_ST01_READINESS_ROWS_SHA256,
      collision_preflight_fingerprint_sha256:
        ONE_PIECE_ST01_STORAGE_PREFLIGHT_FINGERPRINT,
      collision_preflight_run_plan_sha256:
        ONE_PIECE_ST01_STORAGE_PREFLIGHT_RUN_PLAN_SHA256,
      collision_preflight_rows_sha256:
        ONE_PIECE_ST01_STORAGE_PREFLIGHT_COLLISION_ROWS_SHA256,
      collision_preflight_cache_readback_sha256:
        ONE_PIECE_ST01_STORAGE_PREFLIGHT_CACHE_READBACK_SHA256,
      collision_preflight_summary_sha256:
        ONE_PIECE_ST01_STORAGE_PREFLIGHT_SUMMARY_SHA256,
    },
    target: {
      supabase_project_ref: TARGET_SUPABASE_PROJECT_REF,
      storage_bucket: TARGET_STORAGE_BUCKET,
    },
    code_bundle_sha256: codeBundleSha256,
    assets,
    execution_policy: {
      exact_assets: EXPECTED_ASSET_COUNT,
      source_bytes_staged_before_first_storage_access: true,
      fresh_collision_check_before_first_upload: true,
      all_target_objects_must_be_absent_before_first_upload: true,
      existing_target_object_is_hard_stop: true,
      upsert: false,
      overwrite_allowed: false,
      post_upload_download_required: true,
      exact_readback_hash_size_dimensions_format_required: true,
      successful_uploads_are_retained: true,
      rollback_on_any_failure: true,
      rollback_scope: "only_objects_created_by_this_execution",
      post_rollback_absence_verification_required: true,
      durable_objects_expected_on_success: EXPECTED_ASSET_COUNT,
      durable_objects_expected_on_failure: 0,
      sealed_assets_allowed: false,
      database_connections_allowed: false,
      database_reads_allowed: false,
      database_writes_allowed: false,
      image_pointer_writes_allowed: false,
      canonical_mutations_allowed: false,
    },
  };
}

export function permanentStorageApprovalFingerprint(payload) {
  return sha256(stableJson(payload));
}

export function permanentStoragePlanHash({ approvalFingerprint, codeBundleSha256 }) {
  return sha256(stableJson({
    version: ONE_PIECE_ST01_STORAGE_PERMANENT_VERSION,
    approval_fingerprint_sha256: approvalFingerprint,
    code_bundle_sha256: codeBundleSha256,
    durable_storage_mutations: ["upload", "download_readback", "retain_on_success"],
    failure_recovery: ["remove_new_objects", "verify_absent"],
    exact_assets: EXPECTED_ASSET_COUNT,
    database_writes_expected: 0,
    pointer_writes_expected: 0,
  }));
}

export function resultProofHash(result) {
  const { proof_hash_sha256: ignored, ...payload } = result;
  return crypto.createHash("sha256").update(stableJson(payload)).digest("hex");
}
