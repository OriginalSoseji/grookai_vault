import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonDisclosure,
  WarehouseBadge,
} from "@/components/founder/WarehouseReviewPrimitives";
import PageContainer from "@/components/layout/PageContainer";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import { requireFounderAccess } from "@/lib/founder/requireFounderAccess";
import {
  getFounderStagingQueue,
  WAREHOUSE_STAGING_STATUSES,
} from "@/lib/warehouse/getFounderStagingQueue";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Founder Staging Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

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

export default async function FounderStagingPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  await requireFounderAccess("/founder/staging");

  const { rows, statusFilter } = await getFounderStagingQueue({
    status: searchParams?.status,
  });

  return (
    <PageContainer className="space-y-8 py-8">
      <PageIntro
        eyebrow="Founder Warehouse"
        title="Staging Dashboard"
        description="Founder-only execution lane. Staging is separate from canon promotion and shows frozen payload plus executor state."
        actions={(
          <div className="flex flex-wrap gap-3">
            <Link
              href="/founder/warehouse"
              className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Warehouse Review
            </Link>
            <Link
              href="/founder"
              className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Founder Home
            </Link>
          </div>
        )}
      />

      <PageSection surface="card" spacing="default">
        <SectionHeader
          title="Staging filters"
          description="Filter the founder staging queue by execution status."
        />
        <form className="grid gap-4 md:grid-cols-[minmax(0,220px)_auto] md:items-end" method="get">
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">Execution status</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              defaultValue={statusFilter}
              name="status"
            >
              <option value="all">All staging rows</option>
              {WAREHOUSE_STAGING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
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
              href="/founder/staging"
            >
              Reset
            </Link>
          </div>
        </form>
      </PageSection>

      <PageSection spacing="default">
        <SectionHeader
          title={`Staging rows (${rows.length})`}
          description="Frozen payloads plus execution bookkeeping. Promotion execution itself remains out of scope here."
        />

        {rows.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-sm text-slate-600">
            No staging rows matched the current filter.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <article
                key={row.id}
                className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <WarehouseBadge value={row.execution_status} />
                      <WarehouseBadge value={row.approved_action_type} tone="default" />
                      <WarehouseBadge value={row.submission_intent ?? "UNKNOWN_INTENT"} tone="default" />
                    </div>
                    <div className="space-y-1">
                      <p className="truncate text-base font-semibold text-slate-950">{row.id}</p>
                      <p className="text-sm leading-6 text-slate-600">{row.candidate_notes_preview}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-sm text-slate-500">
                    <p>Founder approved {formatTimestamp(row.founder_approved_at)}</p>
                    <p>Staged {formatTimestamp(row.staged_at)}</p>
                  </div>
                </div>

                <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Candidate</dt>
                    <dd className="mt-1 break-all text-sm text-slate-900">
                      <Link href={`/founder/warehouse/${encodeURIComponent(row.candidate_id)}`} className="underline decoration-slate-300 underline-offset-4">
                        {row.candidate_id}
                      </Link>
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Candidate state</dt>
                    <dd className="mt-1 text-sm text-slate-900">{row.candidate_state ?? "—"}</dd>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Attempts</dt>
                    <dd className="mt-1 text-sm text-slate-900">{row.execution_attempts}</dd>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Last error</dt>
                    <dd className="mt-1 text-sm text-slate-900">{row.last_error ?? "—"}</dd>
                  </div>
                </dl>

                <JsonDisclosure
                  label="Frozen staging payload"
                  value={row.frozen_payload}
                />
              </article>
            ))}
          </div>
        )}
      </PageSection>
    </PageContainer>
  );
}
