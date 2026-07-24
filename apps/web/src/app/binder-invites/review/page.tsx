import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import PageSection from "@/components/layout/PageSection";
import { BinderConnectivityBoundary } from "@/components/binders/BinderOfflineBanner";
import { BinderServerActionButton } from "@/components/binders/BinderForms";
import { getOptionalServerUser } from "@/lib/auth/requireServerUser";
import { buildLoginHref } from "@/lib/auth/routeAccess";
import { getBinderFeatureFlags } from "@/lib/binders/featureFlags";
import {
  BINDER_INVITE_RESPONSE_PATH,
  BINDER_INVITE_REVIEW_PATH,
  BINDER_INVITE_TRANSIENT_COOKIE,
  unsealBinderInviteTransientState,
} from "@/lib/binders/invitationHandoff";
import { BinderRpcError, getBinderInvitationPreview } from "@/lib/binders/rpc";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Binder Invitation | Grookai Vault",
  description: "Review a private Grookai Vault Binder invitation.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

function GenericInvitation({
  signedIn,
}: {
  signedIn: boolean;
}) {
  return (
    <div className="mx-auto max-w-2xl py-12">
      <PageSection surface="card">
        <p className="gv-eyebrow">Binder invitation</p>
        <h1 className="gv-section-title">
          {signedIn
            ? "Invitation unavailable"
            : "Sign in to review this invitation"}
        </h1>
        <p className="text-sm text-slate-600">
          {signedIn
            ? "This invitation may be expired, revoked, already used, intended for another account, or blocked."
            : "For privacy, Binder details appear only after the eligible account signs in. The temporary invitation session is encrypted, stays server-only, and is never saved in the login destination."}
        </p>
        {signedIn ? (
          <Link href="/binders" className="gv-primary-button">
            My Binders
          </Link>
        ) : (
          <Link
            href={buildLoginHref(BINDER_INVITE_REVIEW_PATH)}
            className="gv-primary-button"
          >
            Sign in
          </Link>
        )}
      </PageSection>
    </div>
  );
}

export default async function BinderInvitationReviewPage() {
  const flags = getBinderFeatureFlags();
  const transientState = unsealBinderInviteTransientState(
    cookies().get(BINDER_INVITE_TRANSIENT_COOKIE)?.value,
  );
  const { supabase, user } = await getOptionalServerUser();

  if (!flags.schemaRpc || !flags.shared || !transientState || !user) {
    return <GenericInvitation signedIn={Boolean(user)} />;
  }

  try {
    const invitation = await getBinderInvitationPreview(
      supabase,
      transientState.token,
    );
    if (
      invitation.state !== "active" ||
      !invitation.binderTitle ||
      !invitation.role
    ) {
      return <GenericInvitation signedIn />;
    }

    return (
      <div className="mx-auto max-w-2xl space-y-6 py-12">
        <BinderConnectivityBoundary loadedAt={new Date().toISOString()}>
          <PageSection surface="card" spacing="loose">
            <p className="gv-eyebrow">Binder invitation</p>
            <div>
              <h1 className="gv-section-title">{invitation.binderTitle}</h1>
              <p className="mt-2 text-sm text-slate-600">
                {invitation.inviterLabel
                  ? `${invitation.inviterLabel} invited you`
                  : "You were invited"}{" "}
                as{" "}
                <span className="font-semibold capitalize">
                  {invitation.role}
                </span>
                .
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p>{invitation.privacyCopy}</p>
              <p className="mt-2">
                Accepting never publishes your profile, shares your whole Vault,
                or automatically contributes a card.
              </p>
            </div>
            {invitation.expiresAt ? (
              <p className="text-xs text-slate-500">
                Expires {new Date(invitation.expiresAt).toLocaleString()}.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <form action={BINDER_INVITE_RESPONSE_PATH} method="post">
                <input type="hidden" name="operation" value="accept" />
                <input
                  type="hidden"
                  name="csrf"
                  value={transientState.csrf}
                />
                <input
                  type="hidden"
                  name="idempotencyKey"
                  value={crypto.randomUUID()}
                />
                <BinderServerActionButton>
                  Accept invitation
                </BinderServerActionButton>
              </form>
              <form action={BINDER_INVITE_RESPONSE_PATH} method="post">
                <input type="hidden" name="operation" value="decline" />
                <input
                  type="hidden"
                  name="csrf"
                  value={transientState.csrf}
                />
                <input
                  type="hidden"
                  name="idempotencyKey"
                  value={crypto.randomUUID()}
                />
                <BinderServerActionButton tone="secondary">
                  Decline
                </BinderServerActionButton>
              </form>
            </div>
          </PageSection>
          <PageSection surface="subtle">
            <h2 className="text-base font-semibold text-slate-950">
              Report this invitation
            </h2>
            <p className="text-sm text-slate-600">
              Reports are reviewed through Grookai&apos;s trust system. The
              invitation capability stays in the protected, HttpOnly session
              and is removed after this POST.
            </p>
            <form
              action={BINDER_INVITE_RESPONSE_PATH}
              method="post"
              className="space-y-3"
            >
              <input type="hidden" name="operation" value="report" />
              <input
                type="hidden"
                name="csrf"
                value={transientState.csrf}
              />
              <input
                type="hidden"
                name="idempotencyKey"
                value={crypto.randomUUID()}
              />
              <label className="block text-sm font-medium text-slate-700">
                Reason
                <select
                  name="reason"
                  defaultValue="spam"
                  className="mt-1.5 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
                >
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="scam">Scam or impersonation</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Details <span className="font-normal">(optional)</span>
                <textarea
                  name="details"
                  maxLength={1000}
                  className="mt-1.5 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
                />
              </label>
              <BinderServerActionButton tone="secondary">
                Submit report
              </BinderServerActionButton>
            </form>
          </PageSection>
        </BinderConnectivityBoundary>
      </div>
    );
  } catch (error) {
    if (!(error instanceof BinderRpcError)) {
      throw error;
    }
    return <GenericInvitation signedIn />;
  }
}
