export const WANT_MATCH_JOURNEY_READBACK_POLICY_V1 =
  "WANT_MATCH_JOURNEY_READBACK_POLICY_V1";

export const WANT_MATCH_JOURNEY_REQUIRED_CONFIRMATIONS_V1 = Object.freeze([
  "exact_card_found",
  "want_enabled",
  "want_match_visible",
  "owner_context_visible",
  "card_centered_message_sent",
  "want_disabled",
  "match_absent_after_opt_out",
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

export function evaluateWantMatchJourneyReadbackV1(input = {}) {
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
  for (const confirmation of WANT_MATCH_JOURNEY_REQUIRED_CONFIRMATIONS_V1) {
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
  if (integer(evidence.want_on_event_count) < 1) {
    findings.push("want_on_event_missing");
  }
  if (integer(evidence.want_off_event_count) < 1) {
    findings.push("want_off_event_missing");
  }
  if (evidence.want_events_share_exact_card !== true) {
    findings.push("want_events_exact_card_mismatch");
  }
  if (evidence.want_off_after_want_on !== true) {
    findings.push("want_event_order_invalid");
  }
  if (evidence.final_current_want === true) {
    findings.push("want_opt_out_not_current");
  }
  if (integer(evidence.generated_match_count) < 1) {
    findings.push("generated_want_match_missing");
  }
  if (evidence.match_owner_is_distinct !== true) {
    findings.push("want_match_owner_invalid");
  }
  if (evidence.owner_context_matches_source !== true) {
    findings.push("want_match_owner_context_mismatch");
  }
  if (evidence.exact_source_instance_present !== true) {
    findings.push("want_match_exact_source_instance_missing");
  }
  if (integer(evidence.available_event_count) < 1) {
    findings.push("want_match_available_event_missing");
  }
  if (integer(evidence.card_centered_message_count) < 1) {
    findings.push("card_centered_message_missing");
  }
  if (evidence.message_matches_exact_match_tuple !== true) {
    findings.push("message_exact_match_tuple_mismatch");
  }
  if (evidence.message_after_match !== true) {
    findings.push("message_precedes_want_match");
  }
  if (evidence.message_before_opt_out !== true) {
    findings.push("message_not_sent_before_opt_out");
  }
  if (integer(evidence.active_match_count_after_opt_out) !== 0) {
    findings.push("active_match_remains_after_opt_out");
  }
  if (integer(evidence.stale_match_count_after_opt_out) < 1) {
    findings.push("stale_match_transition_missing");
  }
  if (evidence.canonical_want_removed_reason_present !== true) {
    findings.push("canonical_want_removed_reason_missing");
  }
  if (integer(evidence.stale_match_pulse_visibility_count) !== 0) {
    findings.push("stale_match_visible_in_pulse");
  }
  if (integer(evidence.invalid_deliverable_notification_count) !== 0) {
    findings.push("invalid_deliverable_notification_present");
  }
  if (integer(evidence.post_opt_out_notification_delivery_count) !== 0) {
    findings.push("post_opt_out_notification_delivery_present");
  }
  if (integer(evidence.event_emission_failure_count) !== 0) {
    findings.push("journey_event_emission_failure_present");
  }
  if (evidence.message_content_redacted !== true) {
    findings.push("message_content_not_redacted");
  }

  const uniqueFindings = [...new Set(findings)].sort();
  return {
    policy_version: WANT_MATCH_JOURNEY_READBACK_POLICY_V1,
    status: uniqueFindings.length === 0 ? "passed" : "failed",
    completion_allowed: uniqueFindings.length === 0,
    findings: uniqueFindings,
    required_confirmations: [
      ...WANT_MATCH_JOURNEY_REQUIRED_CONFIRMATIONS_V1,
    ],
  };
}
