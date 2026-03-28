import type { Metadata } from "next";
import Link from "next/link";
import PageContainer from "@/components/layout/PageContainer";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import { WarehouseBadge } from "@/components/founder/WarehouseReviewPrimitives";
import { requireFounderAccess } from "@/lib/founder/requireFounderAccess";
import {
  getWarehouseCandidates,
  WAREHOUSE_QUEUE_STATES,
  WAREHOUSE_SUBMISSION_INTENTS,
} from "@/lib/warehouse/getWarehouseCandidates";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Founder Warehouse Queue",
  robots: {
    index: false,
    follow: false,
  },
};

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function FounderWarehousePage({
  searchParams,
}: {
  searchParams?: { state?: string; intent?: string };
}) {
  // Placement note: founder already owns the strongest internal/private namespace in web, so
  // warehouse review lives under /founder/warehouse instead of introducing a disconnected admin tree.
  await requireFounderAccess("/founder/warehouse");

  const { rows, stateFilter, submissionIntentFilter } = await getWarehouseCandidates({
    state: searchParams?.state,
    submissionIntent: searchParams?.intent,
  });

  return (
    <PageContainer className="space-y-8 py-8">
      <PageIntro
        eyebrow="Founder Warehouse"
        title="Warehouse Review Queue"
        description="Founder-only decision lane for warehouse candidates. Approval, rejection, archive, and staging all stay inside warehouse rules."
        actions={(
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-500">Sorted newest first</span>
            <Link
              className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href="/founder/staging"
            >
              Staging Dashboard
            </Link>
          </div>
        )}
      />

      <PageSection surface="card" spacing="default">
        <SectionHeader
          title="Queue filters"
          description="Filter the internal queue by lifecycle state and submission intent."
        />
        <form className="grid gap-4 md:grid-cols-[minmax(0,220px)_minmax(0,220px)_auto] md:items-end" method="get">
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">State</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              defaultValue={stateFilter}
              name="state"
            >
              <option value="all">All warehouse states</option>
              {WAREHOUSE_QUEUE_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">Submission intent</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              defaultValue={submissionIntentFilter}
              name="intent"
            >
              <option value="all">All intents</option>
              {WAREHOUSE_SUBMISSION_INTENTS.map((intent) => (
                <option key={intent} value={intent}>
                  {intent}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-3">
            <button
              className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              type="submit"
            >
              Apply filters
            </button>
            <Link
              className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href="/founder/warehouse"
            >
              Reset
            </Link>
          </div>
        </form>
      </PageSection>

      <PageSection spacing="default">
        <SectionHeader
          title={`Candidates (${rows.length})`}
          description="Candidate summary is the primary review surface. Event metadata remains detailed history on the detail page."
        />

        {rows.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-sm text-slate-600">
            No warehouse candidates matched the current queue filters.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <Link
                key={row.id}
                href={`/founder/warehouse/${encodeURIComponent(row.id)}`}
                className="block rounded-[1.75rem] border border-slate-200 bg-white px-5 py-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <WarehouseBadge value={row.state} />
                        <WarehouseBadge value={row.submission_intent} tone="default" />
                        <WarehouseBadge value={row.proposed_action_type ?? "UNSET"} />
                      </div>
                      <div className="space-y-1">
                        <p className="truncate text-base font-semibold text-slate-950">{row.id}</p>
                        <p className="text-sm leading-6 text-slate-600">{row.notes_preview}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-sm text-slate-500">
                      <p>Created {formatTimestamp(row.created_at)}</p>
                      <p>Updated {formatTimestamp(row.updated_at)}</p>
                    </div>
                  </div>

                  <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Decision</dt>
                      <dd className="mt-1 text-sm text-slate-900">{row.interpreter_decision ?? "—"}</dd>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Reason code</dt>
                      <dd className="mt-1 text-sm text-slate-900">{row.interpreter_reason_code ?? "—"}</dd>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Needs promotion review</dt>
                      <dd className="mt-1 text-sm text-slate-900">
                        <WarehouseBadge value={row.needs_promotion_review} tone={row.needs_promotion_review ? "warning" : "muted"} />
                      </dd>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Submitted by</dt>
                      <dd className="mt-1 break-all text-sm text-slate-900">{row.submitted_by_user_id}</dd>
                    </div>
                  </dl>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current hold reason</p>
                    <p className="mt-1 text-sm text-slate-900">{row.current_review_hold_reason ?? "—"}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageSection>
    </PageContainer>
  );
}
