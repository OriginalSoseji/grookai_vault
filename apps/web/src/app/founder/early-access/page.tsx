import type { Metadata } from "next";
import Link from "next/link";
import PageContainer from "@/components/layout/PageContainer";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import { requireFounderAccess } from "@/lib/founder/requireFounderAccess";
import { createServerAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Founder Early Access Leads",
  robots: {
    index: false,
    follow: false,
  },
};

type WaitlistLeadRow = {
  id: string;
  email: string;
  source: string | null;
  created_at: string | null;
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return "-";
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

function csvEscape(value: string | null | undefined) {
  const normalized = value ?? "";
  return `"${normalized.replace(/"/g, '""')}"`;
}

function buildCsv(rows: WaitlistLeadRow[]) {
  const header = ["email", "source", "created_at"];
  const body = rows.map((row) => [
    csvEscape(row.email),
    csvEscape(row.source),
    csvEscape(row.created_at),
  ].join(","));
  return [header.join(","), ...body].join("\n");
}

function LeadMetric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-600">{detail}</p> : null}
    </div>
  );
}

export default async function FounderEarlyAccessPage() {
  await requireFounderAccess("/founder/early-access");

  const admin = createServerAdminClient();
  const { data, error } = await admin
    .from("waitlist")
    .select("id,email,source,created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = ((data ?? []) as WaitlistLeadRow[]).filter((row) => Boolean(row.email));
  const earlyAccessRows = rows.filter((row) => row.source === "early_access_page");
  const otherRows = rows.filter((row) => row.source !== "early_access_page");
  const lastSignup = earlyAccessRows[0]?.created_at ?? null;
  const csvText = buildCsv(earlyAccessRows);

  return (
    <PageContainer className="space-y-8 py-8">
      <section className="gv-collector-panel px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <PageIntro
          eyebrow="Founder"
          title="Early Access Leads"
          description="Read-only view of early access emails captured through the public landing page."
          actions={
            <Link href="/founder" className="gv-secondary-button">
              Back to Founder
            </Link>
          }
        />
      </section>

      {error ? (
        <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
          Waitlist leads could not be loaded: {error.message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <LeadMetric
          label="Early Access Leads"
          value={earlyAccessRows.length.toLocaleString("en-US")}
          detail="source = early_access_page"
        />
        <LeadMetric
          label="Other Waitlist Rows"
          value={otherRows.length.toLocaleString("en-US")}
          detail="Rows from older or alternate signup sources"
        />
        <LeadMetric
          label="Latest Signup"
          value={lastSignup ? formatTimestamp(lastSignup) : "-"}
          detail="Most recent early-access lead"
        />
      </section>

      <PageSection spacing="loose" className="gv-collector-panel px-5 py-6 sm:px-7">
        <SectionHeader
          title="Early Access List"
          description="Newest signups first. This page reads the waitlist only; it does not mutate lead records."
        />

        {earlyAccessRows.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-sm text-slate-600">
            No early access signups have been captured yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
            <div className="max-h-[34rem] overflow-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {earlyAccessRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-medium text-slate-950">{row.email}</td>
                      <td className="px-4 py-3">{row.source ?? "-"}</td>
                      <td className="px-4 py-3">{formatTimestamp(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </PageSection>

      <PageSection spacing="loose" className="gv-collector-panel px-5 py-6 sm:px-7">
        <SectionHeader
          title="Copy Export"
          description="Copy this into a spreadsheet or email tool. Export is read-only and scoped to early_access_page rows."
        />
        <textarea
          readOnly
          className="min-h-[14rem] w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 font-mono text-xs leading-5 text-slate-800 outline-none"
          value={csvText}
        />
      </PageSection>
    </PageContainer>
  );
}
