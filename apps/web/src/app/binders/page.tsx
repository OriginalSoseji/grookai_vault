import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import { BinderDashboardView } from "@/components/binders/BinderViews";
import { BinderConnectivityBoundary } from "@/components/binders/BinderOfflineBanner";
import { BinderIdempotencyScope } from "@/components/binders/BinderIdempotencyScope";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import {
  getBinderFeatureFlags,
  isBinderLibraryEnabled,
} from "@/lib/binders/featureFlags";
import {
  BinderRpcError,
  getBinderDashboard,
  getBinderLegacyCandidates,
} from "@/lib/binders/rpc";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Binders | Grookai Vault",
  description: "Collection goals powered by cards in your Vault.",
  robots: { index: false, follow: false },
};

export default async function BindersPage({
  searchParams,
}: {
  searchParams: {
    notice?: string;
    cursor?: string;
    invitationCursor?: string;
    suspendedCursor?: string;
  };
}) {
  if (!isBinderLibraryEnabled()) {
    notFound();
  }
  const flags = getBinderFeatureFlags();
  const { supabase } = await requireServerUser("/binders");

  let dashboard;
  try {
    dashboard = await getBinderDashboard(
      supabase,
      searchParams.cursor,
      searchParams.invitationCursor,
      searchParams.suspendedCursor,
    );
    if (!searchParams.cursor) {
      try {
        dashboard.legacyCandidates = await getBinderLegacyCandidates(supabase);
      } catch (error) {
        if (!(error instanceof BinderRpcError)) {
          throw error;
        }
      }
    }
  } catch (error) {
    if (!(error instanceof BinderRpcError)) {
      throw error;
    }
    return (
      <div className="space-y-8 py-6">
        <PageIntro
          eyebrow="Binders"
          title="Binders"
          description="Collection goals powered by cards in your Vault."
        />
        <PageSection surface="card">
          <h2 className="text-lg font-semibold text-slate-950">Binders could not load</h2>
          <p className="text-sm text-slate-600">
            Your Binder data was not changed. Check your connection and try again.
          </p>
          <Link href="/binders" className="gv-primary-button">
            Try again
          </Link>
        </PageSection>
      </div>
    );
  }

  const pageHref = (
    key: "cursor" | "invitationCursor" | "suspendedCursor",
    value: string | null,
  ) => {
    const query = new URLSearchParams();
    if (searchParams.cursor) {
      query.set("cursor", searchParams.cursor);
    }
    if (searchParams.invitationCursor) {
      query.set("invitationCursor", searchParams.invitationCursor);
    }
    if (searchParams.suspendedCursor) {
      query.set("suspendedCursor", searchParams.suspendedCursor);
    }
    if (value) {
      query.set(key, value);
    } else {
      query.delete(key);
    }
    return `/binders?${query.toString()}`;
  };

  return (
    <div className="space-y-10 py-6">
      <PageIntro
        eyebrow="Binders"
        title="Binders"
        description="Collection goals powered by cards in your Vault."
        actions={
          <>
            {flags.publicBinders && flags.community ? (
              <Link href="/binders/explore" className="gv-secondary-button">
                Explore Binders
              </Link>
            ) : null}
            <Link href="/binders/new" className="gv-primary-button">
              Create Binder
            </Link>
          </>
        }
      />
      <BinderConnectivityBoundary loadedAt={dashboard.loadedAt}>
      {searchParams.notice === "invitation-declined" ? (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          Binder invitation declined.
        </div>
      ) : null}
      {searchParams.notice === "invitation-unavailable" ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          That invitation could not be completed. It may have expired, changed,
          or already been used.
        </div>
      ) : null}
      {searchParams.notice === "invitation-reported" ? (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Report received. Thank you for helping keep Binder invitations safe.
        </div>
      ) : null}
      <BinderIdempotencyScope seed={crypto.randomUUID()}>
        <BinderDashboardView
          dashboard={dashboard}
          sharedEnabled={flags.shared}
          invitationPageHref={
            dashboard.invitationsNextCursor
              ? pageHref(
                  "invitationCursor",
                  dashboard.invitationsNextCursor,
                )
              : null
          }
          suspendedPageHref={
            dashboard.suspendedNextCursor
              ? pageHref("suspendedCursor", dashboard.suspendedNextCursor)
              : null
          }
        />
      </BinderIdempotencyScope>
      {dashboard.nextCursor ? (
        <div className="flex justify-center">
          <Link
            href={pageHref("cursor", dashboard.nextCursor)}
            className="gv-secondary-button"
          >
            More Binders
          </Link>
        </div>
      ) : null}
      </BinderConnectivityBoundary>
    </div>
  );
}
