import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_MANIFEST_PATH = path.join(
  REPO_ROOT,
  "docs",
  "audits",
  "release_completion_v1",
  "completion_manifest_v1.json",
);

export const RELEASE_CANDIDATE_SOAK_POLICY_V1 =
  "GROOKAI_FINAL_RELEASE_CANDIDATE_SOAK_POLICY_V1";
export const RELEASE_CANDIDATE_SOAK_STATE_V1 =
  "GROOKAI_FINAL_RELEASE_CANDIDATE_SOAK_STATE_V1";
export const RELEASE_CANDIDATE_SOAK_START_AUTHORITY_V1 =
  "GROOKAI_FINAL_RELEASE_CANDIDATE_SOAK_START_AUTHORITY_V1";
export const RELEASE_CANDIDATE_SOAK_PREREQUISITE_PROJECTION_V1 =
  "GROOKAI_FINAL_RELEASE_CANDIDATE_SOAK_PREREQUISITE_PROJECTION_V1";
export const RELEASE_CANDIDATE_SOAK_GATE_ID =
  "final_72_hour_release_candidate_soak";

const MINIMUM_SOAK_HOURS = 72;
const START_RECORDING_TOLERANCE_MS = 5 * 60 * 1000;
const MAXIMUM_OBSERVATION_GAP_MS = 26 * 60 * 60 * 1000;
const FINAL_OBSERVATION_TOLERANCE_MS = 2 * 60 * 60 * 1000;

function timestamp(value) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function candidateIdentity(manifest) {
  const candidate = manifest?.final_candidate ?? {};
  return {
    source_commit: candidate.source_commit ?? null,
    web_deployment_id: candidate.web?.deployment_id ?? null,
    android_apk_sha256: candidate.android?.apk_sha256 ?? null,
    ios_ipa_sha256: candidate.ios_testflight?.ipa_sha256 ?? null,
  };
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function prerequisiteProjectionDigestV1(projection) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(projection)))
    .digest("hex");
}

export function releaseCandidateSoakPrerequisiteProjectionV1(manifest) {
  const gates = Array.isArray(manifest?.gates) ? manifest.gates : [];
  return {
    schema_version: RELEASE_CANDIDATE_SOAK_PREREQUISITE_PROJECTION_V1,
    candidate_identity: candidateIdentity(manifest),
    gates: gates
      .filter((gate) => gate?.id !== RELEASE_CANDIDATE_SOAK_GATE_ID)
      .map((gate) => ({
        id: String(gate?.id ?? ""),
        status: gate?.status ?? null,
        evidence: [...(Array.isArray(gate?.evidence) ? gate.evidence : [])]
          .map(String)
          .sort(),
        required_next_evidence: [
          ...(Array.isArray(gate?.required_next_evidence)
            ? gate.required_next_evidence
            : []),
        ]
          .map(String)
          .sort(),
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
}

function projectionHasOnlyProvenPrerequisites(projection) {
  const gates = Array.isArray(projection?.gates) ? projection.gates : [];
  const ids = gates.map((gate) => gate?.id);
  return (
    projection?.schema_version ===
      RELEASE_CANDIDATE_SOAK_PREREQUISITE_PROJECTION_V1 &&
    gates.length > 0 &&
    ids.every((id) => typeof id === "string" && id.length > 0) &&
    new Set(ids).size === ids.length &&
    gates.every((gate) => gate?.status === "proven")
  );
}

function identitiesMatch(left, right) {
  return Object.keys(left).every(
    (key) => typeof left[key] === "string" && left[key] === right?.[key],
  );
}

function observationIsHealthy(observation) {
  return (
    observation?.runtime_health_ok === true &&
    observation?.production_web_ok === true &&
    observation?.data_truth_ok === true &&
    observation?.privacy_authorization_ok === true &&
    observation?.unresolved_p0_count === 0 &&
    observation?.launch_blocking_crash_count === 0
  );
}

export function createReleaseCandidateSoakStateV1({
  manifest,
  startedAt = new Date().toISOString(),
  startRecordedAt = startedAt,
  requiredHours = MINIMUM_SOAK_HOURS,
  observations = [],
}) {
  const readiness = evaluateReleaseCandidateSoakV1({
    manifest,
    state: null,
    asOf: startRecordedAt,
  });
  if (!readiness.start_allowed) {
    throw new Error(
      `release candidate soak start is not authorized: ${[
        ...readiness.prerequisite_gate_ids,
        ...readiness.findings,
      ].join(",")}`,
    );
  }
  const prerequisiteProjection =
    releaseCandidateSoakPrerequisiteProjectionV1(manifest);
  return {
    schema_version: RELEASE_CANDIDATE_SOAK_STATE_V1,
    candidate_identity: candidateIdentity(manifest),
    started_at: startedAt,
    start_recorded_at: startRecordedAt,
    required_hours: requiredHours,
    start_authorization: {
      schema_version: RELEASE_CANDIDATE_SOAK_START_AUTHORITY_V1,
      authorized_at: startRecordedAt,
      prerequisite_projection_sha256: prerequisiteProjectionDigestV1(
        prerequisiteProjection,
      ),
      prerequisite_projection: prerequisiteProjection,
    },
    observations,
  };
}

export function evaluateReleaseCandidateSoakV1({
  manifest,
  state = null,
  asOf = new Date().toISOString(),
}) {
  const findings = [];
  const gates = Array.isArray(manifest?.gates) ? manifest.gates : [];
  const soakGate = gates.find(
    (gate) => gate?.id === RELEASE_CANDIDATE_SOAK_GATE_ID,
  );
  const prerequisiteGateIds = gates
    .filter(
      (gate) =>
        gate?.id !== RELEASE_CANDIDATE_SOAK_GATE_ID && gate?.status !== "proven",
    )
    .map((gate) => gate.id);
  const expectedCandidate = candidateIdentity(manifest);
  const currentPrerequisiteProjection =
    releaseCandidateSoakPrerequisiteProjectionV1(manifest);
  const currentPrerequisiteDigest = prerequisiteProjectionDigestV1(
    currentPrerequisiteProjection,
  );
  const missingCandidateFields = Object.entries(expectedCandidate)
    .filter(([, value]) => typeof value !== "string" || value.length === 0)
    .map(([key]) => key);
  const asOfMs = timestamp(asOf);

  if (!soakGate) findings.push("soak_gate_missing_from_manifest");
  if (missingCandidateFields.length > 0) {
    findings.push("final_candidate_identity_incomplete");
  }
  if (asOfMs === null) findings.push("invalid_as_of_timestamp");

  const startAllowed =
    findings.length === 0 && prerequisiteGateIds.length === 0 && state === null;

  if (state === null) {
    return {
      policy_version: RELEASE_CANDIDATE_SOAK_POLICY_V1,
      status: startAllowed ? "ready_to_start" : "blocked_prerequisites",
      start_allowed: startAllowed,
      final_report_allowed: false,
      candidate_identity: expectedCandidate,
      prerequisite_gate_ids: prerequisiteGateIds,
      findings,
      soak: null,
    };
  }

  if (state?.schema_version !== RELEASE_CANDIDATE_SOAK_STATE_V1) {
    findings.push("invalid_soak_state_schema");
  }
  if (prerequisiteGateIds.length > 0) {
    findings.push("soak_started_before_prerequisites_proven");
  }
  if (!identitiesMatch(expectedCandidate, state?.candidate_identity)) {
    findings.push("soak_candidate_identity_mismatch");
  }

  const startAuthorization = state?.start_authorization;
  if (!startAuthorization || typeof startAuthorization !== "object") {
    findings.push("soak_start_authorization_missing");
  } else {
    if (
      startAuthorization.schema_version !==
      RELEASE_CANDIDATE_SOAK_START_AUTHORITY_V1
    ) {
      findings.push("invalid_soak_start_authorization_schema");
    }
    const storedProjection = startAuthorization.prerequisite_projection;
    if (!storedProjection || typeof storedProjection !== "object") {
      findings.push("soak_prerequisite_projection_missing");
    } else {
      const storedProjectionDigest =
        prerequisiteProjectionDigestV1(storedProjection);
      if (
        storedProjectionDigest !==
        startAuthorization.prerequisite_projection_sha256
      ) {
        findings.push("soak_start_authorization_digest_invalid");
      }
      if (!projectionHasOnlyProvenPrerequisites(storedProjection)) {
        findings.push("soak_start_authorization_prerequisites_not_proven");
      }
      if (
        !identitiesMatch(
          state?.candidate_identity ?? {},
          storedProjection.candidate_identity,
        )
      ) {
        findings.push("soak_start_authorization_candidate_mismatch");
      }
      if (storedProjectionDigest !== currentPrerequisiteDigest) {
        findings.push("soak_prerequisite_authority_mismatch");
      }
    }
  }

  const startedAtMs = timestamp(state?.started_at);
  const recordedAtMs = timestamp(state?.start_recorded_at);
  const authorizedAtMs = timestamp(startAuthorization?.authorized_at);
  const requiredHours = Number(state?.required_hours);
  if (startedAtMs === null) findings.push("invalid_soak_start_timestamp");
  if (recordedAtMs === null) findings.push("invalid_soak_recorded_timestamp");
  if (authorizedAtMs === null) {
    findings.push("invalid_soak_authorized_timestamp");
  }
  if (
    startedAtMs !== null &&
    recordedAtMs !== null &&
    Math.abs(startedAtMs - recordedAtMs) > START_RECORDING_TOLERANCE_MS
  ) {
    findings.push("soak_start_is_backdated_or_forward_dated");
  }
  if (
    recordedAtMs !== null &&
    authorizedAtMs !== null &&
    Math.abs(recordedAtMs - authorizedAtMs) > START_RECORDING_TOLERANCE_MS
  ) {
    findings.push("soak_authorization_is_not_bound_to_recorded_start");
  }
  if (!Number.isFinite(requiredHours) || requiredHours < MINIMUM_SOAK_HOURS) {
    findings.push("soak_duration_below_72_hours");
  }
  if (startedAtMs !== null && asOfMs !== null && startedAtMs > asOfMs) {
    findings.push("soak_start_is_in_the_future");
  }

  const observations = Array.isArray(state?.observations)
    ? state.observations
    : [];
  const validObservationTimes = [];
  for (const observation of observations) {
    const observedAtMs = timestamp(observation?.observed_at);
    if (observedAtMs === null) {
      findings.push("observation_timestamp_invalid");
      continue;
    }
    validObservationTimes.push(observedAtMs);
    if (
      startedAtMs !== null &&
      (observedAtMs < startedAtMs || (asOfMs !== null && observedAtMs > asOfMs))
    ) {
      findings.push("observation_outside_current_soak_window");
    }
    if (!identitiesMatch(expectedCandidate, observation?.candidate_identity)) {
      findings.push("observation_candidate_identity_mismatch");
    }
    if (!observationIsHealthy(observation)) {
      findings.push("unhealthy_soak_observation");
    }
  }

  const uniqueObservationTimes = [...new Set(validObservationTimes)].sort(
    (left, right) => left - right,
  );
  if (uniqueObservationTimes.length !== validObservationTimes.length) {
    findings.push("duplicate_soak_observation_timestamp");
  }

  let elapsedHours = 0;
  let windowElapsed = false;
  let expectedEndAt = null;
  if (
    startedAtMs !== null &&
    asOfMs !== null &&
    Number.isFinite(requiredHours)
  ) {
    elapsedHours = Math.max(0, (asOfMs - startedAtMs) / (60 * 60 * 1000));
    const expectedEndAtMs = startedAtMs + requiredHours * 60 * 60 * 1000;
    expectedEndAt = new Date(expectedEndAtMs).toISOString();
    windowElapsed = asOfMs >= expectedEndAtMs;

    if (uniqueObservationTimes.length === 0) {
      findings.push("soak_observations_missing");
    } else {
      if (
        uniqueObservationTimes[0] - startedAtMs >
        FINAL_OBSERVATION_TOLERANCE_MS
      ) {
        findings.push("initial_soak_observation_missing");
      }
      for (let index = 1; index < uniqueObservationTimes.length; index += 1) {
        if (
          uniqueObservationTimes[index] - uniqueObservationTimes[index - 1] >
          MAXIMUM_OBSERVATION_GAP_MS
        ) {
          findings.push("soak_observation_gap_exceeds_26_hours");
          break;
        }
      }
      if (
        windowElapsed &&
        uniqueObservationTimes.at(-1) < expectedEndAtMs
      ) {
        findings.push("final_72_hour_observation_missing");
      }
    }
  }

  const uniqueFindings = [...new Set(findings)];
  const passed = windowElapsed && uniqueFindings.length === 0;
  return {
    policy_version: RELEASE_CANDIDATE_SOAK_POLICY_V1,
    status: passed
      ? "passed"
      : uniqueFindings.length > 0
        ? "failed"
        : "observing",
    start_allowed: false,
    final_report_allowed: passed,
    candidate_identity: expectedCandidate,
    prerequisite_gate_ids: prerequisiteGateIds,
    findings: uniqueFindings,
    soak: {
      started_at:
        startedAtMs === null ? state?.started_at ?? null : new Date(startedAtMs).toISOString(),
      expected_end_at: expectedEndAt,
      as_of: asOfMs === null ? asOf : new Date(asOfMs).toISOString(),
      required_hours: requiredHours,
      elapsed_hours: Number(elapsedHours.toFixed(3)),
      window_elapsed: windowElapsed,
      observation_count: observations.length,
    },
  };
}

function parseArgs(argv) {
  const args = {
    manifestPath: DEFAULT_MANIFEST_PATH,
    statePath: null,
    asOf: new Date().toISOString(),
    requirePass: false,
  };
  for (const argument of argv) {
    if (argument.startsWith("--manifest=")) {
      args.manifestPath = path.resolve(argument.slice("--manifest=".length));
    } else if (argument.startsWith("--state=")) {
      args.statePath = path.resolve(argument.slice("--state=".length));
    } else if (argument.startsWith("--as-of=")) {
      args.asOf = argument.slice("--as-of=".length);
    } else if (argument === "--require-pass") {
      args.requirePass = true;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(await fs.readFile(args.manifestPath, "utf8"));
  const state = args.statePath
    ? JSON.parse(await fs.readFile(args.statePath, "utf8"))
    : null;
  const result = evaluateReleaseCandidateSoakV1({
    manifest,
    state,
    asOf: args.asOf,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (args.requirePass && !result.final_report_allowed) process.exitCode = 1;
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  main().catch((error) => {
    console.error(`[release-soak] ${error.stack || error.message}`);
    process.exitCode = 1;
  });
}
