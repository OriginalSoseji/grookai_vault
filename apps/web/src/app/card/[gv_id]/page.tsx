import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CardZoomModal from "@/components/compare/CardZoomModal";
import CompareCardButton from "@/components/compare/CompareCardButton";
import CompareTray from "@/components/compare/CompareTray";
import PrintingSelector from "@/components/cards/PrintingSelector";
import VariantBadge from "@/components/cards/VariantBadge";
import LockedPrice from "@/components/pricing/LockedPrice";
import VisiblePrice from "@/components/pricing/VisiblePrice";
import AddToVaultCardAction, { type AddToVaultActionResult } from "@/components/vault/AddToVaultCardAction";
import CopyButton from "@/components/CopyButton";
import PublicCardImage from "@/components/PublicCardImage";
import Link from "next/link";
import { getVariantLabels } from "@/lib/cards/variantPresentation";
import { getAdjacentPublicCardsByGvId } from "@/lib/getAdjacentPublicCardsByGvId";
import { buildCompareCardsParam, buildPathWithCompareCards, normalizeCompareCardsParam } from "@/lib/compareCards";
import { getPublicCardByGvId } from "@/lib/getPublicCardByGvId";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { createServerComponentClient } from "@/lib/supabase/server";
import { addCardToVault, type AddCardToVaultResult } from "@/lib/vault/addCardToVault";

type MetadataItem = {
  label: string;
  value: string;
  href?: string;
};

function formatPrintedTotal(number: string, printedTotal?: number) {
  if (!number || typeof printedTotal !== "number") {
    return undefined;
  }

  const prefix = number.match(/^[A-Za-z]+/)?.[0] ?? "";
  return `${prefix}${printedTotal}`;
}

function buildCardHref(gvId: string, compareCardsParam?: string) {
  const params = new URLSearchParams();

  if (compareCardsParam) {
    params.set("cards", compareCardsParam);
  }

  const query = params.toString();
  return query ? `/card/${encodeURIComponent(gvId)}?${query}` : `/card/${encodeURIComponent(gvId)}`;
}

export const revalidate = 0;
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: { gv_id: string } }): Promise<Metadata> {
  const card = await getPublicCardByGvId(params.gv_id);
  const siteOrigin = getSiteOrigin();

  if (!card) {
    return {
      title: "Card not found | Grookai Vault",
    };
  }

  const titleParts = [card.name, card.set_name, card.gv_id].filter((value): value is string => Boolean(value));
  const title = `${titleParts.join(" • ")} | Grookai Vault`;
  const descriptionParts = [
    `View ${card.name}`,
    card.set_name ? `from ${card.set_name}` : undefined,
    card.number ? `card #${card.number}` : undefined,
    "on Grookai Vault.",
  ].filter((value): value is string => Boolean(value));
  const description = descriptionParts.join(" ");

  return {
    title,
    description,
    alternates: siteOrigin
      ? {
          canonical: `${siteOrigin}/card/${card.gv_id}`,
        }
      : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      url: siteOrigin ? `${siteOrigin}/card/${card.gv_id}` : undefined,
      images: card.image_url ? [{ url: card.image_url, alt: card.name }] : undefined,
    },
    twitter: {
      card: card.image_url ? "summary_large_image" : "summary",
      title,
      description,
      images: card.image_url ? [card.image_url] : undefined,
    },
  };
}

export default async function CardPage({
  params,
  searchParams,
}: {
  params: { gv_id: string };
  searchParams?: { cards?: string };
}) {
  const supabase = createServerComponentClient();
  const [{ data: authData }, card, adjacentCards] = await Promise.all([
    supabase.auth.getUser(),
    getPublicCardByGvId(params.gv_id),
    getAdjacentPublicCardsByGvId(params.gv_id),
  ]);

  if (!card) {
    notFound();
  }
  const resolvedCard = card;
  const compareCards = normalizeCompareCardsParam(searchParams?.cards);
  const compareCardsParam = buildCompareCardsParam(compareCards);

  async function addToVaultAction(
    _previousState: AddToVaultActionResult | null,
    _formData: FormData,
  ): Promise<AddToVaultActionResult> {
    "use server";

    const actionClient = createServerComponentClient();
    const {
      data: { user },
    } = await actionClient.auth.getUser();
    const submissionKey = Date.now();

    if (!user) {
      return {
        ok: false,
        status: "login-required",
        submissionKey,
      };
    }

    if (!resolvedCard.id || !resolvedCard.gv_id) {
      return {
        ok: false,
        status: "not-found",
        submissionKey,
      };
    }

    let result: AddCardToVaultResult;
    try {
      result = await addCardToVault({
        client: actionClient,
        userId: user.id,
        cardId: resolvedCard.id,
        gvId: resolvedCard.gv_id,
        name: resolvedCard.name,
        setName: resolvedCard.set_name,
        imageUrl: resolvedCard.image_url,
      });
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "Unknown vault add error";
      console.error("[vault:add] addToVaultAction failed", {
        userId: user.id,
        gvId: resolvedCard.gv_id,
        cardId: resolvedCard.id,
        detail,
        error,
      });
      return {
        ok: false,
        status: "error",
        message: "Something went wrong while adding this card to your vault.",
        submissionKey,
      };
    }

    return {
      ok: true,
      status: result,
      submissionKey,
    };
  }

  const user = authData.user;
  const { data: activeVaultRow } =
    user && resolvedCard.id
      ? await supabase
          .from("vault_items")
          .select("qty")
          .eq("user_id", user.id)
          .eq("card_id", resolvedCard.id)
          .is("archived_at", null)
          .maybeSingle()
      : { data: null };
  const vaultCount = typeof activeVaultRow?.qty === "number" ? activeVaultRow.qty : 0;
  const loginHref = `/login?next=${encodeURIComponent(buildCardHref(resolvedCard.gv_id, compareCardsParam))}`;
  const canViewPricing = Boolean(user);

  const setName = typeof resolvedCard.set_name === "string" ? resolvedCard.set_name.trim() : "";
  const buildExploreFilterHref = (entries: Array<[string, string]>) => {
    const params = new URLSearchParams(entries);
    return buildPathWithCompareCards("/explore", params.toString(), compareCards);
  };
  const browseSetHref = setName && resolvedCard.set_code ? buildExploreFilterHref([["set", resolvedCard.set_code]]) : null;
  const browseYearHref = typeof resolvedCard.release_year === "number"
    ? buildExploreFilterHref([["year", String(resolvedCard.release_year)]])
    : null;
  const illustratorName = typeof resolvedCard.artist === "string" ? resolvedCard.artist.trim() : "";
  const browseIllustratorHref = illustratorName.length > 0
    ? buildExploreFilterHref([["illustrator", illustratorName]])
    : null;
  const printedTotal = formatPrintedTotal(resolvedCard.number, resolvedCard.printed_total);
  const variantLabels = getVariantLabels(resolvedCard, 3);
  const summaryParts = [
    resolvedCard.number ? `#${resolvedCard.number}${printedTotal ? ` / ${printedTotal}` : ""}` : undefined,
    resolvedCard.rarity,
  ].filter((value): value is string => Boolean(value));
  const metadata: MetadataItem[] = [
    setName.length > 0 ? { label: "Set", value: setName, href: browseSetHref ?? undefined } : null,
    resolvedCard.number ? { label: "Card number", value: resolvedCard.number } : null,
    resolvedCard.rarity ? { label: "Rarity", value: resolvedCard.rarity } : null,
    variantLabels.length > 0 ? { label: "Variant", value: variantLabels.join(" • ") } : null,
    typeof resolvedCard.release_year === "number"
      ? { label: "Release year", value: String(resolvedCard.release_year), href: browseYearHref ?? undefined }
      : null,
    illustratorName.length > 0
      ? { label: "Illustrator", value: illustratorName, href: browseIllustratorHref ?? undefined }
      : null,
  ].filter((item): item is MetadataItem => item !== null);

  return (
    <div className={`space-y-10 py-4 ${compareCards.length > 0 ? "pb-32 md:pb-36" : ""}`}>
      <div className="grid gap-10 md:grid-cols-[40%_60%] md:items-start">
        <div className="rounded-[20px] border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 shadow-sm">
          <CardZoomModal
            src={card.image_url}
            alt={card.name}
            imageClassName="w-full cursor-zoom-in object-contain"
            fallbackClassName="flex aspect-[3/4] items-center justify-center rounded-[12px] bg-slate-100 px-4 text-center text-sm text-slate-500"
          />
        </div>

        <div className="space-y-6">
          <div className="space-y-3 rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{card.name}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-slate-600">{card.gv_id}</p>
              <CopyButton text={card.gv_id} />
            </div>
            {setName.length > 0 ? (
              <p className="text-sm font-medium text-slate-600">
                Pokemon •{" "}
                {browseSetHref ? (
                  <Link href={browseSetHref} className="underline-offset-4 hover:text-slate-950 hover:underline">
                    {setName}
                  </Link>
                ) : (
                  setName
                )}
              </p>
            ) : null}
            {summaryParts.length > 0 ? (
              <p className="text-sm font-medium text-slate-500">{summaryParts.join(" • ")}</p>
            ) : null}
            <div className="grid gap-4 rounded-[14px] border border-slate-100 bg-slate-50 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              {canViewPricing ? (
                <VisiblePrice value={resolvedCard.latest_price} size="detail" note="full" />
              ) : (
                <LockedPrice href={loginHref} size="detail" />
              )}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Variant</p>
                {variantLabels.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {variantLabels.map((label) => (
                      <VariantBadge key={`${resolvedCard.gv_id}-${label}`} label={label} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">—</p>
                )}
              </div>
            </div>
          </div>

          <PrintingSelector printings={resolvedCard.printings} />

          <section className="space-y-4 rounded-[16px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Vault</h2>
                {vaultCount > 0 ? (
                  <p className="text-sm text-slate-600">
                    You own <span className="font-semibold text-slate-900">{vaultCount}</span> {vaultCount === 1 ? "copy" : "copies"}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">You do not own this card</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <AddToVaultCardAction
                  action={addToVaultAction}
                  isAuthenticated={Boolean(user)}
                  loginHref={loginHref}
                />
                <CompareCardButton gvId={resolvedCard.gv_id} />
              </div>
            </div>
          </section>

          {metadata.length > 0 && (
            <section className="space-y-4 rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Collector details</h2>
              <dl className="grid gap-y-3 md:grid-cols-[160px_auto]">
                {metadata.map((item) => (
                  <div key={item.label} className="contents">
                    <dt className="text-sm text-slate-500">{item.label}</dt>
                    <dd className="text-sm font-medium text-slate-800">
                      {item.href ? (
                        <Link href={item.href} className="underline-offset-4 hover:text-slate-950 hover:underline">
                          {item.value}
                        </Link>
                      ) : (
                        item.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {(adjacentCards.previous || adjacentCards.next) && (
            <section className="space-y-4 rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">In This Set</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {adjacentCards.previous ? (
                  <Link
                    href={buildPathWithCompareCards(`/card/${adjacentCards.previous.gv_id}`, "", compareCards)}
                    className="flex items-center gap-3 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-150 hover:-translate-y-[2px] hover:border-slate-300 hover:bg-white hover:shadow-md"
                  >
                    <PublicCardImage
                      src={adjacentCards.previous.image_url}
                      alt={adjacentCards.previous.name}
                      imageClassName="h-16 w-12 rounded-lg border border-slate-200 bg-white object-contain p-1"
                      fallbackClassName="flex h-16 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-1 text-center text-[10px] text-slate-500"
                    />
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">← Previous</p>
                      <p className="truncate text-sm font-medium text-slate-900">{adjacentCards.previous.name}</p>
                      <p className="text-xs text-slate-600">#{adjacentCards.previous.number}</p>
                    </div>
                  </Link>
                ) : (
                  <div className="hidden sm:block" />
                )}

                {adjacentCards.next ? (
                  <Link
                    href={buildPathWithCompareCards(`/card/${adjacentCards.next.gv_id}`, "", compareCards)}
                    className="flex items-center gap-3 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-150 hover:-translate-y-[2px] hover:border-slate-300 hover:bg-white hover:shadow-md"
                  >
                    <PublicCardImage
                      src={adjacentCards.next.image_url}
                      alt={adjacentCards.next.name}
                      imageClassName="h-16 w-12 rounded-lg border border-slate-200 bg-white object-contain p-1"
                      fallbackClassName="flex h-16 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-1 text-center text-[10px] text-slate-500"
                    />
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Next →</p>
                      <p className="truncate text-sm font-medium text-slate-900">{adjacentCards.next.name}</p>
                      <p className="text-xs text-slate-600">#{adjacentCards.next.number}</p>
                    </div>
                  </Link>
                ) : (
                  <div className="hidden sm:block" />
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      <CompareTray cards={compareCards} addHref={buildPathWithCompareCards("/explore", "", compareCards)} />
    </div>
  );
}
