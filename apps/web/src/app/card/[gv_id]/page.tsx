import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import PublicCardImage from "@/components/PublicCardImage";
import PublicCardImageLightbox from "@/components/PublicCardImageLightbox";
import Link from "next/link";
import { getAdjacentPublicCardsByGvId } from "@/lib/getAdjacentPublicCardsByGvId";
import { getPublicCardByGvId } from "@/lib/getPublicCardByGvId";
import { getSiteOrigin } from "@/lib/getSiteOrigin";

type MetadataItem = {
  label: string;
  value: string;
};

function formatPrintedTotal(number: string, printedTotal?: number) {
  if (!number || typeof printedTotal !== "number") {
    return undefined;
  }

  const prefix = number.match(/^[A-Za-z]+/)?.[0] ?? "";
  return `${prefix}${printedTotal}`;
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

export default async function CardPage({ params }: { params: { gv_id: string } }) {
  const [card, adjacentCards] = await Promise.all([
    getPublicCardByGvId(params.gv_id),
    getAdjacentPublicCardsByGvId(params.gv_id),
  ]);

  if (!card) {
    notFound();
  }

  const setName = typeof card.set_name === "string" ? card.set_name.trim() : "";
  const printedTotal = formatPrintedTotal(card.number, card.printed_total);
  const summaryParts = [
    card.number ? `#${card.number}${printedTotal ? ` / ${printedTotal}` : ""}` : undefined,
    card.rarity,
  ].filter((value): value is string => Boolean(value));
  const metadata: MetadataItem[] = [
    setName.length > 0 ? { label: "Set", value: setName } : null,
    card.number ? { label: "Card number", value: card.number } : null,
    card.rarity ? { label: "Rarity", value: card.rarity } : null,
    typeof card.release_year === "number" ? { label: "Release year", value: String(card.release_year) } : null,
    card.artist ? { label: "Illustrator", value: card.artist } : null,
  ].filter((item): item is MetadataItem => item !== null);

  return (
    <div className="space-y-8 py-4">
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <PublicCardImageLightbox
            src={card.image_url}
            alt={card.name}
            imageClassName="w-full rounded-2xl object-contain"
            fallbackClassName="flex aspect-[3/4] items-center justify-center rounded-2xl bg-slate-100 px-4 text-center text-sm text-slate-500"
          />
        </div>

        <div className="space-y-6 rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">{card.name}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-slate-600">{card.gv_id}</p>
              <CopyButton text={card.gv_id} />
            </div>
            {setName.length > 0 ? (
              <p className="text-sm font-medium text-slate-600">Pokemon • {setName}</p>
            ) : null}
            {summaryParts.length > 0 ? (
              <p className="text-base font-medium text-slate-700">{summaryParts.join(" • ")}</p>
            ) : null}
          </div>

          {metadata.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Collector details</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                {metadata.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</dt>
                    <dd className="mt-2 text-sm text-slate-800">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {(adjacentCards.previous || adjacentCards.next) && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">In This Set</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {adjacentCards.previous ? (
                  <Link
                    href={`/card/${adjacentCards.previous.gv_id}`}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300 hover:bg-white"
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
                    href={`/card/${adjacentCards.next.gv_id}`}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300 hover:bg-white"
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
