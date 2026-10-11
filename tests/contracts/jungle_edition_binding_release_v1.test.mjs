import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JUNGLE_BINDING_RELEASE_V1,
  assertJungleBindingReleaseV1,
  jungleBindingFingerprintV1,
  sealJungleBindingReleaseV1,
} from '../../backend/pricing/jungle_edition_binding_release_v1.mjs';

const hex = (character) => character.repeat(64);
const uuid = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;

function draft() {
  return {
    project_ref: 'ycdxbpibncqcchqiihfz',
    physical_manifest_fingerprint: hex('a'),
    physical_manifest_file_sha256: hex('b'),
    source_review_sha256: hex('c'),
    schema_capture_sha256: hex('d'),
    schema_security_sha256: hex('e'),
    source_sync_run_id: uuid(900),
    source_finished_at: '2026-10-11T09:31:49.502Z',
    snapshot_at: '2026-10-11T20:19:39.884Z',
    rows: Array.from({ length: 128 }, (_, index) => ({
      id: uuid(index + 1),
      identity_link_id: uuid(index + 201),
      card_print_id: uuid(index + 401),
      card_printing_id: uuid(index + 601),
      gv_id: `GV-PK-JU-${index + 1}-${index % 2 ? 'FIRST-EDITION' : 'UNLIMITED'}`,
      edition: index % 2 ? 'first_edition' : 'unlimited',
      finish_key: index < 32 ? 'holo' : 'normal',
      product_id: 45000 + index,
      source_subtype: `${index % 2 ? '1st Edition' : 'Unlimited'}${index < 32 ? ' Holofoil' : ''}`,
      source_product_payload_hash: hex('1'),
      manifest_sha256: hex('a'),
      source_observation_id: uuid(index + 801),
      source_row_hash: hex('2'),
      source_artifact_id: uuid(999),
      expected_link_state: 'staged',
      binding_state: 'active',
    })),
  };
}

test('seals one exact 128-row Jungle binding release', () => {
  const plan = sealJungleBindingReleaseV1(draft(), { at: '2026-10-11T20:30:00.000Z' });
  assert.equal(plan.version, JUNGLE_BINDING_RELEASE_V1);
  assert.equal(plan.executable, true);
  assert.match(plan.plan_fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(assertJungleBindingReleaseV1(plan, {
    expectedFingerprint: plan.plan_fingerprint,
    now: Date.parse('2026-10-11T20:31:00.000Z'),
  }), plan);
});

test('canonical fingerprint is independent of object key order', () => {
  assert.equal(jungleBindingFingerprintV1({ b: 2, a: { d: 4, c: 3 } }), jungleBindingFingerprintV1({ a: { c: 3, d: 4 }, b: 2 }));
});

test('rejects rehashed attempts to expand scope or change reviewed rows', () => {
  const plan = sealJungleBindingReleaseV1(draft(), { at: '2026-10-11T20:30:00.000Z' });
  const expanded = structuredClone(plan);
  expanded.boundaries.vault_writes = true;
  assert.throws(() => assertJungleBindingReleaseV1(expanded, { allowExpiredSource: true }), /release_boundary_mismatch/);

  const changed = structuredClone(plan);
  changed.rows[0].source_product_payload_hash = hex('9');
  assert.throws(() => assertJungleBindingReleaseV1(changed, { allowExpiredSource: true }), /plan_fingerprint_mismatch/);
});

test('rejects duplicates, non-executable plans, and stale source evidence', () => {
  const plan = sealJungleBindingReleaseV1(draft(), { at: '2026-10-11T20:30:00.000Z' });
  const duplicate = structuredClone(plan);
  duplicate.rows[1].identity_link_id = duplicate.rows[0].identity_link_id;
  assert.throws(() => assertJungleBindingReleaseV1(duplicate, { allowExpiredSource: true }), /duplicate_identity_link_id/);

  const disabled = structuredClone(plan);
  disabled.executable = false;
  assert.throws(() => assertJungleBindingReleaseV1(disabled, { allowExpiredSource: true }), /plan_not_executable/);

  assert.throws(() => assertJungleBindingReleaseV1(plan, {
    now: Date.parse('2026-10-13T20:30:00.000Z'),
  }), /source_evidence_stale_or_future/);
});
