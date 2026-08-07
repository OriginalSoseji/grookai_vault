import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getMarketPricingReadModelV1 } from "@/lib/pricing/marketPricingReadModelV1";
import {
  buildCanaryState,
  buildReleaseGates,
  classifyPricingPlatformOverall,
  deploymentVerificationStatus,
  LAST_VERIFIED_COVERAGE,
  LAST_VERIFIED_CURRENT_PUBLICATION_SCOPE,
  latestDurablePhaseAttempts,
  nextExpectedPricingCycle,
  PRICING_RELEASE_BASELINE_SHA,
  PRICING_SOURCE_FRESHNESS_HOURS,
  type DurablePhaseAttempt,
  type PricingCanaryState,
  type PricingDeploymentState,
  type PricingReleaseGate,
  type PricingVisibilityStage,
  type PricingVisibilityStatus,
} from "@/lib/founder/governedPricingVisibilityPolicy";

type AdminClient = SupabaseClient;

type CurrentPublicationRow = {
  publication_set_id: string;
  run_id: string;
  previous_publication_set_id: string | null;
  activated_at: string;
  updated_at: string;
};

type PublicationSetRow = {
  id: string;
  run_id: string;
  run_key: string;
  publication_state: string;
  expected_snapshot_count: number;
  previous_publication_set_id: string | null;
  published_at: string | null;
  superseded_at: string | null;
  rolled_back_at: string | null;
  rollback_reason: string | null;
  reconciliation: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type PipelineRunRow = {
  id: string;
  run_key: string;
  pipeline_version: string;
  policy_version: string;
  run_mode: string;
  source_name: string;
  source_observed_on: string | null;
  source_sync_run_id: string | null;
  source_artifact_id: string | null;
  source_artifact_hash: string | null;
  source_marker: string | null;
  state: string;
  current_phase: string | null;
  reconciliation_state: string;
  selected_count: number;
  mapped_count: number;
  excluded_count: number;
  quarantined_count: number;
  delayed_count: number;
  suppressed_count: number;
  eligible_count: number;
  snapshot_count: number;
  required_phase_count: number;
  succeeded_phase_count: number;
  git_commit_sha: string;
  worker_version: string;
  schema_version: string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  error_classification: string | null;
  error: string | null;
  reconciliation: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type PhaseAttemptRow = {
  id: string;
  phase_name: string;
  attempt: number;
  state: string;
  started_at: string;
  completed_at: string | null;
  input_count: number;
  output_count: number;
  reconciled_count: number;
  excluded_count: number;
  quarantined_count: number;
  error_classification: string | null;
  error: string | null;
  created_at: string;
};

type SourceSyncRow = {
  id: string;
  run_key: string;
  status: string;
  source_marker: string | null;
  observed_on: string | null;
  request_count: number;
  category_count: number;
  group_count: number;
  product_count: number;
  price_row_count: number;
  failed_count: number;
  git_commit_sha: string | null;
  started_at: string | null;
  finished_at: string | null;
};

type OperationsAlertRow = {
  id: string;
  notification_id: string;
  event_type: string;
  severity: string;
  source_host: string;
  source_unit: string;
  recipient_count: number;
  received_at: string;
};

type TraceSnapshotRow = {
  id: string;
  provenance_id: string;
  publication_set_id: string;
  run_id: string;
  qualification_decision_id: string;
  source_observation_id: string;
  source_artifact_hash: string;
  source_price_row_identity: string;
  source_row_hash: string;
  source_product_id: number;
  source_subtype_name: string;
  source_observed_on: string;
  source_sync_finished_at: string;
  card_print_id: string;
  card_printing_id: string;
  gv_id: string;
  printing_gv_id: string;
  finish_key: string;
  currency: string;
  market_price: number;
  observed_at: string;
  published_at: string;
  freshness_state: string;
  publication_state: string;
};

type TraceDecisionRow = {
  id: string;
  mapping_method: string | null;
  mapping_confidence: number | null;
  language_result: string;
  finish_result: string;
  decision: string;
  eligible: boolean;
  publication_lane: string;
  reason_codes: string[];
  source_integrity_result: string;
  duplicate_product_result: string;
  freshness_result: string;
  variant_assignment_status: string | null;
  evaluated_at: string;
};

type ActiveSnapshotIdentityRow = {
  card_print_id: string;
  card_printing_id: string;
};

export type FounderPricingRun = {
  id: string;
  runKey: string;
  mode: string;
  state: string;
  reconciliationState: string;
  sourceObservedOn: string | null;
  sourceAgeHours: number | null;
  commitSha: string;
  workerVersion: string;
  schemaVersion: string;
  currentPhase: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  selectedCount: number;
  mappedCount: number;
  eligibleCount: number;
  snapshotCount: number;
  quarantinedCount: number;
  excludedCount: number;
  delayedCount: number;
  suppressedCount: number;
  requiredPhaseCount: number;
  succeededPhaseCount: number;
  errorClassification: string | null;
  error: string | null;
  findings: string[];
};

export type FounderPricingPhase = {
  name: string;
  label: string;
  attempt: number;
  state: string;
  startedAt: string;
  completedAt: string | null;
  inputCount: number;
  outputCount: number;
  reconciledCount: number;
  excludedCount: number;
  quarantinedCount: number;
  errorClassification: string | null;
};

export type FounderPricingCoverage = typeof LAST_VERIFIED_COVERAGE & {
  thresholdStatus: "passed" | "blocked";
};

export type FounderPricingTracePrinting = {
  cardPrintingId: string;
  printingGvId: string;
  finish: string;
  marketPrice: number;
  currency: string;
  sourceProductId: number;
  sourceSubtypeName: string;
  sourceObservedOn: string;
  observedAt: string;
  sourceRowFingerprint: string;
  sourceArtifactFingerprint: string;
  mappingMethod: string | null;
  mappingConfidence: number | null;
  languageResult: string;
  finishResult: string;
  qualificationStatus: string;
  publicationLane: string;
  reasonCodes: string[];
  publicationSnapshotId: string;
  provenanceId: string;
  publicationSetId: string;
  activePointer: boolean;
  governedRpcAvailable: boolean;
};

export type FounderPricingTrace = {
  requestedGvId: string;
  foundParent: boolean;
  status: "available" | "unavailable" | "invalid";
  cardPrintId: string | null;
  canonicalName: string | null;
  activePublicationSetId: string | null;
  printings: FounderPricingTracePrinting[];
  deployedApiVisibility: PricingVisibilityStatus;
  webVisibility: PricingVisibilityStatus;
  flutterVisibility: PricingVisibilityStatus;
  unavailableReason: string | null;
};

export type FounderGovernedPricingPlatformSummary = {
  generatedAt: string;
  overall: {
    status: PricingVisibilityStatus;
    label: string;
    detail: string;
  };
  system: {
    activePublicationSetId: string | null;
    activeRunId: string | null;
    publicationMode: string;
    publicationSize: number;
    readModelSize: number;
    governedRpcCompatibleSize: number;
    activatedAt: string | null;
    lastSuccessfulRunAt: string | null;
    nextExpectedCycleAt: string | null;
    sourceAgeHours: number | null;
    rollbackAvailable: boolean;
  };
  visibilityLadder: PricingVisibilityStage[];
  canary: PricingCanaryState;
  activeRun: FounderPricingRun | null;
  latestRun: FounderPricingRun | null;
  recentRuns: FounderPricingRun[];
  phases: FounderPricingPhase[];
  coverage: FounderPricingCoverage;
  publicationScope: typeof LAST_VERIFIED_CURRENT_PUBLICATION_SCOPE;
  deployments: PricingDeploymentState[];
  releaseGates: PricingReleaseGate[];
  alerts: {
    totalCount: number;
    recent: OperationsAlertRow[];
  };
  pendingMigrations: Array<{ version: string; name: string }>;
  errors: string[];
};

const PENDING_MIGRATIONS = [
  {
    version: "20260728130000",
    name: "TCGPlayer market read-model contract completion",
  },
  {
    version: "20260728133000",
    name: "Vault exact market pricing targets",
  },
  {
    version: "20260730180000",
    name: "TCGPlayer market parent-summary runtime repair",
  },
] as const;

const ACCESS_PROOF_AT = "2026-07-28T16:57:46.934Z";
const RUN_STALE_HOURS = 2;

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    typeof value === "string" &&
    value.trim() &&
    Number.isFinite(Number(value))
  ) {
    return Number(value);
  }
  return 0;
}

function parseTime(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function ageHours(value: string | null | undefined, nowIso: string) {
  const timestamp = parseTime(value);
  const now = parseTime(nowIso);
  if (timestamp === null || now === null) return null;
  return Math.max(0, (now - timestamp) / (60 * 60 * 1000));
}

function shortFingerprint(value: string | null | undefined) {
  if (!value) return "-";
  return value.length <= 12 ? value : `${value.slice(0, 12)}...`;
}

function envBoolean(name: string) {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
}

function envText(name: string) {
  return process.env[name]?.trim() || null;
}

function phaseLabel(name: string) {
  const labels: Record<string, string> = {
    prepare_variant_assignments: "Prepare exact printing assignments",
    stage_candidates: "Stage source candidates",
    qualify: "Qualify exact prices",
    build_publication: "Build publication snapshots",
    reconcile: "Reconcile counts and provenance",
    activate: "Activate publication set",
  };
  return labels[name] ?? name.replace(/_/g, " ");
}

function mapRun(row: PipelineRunRow, nowIso: string): FounderPricingRun {
  const findings: string[] = [];
  const runAge = ageHours(row.started_at ?? row.created_at, nowIso);
  if (row.state === "running" && (runAge ?? 0) > RUN_STALE_HOURS) {
    findings.push(`Run has remained in running state for ${(runAge ?? 0).toFixed(1)} hours.`);
  }
  if (row.reconciliation_state === "mismatch") {
    findings.push("Run reconciliation contains mismatches.");
  }
  if (row.error_classification || row.error) {
    findings.push(
      row.error_classification ?? row.error ?? "Run recorded an error.",
    );
  }
  if (row.succeeded_phase_count < row.required_phase_count) {
    findings.push(
      `${row.succeeded_phase_count} of ${row.required_phase_count} required phases succeeded.`,
    );
  }

  return {
    id: row.id,
    runKey: row.run_key,
    mode: row.run_mode,
    state: row.state,
    reconciliationState: row.reconciliation_state,
    sourceObservedOn: row.source_observed_on,
    sourceAgeHours: ageHours(row.source_observed_on, nowIso),
    commitSha: row.git_commit_sha,
    workerVersion: row.worker_version,
    schemaVersion: row.schema_version,
    currentPhase: row.current_phase,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    failedAt: row.failed_at,
    selectedCount: numberValue(row.selected_count),
    mappedCount: numberValue(row.mapped_count),
    eligibleCount: numberValue(row.eligible_count),
    snapshotCount: numberValue(row.snapshot_count),
    quarantinedCount: numberValue(row.quarantined_count),
    excludedCount: numberValue(row.excluded_count),
    delayedCount: numberValue(row.delayed_count),
    suppressedCount: numberValue(row.suppressed_count),
    requiredPhaseCount: numberValue(row.required_phase_count),
    succeededPhaseCount: numberValue(row.succeeded_phase_count),
    errorClassification: row.error_classification,
    error: row.error,
    findings,
  };
}

function deploymentInputs() {
  const vercelCommit = envText("VERCEL_GIT_COMMIT_SHA");
  const vercelDeployment = envText("VERCEL_DEPLOYMENT_ID");
  const vercelVerifiedAt = envText("FOUNDER_PRICING_WEB_VERIFIED_AT");
  const apiVerifiedAt = envText("FOUNDER_PRICING_API_VERIFIED_AT");
  const flutterVerifiedAt = envText("FOUNDER_PRICING_FLUTTER_VERIFIED_AT");

  return {
    web: {
      deployed: vercelCommit ? true : envBoolean("FOUNDER_PRICING_WEB_DEPLOYED"),
      verified: envBoolean("FOUNDER_PRICING_WEB_RENDER_VERIFIED"),
      runningVersion: vercelCommit ?? vercelDeployment,
      verifiedAt: vercelVerifiedAt,
    },
    api: {
      deployed: vercelCommit ? true : envBoolean("FOUNDER_PRICING_API_DEPLOYED"),
      verified: envBoolean("FOUNDER_PRICING_API_VERIFIED"),
      runningVersion: vercelCommit ?? vercelDeployment,
      verifiedAt: apiVerifiedAt,
    },
    flutter: {
      deployed: envBoolean("FOUNDER_PRICING_FLUTTER_DEPLOYED"),
      verified: envBoolean("FOUNDER_PRICING_FLUTTER_RENDER_VERIFIED"),
      runningVersion: envText("FOUNDER_PRICING_FLUTTER_BUILD"),
      verifiedAt: flutterVerifiedAt,
    },
  };
}

async function countRows(
  queryPromise: PromiseLike<{
    count: number | null;
    error: { message: string } | null;
  }>,
  label: string,
  errors: string[],
) {
  const { count, error } = await queryPromise;
  if (error) {
    errors.push(`${label}: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

async function fetchRecentRuns(
  admin: AdminClient,
  errors: string[],
): Promise<PipelineRunRow[]> {
  const { data, error } = await admin
    .from("market_price_pipeline_runs")
    .select(
      "id,run_key,pipeline_version,policy_version,run_mode,source_name,source_observed_on,source_sync_run_id,source_artifact_id,source_artifact_hash,source_marker,state,current_phase,reconciliation_state,selected_count,mapped_count,excluded_count,quarantined_count,delayed_count,suppressed_count,eligible_count,snapshot_count,required_phase_count,succeeded_phase_count,git_commit_sha,worker_version,schema_version,started_at,completed_at,failed_at,error_classification,error,reconciliation,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) {
    errors.push(`Recent pricing runs: ${error.message}`);
    return [];
  }
  return (data ?? []) as PipelineRunRow[];
}

async function fetchAlerts(admin: AdminClient, errors: string[]) {
  const { data, error, count } = await admin
    .from("operations_notification_events")
    .select(
      "id,notification_id,event_type,severity,source_host,source_unit,recipient_count,received_at",
      { count: "exact" },
    )
    .order("received_at", { ascending: false })
    .limit(8);
  if (error) {
    errors.push(`Pricing operations alerts: ${error.message}`);
    return { totalCount: 0, recent: [] };
  }
  return {
    totalCount: count ?? 0,
    recent: (data ?? []) as OperationsAlertRow[],
  };
}

export async function getFounderGovernedPricingPlatformSummary(
  admin: AdminClient,
): Promise<FounderGovernedPricingPlatformSummary> {
  const generatedAt = new Date().toISOString();
  const errors: string[] = [];
  const deploymentsInput = deploymentInputs();

  const [recentRunRows, alerts] = await Promise.all([
    fetchRecentRuns(admin, errors),
    fetchAlerts(admin, errors),
  ]);

  const currentResult = await admin
    .from("market_price_current_publication")
    .select(
      "publication_set_id,run_id,previous_publication_set_id,activated_at,updated_at",
    )
    .eq("singleton", true)
    .maybeSingle();
  if (currentResult.error) {
    errors.push(`Active publication pointer: ${currentResult.error.message}`);
  }
  const current = (currentResult.data as CurrentPublicationRow | null) ?? null;

  let activeSet: PublicationSetRow | null = null;
  let activeRunRow: PipelineRunRow | null = null;
  let sourceSync: SourceSyncRow | null = null;
  let phases: FounderPricingPhase[] = [];
  let publishedCount = 0;
  let positiveCount = 0;
  let staleCount = 0;
  let brokenProvenanceCount = 0;
  let readModelCount = 0;
  let governedRpcCompatibleCount = 0;
  let sourceAge: number | null = null;

  if (current) {
    const [setResult, runResult] = await Promise.all([
      admin
        .from("market_price_publication_sets")
        .select(
          "id,run_id,run_key,publication_state,expected_snapshot_count,previous_publication_set_id,published_at,superseded_at,rolled_back_at,rollback_reason,reconciliation,created_at,updated_at",
        )
        .eq("id", current.publication_set_id)
        .maybeSingle(),
      admin
        .from("market_price_pipeline_runs")
        .select(
          "id,run_key,pipeline_version,policy_version,run_mode,source_name,source_observed_on,source_sync_run_id,source_artifact_id,source_artifact_hash,source_marker,state,current_phase,reconciliation_state,selected_count,mapped_count,excluded_count,quarantined_count,delayed_count,suppressed_count,eligible_count,snapshot_count,required_phase_count,succeeded_phase_count,git_commit_sha,worker_version,schema_version,started_at,completed_at,failed_at,error_classification,error,reconciliation,created_at,updated_at",
        )
        .eq("id", current.run_id)
        .maybeSingle(),
    ]);
    if (setResult.error) {
      errors.push(`Active publication set: ${setResult.error.message}`);
    }
    if (runResult.error) {
      errors.push(`Active publication run: ${runResult.error.message}`);
    }
    activeSet = (setResult.data as PublicationSetRow | null) ?? null;
    activeRunRow = (runResult.data as PipelineRunRow | null) ?? null;

    const staleCutoff = new Date(
      Date.parse(generatedAt) -
        PRICING_SOURCE_FRESHNESS_HOURS * 60 * 60 * 1000,
    ).toISOString();
    const [
      published,
      positive,
      stale,
      broken,
      readModel,
      oldestSnapshotResult,
      phaseResult,
      activeSnapshotIdentityResult,
    ] = await Promise.all([
      countRows(
        admin
          .from("market_price_publication_snapshots")
          .select("id", { count: "exact", head: true })
          .eq("publication_set_id", current.publication_set_id),
        "Published snapshot count",
        errors,
      ),
      countRows(
        admin
          .from("market_price_publication_snapshots")
          .select("id", { count: "exact", head: true })
          .eq("publication_set_id", current.publication_set_id)
          .gt("market_price", 0),
        "Positive snapshot count",
        errors,
      ),
      countRows(
        admin
          .from("market_price_publication_snapshots")
          .select("id", { count: "exact", head: true })
          .eq("publication_set_id", current.publication_set_id)
          .lt("source_sync_finished_at", staleCutoff),
        "Stale snapshot count",
        errors,
      ),
      countRows(
        admin
          .from("market_price_publication_snapshots")
          .select("id", { count: "exact", head: true })
          .eq("publication_set_id", current.publication_set_id)
          .or(
            "provenance_id.is.null,source_row_hash.is.null,source_artifact_hash.is.null,source_observation_id.is.null",
          ),
        "Broken provenance count",
        errors,
      ),
      countRows(
        admin
          .from("v_market_price_current_v1")
          .select("card_printing_id", { count: "exact", head: true }),
        "Governed read-model count",
        errors,
      ),
      admin
        .from("market_price_publication_snapshots")
        .select("source_sync_finished_at")
        .eq("publication_set_id", current.publication_set_id)
        .order("source_sync_finished_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      admin
        .from("market_price_pipeline_phase_attempts")
        .select(
          "id,phase_name,attempt,state,started_at,completed_at,input_count,output_count,reconciled_count,excluded_count,quarantined_count,error_classification,error,created_at",
        )
        .eq("run_id", current.run_id)
        .order("created_at", { ascending: false }),
      admin
        .from("market_price_publication_snapshots")
        .select("card_print_id,card_printing_id")
        .eq("publication_set_id", current.publication_set_id),
    ]);
    publishedCount = published;
    positiveCount = positive;
    staleCount = stale;
    brokenProvenanceCount = broken;
    readModelCount = readModel;

    if (activeSnapshotIdentityResult.error) {
      errors.push(
        `Active snapshot identities: ${activeSnapshotIdentityResult.error.message}`,
      );
    } else {
      const activeSnapshotIdentities = (
        (activeSnapshotIdentityResult.data ?? []) as ActiveSnapshotIdentityRow[]
      );
      const governedRows = await getMarketPricingReadModelV1(admin, {
        cardPrintIds: Array.from(
          new Set(activeSnapshotIdentities.map((row) => row.card_print_id)),
        ),
        cardPrintingIds: Array.from(
          new Set(activeSnapshotIdentities.map((row) => row.card_printing_id)),
        ),
      });
      governedRpcCompatibleCount = new Set(
        governedRows
          .filter((row) => row.pricing_scope === "card_printing")
          .map((row) => row.card_printing_id)
          .filter((value): value is string => Boolean(value)),
      ).size;
    }

    if (oldestSnapshotResult.error) {
      errors.push(
        `Oldest active source observation: ${oldestSnapshotResult.error.message}`,
      );
    } else {
      sourceAge = ageHours(
        (oldestSnapshotResult.data as {
          source_sync_finished_at?: string;
        } | null)?.source_sync_finished_at,
        generatedAt,
      );
    }

    if (phaseResult.error) {
      errors.push(`Active run phases: ${phaseResult.error.message}`);
    } else {
      const normalizedAttempts = (
        (phaseResult.data ?? []) as PhaseAttemptRow[]
      ).map(
        (row): DurablePhaseAttempt => ({
          id: row.id,
          phaseName: row.phase_name,
          attempt: numberValue(row.attempt),
          state: row.state,
          createdAt: row.created_at,
          startedAt: row.started_at,
          completedAt: row.completed_at,
          inputCount: numberValue(row.input_count),
          outputCount: numberValue(row.output_count),
          reconciledCount: numberValue(row.reconciled_count),
          excludedCount: numberValue(row.excluded_count),
          quarantinedCount: numberValue(row.quarantined_count),
          errorClassification: row.error_classification,
        }),
      );
      phases = latestDurablePhaseAttempts(normalizedAttempts).map((row) => ({
        name: row.phaseName,
        label: phaseLabel(row.phaseName),
        attempt: row.attempt,
        state: row.state,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        inputCount: row.inputCount,
        outputCount: row.outputCount,
        reconciledCount: row.reconciledCount,
        excludedCount: row.excludedCount,
        quarantinedCount: row.quarantinedCount,
        errorClassification: row.errorClassification,
      }));
    }

    if (activeRunRow?.source_sync_run_id) {
      const sourceResult = await admin
        .from("tcgcsv_source_sync_runs")
        .select(
          "id,run_key,status,source_marker,observed_on,request_count,category_count,group_count,product_count,price_row_count,failed_count,git_commit_sha,started_at,finished_at",
        )
        .eq("id", activeRunRow.source_sync_run_id)
        .maybeSingle();
      if (sourceResult.error) {
        errors.push(`Source warehouse run: ${sourceResult.error.message}`);
      } else {
        sourceSync = (sourceResult.data as SourceSyncRow | null) ?? null;
      }
    }
  }

  const recentRuns = recentRunRows.map((row) => mapRun(row, generatedAt));
  const activeRun = activeRunRow
    ? mapRun(activeRunRow, generatedAt)
    : null;
  const latestRun = recentRuns[0] ?? null;
  const lastSuccessfulRun =
    recentRuns.find(
      (run) =>
        ["verified", "published", "shadow_verified"].includes(run.state) &&
        run.reconciliationState === "reconciled",
    ) ?? activeRun;

  const canary = buildCanaryState({
    nowIso: generatedAt,
    activeMode: activeRun?.mode ?? null,
    activatedAt: current?.activated_at ?? null,
    exactPriceCount: publishedCount,
    positivePriceCount: positiveCount,
    staleCount,
    brokenProvenanceCount,
    readModelCount,
    rollbackAvailable: Boolean(current?.previous_publication_set_id),
    authenticatedAccessVerified: true,
    anonymousDeniedVerified: true,
    accessVerifiedAt: ACCESS_PROOF_AT,
    accessVerificationSource:
      "Production role and anonymous-denial readback from the frozen canary audit.",
    webRenderingVerified: deploymentsInput.web.verified === true,
    flutterRenderingVerified: deploymentsInput.flutter.verified === true,
  });

  const apiStatus = deploymentVerificationStatus(deploymentsInput.api);
  const webStatus = deploymentVerificationStatus(deploymentsInput.web);
  const flutterStatus = deploymentVerificationStatus(
    deploymentsInput.flutter,
  );
  const publicationHealthy =
    activeSet?.publication_state === "published" &&
    publishedCount > 0 &&
    publishedCount === positiveCount &&
    publishedCount === readModelCount &&
    staleCount === 0 &&
    brokenProvenanceCount === 0;
  const latestRunWarning = Boolean(
    latestRun &&
      latestRun.id !== activeRun?.id &&
      (latestRun.findings.length > 0 ||
        latestRun.state === "running" ||
        latestRun.state === "failed"),
  );

  const overall = classifyPricingPlatformOverall({
    activePointerReadable: !errors.some((error) =>
      error.startsWith("Active publication pointer"),
    ),
    activePublicationPresent: Boolean(current && activeSet && activeRun),
    publicationHealthy,
    deployedClientsVerified:
      apiStatus === "healthy" &&
      webStatus === "healthy" &&
      flutterStatus === "healthy",
    latestRunNeedsAttention: latestRunWarning,
  });

  const sourceHealthy =
    Boolean(sourceSync) &&
    ["completed", "skipped_no_change"].includes(sourceSync?.status ?? "") &&
    numberValue(sourceSync?.failed_count) === 0;
  const visibilityLadder: PricingVisibilityStage[] = [
    {
      id: "source",
      label: "Source warehouse",
      status: sourceHealthy
        ? (sourceAge ?? Infinity) <= PRICING_SOURCE_FRESHNESS_HOURS
          ? "healthy"
          : "warning"
        : "not_verified",
      detail: sourceSync
        ? `${numberValue(sourceSync.price_row_count).toLocaleString("en-US")} source price rows; ${sourceSync.status}.`
        : "The source run could not be verified.",
      verificationSource: "Live tcgcsv_source_sync_runs row",
      verifiedAt: sourceSync?.finished_at ?? null,
    },
    {
      id: "mapped",
      label: "Mapped",
      status:
        activeRun && activeRun.mappedCount === activeRun.selectedCount
          ? "healthy"
          : activeRun?.mappedCount
            ? "warning"
            : "blocked",
      detail: activeRun
        ? `${activeRun.mappedCount.toLocaleString("en-US")} of ${activeRun.selectedCount.toLocaleString("en-US")} selected rows mapped.`
        : "No active run is available.",
      verificationSource: "Live active pipeline run",
      verifiedAt: activeRun?.completedAt ?? null,
    },
    {
      id: "qualified",
      label: "Qualified",
      status:
        activeRun && activeRun.eligibleCount === activeRun.snapshotCount
          ? "healthy"
          : activeRun?.eligibleCount
            ? "warning"
            : "blocked",
      detail: activeRun
        ? `${activeRun.eligibleCount.toLocaleString("en-US")} eligible exact prices.`
        : "No qualification result is available.",
      verificationSource: "Live active pipeline run",
      verifiedAt: activeRun?.completedAt ?? null,
    },
    {
      id: "published",
      label: "Published in database",
      status: publicationHealthy ? "healthy" : "blocked",
      detail: `${publishedCount.toLocaleString("en-US")} exact publication snapshots are active.`,
      verificationSource: "Live active pointer and publication snapshots",
      verifiedAt: current?.activated_at ?? null,
    },
    {
      id: "rpc",
      label: "Available through governed RPC",
      status:
        governedRpcCompatibleCount > 0 &&
        governedRpcCompatibleCount === publishedCount
          ? "healthy"
          : governedRpcCompatibleCount > 0
            ? "warning"
            : "blocked",
      detail:
        governedRpcCompatibleCount === publishedCount
          ? `${governedRpcCompatibleCount.toLocaleString("en-US")} exact rows satisfy the governed shared read contract.`
          : `${governedRpcCompatibleCount.toLocaleString("en-US")} of ${publishedCount.toLocaleString("en-US")} active exact rows satisfy the governed shared read contract. The frozen read-model completion migration remains pending.`,
      verificationSource:
        "Live get_market_pricing_read_model_v1 response mapped through the production web contract",
      verifiedAt: generatedAt,
    },
    {
      id: "api",
      label: "Available through deployed API",
      status: apiStatus,
      detail:
        apiStatus === "healthy"
          ? "A deployed API response has been explicitly verified."
          : "No explicit deployed API response verification is available.",
      verificationSource:
        deploymentsInput.api.verified === null
          ? "Deployment metadata unavailable"
          : "Explicit API verification metadata",
      verifiedAt: deploymentsInput.api.verifiedAt,
    },
    {
      id: "web",
      label: "Visible on web",
      status: webStatus,
      detail:
        webStatus === "healthy"
          ? "A production web route has been verified rendering TCGPlayer Market."
          : "Production web rendering has not been explicitly verified.",
      verificationSource:
        deploymentsInput.web.verified === null
          ? "Deployment metadata unavailable"
          : "Explicit web rendering verification metadata",
      verifiedAt: deploymentsInput.web.verifiedAt,
    },
    {
      id: "flutter",
      label: "Visible in Flutter",
      status: flutterStatus,
      detail:
        flutterStatus === "healthy"
          ? "A deployed Flutter build has been verified rendering TCGPlayer Market."
          : "Flutter/TestFlight rendering has not been explicitly verified.",
      verificationSource:
        deploymentsInput.flutter.verified === null
          ? "App Store Connect metadata unavailable"
          : "Explicit Flutter rendering verification metadata",
      verifiedAt: deploymentsInput.flutter.verifiedAt,
    },
    {
      id: "anonymous",
      label: "Anonymous and public visibility",
      status: "blocked",
      detail:
        "Anonymous pricing remains intentionally denied pending licensing and display authority.",
      verificationSource: "Frozen Production V1 access contract",
      verifiedAt: ACCESS_PROOF_AT,
    },
  ];

  const deployments: PricingDeploymentState[] = [
    {
      component: "Production database schema",
      runningVersion: activeRun?.schemaVersion ?? null,
      releaseVersion:
        "Current schema plus migrations 20260728130000 and 20260728133000",
      status: activeRun ? "warning" : "unavailable",
      verificationSource: activeRun
        ? "Live pipeline run schema version; migration ledger unavailable to web runtime"
        : "No active run",
      verifiedAt: generatedAt,
    },
    {
      component: "Pricing scheduler",
      runningVersion: activeRun?.commitSha ?? null,
      releaseVersion: PRICING_RELEASE_BASELINE_SHA,
      status: activeRun
        ? activeRun.commitSha === PRICING_RELEASE_BASELINE_SHA
          ? "healthy"
          : "warning"
        : "not_verified",
      verificationSource: activeRun
        ? "Live active pipeline run commit"
        : "Scheduler host unavailable",
      verifiedAt: activeRun?.completedAt ?? null,
    },
    {
      component: "Governed pricing API",
      runningVersion: deploymentsInput.api.runningVersion,
      releaseVersion: PRICING_RELEASE_BASELINE_SHA,
      status: apiStatus,
      verificationSource:
        deploymentsInput.api.runningVersion || deploymentsInput.api.verifiedAt
          ? "Explicit Vercel/API deployment metadata"
          : "Deployment provider metadata unavailable",
      verifiedAt: deploymentsInput.api.verifiedAt,
    },
    {
      component: "Production web client",
      runningVersion: deploymentsInput.web.runningVersion,
      releaseVersion: PRICING_RELEASE_BASELINE_SHA,
      status: webStatus,
      verificationSource:
        deploymentsInput.web.runningVersion || deploymentsInput.web.verifiedAt
          ? "Explicit Vercel deployment metadata"
          : "Deployment provider metadata unavailable",
      verifiedAt: deploymentsInput.web.verifiedAt,
    },
    {
      component: "Flutter and TestFlight",
      runningVersion: deploymentsInput.flutter.runningVersion,
      releaseVersion: `1.0.0+21 @ ${PRICING_RELEASE_BASELINE_SHA}`,
      status: flutterStatus,
      verificationSource:
        deploymentsInput.flutter.runningVersion ||
        deploymentsInput.flutter.verifiedAt
          ? "Explicit App Store deployment metadata"
          : "App Store Connect metadata unavailable",
      verifiedAt: deploymentsInput.flutter.verifiedAt,
    },
    {
      component: "Source branch",
      runningVersion:
        envText("VERCEL_GIT_COMMIT_REF") ??
        envText("FOUNDER_PRICING_RUNNING_BRANCH"),
      releaseVersion: `pricing/mee-productization-v1 @ ${PRICING_RELEASE_BASELINE_SHA}`,
      status:
        envText("VERCEL_GIT_COMMIT_REF") ||
        envText("FOUNDER_PRICING_RUNNING_BRANCH")
          ? "warning"
          : "not_verified",
      verificationSource:
        "Runtime branch metadata; branch identity alone is not deployment proof",
      verifiedAt: generatedAt,
    },
  ];

  const verifiedCycleDates = new Set(
    recentRuns
      .filter(
        (run) =>
          ["canary", "production"].includes(run.mode) &&
          run.state === "verified" &&
          run.reconciliationState === "reconciled" &&
          run.completedAt,
      )
      .map((run) => run.completedAt!.slice(0, 10)),
  );
  const fullActivation =
    activeRun?.mode === "production" &&
    publishedCount >= LAST_VERIFIED_COVERAGE.numerator;
  const releaseGates = buildReleaseGates({
    canary,
    pendingMigrationCount: PENDING_MIGRATIONS.length,
    webRenderingVerified: deploymentsInput.web.verified === true,
    flutterRenderingVerified: deploymentsInput.flutter.verified === true,
    fullActivation,
    unattendedCycleCount: verifiedCycleDates.size,
    provenanceComplete:
      publishedCount > 0 && brokenProvenanceCount === 0,
    coveragePercentage: LAST_VERIFIED_COVERAGE.percentage,
    coverageTargetPercentage: LAST_VERIFIED_COVERAGE.targetPercentage,
    unclassifiedGapRows: LAST_VERIFIED_COVERAGE.unclassifiedGapRows,
    currentPublicationOutOfScopeCount:
      LAST_VERIFIED_CURRENT_PUBLICATION_SCOPE.outOfScopeCount,
  });

  return {
    generatedAt,
    overall: {
      status: overall.status,
      label: overall.label,
      detail: publicationHealthy
        ? `${publishedCount.toLocaleString("en-US")} exact prices are published in the production database. Deployed client rendering remains a separate gate.`
        : "The active publication could not be fully reconciled from live reads.",
    },
    system: {
      activePublicationSetId: current?.publication_set_id ?? null,
      activeRunId: current?.run_id ?? null,
      publicationMode: activeRun?.mode ?? "none",
      publicationSize: publishedCount,
      readModelSize: readModelCount,
      governedRpcCompatibleSize: governedRpcCompatibleCount,
      activatedAt: current?.activated_at ?? null,
      lastSuccessfulRunAt: lastSuccessfulRun?.completedAt ?? null,
      nextExpectedCycleAt: nextExpectedPricingCycle(generatedAt),
      sourceAgeHours: sourceAge,
      rollbackAvailable: Boolean(current?.previous_publication_set_id),
    },
    visibilityLadder,
    canary,
    activeRun,
    latestRun,
    recentRuns,
    phases,
    coverage: {
      ...LAST_VERIFIED_COVERAGE,
      thresholdStatus:
        LAST_VERIFIED_COVERAGE.percentage >=
        LAST_VERIFIED_COVERAGE.targetPercentage
          ? "passed"
          : "blocked",
    },
    publicationScope: LAST_VERIFIED_CURRENT_PUBLICATION_SCOPE,
    deployments,
    releaseGates,
    alerts,
    pendingMigrations: PENDING_MIGRATIONS.map((migration) => ({ ...migration })),
    errors,
  };
}

export async function getFounderPricingTraceByGvId(
  admin: AdminClient,
  rawGvId: string,
  summary: FounderGovernedPricingPlatformSummary,
): Promise<FounderPricingTrace> {
  const requestedGvId = rawGvId.trim().toUpperCase();
  const apiVisibility =
    summary.visibilityLadder.find((stage) => stage.id === "api")?.status ??
    "not_verified";
  const webVisibility =
    summary.visibilityLadder.find((stage) => stage.id === "web")?.status ??
    "not_verified";
  const flutterVisibility =
    summary.visibilityLadder.find((stage) => stage.id === "flutter")?.status ??
    "not_verified";

  if (!/^GV-[A-Z0-9-]+$/.test(requestedGvId)) {
    return {
      requestedGvId,
      foundParent: false,
      status: "invalid",
      cardPrintId: null,
      canonicalName: null,
      activePublicationSetId: null,
      printings: [],
      deployedApiVisibility: apiVisibility,
      webVisibility,
      flutterVisibility,
      unavailableReason: "Enter a canonical parent GV-ID such as GV-PK-ASC-276.",
    };
  }

  const { data: parentData, error: parentError } = await admin
    .from("card_prints")
    .select("id,gv_id,name")
    .eq("gv_id", requestedGvId)
    .maybeSingle();
  if (parentError) {
    return {
      requestedGvId,
      foundParent: false,
      status: "unavailable",
      cardPrintId: null,
      canonicalName: null,
      activePublicationSetId: null,
      printings: [],
      deployedApiVisibility: apiVisibility,
      webVisibility,
      flutterVisibility,
      unavailableReason: `Canonical lookup failed: ${parentError.message}`,
    };
  }
  const parent = parentData as {
    id: string;
    gv_id: string;
    name: string | null;
  } | null;
  if (!parent) {
    return {
      requestedGvId,
      foundParent: false,
      status: "unavailable",
      cardPrintId: null,
      canonicalName: null,
      activePublicationSetId: null,
      printings: [],
      deployedApiVisibility: apiVisibility,
      webVisibility,
      flutterVisibility,
      unavailableReason: "No canonical parent card exists for this GV-ID.",
    };
  }

  const activePublicationSetId =
    summary.visibilityLadder.find((stage) => stage.id === "published")
      ?.status === "healthy"
      ? summary.system.activePublicationSetId
      : null;

  if (!activePublicationSetId) {
    return {
      requestedGvId,
      foundParent: true,
      status: "unavailable",
      cardPrintId: parent.id,
      canonicalName: parent.name,
      activePublicationSetId: null,
      printings: [],
      deployedApiVisibility: apiVisibility,
      webVisibility,
      flutterVisibility,
      unavailableReason: "No healthy active publication pointer is available.",
    };
  }

  const { data: snapshotData, error: snapshotError } = await admin
    .from("market_price_publication_snapshots")
    .select(
      "id,provenance_id,publication_set_id,run_id,qualification_decision_id,source_observation_id,source_artifact_hash,source_price_row_identity,source_row_hash,source_product_id,source_subtype_name,source_observed_on,source_sync_finished_at,card_print_id,card_printing_id,gv_id,printing_gv_id,finish_key,currency,market_price,observed_at,published_at,freshness_state,publication_state",
    )
    .eq("publication_set_id", activePublicationSetId)
    .eq("card_print_id", parent.id)
    .order("printing_gv_id");
  if (snapshotError) {
    return {
      requestedGvId,
      foundParent: true,
      status: "unavailable",
      cardPrintId: parent.id,
      canonicalName: parent.name,
      activePublicationSetId,
      printings: [],
      deployedApiVisibility: apiVisibility,
      webVisibility,
      flutterVisibility,
      unavailableReason: `Active snapshot lookup failed: ${snapshotError.message}`,
    };
  }

  const snapshots = (snapshotData ?? []) as TraceSnapshotRow[];
  if (snapshots.length === 0) {
    const { data: decisionData } = await admin
      .from("market_price_qualification_decisions")
      .select("decision,reason_codes,evaluated_at")
      .eq("card_print_id", parent.id)
      .order("evaluated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const decisionReason = (
      decisionData as {
        decision?: string;
        reason_codes?: string[];
      } | null
    )?.reason_codes?.join(", ");
    return {
      requestedGvId,
      foundParent: true,
      status: "unavailable",
      cardPrintId: parent.id,
      canonicalName: parent.name,
      activePublicationSetId,
      printings: [],
      deployedApiVisibility: apiVisibility,
      webVisibility,
      flutterVisibility,
      unavailableReason: decisionReason
        ? `No active exact price. Latest qualification reasons: ${decisionReason}.`
        : "No exact printing for this parent is present in the active publication set.",
    };
  }

  const decisionIds = snapshots.map(
    (snapshot) => snapshot.qualification_decision_id,
  );
  const { data: decisionData, error: decisionError } = await admin
    .from("market_price_qualification_decisions")
    .select(
      "id,mapping_method,mapping_confidence,language_result,finish_result,decision,eligible,publication_lane,reason_codes,source_integrity_result,duplicate_product_result,freshness_result,variant_assignment_status,evaluated_at",
    )
    .in("id", decisionIds);
  if (decisionError) {
    return {
      requestedGvId,
      foundParent: true,
      status: "unavailable",
      cardPrintId: parent.id,
      canonicalName: parent.name,
      activePublicationSetId,
      printings: [],
      deployedApiVisibility: apiVisibility,
      webVisibility,
      flutterVisibility,
      unavailableReason: `Qualification lookup failed: ${decisionError.message}`,
    };
  }
  const decisions = new Map(
    ((decisionData ?? []) as TraceDecisionRow[]).map((decision) => [
      decision.id,
      decision,
    ]),
  );
  const rpcRows = await getMarketPricingReadModelV1(admin, {
    cardPrintIds: [parent.id],
    cardPrintingIds: snapshots.map((snapshot) => snapshot.card_printing_id),
  });
  const rpcPrintingIds = new Set(
    rpcRows
      .filter((row) => row.pricing_scope === "card_printing")
      .map((row) => row.card_printing_id)
      .filter((value): value is string => Boolean(value)),
  );

  return {
    requestedGvId,
    foundParent: true,
    status: "available",
    cardPrintId: parent.id,
    canonicalName: parent.name,
    activePublicationSetId,
    printings: snapshots.map((snapshot) => {
      const decision = decisions.get(snapshot.qualification_decision_id);
      return {
        cardPrintingId: snapshot.card_printing_id,
        printingGvId: snapshot.printing_gv_id,
        finish: snapshot.finish_key,
        marketPrice: numberValue(snapshot.market_price),
        currency: snapshot.currency,
        sourceProductId: numberValue(snapshot.source_product_id),
        sourceSubtypeName: snapshot.source_subtype_name,
        sourceObservedOn: snapshot.source_observed_on,
        observedAt: snapshot.observed_at,
        sourceRowFingerprint: shortFingerprint(snapshot.source_row_hash),
        sourceArtifactFingerprint: shortFingerprint(
          snapshot.source_artifact_hash,
        ),
        mappingMethod: decision?.mapping_method ?? null,
        mappingConfidence: decision?.mapping_confidence ?? null,
        languageResult: decision?.language_result ?? "unknown",
        finishResult: decision?.finish_result ?? "unknown",
        qualificationStatus: decision?.decision ?? "unknown",
        publicationLane: decision?.publication_lane ?? "unknown",
        reasonCodes: decision?.reason_codes ?? [],
        publicationSnapshotId: snapshot.id,
        provenanceId: snapshot.provenance_id,
        publicationSetId: snapshot.publication_set_id,
        activePointer:
          snapshot.publication_set_id === activePublicationSetId,
        governedRpcAvailable: rpcPrintingIds.has(snapshot.card_printing_id),
      };
    }),
    deployedApiVisibility: apiVisibility,
    webVisibility,
    flutterVisibility,
    unavailableReason: null,
  };
}
