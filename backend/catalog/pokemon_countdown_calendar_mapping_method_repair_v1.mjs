import assert from 'node:assert/strict';
import crypto from 'node:crypto';

export const VERSION = 'POKEMON_COUNTDOWN_CALENDAR_MAPPING_METHOD_REPAIR_PACKAGE_V1';
export const PROJECT_REF = 'ycdxbpibncqcchqiihfz';
export const EXPECTED_ROWS = 22;
export const RELEASE_PACKAGE_FINGERPRINT = '868187f2bf807d8f7384936f605a6565f8d571f5bda53d1eed2f4f1a5fed97c7';
export const MAPPING_METHOD = 'exact_countdown_calendar_variant_authority_v1';
export const SOURCE_PRODUCT_IDS = Object.freeze([
  153083, 153085, 153086, 153087, 153088, 153089, 153090, 153091,
  153092, 153093, 153094, 153095, 153096, 153097, 153100, 153104,
  153105, 153106, 153107, 153108, 153109, 153110,
]);

const SHA1 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function assertRepairTargetsV1(targets) {
  assert.ok(Array.isArray(targets), 'countdown_mapping_repair_targets_required');
  assert.equal(targets.length, EXPECTED_ROWS, 'countdown_mapping_repair_target_count');
  const ordered = [...targets].sort((left, right) => left.source_product_id - right.source_product_id);
  assert.deepEqual(ordered.map((row) => row.source_product_id), [...SOURCE_PRODUCT_IDS],
    'countdown_mapping_repair_source_products');
  assert.equal(new Set(ordered.map((row) => String(row.mapping_id))).size, EXPECTED_ROWS,
    'countdown_mapping_repair_mapping_ids_unique');
  assert.equal(new Set(ordered.map((row) => row.card_print_id)).size, EXPECTED_ROWS,
    'countdown_mapping_repair_card_print_ids_unique');
  for (const row of ordered) {
    assert.ok(Number.isSafeInteger(Number(row.mapping_id)) && Number(row.mapping_id) > 0,
      'countdown_mapping_repair_mapping_id');
    assert.match(row.card_print_id ?? '', /^[a-f0-9-]{36}$/i, 'countdown_mapping_repair_card_print_id');
    assert.match(row.before_meta_fingerprint_sha256 ?? '', SHA256,
      'countdown_mapping_repair_before_meta_fingerprint');
    assert.equal(row.release_package_fingerprint_sha256, RELEASE_PACKAGE_FINGERPRINT,
      'countdown_mapping_repair_release_package_binding');
  }
  return ordered;
}

export function buildRepairMetaV1(beforeMeta, { targetManifestFingerprint, sourceCommitSha }) {
  assert.ok(beforeMeta && typeof beforeMeta === 'object' && !Array.isArray(beforeMeta),
    'countdown_mapping_repair_before_meta');
  assert.equal(beforeMeta.release_package_fingerprint_sha256, RELEASE_PACKAGE_FINGERPRINT,
    'countdown_mapping_repair_release_package_binding');
  assert.ok(!String(beforeMeta.mapping_method ?? '').trim(),
    'countdown_mapping_repair_mapping_method_already_present');
  assert.match(targetManifestFingerprint ?? '', SHA256, 'countdown_mapping_repair_target_manifest');
  assert.match(sourceCommitSha ?? '', SHA1, 'countdown_mapping_repair_source_commit');
  return {
    ...beforeMeta,
    mapping_method: MAPPING_METHOD,
    mapping_method_audit: {
      repair_version: VERSION,
      source_release_package_fingerprint_sha256: RELEASE_PACKAGE_FINGERPRINT,
      repair_target_manifest_fingerprint_sha256: targetManifestFingerprint,
      repair_source_commit_sha: sourceCommitSha,
      reason_code: 'release_mapping_method_omission',
    },
  };
}

export function buildRepairPackageV1({ targets, sourceCommitSha, codeFiles, rollbackProof }) {
  targets = assertRepairTargetsV1(targets);
  assert.match(sourceCommitSha ?? '', SHA1, 'countdown_mapping_repair_source_commit');
  assert.match(rollbackProof?.fingerprint_sha256 ?? '', SHA256,
    'countdown_mapping_repair_rollback_proof');
  assert.equal(rollbackProof?.status, 'passed_rolled_back_no_durable_change',
    'countdown_mapping_repair_rollback_status');
  assert.equal(rollbackProof?.updated_rows, EXPECTED_ROWS,
    'countdown_mapping_repair_rollback_rows');
  const files = [...codeFiles].sort((left, right) => left.file.localeCompare(right.file));
  assert.ok(files.length >= 3, 'countdown_mapping_repair_code_files');
  for (const row of files) {
    assert.ok(row.file && !row.file.includes('\\'), 'countdown_mapping_repair_code_file_path');
    assert.match(row.sha256 ?? '', SHA256, 'countdown_mapping_repair_code_file_hash');
  }
  const core = {
    version: VERSION,
    project_ref: PROJECT_REF,
    source_commit_sha: sourceCommitSha,
    source_release_package_fingerprint_sha256: RELEASE_PACKAGE_FINGERPRINT,
    mapping_method: MAPPING_METHOD,
    code: { files, fingerprint_sha256: sha256(stableJson(files)) },
    target_manifest_fingerprint_sha256: sha256(stableJson(targets)),
    rollback_proof_fingerprint_sha256: rollbackProof.fingerprint_sha256,
    expected: { external_mapping_metadata_updates: EXPECTED_ROWS, total_updates: EXPECTED_ROWS },
    boundaries: {
      inserts: 0,
      deletes: 0,
      card_identity_updates: 0,
      mapping_identity_updates: 0,
      price_writes: 0,
      price_publication_writes: 0,
      customer_state_writes: 0,
      storage_object_writes: 0,
    },
  };
  return assertRepairPackageV1({ ...core, package_fingerprint_sha256: sha256(stableJson(core)) });
}

export function assertRepairPackageV1(pkg) {
  assert.equal(pkg?.version, VERSION);
  assert.equal(pkg?.project_ref, PROJECT_REF);
  assert.match(pkg?.source_commit_sha ?? '', SHA1);
  assert.equal(pkg?.source_release_package_fingerprint_sha256, RELEASE_PACKAGE_FINGERPRINT);
  assert.equal(pkg?.mapping_method, MAPPING_METHOD);
  assert.match(pkg?.package_fingerprint_sha256 ?? '', SHA256);
  const { package_fingerprint_sha256: fingerprint, ...core } = pkg;
  assert.equal(fingerprint, sha256(stableJson(core)), 'countdown_mapping_repair_package_fingerprint');
  assert.deepEqual(pkg.expected, { external_mapping_metadata_updates: EXPECTED_ROWS, total_updates: EXPECTED_ROWS });
  assert.deepEqual(pkg.boundaries, {
    inserts: 0,
    deletes: 0,
    card_identity_updates: 0,
    mapping_identity_updates: 0,
    price_writes: 0,
    price_publication_writes: 0,
    customer_state_writes: 0,
    storage_object_writes: 0,
  });
  return pkg;
}

export function repairApprovalTextV1(pkg) {
  assertRepairPackageV1(pkg);
  return [
    'APPROVE_COUNTDOWN_CALENDAR_MAPPING_METHOD_REPAIR_V1',
    `source_commit=${pkg.source_commit_sha}`,
    `package=${pkg.package_fingerprint_sha256}`,
    `targets=${pkg.target_manifest_fingerprint_sha256}`,
    `rollback_proof=${pkg.rollback_proof_fingerprint_sha256}`,
    `rows=${EXPECTED_ROWS}`,
  ].join(' ');
}
