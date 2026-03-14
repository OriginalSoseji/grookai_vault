import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import CompareCardButton from "@/components/compare/CompareCardButton";
import VaultSubmitButton from "@/components/VaultSubmitButton";
import CopyButton from "@/components/CopyButton";
import PublicCardImage from "@/components/PublicCardImage";
import PublicCardImageLightbox from "@/components/PublicCardImageLightbox";
import Link from "next/link";
import { getAdjacentPublicCardsByGvId } from "@/lib/getAdjacentPublicCardsByGvId";
import { buildCompareCardsParam, normalizeCompareCardsParam } from "@/lib/compareCards";
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

type VaultStatus = "added" | "incremented" | "exists" | "signin" | "not-found" | "error";

function buildCardHref(gvId: string, vaultStatus?: VaultStatus, vaultDetail?: string) {
  if (!vaultStatus) {
    return `/card/${encodeURIComponent(gvId)}`;
  }

  const params = new URLSearchParams({ vault: vaultStatus });
  if (vaultDetail) {
    params.set("vault_detail", vaultDetail.slice(0, 500));
  }
  return `/card/${encodeURIComponent(gvId)}?${params.toString()}`;
}

function getVaultMessage(status?: string, detail?: string) {
  switch (status) {
    case "added":
      return {
        tone: "success" as const,
        title: "Added to Vault",
        body: "This card is now in your vault.",
      };
    case "incremented":
      return {
        tone: "success" as const,
        title: "Vault quantity updated",
        body: "This card was already in your vault, so quantity was increased by 1.",
      };
    case "exists":
      return {
        tone: "success" as const,
        title: "Already in Vault",
        body: "This card is already on your vault lane.",
      };
    case "signin":
      return {
        tone: "error" as const,
        title: "Sign in required",
        body: "Sign in to add this card to your vault.",
      };
    case "not-found":
      return {
        tone: "error" as const,
        title: "Card unavailable",
        body: "The canonical card row could not be resolved for vault add.",
      };
    case "error":
      return {
        tone: "error" as const,
        title: "Vault add failed",
        body: detail?.trim() || "An unexpected error occurred while adding this card to your vault.",
      };
    default:
      return null;
  }
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
  searchParams?: { vault?: string; vault_detail?: string; cards?: string };
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

  async function addToVaultAction() {
    "use server";

    const actionClient = createServerComponentClient();
    const {
      data: { user },
    } = await actionClient.auth.getUser();

    if (!user) {
      redirect(`/login?next=${encodeURIComponent(buildCardHref(resolvedCard.gv_id))}`);
    }

    if (!resolvedCard.id || !resolvedCard.gv_id) {
      redirect(buildCardHref(params.gv_id, "not-found"));
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
      redirect(buildCardHref(resolvedCard.gv_id, "error", detail));
    }

    redirect(buildCardHref(resolvedCard.gv_id, result));
  }

  const user = authData.user;
  const compareCards = normalizeCompareCardsParam(searchParams?.cards);
  const compareCardsParam = buildCompareCardsParam(compareCards);
  const compareQuerySuffix = compareCardsParam ? `?cards=${encodeURIComponent(compareCardsParam)}` : "";
  const loginHref = `/login?next=${encodeURIComponent(buildCardHref(resolvedCard.gv_id))}`;
  const vaultMessage = getVaultMessage(searchParams?.vault, searchParams?.vault_detail);
  const vaultMessageToneClasses =
    vaultMessage?.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-rose-200 bg-rose-50 text-rose-800";

  const setName = typeof resolvedCard.set_name === "string" ? resolvedCard.set_name.trim() : "";
  const browseSetHref = setName && resolvedCard.set_code ? `/explore?set=${encodeURIComponent(resolvedCard.set_code)}` : null;
  const browseYearHref =
    typeof resolvedCard.release_year === "number"
      ? `/explore?year=${encodeURIComponent(String(resolvedCard.release_year))}`
      : null;
  const illustratorName = typeof resolvedCard.artist === "string" ? resolvedCard.artist.trim() : "";
  const browseIllustratorHref =
    illustratorName.length > 0 ? `/explore?illustrator=${encodeURIComponent(illustratorName)}` : null;
  const printedTotal = formatPrintedTotal(resolvedCard.number, resolvedCard.printed_total);
  const summaryParts = [
    resolvedCard.number ? `#${resolvedCard.number}${printedTotal ? ` / ${printedTotal}` : ""}` : undefined,
    resolvedCard.rarity,
  ].filter((value): value is string => Boolean(value));
  const metadata: MetadataItem[] = [
    setName.length > 0 ? { label: "Set", value: setName, href: browseSetHref ?? undefined } : null,
    resolvedCard.number ? { label: "Card number", value: resolvedCard.number } : null,
    resolvedCard.rarity ? { label: "Rarity", value: resolvedCard.rarity } : null,
    typeof resolvedCard.release_year === "number"
      ? { label: "Release year", value: String(resolvedCard.release_year), href: browseYearHref ?? undefined }
      : null,
    illustratorName.length > 0
      ? { label: "Illustrator", value: illustratorName, href: browseIllustratorHref ?? undefined }
      : null,
  ].filter((item): item is MetadataItem => item !== null);

  return (
    <div className="space-y-10 py-4">
      <div className="grid gap-10 md:grid-cols-[40%_60%] md:items-start">
        <div className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
          <PublicCardImageLightbox
            src={card.image_url}
            alt={card.name}
            imageClassName="w-full rounded-[12px] object-contain"
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
          </div>

          <section className="space-y-4 rounded-[16px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Vault</h2>
                <p className="text-sm text-slate-700">Add this canonical card to your vault using its GV-ID ownership lane.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <CompareCardButton gvId={resolvedCard.gv_id} addHref="/explore" />
                {user ? (
                  <form action={addToVaultAction}>
                    <VaultSubmitButton label="Add to Vault" />
                  </form>
                ) : (
                  <Link
                    href={loginHref}
                    className="inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Sign in to add
                  </Link>
                )}
              </div>
            </div>

            {vaultMessage ? (
              <div className={`rounded-[12px] border px-4 py-3 ${vaultMessageToneClasses}`}>
                <p className="text-sm font-semibold">{vaultMessage.title}</p>
                <p className="mt-1 text-sm">{vaultMessage.body}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link href="/vault" className="text-sm font-medium underline underline-offset-4">
                    View Vault
                  </Link>
                  {!user ? (
                    <Link href={loginHref} className="text-sm font-medium underline underline-offset-4">
                      Sign in
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
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
                    href={`/card/${adjacentCards.previous.gv_id}${compareQuerySuffix}`}
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
                    href={`/card/${adjacentCards.next.gv_id}${compareQuerySuffix}`}
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
    </div>
  );
}
