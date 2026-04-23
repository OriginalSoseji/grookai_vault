"use client";

import Link from "next/link";
import { useMemo } from "react";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
import { getPokemonCardCollectionGridClassName } from "@/components/cards/pokemonCardGridLayout";
import { ViewDensityToggle } from "@/components/collection/ViewDensityToggle";
import ContactOwnerButton from "@/components/network/ContactOwnerButton";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { PublicCollectionGrid } from "@/components/public/PublicCollectionGrid";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { useViewDensity } from "@/hooks/useViewDensity";
import { getVaultIntentActionLabel, getVaultIntentLabel, type DiscoverableVaultIntent } from "@/lib/network/intent";
import {
  getPublicWallCardHref,
  getPublicWallCardPrimaryGvviId,
  type PublicWallCard,
} from "@/lib/sharedCards/publicWall.shared";
import {
  getPublicWallHref,
  getPublicSectionShareHref,
  PUBLIC_WALL_SECTION_ID,
  type PublicCollectorSectionView,
} from "@/lib/wallSections/wallSectionTypes";

type PublicCollectorProfileContentProps = {
  slug: string;
  collectorDisplayName: string;
  collectorUserId: string;
  sections: PublicCollectorSectionView[];
  isAuthenticated: boolean;
  viewerUserId: string | null;
  currentPath: string;
  selectedSectionId?: string | null;
};

function isWallCard(card: PublicWallCard) {
  return (card.in_play_quantity ?? 0) > 0;
}

function getInPlayIntentBadgeClassName(intent: DiscoverableVaultIntent) {
  switch (intent) {
    case "trade":
      return "border-emerald-300 bg-emerald-100 text-emerald-900";
    case "sell":
      return "border-sky-300 bg-sky-100 text-sky-900";
    case "showcase":
      return "border-amber-300 bg-amber-100 text-amber-900";
  }
}

function getInPlaySupportBadge(card: PublicWallCard) {
  const rawCount = card.in_play_raw_count ?? 0;
  const slabCount = card.in_play_slab_count ?? 0;

  if (rawCount > 0 && slabCount > 0) {
    return `${rawCount} raw • ${slabCount} slab`;
  }

  if (slabCount > 0) {
    return slabCount > 1 ? `${slabCount} slabs` : "Slab";
  }

  if ((card.in_play_quantity ?? 0) > 1) {
    return `${card.in_play_quantity} copies`;
  }

  return null;
}

function getInPlayOwnershipSummary(card: PublicWallCard) {
  if ((card.in_play_quantity ?? 0) > 1) {
    return `${card.in_play_quantity} copies`;
  }

  if (card.in_play_is_graded) {
    return (card.in_play_grade_label ?? [card.in_play_grade_company, card.in_play_grade_value].filter(Boolean).join(" ")) || "Graded";
  }

  return card.in_play_condition_label ?? null;
}

function getIntentBadgeLabels(card: PublicWallCard) {
  return (
    [
      (card.sell_count ?? 0) > 0 ? { intent: "sell" as const, count: card.sell_count ?? 0 } : null,
      (card.trade_count ?? 0) > 0 ? { intent: "trade" as const, count: card.trade_count ?? 0 } : null,
      (card.showcase_count ?? 0) > 0 ? { intent: "showcase" as const, count: card.showcase_count ?? 0 } : null,
    ] as const
  ).filter(
    (value): value is { intent: DiscoverableVaultIntent; count: number } => Boolean(value && value.count > 0),
  );
}

function getGroupedContactAnchor(card: PublicWallCard) {
  if (!card.vault_item_id) {
    return null;
  }

  const copyVaultItemIds = Array.from(new Set((card.in_play_copies ?? []).map((copy) => copy.vault_item_id).filter(Boolean)));
  if (copyVaultItemIds.length > 1) {
    return null;
  }

  return {
    vaultItemId: copyVaultItemIds[0] ?? card.vault_item_id,
    intent: card.intent ?? null,
  };
}

function getPrimaryCopyHref(card: PublicWallCard, viewerUserId: string | null, ownerUserId: string) {
  return getPublicWallCardHref(card, viewerUserId, ownerUserId);
}

function compareWallCards(left: PublicWallCard, right: PublicWallCard) {
  const leftCreatedAt = left.in_play_created_at ? Date.parse(left.in_play_created_at) : Number.NEGATIVE_INFINITY;
  const rightCreatedAt = right.in_play_created_at ? Date.parse(right.in_play_created_at) : Number.NEGATIVE_INFINITY;

  if (leftCreatedAt !== rightCreatedAt) {
    return rightCreatedAt - leftCreatedAt;
  }

  return left.name.localeCompare(right.name);
}

function buildOrderedSections(sections: PublicCollectorSectionView[]) {
  const wall = sections.find((section) => section.kind === "wall") ?? {
    id: PUBLIC_WALL_SECTION_ID,
    kind: "wall" as const,
    name: "Wall",
    position: -1,
    item_count: 0,
    cards: [],
  };
  const customSections = sections
    .filter((section) => section.kind === "custom" && section.id !== PUBLIC_WALL_SECTION_ID && section.name.trim().length > 0)
    .sort((left, right) => left.position - right.position || left.name.localeCompare(right.name));

  // LOCK: Public profile rail must render Wall first, then active public custom sections only.
  return [wall, ...customSections];
}

export function PublicCollectorProfileContent({
  slug,
  collectorDisplayName,
  collectorUserId,
  sections,
  isAuthenticated,
  viewerUserId,
  currentPath,
  selectedSectionId = null,
}: PublicCollectorProfileContentProps) {
  const orderedSections = useMemo(() => buildOrderedSections(sections), [sections]);
  const activeSectionId = selectedSectionId?.trim() || PUBLIC_WALL_SECTION_ID;
  const activeSection = orderedSections.find((section) => section.id === activeSectionId) ?? orderedSections[0];
  const { density, setDensity } = useViewDensity();
  const loginHref = `/login?next=${encodeURIComponent(currentPath)}`;
  const isOwnProfile = viewerUserId === collectorUserId;
  const wallCards = useMemo(
    () => [...(activeSection?.cards ?? [])].filter(isWallCard).sort(compareWallCards),
    [activeSection],
  );
  const wallCounts = useMemo(
    () =>
      wallCards.reduce(
        (counts, card) => {
          counts.trade += card.trade_count ?? 0;
          counts.sell += card.sell_count ?? 0;
          counts.showcase += card.showcase_count ?? 0;
          return counts;
        },
        {
          trade: 0,
          sell: 0,
          showcase: 0,
        } satisfies Record<DiscoverableVaultIntent, number>,
      ),
    [wallCards],
  );

  if (!activeSection) {
    return <PublicCollectionEmptyState title="Nothing to show right now." />;
  }

  return (
    <section className="space-y-4">
      <div className="overflow-x-auto rounded-[1.4rem] border border-slate-200 bg-white p-1.5 shadow-sm shadow-slate-200/50">
        <div className="flex min-w-max gap-2">
          {orderedSections.map((section) => {
            const active = activeSection.id === section.id;
            const className = `max-w-[13rem] truncate rounded-[1rem] px-4 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-slate-950 text-white shadow-sm"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`;

            return (
              <Link
                key={section.id}
                href={section.kind === "custom" ? getPublicSectionShareHref(slug, section.id) : getPublicWallHref(slug)}
                className={className}
                aria-current={active ? "page" : undefined}
              >
                {section.name}
              </Link>
            );
          })}
        </div>
      </div>

      {activeSection.kind === "wall" ? (
        <div className="space-y-4">
          <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200/50 sm:px-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                {/* LOCK: Public wall/section language must remain short, calm, and collector-friendly. */}
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Wall</h2>
              </div>
              <div className="space-y-1 sm:min-w-fit">
                <p className="text-[11px] font-medium text-slate-500">Display</p>
                <ViewDensityToggle value={density} onChange={setDensity} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(["trade", "sell", "showcase"] as const).map((intent) => (
                <span
                  key={intent}
                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${getInPlayIntentBadgeClassName(intent)}`}
                >
                  {getVaultIntentLabel(intent)} ({wallCounts[intent]})
                </span>
              ))}
            </div>
          </div>

          {wallCards.length > 0 ? (
            <div className={getPokemonCardCollectionGridClassName(density)}>
              {wallCards.map((card) => {
                const displayIdentity = resolveDisplayIdentity(card);
                const supportBadge = getInPlaySupportBadge(card);
                const ownershipSummary = getInPlayOwnershipSummary(card);
                const intentBadges = getIntentBadgeLabels(card);
                const groupedContactAnchor = getGroupedContactAnchor(card);
                const exactCopyHref = getPrimaryCopyHref(card, viewerUserId, collectorUserId) ?? `/card/${card.gv_id}`;
                const exactCopyGvviId = getPublicWallCardPrimaryGvviId(card);

                return (
                  <PokemonCardGridTile
                    key={`${card.card_print_id}-${card.gv_vi_id ?? card.vault_item_id ?? card.gv_id}`}
                    density={density}
                    imageSrc={card.image_url}
                    imageFallbackSrc={card.canonical_image_url}
                    imageAlt={displayIdentity.display_name}
                    imageHref={exactCopyHref}
                    imageFallbackLabel={displayIdentity.display_name}
                    imageOverlay={
                      <>
                        <div className="flex min-w-0 flex-wrap gap-1.5">
                          {intentBadges.map((badge) => (
                            <span
                              key={`${card.card_print_id}-${badge.intent}`}
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] shadow-sm ${getInPlayIntentBadgeClassName(badge.intent)}`}
                            >
                              {getVaultIntentLabel(badge.intent)} {badge.count}
                            </span>
                          ))}
                        </div>
                        {supportBadge ? (
                          <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700 shadow-sm">
                            {supportBadge}
                          </span>
                        ) : (
                          <span />
                        )}
                      </>
                    }
                    title={
                      <Link href={exactCopyHref} className="line-clamp-2 block transition hover:text-slate-700">
                        {displayIdentity.display_name}
                      </Link>
                    }
                    subtitle={
                      <span className="line-clamp-1 block">
                        {[card.set_name, card.number !== "—" ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ")}
                      </span>
                    }
                    meta={
                      <>
                        {ownershipSummary ? (
                          <p className="line-clamp-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-700">
                            {ownershipSummary}
                          </p>
                        ) : null}
                        {card.public_note ? <p className="line-clamp-2 pt-1 text-xs leading-5 text-slate-500">{card.public_note}</p> : null}
                      </>
                    }
                    details={
                      <div className="space-y-3">
                        {card.in_play_copies && card.in_play_copies.length > 1 ? (
                          <details className="rounded-[0.9rem] border border-slate-200 bg-slate-50 px-3 py-3">
                            <summary className="cursor-pointer text-sm font-medium text-slate-800">
                              View copies ({card.in_play_copies.length})
                            </summary>
                            <div className="mt-3 space-y-2">
                              {card.in_play_copies.map((copy) => (
                                <div key={copy.instance_id} className="rounded-[0.8rem] border border-slate-200 bg-white px-3 py-2.5">
                                  <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                      <span
                                        className={`inline-flex rounded-full border px-2 py-0.5 ${getInPlayIntentBadgeClassName(copy.intent)}`}
                                      >
                                        {getVaultIntentLabel(copy.intent)}
                                      </span>
                                      {copy.is_graded ? (
                                        <span>
                                          {copy.grade_label ?? ([copy.grade_company, copy.grade_value].filter(Boolean).join(" ") || "Graded")}
                                        </span>
                                      ) : copy.condition_label ? (
                                        <span>{copy.condition_label}</span>
                                      ) : null}
                                      {copy.cert_number ? <span>Cert {copy.cert_number}</span> : null}
                                    </div>
                                    {copy.gv_vi_id ? (
                                      <Link
                                        href={getPublicWallCardHref(
                                          {
                                            gv_vi_id: copy.gv_vi_id,
                                            in_play_copies: undefined,
                                          },
                                          viewerUserId,
                                          collectorUserId,
                                        ) ?? `/card/${card.gv_id}`}
                                        className="inline-flex text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
                                      >
                                        Open copy
                                      </Link>
                                    ) : null}
                                    {!isOwnProfile && copy.vault_item_id ? (
                                      <ContactOwnerButton
                                        vaultItemId={copy.vault_item_id}
                                        cardPrintId={card.card_print_id}
                                        ownerUserId={collectorUserId}
                                        viewerUserId={viewerUserId}
                                        ownerDisplayName={collectorDisplayName}
                                        cardName={displayIdentity.display_name}
                                        intent={copy.intent}
                                        isAuthenticated={isAuthenticated}
                                        loginHref={loginHref}
                                        currentPath={currentPath}
                                        buttonLabel={getVaultIntentActionLabel(copy.intent)}
                                        buttonClassName="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                                      />
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : null}
                        {!isOwnProfile && groupedContactAnchor ? (
                          <ContactOwnerButton
                            vaultItemId={groupedContactAnchor.vaultItemId}
                            cardPrintId={card.card_print_id}
                            ownerUserId={collectorUserId}
                            viewerUserId={viewerUserId}
                            ownerDisplayName={collectorDisplayName}
                            cardName={displayIdentity.display_name}
                            intent={groupedContactAnchor.intent}
                            isAuthenticated={isAuthenticated}
                            loginHref={loginHref}
                            currentPath={currentPath}
                            buttonLabel={getVaultIntentActionLabel(groupedContactAnchor.intent)}
                            buttonClassName="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                          />
                        ) : null}
                        {!isOwnProfile && !groupedContactAnchor && card.in_play_copies && card.in_play_copies.length > 1 ? (
                          <p className="text-xs text-slate-500">
                            Choose a copy above to message this collector about that card.
                          </p>
                        ) : null}
                      </div>
                    }
                    footer={exactCopyGvviId ? <span>GVVI: {exactCopyGvviId}</span> : null}
                  />
                );
              })}
            </div>
          ) : (
            <PublicCollectionEmptyState title="Nothing to show right now." />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200/50 sm:flex-row sm:items-start sm:justify-between sm:px-5">
            <div className="min-w-0 space-y-1">
              <h2 className="truncate text-2xl font-semibold tracking-tight text-slate-950">{activeSection.name}</h2>
            </div>
            <div className="space-y-1 sm:min-w-fit">
              <p className="text-[11px] font-medium text-slate-500">Display</p>
              <ViewDensityToggle value={density} onChange={setDensity} />
            </div>
          </div>

          {activeSection.cards.length > 0 ? (
            <PublicCollectionGrid
              cards={activeSection.cards}
              density={density}
              viewerUserId={viewerUserId}
              ownerUserId={collectorUserId}
            />
          ) : (
            <PublicCollectionEmptyState title="Nothing to show right now." />
          )}
        </div>
      )}
    </section>
  );
}
