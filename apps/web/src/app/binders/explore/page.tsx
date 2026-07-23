import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PublicCardImage from "@/components/PublicCardImage";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import { BinderProgress, BinderTemplateGrid } from "@/components/binders/BinderViews";
import { getBinderFeatureFlags } from "@/lib/binders/featureFlags";
import {
  BinderRpcError,
  getBinderExplore,
  getBinderTemplates,
} from "@/lib/binders/rpc";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Explore Community Binders | Grookai Vault",
  description: "Discover public collection goals built by the Grookai community.",
};

export default async function BinderExplorePage({
  searchParams,
}: {
  searchParams: { cursor?: string };
}) {
  const flags = getBinderFeatureFlags();
  if (!flags.schemaRpc || !flags.publicBinders || !flags.community) {
    notFound();
  }
  const supabase = createServerComponentClient();
  let result;
  let templates = [];
  try {
    [result, templates] = await Promise.all([
      getBinderExplore(supabase, searchParams.cursor),
      flags.templates ? getBinderTemplates(supabase) : Promise.resolve([]),
    ]);
  } catch (error) {
    if (!(error instanceof BinderRpcError)) {
      throw error;
    }
    return (
      <div className="space-y-8 py-6">
        <PageIntro
          eyebrow="Community"
          title="Explore Binders"
          description="Discover collection goals collectors have chosen to make public."
        />
        <PageSection surface="card">
          <h2 className="text-lg font-semibold text-slate-950">Community Binders could not load</h2>
          <p className="text-sm text-slate-600">Check your connection and try again.</p>
          <Link href="/binders/explore" className="gv-primary-button">Try again</Link>
        </PageSection>
      </div>
    );
  }

  return (
    <div className="space-y-10 py-6">
      <PageIntro
        eyebrow="Community"
        title="Explore Binders"
        description="Discover public collection goals. Public viewing never exposes exact Vault copies, certificates, prices, or private notes."
        actions={
          <Link href="/binders" className="gv-secondary-button">
            My Binders
          </Link>
        }
      />
      <PageSection spacing="loose">
        <h2 className="gv-section-title">Community Binders</h2>
        {result.items.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((binder) => (
              <Link
                key={binder.publicId}
                href={`/binders/${encodeURIComponent(binder.publicId)}`}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <div className="mb-4 h-40 overflow-hidden rounded-2xl bg-slate-50">
                  <PublicCardImage
                    src={binder.coverImageUrl ?? undefined}
                    alt={`${binder.title} cover artwork`}
                    imageClassName="h-full w-full object-contain"
                    fallbackClassName="flex h-full items-center justify-center text-xs text-slate-500"
                  />
                </div>
                <p className="gv-eyebrow">{binder.targetLabel}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">{binder.title}</h3>
                {binder.description ? <p className="mt-2 line-clamp-3 text-sm text-slate-600">{binder.description}</p> : null}
                <div className="mt-5">
                  <BinderProgress
                    completed={binder.completedSlots}
                    total={binder.totalSlots}
                    unit={binder.progressUnit}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {binder.memberCount}{" "}
                  {binder.memberCount === 1 ? "contributor" : "contributors"}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
            No moderated, listed community Binders are available yet.
          </p>
        )}
        {result.nextCursor ? (
          <Link
            href={`/binders/explore?cursor=${encodeURIComponent(result.nextCursor)}`}
            className="gv-secondary-button"
          >
            More Binders
          </Link>
        ) : null}
      </PageSection>
      {flags.templates ? (
        <PageSection spacing="loose">
          <div>
            <h2 className="gv-section-title">Suggested Binder templates</h2>
            <p className="mt-1 text-sm text-slate-600">
              Templates are immutable versions. Cloning never joins or changes the original Binder.
            </p>
          </div>
          <BinderTemplateGrid templates={templates} />
        </PageSection>
      ) : null}
    </div>
  );
}
