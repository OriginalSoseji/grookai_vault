import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const PACKAGE_DIR = path.join(AUDIT_DIR, "MEE_CORE_LIFECYCLE_TINY_BACKFILL_PLAN_V1");
const PROJECTION_PATH = path.join(AUDIT_DIR, "MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1.json");
const PACKAGE_ID = "MEE-CORE-LIFECYCLE-TINY-BACKFILL-PLAN-V1";
const APPROVED_PROJECTION_FINGERPRINT = "99d6f31b5aab277785f1631ba9167a4c6382db9fda717df76803ef4d8e3af34d";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function sha256(value) {
  const input = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(input).digest("hex");
}

function normalizeTimestamp(value) {
  return value ?? null;
}

function asJsonl(rows) {
  return `${rows.map((row) => JSON.stringify(stable(row))).join("\n")}\n`;
}

function validateRows(observations, events) {
  const errors = [];
  const observationIds = new Set(observations.map((row) => row.id));
  const eventHashes = new Set();

  for (const observation of observations) {
    if (!observation.id) errors.push("observation_missing_id");
    if (!observation.source) errors.push(`observation_missing_source:${observation.id}`);
    if (!observation.source_type) errors.push(`observation_missing_source_type:${observation.id}`);
    if (!observation.source_record_id) errors.push(`observation_missing_source_record_id:${observation.id}`);
  }

  for (const event of events) {
    if (!observationIds.has(event.observation_id)) errors.push(`event_missing_observation:${event.id}`);
    if (event.needs_review !== true) errors.push(`event_needs_review_not_true:${event.id}`);
    if (event.publishable !== false) errors.push(`event_publishable_not_false:${event.id}`);
    if (event.app_visible !== false) errors.push(`event_app_visible_not_false:${event.id}`);
    if (event.market_truth !== false) errors.push(`event_market_truth_not_false:${event.id}`);
    if (eventHashes.has(event.event_hash)) errors.push(`duplicate_event_hash:${event.event_hash}`);
    eventHashes.add(event.event_hash);
  }

  for (const observation of observations) {
    const stages = events
      .filter((event) => event.observation_id === observation.id)
      .sort((left, right) => left.stage_order - right.stage_order)
      .map((event) => event.to_state);
    const expected = [
      "acquired",
      "raw_stored",
      "normalized",
      "matched",
      "classified",
      "quality_gated",
      "rollup_eligible",
    ];
    if (JSON.stringify(stages) !== JSON.stringify(expected)) {
      errors.push(`stage_sequence_invalid:${observation.id}`);
    }
  }

  return errors;
}

function renderMarkdown(report) {
  return [
    "# MEE Core Lifecycle Tiny Backfill Plan V1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "Mode: local apply package plan only, no DB writes",
    "",
    "## Summary",
    "",
    `- Package: \`${report.package_id}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Source projection fingerprint: \`${report.source_projection_fingerprint}\``,
    `- Observation rows: ${report.row_counts.market_evidence_observations}`,
    `- Lifecycle event rows: ${report.row_counts.market_evidence_lifecycle_events}`,
    `- Findings: ${report.findings.length}`,
    "",
    "## Artifacts",
    "",
    `- Observations JSONL: \`${report.artifacts.observations_jsonl}\``,
    `- Lifecycle events JSONL: \`${report.artifacts.lifecycle_events_jsonl}\``,
    `- Manifest JSON: \`${report.artifacts.manifest_json}\``,
    "",
    "## Boundary Proof",
    "",
    "```json",
    JSON.stringify(report.boundary_proof, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Approval Prompt",
    "",
    "`Approve real MEE-CORE-LIFECYCLE-TINY-BACKFILL-APPLY-V1 apply only. Package fingerprint: "
      + report.package_fingerprint_sha256
      + ". Projection fingerprint: "
      + report.source_projection_fingerprint
      + ". Scope: insert "
      + report.row_counts.market_evidence_observations
      + " market_evidence_observations rows and "
      + report.row_counts.market_evidence_lifecycle_events
      + " market_evidence_lifecycle_events rows from local MEE-CORE-LIFECYCLE-TINY-BACKFILL-PLAN-V1 artifacts only. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image/storage writes. No deletes. No upserts. No merges. No migrations. No global apply.`",
    "",
  ].join("\n");
}

const projection = JSON.parse(readFileSync(PROJECTION_PATH, "utf8"));
if (projection.package_fingerprint_sha256 !== APPROVED_PROJECTION_FINGERPRINT) {
  throw new Error(
    `Projection fingerprint mismatch: expected ${APPROVED_PROJECTION_FINGERPRINT}, got ${projection.package_fingerprint_sha256}`,
  );
}

const observations = projection.projected_samples.map((sample) => ({
  ...sample.observation,
  first_seen_at: normalizeTimestamp(sample.observation.first_seen_at),
  created_at: normalizeTimestamp(sample.observation.created_at),
}));

const lifecycleEvents = projection.projected_samples.flatMap((sample) =>
  sample.lifecycle_events.map((event) => ({
    ...event,
    created_at: normalizeTimestamp(event.created_at),
  })),
);

const findings = validateRows(observations, lifecycleEvents);
const observationJsonl = asJsonl(observations);
const lifecycleEventJsonl = asJsonl(lifecycleEvents);
const observationManifestHash = sha256(observationJsonl);
const lifecycleEventManifestHash = sha256(lifecycleEventJsonl);

const reportPayload = {
  projection_fingerprint: projection.package_fingerprint_sha256,
  observation_manifest_hash: observationManifestHash,
  lifecycle_event_manifest_hash: lifecycleEventManifestHash,
  observations,
  lifecycleEvents,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "local_backfill_plan_only_no_db_writes",
  source_projection_path: "docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1.json",
  source_projection_fingerprint: projection.package_fingerprint_sha256,
  package_fingerprint_sha256: sha256(reportPayload),
  row_counts: {
    market_evidence_observations: observations.length,
    market_evidence_lifecycle_events: lifecycleEvents.length,
  },
  manifest_hashes: {
    market_evidence_observations_jsonl_sha256: observationManifestHash,
    market_evidence_lifecycle_events_jsonl_sha256: lifecycleEventManifestHash,
  },
  findings,
  artifacts: {
    observations_jsonl: "docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_TINY_BACKFILL_PLAN_V1/market_evidence_observations.jsonl",
    lifecycle_events_jsonl: "docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_TINY_BACKFILL_PLAN_V1/market_evidence_lifecycle_events.jsonl",
    manifest_json: "docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_TINY_BACKFILL_PLAN_V1/manifest.json",
    report_md: "docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_TINY_BACKFILL_PLAN_V1.md",
  },
  boundary_proof: {
    db_writes: false,
    evidence_backfill_apply: false,
    provider_calls: false,
    source_fetches: false,
    pricing_observations_writes: false,
    ebay_active_prices_latest_writes: false,
    public_pricing_views: false,
    app_visible_pricing: false,
    public_price_rollups: false,
    identity_table_writes: false,
    vault_writes: false,
    image_storage_writes: false,
    deletes: false,
    upserts: false,
    merges: false,
    migrations: false,
    global_apply: false,
  },
};

mkdirSync(PACKAGE_DIR, { recursive: true });
writeFileSync(path.join(PACKAGE_DIR, "market_evidence_observations.jsonl"), observationJsonl);
writeFileSync(path.join(PACKAGE_DIR, "market_evidence_lifecycle_events.jsonl"), lifecycleEventJsonl);
writeFileSync(path.join(PACKAGE_DIR, "manifest.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, "MEE_CORE_LIFECYCLE_TINY_BACKFILL_PLAN_V1.md"), renderMarkdown(report));

console.log(JSON.stringify({
  package_id: report.package_id,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  source_projection_fingerprint: report.source_projection_fingerprint,
  row_counts: report.row_counts,
  manifest_hashes: report.manifest_hashes,
  findings: report.findings,
  artifacts: report.artifacts,
}, null, 2));
