import Link from "next/link";
import PageContainer from "@/components/layout/PageContainer";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import { requireFounderAccess } from "@/lib/founder/requireFounderAccess";
import { createServerAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type FounderNotificationRow = {
  id: string;
  notification_id: string;
  event_type: string;
  severity: string;
  source_host: string;
  source_unit: string;
  source_commit_sha: string | null;
  payload: Record<string, unknown> | null;
  received_at: string;
};

type FounderNotificationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function label(value: string) {
  return value
    .replace(/\.(service|timer)$/i, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function notificationTitle(row: FounderNotificationRow) {
  return (
    text(row.payload?.title) ||
    text(row.payload?.notification_title) ||
    `${label(row.source_unit || "Grookai system")} - ${label(row.event_type)}`
  );
}

function notificationSummary(row: FounderNotificationRow) {
  return (
    text(row.payload?.summary) ||
    text(row.payload?.message) ||
    text(row.payload?.detail) ||
    `${row.source_host || "Production"} reported ${label(row.event_type).toLowerCase()}.`
  );
}

function severityClasses(severity: string) {
  switch (severity) {
    case "critical":
      return "border-red-300 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200";
    case "high":
      return "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-900/70 dark:bg-orange-950/30 dark:text-orange-200";
    case "warning":
      return "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200";
    default:
      return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200";
  }
}

export default async function FounderNotificationsPage({
  searchParams,
}: FounderNotificationsPageProps) {
  await requireFounderAccess("/founder/notifications");
  const params = (await searchParams) ?? {};
  const requestedId = Array.isArray(params.notification_id)
    ? params.notification_id[0]
    : params.notification_id;
  const admin = createServerAdminClient();
  const { data, error } = await admin
    .from("operations_notification_events")
    .select(
      "id,notification_id,event_type,severity,source_host,source_unit,source_commit_sha,payload,received_at",
    )
    .order("received_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(100);

  let rows = (data ?? []) as FounderNotificationRow[];
  if (
    requestedId &&
    !rows.some((row) => row.notification_id === requestedId)
  ) {
    const { data: requestedRow } = await admin
      .from("operations_notification_events")
      .select(
        "id,notification_id,event_type,severity,source_host,source_unit,source_commit_sha,payload,received_at",
      )
      .eq("notification_id", requestedId)
      .maybeSingle();
    if (requestedRow) {
      rows = [requestedRow as FounderNotificationRow, ...rows];
    }
  }

  rows = rows.sort((left, right) => {
    const leftRequested = left.notification_id === requestedId ? 1 : 0;
    const rightRequested = right.notification_id === requestedId ? 1 : 0;
    return rightRequested - leftRequested;
  });

  return (
    <PageContainer className="space-y-7 py-8">
      <PageIntro
        eyebrow="Founder"
        title="Founder Notifications"
        description="Private operational history for pricing, ingestion, catalog, and production workers."
        actions={
          <Link href="/founder" className="gv-secondary-button">
            Control Center
          </Link>
        }
      />

      <PageSection spacing="default">
        <SectionHeader
          title="Operations inbox"
          description="Newest events appear first. Push notifications and the mobile Pulse route back to this same evidence ledger."
        />

        {error ? (
          <div className="gv-soft-surface px-5 py-5 text-sm text-red-700">
            Founder notifications are temporarily unavailable: {error.message}
          </div>
        ) : rows.length === 0 ? (
          <div className="gv-soft-surface px-5 py-6 text-sm text-slate-600">
            No founder notifications have been recorded.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const highlighted = row.notification_id === requestedId;
              return (
                <article
                  key={row.id}
                  className={`rounded-lg border px-5 py-5 ${
                    highlighted
                      ? "border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20 dark:bg-sky-950/20"
                      : "gv-premium-surface"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${severityClasses(row.severity)}`}
                        >
                          {row.severity}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(row.received_at).toLocaleString()}
                        </span>
                      </div>
                      <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                        {notificationTitle(row)}
                      </h2>
                      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {notificationSummary(row)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">{row.source_host}</p>
                  </div>

                  <details className="mt-4 border-t border-slate-200 pt-4 dark:border-white/10">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Evidence
                    </summary>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[9rem_1fr]">
                      <dt className="text-slate-500">Source</dt>
                      <dd>{row.source_unit}</dd>
                      <dt className="text-slate-500">Event</dt>
                      <dd>{row.event_type}</dd>
                      {row.source_commit_sha ? (
                        <>
                          <dt className="text-slate-500">Commit</dt>
                          <dd className="break-all font-mono text-xs">{row.source_commit_sha}</dd>
                        </>
                      ) : null}
                      <dt className="text-slate-500">Notification ID</dt>
                      <dd className="break-all font-mono text-xs">{row.notification_id}</dd>
                    </dl>
                    <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                      {JSON.stringify(row.payload ?? {}, null, 2)}
                    </pre>
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </PageSection>
    </PageContainer>
  );
}
