import type { Metadata } from "next";
import Link from "next/link";
import PageContainer from "@/components/layout/PageContainer";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import { requireFounderAccess } from "@/lib/founder/requireFounderAccess";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { setTrustReportStatusAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Founder Trust and Safety",
  robots: { index: false, follow: false },
};

type TrustReportRow = {
  id: string;
  reporter_user_id: string;
  reported_user_id: string | null;
  surface: string;
  surface_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type PublicProfileRow = {
  user_id: string;
  slug: string | null;
  display_name: string | null;
};

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function profileLabel(
  userId: string | null,
  profiles: Map<string, PublicProfileRow>,
) {
  if (!userId) return "No reported user";
  const profile = profiles.get(userId);
  if (profile?.display_name) return profile.display_name;
  if (profile?.slug) return `/u/${profile.slug}`;
  return userId;
}

function StatusActions({ report }: { report: TrustReportRow }) {
  return (
    <form action={setTrustReportStatusAction} className="flex flex-wrap gap-2">
      <input type="hidden" name="report_id" value={report.id} />
      <button type="submit" name="status" value="reviewing" className="gv-secondary-button">
        Review
      </button>
      <button type="submit" name="status" value="actioned" className="gv-primary-button">
        Actioned
      </button>
      <button type="submit" name="status" value="dismissed" className="gv-secondary-button">
        Dismiss
      </button>
    </form>
  );
}

export default async function FounderTrustSafetyPage() {
  await requireFounderAccess("/founder/trust-safety");
  const admin = createServerAdminClient();
  const { data, error } = await admin
    .from("trust_reports")
    .select(
      "id,reporter_user_id,reported_user_id,surface,surface_id,reason,details,status,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const reports = (data ?? []) as TrustReportRow[];
  const userIds = Array.from(
    new Set(
      reports.flatMap((row) =>
        [row.reporter_user_id, row.reported_user_id].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    ),
  );
  const profileResult = userIds.length
    ? await admin
        .from("public_profiles")
        .select("user_id,slug,display_name")
        .in("user_id", userIds)
    : { data: [], error: null };
  const profiles = new Map(
    ((profileResult.data ?? []) as PublicProfileRow[]).map((row) => [
      row.user_id,
      row,
    ]),
  );
  const activeReports = reports.filter(
    (row) => row.status === "open" || row.status === "reviewing",
  );
  const resolvedReports = reports.filter(
    (row) => row.status === "actioned" || row.status === "dismissed",
  );

  return (
    <PageContainer className="space-y-8 py-8">
      <section className="gv-collector-panel px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <PageIntro
          eyebrow="Founder"
          title="Trust and Safety"
          description="Review collector reports and record their disposition. Message text is never edited from this surface."
          actions={
            <Link href="/founder" className="gv-secondary-button">
              Back to Founder
            </Link>
          }
        />
      </section>

      {error || profileResult.error ? (
        <div className="border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          Trust reports could not be fully loaded: {error?.message ?? profileResult.error?.message}
        </div>
      ) : null}

      <PageSection spacing="loose" className="gv-collector-panel px-5 py-6 sm:px-7">
        <SectionHeader
          title={`Open queue (${activeReports.length})`}
          description="Newest reports first. Review the stated reason, source surface, and optional collector details."
        />
        <div className="overflow-x-auto border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Report</th>
                <th className="px-4 py-3">Collectors</th>
                <th className="px-4 py-3">Evidence</th>
                <th className="px-4 py-3">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {activeReports.map((report) => (
                <tr key={report.id} className="align-top">
                  <td className="px-4 py-4">
                    <p className="font-semibold capitalize text-slate-950">{report.reason}</p>
                    <p className="mt-1 text-xs capitalize text-slate-500">{report.status}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatTimestamp(report.created_at)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p><span className="font-medium">Reported:</span> {profileLabel(report.reported_user_id, profiles)}</p>
                    <p className="mt-1"><span className="font-medium">Reporter:</span> {profileLabel(report.reporter_user_id, profiles)}</p>
                  </td>
                  <td className="max-w-md px-4 py-4">
                    <p className="capitalize">{report.surface.replaceAll("_", " ")}</p>
                    {report.surface_id ? <p className="mt-1 break-all text-xs text-slate-500">{report.surface_id}</p> : null}
                    {report.details ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{report.details}</p> : null}
                  </td>
                  <td className="px-4 py-4"><StatusActions report={report} /></td>
                </tr>
              ))}
              {activeReports.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No open reports.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </PageSection>

      <PageSection spacing="loose" className="gv-collector-panel px-5 py-6 sm:px-7">
        <SectionHeader
          title={`Recent decisions (${resolvedReports.length})`}
          description="Resolved reports remain visible as an audit history."
        />
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {resolvedReports.slice(0, 100).map((report) => (
            <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <span className="font-semibold capitalize text-slate-950">{report.reason}</span>
                <span className="ml-2 capitalize text-slate-500">{report.status}</span>
              </div>
              <span className="text-xs text-slate-500">{formatTimestamp(report.updated_at)}</span>
            </div>
          ))}
          {resolvedReports.length === 0 ? <p className="py-6 text-sm text-slate-500">No resolved reports yet.</p> : null}
        </div>
      </PageSection>
    </PageContainer>
  );
}
