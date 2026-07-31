import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  CLEAN_ACCOUNT_JOURNEY_READBACK_POLICY_V1,
  evaluateCleanAccountJourneyReadbackV1,
} from "../../backend/release/clean_account_journey_readback_policy_v1.mjs";

const AUDIT = fs.readFileSync(
  new URL(
    "../../scripts/audits/release_clean_account_journey_readback_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);
const EXAMPLE = JSON.parse(
  fs.readFileSync(
    new URL(
      "../../docs/release/physical_iphone_clean_account_journey_v1.example.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

function validEvidence() {
  return {
    window: {
      start: "2026-07-31T18:00:00.000Z",
      end: "2026-07-31T19:00:00.000Z",
    },
    release: {
      app_commit_sha: "35c8bff9cc4368dec05e61b3739322c2f0c524f1",
      expected_app_commit_sha:
        "35c8bff9cc4368dec05e61b3739322c2f0c524f1",
      testflight_build: "258",
      expected_testflight_build: "258",
    },
    device: {
      platform: "iOS",
      physical_device: true,
      installed_from_testflight: true,
      device_model_family: "iPhone",
      tested_at: "2026-07-31T18:45:00.000Z",
      artifact_count: 1,
      confirmations: {
        signup_completed: true,
        card_search_rendered: true,
        owned_card_visible: true,
        binder_visible: true,
        intent_or_listing_visible: true,
        activity_visible: true,
        no_blocking_error: true,
      },
    },
    account: {
      exists: true,
      created_at: "2026-07-31T18:05:00.000Z",
    },
    database: {
      owned_instance_count: 1,
      non_hold_intent_count: 1,
      binder_count: 1,
      vault_added_event_count: 1,
      vault_intent_changed_event_count: 1,
      binder_created_event_count: 1,
      vault_added_matches_owned_instance: true,
      intent_event_matches_current_intent: true,
      binder_created_matches_binder: true,
      event_emission_failure_count: 0,
    },
  };
}

test("complete physical-iPhone journey evidence passes", () => {
  const result = evaluateCleanAccountJourneyReadbackV1(validEvidence());
  assert.equal(result.policy_version, CLEAN_ACCOUNT_JOURNEY_READBACK_POLICY_V1);
  assert.equal(result.status, "passed");
  assert.equal(result.completion_allowed, true);
  assert.deepEqual(result.findings, []);
});

test("device, TestFlight, and release mismatches fail", () => {
  const input = validEvidence();
  input.release.app_commit_sha = "wrong";
  input.release.testflight_build = "23";
  input.device.physical_device = false;
  input.device.installed_from_testflight = false;
  input.device.artifact_count = 0;
  const result = evaluateCleanAccountJourneyReadbackV1(input);
  assert.equal(result.status, "failed");
  assert.ok(result.findings.includes("testflight_app_commit_mismatch"));
  assert.ok(result.findings.includes("testflight_build_mismatch"));
  assert.ok(result.findings.includes("physical_iphone_not_confirmed"));
  assert.ok(result.findings.includes("testflight_install_not_confirmed"));
  assert.ok(result.findings.includes("device_evidence_artifact_missing"));
});

test("an old account cannot satisfy the clean-account gate", () => {
  const input = validEvidence();
  input.account.created_at = "2026-07-30T18:05:00.000Z";
  const result = evaluateCleanAccountJourneyReadbackV1(input);
  assert.equal(result.status, "failed");
  assert.ok(
    result.findings.includes("account_not_created_in_journey_window"),
  );
});

test("missing or unlinked database stages fail independently", () => {
  const input = validEvidence();
  Object.assign(input.database, {
    owned_instance_count: 0,
    non_hold_intent_count: 0,
    binder_count: 0,
    vault_added_event_count: 0,
    vault_intent_changed_event_count: 0,
    binder_created_event_count: 0,
    vault_added_matches_owned_instance: false,
    intent_event_matches_current_intent: false,
    binder_created_matches_binder: false,
    event_emission_failure_count: 1,
  });
  const result = evaluateCleanAccountJourneyReadbackV1(input);
  assert.equal(result.status, "failed");
  for (const finding of [
    "owned_card_missing",
    "created_binder_missing",
    "intent_or_listing_missing",
    "vault_added_activity_missing",
    "intent_changed_activity_missing",
    "binder_created_activity_missing",
    "vault_added_activity_not_linked_to_owned_card",
    "intent_activity_not_linked_to_current_intent",
    "binder_activity_not_linked_to_created_binder",
    "journey_event_emission_failure_present",
  ]) {
    assert.ok(result.findings.includes(finding), finding);
  }
});

test("every visible device confirmation is required", () => {
  for (const confirmation of Object.keys(
    validEvidence().device.confirmations,
  )) {
    const input = validEvidence();
    input.device.confirmations[confirmation] = false;
    const result = evaluateCleanAccountJourneyReadbackV1(input);
    assert.ok(
      result.findings.includes(
        `device_confirmation_missing:${confirmation}`,
      ),
      confirmation,
    );
  }
});

test("example evidence cannot accidentally pass", () => {
  const input = validEvidence();
  input.device = {
    ...EXAMPLE,
    artifact_count: EXAMPLE.artifact_paths.length,
  };
  const result = evaluateCleanAccountJourneyReadbackV1(input);
  assert.equal(result.status, "failed");
  assert.ok(result.findings.includes("physical_iphone_not_confirmed"));
});

test("production readback is read-only and excludes direct customer identity", () => {
  assert.match(AUDIT, /begin transaction read only/i);
  assert.doesNotMatch(AUDIT, /\b(insert|update|delete|truncate)\s+public\./i);
  assert.match(AUDIT, /subject_fingerprint_sha256/);
  assert.match(AUDIT, /email_in_artifacts:\s*false/);
  assert.match(AUDIT, /user_id_in_artifacts:\s*false/);
  assert.match(AUDIT, /artifact_hashes\.json/);
  assert.match(AUDIT, /tracked worktree must be clean with --require-pass/);
  assert.match(AUDIT, /sensitive device evidence key is prohibited/);
  assert.match(AUDIT, /artifact_index:/);
  assert.doesNotMatch(AUDIT, /file_name:/);
  assert.doesNotMatch(AUDIT, /select\s+email\b/i);
});
