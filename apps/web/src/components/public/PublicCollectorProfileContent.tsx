"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
import { getPokemonCardCollectionGridClassName } from "@/components/cards/pokemonCardGridLayout";
import { ViewDensityToggle } from "@/components/collection/ViewDensityToggle";
import ContactOwnerButton from "@/components/network/ContactOwnerButton";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { PublicCollectionGrid } from "@/components/public/PublicCollectionGrid";
import { PublicPokemonJumpForm } from "@/components/public/PublicPokemonJumpForm";
import { useViewDensity } from "@/hooks/useViewDensity";
import { getVaultIntentLabel, type DiscoverableVaultIntent } from "@/lib/network/intent";
import type { PublicWallCard } from "@/lib/sharedCards/publicWall.shared";

type PublicCollectorProfileSegment = "collection" | "in-play";

type PublicCollectorProfileContentProps = {
  slug: string;
  collectorDisplayName: string;
  collectorUserId: string;
  cards: PublicWallCard[];
  inPlayCards?: PublicWallCard[];
  collectionTitle?: string;
  collectionEyebrow?: string;
  collectionDescription?: string;
  defaultPokemonValue?: string;
  isAuthenticated: boolean;
  viewerUserId: string | null;
  currentPath: string;
};

function isInPlayCard(card: PublicWallCard): card is PublicWallCard & {
  vault_item_id: string;
} {
  return typeof card.vault_item_id === "string" && card.vault_item_id.length > 0 && (card.in_play_quantity ?? 0) > 0;
}

function getInPlayActionLabel(intent: DiscoverableVaultIntent | null | undefined) {
  switch (intent) {
    case "trade":
      return "Ask to trade";
    case "sell":
      return "Ask to buy";
    case "showcase":
      return "Contact";
    default:
      return "Contact";
  }
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
    return `${card.in_play_quantity} discoverable copies`;
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

  const copyVaultItemIds = Array.from(new Set((card.in_play_copies ?? []).map((copy) => copy.vault_item_id)));
  if (copyVaultItemIds.length > 1) {
    return null;
  }

  return {
    vaultItemId: copyVaultItemIds[0] ?? card.vault_item_id,
    intent: card.intent ?? null,
  };
}

function compareInPlayCards(left: PublicWallCard, right: PublicWallCard) {
  const leftCreatedAt = left.in_play_created_at ? Date.parse(left.in_play_created_at) : Number.NEGATIVE_INFINITY;
  const rightCreatedAt = right.in_play_created_at ? Date.parse(right.in_play_created_at) : Number.NEGATIVE_INFINITY;

  if (leftCreatedAt !== rightCreatedAt) {
    return rightCreatedAt - leftCreatedAt;
  }

  return left.name.localeCompare(right.name);
}

export function PublicCollectorProfileContent({
  slug,
  collectorDisplayName,
  collectorUserId,
  cards,
  inPlayCards: providedInPlayCards = [],
  collectionTitle = "Collection",
  collectionDescription = "View the full collection this collector has put on display.",
  defaultPokemonValue,
  isAuthenticated,
  viewerUserId,
  currentPath,
}: PublicCollectorProfileContentProps) {
  const inPlayCards = useMemo(
    () => [...providedInPlayCards].filter(isInPlayCard).sort(compareInPlayCards),
    [providedInPlayCards],
  );
  const [activeSegment, setActiveSegment] = useState<PublicCollectorProfileSegment>(
    inPlayCards.length > 0 ? "in-play" : "collection",
  );
  const { density, setDensity } = useViewDensity();
  const loginHref = `/login?next=${encodeURIComponent(currentPath)}`;
  const isOwnProfile = viewerUserId === collectorUserId;
  const inPlayCounts = useMemo(
    () =>
      inPlayCards.reduce(
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
    [inPlayCards],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-[1.4rem] border border-slate-200 bg-white p-1.5 shadow-sm shadow-slate-200/50">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { value: "collection", label: "Collection" },
              { value: "in-play", label: "In Play" },
            ] as const
          ).map((segment) => (
            <button
              key={segment.value}
              type="button"
              onClick={() => setActiveSegment(segment.value)}
              className={`rounded-[1rem] px-4 py-2.5 text-sm font-medium transition ${
                activeSegment === segment.value
                  ? "bg-slate-950 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
              aria-pressed={activeSegment === segment.value}
            >
              {segment.label}
            </button>
          ))}
        </div>
      </div>

      {activeSegment === "collection" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200/50 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{collectionTitle}</h2>
                <p className="max-w-2xl text-sm leading-5 text-slate-600">{collectionDescription}</p>
              </div>
              <p className="text-sm font-medium text-slate-500 sm:text-right">
                {cards.length} {cards.length === 1 ? "card" : "cards"}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1">
                <PublicPokemonJumpForm slug={slug} defaultValue={defaultPokemonValue} variant="compact" />
              </div>
              <div className="space-y-1 sm:min-w-fit">
                <p className="text-[11px] font-medium text-slate-500">Display</p>
                <ViewDensityToggle value={density} onChange={setDensity} />
              </div>
            </div>
          </div>

          {cards.length > 0 ? (
            <PublicCollectionGrid cards={cards} density={density} />
          ) : (
            <PublicCollectionEmptyState
              title="No collection cards yet"
              body="This collector hasn't added any shared collection cards yet."
            />
          )}
        </div>
      ) : inPlayCards.length > 0 ? (
        <div className="space-y-4">
          <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200/50 sm:px-5">
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">In Play</p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Cards in play</h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">Cards this collector is open to moving.</p>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">See what this collector is willing to move.</p>
            </div>

            <div className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Available from this collector
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["trade", "sell", "showcase"] as const).map((intent) => (
                  <span
                    key={intent}
                    className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${getInPlayIntentBadgeClassName(intent)}`}
                  >
                    {getVaultIntentLabel(intent)} ({inPlayCounts[intent]})
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className={getPokemonCardCollectionGridClassName(density)}>
            {inPlayCards.map((card) => {
              const supportBadge = getInPlaySupportBadge(card);
              const ownershipSummary = getInPlayOwnershipSummary(card);
              const intentBadges = getIntentBadgeLabels(card);
              const groupedContactAnchor = getGroupedContactAnchor(card);

              return (
                <PokemonCardGridTile
                  key={`${card.card_print_id}-${card.vault_item_id}`}
                  density={density}
                  imageSrc={card.image_url}
                  imageAlt={card.name}
                  imageHref={`/card/${card.gv_id}`}
                  imageFallbackLabel={card.name}
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
                    <Link href={`/card/${card.gv_id}`} className="line-clamp-2 block transition hover:text-slate-700">
                      {card.name}
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
                                  {!isOwnProfile ? (
                                    <ContactOwnerButton
                                      vaultItemId={copy.vault_item_id}
                                      cardPrintId={card.card_print_id}
                                      ownerUserId={collectorUserId}
                                      viewerUserId={viewerUserId}
                                      ownerDisplayName={collectorDisplayName}
                                      cardName={card.name}
                                      intent={copy.intent}
                                      isAuthenticated={isAuthenticated}
                                      loginHref={loginHref}
                                      currentPath={currentPath}
                                      buttonLabel={getInPlayActionLabel(copy.intent)}
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
                          cardName={card.name}
                          intent={groupedContactAnchor.intent}
                          isAuthenticated={isAuthenticated}
                          loginHref={loginHref}
                          currentPath={currentPath}
                          buttonLabel={getInPlayActionLabel(groupedContactAnchor.intent)}
                          buttonClassName="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                        />
                      ) : null}
                      {!isOwnProfile && !groupedContactAnchor && card.in_play_copies && card.in_play_copies.length > 1 ? (
                        <p className="text-xs text-slate-500">
                          Choose a copy above to contact this collector about the exact card in play.
                        </p>
                      ) : null}
                    </div>
                  }
                  footer={<span>GV-ID: {card.gv_id}</span>}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <PublicCollectionEmptyState
          title="No cards in play yet"
          body="This collector hasn't marked any cards for trade, sale, or showcase yet."
        />
      )}
    </section>
  );
}
