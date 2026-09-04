import { createHash } from 'node:crypto';

import {
  proposedMtgSealedStoragePathV1,
} from './mtg_sealed_image_coverage_v1.mjs';

export const MTG_SEALED_DURABLE_IMAGE_PLAN_V1 =
  'MTG_SEALED_DURABLE_IMAGE_PLAN_V1';
export const MTG_SEALED_DURABLE_IMAGE_BUCKET_V1 = 'user-card-images';
export const MTG_SEALED_DURABLE_IMAGE_COVERAGE_FINGERPRINT_V1 =
  'cf0e11f6bd5e990d48fa3b5e9a3f2f58d35a7314c28fe47cbab02f7cf07cdd0d';
export const MTG_SEALED_DURABLE_IMAGE_EXPECTATIONS_V1 = Object.freeze({
  selected_members: 2_182,
  eligible_variants: 2_149,
  eligible_objects: 2_141,
  exclusions: 33,
  source_reported_unique_valid_images: 2_144,
  excluded_placeholder_images: 3,
});
export const MTG_SEALED_DURABLE_IMAGE_SHARD_SIZE_V1 = 100;
export const MTG_SEALED_DURABLE_IMAGE_SOURCE_RETRIES_V1 = 2;
export const MTG_SEALED_DURABLE_IMAGE_MAX_SOURCE_BYTES_V1 = 20_000_000;

const ALLOWED_SOURCE_HOSTS = new Set([
  'product-images.tcgplayer.com',
  'tcgplayer-cdn.tcgplayer.com',
]);
const ELIGIBLE_CLASSIFICATIONS = new Set([
  'exact_image_ready',
  'shared_bytes_exact_variant',
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stable(entry)]));
  }
  return value;
}

export function hashMtgSealedDurableImagePlanV1(value) {
  return createHash('sha256').update(
    typeof value === 'string' || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(stable(value)),
  ).digest('hex');
}

function clean(value) {
  return String(value ?? '').trim();
}

function isEligible(row) {
  return ELIGIBLE_CLASSIFICATIONS.has(row?.classification);
}

function sourceUrlIsAllowed(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' &&
      ALLOWED_SOURCE_HOSTS.has(parsed.hostname.toLowerCase()) &&
      !parsed.username && !parsed.password && !parsed.hash;
  } catch {
    return false;
  }
}

function expectedImage(row) {
  return {
    content_sha256: row.image.sha256,
    content_type: row.image.content_type,
    format: row.image.format,
    width: row.image.width,
    height: row.image.height,
    size_bytes: row.image.size_bytes,
  };
}

function sourceFor(row) {
  return {
    source_image_url: row.retrieval.selected_source_url,
    source_role: row.retrieval.selected_role,
    source_product_id: row.source_product_id,
    source_mapping_id: row.source_mapping_id,
    release_member_id: row.release_member_id,
    variant_id: row.variant_id,
  };
}

function supportFor(row) {
  return {
    release_member_id: row.release_member_id,
    member_fingerprint: row.member_fingerprint,
    variant_id: row.variant_id,
    family_id: row.family_id,
    source_mapping_id: row.source_mapping_id,
    source_product_id: row.source_product_id,
    canonical_name: row.canonical_name,
    package_form: row.package_form,
    language_code: row.language_code,
    classification: row.classification,
  };
}

function buildObject(group, index) {
  const ordered = [...group].sort((left, right) =>
    clean(left.variant_id).localeCompare(clean(right.variant_id)));
  const first = ordered[0];
  const sources = [...new Map(ordered.map((row) => {
    const source = sourceFor(row);
    return [`${source.source_image_url}|${source.source_mapping_id}`, source];
  })).values()].sort((left, right) =>
    `${left.source_image_url}|${left.source_mapping_id}`.localeCompare(
      `${right.source_image_url}|${right.source_mapping_id}`));
  const body = {
    object_index: index,
    content_sha256: first.image.sha256,
    target_storage_bucket: MTG_SEALED_DURABLE_IMAGE_BUCKET_V1,
    durable_object_path: first.proposed_storage_path,
    expected_image: expectedImage(first),
    primary_source: sources[0],
    additional_exact_source_evidence: sources.slice(1),
    supporting_variants: ordered.map(supportFor),
    operation_policy: {
      collision_preflight: 'read_existing_object_and_compare_exact_bytes',
      exact_existing_object: 'reuse_without_upload_or_overwrite',
      mismatched_existing_object: 'hard_stop_without_overwrite_or_delete',
      absent_object: 'upload_with_upsert_false_then_exact_readback',
      upload_upsert: false,
      overwrite_allowed: false,
      successful_exact_object_lifecycle: 'retain_for_durable_resume',
      failed_new_upload_lifecycle:
        'remove_only_current_attempt_object_then_verify_absent',
    },
  };
  return {
    ...body,
    object_fingerprint_sha256: hashMtgSealedDurableImagePlanV1(body),
  };
}

function buildExclusion(row, index) {
  const body = {
    exclusion_index: index,
    release_member_id: row.release_member_id,
    member_fingerprint: row.member_fingerprint,
    variant_id: row.variant_id,
    family_id: row.family_id,
    source_mapping_id: row.source_mapping_id,
    source_product_id: row.source_product_id,
    canonical_name: row.canonical_name,
    package_form: row.package_form,
    language_code: row.language_code,
    classification: row.classification,
    exclusion_reason: `source_coverage_${row.classification}`,
    retrieval: row.retrieval,
    observed_image: row.image,
    durable_object_path: null,
  };
  return {
    ...body,
    exclusion_fingerprint_sha256: hashMtgSealedDurableImagePlanV1(body),
  };
}

export function buildMtgSealedDurableImageShardsV1(objects, shardSize =
  MTG_SEALED_DURABLE_IMAGE_SHARD_SIZE_V1) {
  if (!Number.isSafeInteger(shardSize) || shardSize < 1 || shardSize > 500) {
    throw new Error('Shard size must be an integer from 1 through 500');
  }
  const shards = [];
  for (let offset = 0; offset < objects.length; offset += shardSize) {
    const rows = objects.slice(offset, offset + shardSize);
    const body = {
      shard_index: shards.length,
      shard_key: `shard_${String(shards.length + 1).padStart(3, '0')}`,
      first_object_index: rows[0].object_index,
      last_object_index: rows.at(-1).object_index,
      object_count: rows.length,
      expected_bytes: rows.reduce((total, row) =>
        total + row.expected_image.size_bytes, 0),
      maximum_source_request_attempts:
        rows.length * (MTG_SEALED_DURABLE_IMAGE_SOURCE_RETRIES_V1 + 1),
      object_fingerprints: rows.map((row) => row.object_fingerprint_sha256),
    };
    shards.push({
      ...body,
      shard_fingerprint_sha256: hashMtgSealedDurableImagePlanV1(body),
    });
  }
  return shards;
}

function defaultExpectations(options) {
  return {
    ...MTG_SEALED_DURABLE_IMAGE_EXPECTATIONS_V1,
    ...(options.expectations ?? {}),
  };
}

export function buildMtgSealedDurableImagePlanV1(rows, options = {}) {
  const expectations = defaultExpectations(options);
  const coverageFingerprint = options.coverageFingerprint ??
    MTG_SEALED_DURABLE_IMAGE_COVERAGE_FINGERPRINT_V1;
  const producerCommitSha = clean(options.producerCommitSha);
  if (!/^[0-9a-f]{64}$/.test(coverageFingerprint)) {
    throw new Error('Exact source coverage fingerprint is required');
  }
  if (!/^[0-9a-f]{40}$/.test(producerCommitSha)) {
    throw new Error('Exact 40-character producer commit SHA is required');
  }

  const ordered = [...rows].sort((left, right) =>
    clean(left.release_member_id).localeCompare(clean(right.release_member_id)));
  const eligible = ordered.filter(isEligible);
  const excluded = ordered.filter((row) => !isEligible(row));
  const byHash = new Map();
  for (const row of eligible) {
    const group = byHash.get(row.image?.sha256) ?? [];
    group.push(row);
    byHash.set(row.image?.sha256, group);
  }
  const objects = [...byHash.values()]
    .sort((left, right) => clean(left[0].proposed_storage_path)
      .localeCompare(clean(right[0].proposed_storage_path)))
    .map((group, index) => buildObject(group, index));
  const exclusions = excluded.map((row, index) => buildExclusion(row, index));
  const shards = buildMtgSealedDurableImageShardsV1(objects,
    options.shardSize ?? MTG_SEALED_DURABLE_IMAGE_SHARD_SIZE_V1);
  const totalExpectedBytes = objects.reduce((total, row) =>
    total + row.expected_image.size_bytes, 0);
  const maximumSourceRequestAttempts = objects.length *
    (MTG_SEALED_DURABLE_IMAGE_SOURCE_RETRIES_V1 + 1);
  const objectPlanFingerprint = hashMtgSealedDurableImagePlanV1(objects);
  const exclusionFingerprint = hashMtgSealedDurableImagePlanV1(exclusions);
  const shardPlanFingerprint = hashMtgSealedDurableImagePlanV1(shards);
  const placeholderHashes = new Set(excluded.filter((row) =>
    row.classification === 'placeholder' && row.image?.valid_image)
    .map((row) => row.image.sha256));
  const sourceReportedUnique = Number(options.sourceReportedUniqueValidImages ??
    expectations.source_reported_unique_valid_images);

  const body = {
    version: MTG_SEALED_DURABLE_IMAGE_PLAN_V1,
    mode: 'offline_plan_only',
    producer_commit_sha: producerCommitSha,
    source_release_id: ordered[0]?.release_id ?? null,
    source_coverage_fingerprint_sha256: coverageFingerprint,
    source_artifacts: options.sourceArtifacts ?? null,
    target_storage_bucket: MTG_SEALED_DURABLE_IMAGE_BUCKET_V1,
    datasets: {
      objects: {
        row_count: objects.length,
        logical_fingerprint_sha256: objectPlanFingerprint,
      },
      exclusions: {
        row_count: exclusions.length,
        logical_fingerprint_sha256: exclusionFingerprint,
      },
      shards: {
        row_count: shards.length,
        logical_fingerprint_sha256: shardPlanFingerprint,
      },
    },
    reconciliation: {
      selected_members: ordered.length,
      eligible_variants: eligible.length,
      eligible_unique_objects: objects.length,
      exclusions: exclusions.length,
      shared_content_deduplication_count: eligible.length - objects.length,
      eligible_expected_bytes: totalExpectedBytes,
      source_reported_unique_valid_images: sourceReportedUnique,
      excluded_valid_placeholder_hashes: placeholderHashes.size,
      corrected_unique_eligible_images: objects.length,
      source_accounting_correction:
        sourceReportedUnique === objects.length + placeholderHashes.size
          ? 'source_summary_count_included_excluded_placeholder_hashes'
          : 'source_summary_requires_manual_reconciliation',
    },
    execution_policy: {
      shard_size: options.shardSize ?? MTG_SEALED_DURABLE_IMAGE_SHARD_SIZE_V1,
      shard_count: shards.length,
      maximum_concurrency: 10,
      source_fetch_retries: MTG_SEALED_DURABLE_IMAGE_SOURCE_RETRIES_V1,
      maximum_source_request_attempts: maximumSourceRequestAttempts,
      maximum_source_bytes_per_object:
        MTG_SEALED_DURABLE_IMAGE_MAX_SOURCE_BYTES_V1,
      tls_trust_policy: 'node_bundled_plus_windows_system_ca',
      tls_certificate_verification_required: true,
      custom_ca_overrides_allowed: false,
      redirects_allowed: false,
      upload_upsert: false,
      overwrite_allowed: false,
      exact_readback_required:
        'sha256_size_dimensions_format_and_content_type',
      durable_commit_unit: 'one_content_addressed_object_after_exact_readback',
      verified_objects_retained_on_interruption: true,
      resume_requires_exact_plan_fingerprint: true,
      resume_existing_object_policy:
        'exact_readback_reuse_or_mismatch_hard_stop',
      write_ahead_journal_required: true,
      per_object_terminal_state_required: true,
      whole_plan_reconciliation_required_before_database_evidence: true,
      rollback_scope:
        'only_unverified_objects_created_by_the_current_execution_attempt',
      preexisting_objects_never_removed: true,
      mismatched_objects_never_overwritten_or_removed: true,
    },
    future_execution_authority: {
      separately_authorized_execution_required: true,
      execution_commit_sha_required: true,
      execution_fingerprint_required: true,
      plan_fingerprint_required: true,
      source_coverage_fingerprint_required: true,
      exact_object_and_variant_counts_required: true,
      current_plan_grants_storage_authority: false,
    },
    boundaries: {
      provider_calls: 0,
      database_connections: 0,
      database_reads: 0,
      database_writes: 0,
      storage_reads: 0,
      storage_writes: 0,
      storage_deletes: 0,
      image_evidence_writes: 0,
      image_pointer_writes: 0,
      pricing_writes: 0,
      release_pointer_writes: 0,
      visibility_writes: 0,
      vault_writes: 0,
      cross_game_writes: 0,
    },
  };
  const planFingerprint = hashMtgSealedDurableImagePlanV1(body);
  return {
    plan: {
      ...body,
      plan_fingerprint_sha256: planFingerprint,
      required_future_authority_template:
        `I approve the durable MTG sealed image Storage execution from ` +
        `<EXECUTION_COMMIT_SHA>, using source coverage fingerprint ` +
        `${coverageFingerprint}, durable plan fingerprint ${planFingerprint}, ` +
        `and <EXECUTION_FINGERPRINT>. This authorizes collision readback, ` +
        `retrieval of exactly ${objects.length} frozen unique images with at ` +
        `most ${MTG_SEALED_DURABLE_IMAGE_SOURCE_RETRIES_V1} transport retries ` +
        `per object and ${maximumSourceRequestAttempts} total source request ` +
        `attempts, upsert=false durable upload and exact readback for ` +
        `${objects.length} content-addressed objects covering ` +
        `${eligible.length} variants, and resumable retention only after ` +
        `exact readback. It preserves ${exclusions.length} exclusions and ` +
        `authorizes no database, image-evidence, pointer, pricing, release, ` +
        `visibility, Vault, client, or cross-game writes.`,
    },
    objects,
    exclusions,
    shards,
  };
}

export function classifyMtgSealedDurableImageCollisionV1({
  exists,
  observedImage,
  expectedImage: expected,
}) {
  if (!exists) {
    return { decision: 'upload_absent_object', hard_stop: false };
  }
  const fields = [
    'content_sha256', 'content_type', 'format', 'width', 'height', 'size_bytes',
  ];
  const mismatches = fields.filter((field) =>
    observedImage?.[field] !== expected?.[field]);
  if (mismatches.length === 0) {
    return { decision: 'reuse_preexisting_exact_object', hard_stop: false };
  }
  return {
    decision: 'hard_stop_mismatched_existing_object',
    hard_stop: true,
    mismatches,
  };
}

export function validateMtgSealedDurableImagePlanV1(bundle, options = {}) {
  const findings = [];
  const add = (condition, finding) => {
    if (condition) findings.push(finding);
  };
  const expectations = defaultExpectations(options);
  const plan = bundle?.plan ?? {};
  const objects = bundle?.objects ?? [];
  const exclusions = bundle?.exclusions ?? [];
  const shards = bundle?.shards ?? [];
  add(plan.version !== MTG_SEALED_DURABLE_IMAGE_PLAN_V1, 'version_mismatch');
  add(plan.mode !== 'offline_plan_only', 'mode_not_offline_plan_only');
  add(plan.source_coverage_fingerprint_sha256 !==
    (options.coverageFingerprint ??
      MTG_SEALED_DURABLE_IMAGE_COVERAGE_FINGERPRINT_V1),
  'coverage_fingerprint_mismatch');
  add(plan.target_storage_bucket !== MTG_SEALED_DURABLE_IMAGE_BUCKET_V1,
    'storage_bucket_mismatch');
  add(objects.length !== expectations.eligible_objects,
    'eligible_object_count_mismatch');
  add(exclusions.length !== expectations.exclusions, 'exclusion_count_mismatch');
  add(plan.reconciliation?.selected_members !== expectations.selected_members,
    'selected_member_count_mismatch');
  add(plan.reconciliation?.eligible_variants !== expectations.eligible_variants,
    'eligible_variant_count_mismatch');
  add(plan.reconciliation?.eligible_unique_objects !== objects.length,
    'object_reconciliation_mismatch');
  add(plan.reconciliation?.exclusions !== exclusions.length,
    'exclusion_reconciliation_mismatch');
  add(plan.reconciliation?.shared_content_deduplication_count !==
    expectations.eligible_variants - expectations.eligible_objects,
  'deduplication_count_mismatch');

  const objectHashes = objects.map((row) => row.content_sha256);
  const objectPaths = objects.map((row) => row.durable_object_path);
  const eligibleMemberIds = objects.flatMap((row) =>
    row.supporting_variants.map((entry) => entry.release_member_id));
  const eligibleVariantIds = objects.flatMap((row) =>
    row.supporting_variants.map((entry) => entry.variant_id));
  const excludedMemberIds = exclusions.map((row) => row.release_member_id);
  const excludedVariantIds = exclusions.map((row) => row.variant_id);
  add(new Set(objectHashes).size !== objects.length, 'duplicate_object_hash');
  add(new Set(objectPaths).size !== objects.length, 'duplicate_object_path');
  add(new Set(eligibleMemberIds).size !== eligibleMemberIds.length,
    'duplicate_eligible_release_member');
  add(new Set(eligibleVariantIds).size !== eligibleVariantIds.length,
    'duplicate_eligible_variant');
  add(new Set([...eligibleMemberIds, ...excludedMemberIds]).size !==
    expectations.selected_members, 'member_partition_mismatch');
  add(new Set([...eligibleVariantIds, ...excludedVariantIds]).size !==
    expectations.selected_members, 'variant_partition_mismatch');
  add(eligibleVariantIds.length !== expectations.eligible_variants,
    'eligible_variant_support_count_mismatch');

  for (const row of objects) {
    const expectedPath = proposedMtgSealedStoragePathV1({
      sha256: row.expected_image?.content_sha256,
      format: row.expected_image?.format,
    });
    add(row.content_sha256 !== row.expected_image?.content_sha256,
      'object_expected_hash_mismatch');
    add(row.durable_object_path !== expectedPath, 'object_path_mismatch');
    add(row.target_storage_bucket !== MTG_SEALED_DURABLE_IMAGE_BUCKET_V1,
      'object_bucket_mismatch');
    add(!sourceUrlIsAllowed(row.primary_source?.source_image_url),
      'source_url_not_allowed');
    add(row.additional_exact_source_evidence.some((source) =>
      !sourceUrlIsAllowed(source.source_image_url)),
    'additional_source_evidence_not_allowed');
    add(row.supporting_variants.length < 1, 'object_variant_support_missing');
    add(row.supporting_variants.some((entry) =>
      !ELIGIBLE_CLASSIFICATIONS.has(entry.classification)),
    'ineligible_variant_in_object');
    add(row.operation_policy?.upload_upsert !== false ||
      row.operation_policy?.overwrite_allowed !== false,
    'unsafe_object_upload_policy');
    add(row.expected_image?.size_bytes < 1 ||
      row.expected_image?.size_bytes >
        MTG_SEALED_DURABLE_IMAGE_MAX_SOURCE_BYTES_V1,
    'object_size_out_of_bounds');
    const { object_fingerprint_sha256: ignored, ...body } = row;
    add(row.object_fingerprint_sha256 !==
      hashMtgSealedDurableImagePlanV1(body), 'object_fingerprint_mismatch');
  }
  add(exclusions.some((row) => row.durable_object_path !== null ||
    ELIGIBLE_CLASSIFICATIONS.has(row.classification)),
  'invalid_exclusion');
  add(new Set(excludedMemberIds).size !== excludedMemberIds.length,
    'duplicate_excluded_release_member');
  add(new Set(excludedVariantIds).size !== excludedVariantIds.length,
    'duplicate_excluded_variant');
  for (const row of exclusions) {
    const { exclusion_fingerprint_sha256: ignored, ...body } = row;
    add(row.exclusion_fingerprint_sha256 !==
      hashMtgSealedDurableImagePlanV1(body), 'exclusion_fingerprint_mismatch');
  }

  add(plan.datasets?.objects?.row_count !== objects.length ||
    plan.datasets?.objects?.logical_fingerprint_sha256 !==
      hashMtgSealedDurableImagePlanV1(objects), 'object_dataset_mismatch');
  add(plan.datasets?.exclusions?.row_count !== exclusions.length ||
    plan.datasets?.exclusions?.logical_fingerprint_sha256 !==
      hashMtgSealedDurableImagePlanV1(exclusions), 'exclusion_dataset_mismatch');
  add(plan.datasets?.shards?.row_count !== shards.length ||
    plan.datasets?.shards?.logical_fingerprint_sha256 !==
      hashMtgSealedDurableImagePlanV1(shards), 'shard_dataset_mismatch');
  add(hashMtgSealedDurableImagePlanV1(buildMtgSealedDurableImageShardsV1(
    objects, plan.execution_policy?.shard_size)) !==
    hashMtgSealedDurableImagePlanV1(shards), 'shard_derivation_mismatch');
  add(plan.execution_policy?.maximum_source_request_attempts !==
    objects.length * (MTG_SEALED_DURABLE_IMAGE_SOURCE_RETRIES_V1 + 1),
  'source_request_ceiling_mismatch');
  add(plan.execution_policy?.upload_upsert !== false ||
    plan.execution_policy?.overwrite_allowed !== false,
  'unsafe_upload_policy');
  add(plan.execution_policy?.tls_certificate_verification_required !== true ||
    plan.execution_policy?.custom_ca_overrides_allowed !== false,
  'unsafe_tls_policy');
  add(plan.execution_policy?.preexisting_objects_never_removed !== true ||
    plan.execution_policy?.mismatched_objects_never_overwritten_or_removed !==
      true, 'unsafe_collision_policy');
  add(plan.reconciliation?.source_reported_unique_valid_images !==
    expectations.source_reported_unique_valid_images,
  'source_reported_unique_count_mismatch');
  add(plan.reconciliation?.excluded_valid_placeholder_hashes !==
    expectations.excluded_placeholder_images,
  'placeholder_hash_count_mismatch');
  add(plan.reconciliation?.source_reported_unique_valid_images !==
    objects.length + plan.reconciliation?.excluded_valid_placeholder_hashes,
  'source_accounting_correction_mismatch');
  add(plan.reconciliation?.source_accounting_correction !==
    'source_summary_count_included_excluded_placeholder_hashes',
  'source_accounting_correction_missing');
  add(plan.future_execution_authority?.current_plan_grants_storage_authority !==
    false, 'planning_grants_storage_authority');
  add(Object.values(plan.boundaries ?? {}).some((value) => value !== 0),
    'nonzero_planning_boundary');
  const {
    plan_fingerprint_sha256: ignoredFingerprint,
    required_future_authority_template: ignoredAuthority,
    ...body
  } = plan;
  add(plan.plan_fingerprint_sha256 !== hashMtgSealedDurableImagePlanV1(body),
    'plan_fingerprint_mismatch');
  return { valid: findings.length === 0, findings: [...new Set(findings)].sort() };
}
