import { createHash } from 'node:crypto';

export const MTG_SEALED_IMAGE_CANARY_PLAN_V1 =
  'MTG_SEALED_IMAGE_CANARY_PLAN_V1';
export const MTG_SEALED_IMAGE_STORAGE_BUCKET_V1 = 'user-card-images';
export const MTG_SEALED_IMAGE_COVERAGE_FINGERPRINT_V1 =
  'cf0e11f6bd5e990d48fa3b5e9a3f2f58d35a7314c28fe47cbab02f7cf07cdd0d';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stable(entry)]));
  }
  return value;
}

export function hashMtgSealedImageCanaryV1(value) {
  return createHash('sha256').update(
    typeof value === 'string' || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(stable(value)),
  ).digest('hex');
}

function clean(value) {
  return String(value ?? '').trim();
}

function eligible(row) {
  return ['exact_image_ready', 'shared_bytes_exact_variant']
    .includes(row?.classification) &&
    row?.game_key === 'mtg' &&
    row?.image?.valid_image === true &&
    row?.image?.placeholder_suspected === false &&
    /^[0-9a-f]{64}$/.test(row?.image?.sha256 ?? '') &&
    /^[0-9a-f-]{36}$/.test(row?.variant_id ?? '') &&
    /^[0-9a-f-]{36}$/.test(row?.release_member_id ?? '') &&
    /^[0-9a-f-]{36}$/.test(row?.source_mapping_id ?? '') &&
    clean(row?.retrieval?.selected_source_url).startsWith('https://') &&
    clean(row?.proposed_storage_path).startsWith('sealed/mtg/sha256/');
}

function extension(row) {
  const format = row.image.format;
  if (format === 'jpeg') return 'jpg';
  if (['png', 'gif', 'webp'].includes(format)) return format;
  throw new Error(`Unsupported image format: ${format}`);
}

function selectRows(rows, count) {
  const byHash = new Map();
  for (const row of [...rows].filter(eligible).sort((left, right) =>
    `${left.package_form}|${left.canonical_name}|${left.variant_id}`.localeCompare(
      `${right.package_form}|${right.canonical_name}|${right.variant_id}`))) {
    if (!byHash.has(row.image.sha256)) byHash.set(row.image.sha256, row);
  }
  const candidates = [...byHash.values()];
  if (candidates.length < count) {
    throw new Error(`Canary requires ${count} unique image objects`);
  }

  const selected = [];
  const shared = candidates.find((row) =>
    row.classification === 'shared_bytes_exact_variant');
  if (shared) selected.push(shared);

  const usedHashes = new Set(selected.map((row) => row.image.sha256));
  const groups = new Map();
  for (const row of candidates) {
    if (usedHashes.has(row.image.sha256)) continue;
    const key = clean(row.package_form) || 'unknown';
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  const groupKeys = [...groups.keys()].sort();
  let ordinal = 0;
  while (selected.length < count) {
    let added = false;
    for (const key of groupKeys) {
      const row = groups.get(key)[ordinal];
      if (!row || selected.length >= count) continue;
      selected.push(row);
      added = true;
    }
    if (!added) break;
    ordinal += 1;
  }
  if (selected.length !== count) {
    throw new Error(`Selected ${selected.length}; expected ${count}`);
  }
  return selected;
}

export function buildMtgSealedTransientImageCanaryPlanV1(rows, options = {}) {
  const count = Number(options.count ?? 17);
  const coverageFingerprint = options.coverageFingerprint ??
    MTG_SEALED_IMAGE_COVERAGE_FINGERPRINT_V1;
  if (!Number.isSafeInteger(count) || count < 1 || count > 50) {
    throw new Error('Canary count must be an integer from 1 through 50');
  }
  if (!/^[0-9a-f]{64}$/.test(coverageFingerprint)) {
    throw new Error('Exact coverage fingerprint is required');
  }
  const selected = selectRows(rows, count);
  const scope = hashMtgSealedImageCanaryV1({
    version: MTG_SEALED_IMAGE_CANARY_PLAN_V1,
    coverage_fingerprint: coverageFingerprint,
    count,
  }).slice(0, 20);
  const body = {
    version: MTG_SEALED_IMAGE_CANARY_PLAN_V1,
    mode: 'offline_plan_only',
    source_release_id: selected[0].release_id,
    source_coverage_fingerprint_sha256: coverageFingerprint,
    target_storage_bucket: MTG_SEALED_IMAGE_STORAGE_BUCKET_V1,
    canary_scope: scope,
    selection_policy: {
      exact_unique_content_hashes: true,
      package_form_stratified: true,
      shared_bytes_case_included_when_available: true,
      selected_count: count,
    },
    rows: selected.map((row, index) => ({
      canary_index: index,
      release_member_id: row.release_member_id,
      variant_id: row.variant_id,
      source_mapping_id: row.source_mapping_id,
      canonical_name: row.canonical_name,
      package_form: row.package_form,
      source_product_id: row.source_product_id,
      source_image_url: row.retrieval.selected_source_url,
      source_role: row.retrieval.selected_role,
      classification: row.classification,
      expected_image: {
        content_sha256: row.image.sha256,
        content_type: row.image.content_type,
        format: row.image.format,
        width: row.image.width,
        height: row.image.height,
        size_bytes: row.image.size_bytes,
      },
      transient_object_path:
        `sealed/mtg/canary/${scope}/${row.image.sha256}.${extension(row)}`,
      permanent_object_path: row.proposed_storage_path,
      collision_precondition: 'transient_path_must_be_absent',
      upload_upsert: false,
      required_readback: 'exact_bytes_sha256_dimensions_and_mime',
      rollback_ownership: 'remove_only_object_created_by_this_execution',
      required_absence_readback_after_cleanup: true,
    })),
    execution_requirements: {
      fresh_collision_preflight: true,
      exact_source_byte_retrieval: true,
      exact_storage_readback: true,
      remove_every_created_object: true,
      verify_every_created_object_absent: true,
      stop_on_first_mismatch: true,
      separately_authorized_execution_required: true,
    },
    boundaries: {
      provider_calls: 0,
      database_reads: 0,
      database_writes: 0,
      storage_reads: 0,
      storage_writes: 0,
      storage_deletes: 0,
      image_pointer_writes: 0,
      pricing_writes: 0,
      visibility_writes: 0,
      vault_writes: 0,
    },
  };
  return {
    ...body,
    plan_fingerprint_sha256: hashMtgSealedImageCanaryV1(body),
  };
}

export function validateMtgSealedTransientImageCanaryPlanV1(plan) {
  const findings = [];
  const add = (condition, finding) => {
    if (condition) findings.push(finding);
  };
  add(plan?.version !== MTG_SEALED_IMAGE_CANARY_PLAN_V1,
    'version_mismatch');
  add(plan?.mode !== 'offline_plan_only', 'mode_not_offline_plan_only');
  add(plan?.target_storage_bucket !== MTG_SEALED_IMAGE_STORAGE_BUCKET_V1,
    'storage_bucket_mismatch');
  add(!Array.isArray(plan?.rows) || plan.rows.length !==
    plan?.selection_policy?.selected_count, 'selected_count_mismatch');
  const rows = plan?.rows ?? [];
  add(new Set(rows.map((row) => row.variant_id)).size !== rows.length,
    'duplicate_variant_id');
  add(new Set(rows.map((row) => row.expected_image?.content_sha256)).size !==
    rows.length, 'duplicate_content_sha256');
  add(new Set(rows.map((row) => row.transient_object_path)).size !== rows.length,
    'duplicate_transient_object_path');
  add(rows.some((row) => !row.transient_object_path?.startsWith(
    `sealed/mtg/canary/${plan.canary_scope}/`)), 'canary_path_scope_violation');
  add(rows.some((row) => row.upload_upsert !== false ||
    row.collision_precondition !== 'transient_path_must_be_absent'),
  'unsafe_upload_semantics');
  add(rows.some((row) =>
    row.rollback_ownership !== 'remove_only_object_created_by_this_execution' ||
    row.required_absence_readback_after_cleanup !== true),
  'rollback_ownership_missing');
  add(Object.values(plan?.boundaries ?? {}).some((value) => value !== 0),
    'nonzero_planning_boundary');
  const { plan_fingerprint_sha256: ignored, ...body } = plan ?? {};
  add(plan?.plan_fingerprint_sha256 !== hashMtgSealedImageCanaryV1(body),
    'plan_fingerprint_mismatch');
  return { valid: findings.length === 0, findings };
}
