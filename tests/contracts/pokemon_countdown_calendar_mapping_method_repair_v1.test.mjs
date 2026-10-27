import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  EXPECTED_ROWS,
  MAPPING_METHOD,
  RELEASE_PACKAGE_FINGERPRINT,
  SOURCE_PRODUCT_IDS,
  assertRepairPackageV1,
  assertRepairTargetsV1,
  buildRepairMetaV1,
  buildRepairPackageV1,
  repairApprovalTextV1,
  sha256,
  stableJson,
} from '../../backend/catalog/pokemon_countdown_calendar_mapping_method_repair_v1.mjs';

function fixtures() {
  const targets = SOURCE_PRODUCT_IDS.map((sourceProductId, index) => {
    const beforeMeta = {
      authority: 'pokemon_countdown_calendar_variant_release_v1',
      source_group_id: 2155,
      source_product_name: `Card ${index}`,
      proposal_fingerprint_sha256: 'a'.repeat(64),
      plan_fingerprint_sha256: 'b'.repeat(64),
      rollback_proof_fingerprint_sha256: 'c'.repeat(64),
      release_package_fingerprint_sha256: RELEASE_PACKAGE_FINGERPRINT,
    };
    return {
      mapping_id: String(355514 + index),
      source_product_id: sourceProductId,
      card_print_id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      before_meta: beforeMeta,
      before_meta_fingerprint_sha256: sha256(stableJson(beforeMeta)),
      release_package_fingerprint_sha256: RELEASE_PACKAGE_FINGERPRINT,
      active_identity_count: 1,
      exact_printing_count: 1,
    };
  });
  const proofCore = {
    status: 'passed_rolled_back_no_durable_change',
    updated_rows: EXPECTED_ROWS,
  };
  const rollbackProof = { ...proofCore, fingerprint_sha256: sha256(stableJson(proofCore)) };
  const codeFiles = [
    'backend/catalog/pokemon_countdown_calendar_mapping_method_repair_v1.mjs',
    'backend/pricing/exact_mapping_execution_guard_v1.mjs',
    'scripts/audits/pokemon_countdown_calendar_mapping_method_repair_v1.mjs',
  ].map((file, index) => ({ file, sha256: String(index + 1).repeat(64).slice(0, 64) }));
  return { targets, rollbackProof, codeFiles, sourceCommitSha: 'd'.repeat(40) };
}

test('builds an exact 22-row metadata-only repair package and approval', () => {
  const input = fixtures();
  const pkg = buildRepairPackageV1(input);
  assertRepairPackageV1(pkg);
  assert.equal(pkg.mapping_method, MAPPING_METHOD);
  assert.equal(pkg.expected.external_mapping_metadata_updates, 22);
  assert.equal(pkg.boundaries.inserts, 0);
  assert.equal(pkg.boundaries.mapping_identity_updates, 0);
  assert.equal(pkg.boundaries.price_writes, 0);
  assert.match(repairApprovalTextV1(pkg), /^APPROVE_COUNTDOWN_CALENDAR_MAPPING_METHOD_REPAIR_V1 /);
  assert.match(repairApprovalTextV1(pkg), /rows=22$/);
});

test('repair metadata preserves provenance and adds only the precise method audit', () => {
  const { targets, sourceCommitSha } = fixtures();
  const manifest = sha256(stableJson(assertRepairTargetsV1(targets)));
  const before = targets[0].before_meta;
  const after = buildRepairMetaV1(before, { targetManifestFingerprint: manifest, sourceCommitSha });
  assert.deepEqual(Object.fromEntries(Object.keys(before).map((key) => [key, after[key]])), before);
  assert.equal(after.mapping_method, MAPPING_METHOD);
  assert.equal(after.mapping_method_audit.reason_code, 'release_mapping_method_omission');
  assert.equal(after.mapping_method_audit.repair_target_manifest_fingerprint_sha256, manifest);
  assert.throws(() => buildRepairMetaV1(after, { targetManifestFingerprint: manifest, sourceCommitSha }),
    /mapping_method_already_present/);
});

test('target validation rejects missing, duplicate, or identity-drifted rows', () => {
  for (const defect of ['missing', 'duplicate', 'release']) {
    const { targets } = fixtures();
    if (defect === 'missing') targets.pop();
    if (defect === 'duplicate') targets[1].mapping_id = targets[0].mapping_id;
    if (defect === 'release') targets[0].release_package_fingerprint_sha256 = 'e'.repeat(64);
    assert.throws(() => assertRepairTargetsV1(targets));
  }
});

test('execution is exact-approval gated, rollback rehearsed, metadata-only, and independently read back', async () => {
  const source = await fs.readFile(
    new URL('../../scripts/audits/pokemon_countdown_calendar_mapping_method_repair_v1.mjs', import.meta.url),
    'utf8',
  );
  assert.match(source, /COUNTDOWN_MAPPING_REPAIR_APPROVAL/);
  assert.match(source, /countdown_mapping_repair_exact_approval_required/);
  assert.ok(source.indexOf('countdown_mapping_repair_exact_approval_required') < source.indexOf('await applyRepair'));
  assert.match(source, /begin isolation level serializable/);
  assert.match(source, /rollbackMappingTransaction/);
  assert.match(source, /commitMappingTransaction/);
  assert.match(source, /const readbackClient = new Client/);
  assert.match(source, /committed_and_independently_verified/);
  assert.match(source, /update public\.external_mappings/);
  assert.doesNotMatch(source, /insert into public\./i);
  assert.doesNotMatch(source, /delete from public\./i);
  assert.doesNotMatch(source, /set\s+card_print_id\s*=/i);
});

test('the original insert path now supplies the publication mapping method', async () => {
  const source = await fs.readFile(
    new URL('../../scripts/audits/pokemon_countdown_calendar_variant_release_v1.mjs', import.meta.url),
    'utf8',
  );
  assert.match(source, /'mapping_method', 'exact_countdown_calendar_variant_authority_v1'/);
  assert.match(source, /'mapping_method_audit'/);
});

test('workflow separates preparation from exact approved apply and retains evidence', async () => {
  const workflow = await fs.readFile(
    new URL('../../.github/workflows/pokemon-countdown-calendar-mapping-method-repair.yml', import.meta.url),
    'utf8',
  );
  assert.match(workflow, /prepare_repair/);
  assert.match(workflow, /apply_repair/);
  assert.match(workflow, /source_commit_sha/);
  assert.match(workflow, /approval_phrase/);
  assert.match(workflow, /COUNTDOWN_MAPPING_REPAIR_APPROVAL/);
  assert.match(workflow, /retention-days: 90/);
  assert.doesNotMatch(workflow, /^\s+schedule:/m);
  assert.doesNotMatch(workflow, /^\s+push:/m);
});
