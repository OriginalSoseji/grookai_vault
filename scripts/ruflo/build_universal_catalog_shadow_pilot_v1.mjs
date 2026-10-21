import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { assertNoSensitiveKeysV1, normalizeRepoPath } from "./validate_agent_registry_v1.mjs";
import { stableJsonV1 } from "./build_operations_read_model_v1.mjs";

export const UNIVERSAL_CATALOG_SHADOW_PILOT_VERSION = "RUFLO_UNIVERSAL_CATALOG_SHADOW_PILOT_V1";
export const UNIVERSAL_CATALOG_AGENT_KEY = "universal-catalog-discovery-v1";
export const REQUIRED_QUALIFYING_CYCLES = 7;

const CAPTURE_VERSION = "UNIVERSAL_CATALOG_DISCOVERY_CAPTURE_V1";
const DISCOVERY_VERSION = "UNIVERSAL_CATALOG_DISCOVERY_V1";
const REQUIRED_EVIDENCE_FILES = ["summary.json", "source_failures.json", "run_plan.json"];
const CAPTURE_INPUT_FILES = ["artifact_hashes.json", "run_metadata.json", ...REQUIRED_EVIDENCE_FILES];
const OBSERVATION_BOUNDARY_KEYS = [
  "agent_execution", "workflow_dispatch", "production_writes", "external_actions",
  "cleanup", "cross_worktree_writes", "issue_reconciliation",
];
const PROHIBITED_KEY_PATTERN = /(authorization|token|secret|password|service.?role|api.?key|cookie|command|payload|arguments?|argv|shell|workflow_dispatch|agent_execute|tool_call)/i;
const VALIDATED_DISCOVERY_EVIDENCE = new WeakSet();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertObject(value, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const entry of Object.values(value)) deepFreeze(entry);
  return value;
}

function assertNoExecutableKeys(value, label) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoExecutableKeys(entry, `${label}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    const safeFalseBoundary = key === "workflow_dispatch" && entry === false;
    assert(!PROHIBITED_KEY_PATTERN.test(key) || safeFalseBoundary, `${label}.${key} is executable data and is prohibited`);
    assertNoExecutableKeys(entry, `${label}.${key}`);
  }
}

function assertTimestamp(value, label) {
  assert(typeof value === "string" && Number.isFinite(Date.parse(value)), `${label} must be an ISO timestamp`);
  return new Date(value).toISOString();
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function validateCaptureMetadata(metadata) {
  assertObject(metadata, "run_metadata");
  const allowed = new Set([
    "capture_version", "run_id", "workflow_name", "workflow_url", "event", "conclusion",
    "head_branch", "head_sha", "created_at", "completed_at", "artifact_id", "artifact_name",
    "artifact_created_at", "artifact_expires_at",
  ]);
  for (const key of Object.keys(metadata)) assert(allowed.has(key), `run_metadata.${key} is not allowed`);
  assert(metadata.capture_version === CAPTURE_VERSION, "run_metadata.capture_version is invalid");
  assert(Number.isSafeInteger(metadata.run_id) && metadata.run_id > 0, "run_metadata.run_id is invalid");
  assert(metadata.workflow_name === "Universal Catalog Discovery", "run_metadata.workflow_name is invalid");
  assert(metadata.event === "schedule", "only scheduled discovery runs qualify for the pilot");
  assert(metadata.conclusion === "success", "source workflow conclusion must be success");
  assert(metadata.head_branch === "main", "source workflow must be from main");
  assert(/^[a-f0-9]{40}$/.test(metadata.head_sha), "run_metadata.head_sha must be an exact commit SHA");
  assert(Number.isSafeInteger(metadata.artifact_id) && metadata.artifact_id > 0, "run_metadata.artifact_id is invalid");
  assert(metadata.artifact_name === `universal-catalog-discovery-${metadata.run_id}`, "run_metadata.artifact_name does not match the run");
  return {
    ...metadata,
    created_at: assertTimestamp(metadata.created_at, "run_metadata.created_at"),
    completed_at: assertTimestamp(metadata.completed_at, "run_metadata.completed_at"),
    artifact_created_at: assertTimestamp(metadata.artifact_created_at, "run_metadata.artifact_created_at"),
    artifact_expires_at: assertTimestamp(metadata.artifact_expires_at, "run_metadata.artifact_expires_at"),
  };
}

function validateEnvelope(envelope, evidence, cycleNumber) {
  assertObject(envelope, "task_envelope");
  assert(envelope.envelope_version === "RUFLO_TASK_ENVELOPE_V1", "task envelope version is invalid");
  assert(envelope.agent?.agent_key === UNIVERSAL_CATALOG_AGENT_KEY, "task envelope agent is not the universal catalog discovery agent");
  assert(envelope.agent?.permission_tier === "R0", "task envelope must remain R0");
  assert(envelope.lifecycle?.execution_state === "not_started", "task envelope execution must remain not_started");
  const requiredFalse = [
    "execution_enabled", "workflow_dispatch", "production_writes", "external_actions",
    "cleanup", "cross_worktree_writes",
  ];
  for (const key of requiredFalse) assert(envelope.boundaries?.[key] === false, `task envelope boundary ${key} must be false`);
  const { fingerprint_sha256: fingerprint, ...core } = envelope;
  assert(/^[a-f0-9]{64}$/.test(fingerprint), "task envelope fingerprint is invalid");
  assert(fingerprint === sha256(stableJsonV1(core)), "task envelope fingerprint does not match its contents");
  assert(Array.isArray(envelope.inputs), "task envelope inputs must be an array");
  for (const [file, expectedSha256] of Object.entries(evidence.captureInputHashes)) {
    const matches = envelope.inputs.filter((entry) => (
      entry && normalizeRepoPath(entry.locator).split("/").at(-1) === file
    ));
    assert(matches.length === 1, `task envelope inputs must bind exactly one ${file}`);
    assert(matches[0].sha256 === expectedSha256, `task envelope input does not bind captured evidence: ${file}`);
  }
  const cycleLabel = String(cycleNumber).padStart(2, "0");
  assert(envelope.task_id.includes(`cycle-${cycleLabel}-`), "task envelope task ID does not match the requested cycle");
  assert(Array.isArray(envelope.expected_artifacts), "task envelope expected_artifacts must be an array");
  const expectedDir = defaultUniversalCatalogPilotOutputDirV1(cycleNumber);
  const expectedObservation = `${expectedDir}/cycle_${cycleLabel}_observation.json`;
  const expectedLedger = `${expectedDir}/pilot_ledger_v1.json`;
  const declaredArtifacts = new Set(envelope.expected_artifacts.map((entry) => normalizeRepoPath(entry)));
  assert(declaredArtifacts.has(expectedObservation), "task envelope does not declare the requested cycle observation");
  assert(declaredArtifacts.has(expectedLedger), "task envelope does not declare the requested cycle ledger");
}

export function readDiscoveryEvidenceV1({ evidenceDir }) {
  const captureInputHashes = Object.fromEntries(CAPTURE_INPUT_FILES.map((file) => [
    file,
    sha256(readFileSync(path.join(evidenceDir, file))),
  ]));
  const metadata = validateCaptureMetadata(readJson(path.join(evidenceDir, "run_metadata.json")));
  const artifactHashes = readJson(path.join(evidenceDir, "artifact_hashes.json"));
  assertObject(artifactHashes, "artifact_hashes");
  for (const file of REQUIRED_EVIDENCE_FILES) {
    assert(/^[a-f0-9]{64}$/.test(artifactHashes[file]), `artifact hash is missing or invalid: ${file}`);
    const bytes = readFileSync(path.join(evidenceDir, file));
    assert(sha256(bytes) === artifactHashes[file], `artifact hash mismatch: ${file}`);
  }
  const summary = readJson(path.join(evidenceDir, "summary.json"));
  const sourceFailures = readJson(path.join(evidenceDir, "source_failures.json"));
  const runPlan = readJson(path.join(evidenceDir, "run_plan.json"));
  for (const [label, value] of Object.entries({ metadata, artifactHashes, summary, sourceFailures, runPlan })) {
    assertNoSensitiveKeysV1(value, label);
    assertNoExecutableKeys(value, label);
  }
  assert(summary.version === DISCOVERY_VERSION, "discovery summary version is invalid");
  assert(["completed", "degraded_source_unavailable"].includes(summary.run_status), "discovery run_status is invalid");
  assert(Number.isInteger(summary.actionable_gap_count) && summary.actionable_gap_count >= 0, "actionable_gap_count is invalid");
  assert(Number.isInteger(summary.source_failure_count) && summary.source_failure_count >= 0, "source_failure_count is invalid");
  assert(Array.isArray(sourceFailures), "source_failures.json must contain an array");
  assert(summary.source_failure_count === sourceFailures.length, "source failure count does not reconcile");
  assert(stableJsonV1(summary.source_failures) === stableJsonV1(sourceFailures), "source failure evidence does not reconcile");
  assert(runPlan.version === DISCOVERY_VERSION, "run plan version is invalid");
  assert(runPlan.boundaries?.database_transaction === "read_only", "source database transaction was not read-only");
  for (const key of ["database_writes", "pricing_writes", "publication_writes", "storage_writes"]) {
    assert(runPlan.boundaries?.[key] === false, `source run boundary ${key} must be false`);
  }
  assert(summary.completed_at === metadata.completed_at, "capture completion time does not match summary");
  const evidence = deepFreeze({ metadata, artifactHashes, summary, sourceFailures, runPlan, captureInputHashes });
  VALIDATED_DISCOVERY_EVIDENCE.add(evidence);
  return evidence;
}

export function buildUniversalCatalogShadowObservationV1({ envelope, evidence, cycleNumber }) {
  assert(VALIDATED_DISCOVERY_EVIDENCE.has(evidence), "evidence must come directly from readDiscoveryEvidenceV1");
  assertNoSensitiveKeysV1(envelope, "task_envelope");
  assertNoExecutableKeys(envelope, "task_envelope");
  validateEnvelope(envelope, evidence, cycleNumber);
  assert(Number.isSafeInteger(cycleNumber) && cycleNumber > 0, "cycleNumber must be a positive integer");
  const degraded = evidence.summary.run_status === "degraded_source_unavailable" || evidence.sourceFailures.length > 0;
  const hasGaps = evidence.summary.actionable_gap_count > 0 || evidence.summary.recent_japanese_cards?.missing > 0;
  const attentionClass = degraded ? "source_degraded" : hasGaps ? "catalog_gaps_observed" : "no_actionable_gaps";
  const core = {
    pilot_version: UNIVERSAL_CATALOG_SHADOW_PILOT_VERSION,
    cycle_number: cycleNumber,
    cycle_kind: "shadow_observation",
    agent_key: UNIVERSAL_CATALOG_AGENT_KEY,
    task_envelope_fingerprint_sha256: envelope.fingerprint_sha256,
    source_run: {
      run_id: evidence.metadata.run_id,
      workflow_url: evidence.metadata.workflow_url,
      event: evidence.metadata.event,
      conclusion: evidence.metadata.conclusion,
      head_sha: evidence.metadata.head_sha,
      completed_at: evidence.metadata.completed_at,
      artifact_id: evidence.metadata.artifact_id,
      artifact_name: evidence.metadata.artifact_name,
      artifact_expires_at: evidence.metadata.artifact_expires_at,
      discovery_status: evidence.summary.run_status,
    },
    findings: {
      attention_class: attentionClass,
      actionable_gap_count: evidence.summary.actionable_gap_count,
      canonical_promotion_candidate_count: evidence.summary.canonical_promotion_candidate_count,
      recent_japanese_card_gap_count: evidence.summary.recent_japanese_cards?.missing ?? 0,
      source_failure_count: evidence.sourceFailures.length,
      source_failure_classes: [...new Set(evidence.sourceFailures.map((entry) => entry.failure_class))].sort(),
    },
    outcome: {
      status: degraded ? "held" : "observed",
      qualifies_toward_pilot_minimum: !degraded,
      promotion_eligible: false,
      dispatch_eligible: false,
      next_safe_step: degraded ? "observe_next_scheduled_cycle" : hasGaps ? "route_evidence_reference_for_owner_review" : "observe_next_scheduled_cycle",
    },
    evidence_integrity: {
      verified: true,
      summary_sha256: evidence.artifactHashes["summary.json"],
      source_failures_sha256: evidence.artifactHashes["source_failures.json"],
      run_plan_sha256: evidence.artifactHashes["run_plan.json"],
    },
    boundaries: {
      agent_execution: false,
      workflow_dispatch: false,
      production_writes: false,
      external_actions: false,
      cleanup: false,
      cross_worktree_writes: false,
      issue_reconciliation: false,
    },
  };
  return { ...core, fingerprint_sha256: sha256(stableJsonV1(core)) };
}

export function buildUniversalCatalogPilotLedgerV1(observations) {
  assert(Array.isArray(observations) && observations.length > 0, "observations must be a non-empty array");
  const runIds = new Set();
  const cycleNumbers = new Set();
  for (const observation of observations) {
    assertObject(observation, "ledger observation");
    assert(observation.pilot_version === UNIVERSAL_CATALOG_SHADOW_PILOT_VERSION, "ledger observation version is invalid");
    assert(observation.agent_key === UNIVERSAL_CATALOG_AGENT_KEY, "ledger observation agent is invalid");
    assert(observation.cycle_kind === "shadow_observation", "ledger observation cycle kind is invalid");
    assert(
      /^[a-f0-9]{64}$/.test(observation.task_envelope_fingerprint_sha256),
      "ledger observation task envelope fingerprint is invalid",
    );
    assert(Number.isSafeInteger(observation.cycle_number) && observation.cycle_number > 0, "ledger observation cycle number is invalid");
    assertObject(observation.source_run, "ledger observation source_run");
    assertObject(observation.findings, "ledger observation findings");
    assertObject(observation.outcome, "ledger observation outcome");
    assert(Number.isSafeInteger(observation.source_run.run_id) && observation.source_run.run_id > 0, "ledger observation source run ID is invalid");
    assertTimestamp(observation.source_run.completed_at, "ledger observation source completion time");
    assert(!cycleNumbers.has(observation.cycle_number), `duplicate cycle number: ${observation.cycle_number}`);
    cycleNumbers.add(observation.cycle_number);
    assert(!runIds.has(observation.source_run.run_id), `duplicate source run: ${observation.source_run.run_id}`);
    runIds.add(observation.source_run.run_id);
    const { fingerprint_sha256: fingerprint, ...core } = observation;
    assert(/^[a-f0-9]{64}$/.test(fingerprint), "ledger observation fingerprint is invalid");
    assert(fingerprint === sha256(stableJsonV1(core)), `ledger observation fingerprint mismatch: cycle ${observation.cycle_number}`);
    assert(observation.source_run.event === "schedule", "ledger observations must come from scheduled runs");
    assert(observation.source_run.conclusion === "success", "ledger observation source run must be successful");
    assert(
      ["completed", "degraded_source_unavailable"].includes(observation.source_run.discovery_status),
      "ledger observation discovery status is invalid",
    );
    assert(
      ["source_degraded", "catalog_gaps_observed", "no_actionable_gaps"].includes(observation.findings.attention_class),
      "ledger observation attention class is invalid",
    );
    assert(
      Number.isInteger(observation.findings.source_failure_count) && observation.findings.source_failure_count >= 0,
      "ledger observation source failure count is invalid",
    );
    assert(Array.isArray(observation.findings.source_failure_classes), "ledger observation source failure classes are invalid");
    const sourceDegraded = observation.source_run.discovery_status === "degraded_source_unavailable"
      || observation.findings.source_failure_count > 0
      || observation.findings.source_failure_classes.length > 0;
    assert(
      (observation.findings.attention_class === "source_degraded") === sourceDegraded,
      "ledger observation source degradation signals conflict",
    );
    assert(
      observation.outcome.status === (sourceDegraded ? "held" : "observed"),
      "ledger observation status conflicts with source degradation",
    );
    assert(
      observation.outcome.qualifies_toward_pilot_minimum === !sourceDegraded,
      "ledger observation qualification conflicts with source degradation",
    );
    assert(observation.outcome?.promotion_eligible === false, "ledger observation cannot grant promotion authority");
    assert(observation.outcome?.dispatch_eligible === false, "ledger observation cannot grant dispatch authority");
    assertObject(observation.evidence_integrity, "ledger observation evidence_integrity");
    assert(observation.evidence_integrity.verified === true, "ledger observation evidence integrity must be verified");
    for (const key of ["summary_sha256", "source_failures_sha256", "run_plan_sha256"]) {
      assert(/^[a-f0-9]{64}$/.test(observation.evidence_integrity[key]), `ledger observation ${key} is invalid`);
    }
    assertObject(observation.boundaries, "ledger observation boundaries");
    for (const key of OBSERVATION_BOUNDARY_KEYS) {
      assert(observation.boundaries[key] === false, `ledger observation boundary ${key} must be false`);
    }
    assert(Object.values(observation.boundaries).every((value) => value === false), "ledger observation boundaries must remain false");
  }
  const ordered = [...observations].sort((left, right) => left.cycle_number - right.cycle_number);
  ordered.forEach((observation, index) => {
    assert(observation.cycle_number === index + 1, `ledger cycle sequence must be contiguous from 1; found ${observation.cycle_number} at position ${index + 1}`);
    if (index > 0) {
      assert(
        Date.parse(observation.source_run.completed_at) > Date.parse(ordered[index - 1].source_run.completed_at),
        `ledger source completion time must increase strictly at cycle ${observation.cycle_number}`,
      );
    }
  });
  const qualifying = ordered.filter((entry) => entry.outcome.qualifies_toward_pilot_minimum).length;
  const core = {
    ledger_version: "RUFLO_UNIVERSAL_CATALOG_SHADOW_LEDGER_V1",
    agent_key: UNIVERSAL_CATALOG_AGENT_KEY,
    required_qualifying_cycles: REQUIRED_QUALIFYING_CYCLES,
    observed_cycle_count: ordered.length,
    qualifying_cycle_count: qualifying,
    readiness: qualifying >= REQUIRED_QUALIFYING_CYCLES ? "minimum_observation_met" : "collecting",
    cycles: ordered.map((entry) => ({
      cycle_number: entry.cycle_number,
      source_run_id: entry.source_run.run_id,
      source_completed_at: entry.source_run.completed_at,
      observation_fingerprint_sha256: entry.fingerprint_sha256,
      status: entry.outcome.status,
      qualifies_toward_pilot_minimum: entry.outcome.qualifies_toward_pilot_minimum,
    })),
    authority: { execution_enabled: false, promotion_eligible: false, workflow_dispatch: false },
  };
  return { ...core, fingerprint_sha256: sha256(stableJsonV1(core)) };
}

export function defaultUniversalCatalogPilotOutputDirV1(cycleNumber) {
  assert(Number.isSafeInteger(cycleNumber) && cycleNumber > 0, "cycleNumber must be a positive integer");
  return `docs/audits/ruflo_universal_catalog_shadow_pilot_v1/cycle_${String(cycleNumber).padStart(2, "0")}`;
}

export function validateUniversalCatalogPilotOutputBindingV1({ repoRoot, envelope, cycleNumber, outDir }) {
  const cycleLabel = String(cycleNumber).padStart(2, "0");
  const expectedDir = defaultUniversalCatalogPilotOutputDirV1(cycleNumber);
  const expectedObservation = `${expectedDir}/cycle_${cycleLabel}_observation.json`;
  const expectedLedger = `${expectedDir}/pilot_ledger_v1.json`;
  const actualObservation = normalizeRepoPath(path.relative(repoRoot, path.join(outDir, `cycle_${cycleLabel}_observation.json`)));
  const actualLedger = normalizeRepoPath(path.relative(repoRoot, path.join(outDir, "pilot_ledger_v1.json")));
  assert(actualObservation === expectedObservation, "output observation path does not match the requested cycle");
  assert(actualLedger === expectedLedger, "output ledger path does not match the requested cycle");
  const declaredArtifacts = new Set(envelope.expected_artifacts.map((entry) => normalizeRepoPath(entry)));
  assert(declaredArtifacts.has(actualObservation), "output observation path is not declared by the task envelope");
  assert(declaredArtifacts.has(actualLedger), "output ledger path is not declared by the task envelope");
  return { observationPath: path.join(outDir, `cycle_${cycleLabel}_observation.json`), ledgerPath: path.join(outDir, "pilot_ledger_v1.json") };
}

function argument(name, fallback = null) {
  const prefix = `--${name}=`;
  const match = process.argv.find((entry) => entry.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function argumentsNamed(name) {
  const prefix = `--${name}=`;
  return process.argv.filter((entry) => entry.startsWith(prefix)).map((entry) => entry.slice(prefix.length));
}

function resolveRepoPath(repoRoot, value, label) {
  const normalized = normalizeRepoPath(value);
  assert(normalized && !path.isAbsolute(normalized) && !normalized.split("/").includes(".."), `${label} must be repository-relative without traversal`);
  return path.resolve(repoRoot, normalized);
}

export function readEnvelopeBoundJsonInputV1({ repoRoot, locator, envelope, label = "input" }) {
  const normalizedLocator = normalizeRepoPath(locator);
  const inputPath = resolveRepoPath(repoRoot, normalizedLocator, label);
  const matches = envelope.inputs.filter((entry) => entry && normalizeRepoPath(entry.locator) === normalizedLocator);
  assert(matches.length === 1, `${label} must match exactly one frozen task-envelope input`);
  const bytes = readFileSync(inputPath);
  assert(matches[0].sha256 === sha256(bytes), `${label} hash does not match the frozen task-envelope input`);
  return JSON.parse(bytes.toString("utf8"));
}

function main() {
  const repoRoot = path.resolve(argument("repo-root", process.cwd()));
  const evidenceArg = argument("evidence-dir");
  const envelopeArg = argument("envelope");
  assert(evidenceArg, "--evidence-dir=<repository-relative directory> is required");
  assert(envelopeArg, "--envelope=<repository-relative task envelope> is required");
  const cycleNumber = Number(argument("cycle", "1"));
  const evidenceDir = resolveRepoPath(repoRoot, evidenceArg, "evidence-dir");
  const envelope = readJson(resolveRepoPath(repoRoot, envelopeArg, "envelope"));
  const evidence = readDiscoveryEvidenceV1({ evidenceDir });
  const observation = buildUniversalCatalogShadowObservationV1({ envelope, evidence, cycleNumber });
  const priorObservations = argumentsNamed("prior-observation").map((value) => (
    readEnvelopeBoundJsonInputV1({ repoRoot, locator: value, envelope, label: "prior-observation" })
  ));
  const ledger = buildUniversalCatalogPilotLedgerV1([...priorObservations, observation]);
  const approvedRoot = path.resolve(repoRoot, "docs/audits/ruflo_universal_catalog_shadow_pilot_v1");
  const outDir = path.resolve(repoRoot, argument("out-dir", defaultUniversalCatalogPilotOutputDirV1(cycleNumber)));
  assert(outDir === approvedRoot || outDir.startsWith(`${approvedRoot}${path.sep}`), "out-dir must remain under docs/audits/ruflo_universal_catalog_shadow_pilot_v1");
  const outputPaths = validateUniversalCatalogPilotOutputBindingV1({ repoRoot, envelope, cycleNumber, outDir });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outputPaths.observationPath, `${JSON.stringify(observation, null, 2)}\n`);
  writeFileSync(outputPaths.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ status: "pass", outcome: observation.outcome, findings: observation.findings, ledger: { observed: ledger.observed_cycle_count, qualifying: ledger.qualifying_cycle_count, required: ledger.required_qualifying_cycles }, boundaries: observation.boundaries }, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) main();
