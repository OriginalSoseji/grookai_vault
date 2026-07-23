import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import PageSection from "@/components/layout/PageSection";
import { BinderConnectivityBoundary } from "@/components/binders/BinderOfflineBanner";
import { BinderPublicView } from "@/components/binders/BinderViews";
import { BinderWorkspace, type BinderTab } from "@/components/binders/BinderWorkspace";
import { BinderIdempotencyScope } from "@/components/binders/BinderIdempotencyScope";
import {
  BinderServerActionButton,
  BinderTrustSafetyControls,
  SimpleBinderAction,
} from "@/components/binders/BinderForms";
import { requestToJoinBinderAction } from "@/lib/binders/actions";
import { getBinderFeatureFlags, isBinderLibraryEnabled } from "@/lib/binders/featureFlags";
import {
  BinderRpcError,
  getBinderDetail,
  getBinderPublicDetail,
} from "@/lib/binders/rpc";
import { getOptionalServerUser } from "@/lib/auth/requireServerUser";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const getPublicBinder = cache((publicId: string, cursor: string | null = null) =>
  getBinderPublicDetail(createServerComponentClient(), publicId, cursor),
);

function parseTab(value?: string): BinderTab {
  return value === "activity" || value === "members" || value === "settings"
    ? value
    : "checklist";
}

export async function generateMetadata({
  params,
}: {
  params: { publicId: string };
}): Promise<Metadata> {
  const flags = getBinderFeatureFlags();
  if (!flags.schemaRpc || !flags.publicBinders || !PUBLIC_ID_PATTERN.test(params.publicId)) {
    return {
      title: "Binder | Grookai Vault",
      robots: { index: false, follow: false },
    };
  }
  try {
    const binder = await getPublicBinder(params.publicId);
    const canIndex = binder.listed && binder.moderated;
    return {
      title: `${binder.title} | Grookai Vault`,
      description:
        binder.description?.slice(0, 160) ??
        `${binder.completedSlots} of ${binder.totalSlots} ${binder.progressUnit.replaceAll("_", " ")} complete.`,
      robots: { index: canIndex, follow: canIndex },
      alternates: {
        canonical: `/binders/${encodeURIComponent(binder.publicId)}`,
      },
      openGraph: {
        title: binder.title,
        description:
          binder.description?.slice(0, 160) ??
          `${binder.completedSlots} of ${binder.totalSlots} ${binder.progressUnit.replaceAll("_", " ")} complete.`,
        type: "website",
        url: `/binders/${encodeURIComponent(binder.publicId)}`,
      },
    };
  } catch {
    return {
      title: "Binder | Grookai Vault",
      robots: { index: false, follow: false },
    };
  }
}

export default async function BinderDetailPage({
  params,
  searchParams,
}: {
  params: { publicId: string };
  searchParams: {
    tab?: string;
    result?: string;
    cursor?: string;
    queueCursor?: string;
    add?: string;
    bulk?: string;
    edit?: string;
    filter?: string;
  };
}) {
  if (!isBinderLibraryEnabled() || !PUBLIC_ID_PATTERN.test(params.publicId)) {
    notFound();
  }

  const flags = getBinderFeatureFlags();
  const tab = parseTab(searchParams.tab);
  const filter =
    searchParams.filter === "in_binder" ||
    searchParams.filter === "missing" ||
    searchParams.filter === "in_your_vault" ||
    searchParams.filter === "contributed_by_you" ||
    searchParams.filter === "needs_review"
      ? searchParams.filter
      : "all";
  const { supabase, user } = await getOptionalServerUser();
  if (user) {
    try {
      const showEligibleCopies = tab === "checklist" && searchParams.add === "1";
      const showBulkPreview = tab === "checklist" && searchParams.bulk === "1";
      const showCustomEditor =
        tab === "settings" && searchParams.edit === "checklist";
      const binder = await getBinderDetail(supabase, params.publicId, {
        tab,
        cursor: searchParams.cursor,
        queueCursor: searchParams.queueCursor,
        filter,
        includeEligibleCopies: showEligibleCopies,
        includeBulkPreview: showBulkPreview,
        includeCustomEditor: showCustomEditor,
      });
      return (
        <div className="space-y-6 py-6">
          <BinderConnectivityBoundary loadedAt={binder.loadedAt}>
            <BinderIdempotencyScope seed={crypto.randomUUID()}>
              <BinderWorkspace
                binder={binder}
                tab={tab}
                flags={flags}
                showEligibleCopies={showEligibleCopies}
                currentFilter={filter}
                showBulkPreview={showBulkPreview}
                showCustomEditor={showCustomEditor}
              />
            </BinderIdempotencyScope>
          </BinderConnectivityBoundary>
        </div>
      );
    } catch (error) {
      if (!(error instanceof BinderRpcError)) {
        throw error;
      }
    }
  }

  if (flags.publicBinders) {
    try {
      const binder = await getPublicBinder(
        params.publicId,
        searchParams.cursor ?? null,
      );
      return (
        <div className="space-y-6 py-6">
          <BinderConnectivityBoundary loadedAt={new Date().toISOString()}>
          {searchParams.result ? (
            <div
              role="status"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
            >
              {searchParams.result === "join-requested"
                ? "Request sent. A Binder Manager or Owner can review it."
                : "That request could not be completed."}
            </div>
          ) : null}
          <BinderIdempotencyScope seed={crypto.randomUUID()}>
            <BinderPublicView
              binder={binder}
              showTrustSafety={Boolean(user)}
              checklistPageHref={
                binder.checklistNextCursor
                  ? `/binders/${encodeURIComponent(binder.publicId)}?cursor=${encodeURIComponent(binder.checklistNextCursor)}`
                  : null
              }
            />
          </BinderIdempotencyScope>
          {!user ? (
            <PageSection surface="subtle">
              <p className="text-sm text-slate-600">
                Sign in if you need to report this Binder or block its owner.
              </p>
              <Link
                href={`/login?next=${encodeURIComponent(`/binders/${binder.publicId}`)}`}
                className="gv-secondary-button"
              >
                Sign in
              </Link>
            </PageSection>
          ) : null}
          {binder.canRequestToJoin ? (
            <PageSection surface="card">
              <h2 className="text-lg font-semibold text-slate-950">Build this Binder together</h2>
              <p className="text-sm text-slate-600">
                A request does not share your Vault. If approved, you still choose each copy you contribute.
              </p>
              {user ? (
                <form action={requestToJoinBinderAction.bind(null, binder.publicId)}>
                  <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
                  <BinderServerActionButton>
                    Request to join
                  </BinderServerActionButton>
                </form>
              ) : (
                <Link
                  href={`/login?next=${encodeURIComponent(`/binders/${binder.publicId}`)}`}
                  className="gv-primary-button"
                >
                  Sign in to request
                </Link>
              )}
            </PageSection>
          ) : null}
          {user &&
          binder.joinRequestStatus === "pending" &&
          binder.joinRequestPublicId ? (
            <PageSection surface="subtle">
              <p className="text-sm text-slate-600">
                Your request is waiting for an Owner or Manager.
              </p>
              <SimpleBinderAction
                publicId={binder.publicId}
                actionName="join_withdraw"
                label="Withdraw request"
                fields={{ requestId: binder.joinRequestPublicId }}
              />
            </PageSection>
          ) : null}
          </BinderConnectivityBoundary>
        </div>
      );
    } catch (error) {
      if (!(error instanceof BinderRpcError)) {
        throw error;
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-12">
      <PageSection surface="card">
        <h1 className="gv-section-title">Binder unavailable</h1>
        <p className="text-sm text-slate-600">
          This Binder may be private, archived, unavailable, or your access may have changed.
        </p>
        {user ? (
          <BinderConnectivityBoundary>
            <BinderIdempotencyScope seed={crypto.randomUUID()}>
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  If your membership was suspended, you may still leave or
                  submit a safety report. The server verifies eligibility
                  without disclosing whether this Binder exists.
                </p>
                <div className="flex flex-wrap gap-2">
                  <SimpleBinderAction
                    publicId={params.publicId}
                    actionName="leave"
                    label="Leave Binder"
                    tone="danger"
                  />
                  <Link href="/binders" className="gv-primary-button">
                    Back to my Binders
                  </Link>
                </div>
                <BinderTrustSafetyControls
                  publicId={params.publicId}
                  allowBlock={false}
                />
              </div>
            </BinderIdempotencyScope>
          </BinderConnectivityBoundary>
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent(`/binders/${params.publicId}`)}`}
            className="gv-primary-button"
          >
            Sign in
          </Link>
        )}
      </PageSection>
    </div>
  );
}
