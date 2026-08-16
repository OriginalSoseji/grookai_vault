import {
  sha256,
  stableJson,
} from "./one_piece_st01_language_and_image_readiness_v1.mjs";

export const ONE_PIECE_ST01_STORAGE_PREFLIGHT_VERSION =
  "ONE_PIECE_ST01_STORAGE_COLLISION_PREFLIGHT_V1";
export const ONE_PIECE_ST01_READINESS_FINGERPRINT =
  "e98d7e21fd828765165f6fde5a897c24104e8d9dabaeebe3808950a886190468";
export const ONE_PIECE_ST01_READINESS_ROWS_SHA256 =
  "6fd5b77b764bf1a8400bc02f271781499321759b6a45d108e5f18571c7555c89";
export const TARGET_SUPABASE_PROJECT_REF = "ycdxbpibncqcchqiihfz";
export const TARGET_STORAGE_BUCKET = "user-card-images";
export const EXPECTED_ASSET_COUNT = 18;

export function buildOnePieceSt01StorageAssets(readinessRows) {
  const assets = readinessRows
    .filter((row) =>
      row.image?.target_path_status === "proposed_content_addressed_card_path")
    .sort((left, right) => Number(left.row_ordinal) - Number(right.row_ordinal))
    .map((row, index) => ({
      position: index + 1,
      row_ordinal: Number(row.row_ordinal),
      staging_row_id: row.staging_row_id,
      source_product_id: Number(row.source_product_id),
      source_product_name: row.source_product_name,
      review_lane: row.review_lane,
      card_number: row.card_number,
      proposed_parent_gv_id: row.proposed_parent_gv_id,
      source_url: row.image.selected_source.requested_url,
      source_role: row.image.selected_source.role,
      source_expected: {
        content_type: row.image.selected_source.content_type,
        size_bytes: Number(row.image.selected_source.size_bytes),
        sha256: row.image.selected_source.sha256,
        width: Number(row.image.selected_source.width),
        height: Number(row.image.selected_source.height),
        format: row.image.selected_source.format,
      },
      local_cache_path: row.image.local_cache_path,
      local_cache_sha256: row.image.local_cache_sha256,
      target_storage_bucket: TARGET_STORAGE_BUCKET,
      target_storage_path: row.image.target_storage_path,
      upload_policy: {
        upsert: false,
        overwrite_allowed: false,
        cache_control: "31536000",
      },
      database_reads_allowed: false,
      database_writes_allowed: false,
      pointer_writes_allowed: false,
    }));
  const findings = validateOnePieceSt01StorageAssets(assets);
  if (findings.length > 0) {
    throw new Error(`Storage asset plan invalid: ${findings.join(",")}`);
  }
  return assets;
}

export function validateOnePieceSt01StorageAssets(assets) {
  const findings = [];
  if (assets.length !== EXPECTED_ASSET_COUNT) {
    findings.push("asset_count_not_18");
  }
  if (new Set(assets.map((row) => row.source_product_id)).size !== assets.length) {
    findings.push("duplicate_source_product_id");
  }
  if (new Set(assets.map((row) => row.target_storage_path)).size !== assets.length) {
    findings.push("duplicate_target_storage_path");
  }
  if (new Set(assets.map((row) => row.source_expected.sha256)).size !== assets.length) {
    findings.push("duplicate_source_image_sha256");
  }
  for (const asset of assets) {
    if (!["numbered_card_parent_identity_review",
      "don_card_variant_identity_review"].includes(asset.review_lane)) {
      findings.push(`non_card_or_don_lane:${asset.source_product_id}`);
    }
    if (!asset.target_storage_path.startsWith(
      "warehouse-derived/self-hosted-images-v1/card_prints/one-piece/st01/")) {
      findings.push(`target_prefix_mismatch:${asset.source_product_id}`);
    }
    if (!/^[0-9a-f]{64}$/.test(asset.source_expected.sha256 ?? "") ||
        asset.local_cache_sha256 !== asset.source_expected.sha256) {
      findings.push(`source_hash_invalid:${asset.source_product_id}`);
    }
    if (!asset.proposed_parent_gv_id || !asset.local_cache_path ||
        !asset.source_url?.startsWith("https://")) {
      findings.push(`asset_identity_incomplete:${asset.source_product_id}`);
    }
    if (asset.upload_policy.upsert || asset.upload_policy.overwrite_allowed ||
        asset.database_reads_allowed || asset.database_writes_allowed ||
        asset.pointer_writes_allowed) {
      findings.push(`mutation_boundary_invalid:${asset.source_product_id}`);
    }
  }
  return findings;
}

export function buildOnePieceSt01StorageRunPlan({ repository, assets }) {
  const core = {
    version: ONE_PIECE_ST01_STORAGE_PREFLIGHT_VERSION,
    repository,
    source_readiness_fingerprint_sha256:
      ONE_PIECE_ST01_READINESS_FINGERPRINT,
    source_readiness_rows_sha256: ONE_PIECE_ST01_READINESS_ROWS_SHA256,
    target: {
      supabase_project_ref: TARGET_SUPABASE_PROJECT_REF,
      storage_bucket: TARGET_STORAGE_BUCKET,
    },
    assets,
    boundaries: {
      exact_assets: EXPECTED_ASSET_COUNT,
      storage_list_reads_allowed: true,
      storage_downloads_allowed: false,
      storage_uploads_allowed: false,
      storage_removals_allowed: false,
      database_connections_allowed: false,
      database_writes_allowed: false,
      pointer_updates_allowed: false,
      canonical_mutations_allowed: false,
      sealed_assets_included: false,
    },
  };
  return {
    ...core,
    plan_fingerprint_sha256: sha256(stableJson(core)),
  };
}

export function validateOnePieceSt01StorageRunPlan(plan) {
  const findings = [];
  const { plan_fingerprint_sha256: ignored, ...core } = plan ?? {};
  if (plan?.version !== ONE_PIECE_ST01_STORAGE_PREFLIGHT_VERSION) {
    findings.push("version_mismatch");
  }
  if (plan?.source_readiness_fingerprint_sha256 !==
      ONE_PIECE_ST01_READINESS_FINGERPRINT ||
      plan?.source_readiness_rows_sha256 !==
      ONE_PIECE_ST01_READINESS_ROWS_SHA256) {
    findings.push("source_binding_mismatch");
  }
  if (plan?.target?.supabase_project_ref !== TARGET_SUPABASE_PROJECT_REF ||
      plan?.target?.storage_bucket !== TARGET_STORAGE_BUCKET) {
    findings.push("target_binding_mismatch");
  }
  findings.push(...validateOnePieceSt01StorageAssets(plan?.assets ?? []));
  const boundaries = plan?.boundaries ?? {};
  if (!boundaries.storage_list_reads_allowed ||
      boundaries.storage_downloads_allowed || boundaries.storage_uploads_allowed ||
      boundaries.storage_removals_allowed ||
      boundaries.database_connections_allowed || boundaries.database_writes_allowed ||
      boundaries.pointer_updates_allowed || boundaries.canonical_mutations_allowed ||
      boundaries.sealed_assets_included) {
    findings.push("run_boundary_mismatch");
  }
  if (plan?.plan_fingerprint_sha256 !== sha256(stableJson(core))) {
    findings.push("plan_fingerprint_mismatch");
  }
  return [...new Set(findings)];
}
