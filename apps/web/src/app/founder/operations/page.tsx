import Link from "next/link";
import PageContainer from "@/components/layout/PageContainer";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import { requireFounderAccess } from "@/lib/founder/requireFounderAccess";
import { createServerAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WorkItem = {
  id: string;
  work_item_key: string;
  version: number;
  state: string;
  title: string;
  summary: string;
  domain: string;
  risk_level: string;
  scope: Record<string, unknown>;
  exclusions: unknown;
  plan_fingerprint: string;
  expires_at: string;
  created_at: string;
  operations_agents: { agent_key: string; display_name: string } | null;
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function tone(state: string) {
  if (state === "failed" || state === "repair_requested") return "border-red-500 text-red-700";
  if (state === "queued" || state === "running") return "border-sky-500 text-sky-700";
  if (state === "succeeded" || state === "approved") return "border-emerald-500 text-emerald-700";
  return "border-slate-300 text-slate-700";
}

export default async function FounderOperationsPage({ searchParams }: Props) {
  await requireFounderAccess("/founder/operations");
  const params = (await searchParams) ?? {};
  const requestedId = Array.isArray(params.work_item_id)
    ? params.work_item_id[0]
    : params.work_item_id;
  const admin = createServerAdminClient();
  const { data, error } = await admin
    .from("founder_work_items")
    .select("id,work_item_key,version,state,title,summary,domain,risk_level,scope,exclusions,plan_fingerprint,expires_at,created_at,operations_agents(agent_key,display_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = ((data ?? []) as unknown as WorkItem[]).sort((left, right) =>
    Number(right.id === requestedId) - Number(left.id === requestedId));

  return (
    <PageContainer className="space-y-7 py-8">
      <PageIntro
        eyebrow="Founder"
        title="Founder Operations"
        description="Frozen work items and command outcomes. Use the mobile app for governed decisions in V1."
        actions={<Link href="/founder/notifications" className="gv-secondary-button">Notifications</Link>}
      />
      <PageSection spacing="default">
        <SectionHeader
          title="Work queue"
          description="A decision never changes a frozen plan. Production writes remain behind service-only executors."
        />
        {error ? (
          <div className="gv-soft-surface px-5 py-5 text-sm text-red-700">
            Founder Operations is unavailable until its migration is active: {error.message}
          </div>
        ) : rows.length === 0 ? (
          <div className="gv-soft-surface px-5 py-6 text-sm text-slate-600">No founder work items exist.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <article
                key={row.id}
                className={`rounded-lg border px-5 py-5 ${row.id === requestedId ? "border-sky-500 ring-2 ring-sky-500/20" : "gv-premium-surface"}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase">
                  <span className={`rounded border px-2 py-1 ${tone(row.state)}`}>{row.state.replaceAll("_", " ")}</span>
                  <span>{row.risk_level}</span><span>{row.domain}</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold">{row.title}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{row.summary}</p>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-[9rem_1fr]">
                  <dt className="text-slate-500">Agent</dt><dd>{row.operations_agents?.display_name ?? "Unknown"}</dd>
                  <dt className="text-slate-500">Version</dt><dd>{row.version}</dd>
                  <dt className="text-slate-500">Fingerprint</dt><dd className="break-all font-mono text-xs">{row.plan_fingerprint}</dd>
                  <dt className="text-slate-500">Expires</dt><dd>{new Date(row.expires_at).toLocaleString()}</dd>
                </dl>
                <details className="mt-4 border-t border-slate-200 pt-4 dark:border-white/10">
                  <summary className="cursor-pointer text-sm font-semibold">Frozen scope and exclusions</summary>
                  <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
                    {JSON.stringify({ scope: row.scope, exclusions: row.exclusions }, null, 2)}
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
