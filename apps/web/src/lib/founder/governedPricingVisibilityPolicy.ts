export const PRICING_RELEASE_BASELINE_SHA =
  "9335c2afada1468ce8a34e3cc67ba4820c86433f";
export const PRICING_SCHEDULER_UTC_HOUR = 8;
export const PRICING_SCHEDULER_UTC_MINUTE = 15;
export const PRICING_SOURCE_FRESHNESS_HOURS = 36;
export const PRICING_CANARY_REQUIRED_HOURS = 72;

export type PricingVisibilityStatus =
  | "healthy"
  | "warning"
  | "blocked"
  | "not_deployed"
  | "not_verified"
  | "unavailable";

export type PricingReleaseGateStatus =
  | "pending"
  | "in_progress"
  | "passed"
  | "blocked"
  | "not_verified";

export type PricingVisibilityStage = {
  id: string;
  label: string;
  status: PricingVisibilityStatus;
  detail: string;
  verificationSource: string;
  verifiedAt: string | null;
};

export type PricingDeploymentState = {
  component: string;
  runningVersion: string | null;
  releaseVersion: string | null;
  status: PricingVisibilityStatus;
  verificationSource: string;
  verifiedAt: string | null;
};

export type PricingReleaseGate = {
  id: string;
  label: string;
  status: PricingReleaseGateStatus;
  detail: string;
};

export type DurablePhaseAttempt = {
  id: string;
  phaseName: string;
  attempt: number;
  state: string;
  createdAt: string;
  startedAt: string;
  completedAt: string | null;
  inputCount: number;
  outputCount: number;
  reconciledCount: number;
  excludedCount: number;
  quarantinedCount: number;
  errorClassification: string | null;
};

export type PricingCanaryState = {
  classification: "Database-only production canary";
  status: PricingVisibilityStatus;
  startAt: string | null;
  requiredEndAt: string | null;
  observedHours: number;
  expectedHours: number;
  exactPriceCount: number;
  positivePriceCount: number;
  staleCount: number;
  brokenProvenanceCount: number;
  findings: string[];
  authenticatedAccess: PricingVisibilityStatus;
  anonymousAccess: PricingVisibilityStatus;
  accessVerifiedAt: string | null;
  accessVerificationSource: string;
  rollbackAvailable: boolean;
  webClientsExercised: boolean;
  flutterClientsExercised: boolean;
  statement: string;
};

export type PricingPlatformOverallState = {
  status: PricingVisibilityStatus;
  label: string;
};

export const LAST_VERIFIED_COVERAGE = {
  policyVersion: "TCGPLAYER_MARKET_COVERAGE_POLICY_V1_2",
  verifiedAt: "2026-07-28T11:11:15.894Z",
  numerator: 31_123,
  denominator: 32_676,
  percentage: 95.247,
  targetPercentage: 95,
  remainingGapRows: 1_553,
  unclassifiedGapRows: 0,
  gapReasons: [
    { reason: "missing_active_source_mapping", count: 1_392 },
    { reason: "variant_assignment_not_exact_child_finish", count: 149 },
    { reason: "missing_mapping_method", count: 9 },
    { reason: "unsupported_product_kind", count: 3 },
  ],
  source:
    "docs/audits/pricing/mee_pricing_platform_production_v1/coverage_scope_v1_2_post_mapping_apply/2026-07-28T11-11-15-894Z/REPORT.md",
} as const;

function parseTime(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function hoursBetween(start: string | null, end: string) {
  const startMs = parseTime(start);
  const endMs = parseTime(end);
  if (startMs === null || endMs === null) return 0;
  return Math.max(0, (endMs - startMs) / (60 * 60 * 1000));
}

export function nextExpectedPricingCycle(nowIso: string) {
  const now = new Date(nowIso);
  if (Number.isNaN(now.getTime())) return null;

  const next = new Date(now);
  next.setUTCHours(
    PRICING_SCHEDULER_UTC_HOUR,
    PRICING_SCHEDULER_UTC_MINUTE,
    0,
    0,
  );
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.toISOString();
}

export function latestDurablePhaseAttempts(
  attempts: DurablePhaseAttempt[],
): DurablePhaseAttempt[] {
  const latestByPhaseAttempt = new Map<string, DurablePhaseAttempt>();
  const ordered = [...attempts].sort((left, right) => {
    const createdDelta =
      (parseTime(right.createdAt) ?? 0) - (parseTime(left.createdAt) ?? 0);
    if (createdDelta !== 0) return createdDelta;
    return right.id.localeCompare(left.id);
  });

  for (const attempt of ordered) {
    const key = `${attempt.phaseName}:${attempt.attempt}`;
    if (!latestByPhaseAttempt.has(key)) {
      latestByPhaseAttempt.set(key, attempt);
    }
  }

  return Array.from(latestByPhaseAttempt.values()).sort((left, right) => {
    const startedDelta =
      (parseTime(left.startedAt) ?? 0) - (parseTime(right.startedAt) ?? 0);
    if (startedDelta !== 0) return startedDelta;
    return left.phaseName.localeCompare(right.phaseName);
  });
}

export function deploymentVerificationStatus(input: {
  verified: boolean | null;
  deployed: boolean | null;
}): PricingVisibilityStatus {
  if (input.deployed === false) return "not_deployed";
  if (input.verified === true) return "healthy";
  if (input.verified === false) return "warning";
  return "not_verified";
}

export function classifyPricingPlatformOverall(input: {
  activePointerReadable: boolean;
  activePublicationPresent: boolean;
  publicationHealthy: boolean;
  deployedClientsVerified: boolean;
  latestRunNeedsAttention: boolean;
}): PricingPlatformOverallState {
  if (!input.activePointerReadable) {
    return {
      status: "unavailable",
      label: "Pricing state unavailable",
    };
  }
  if (!input.activePublicationPresent || !input.publicationHealthy) {
    return {
      status: "blocked",
      label: "Pricing publication needs attention",
    };
  }
  if (input.latestRunNeedsAttention) {
    return {
      status: "warning",
      label: "Database publication healthy; latest run needs attention",
    };
  }
  if (!input.deployedClientsVerified) {
    return {
      status: "warning",
      label: "Database publication healthy; client visibility unverified",
    };
  }
  return {
    status: "healthy",
    label: "Pricing publication and deployed clients verified",
  };
}

export function buildCanaryState(input: {
  nowIso: string;
  activeMode: string | null;
  activatedAt: string | null;
  exactPriceCount: number;
  positivePriceCount: number;
  staleCount: number;
  brokenProvenanceCount: number;
  readModelCount: number;
  rollbackAvailable: boolean;
  authenticatedAccessVerified: boolean;
  anonymousDeniedVerified: boolean;
  accessVerifiedAt?: string | null;
  accessVerificationSource?: string;
  webRenderingVerified: boolean;
  flutterRenderingVerified: boolean;
}): PricingCanaryState {
  const observedHours = hoursBetween(input.activatedAt, input.nowIso);
  const activatedMs = parseTime(input.activatedAt);
  const requiredEndAt =
    activatedMs === null
      ? null
      : new Date(
          activatedMs + PRICING_CANARY_REQUIRED_HOURS * 60 * 60 * 1000,
        ).toISOString();
  const findings: string[] = [];

  if (input.activeMode !== "canary") {
    findings.push("The active publication mode is not canary.");
  }
  if (input.exactPriceCount === 0) {
    findings.push("No exact publication snapshots are active.");
  }
  if (input.positivePriceCount !== input.exactPriceCount) {
    findings.push("Not every active exact price is positive.");
  }
  if (input.readModelCount !== input.exactPriceCount) {
    findings.push("Published snapshot and governed read-model counts differ.");
  }
  if (input.staleCount > 0) {
    findings.push(`${input.staleCount} active snapshots exceed freshness.`);
  }
  if (input.brokenProvenanceCount > 0) {
    findings.push(
      `${input.brokenProvenanceCount} active snapshots have broken provenance.`,
    );
  }

  const databaseHealthy =
    input.activeMode === "canary" &&
    input.exactPriceCount > 0 &&
    input.positivePriceCount === input.exactPriceCount &&
    input.readModelCount === input.exactPriceCount &&
    input.staleCount === 0 &&
    input.brokenProvenanceCount === 0;

  return {
    classification: "Database-only production canary",
    status: databaseHealthy ? "healthy" : "blocked",
    startAt: input.activatedAt,
    requiredEndAt,
    observedHours,
    expectedHours: PRICING_CANARY_REQUIRED_HOURS,
    exactPriceCount: input.exactPriceCount,
    positivePriceCount: input.positivePriceCount,
    staleCount: input.staleCount,
    brokenProvenanceCount: input.brokenProvenanceCount,
    findings,
    authenticatedAccess: input.authenticatedAccessVerified
      ? "healthy"
      : "not_verified",
    anonymousAccess: input.anonymousDeniedVerified
      ? "healthy"
      : "not_verified",
    accessVerifiedAt: input.accessVerifiedAt ?? null,
    accessVerificationSource:
      input.accessVerificationSource ?? "No access probe evidence supplied.",
    rollbackAvailable: input.rollbackAvailable,
    webClientsExercised: input.webRenderingVerified,
    flutterClientsExercised: input.flutterRenderingVerified,
    statement:
      "This canary validates database publication. It does not currently prove deployed web or mobile rendering.",
  };
}

export function buildReleaseGates(input: {
  canary: PricingCanaryState;
  pendingMigrationCount: number;
  webRenderingVerified: boolean;
  flutterRenderingVerified: boolean;
  fullActivation: boolean;
  unattendedCycleCount: number;
  provenanceComplete: boolean;
  coveragePercentage?: number;
  coverageTargetPercentage?: number;
  unclassifiedGapRows?: number;
}): PricingReleaseGate[] {
  const canaryElapsed =
    input.canary.observedHours >= input.canary.expectedHours &&
    input.canary.findings.length === 0;
  const surfacesVerified =
    input.webRenderingVerified && input.flutterRenderingVerified;
  const coveragePercentage =
    input.coveragePercentage ?? LAST_VERIFIED_COVERAGE.percentage;
  const coverageTargetPercentage =
    input.coverageTargetPercentage ??
    LAST_VERIFIED_COVERAGE.targetPercentage;
  const unclassifiedGapRows =
    input.unclassifiedGapRows ?? LAST_VERIFIED_COVERAGE.unclassifiedGapRows;

  return [
    {
      id: "database-canary",
      label: "72-hour authenticated database canary",
      status: canaryElapsed ? "not_verified" : "in_progress",
      detail: canaryElapsed
        ? "The time window elapsed; final scheduled-slot reconciliation is still required."
        : `${input.canary.observedHours.toFixed(1)} of ${input.canary.expectedHours} hours observed.`,
    },
    {
      id: "frozen-migrations",
      label: "Two frozen migrations",
      status: input.pendingMigrationCount === 0 ? "passed" : "pending",
      detail:
        input.pendingMigrationCount === 0
          ? "No frozen migrations remain pending."
          : `${input.pendingMigrationCount} governed migrations remain pending.`,
    },
    {
      id: "schema-security",
      label: "Schema and security parity",
      status: input.pendingMigrationCount === 0 ? "not_verified" : "pending",
      detail:
        "Requires post-apply ledger, schema, grant, RLS, and access readback.",
    },
    {
      id: "fresh-shadow",
      label: "Fresh shadow publication",
      status: "pending",
      detail: "A fresh post-migration full-scope shadow is required.",
    },
    {
      id: "coverage",
      label: "At least 95% fixed-denominator coverage",
      status:
        coveragePercentage >= coverageTargetPercentage
          ? "passed"
          : "blocked",
      detail: `${coveragePercentage}% last verified coverage.`,
    },
    {
      id: "unclassified-gaps",
      label: "Zero unclassified gaps",
      status:
        unclassifiedGapRows === 0
          ? "passed"
          : "blocked",
      detail: `${unclassifiedGapRows} unclassified rows in last verified coverage.`,
    },
    {
      id: "product-surfaces",
      label: "17 product surfaces",
      status: surfacesVerified ? "not_verified" : "pending",
      detail:
        "Source wiring is not deployment proof; route-level production verification is required.",
    },
    {
      id: "provenance",
      label: "Complete provenance",
      status: input.provenanceComplete ? "in_progress" : "blocked",
      detail: input.provenanceComplete
        ? "The active publication is complete; full eligible publication proof remains."
        : "Active publication provenance is incomplete.",
    },
    {
      id: "full-activation",
      label: "Full eligible signed-in activation",
      status: input.fullActivation ? "passed" : "pending",
      detail: input.fullActivation
        ? "The full eligible signed-in set is active."
        : "Only the bounded publication set is active.",
    },
    {
      id: "unattended-cycles",
      label: "Seven unattended daily cycles",
      status: input.unattendedCycleCount >= 7 ? "passed" : "pending",
      detail: `${input.unattendedCycleCount} of 7 verified cycles.`,
    },
    {
      id: "rollback-proof",
      label: "Rollback proof",
      status: input.canary.rollbackAvailable ? "in_progress" : "blocked",
      detail: input.canary.rollbackAvailable
        ? "A previous publication exists; final governed rollback proof remains."
        : "No previous active publication is available.",
    },
    {
      id: "final-report",
      label: "Final checkpoint and report",
      status: "pending",
      detail: "Release completion evidence has not been finalized.",
    },
    {
      id: "anonymous-licensing",
      label: "Anonymous licensing gate",
      status: "blocked",
      detail: "Anonymous pricing remains blocked pending explicit display authority.",
    },
  ];
}
