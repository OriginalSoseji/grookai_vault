import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildCanaryState,
  buildReleaseGates,
  classifyPricingPlatformOverall,
  deploymentVerificationStatus,
  latestDurablePhaseAttempts,
} from "../../apps/web/src/lib/founder/governedPricingVisibilityPolicy.ts";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");

function source(...segments) {
  return readFileSync(path.join(ROOT, ...segments), "utf8");
}

const ROUTE = source(
  "apps",
  "web",
  "src",
  "app",
  "founder",
  "pricing",
  "page.tsx",
);
const SUMMARY = source(
  "apps",
  "web",
  "src",
  "lib",
  "founder",
  "getGovernedPricingPlatformSummary.ts",
);
const COMPONENT = source(
  "apps",
  "web",
  "src",
  "components",
  "founder",
  "FounderGovernedPricingPlatform.tsx",
);
const REFRESH = source(
  "apps",
  "web",
  "src",
  "components",
  "founder",
  "FounderPricingRefreshControl.tsx",
);

function canary(overrides = {}) {
  return buildCanaryState({
    nowIso: "2026-07-31T08:40:15.793Z",
    activeMode: "canary",
    activatedAt: "2026-07-28T08:40:15.793Z",
    exactPriceCount: 100,
    positivePriceCount: 100,
    staleCount: 0,
    brokenProvenanceCount: 0,
    readModelCount: 100,
    rollbackAvailable: true,
    authenticatedAccessVerified: true,
    anonymousDeniedVerified: true,
    webRenderingVerified: false,
    flutterRenderingVerified: false,
    ...overrides,
  });
}

test("database-only canary is healthy only inside the database boundary", () => {
  const result = canary();
  assert.equal(result.classification, "Database-only production canary");
  assert.equal(result.status, "healthy");
  assert.equal(result.observedHours, 72);
  assert.equal(result.remainingHours, 0);
  assert.equal(result.windowElapsed, true);
  assert.equal(result.webClientsExercised, false);
  assert.equal(result.flutterClientsExercised, false);
  assert.match(result.statement, /does not currently prove deployed web or mobile rendering/i);
});

test("stale or broken publication evidence blocks the canary", () => {
  const result = canary({ staleCount: 2, brokenProvenanceCount: 1 });
  assert.equal(result.status, "blocked");
  assert.deepEqual(result.findings, [
    "2 active snapshots exceed freshness.",
    "1 active snapshots have broken provenance.",
  ]);
});

test("deployment state remains unknown without provider evidence", () => {
  assert.equal(
    deploymentVerificationStatus({ deployed: null, verified: null }),
    "not_verified",
  );
  assert.equal(
    deploymentVerificationStatus({ deployed: false, verified: null }),
    "not_deployed",
  );
  assert.equal(
    deploymentVerificationStatus({ deployed: true, verified: true }),
    "healthy",
  );
});

test("overall status does not equate database publication with client visibility", () => {
  const result = classifyPricingPlatformOverall({
    activePointerReadable: true,
    activePublicationPresent: true,
    publicationHealthy: true,
    deployedClientsVerified: false,
    latestRunNeedsAttention: false,
  });
  assert.equal(result.status, "warning");
  assert.match(result.label, /client visibility unverified/i);
});

test("no active publication and failed latest run states are explicit", () => {
  assert.deepEqual(
    classifyPricingPlatformOverall({
      activePointerReadable: true,
      activePublicationPresent: false,
      publicationHealthy: false,
      deployedClientsVerified: false,
      latestRunNeedsAttention: false,
    }),
    {
      status: "blocked",
      label: "Pricing publication needs attention",
    },
  );
  assert.deepEqual(
    classifyPricingPlatformOverall({
      activePointerReadable: true,
      activePublicationPresent: true,
      publicationHealthy: true,
      deployedClientsVerified: false,
      latestRunNeedsAttention: true,
    }),
    {
      status: "warning",
      label: "Database publication healthy; latest run needs attention",
    },
  );
});

test("durable phases retain only the latest state for each phase attempt", () => {
  const common = {
    attempt: 1,
    startedAt: "2026-07-28T08:00:00.000Z",
    completedAt: null,
    inputCount: 100,
    outputCount: 0,
    reconciledCount: 0,
    excludedCount: 0,
    quarantinedCount: 0,
    errorClassification: null,
  };
  const result = latestDurablePhaseAttempts([
    {
      ...common,
      id: "started",
      phaseName: "qualify",
      state: "started",
      createdAt: "2026-07-28T08:00:00.000Z",
    },
    {
      ...common,
      id: "succeeded",
      phaseName: "qualify",
      state: "succeeded",
      createdAt: "2026-07-28T08:01:00.000Z",
      completedAt: "2026-07-28T08:01:00.000Z",
      outputCount: 100,
      reconciledCount: 100,
    },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].state, "succeeded");
  assert.equal(result[0].outputCount, 100);
});

test("release gates block low coverage and unclassified gaps", () => {
  const gates = buildReleaseGates({
    canary: canary(),
    pendingMigrationCount: 2,
    webRenderingVerified: false,
    flutterRenderingVerified: false,
    fullActivation: false,
    unattendedCycleCount: 0,
    provenanceComplete: true,
    coveragePercentage: 94.9,
    coverageTargetPercentage: 95,
    unclassifiedGapRows: 3,
    currentPublicationOutOfScopeCount: 2,
  });
  assert.equal(gates.find((gate) => gate.id === "coverage")?.status, "blocked");
  assert.equal(
    gates.find((gate) => gate.id === "unclassified-gaps")?.status,
    "blocked",
  );
  assert.equal(
    gates.find((gate) => gate.id === "product-surfaces")?.status,
    "pending",
  );
  assert.equal(
    gates.find((gate) => gate.id === "current-publication-scope")?.status,
    "blocked",
  );
});

test("Founder dashboard exposes all post-canary migrations and scope evidence", () => {
  assert.match(SUMMARY, /20260728130000/);
  assert.match(SUMMARY, /20260728133000/);
  assert.match(SUMMARY, /20260730180000/);
  assert.match(COMPONENT, /Current canary scope correction required/);
  assert.match(COMPONENT, /post-canary shadow must omit them/);
});

test("Founder route enforces access and keeps service data server-side", () => {
  assert.match(ROUTE, /requireFounderAccess\("\/founder\/pricing"\)/);
  assert.match(ROUTE, /createServerAdminClient\(\)/);
  assert.match(SUMMARY, /^import "server-only";/);
  assert.doesNotMatch(COMPONENT, /createServerAdminClient|service_role|SUPABASE_SERVICE/);
  assert.doesNotMatch(REFRESH, /createServerAdminClient|service_role|SUPABASE_SERVICE/);
});

test("Founder pricing implementation is read-only", () => {
  const implementation = `${ROUTE}\n${SUMMARY}\n${COMPONENT}\n${REFRESH}`;
  assert.doesNotMatch(
    implementation,
    /\.(insert|update|upsert|delete)\s*\(/,
  );
  assert.doesNotMatch(
    implementation,
    /\b(activate|rollback|deploy|migrate|schedule)\s*\(/,
  );
  assert.match(COMPONENT, /Operational evidence only/);
  assert.match(SUMMARY, /operations_notification_events/);
  assert.match(SUMMARY, /received_at/);
  assert.doesNotMatch(SUMMARY, /operations_notification_events[\s\S]{0,220}created_at/);
});

test("UI states published database and unverified clients separately", () => {
  const renderedContract = `${SUMMARY}\n${COMPONENT}`;
  assert.match(renderedContract, /Published in database/);
  assert.match(renderedContract, /Visible on web|webVisibility/);
  assert.match(renderedContract, /Visible in Flutter|flutterVisibility/);
  assert.match(COMPONENT, /Database publication is not presented as deployed client visibility/);
  assert.match(COMPONENT, /Unknown means no deployed-provider evidence is available/);
  assert.match(SUMMARY, /governedRpcCompatibleCount/);
  assert.match(SUMMARY, /frozen read-model completion migration remains pending/);
});

test("trace exposes safe fingerprints and no unrestricted payload", () => {
  assert.match(SUMMARY, /shortFingerprint/);
  assert.match(SUMMARY, /sourceRowFingerprint/);
  assert.match(SUMMARY, /sourceArtifactFingerprint/);
  assert.doesNotMatch(COMPONENT, /source_row_hash|source_artifact_hash/);
  assert.match(COMPONENT, /Price unavailable/);
});

test("detailed view polls at the governed 60-second interval", () => {
  assert.match(REFRESH, /REFRESH_INTERVAL_MS = 60_000/);
  assert.match(REFRESH, /router\.refresh\(\)/);
  assert.match(REFRESH, /window\.setInterval/);
});
