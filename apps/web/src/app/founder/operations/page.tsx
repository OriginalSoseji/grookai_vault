import Link from "next/link";
import PageContainer from "@/components/layout/PageContainer";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import FounderOperationsDecisionControls from "@/components/founder/FounderOperationsDecisionControls";
import FounderOperationsLiveRefresh from "@/components/founder/FounderOperationsLiveRefresh";
import { requireFounderAccess } from "@/lib/founder/requireFounderAccess";
import { getFounderOperationsLiveDashboard } from "@/lib/founder/getFounderOperationsLiveDashboard";
import { createServerAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WorkItem = {
  id: string;
  work_item_key: string;
  version: number;
  state: string;
  state_reason: string | null;
  title: string;
  summary: string;
  domain: string;
  risk_level: string;
  scope: Record<string, unknown>;
  exclusions: unknown;
  plan_payload: Record<string, unknown>;
  plan_fingerprint: string;
  requires_recent_auth: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
  operations_agents: { agent_key: string; display_name: string } | null;
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const WORK_ITEM_FIELDS = "id,work_item_key,version,state,state_reason,title,summary,domain,risk_level,scope,exclusions,plan_payload,plan_fingerprint,requires_recent_auth,expires_at,created_at,updated_at,operations_agents(agent_key,display_name)";
const ACTIONABLE_STATES = new Set(["ready_for_review", "deferred"]);
const ACTIONABLE_STATE_LIST = ["ready_for_review", "deferred"];
const CURRENT_ITEM_LIMIT = 25;
const RECENT_ITEM_LIMIT = 12;

function stateTone(state: string) {
  if (["failed", "repair_requested", "expired"].includes(state)) return "border-red-400/50 bg-red-400/10 text-red-200";
  if (["queued", "running"].includes(state)) return "border-sky-400/50 bg-sky-400/10 text-sky-200";
  if (["healthy", "succeeded", "approved"].includes(state)) return "border-lime-300/50 bg-lime-300/10 text-lime-200";
  if (ACTIONABLE_STATES.has(state)) return "border-amber-300/50 bg-amber-300/10 text-amber-100";
  return "border-stone-500/50 bg-stone-500/10 text-stone-300";
}

function agentTone(health: string) {
  if (health === "healthy") return "bg-lime-300";
  if (health === "running") return "bg-sky-300";
  if (health === "paused") return "bg-amber-300";
  return "bg-red-300";
}

function formatNumber(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("en-US");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not reported";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not reported" : date.toLocaleString();
}

function relativeAge(value: string | null | undefined) {
  if (!value) return "never";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "unknown";
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function relativeExpiry(value: string | null | undefined) {
  if (!value) return "Not reported";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Unknown";
  const minutes = Math.round(Math.abs(timestamp - Date.now()) / 60_000);
  const amount = minutes < 60 ? `${minutes}m` : minutes < 2_880 ? `${Math.round(minutes / 60)}h` : `${Math.round(minutes / 1_440)}d`;
  return timestamp > Date.now() ? `in ${amount}` : `expired ${amount} ago`;
}

function isCurrentActionable(row: WorkItem) {
  return ACTIONABLE_STATES.has(row.state) && Date.parse(row.expires_at) > Date.now();
}

export default async function FounderOperationsPage({ searchParams }: Props) {
  await requireFounderAccess("/founder/operations");
  const params = (await searchParams) ?? {};
  const requestedId = Array.isArray(params.work_item_id)
    ? params.work_item_id[0]
    : params.work_item_id;
  const admin = createServerAdminClient();
  const nowIso = new Date().toISOString();
  const [currentResult, recentResult] = await Promise.all([
    admin
      .from("founder_work_items")
      .select(WORK_ITEM_FIELDS)
      .in("state", ACTIONABLE_STATE_LIST)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(CURRENT_ITEM_LIMIT),
    admin
      .from("founder_work_items")
      .select(WORK_ITEM_FIELDS)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(RECENT_ITEM_LIMIT),
  ]);
  const error = currentResult.error ?? recentResult.error;
  const combined = [...(currentResult.data ?? []), ...(recentResult.data ?? [])] as unknown as WorkItem[];
  let rows = combined.filter((row, index) => combined.findIndex((candidate) => candidate.id === row.id) === index);
  let requestedItemMessage: string | null = null;
  if (!error && requestedId && !rows.some((row) => row.id === requestedId)) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedId)) {
      requestedItemMessage = "This work item link is invalid.";
    } else {
      const { data: requestedRow, error: requestedError } = await admin
        .from("founder_work_items")
        .select(WORK_ITEM_FIELDS)
        .eq("id", requestedId)
        .maybeSingle();
      if (requestedError) requestedItemMessage = "The linked work item could not be loaded. Refresh to try again.";
      else if (!requestedRow) requestedItemMessage = "The linked work item is unavailable.";
      else rows = [requestedRow as unknown as WorkItem, ...rows];
    }
  }
  rows = rows.sort((left, right) =>
    Number(right.id === requestedId) - Number(left.id === requestedId));

  const dashboard = await getFounderOperationsLiveDashboard(admin);
  const pricing = dashboard.pricing;
  const completion = dashboard.pricingCompletion;
  const activeRun = pricing?.activeRun ?? null;
  const latestRun = pricing?.latestRun ?? null;
  const visiblePipelineRun = latestRun ?? activeRun;
  const selectedCount = activeRun?.selectedCount ?? 0;
  const publishedCount = pricing?.system.publicationSize ?? 0;
  const pricingBacklog = Math.max(0, selectedCount - publishedCount);
  const coveragePercent = selectedCount > 0 ? (publishedCount / selectedCount) * 100 : 0;
  const actionableRows = rows.filter((row) => ACTIONABLE_STATES.has(row.state));
  const otherRows = rows.filter((row) => !ACTIONABLE_STATES.has(row.state));
  const orderedRows = [...actionableRows, ...otherRows];

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <section className="gv-collector-panel overflow-hidden px-5 py-6 sm:px-7 sm:py-8">
        <PageIntro
          eyebrow="Founder / Live control plane"
          title="Operations"
          description="Current agent health, catalog decisions, source ingestion, and exact-price publication from production records."
          actions={
            <div className="flex flex-col items-end gap-3">
              <FounderOperationsLiveRefresh />
              <div className="flex gap-2">
                <Link href="/founder/pricing" className="gv-secondary-button">Pricing detail</Link>
                <Link href="/founder/notifications" className="gv-secondary-button">Incidents</Link>
              </div>
            </div>
          }
        />

        <div className="mt-7 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 lg:grid-cols-[1.55fr_1fr]">
          <div className="bg-[#11120f] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Exact prices live</p>
                <p className="mt-2 font-mono text-4xl font-black tracking-tight text-[#f2eadf] sm:text-5xl">
                  {formatNumber(publishedCount)}
                </p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-stone-400">
                  {pricing?.overall.detail ?? "Pricing platform readback is unavailable."}
                </p>
              </div>
              <span className={`rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${stateTone(pricing?.overall.status ?? "unavailable")}`}>
                {pricing?.overall.label ?? "Unavailable"}
              </span>
            </div>
            <div className="mt-6">
              <div className="mb-2 flex justify-between gap-4 text-xs text-stone-400">
                <span>{coveragePercent.toFixed(1)}% of selected source rows published</span>
                <span className="font-mono">{formatNumber(pricingBacklog)} remaining</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-stone-800">
                <div className="h-full rounded-full bg-lime-300" style={{ width: `${Math.min(100, coveragePercent)}%` }} />
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px bg-white/10">
            {[
              ["Agents", dashboard.agentSummary.total, `${dashboard.agentSummary.healthy + dashboard.agentSummary.running} healthy or running`],
              ["Needs decision", dashboard.queue.actionableWorkItems, "frozen plans"],
              ["Commands live", dashboard.queue.queuedCommands + dashboard.queue.runningCommands, `${dashboard.queue.failedCommands} active failures`],
              ["Open incidents", dashboard.queue.openIncidents, dashboard.queue.openIncidents === 0 ? "clear" : "needs review"],
            ].map(([label, value, detail]) => (
              <div key={String(label)} className="bg-[#171814] p-4 sm:p-5">
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">{label}</dt>
                <dd className="mt-2 font-mono text-2xl font-black text-[#f2eadf]">{formatNumber(Number(value))}</dd>
                <p className="mt-1 text-xs text-stone-400">{detail}</p>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {dashboard.errors.length > 0 ? (
        <div role="alert" className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-5 py-4 text-sm text-amber-100">
          <p className="font-bold">Some live reads are unavailable.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100/80">
            {dashboard.errors.map((message) => <li key={message}>{message}</li>)}
          </ul>
        </div>
      ) : null}

      <PageSection spacing="default">
        <SectionHeader
          title="Pokemon pricing completion"
          description="The automatic exact-mapping lane and the identities that still need your review are tracked separately. Counts come from the latest production completion-agent run."
        />
        {completion ? (
          <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Missing price rows", completion.pokemonBacklogRows, `${formatNumber(completion.pokemonSourceProducts)} Pokemon products`],
              ["Queued for repair", completion.pokemonQueuedProducts, "mapped-source gaps"],
              ["Ready for review", completion.pokemonReviewCandidates, "one proposed parent each"],
              ["Automatic exact", completion.verifiedAutomaticCandidates, "fully verified this cycle"],
            ].map(([label, value, detail]) => (
              <div key={String(label)} className="bg-[#171814] p-4 sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">{label}</p>
                <p className="mt-2 font-mono text-3xl font-black text-[#f2eadf]">{formatNumber(Number(value))}</p>
                <p className="mt-1 text-xs text-stone-400">{detail}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="gv-soft-surface px-5 py-6 text-sm text-stone-400">Pricing completion has not reported a production run.</div>
        )}
        {completion ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-400">
            <p>
              Agent {completion.runStatus}; backlog {completion.completionStatus}; {formatNumber(completion.blockedMappingProducts)} products need stronger identity evidence.
            </p>
            <p className="font-mono">Updated {relativeAge(completion.observedAt)}</p>
          </div>
        ) : null}
      </PageSection>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <PageSection spacing="default">
          <SectionHeader
            title="Registered agents"
            description={`${dashboard.agentSummary.total} governed agents. Event agents may remain healthy while idle; scheduled agents must heartbeat within their contract.`}
          />
          {dashboard.agents.length === 0 ? (
            <div className="gv-soft-surface px-5 py-6 text-sm text-stone-400">Agent health has not reported.</div>
          ) : (
            <div className="divide-y divide-white/10 border-y border-white/10">
              {dashboard.agents.map((agent) => (
                <div key={agent.agentKey} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${agentTone(agent.health)}`} aria-hidden="true" />
                      <h3 className="truncate text-sm font-bold text-[#f2eadf]">{agent.displayName}</h3>
                      <span className="text-xs uppercase tracking-wide text-stone-500">{agent.domain}</span>
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-stone-500">{agent.agentKey}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-300">{agent.health}</p>
                    <p className="mt-1 text-xs text-stone-500">Heartbeat {relativeAge(agent.lastHeartbeatAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageSection>

        <PageSection spacing="default">
          <SectionHeader
            title="Source and publication"
            description="The source warehouse and published prices are reported independently so a fresh import cannot be mistaken for released prices."
          />
          <dl className="divide-y divide-white/10 border-y border-white/10 text-sm">
            <div className="grid grid-cols-[1fr_auto] gap-4 py-4">
              <dt className="text-stone-400">Pricing run</dt>
              <dd className="text-right font-bold text-[#f2eadf]">
                {visiblePipelineRun?.state.replaceAll("_", " ") ?? "Unavailable"}
              </dd>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-4 py-4">
              <dt className="text-stone-400">Current pricing phase</dt>
              <dd className="text-right font-mono text-xs font-bold text-lime-200">
                {visiblePipelineRun?.currentPhase?.replaceAll("_", " ") ?? "Idle"}
              </dd>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-4 py-4">
              <dt className="text-stone-400">Pricing run started</dt>
              <dd className="text-right text-xs text-stone-300">
                {visiblePipelineRun?.startedAt ? relativeAge(visiblePipelineRun.startedAt) : "Not reported"}
              </dd>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-4 py-4">
              <dt className="text-stone-400">Source sync</dt>
              <dd className="font-bold text-[#f2eadf]">{dashboard.sourceSync?.status.replaceAll("_", " ") ?? "Unavailable"}</dd>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-4 py-4">
              <dt className="text-stone-400">Source products</dt>
              <dd className="font-mono font-bold text-[#f2eadf]">{formatNumber(dashboard.sourceSync?.productCount)}</dd>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-4 py-4">
              <dt className="text-stone-400">Source price rows</dt>
              <dd className="font-mono font-bold text-[#f2eadf]">{formatNumber(dashboard.sourceSync?.priceRowCount)}</dd>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-4 py-4">
              <dt className="text-stone-400">Mapped rows</dt>
              <dd className="font-mono font-bold text-[#f2eadf]">{formatNumber(activeRun?.mappedCount)}</dd>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-4 py-4">
              <dt className="text-stone-400">Excluded or quarantined</dt>
              <dd className="font-mono font-bold text-amber-200">{formatNumber((activeRun?.excludedCount ?? 0) + (activeRun?.quarantinedCount ?? 0))}</dd>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-4 py-4">
              <dt className="text-stone-400">Latest source observation</dt>
              <dd className="text-right text-xs text-stone-300">{dashboard.sourceSync?.observedOn ?? "Not reported"}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-stone-500">Last dashboard read {formatDate(dashboard.generatedAt)}.</p>
        </PageSection>
      </div>

      <PageSection spacing="default">
        <SectionHeader
          title="Manual decisions and command queue"
          description="Actionable frozen plans are shown first. Approval re-reads the current version and fingerprint through the authenticated founder RPC before any command is queued."
        />
        {requestedItemMessage ? <p role="alert" className="gv-soft-surface px-5 py-5 text-sm">{requestedItemMessage}</p> : null}
        {error ? (
          <div className="gv-soft-surface px-5 py-5 text-sm text-red-300">
            Founder Operations is unavailable until its migration is active: {error.message}
          </div>
        ) : orderedRows.length === 0 ? (
          <div className="gv-soft-surface px-5 py-6 text-sm text-stone-400">No founder work items exist.</div>
        ) : (
          <div className="space-y-3">
            {orderedRows.map((row) => (
              <article
                key={row.id}
                className={`rounded-lg border px-5 py-5 ${row.id === requestedId ? "border-lime-300 ring-2 ring-lime-300/20" : "border-white/10 bg-[#171814]"}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide">
                  <span className={`rounded border px-2 py-1 ${stateTone(row.state)}`}>{row.state.replaceAll("_", " ")}</span>
                  <span className="text-stone-500">{row.risk_level}</span>
                  <span className="text-stone-500">{row.domain}</span>
                  {row.requires_recent_auth ? <span className="text-amber-200">recent sign-in required</span> : null}
                </div>
                <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div>
                    <h2 className="text-lg font-black text-[#f2eadf]">{row.title}</h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-400">{row.summary}</p>
                  </div>
                  <dl className="grid grid-cols-[auto_auto] content-start gap-x-3 gap-y-1 text-xs">
                    <dt className="text-stone-500">Agent</dt><dd className="text-right text-stone-300">{row.operations_agents?.display_name ?? "Unknown"}</dd>
                    <dt className="text-stone-500">Version</dt><dd className="text-right font-mono text-stone-300">{row.version}</dd>
                    <dt className="text-stone-500">Expires</dt><dd className={`text-right ${Date.parse(row.expires_at) <= Date.now() ? "text-red-300" : "text-stone-300"}`}>{relativeExpiry(row.expires_at)}</dd>
                  </dl>
                </div>
                {isCurrentActionable(row) ? (
                  <FounderOperationsDecisionControls workItemId={row.id} title={row.title} />
                ) : ACTIONABLE_STATES.has(row.state) ? (
                  <p className="mt-4 border-t border-white/10 pt-4 text-sm text-red-300">This frozen plan expired. Run its discovery agent again to create a current version.</p>
                ) : null}
                <details className="mt-4 border-t border-white/10 pt-4">
                  <summary className="cursor-pointer text-sm font-bold text-stone-300">Frozen evidence</summary>
                  <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-[#0d0e0c] p-4 text-xs text-stone-300">
                    {JSON.stringify({ scope: row.scope, exclusions: row.exclusions, plan: row.plan_payload, fingerprint: row.plan_fingerprint }, null, 2)}
                  </pre>
                </details>
              </article>
            ))}
          </div>
        )}
      </PageSection>
    </PageContainer>
  );
}
