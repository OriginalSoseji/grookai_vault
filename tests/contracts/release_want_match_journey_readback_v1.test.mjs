import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  WANT_MATCH_JOURNEY_READBACK_POLICY_V1,
  evaluateWantMatchJourneyReadbackV1,
} from "../../backend/release/want_match_journey_readback_policy_v1.mjs";

const AUDIT = fs.readFileSync(
  new URL(
    "../../scripts/audits/release_want_match_journey_readback_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);
const RUNBOOK = fs.readFileSync(
  new URL(
    "../../docs/release/PHYSICAL_IPHONE_WANT_MATCH_JOURNEY_V1.md",
    import.meta.url,
  ),
  "utf8",
);
const EXAMPLE = JSON.parse(
  fs.readFileSync(
    new URL(
      "../../docs/release/physical_iphone_want_match_journey_v1.example.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

function validEvidence() {
  return {
    window: {
      start: "2026-08-07T18:00:00.000Z",
      end: "2026-08-07T19:00:00.000Z",
    },
    release: {
      app_commit_sha: "33d7ff50bda428439c664c7c6db427b7a66abd9a",
      expected_app_commit_sha:
        "33d7ff50bda428439c664c7c6db427b7a66abd9a",
      testflight_build: "284",
      expected_testflight_build: "284",
    },
    device: {
      platform: "iOS",
      physical_device: true,
      installed_from_testflight: true,
      device_model_family: "iPhone",
      tested_at: "2026-08-07T18:55:00.000Z",
      artifact_count: 1,
      confirmations: {
        exact_card_found: true,
        want_enabled: true,
        want_match_visible: true,
        owner_context_visible: true,
        card_centered_message_sent: true,
        want_disabled: true,
        match_absent_after_opt_out: true,
        no_blocking_error: true,
      },
    },
    account: {
      exists: true,
      created_at: "2026-08-07T18:01:00.000Z",
    },
    database: {
      want_on_event_count: 1,
      want_off_event_count: 1,
      want_events_share_exact_card: true,
      want_off_after_want_on: true,
      final_current_want: false,
      generated_match_count: 1,
      match_owner_is_distinct: true,
      exact_source_instance_present: true,
      owner_context_matches_source: true,
      available_event_count: 1,
      card_centered_message_count: 1,
      message_matches_exact_match_tuple: true,
      message_after_match: true,
      message_before_opt_out: true,
      active_match_count_after_opt_out: 0,
      stale_match_count_after_opt_out: 1,
      canonical_want_removed_reason_present: true,
      stale_match_pulse_visibility_count: 0,
      invalid_deliverable_notification_count: 0,
      post_opt_out_notification_delivery_count: 0,
      event_emission_failure_count: 0,
      message_content_redacted: true,
    },
  };
}

test("complete exact-card Want Match journey evidence passes", () => {
  const result = evaluateWantMatchJourneyReadbackV1(validEvidence());
  assert.equal(result.policy_version, WANT_MATCH_JOURNEY_READBACK_POLICY_V1);
  assert.equal(result.status, "passed");
  assert.equal(result.completion_allowed, true);
  assert.deepEqual(result.findings, []);
});

test("device and governed TestFlight release mismatches fail", () => {
  const input = validEvidence();
  input.release.app_commit_sha = "wrong";
  input.release.testflight_build = "283";
  input.device.physical_device = false;
  input.device.installed_from_testflight = false;
  input.device.artifact_count = 0;
  const result = evaluateWantMatchJourneyReadbackV1(input);
  for (const finding of [
    "testflight_app_commit_mismatch",
    "testflight_build_mismatch",
    "physical_iphone_not_confirmed",
    "testflight_install_not_confirmed",
    "device_evidence_artifact_missing",
  ]) {
    assert.ok(result.findings.includes(finding), finding);
  }
});

test("the journey account must be new inside the evidence window", () => {
  const input = validEvidence();
  input.account.created_at = "2026-08-06T18:01:00.000Z";
  const result = evaluateWantMatchJourneyReadbackV1(input);
  assert.ok(result.findings.includes("account_not_created_in_journey_window"));
});

test("missing or misordered exact-card want events fail", () => {
  const input = validEvidence();
  Object.assign(input.database, {
    want_on_event_count: 0,
    want_off_event_count: 0,
    want_events_share_exact_card: false,
    want_off_after_want_on: false,
    final_current_want: true,
  });
  const result = evaluateWantMatchJourneyReadbackV1(input);
  for (const finding of [
    "want_on_event_missing",
    "want_off_event_missing",
    "want_events_exact_card_mismatch",
    "want_event_order_invalid",
    "want_opt_out_not_current",
  ]) {
    assert.ok(result.findings.includes(finding), finding);
  }
});

test("owner, source instance, event, and message tuple are independently required", () => {
  const input = validEvidence();
  Object.assign(input.database, {
    generated_match_count: 0,
    match_owner_is_distinct: false,
    exact_source_instance_present: false,
    owner_context_matches_source: false,
    available_event_count: 0,
    card_centered_message_count: 0,
    message_matches_exact_match_tuple: false,
    message_after_match: false,
    message_before_opt_out: false,
  });
  const result = evaluateWantMatchJourneyReadbackV1(input);
  for (const finding of [
    "generated_want_match_missing",
    "want_match_owner_invalid",
    "want_match_exact_source_instance_missing",
    "want_match_owner_context_mismatch",
    "want_match_available_event_missing",
    "card_centered_message_missing",
    "message_exact_match_tuple_mismatch",
    "message_precedes_want_match",
    "message_not_sent_before_opt_out",
  ]) {
    assert.ok(result.findings.includes(finding), finding);
  }
});

test("opt-out truth, Pulse, notification, and event boundaries fail closed", () => {
  const input = validEvidence();
  Object.assign(input.database, {
    active_match_count_after_opt_out: 1,
    stale_match_count_after_opt_out: 0,
    canonical_want_removed_reason_present: false,
    stale_match_pulse_visibility_count: 1,
    invalid_deliverable_notification_count: 1,
    post_opt_out_notification_delivery_count: 1,
    event_emission_failure_count: 1,
    message_content_redacted: false,
  });
  const result = evaluateWantMatchJourneyReadbackV1(input);
  for (const finding of [
    "active_match_remains_after_opt_out",
    "stale_match_transition_missing",
    "canonical_want_removed_reason_missing",
    "stale_match_visible_in_pulse",
    "invalid_deliverable_notification_present",
    "post_opt_out_notification_delivery_present",
    "journey_event_emission_failure_present",
    "message_content_not_redacted",
  ]) {
    assert.ok(result.findings.includes(finding), finding);
  }
});

test("every visible device confirmation is required", () => {
  for (const confirmation of Object.keys(validEvidence().device.confirmations)) {
    const input = validEvidence();
    input.device.confirmations[confirmation] = false;
    const result = evaluateWantMatchJourneyReadbackV1(input);
    assert.ok(
      result.findings.includes(`device_confirmation_missing:${confirmation}`),
      confirmation,
    );
  }
});

test("example evidence cannot pass and remains pinned to Build 284", () => {
  const input = validEvidence();
  input.device = {
    ...EXAMPLE,
    artifact_count: EXAMPLE.artifact_paths.length,
  };
  const result = evaluateWantMatchJourneyReadbackV1(input);
  assert.equal(result.status, "failed");
  assert.ok(result.findings.includes("physical_iphone_not_confirmed"));
  assert.equal(EXAMPLE.testflight_build, "284");
  assert.equal(
    EXAMPLE.app_commit_sha,
    "33d7ff50bda428439c664c7c6db427b7a66abd9a",
  );
});

test("production verifier is read-only and redacts customer/message identity", () => {
  assert.match(AUDIT, /begin transaction read only/i);
  assert.doesNotMatch(AUDIT, /\b(insert|update|delete|truncate)\s+public\./i);
  assert.doesNotMatch(AUDIT, /select[\s\S]{0,100}\bmessage\b\s*,/i);
  assert.match(AUDIT, /char_length\(message\)/i);
  assert.match(AUDIT, /subject_fingerprint_sha256/);
  assert.match(AUDIT, /message_content_in_artifacts:\s*false/);
  assert.match(AUDIT, /owner_id_in_artifacts:\s*false/);
  assert.match(AUDIT, /match_id_in_artifacts:\s*false/);
  assert.match(AUDIT, /interaction_id_in_artifacts:\s*false/);
  assert.match(AUDIT, /tracked worktree must be clean with --require-pass/);
  assert.match(AUDIT, /sensitive device evidence key is prohibited/);
  assert.match(AUDIT, /artifact_hashes\.json/);
  assert.doesNotMatch(AUDIT, /select\s+email\b/i);
  assert.match(RUNBOOK, /Do not manually mutate production\s+tables/i);
});
