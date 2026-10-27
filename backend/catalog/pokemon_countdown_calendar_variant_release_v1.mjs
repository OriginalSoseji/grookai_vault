import assert from 'node:assert/strict';
import crypto from 'node:crypto';

export const VERSION = 'POKEMON_COUNTDOWN_CALENDAR_VARIANT_RELEASE_PACKAGE_V1';
export const PROJECT_REF = 'ycdxbpibncqcchqiihfz';
export const EXPECTED_ROWS = 22;
const SHA1 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function exactKeys(value, keys, label) {
  assert.deepEqual(Object.keys(value ?? {}).sort(), [...keys].sort(), label);
}

function assertTargets(targets, proposal, plan) {
  assert.ok(Array.isArray(targets));
  assert.equal(targets.length, EXPECTED_ROWS);
  for (const target of targets) {
    assert.ok(Number.isSafeInteger(target.source_product_id) && target.source_product_id > 0);
    assert.equal(target.target_mapping_id, -target.source_product_id);
    assert.equal(target.evidence?.proposal_fingerprint_sha256, proposal.fingerprint_sha256);
    assert.equal(target.evidence?.plan_fingerprint_sha256, plan.fingerprint_sha256);
  }
  for (const field of ['source_product_id', 'target_parent_id', 'target_child_id', 'target_parent_gv_id', 'target_printing_gv_id']) {
    assert.equal(new Set(targets.map((target) => String(target[field]))).size, EXPECTED_ROWS,
      `countdown_release_duplicate_target:${field}`);
  }
  return [...targets].sort((left, right) => left.source_product_id - right.source_product_id);
}

export function assertCountdownRollbackReceiptV1(receipt, { proposal, plan, now = Date.now() } = {}) {
  assert.equal(receipt?.version, 'POKEMON_COUNTDOWN_CALENDAR_VARIANT_ROLLBACK_REHEARSAL_V1');
  assert.equal(receipt?.project_ref, PROJECT_REF);
  assert.equal(receipt?.proposal_fingerprint_sha256, proposal.fingerprint_sha256);
  assert.equal(receipt?.plan_fingerprint_sha256, plan.fingerprint_sha256);
  assert.equal(receipt?.scope?.source_group_id, 2155);
  assert.equal(receipt?.scope?.target_count, EXPECTED_ROWS);
  assert.equal(receipt?.durable_database_writes_performed, false);
  assert.equal(receipt?.transaction_writes_rolled_back, true);
  assert.equal(receipt?.approvals_performed, false);
  assert.equal(receipt?.publication_performed, false);
  assert.equal(receipt?.customer_state_changed, false);
  assert.equal(receipt?.execution?.status, 'passed_rolled_back_no_durable_change');
  assert.deepEqual(receipt?.execution?.transaction, {
    commit_attempted: false,
    committed: false,
    commit_uncertain: false,
    rollback_attempted: true,
    rollback_proven: true,
    rollback_uncertain: false,
  });
  assert.deepEqual(receipt?.execution?.simulated_write_counts, {
    parent_inserts: EXPECTED_ROWS,
    identity_inserts: EXPECTED_ROWS,
    child_inserts: EXPECTED_ROWS,
    mapping_inserts: EXPECTED_ROWS,
  });
  assert.deepEqual(receipt?.execution?.proof, {
    parent_rows: EXPECTED_ROWS,
    identity_rows: EXPECTED_ROWS,
    child_rows: EXPECTED_ROWS,
    mapping_rows: EXPECTED_ROWS,
  });
  assert.equal(receipt?.execution?.rollback_verified, true);
  assert.equal(receipt?.execution?.mapping_sequence_unchanged, true);
  assert.equal(receipt?.execution?.explicit_mapping_ids_bypassed_sequence, true);
  assert.equal(
    receipt?.execution?.before?.target_snapshot?.hash_sha256,
    receipt?.execution?.after_rollback?.target_snapshot?.hash_sha256,
  );
  assert.deepEqual(
    receipt?.execution?.before?.mapping_sequence,
    receipt?.execution?.after_rollback?.mapping_sequence,
  );
  assert.match(receipt?.fingerprint_sha256 ?? '', SHA256);
  assert.equal(receipt.fingerprint_sha256, sha256(stableJson({
    version: receipt.version,
    project_ref: receipt.project_ref,
    proposal_fingerprint_sha256: receipt.proposal_fingerprint_sha256,
    plan_fingerprint_sha256: receipt.plan_fingerprint_sha256,
    scope: receipt.scope,
    execution: receipt.execution,
  })), 'countdown_release_rollback_receipt_fingerprint');
  const generatedAt = Date.parse(receipt?.generated_at ?? '');
  assert.ok(Number.isFinite(generatedAt) && generatedAt <= now && now - generatedAt < 15 * 60_000,
    'countdown_release_rollback_receipt_stale_or_future');
  return receipt;
}

export function buildCountdownReleasePackageV1({
  proposal,
  plan,
  rollbackReceipt,
  targets,
  sourceCommitSha,
  codeFiles,
  now = Date.now(),
}) {
  targets = assertTargets(targets, proposal, plan);
  assertCountdownRollbackReceiptV1(rollbackReceipt, { proposal, plan, now });
  assert.match(sourceCommitSha ?? '', SHA1, 'countdown_release_source_commit');
  assert.ok(Array.isArray(codeFiles) && codeFiles.length >= 4, 'countdown_release_code_files');
  const files = [...codeFiles].sort((left, right) => left.file.localeCompare(right.file));
  assert.equal(new Set(files.map((row) => row.file)).size, files.length, 'countdown_release_duplicate_code_file');
  for (const row of files) {
    exactKeys(row, ['file', 'sha256'], 'countdown_release_code_file_fields');
    assert.ok(row.file && !row.file.includes('\\'), 'countdown_release_code_file_path');
    assert.match(row.sha256 ?? '', SHA256, 'countdown_release_code_file_hash');
  }
  const requiredFiles = [
    'backend/catalog/master_index_printing_execution_guard_v1.mjs',
    'backend/catalog/pokemon_countdown_calendar_variant_release_v1.mjs',
    'scripts/audits/pokemon_countdown_calendar_variant_release_v1.mjs',
    'scripts/audits/pokemon_countdown_calendar_variant_rollback_rehearsal_v1.mjs',
  ];
  for (const file of requiredFiles) assert.ok(files.some((row) => row.file === file), `countdown_release_missing_code_file:${file}`);

  const core = {
    version: VERSION,
    project_ref: PROJECT_REF,
    source_commit_sha: sourceCommitSha,
    code: {
      files,
      fingerprint_sha256: sha256(stableJson(files)),
    },
    proposal_fingerprint_sha256: proposal.fingerprint_sha256,
    plan_fingerprint_sha256: plan.fingerprint_sha256,
    rollback_rehearsal_fingerprint_sha256: rollbackReceipt.fingerprint_sha256,
    target_manifest_fingerprint_sha256: sha256(stableJson(targets)),
    source_group_id: 2155,
    expected: {
      parent_inserts: EXPECTED_ROWS,
      identity_inserts: EXPECTED_ROWS,
      child_inserts: EXPECTED_ROWS,
      mapping_inserts: EXPECTED_ROWS,
      total_inserts: EXPECTED_ROWS * 4,
    },
    boundaries: {
      insert_only: true,
      updates: 0,
      deletes: 0,
      price_writes: 0,
      price_publication_writes: 0,
      customer_state_writes: 0,
      storage_object_writes: 0,
      exact_image_claims: 0,
    },
  };
  return assertCountdownReleasePackageV1({
    ...core,
    package_fingerprint_sha256: sha256(stableJson(core)),
  }, { proposal, plan, rollbackReceipt, targets, codeFiles });
}

export function assertCountdownReleasePackageV1(pkg, {
  proposal,
  plan,
  rollbackReceipt,
  targets,
  codeFiles,
  sourceCommitSha = null,
} = {}) {
  assert.equal(pkg?.version, VERSION);
  assert.equal(pkg?.project_ref, PROJECT_REF);
  assert.match(pkg?.source_commit_sha ?? '', SHA1);
  if (sourceCommitSha) assert.equal(pkg.source_commit_sha, sourceCommitSha);
  assert.match(pkg?.package_fingerprint_sha256 ?? '', SHA256);
  const { package_fingerprint_sha256: fingerprint, ...core } = pkg;
  assert.equal(sha256(stableJson(core)), fingerprint, 'countdown_release_package_fingerprint');
  assert.deepEqual(pkg.expected, {
    parent_inserts: EXPECTED_ROWS,
    identity_inserts: EXPECTED_ROWS,
    child_inserts: EXPECTED_ROWS,
    mapping_inserts: EXPECTED_ROWS,
    total_inserts: EXPECTED_ROWS * 4,
  });
  assert.deepEqual(pkg.boundaries, {
    insert_only: true,
    updates: 0,
    deletes: 0,
    price_writes: 0,
    price_publication_writes: 0,
    customer_state_writes: 0,
    storage_object_writes: 0,
    exact_image_claims: 0,
  });
  if (proposal && plan && targets) {
    targets = assertTargets(targets, proposal, plan);
    assert.equal(pkg.proposal_fingerprint_sha256, proposal.fingerprint_sha256);
    assert.equal(pkg.plan_fingerprint_sha256, plan.fingerprint_sha256);
    assert.equal(pkg.target_manifest_fingerprint_sha256, sha256(stableJson(targets)));
  }
  if (rollbackReceipt) assert.equal(pkg.rollback_rehearsal_fingerprint_sha256, rollbackReceipt.fingerprint_sha256);
  if (codeFiles) {
    const files = [...codeFiles].sort((left, right) => left.file.localeCompare(right.file));
    assert.deepEqual(pkg.code.files, files);
    assert.equal(pkg.code.fingerprint_sha256, sha256(stableJson(files)));
  }
  return pkg;
}

export function countdownReleaseApprovalTextV1(pkg) {
  assertCountdownReleasePackageV1(pkg);
  return [
    'APPROVE_COUNTDOWN_CALENDAR_2008_RELEASE_V1',
    `source_commit=${pkg.source_commit_sha}`,
    `package=${pkg.package_fingerprint_sha256}`,
    `proposal=${pkg.proposal_fingerprint_sha256}`,
    `plan=${pkg.plan_fingerprint_sha256}`,
    `rehearsal=${pkg.rollback_rehearsal_fingerprint_sha256}`,
    `rows=${EXPECTED_ROWS}`,
  ].join(' ');
}
