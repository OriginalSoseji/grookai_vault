import Link from "next/link";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import type {
  FounderGovernedPricingPlatformSummary,
  FounderPricingRun,
  FounderPricingTrace,
} from "@/lib/founder/getGovernedPricingPlatformSummary";
import type {
  PricingReleaseGateStatus,
  PricingVisibilityStatus,
} from "@/lib/founder/governedPricingVisibilityPolicy";
import FounderPricingRefreshControl from "./FounderPricingRefreshControl";

const STATUS_STYLES: Record<PricingVisibilityStatus, string> = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  blocked: "border-rose-200 bg-rose-50 text-rose-800",
  not_deployed: "border-slate-300 bg-slate-100 text-slate-700",
  not_verified: "border-sky-200 bg-sky-50 text-sky-800",
  unavailable: "border-slate-300 bg-white text-slate-700",
};

const GATE_STYLES: Record<PricingReleaseGateStatus, string> = {
  passed: STATUS_STYLES.healthy,
  in_progress: STATUS_STYLES.warning,
  blocked: STATUS_STYLES.blocked,
  pending: STATUS_STYLES.not_verified,
  not_verified: STATUS_STYLES.not_verified,
};

function humanizeStatus(value: string) {
  return value.replace(/_/g, " ");
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Denver",
      }).format(date);
}

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

function shortSha(value: string | null) {
  return value ? value.slice(0, 12) : "Unknown";
}

function StatusBadge({
  status,
  gate = false,
}: {
  status: PricingVisibilityStatus | PricingReleaseGateStatus;
  gate?: boolean;
}) {
  const className = gate
    ? GATE_STYLES[status as PricingReleaseGateStatus]
    : STATUS_STYLES[status as PricingVisibilityStatus];
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${className}`}
    >
      {humanizeStatus(status)}
    </span>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 border-l-2 border-slate-200 pl-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-2xl font-semibold text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function RunPanel({
  title,
  run,
  emphasize = false,
}: {
  title: string;
  run: FounderPricingRun | null;
  emphasize?: boolean;
}) {
  if (!run) {
    return (
      <div className="border-t border-slate-200 py-4">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">No run was available.</p>
      </div>
    );
  }

  const status: PricingVisibilityStatus =
    run.state === "verified" && run.reconciliationState === "reconciled"
      ? "healthy"
      : run.state === "failed"
        ? "blocked"
        : run.state === "running" || run.findings.length > 0
          ? "warning"
          : "not_verified";

  return (
    <div
      className={`border-t py-4 ${
        emphasize ? "border-amber-300 bg-amber-50/60 px-4" : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-500">
            {title}
          </p>
          <h3 className="mt-1 break-all text-sm font-semibold text-slate-950">
            {run.runKey}
          </h3>
        </div>
        <StatusBadge status={status} />
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="text-xs uppercase text-slate-500">Mode / state</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {run.mode} / {run.state}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Reconciliation</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {run.reconciliationState}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Started</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {formatDate(run.startedAt)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Commit</dt>
          <dd className="mt-1 font-mono text-xs text-slate-900">
            {shortSha(run.commitSha)}
          </dd>
        </div>
      </dl>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 xl:grid-cols-6">
        {[
          ["Selected", run.selectedCount],
          ["Mapped", run.mappedCount],
          ["Eligible", run.eligibleCount],
          ["Snapshots", run.snapshotCount],
          ["Quarantined", run.quarantinedCount],
          ["Excluded", run.excludedCount],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <p className="text-xs uppercase text-slate-500">{label}</p>
            <p className="mt-1 font-semibold text-slate-950">
              {Number(value).toLocaleString("en-US")}
            </p>
          </div>
        ))}
      </div>
      {run.findings.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm text-amber-900">
          {run.findings.map((finding) => (
            <li key={finding}>{finding}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function FounderPricingPlatformSummaryCard({
  summary,
}: {
  summary: FounderGovernedPricingPlatformSummary;
}) {
  const activeRunDiffers =
    summary.latestRun && summary.latestRun.id !== summary.activeRun?.id;

  return (
    <PageSection
      spacing="default"
      className="gv-collector-panel px-5 py-6 sm:px-7"
    >
      <SectionHeader
        title="TCGPlayer Market Publication"
        description="Governed exact-printing publication state. This is separate from the legacy eBay pricing job monitor below."
        actions={
          <Link href="/founder/pricing" className="gv-primary-button">
            Open Pricing Platform
          </Link>
        }
      />
      <div className="flex flex-wrap items-center gap-3 border-y border-slate-200 py-4">
        <StatusBadge status={summary.overall.status} />
        <p className="text-sm font-semibold text-slate-950">
          {summary.overall.label}
        </p>
        <p className="text-sm text-slate-600">{summary.overall.detail}</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Active exact prices"
          value={summary.system.publicationSize.toLocaleString("en-US")}
          detail={`Mode: ${summary.system.publicationMode}`}
        />
        <Metric
          label="Current database view"
          value={summary.system.readModelSize.toLocaleString("en-US")}
          detail="Live database rows"
        />
        <Metric
          label="Coverage"
          value={`${summary.coverage.percentage.toFixed(3)}%`}
          detail={`${summary.coverage.remainingGapRows.toLocaleString("en-US")} classified gaps`}
        />
        <Metric
          label="Source age"
          value={
            summary.system.sourceAgeHours === null
              ? "Unknown"
              : `${summary.system.sourceAgeHours.toFixed(1)}h`
          }
          detail="Oldest source evidence in active set"
        />
        <Metric
          label="Release gates passed"
          value={`${summary.releaseGates.filter((gate) => gate.status === "passed").length}/${summary.releaseGates.length}`}
          detail="Production V1 release contract"
        />
      </div>
      {activeRunDiffers ? (
        <p className="border-l-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          A newer run exists than the active publication run. Open the pricing
          platform to inspect it separately; it does not replace the active
          published set.
        </p>
      ) : null}
    </PageSection>
  );
}

export function FounderGovernedPricingPlatformDetail({
  summary,
  trace,
}: {
  summary: FounderGovernedPricingPlatformSummary;
  trace: FounderPricingTrace | null;
}) {
  const latestDiffers =
    summary.latestRun && summary.latestRun.id !== summary.activeRun?.id;

  return (
    <>
      <PageSection spacing="default">
        <div className="flex flex-col gap-4 border-y border-slate-200 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={summary.overall.status} />
              <h2 className="text-lg font-semibold text-slate-950">
                {summary.overall.label}
              </h2>
            </div>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              {summary.overall.detail}
            </p>
          </div>
          <FounderPricingRefreshControl />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Publication"
            value={summary.system.publicationSize.toLocaleString("en-US")}
            detail={`Activated ${formatDate(summary.system.activatedAt)}`}
          />
          <Metric
            label="View / governed RPC"
            value={`${summary.system.readModelSize.toLocaleString("en-US")} / ${summary.system.governedRpcCompatibleSize.toLocaleString("en-US")}`}
            detail="Backing current view versus rows accepted by the shared client contract"
          />
          <Metric
            label="Coverage"
            value={`${summary.coverage.percentage.toFixed(3)}%`}
            detail={`${summary.coverage.numerator.toLocaleString("en-US")} / ${summary.coverage.denominator.toLocaleString("en-US")}`}
          />
          <Metric
            label="Next expected cycle"
            value={formatDate(summary.system.nextExpectedCycleAt)}
            detail="Daily governed schedule, 08:15 UTC"
          />
        </div>
      </PageSection>

      <PageSection spacing="default">
        <SectionHeader
          title="Visibility Ladder"
          description="Each step is verified independently. Database publication is not presented as deployed client visibility."
        />
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {summary.visibilityLadder.map((stage) => (
            <div
              key={stage.id}
              className="grid gap-3 py-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,15rem)] md:items-start"
            >
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={stage.status} />
                <p className="font-semibold text-slate-950">{stage.label}</p>
              </div>
              <p className="text-sm leading-6 text-slate-600">{stage.detail}</p>
              <div className="text-xs leading-5 text-slate-500">
                <p>{stage.verificationSource}</p>
                <p>{formatDate(stage.verifiedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection spacing="default">
        <SectionHeader
          title="Database Canary"
          description={summary.canary.statement}
        />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Classification"
            value={summary.canary.classification}
            detail={
              summary.canary.windowElapsed
                ? `${summary.canary.observedHours.toFixed(1)} hours observed; enforcing proof required`
                : `${summary.canary.remainingHours.toFixed(1)} hours remain`
            }
          />
          <Metric
            label="Exact / positive"
            value={`${summary.canary.exactPriceCount} / ${summary.canary.positivePriceCount}`}
            detail={`${summary.canary.staleCount} stale; ${summary.canary.brokenProvenanceCount} broken provenance`}
          />
          <Metric
            label="Authenticated access"
            value={humanizeStatus(summary.canary.authenticatedAccess)}
            detail={summary.canary.accessVerificationSource}
          />
          <Metric
            label="Anonymous access"
            value={humanizeStatus(summary.canary.anonymousAccess)}
            detail="Verified denied under the frozen V1 contract"
          />
        </div>
        <div className="grid gap-4 border-t border-slate-200 pt-4 text-sm sm:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-950">Started:</span>{" "}
            <span className="text-slate-600">
              {formatDate(summary.canary.startAt)}
            </span>
          </p>
          <p>
            <span className="font-semibold text-slate-950">Required end:</span>{" "}
            <span className="text-slate-600">
              {formatDate(summary.canary.requiredEndAt)}
            </span>
          </p>
          <p>
            <span className="font-semibold text-slate-950">Rollback:</span>{" "}
            <span className="text-slate-600">
              {summary.canary.rollbackAvailable
                ? "Previous publication pointer available"
                : "Not available"}
            </span>
          </p>
          <p>
            <span className="font-semibold text-slate-950">
              Client rendering:
            </span>{" "}
            <span className="text-slate-600">
              Web {summary.canary.webClientsExercised ? "verified" : "unverified"};
              Flutter{" "}
              {summary.canary.flutterClientsExercised
                ? "verified"
                : "unverified"}
            </span>
          </p>
        </div>
      </PageSection>

      <PageSection spacing="default">
        <SectionHeader
          title="Publication Runs"
          description="The active publication run and newest observed run are deliberately separate."
        />
        <RunPanel title="Active publication run" run={summary.activeRun} />
        {latestDiffers ? (
          <RunPanel
            title="Newest observed run, not active"
            run={summary.latestRun}
            emphasize
          />
        ) : null}
      </PageSection>

      <PhaseTable summary={summary} />
      <CoverageSection summary={summary} />
      <DeploymentSection summary={summary} />
      <ReleaseGateSection summary={summary} />

      <PageSection
        spacing="default"
        className="gv-soft-surface px-5 py-6 sm:px-7"
      >
        <SectionHeader
          title="Trace One Parent GV-ID"
          description="Read-only trace from canonical parent through exact printing, qualification, active publication, governed read model, and client visibility evidence."
        />
        <form
          method="get"
          action="/founder/pricing"
          className="flex flex-col gap-3 sm:flex-row"
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">Canonical parent GV-ID</span>
            <input
              type="text"
              name="gv_id"
              defaultValue={trace?.requestedGvId ?? ""}
              placeholder="GV-PK-ASC-276"
              className="min-h-11 w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none ring-emerald-600 focus:ring-2"
              autoComplete="off"
            />
          </label>
          <button type="submit" className="gv-primary-button min-h-11">
            Trace price
          </button>
        </form>
        {trace ? <PricingTraceResult trace={trace} /> : null}
      </PageSection>

      <RecentRunsAndAlerts summary={summary} />
    </>
  );
}

function PhaseTable({
  summary,
}: {
  summary: FounderGovernedPricingPlatformSummary;
}) {
  return (
    <PageSection spacing="default">
      <SectionHeader
        title="Durable Phase Attempts"
        description="Latest durable state for each phase and attempt in the active publication run."
      />
      <div className="overflow-x-auto border-y border-slate-200">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3 font-semibold">Phase</th>
              <th className="px-3 py-3 font-semibold">Attempt</th>
              <th className="px-3 py-3 font-semibold">State</th>
              <th className="px-3 py-3 font-semibold">Input</th>
              <th className="px-3 py-3 font-semibold">Output</th>
              <th className="px-3 py-3 font-semibold">Reconciled</th>
              <th className="px-3 py-3 font-semibold">Completed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {summary.phases.map((phase) => (
              <tr key={`${phase.name}:${phase.attempt}`}>
                <td className="px-3 py-3">
                  <p className="font-semibold text-slate-950">{phase.label}</p>
                  <p className="font-mono text-xs text-slate-500">
                    {phase.name}
                  </p>
                </td>
                <td className="px-3 py-3">{phase.attempt}</td>
                <td className="px-3 py-3">{phase.state}</td>
                <td className="px-3 py-3">
                  {phase.inputCount.toLocaleString("en-US")}
                </td>
                <td className="px-3 py-3">
                  {phase.outputCount.toLocaleString("en-US")}
                </td>
                <td className="px-3 py-3">
                  {phase.reconciledCount.toLocaleString("en-US")}
                </td>
                <td className="px-3 py-3">{formatDate(phase.completedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageSection>
  );
}

function CoverageSection({
  summary,
}: {
  summary: FounderGovernedPricingPlatformSummary;
}) {
  return (
    <PageSection spacing="default">
      <SectionHeader
        title="Coverage Evidence"
        description="Last committed fixed-denominator coverage audit. This is evidence from an artifact, not a live production query."
      />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Coverage"
          value={`${summary.coverage.percentage.toFixed(3)}%`}
          detail={`Target ${summary.coverage.targetPercentage}%`}
        />
        <Metric
          label="In scope"
          value={summary.coverage.denominator.toLocaleString("en-US")}
          detail={`${summary.coverage.numerator.toLocaleString("en-US")} covered`}
        />
        <Metric
          label="Remaining gap"
          value={summary.coverage.remainingGapRows.toLocaleString("en-US")}
          detail="Every row classified"
        />
        <Metric
          label="Policy"
          value={summary.coverage.policyVersion}
          detail={formatDate(summary.coverage.verifiedAt)}
        />
      </div>
      {summary.publicationScope.outOfScopeCount > 0 ? (
        <div className="border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">
            Current canary scope correction required
          </p>
          <p className="mt-1 leading-6">
            {summary.publicationScope.outOfScopeCount} of{" "}
            {summary.publicationScope.rowCount} current rows are now excluded
            by V1.2 policy. The active canary remains unchanged; the first
            post-canary shadow must omit them.
          </p>
        </div>
      ) : null}
      <div className="overflow-x-auto border-y border-slate-200">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3 font-semibold">Gap reason</th>
              <th className="px-3 py-3 text-right font-semibold">Rows</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {summary.coverage.gapReasons.map((gap) => (
              <tr key={gap.reason}>
                <td className="px-3 py-3 font-mono text-xs text-slate-800">
                  {gap.reason}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-slate-950">
                  {gap.count.toLocaleString("en-US")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageSection>
  );
}

function DeploymentSection({
  summary,
}: {
  summary: FounderGovernedPricingPlatformSummary;
}) {
  return (
    <PageSection spacing="default">
      <SectionHeader
        title="Deployment Evidence"
        description="Unknown means no deployed-provider evidence is available. Source code presence is never treated as deployment proof."
      />
      <div className="overflow-x-auto border-y border-slate-200">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3 font-semibold">Component</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Running</th>
              <th className="px-3 py-3 font-semibold">Release target</th>
              <th className="px-3 py-3 font-semibold">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {summary.deployments.map((deployment) => (
              <tr key={deployment.component}>
                <td className="px-3 py-3 font-semibold text-slate-950">
                  {deployment.component}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={deployment.status} />
                </td>
                <td className="max-w-52 break-all px-3 py-3 font-mono text-xs">
                  {deployment.runningVersion ?? "Unknown"}
                </td>
                <td className="max-w-64 break-words px-3 py-3 text-xs">
                  {deployment.releaseVersion ?? "Unknown"}
                </td>
                <td className="max-w-72 px-3 py-3 text-xs leading-5 text-slate-600">
                  {deployment.verificationSource}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageSection>
  );
}

function ReleaseGateSection({
  summary,
}: {
  summary: FounderGovernedPricingPlatformSummary;
}) {
  return (
    <PageSection spacing="default">
      <SectionHeader
        title="Release Gates"
        description="Frozen Production V1 gates. No control on this page changes them."
      />
      <div className="grid gap-x-8 md:grid-cols-2">
        {summary.releaseGates.map((gate) => (
          <div
            key={gate.id}
            className="flex items-start gap-3 border-t border-slate-200 py-4"
          >
            <StatusBadge status={gate.status} gate />
            <div className="min-w-0">
              <p className="font-semibold text-slate-950">{gate.label}</p>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                {gate.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </PageSection>
  );
}

function PricingTraceResult({ trace }: { trace: FounderPricingTrace }) {
  if (trace.status !== "available") {
    return (
      <div className="border-l-2 border-amber-400 bg-amber-50 px-4 py-3">
        <p className="font-semibold text-amber-950">
          {trace.status === "invalid" ? "Invalid GV-ID" : "Price unavailable"}
        </p>
        <p className="mt-1 text-sm text-amber-900">
          {trace.unavailableReason}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-slate-200 pt-4">
      <div>
        <p className="text-xs font-semibold uppercase text-slate-500">
          Canonical parent
        </p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950">
          {trace.canonicalName} ({trace.requestedGvId})
        </h3>
        <p className="mt-1 break-all font-mono text-xs text-slate-500">
          Active publication set: {trace.activePublicationSetId}
        </p>
      </div>
      {trace.printings.map((printing) => (
        <article
          key={printing.publicationSnapshotId}
          className="border-t border-slate-200 py-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950">
                {printing.printingGvId}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {printing.finish} / {printing.sourceSubtypeName}
              </p>
            </div>
            <p className="text-2xl font-semibold text-slate-950">
              {formatMoney(printing.marketPrice, printing.currency)}
            </p>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <dt className="text-xs uppercase text-slate-500">
                Canonical mapping
              </dt>
              <dd className="mt-1 text-slate-900">
                {printing.mappingMethod ?? "Unknown"} (
                {printing.mappingConfidence ?? "n/a"})
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">
                Qualification
              </dt>
              <dd className="mt-1 text-slate-900">
                {printing.qualificationStatus} / {printing.publicationLane}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">
                Language / finish
              </dt>
              <dd className="mt-1 text-slate-900">
                {printing.languageResult} / {printing.finishResult}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">
                Source evidence
              </dt>
              <dd className="mt-1 text-slate-900">
                Product {printing.sourceProductId};{" "}
                {formatDate(printing.observedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">
                Source row fingerprint
              </dt>
              <dd className="mt-1 font-mono text-xs text-slate-900">
                {printing.sourceRowFingerprint}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">
                Artifact fingerprint
              </dt>
              <dd className="mt-1 font-mono text-xs text-slate-900">
                {printing.sourceArtifactFingerprint}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">
                Active pointer / RPC
              </dt>
              <dd className="mt-1 text-slate-900">
                {printing.activePointer ? "yes" : "no"} /{" "}
                {printing.governedRpcAvailable ? "available" : "unavailable"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">
                Client verification
              </dt>
              <dd className="mt-1 text-slate-900">
                API {humanizeStatus(trace.deployedApiVisibility)}; web{" "}
                {humanizeStatus(trace.webVisibility)}; Flutter{" "}
                {humanizeStatus(trace.flutterVisibility)}
              </dd>
            </div>
          </dl>
          {printing.reasonCodes.length > 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              Reasons: {printing.reasonCodes.join(", ")}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function RecentRunsAndAlerts({
  summary,
}: {
  summary: FounderGovernedPricingPlatformSummary;
}) {
  return (
    <PageSection spacing="default">
      <SectionHeader
        title="Recent Runs and Alerts"
        description="Operational evidence only. No retries, activations, or acknowledgements are available here."
      />
      <div className="overflow-x-auto border-y border-slate-200">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3 font-semibold">Run</th>
              <th className="px-3 py-3 font-semibold">Mode</th>
              <th className="px-3 py-3 font-semibold">State</th>
              <th className="px-3 py-3 font-semibold">Reconciliation</th>
              <th className="px-3 py-3 font-semibold">Snapshots</th>
              <th className="px-3 py-3 font-semibold">Completed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {summary.recentRuns.map((run) => (
              <tr key={run.id}>
                <td className="max-w-72 break-all px-3 py-3 font-mono text-xs">
                  {run.runKey}
                </td>
                <td className="px-3 py-3">{run.mode}</td>
                <td className="px-3 py-3">{run.state}</td>
                <td className="px-3 py-3">{run.reconciliationState}</td>
                <td className="px-3 py-3">
                  {run.snapshotCount.toLocaleString("en-US")}
                </td>
                <td className="px-3 py-3">{formatDate(run.completedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {summary.alerts.recent.length > 0 ? (
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {summary.alerts.recent.map((alert) => (
            <div
              key={alert.id}
              className="grid gap-2 py-3 text-sm sm:grid-cols-[8rem_minmax(0,1fr)_12rem]"
            >
              <p className="font-semibold uppercase text-slate-600">
                {alert.severity}
              </p>
              <p className="break-words text-slate-900">
                {alert.event_type} from {alert.source_host} /{" "}
                {alert.source_unit}
              </p>
              <p className="text-slate-500">{formatDate(alert.received_at)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          No operations notification events were returned.
        </p>
      )}
      {summary.errors.length > 0 ? (
        <div className="border-l-2 border-rose-400 bg-rose-50 px-4 py-3">
          <p className="font-semibold text-rose-900">Read errors</p>
          <ul className="mt-2 space-y-1 text-sm text-rose-800">
            {summary.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </PageSection>
  );
}
