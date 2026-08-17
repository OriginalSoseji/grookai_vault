const ALLOWED_ACTIONS = new Set([
  "clear_app",
  "launch",
  "sleep",
  "wait_for",
  "tap",
  "input_text",
  "keyevent",
  "swipe",
]);

const FORBIDDEN_ACTION_PATTERN = /(publish|post|upload|share|send|message|login_social)/i;

export function validateEmulatorVideoScenarioV1(scenario) {
  const findings = [];
  if (scenario?.schema_version !== "EMULATOR_SOCIAL_VIDEO_SCENARIO_V1") {
    findings.push("invalid_schema_version");
  }
  if (!/^[a-z0-9][a-z0-9_-]{2,80}$/.test(String(scenario?.scenario_id ?? ""))) {
    findings.push("invalid_scenario_id");
  }
  if (scenario?.app_package !== "com.grookai.vault") {
    findings.push("unexpected_app_package");
  }
  if (scenario?.publishing?.mode !== "disabled") {
    findings.push("publishing_must_be_disabled");
  }
  const duration = Number(scenario?.recording?.max_duration_seconds ?? 0);
  if (!Number.isInteger(duration) || duration < 5 || duration > 90) {
    findings.push("recording_duration_out_of_bounds");
  }
  const allSteps = [
    ...(Array.isArray(scenario?.setup_steps) ? scenario.setup_steps : []),
    ...(Array.isArray(scenario?.steps) ? scenario.steps : []),
  ];
  if (allSteps.length === 0 || allSteps.length > 40) {
    findings.push("invalid_step_count");
  }
  for (const [index, step] of allSteps.entries()) {
    const action = String(step?.action ?? "");
    if (!ALLOWED_ACTIONS.has(action)) findings.push(`unsupported_action:${index}:${action}`);
    if (FORBIDDEN_ACTION_PATTERN.test(action)) findings.push(`publishing_action_forbidden:${index}:${action}`);
  }
  return {
    valid: findings.length === 0,
    findings,
    publishing_enabled: false,
    allowed_actions: [...ALLOWED_ACTIONS],
  };
}

export function assertEmulatorVideoScenarioV1(scenario) {
  const result = validateEmulatorVideoScenarioV1(scenario);
  if (!result.valid) throw new Error(`invalid emulator video scenario: ${result.findings.join(", ")}`);
  return result;
}

