import Link from "next/link";
import type { Metadata } from "next";
import PageSection from "@/components/layout/PageSection";
import { BinderPublicView } from "@/components/binders/BinderViews";
import { BinderConnectivityBoundary } from "@/components/binders/BinderOfflineBanner";
import { getOptionalServerUser } from "@/lib/auth/requireServerUser";
import { getBinderFeatureFlags } from "@/lib/binders/featureFlags";
import { BinderRpcError, getBinderViewLinkDetail } from "@/lib/binders/rpc";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Shared Binder | Grookai Vault",
  description: "A private, view-only Binder shared through Grookai Vault.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,256}$/;

export default async function BinderViewLinkPage({
  params,
  searchParams,
}: {
  params: { viewToken: string };
  searchParams: { cursor?: string };
}) {
  const flags = getBinderFeatureFlags();
  if (!flags.schemaRpc || !flags.viewLinks || !TOKEN_PATTERN.test(params.viewToken)) {
    return <UnavailableViewLink />;
  }

  const { supabase } = await getOptionalServerUser();
  try {
    const binder = await getBinderViewLinkDetail(
      supabase,
      params.viewToken,
      searchParams.cursor,
    );
    return (
      <div className="space-y-6 py-6">
        <BinderConnectivityBoundary loadedAt={new Date().toISOString()}>
        <div
          role="note"
          className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
        >
          View-only access cannot join this Binder or add cards. The owner can revoke this link at any time.
        </div>
        <BinderPublicView
          binder={binder}
          showTrustSafety={false}
          checklistPageHref={
            binder.checklistNextCursor
              ? `?cursor=${encodeURIComponent(binder.checklistNextCursor)}`
              : null
          }
        />
        </BinderConnectivityBoundary>
      </div>
    );
  } catch (error) {
    if (!(error instanceof BinderRpcError)) {
      throw error;
    }
    return <UnavailableViewLink />;
  }
}

function UnavailableViewLink() {
  return (
    <div className="mx-auto max-w-2xl py-12">
      <PageSection surface="card">
        <h1 className="gv-section-title">View-only link unavailable</h1>
        <p className="text-sm text-slate-600">
          This link may be expired, revoked, or no longer eligible for access. No Binder details were disclosed.
        </p>
        <Link href="/" className="gv-primary-button">Go to Grookai Vault</Link>
      </PageSection>
    </div>
  );
}
