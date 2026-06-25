import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PublicCardImage from "@/components/PublicCardImage";
import ShareCardButton from "@/components/ShareCardButton";
import TrackPageEvent from "@/components/telemetry/TrackPageEvent";
import VaultManageCardCopiesBulkSection from "@/components/vault/VaultManageCardCopiesBulkSection";
import VaultManageCardSettingsPanel from "@/components/vault/VaultManageCardSettingsPanel";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import {
  formatVaultCardValue,
  formatVaultSecondaryContext,
  getVaultMessageSignalLabel,
  getVaultPrimaryActionLabel,
  VaultPrimaryStateBadge,
  VaultStatPill,
} from "@/components/vault/VaultCardPrimitives";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getOwnerVaultItems } from "@/lib/vault/getOwnerVaultItems";
import { getOwnerWallSectionMemberships } from "@/lib/wallSections/getOwnerWallSectionMemberships";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSingleCopyHref(copyItems: Array<{ gv_vi_id: string | null }>) {
  if (copyItems.length !== 1) {
    return null;
  }

  const gvviId = copyItems[0]?.gv_vi_id;
  return gvviId ? `/vault/gvvi/${encodeURIComponent(gvviId)}` : null;
}

export default async function VaultManageCardPage({
  params,
}: {
  params: { cardId: string };
}) {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/vault");
  }

  const decodedCardId = decodeURIComponent(params.cardId);
  const { items, itemsError, publicProfileHref, publicCollectionHref } = await getOwnerVaultItems(user.id);
  const item = items.find((candidate) => candidate.card_id === decodedCardId);

  if (!item) {
    notFound();
  }

  const cardValue = formatVaultCardValue(item.effective_price);
  const secondaryContext = formatVaultSecondaryContext(item);
  const messageSignal = getVaultMessageSignalLabel({
    activeMessageCount: item.active_message_count,
    unreadMessageCount: item.unread_message_count,
  });
  const singleCopyHref = getSingleCopyHref(item.copy_items);
  const primaryActionHref = item.active_message_count > 0 ? item.messages_href : singleCopyHref;
  const primaryActionLabel = getVaultPrimaryActionLabel({
    inPlayCount: item.in_play_count,
    activeMessageCount: item.active_message_count,
  });
  const displayIdentity = resolveDisplayIdentity(item);
  const sectionMembershipEntries = await Promise.all(
    item.copy_items.map(async (copy) => [
      copy.instance_id,
      await getOwnerWallSectionMemberships(user.id, copy.instance_id),
    ] as const),
  );
  const sectionMembershipByInstanceId = new Map(sectionMembershipEntries);

  return (
    <>
      <TrackPageEvent eventName="vault_opened" path={`/vault/card/${item.card_id}`} />
      <div className="space-y-8 py-6 md:space-y-10 md:py-8">
        <PageSection
          surface="card"
          spacing="default"
          className="rounded-[2rem] border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,1)_0%,_rgba(248,250,252,0.94)_100%)] px-5 py-5 shadow-[0_30px_68px_-52px_rgba(15,23,42,0.3)] md:px-7 md:py-6"
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/vault"
                className="text-sm font-medium text-slate-500 underline-offset-4 transition hover:text-slate-900 hover:underline"
              >
                Back to Vault
              </Link>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                {item.in_play_count > 0 && publicCollectionHref ? (
                  <Link
                    href={publicCollectionHref}
                    className="font-medium underline-offset-4 transition hover:text-slate-900 hover:underline"
                  >
                    View wall
                  </Link>
                ) : null}
                <ShareCardButton gvId={item.gv_id} />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_20px_42px_-34px_rgba(15,23,42,0.28)]">
                <PublicCardImage
                  src={item.image_url}
                  fallbackSrc={item.canonical_image_url}
                  alt={displayIdentity.display_name}
                  imageClassName="aspect-[3/4] w-full object-contain drop-shadow-[0_18px_32px_rgba(15,23,42,0.14)]"
                  fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-3 text-center text-sm text-slate-500"
                  fallbackLabel={displayIdentity.display_name}
                />
              </div>

              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <VaultPrimaryStateBadge item={item} />
                      <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-[2rem]">
                          {displayIdentity.display_name}
                        </h1>
                        <p className="text-sm text-slate-500">
                          {[item.set_name || item.set_code, item.number !== "—" ? `#${item.number}` : undefined]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                      </div>
                      {secondaryContext ? <p className="text-sm font-medium text-slate-700">{secondaryContext}</p> : null}
                    </div>
                    {cardValue ? (
                      <p className="shrink-0 text-[1.75rem] font-semibold text-slate-950">{cardValue}</p>
                    ) : null}
                  </div>

                  {messageSignal ? (
                    <VaultStatPill tone={item.unread_message_count > 0 ? "attention" : "default"}>{messageSignal}</VaultStatPill>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <VaultStatPill>
                    <span className="font-semibold text-slate-900">{item.owned_count}</span>
                    <span>total copies</span>
                  </VaultStatPill>
                  <VaultStatPill tone="muted">
                    <span className="font-semibold text-slate-900">{item.raw_count}</span>
                    <span>raw</span>
                  </VaultStatPill>
                  <VaultStatPill tone="muted">
                    <span className="font-semibold text-slate-900">{item.slab_count}</span>
                    <span>slab</span>
                  </VaultStatPill>
                  <VaultStatPill tone={item.in_play_count > 0 ? "default" : "muted"}>
                    <span className="font-semibold text-slate-900">{item.in_play_count}</span>
                    <span>visible</span>
                  </VaultStatPill>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {primaryActionHref ? (
                    <Link
                      href={primaryActionHref}
                      className="inline-flex items-center justify-center rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-[0_14px_30px_-24px_rgba(15,23,42,0.55)] transition hover:bg-slate-800"
                    >
                      {primaryActionLabel}
                    </Link>
                  ) : (
                    <a
                      href="#manage-card-copies"
                      className="inline-flex items-center justify-center rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-[0_14px_30px_-24px_rgba(15,23,42,0.55)] transition hover:bg-slate-800"
                    >
                      {primaryActionLabel}
                    </a>
                  )}
                  <a
                    href="#manage-card-copies"
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Open copies
                  </a>
                </div>
              </div>
            </div>
          </div>
        </PageSection>

        {itemsError ? (
          <PageSection surface="subtle" spacing="compact" className="border border-amber-200 bg-amber-50 text-sm text-amber-800">
            Vault metadata is partially unavailable right now: {itemsError}
          </PageSection>
        ) : null}

        {/* LOCK: Grouped card pages may expose curation only inside exact-copy rows. */}
        <VaultManageCardSettingsPanel
          item={item}
          publicCollectionHref={item.in_play_count > 0 ? publicCollectionHref : null}
        />

        <div id="manage-card-copies">
          <PageSection
            surface="card"
            spacing="default"
            className="rounded-[1.85rem] border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-40px_rgba(15,23,42,0.22)]"
          >
            <SectionHeader
              title="Copies"
              description="Choose the exact copy you want to inspect, edit, or remove."
            />

            <VaultManageCardCopiesBulkSection
              copies={item.copy_items}
              membershipModels={item.copy_items.map(
                (copy) =>
                  sectionMembershipByInstanceId.get(copy.instance_id) ?? {
                    instanceId: copy.instance_id,
                    sections: [],
                    loadError: "Section assignments could not be loaded.",
                  },
              )}
              publicWallHref={publicProfileHref}
            />
          </PageSection>
        </div>
      </div>
    </>
  );
}
