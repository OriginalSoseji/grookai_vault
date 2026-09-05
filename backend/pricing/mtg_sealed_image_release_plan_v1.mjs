import { createHash } from 'node:crypto';

import {
  deterministicUuidV5,
  stableJson,
} from './one_piece_canonical_import_staging_v1.mjs';
import {
  MTG_SEALED_GAME_KEY,
  MTG_SEALED_REVIEWER_ID,
} from './mtg_sealed_world_v1.mjs';

export const MTG_SEALED_IMAGE_RELEASE_PLAN_VERSION_V1 =
  'MTG_SEALED_IMAGE_RELEASE_PLAN_V1';
export const MTG_SEALED_IMAGE_EVIDENCE_CONTRACT_VERSION_V1 =
  'MTG_SEALED_IMAGE_EVIDENCE_V1';
export const MTG_SEALED_IMAGE_OBJECT_CONTRACT_VERSION_V1 =
  'MTG_SEALED_IMAGE_OBJECT_V1';
export const MTG_SEALED_IMAGE_ASSERTION_CONTRACT_VERSION_V1 =
  'MTG_SEALED_VARIANT_IMAGE_ASSERTION_V1';
export const MTG_SEALED_IMAGE_RELEASE_CONTRACT_VERSION_V1 =
  'MTG_SEALED_IMAGE_RELEASE_V1';
export const MTG_SEALED_IMAGE_POINTER_CONTRACT_VERSION_V1 =
  'SEALED_PRODUCT_IMAGE_RELEASE_POINTER_V1';

const ELIGIBLE_CLASSIFICATIONS = new Set([
  'exact_image_ready',
  'shared_bytes_exact_variant',
]);
const EXPECTED_COUNTS = Object.freeze({
  source_members: 2182,
  evidence: 2182,
  eligible_variants: 2149,
  exclusions: 33,
  objects: 2141,
  assertions: 2149,
  releases: 1,
  release_members: 2149,
});

export function hashMtgSealedImageReleasePlanV1(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return createHash('sha256').update(bytes).digest('hex');
}

function hashStable(value) {
  return hashMtgSealedImageReleasePlanV1(stableJson(value));
}

// PostgreSQL jsonb array text uses a space after each comma. The image release
// schema hashes only arrays containing strings, integers, and nested arrays.
export function postgresJsonbArrayTextV1(value) {
  if (Array.isArray(value)) {
    return `[${value.map(postgresJsonbArrayTextV1).join(', ')}]`;
  }
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('Unsafe manifest integer');
    return String(value);
  }
  if (typeof value !== 'string') {
    throw new Error('Manifest values must be strings, integers, arrays, or null');
  }
  return JSON.stringify(value);
}

function pgArrayHash(value) {
  return hashMtgSealedImageReleasePlanV1(postgresJsonbArrayTextV1(value));
}

function required(value, label) {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${label} is required`);
  }
  return value;
}

function exactImageFields(image) {
  return {
    image_mime: image?.content_type ?? null,
    image_width: image?.width ?? null,
    image_height: image?.height ?? null,
    image_bytes: image?.size_bytes ?? null,
    content_sha256: image?.sha256 ?? null,
  };
}

function evidenceRow(coverage, context) {
  const selectedSourceUrl = coverage.retrieval?.selected_source_url ??
    coverage.source_image_url;
  const core = {
    game_key: MTG_SEALED_GAME_KEY,
    variant_id: coverage.variant_id,
    source_mapping_id: coverage.source_mapping_id,
    source_release_member_id: coverage.release_member_id,
    source_provider: coverage.source_provider,
    source_category_id: Number(coverage.source_category_id),
    source_group_id: Number(coverage.source_group_id),
    source_product_id: Number(coverage.source_product_id),
    source_image_url: selectedSourceUrl,
    selected_source_role: coverage.retrieval?.selected_role ?? null,
    retrieved_at: coverage.retrieval?.retrieved_at,
    http_status: coverage.retrieval?.http_status ?? null,
    ...exactImageFields(coverage.image),
    classification: coverage.classification,
    source_plan_fingerprint: context.sourcePlanFingerprint,
    coverage_fingerprint: context.coverageFingerprint,
    evidence_contract_version: MTG_SEALED_IMAGE_EVIDENCE_CONTRACT_VERSION_V1,
  };
  const evidenceFingerprint = hashStable({
    type: 'sealed_product_image_evidence',
    ...core,
  });
  return {
    id: deterministicUuidV5(`mtg:sealed:image-evidence:${evidenceFingerprint}`),
    ...core,
    evidence_fingerprint: evidenceFingerprint,
  };
}

function objectRow(object, result, verifiedAt) {
  const image = result.exact_readback;
  const core = {
    game_key: MTG_SEALED_GAME_KEY,
    storage_bucket: object.target_storage_bucket,
    object_path: object.durable_object_path,
    content_sha256: object.content_sha256,
    image_mime: image.content_type,
    image_width: image.width,
    image_height: image.height,
    image_bytes: image.size_bytes,
    storage_readback_sha256: image.sha256,
    storage_verified_at: verifiedAt,
    object_contract_version: MTG_SEALED_IMAGE_OBJECT_CONTRACT_VERSION_V1,
  };
  const objectFingerprint = hashStable({
    type: 'sealed_product_image_object',
    ...core,
  });
  return {
    id: deterministicUuidV5(`mtg:sealed:image-object:${objectFingerprint}`),
    ...core,
    object_fingerprint: objectFingerprint,
  };
}

function assertionRow(evidence, object) {
  const core = {
    game_key: MTG_SEALED_GAME_KEY,
    variant_id: evidence.variant_id,
    source_mapping_id: evidence.source_mapping_id,
    image_evidence_id: evidence.id,
    image_object_id: object.id,
    assertion_state: 'exact_verified',
    assertion_contract_version:
      MTG_SEALED_IMAGE_ASSERTION_CONTRACT_VERSION_V1,
  };
  const assertionFingerprint = hashStable({
    type: 'sealed_product_variant_image_assertion',
    ...core,
  });
  return {
    id: deterministicUuidV5(`mtg:sealed:image-assertion:${assertionFingerprint}`),
    ...core,
    assertion_fingerprint: assertionFingerprint,
  };
}

export function imageReleaseMemberFingerprintV1({
  imageReleaseId,
  variantId,
  assertion,
  evidence,
  object,
}) {
  return pgArrayHash([
    'SEALED_PRODUCT_IMAGE_RELEASE_MEMBER_V1',
    imageReleaseId,
    MTG_SEALED_GAME_KEY,
    variantId,
    assertion.id,
    assertion.assertion_fingerprint,
    evidence.evidence_fingerprint,
    object.object_fingerprint,
  ]);
}

export function imageReleaseManifestFingerprintV1(release, members) {
  const memberManifest = [...members]
    .sort((left, right) => left.variant_id.localeCompare(right.variant_id) ||
      left.image_assertion_id.localeCompare(right.image_assertion_id))
    .map((member) => [
      member.variant_id,
      member.image_assertion_id,
      member.member_fingerprint,
    ]);
  return pgArrayHash([
    'SEALED_PRODUCT_IMAGE_RELEASE_MANIFEST_V1',
    release.id,
    release.game_key,
    release.source_price_release_id,
    release.source_audit_producer_sha,
    release.source_plan_fingerprint,
    release.coverage_fingerprint,
    release.release_contract_version,
    release.expected_member_count,
    members.length,
    memberManifest,
  ]);
}

function exactReadbackMismatch(object, result) {
  const expected = object.expected_image;
  const actual = result?.exact_readback;
  return !actual || result.status === undefined ||
    actual.valid_image !== true || actual.placeholder_suspected === true ||
    actual.sha256 !== expected.content_sha256 ||
    actual.content_type !== expected.content_type ||
    actual.format !== expected.format ||
    actual.width !== expected.width || actual.height !== expected.height ||
    actual.size_bytes !== expected.size_bytes ||
    result.object_path !== object.durable_object_path;
}

export function buildMtgSealedImageReleasePlanV1({
  coverageRows,
  coverageSummary,
  coverageManifest,
  durableObjects,
  durablePlan,
  durableResults,
  durableSummary,
  verifiedAtByObjectPath,
  repositoryCommitSha,
  productionSnapshot,
}) {
  required(repositoryCommitSha, 'repository commit SHA');
  const sourcePlanFingerprint =
    coverageSummary.source_plan_fingerprint_sha256;
  const coverageFingerprint =
    coverageSummary.coverage_fingerprint_sha256;
  const sourcePriceReleaseId = coverageSummary.release_id;
  const sourceProducerSha = coverageManifest.workflow?.producer_sha ??
    coverageSummary.repository?.commit_sha;
  const context = { sourcePlanFingerprint, coverageFingerprint };

  const resultsByPath = new Map(durableResults.map((row) =>
    [row.object_path, row]));
  const objectRows = durableObjects.map((object) => {
    const result = resultsByPath.get(object.durable_object_path);
    if (exactReadbackMismatch(object, result)) {
      throw new Error(`Durable exact readback mismatch: ${object.durable_object_path}`);
    }
    const verifiedAt = verifiedAtByObjectPath.get(object.durable_object_path);
    required(verifiedAt, `Storage verification time for ${object.durable_object_path}`);
    return objectRow(object, result, verifiedAt);
  }).sort((left, right) => left.id.localeCompare(right.id));
  const objectsByHash = new Map(objectRows.map((row) =>
    [row.content_sha256, row]));

  const evidence = coverageRows.map((row) => evidenceRow(row, context))
    .sort((left, right) => left.id.localeCompare(right.id));
  const eligibleEvidence = evidence.filter((row) =>
    ELIGIBLE_CLASSIFICATIONS.has(row.classification));
  const exclusions = evidence.filter((row) =>
    !ELIGIBLE_CLASSIFICATIONS.has(row.classification));
  const assertions = eligibleEvidence.map((row) => {
    const object = objectsByHash.get(row.content_sha256);
    if (!object) {
      throw new Error(`Eligible evidence has no verified object: ${row.variant_id}`);
    }
    return assertionRow(row, object);
  }).sort((left, right) => left.id.localeCompare(right.id));

  const releaseId = deterministicUuidV5(
    `mtg:sealed:image-release:${sourcePriceReleaseId}:${sourcePlanFingerprint}:` +
    coverageFingerprint,
  );
  const releaseBase = {
    id: releaseId,
    game_key: MTG_SEALED_GAME_KEY,
    release_key: `mtg-sealed-image-${coverageFingerprint.slice(0, 20)}`,
    release_state: 'draft',
    source_price_release_id: sourcePriceReleaseId,
    source_audit_producer_sha: sourceProducerSha,
    source_plan_fingerprint: sourcePlanFingerprint,
    coverage_fingerprint: coverageFingerprint,
    release_contract_version: MTG_SEALED_IMAGE_RELEASE_CONTRACT_VERSION_V1,
    expected_member_count: assertions.length,
    created_by: MTG_SEALED_REVIEWER_ID,
  };
  const evidenceById = new Map(evidence.map((row) => [row.id, row]));
  const objectsById = new Map(objectRows.map((row) => [row.id, row]));
  const members = assertions.map((assertion) => {
    const evidenceRowValue = evidenceById.get(assertion.image_evidence_id);
    const object = objectsById.get(assertion.image_object_id);
    const memberFingerprint = imageReleaseMemberFingerprintV1({
      imageReleaseId: releaseId,
      variantId: assertion.variant_id,
      assertion,
      evidence: evidenceRowValue,
      object,
    });
    return {
      id: deterministicUuidV5(
        `mtg:sealed:image-release-member:${memberFingerprint}`),
      image_release_id: releaseId,
      game_key: MTG_SEALED_GAME_KEY,
      variant_id: assertion.variant_id,
      image_assertion_id: assertion.id,
      member_fingerprint: memberFingerprint,
    };
  }).sort((left, right) => left.id.localeCompare(right.id));
  const release = {
    ...releaseBase,
    manifest_fingerprint: imageReleaseManifestFingerprintV1(releaseBase, members),
  };

  const payload = {
    evidence,
    objects: objectRows,
    assertions,
    releases: [release],
    release_members: members,
  };
  const datasets = Object.fromEntries(Object.entries(payload).map(([key, rows]) =>
    [key, { row_count: rows.length, logical_fingerprint_sha256: hashStable(rows) }]));
  datasets.exclusions = {
    row_count: exclusions.length,
    logical_fingerprint_sha256: hashStable(exclusions),
  };
  const body = {
    version: MTG_SEALED_IMAGE_RELEASE_PLAN_VERSION_V1,
    mode: 'production_read_only_plan',
    producer_commit_sha: repositoryCommitSha,
    game_key: MTG_SEALED_GAME_KEY,
    source_price_release_id: sourcePriceReleaseId,
    source_plan_fingerprint_sha256: sourcePlanFingerprint,
    source_coverage_fingerprint_sha256: coverageFingerprint,
    source_durable_plan_fingerprint_sha256:
      durablePlan.plan_fingerprint_sha256,
    source_durable_execution_fingerprint_sha256:
      durableSummary.execution_fingerprint_sha256,
    release_id: release.id,
    release_manifest_fingerprint_sha256: release.manifest_fingerprint,
    datasets,
    production_snapshot: productionSnapshot,
    collision_policy: {
      exact_complete_release: 'idempotent_zero_row_rerun',
      empty_target_tables: 'insert_exact_frozen_payload_under_separate_authority',
      partial_exact_collision: 'hard_stop_no_write',
      mismatched_id_or_fingerprint: 'hard_stop_no_write',
      existing_mtg_image_pointer: 'require_exact_compare_and_swap',
    },
    apply_sequence: [
      'fresh_read_only_preflight_and_authority_reconciliation',
      'single_transaction_insert_evidence_objects_assertions_release_members',
      'database_manifest_parity_check',
      'freeze_release_with_exact_manifest',
      'inside_transaction_exact_readback',
      'commit_without_pointer_activation',
      'independent_read_only_post_apply_readback',
      'zero_row_idempotency_preflight',
    ],
    pointer_transition: {
      included_in_current_apply_gate: false,
      target_image_release_id: release.id,
      expected_current_image_release_id:
        productionSnapshot.current_image_release_id ?? null,
      pointer_contract_version: MTG_SEALED_IMAGE_POINTER_CONTRACT_VERSION_V1,
      function: 'sealed_product_set_active_image_release_v1(uuid,uuid,uuid)',
      separate_authority_required: true,
      reason: 'evidence release must be frozen and independently read back first',
    },
    rollback: {
      before_commit: 'rollback_entire_transaction_on_any_mismatch',
      after_evidence_commit: 'append_only_evidence_remains_inactive_without_pointer',
      pointer_canary: 'set_pointer_inside_transaction_then_rollback_to_exact_baseline',
      durable_pointer_activation:
        'separate gate after rollback canary and exact frozen-release readback',
      destructive_delete_allowed: false,
    },
    required_post_apply_readback: {
      exact_row_counts: EXPECTED_COUNTS,
      exact_ids_and_fingerprints: true,
      manifest_function_matches_plan: true,
      release_state: 'frozen',
      pointer_unchanged: true,
      rls_forced_and_enabled: true,
      app_table_grants: 'none',
      service_table_grants: 'frozen_schema_contract',
      cross_game_and_product_boundaries_unchanged: true,
    },
    boundaries: {
      database_connections: 1,
      database_reads: 1,
      database_writes: 0,
      storage_reads: 0,
      storage_writes: 0,
      storage_deletes: 0,
      image_evidence_writes: 0,
      image_release_writes: 0,
      image_pointer_writes: 0,
      pricing_writes: 0,
      release_pointer_writes: 0,
      visibility_writes: 0,
      vault_writes: 0,
      signer_deployments: 0,
      client_activations: 0,
      cross_game_writes: 0,
    },
  };
  const planFingerprint = hashStable(body);
  return {
    plan: {
      ...body,
      plan_fingerprint_sha256: planFingerprint,
      required_future_authority_template:
        `I approve the durable MTG sealed database image-evidence release apply ` +
        `from <EXECUTION_COMMIT_SHA>, using source coverage fingerprint ` +
        `${coverageFingerprint}, durable Storage execution fingerprint ` +
        `${durableSummary.execution_fingerprint_sha256}, image release plan ` +
        `fingerprint ${planFingerprint}, and <EXECUTION_FINGERPRINT>. This ` +
        `authorizes one transaction inserting exactly ${evidence.length} ` +
        `evidence rows, ${objectRows.length} object rows, ${assertions.length} ` +
        `assertions, 1 draft release, and ${members.length} release members, ` +
        `then freezing that release after exact manifest verification. It ` +
        `authorizes no image pointer, Storage, pricing, visibility, Vault, ` +
        `signer, client, cross-game, update, or delete operation.`,
    },
    payload,
    exclusions,
  };
}

function duplicates(rows, key) {
  const values = rows.map(key);
  return values.length - new Set(values).size;
}

export function validateMtgSealedImageReleasePlanV1(bundle, expected = {}) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const plan = bundle?.plan ?? {};
  const payload = bundle?.payload ?? {};
  const counts = { ...EXPECTED_COUNTS, ...expected };
  const { plan_fingerprint_sha256: fingerprint, required_future_authority_template: _authority,
    ...body } = plan;
  add(plan.version !== MTG_SEALED_IMAGE_RELEASE_PLAN_VERSION_V1,
    'version_mismatch');
  add(fingerprint !== hashStable(body), 'plan_fingerprint_mismatch');
  add((payload.evidence ?? []).length !== counts.evidence,
    'evidence_count_mismatch');
  add((payload.objects ?? []).length !== counts.objects, 'object_count_mismatch');
  add((payload.assertions ?? []).length !== counts.assertions,
    'assertion_count_mismatch');
  add((payload.releases ?? []).length !== counts.releases,
    'release_count_mismatch');
  add((payload.release_members ?? []).length !== counts.release_members,
    'release_member_count_mismatch');
  add((bundle.exclusions ?? []).length !== counts.exclusions,
    'exclusion_count_mismatch');
  for (const [name, rows] of Object.entries(payload)) {
    add(duplicates(rows, (row) => row.id) !== 0, `duplicate_id:${name}`);
  }
  add(duplicates(payload.evidence ?? [], (row) => row.source_release_member_id) !== 0,
    'duplicate_source_release_member_evidence');
  add(duplicates(payload.evidence ?? [], (row) => row.variant_id) !== 0,
    'duplicate_variant_evidence');
  add(duplicates(payload.objects ?? [], (row) => row.object_path) !== 0,
    'duplicate_object_path');
  add(duplicates(payload.assertions ?? [], (row) => row.variant_id) !== 0,
    'duplicate_variant_assertion');
  add(duplicates(payload.release_members ?? [], (row) => row.variant_id) !== 0,
    'duplicate_release_variant');

  const evidenceById = new Map((payload.evidence ?? []).map((row) => [row.id, row]));
  const objectById = new Map((payload.objects ?? []).map((row) => [row.id, row]));
  const assertionById = new Map((payload.assertions ?? []).map((row) => [row.id, row]));
  const release = payload.releases?.[0];
  for (const assertion of payload.assertions ?? []) {
    const evidence = evidenceById.get(assertion.image_evidence_id);
    const object = objectById.get(assertion.image_object_id);
    add(!evidence || !object, `assertion_reference_missing:${assertion.id}`);
    add(Boolean(evidence && object) && (
      evidence.variant_id !== assertion.variant_id ||
      evidence.source_mapping_id !== assertion.source_mapping_id ||
      evidence.content_sha256 !== object.content_sha256 ||
      evidence.image_mime !== object.image_mime ||
      evidence.image_width !== object.image_width ||
      evidence.image_height !== object.image_height ||
      evidence.image_bytes !== object.image_bytes
    ), `assertion_exact_binding_mismatch:${assertion.id}`);
  }
  for (const member of payload.release_members ?? []) {
    const assertion = assertionById.get(member.image_assertion_id);
    const evidence = assertion && evidenceById.get(assertion.image_evidence_id);
    const object = assertion && objectById.get(assertion.image_object_id);
    add(!assertion || !evidence || !object,
      `release_member_reference_missing:${member.id}`);
    if (assertion && evidence && object && release) {
      add(member.member_fingerprint !== imageReleaseMemberFingerprintV1({
        imageReleaseId: release.id,
        variantId: member.variant_id,
        assertion,
        evidence,
        object,
      }), `release_member_fingerprint_mismatch:${member.id}`);
    }
  }
  if (release) {
    add(release.expected_member_count !== (payload.release_members ?? []).length,
      'release_expected_member_count_mismatch');
    add(release.manifest_fingerprint !== imageReleaseManifestFingerprintV1(
      release, payload.release_members ?? []), 'release_manifest_mismatch');
    add(release.release_state !== 'draft', 'release_not_draft');
  }
  add((payload.evidence ?? []).some((row) =>
    row.game_key !== MTG_SEALED_GAME_KEY ||
    row.evidence_contract_version !==
      MTG_SEALED_IMAGE_EVIDENCE_CONTRACT_VERSION_V1), 'evidence_scope_mismatch');
  add((payload.objects ?? []).some((row) =>
    row.game_key !== MTG_SEALED_GAME_KEY ||
    row.storage_readback_sha256 !== row.content_sha256 ||
    !row.object_path.includes(`/sha256/${row.content_sha256.slice(0, 2)}/`) ||
    !row.object_path.includes(row.content_sha256)), 'object_scope_mismatch');
  add((bundle.exclusions ?? []).some((row) =>
    ELIGIBLE_CLASSIFICATIONS.has(row.classification)),
  'eligible_row_in_exclusions');
  add(plan.pointer_transition?.included_in_current_apply_gate !== false,
    'pointer_included_in_apply_gate');
  add(Object.entries(plan.boundaries ?? {}).some(([key, value]) =>
    key !== 'database_connections' && key !== 'database_reads' && value !== 0),
  'write_boundary_overclaim');
  add(plan.production_snapshot?.valid !== true, 'production_snapshot_invalid');
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export { EXPECTED_COUNTS as MTG_SEALED_IMAGE_RELEASE_EXPECTED_COUNTS_V1 };
