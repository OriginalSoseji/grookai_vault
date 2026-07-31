export const CLEAN_ACCOUNT_JOURNEY_READBACK_POLICY_V1 =
  "CLEAN_ACCOUNT_JOURNEY_READBACK_POLICY_V1";

const REQUIRED_CONFIRMATIONS = Object.freeze([
  "signup_completed",
  "card_search_rendered",
  "owned_card_visible",
  "binder_visible",
  "intent_or_listing_visible",
  "activity_visible",
  "no_blocking_error",
]);

function integer(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : 0;
}

function timestamp(value) {
  const parsed = new Date(value ?? "");
  return Number.isFinite(parsed.getTime()) ? parsed.getTime() : null;
}

function inWindow(value, start, end) {
  const time = timestamp(value);
  return time !== null && time >= start && time <= end;
}

export function evaluateCleanAccountJourneyReadbackV1(input = {}) {
  const findings = [];
  const windowStart = timestamp(input.window?.start);
  const windowEnd = timestamp(input.window?.end);
  if (windowStart === null || windowEnd === null || windowStart >= windowEnd) {
    findings.push("invalid_journey_window");
  }

  const appCommit = String(input.release?.app_commit_sha ?? "").trim();
  const expectedAppCommit = String(
    input.release?.expected_app_commit_sha ?? "",
  ).trim();
  if (!appCommit || !expectedAppCommit || appCommit !== expectedAppCommit) {
    findings.push("testflight_app_commit_mismatch");
  }
  const build = String(input.release?.testflight_build ?? "").trim();
  const expectedBuild = String(
    input.release?.expected_testflight_build ?? "",
  ).trim();
  if (!build || !expectedBuild || build !== expectedBuild) {
    findings.push("testflight_build_mismatch");
  }

  const device = input.device ?? {};
  if (device.platform !== "iOS" || device.physical_device !== true) {
    findings.push("physical_iphone_not_confirmed");
  }
  if (device.installed_from_testflight !== true) {
    findings.push("testflight_install_not_confirmed");
  }
  if (!String(device.device_model_family ?? "").startsWith("iPhone")) {
    findings.push("iphone_model_family_missing");
  }
  if (
    windowStart !== null &&
    windowEnd !== null &&
    !inWindow(device.tested_at, windowStart, windowEnd)
  ) {
    findings.push("device_test_timestamp_outside_window");
  }
  for (const confirmation of REQUIRED_CONFIRMATIONS) {
    if (device.confirmations?.[confirmation] !== true) {
      findings.push(`device_confirmation_missing:${confirmation}`);
    }
  }
  if (integer(device.artifact_count) < 1) {
    findings.push("device_evidence_artifact_missing");
  }

  const account = input.account ?? {};
  if (account.exists !== true) {
    findings.push("clean_account_missing");
  } else if (
    windowStart !== null &&
    windowEnd !== null &&
    !inWindow(account.created_at, windowStart, windowEnd)
  ) {
    findings.push("account_not_created_in_journey_window");
  }

  const evidence = input.database ?? {};
  if (integer(evidence.owned_instance_count) < 1) {
    findings.push("owned_card_missing");
  }
  if (integer(evidence.binder_count) < 1) {
    findings.push("created_binder_missing");
  }
  if (integer(evidence.non_hold_intent_count) < 1) {
    findings.push("intent_or_listing_missing");
  }
  if (integer(evidence.vault_added_event_count) < 1) {
    findings.push("vault_added_activity_missing");
  }
  if (integer(evidence.vault_intent_changed_event_count) < 1) {
    findings.push("intent_changed_activity_missing");
  }
  if (integer(evidence.binder_created_event_count) < 1) {
    findings.push("binder_created_activity_missing");
  }
  if (evidence.vault_added_matches_owned_instance !== true) {
    findings.push("vault_added_activity_not_linked_to_owned_card");
  }
  if (evidence.intent_event_matches_current_intent !== true) {
    findings.push("intent_activity_not_linked_to_current_intent");
  }
  if (evidence.binder_created_matches_binder !== true) {
    findings.push("binder_activity_not_linked_to_created_binder");
  }
  if (integer(evidence.event_emission_failure_count) !== 0) {
    findings.push("journey_event_emission_failure_present");
  }

  const uniqueFindings = [...new Set(findings)].sort();
  return {
    policy_version: CLEAN_ACCOUNT_JOURNEY_READBACK_POLICY_V1,
    status: uniqueFindings.length === 0 ? "passed" : "failed",
    completion_allowed: uniqueFindings.length === 0,
    findings: uniqueFindings,
    required_confirmations: [...REQUIRED_CONFIRMATIONS],
  };
}
