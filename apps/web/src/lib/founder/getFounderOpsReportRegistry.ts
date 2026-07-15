import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

export type FounderOpsReportCategory =
  | "Launch"
  | "Catalog"
  | "Ingestion"
  | "Market"
  | "Product"
  | "Security";

export type FounderOpsReportStatus = "healthy" | "warning" | "critical" | "unavailable";
export type FounderOpsReportTrendMovement = "new" | "stable" | "improved" | "degraded";

export type FounderOpsReportTrendPoint = {
  collectedAt: string;
  status: FounderOpsReportStatus;
  primaryMetric: string;
  secondaryMetric: string;
};

export type FounderOpsReportTrend = {
  movement: FounderOpsReportTrendMovement;
  pointCount: number;
  windowDays: number;
  lastChangedAt: string | null;
  points: FounderOpsReportTrendPoint[];
};

export type FounderOpsReportCard = {
  id: string;
  title: string;
  category: FounderOpsReportCategory;
  status: FounderOpsReportStatus;
  statusLabel: string;
  sourcePath: string;
  generatedAt: string | null;
  ageHours: number | null;
  stale: boolean;
  freshnessHours: number;
  primaryMetric: string;
  secondaryMetric: string;
  details: Array<{ label: string; value: string }>;
  findings: string[];
  trend: FounderOpsReportTrend;
};

export type FounderOpsReportRegistry = {
  generatedAt: string;
  summary: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
    unavailable: number;
    stale: number;
  };
  cards: FounderOpsReportCard[];
};

const REPORTS = {
  runtimePreflight: "docs/audits/founder_ops_dashboard_v1/runtime_preflight_v1.json",
  runtimeHealth: "docs/audits/founder_ops_dashboard_v1/runtime_health_v1.json",
  quarantine: "docs/audits/founder_ops_dashboard_v1/quarantine_report_v1.json",
  deferred: "docs/audits/founder_ops_dashboard_v1/deferred_report_v1.json",
  imageFullDb: "docs/audits/image_truth_v1/canon_image_full_db_playbook_scan_v1.json",
  imageSurface: "docs/audits/image_truth_v1/image_surface_consistency_scan_v1.json",
  imageHosting: "docs/audits/image_truth_v1/self_hosted_images_wh19a_final_image_hosting_state_scan_summary_v1.json",
  newSetLatest: "docs/audits/new_set_release_ingestion_v1/20260714_abyss_eye_pitch_black/summary_v1.json",
  masterIndexCompletion: "docs/audits/english_master_index_completion_v1/english_master_index_completion_v1.json",
  masterIndexPublishable: "docs/audits/english_master_index_publishable_v1/english_master_index_publishable_manifest_v1.json",
  meeLatest: "docs/audits/market_evidence_engine_v1/mee_nightly_droplet_worker_v1_2026-07-13T19-27-52-230Z.json",
  betaReadiness: "docs/audits/grookai_beta_hardening_readiness_v1/grookai_beta_hardening_readiness_v1.json",
  appFlow: "docs/audits/app_flow_prod_readiness_v1/app_flow_prod_readiness_v1.json",
  webCohesion: "docs/audits/web_cohesion_link_integrity_v1/web_cohesion_link_integrity_v1.json",
  releaseReadiness: "docs/audits/release_hardening_v1/release_readiness_matrix_20260517.json",
  supabaseSecurity: "docs/audits/supabase_security_linter_v1/supabase_security_warn_remediation_v2_20260521.md",
} as const;
const TREND_HISTORY_PATH = "docs/audits/founder_ops_dashboard_v1/trend_history_v1.json";
const TREND_WINDOW_DAYS = 14;

type LoadedReport = {
  path: string;
  data: unknown | null;
  text: string | null;
  mtime: string | null;
};

function numberOrZero(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function objectAt(value: unknown, key: string): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const child = (value as Record<string, unknown>)[key];
  return child && typeof child === "object" && !Array.isArray(child) ? (child as Record<string, unknown>) : null;
}

function arrayAt(value: unknown, key: string): unknown[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const child = (value as Record<string, unknown>)[key];
  return Array.isArray(child) ? child : [];
}

function valueAt(value: unknown, pathParts: string[]) {
  let current = value;
  for (const part of pathParts) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPct(numerator: number, denominator: number) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function ageHours(generatedAt: string | null) {
  if (!generatedAt) return null;
  const timestamp = Date.parse(generatedAt);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, (Date.now() - timestamp) / (60 * 60 * 1000));
}

function inferGeneratedAt(report: LoadedReport, data: unknown) {
  return (
    stringOrNull(valueAt(data, ["generated_at"])) ??
    stringOrNull(valueAt(data, ["collected_at"])) ??
    stringOrNull(valueAt(data, ["last_verified_utc"])) ??
    report.mtime
  );
}

async function resolveRepoRoot() {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "../../.."),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(path.join(candidate, "docs"));
      await fs.access(path.join(candidate, "apps/web"));
      return candidate;
    } catch {
      // Try the next likely execution root.
    }
  }

  return process.cwd();
}

function parseLooseJson(text: string) {
  const trimmed = text.trim();
  const firstObject = trimmed.indexOf("{");
  const firstArray = trimmed.indexOf("[");
  const starts = [firstObject, firstArray].filter((index) => index >= 0);
  if (starts.length === 0) return null;
  return JSON.parse(trimmed.slice(Math.min(...starts)));
}

async function readReport(repoRoot: string, relativePath: string): Promise<LoadedReport> {
  const absolutePath = path.join(repoRoot, relativePath);
  try {
    const [raw, stat] = await Promise.all([
      fs.readFile(absolutePath, "utf8"),
      fs.stat(absolutePath),
    ]);
    const isJsonLike = relativePath.endsWith(".json") || raw.trim().startsWith("{") || raw.includes("\n{");
    return {
      path: relativePath,
      data: isJsonLike ? parseLooseJson(raw) : null,
      text: raw,
      mtime: stat.mtime.toISOString(),
    };
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "ENOENT") {
      return {
        path: relativePath,
        data: null,
        text: null,
        mtime: null,
      };
    }

    throw error;
  }
}

function statusLabel(status: FounderOpsReportStatus) {
  if (status === "healthy") return "Healthy";
  if (status === "warning") return "Needs review";
  if (status === "critical") return "Critical";
  return "Unavailable";
}

function emptyTrend(): FounderOpsReportTrend {
  return {
    movement: "new",
    pointCount: 0,
    windowDays: TREND_WINDOW_DAYS,
    lastChangedAt: null,
    points: [],
  };
}

function card(input: Omit<FounderOpsReportCard, "statusLabel" | "ageHours" | "stale" | "trend">): FounderOpsReportCard {
  const computedAge = ageHours(input.generatedAt);
  const stale = computedAge == null || computedAge > input.freshnessHours;
  const status =
    input.status === "healthy" && stale
      ? "warning"
      : input.status;

  return {
    ...input,
    status,
    statusLabel: statusLabel(status),
    ageHours: computedAge,
    stale,
    trend: emptyTrend(),
    findings: stale
      ? [...input.findings, `Report is stale against ${input.freshnessHours}h freshness target.`]
      : input.findings,
  };
}

function unavailable(id: string, title: string, category: FounderOpsReportCategory, sourcePath: string): FounderOpsReportCard {
  return card({
    id,
    title,
    category,
    status: "unavailable",
    sourcePath,
    generatedAt: null,
    freshnessHours: 24,
    primaryMetric: "Missing",
    secondaryMetric: "Report artifact unavailable",
    details: [],
    findings: ["Report artifact could not be loaded."],
  });
}

function runtimePreflight(report: LoadedReport) {
  const data = report.data;
  if (!data) return unavailable("runtime-preflight", "Launch Gate", "Launch", report.path);
  const status = stringOrNull(valueAt(data, ["status"])) ?? "UNKNOWN";
  const critical = numberOrZero(valueAt(data, ["summary", "critical_fail_checks"]));
  const debt = numberOrZero(valueAt(data, ["summary", "known_deferred_debt_checks"]));
  return card({
    id: "runtime-preflight",
    title: "Launch Gate",
    category: "Launch",
    status: critical > 0 || status === "FAIL" ? "critical" : debt > 0 ? "warning" : "healthy",
    sourcePath: report.path,
    generatedAt: inferGeneratedAt(report, data),
    freshnessHours: 24,
    primaryMetric: status,
    secondaryMetric: `${critical} critical, ${debt} deferred`,
    details: [
      { label: "Critical", value: formatNumber(critical) },
      { label: "Known debt", value: formatNumber(debt) },
    ],
    findings: critical > 0 ? [`${critical} critical launch gate checks failed.`] : [],
  });
}

function runtimeHealth(report: LoadedReport) {
  const data = report.data;
  if (!data) return unavailable("runtime-health", "Contract Runtime", "Launch", report.path);
  const ok = valueAt(data, ["ok"]) === true;
  const failed = numberOrZero(valueAt(data, ["summary", "failed_checks"]));
  const gaps = numberOrZero(valueAt(data, ["summary", "deferred_gap_count"]));
  return card({
    id: "runtime-health",
    title: "Contract Runtime",
    category: "Launch",
    status: !ok || failed > 0 ? "critical" : gaps > 0 ? "warning" : "healthy",
    sourcePath: report.path,
    generatedAt: inferGeneratedAt(report, data),
    freshnessHours: 24,
    primaryMetric: ok ? "Pass" : "Fail",
    secondaryMetric: `${gaps} deferred runtime gaps`,
    details: [
      { label: "Failed checks", value: formatNumber(failed) },
      { label: "Deferred gaps", value: formatNumber(gaps) },
    ],
    findings: !ok || failed > 0 ? ["Runtime health check is failing."] : [],
  });
}

function quarantine(report: LoadedReport) {
  const data = report.data;
  if (!data) return unavailable("quarantine", "Quarantine", "Launch", report.path);
  const unresolved = numberOrZero(valueAt(data, ["summary", "unresolved_count"]));
  const stale = numberOrZero(valueAt(data, ["summary", "stale_unresolved_count"]));
  return card({
    id: "quarantine",
    title: "Quarantine",
    category: "Launch",
    status: stale > 0 ? "critical" : unresolved > 0 ? "warning" : "healthy",
    sourcePath: report.path,
    generatedAt: inferGeneratedAt(report, data),
    freshnessHours: 24,
    primaryMetric: `${formatNumber(unresolved)} unresolved`,
    secondaryMetric: `${formatNumber(stale)} stale`,
    details: [
      { label: "Unresolved", value: formatNumber(unresolved) },
      { label: "Stale", value: formatNumber(stale) },
    ],
    findings: stale > 0 ? [`${stale} stale quarantine rows require action.`] : [],
  });
}

function deferred(report: LoadedReport) {
  const data = report.data;
  if (!data) return unavailable("deferred-debt", "Known Runtime Debt", "Launch", report.path);
  const total = numberOrZero(valueAt(data, ["summary", "total"]));
  const blocked = numberOrZero(valueAt(data, ["summary", "should_be_blocked_from_use"]));
  const architecture = numberOrZero(valueAt(data, ["summary", "architecture_blocked"]));
  return card({
    id: "deferred-debt",
    title: "Known Runtime Debt",
    category: "Launch",
    status: blocked > 0 || architecture > 0 ? "warning" : "healthy",
    sourcePath: report.path,
    generatedAt: inferGeneratedAt(report, data),
    freshnessHours: 24,
    primaryMetric: `${formatNumber(total)} gaps`,
    secondaryMetric: `${formatNumber(blocked)} blocked from use`,
    details: [
      { label: "Total", value: formatNumber(total) },
      { label: "Blocked", value: formatNumber(blocked) },
      { label: "Architecture", value: formatNumber(architecture) },
    ],
    findings: blocked > 0 ? [`${blocked} deferred paths must remain blocked from use.`] : [],
  });
}

function imageSurface(report: LoadedReport) {
  const data = report.data;
  if (!data) return unavailable("image-surface", "Image Surface Consistency", "Catalog", report.path);
  const passed = valueAt(data, ["surface_coverage", "passed"]) === true;
  const gapCount = numberOrZero(valueAt(data, ["parent_missing_child_available", "count"]));
  return card({
    id: "image-surface",
    title: "Image Surface Consistency",
    category: "Catalog",
    status: passed && gapCount === 0 ? "healthy" : "critical",
    sourcePath: report.path,
    generatedAt: inferGeneratedAt(report, data),
    freshnessHours: 36,
    primaryMetric: passed ? "Pass" : "Fail",
    secondaryMetric: `${formatNumber(gapCount)} fallback gaps`,
    details: [
      { label: "Parent rows", value: formatNumber(numberOrZero(valueAt(data, ["parent_rows_scanned"]))) },
      { label: "Child rows", value: formatNumber(numberOrZero(valueAt(data, ["child_rows_scanned"]))) },
    ],
    findings: passed && gapCount === 0 ? [] : ["Image surface consistency has unresolved gaps."],
  });
}

function imageHosting(report: LoadedReport) {
  const data = report.data;
  if (!data) return unavailable("image-hosting", "Self-hosted Image Coverage", "Catalog", report.path);
  const metrics = objectAt(data, "metrics");
  const priorityParent = numberOrZero(metrics?.priority_parent_rows_without_any_image_field);
  const priorityChild = numberOrZero(metrics?.priority_child_rows_without_any_image_field);
  const englishMissing = numberOrZero(metrics?.english_physical_parent_rows_without_any_image_field);
  return card({
    id: "image-hosting",
    title: "Self-hosted Image Coverage",
    category: "Catalog",
    status: priorityParent > 0 || priorityChild > 0 ? "critical" : englishMissing > 0 ? "warning" : "healthy",
    sourcePath: report.path,
    generatedAt: inferGeneratedAt(report, data),
    freshnessHours: 36,
    primaryMetric: `${formatNumber(priorityParent + priorityChild)} priority gaps`,
    secondaryMetric: `${formatNumber(englishMissing)} English physical gaps`,
    details: [
      { label: "Parent rows", value: formatNumber(numberOrZero(metrics?.parent_rows_scanned)) },
      { label: "Child rows", value: formatNumber(numberOrZero(metrics?.child_rows_scanned)) },
      { label: "Self-hosted parent", value: formatNumber(numberOrZero(metrics?.parent_rows_with_self_hosted_image_path)) },
    ],
    findings: priorityParent > 0 || priorityChild > 0 ? ["Priority image coverage gaps are present."] : [],
  });
}

function newSet(report: LoadedReport) {
  const data = report.data;
  if (!data) return unavailable("new-set-ingestion", "New Set Ingestion", "Ingestion", report.path);
  const stopFindings = arrayAt(data, "stop_findings").length;
  const sets = arrayAt(data, "sets");
  const acquiredRows = sets.reduce<number>((sum, item) => sum + numberOrZero(valueAt(item, ["acquired_rows"])), 0);
  const dryRun = stringOrNull(valueAt(data, ["mode"])) === "dry-run";
  return card({
    id: "new-set-ingestion",
    title: "New Set Ingestion",
    category: "Ingestion",
    status: stopFindings > 0 ? "critical" : dryRun ? "warning" : "healthy",
    sourcePath: report.path,
    generatedAt: inferGeneratedAt(report, data),
    freshnessHours: 168,
    primaryMetric: stringOrNull(valueAt(data, ["status"])) ?? "Unknown",
    secondaryMetric: `${formatNumber(acquiredRows)} acquired rows`,
    details: [
      { label: "Release", value: stringOrNull(valueAt(data, ["release_slug"])) ?? "—" },
      { label: "Mode", value: stringOrNull(valueAt(data, ["mode"])) ?? "—" },
      { label: "Stop findings", value: formatNumber(stopFindings) },
    ],
    findings: dryRun ? ["Latest new-set package is acquired but not applied."] : [],
  });
}

function masterIndex(completion: LoadedReport, publishable: LoadedReport) {
  const completionData = completion.data;
  const publishableData = publishable.data;
  if (!completionData || !publishableData) {
    return unavailable("master-index", "Master Index Health", "Catalog", completion.path);
  }
  const total = numberOrZero(valueAt(publishableData, ["summary", "total_sets"]));
  const complete = numberOrZero(valueAt(publishableData, ["summary", "publishable_complete_sets"]));
  const notPublishable = numberOrZero(valueAt(publishableData, ["summary", "not_publishable_sets"]));
  const sourceGaps = numberOrZero(valueAt(completionData, ["summary", "source_gap_queue_items"]));
  return card({
    id: "master-index",
    title: "Master Index Health",
    category: "Catalog",
    status: notPublishable > 0 || sourceGaps > 0 ? "warning" : "healthy",
    sourcePath: publishable.path,
    generatedAt: inferGeneratedAt(publishable, publishableData),
    freshnessHours: 720,
    primaryMetric: `${formatPct(complete, total)} publishable`,
    secondaryMetric: `${formatNumber(notPublishable)} sets not publishable`,
    details: [
      { label: "Total sets", value: formatNumber(total) },
      { label: "Complete", value: formatNumber(complete) },
      { label: "Source gaps", value: formatNumber(sourceGaps) },
    ],
    findings: notPublishable > 0 ? [`${notPublishable} master-index sets are not publishable complete.`] : [],
  });
}

function marketEvidence(report: LoadedReport) {
  const data = report.data;
  if (!data) return unavailable("market-evidence", "Market Evidence Engine", "Market", report.path);
  const preflightFindings = arrayAt(valueAt(data, ["preflight"]), "findings").length;
  const execution = arrayAt(data, "execution");
  const failed = execution.filter((item) => numberOrZero(valueAt(item, ["status"])) !== 0 && valueAt(item, ["skipped"]) !== true).length;
  const skipped = execution.filter((item) => valueAt(item, ["skipped"]) === true).length;
  return card({
    id: "market-evidence",
    title: "Market Evidence Engine",
    category: "Market",
    status: preflightFindings > 0 || failed > 0 ? "critical" : skipped > 0 ? "warning" : "healthy",
    sourcePath: report.path,
    generatedAt: inferGeneratedAt(report, data),
    freshnessHours: 72,
    primaryMetric: stringOrNull(valueAt(data, ["mode"])) ?? "Unknown",
    secondaryMetric: `${formatNumber(failed)} failed phases`,
    details: [
      { label: "Run key", value: stringOrNull(valueAt(data, ["run_key"])) ?? "—" },
      { label: "Skipped", value: formatNumber(skipped) },
      { label: "Preflight findings", value: formatNumber(preflightFindings) },
    ],
    findings: skipped > 0 ? [`${skipped} MEE phases were skipped in the latest run.`] : [],
  });
}

function betaReadiness(report: LoadedReport) {
  const data = report.data;
  if (!data) return unavailable("beta-readiness", "Beta Readiness", "Product", report.path);
  const blockers = arrayAt(data, "launch_blockers_ranked").length;
  const followups = arrayAt(data, "followups_ranked").length;
  const posture = stringOrNull(valueAt(data, ["summary", "launch_posture"])) ?? "Unknown";
  return card({
    id: "beta-readiness",
    title: "Beta Readiness",
    category: "Product",
    status: blockers > 0 ? "critical" : followups > 0 ? "warning" : "healthy",
    sourcePath: report.path,
    generatedAt: inferGeneratedAt(report, data),
    freshnessHours: 168,
    primaryMetric: posture,
    secondaryMetric: `${formatNumber(blockers)} blockers`,
    details: [
      { label: "Followups", value: formatNumber(followups) },
      { label: "Fingerprint", value: stringOrNull(valueAt(data, ["fingerprint"]))?.slice(0, 10) ?? "—" },
    ],
    findings: blockers > 0 ? [`${blockers} beta launch blockers remain.`] : [],
  });
}

function appFlow(report: LoadedReport) {
  const data = report.data;
  if (!data) return unavailable("app-flow", "App Flow Readiness", "Product", report.path);
  const blockers = numberOrZero(valueAt(data, ["summary", "blockers"]));
  const warnings = numberOrZero(valueAt(data, ["summary", "warnings"]));
  return card({
    id: "app-flow",
    title: "App Flow Readiness",
    category: "Product",
    status: blockers > 0 ? "critical" : warnings > 0 ? "warning" : "healthy",
    sourcePath: report.path,
    generatedAt: inferGeneratedAt(report, data),
    freshnessHours: 168,
    primaryMetric: stringOrNull(valueAt(data, ["summary", "status"])) ?? "Unknown",
    secondaryMetric: `${formatNumber(blockers)} blockers, ${formatNumber(warnings)} warnings`,
    details: [
      { label: "Next step", value: stringOrNull(valueAt(data, ["summary", "recommended_next_step"])) ?? "—" },
    ],
    findings: blockers > 0 ? [`${blockers} app-flow blocker remains.`] : [],
  });
}

function webCohesion(report: LoadedReport) {
  const data = report.data;
  if (!data) return unavailable("web-cohesion", "Web Cohesion", "Product", report.path);
  const broken = numberOrZero(valueAt(data, ["summary", "brokenRoutes"]));
  const dead = numberOrZero(valueAt(data, ["summary", "deadInternalLinks"]));
  const warnings = numberOrZero(valueAt(data, ["summary", "warnings"]));
  return card({
    id: "web-cohesion",
    title: "Web Cohesion",
    category: "Product",
    status: broken > 0 || dead > 0 ? "critical" : warnings > 0 ? "warning" : "healthy",
    sourcePath: report.path,
    generatedAt: inferGeneratedAt(report, data),
    freshnessHours: 168,
    primaryMetric: `${formatNumber(broken + dead)} broken`,
    secondaryMetric: `${formatNumber(warnings)} polish warnings`,
    details: [
      { label: "Routes", value: formatNumber(numberOrZero(valueAt(data, ["summary", "routesVisited"]))) },
      { label: "Card routes", value: formatNumber(numberOrZero(valueAt(data, ["summary", "cardRoutesTested"]))) },
    ],
    findings: broken > 0 || dead > 0 ? ["Broken web routes or dead internal links are present."] : [],
  });
}

function releaseReadiness(report: LoadedReport) {
  const data = report.data;
  if (!data) return unavailable("release-readiness", "Release Readiness", "Launch", report.path);
  const classification = stringOrNull(valueAt(data, ["classification"])) ?? "Unknown";
  const lanes = objectAt(data, "lanes") ?? {};
  const nonPass = Object.entries(lanes).filter(([, lane]) => stringOrNull(valueAt(lane, ["status"])) !== "pass" && stringOrNull(valueAt(lane, ["status"])) !== "known_deferred");
  return card({
    id: "release-readiness",
    title: "Release Readiness",
    category: "Launch",
    status: classification === "PRODUCTION_READY" && nonPass.length === 0 ? "healthy" : "warning",
    sourcePath: report.path,
    generatedAt: inferGeneratedAt(report, data),
    freshnessHours: 720,
    primaryMetric: classification,
    secondaryMetric: `${formatNumber(nonPass.length)} lane issues`,
    details: [
      { label: "Release tag", value: stringOrNull(valueAt(data, ["release_tag"])) ?? "—" },
      { label: "Lanes", value: formatNumber(Object.keys(lanes).length) },
    ],
    findings: nonPass.length > 0 ? [`${nonPass.length} release readiness lanes are not pass/known_deferred.`] : [],
  });
}

function supabaseSecurity(report: LoadedReport) {
  const text = report.text;
  if (!text) return unavailable("supabase-security", "Supabase Security", "Security", report.path);
  const warningBlock = /Remaining Security Advisor warning counts after apply:[\s\S]*?```text([\s\S]*?)```/m.exec(text)?.[1] ?? "";
  const warnings = Array.from(warningBlock.matchAll(/([a-z_]+)\s+(\d+)/g)).map((match) => ({
    key: match[1],
    count: Number(match[2]),
  }));
  const warningTotal = warnings.reduce((sum, item) => sum + item.count, 0);
  const lintErrors = (text.match(/^- `[^`]+`:/gm) ?? []).length;
  return card({
    id: "supabase-security",
    title: "Supabase Security",
    category: "Security",
    status: warningTotal > 0 || lintErrors > 0 ? "warning" : "healthy",
    sourcePath: report.path,
    generatedAt: report.mtime,
    freshnessHours: 720,
    primaryMetric: `${formatNumber(warningTotal)} warnings`,
    secondaryMetric: `${formatNumber(lintErrors)} lint errors noted`,
    details: warnings.slice(0, 3).map((item) => ({
      label: item.key.replace(/_/g, " "),
      value: formatNumber(item.count),
    })),
    findings: warningTotal > 0 ? [`${warningTotal} Supabase Security Advisor warnings remain documented.`] : [],
  });
}

function coerceStatus(value: unknown): FounderOpsReportStatus | null {
  if (value === "healthy" || value === "warning" || value === "critical" || value === "unavailable") {
    return value;
  }
  return null;
}

function statusSeverity(status: FounderOpsReportStatus) {
  if (status === "healthy") return 0;
  if (status === "warning") return 1;
  if (status === "critical") return 2;
  return 3;
}

function trendMovement(points: FounderOpsReportTrendPoint[]): FounderOpsReportTrendMovement {
  if (points.length < 2) return "new";
  const first = points[0];
  const latest = points[points.length - 1];
  const delta = statusSeverity(latest.status) - statusSeverity(first.status);
  if (delta < 0) return "improved";
  if (delta > 0) return "degraded";
  return "stable";
}

function lastChangedAt(points: FounderOpsReportTrendPoint[]) {
  if (points.length < 2) return null;

  for (let index = points.length - 1; index > 0; index -= 1) {
    if (points[index].status !== points[index - 1].status) {
      return points[index].collectedAt;
    }
  }

  return null;
}

function trendPointsForCard(trendReport: LoadedReport, cardId: string): FounderOpsReportTrend {
  const data = trendReport.data;
  const cutoff = Date.now() - TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const snapshots = arrayAt(data, "snapshots");
  const points = snapshots
    .map((snapshot): FounderOpsReportTrendPoint | null => {
      const collectedAt = stringOrNull(valueAt(snapshot, ["collected_at"]));
      if (!collectedAt) return null;
      const timestamp = Date.parse(collectedAt);
      if (!Number.isFinite(timestamp) || timestamp < cutoff) return null;
      const cardSnapshot = arrayAt(snapshot, "cards").find((item) => stringOrNull(valueAt(item, ["id"])) === cardId);
      const status = coerceStatus(valueAt(cardSnapshot, ["status"]));
      if (!cardSnapshot || !status) return null;
      return {
        collectedAt,
        status,
        primaryMetric: stringOrNull(valueAt(cardSnapshot, ["primary_metric"])) ?? "—",
        secondaryMetric: stringOrNull(valueAt(cardSnapshot, ["secondary_metric"])) ?? "—",
      };
    })
    .filter((point): point is FounderOpsReportTrendPoint => Boolean(point))
    .sort((left, right) => left.collectedAt.localeCompare(right.collectedAt));

  return {
    movement: trendMovement(points),
    pointCount: points.length,
    windowDays: TREND_WINDOW_DAYS,
    lastChangedAt: lastChangedAt(points),
    points,
  };
}

function attachTrend(cards: FounderOpsReportCard[], trendReport: LoadedReport): FounderOpsReportCard[] {
  return cards.map((item) => ({
    ...item,
    trend: trendPointsForCard(trendReport, item.id),
  }));
}

export async function getFounderOpsReportRegistry(): Promise<FounderOpsReportRegistry> {
  const repoRoot = await resolveRepoRoot();
  const [loaded, trendReport] = await Promise.all([
    Promise.all(
      Object.entries(REPORTS).map(async ([key, reportPath]) => [key, await readReport(repoRoot, reportPath)] as const),
    ),
    readReport(repoRoot, TREND_HISTORY_PATH),
  ]);
  const reports = Object.fromEntries(loaded) as Record<keyof typeof REPORTS, LoadedReport>;

  const cards = attachTrend([
    runtimePreflight(reports.runtimePreflight),
    runtimeHealth(reports.runtimeHealth),
    quarantine(reports.quarantine),
    deferred(reports.deferred),
    imageSurface(reports.imageSurface),
    imageHosting(reports.imageHosting),
    newSet(reports.newSetLatest),
    masterIndex(reports.masterIndexCompletion, reports.masterIndexPublishable),
    marketEvidence(reports.meeLatest),
    betaReadiness(reports.betaReadiness),
    appFlow(reports.appFlow),
    webCohesion(reports.webCohesion),
    releaseReadiness(reports.releaseReadiness),
    supabaseSecurity(reports.supabaseSecurity),
  ], trendReport);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      total: cards.length,
      healthy: cards.filter((item) => item.status === "healthy").length,
      warning: cards.filter((item) => item.status === "warning").length,
      critical: cards.filter((item) => item.status === "critical").length,
      unavailable: cards.filter((item) => item.status === "unavailable").length,
      stale: cards.filter((item) => item.stale).length,
    },
    cards,
  };
}
