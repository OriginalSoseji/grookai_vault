import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import { getPublicCardByGvId, getStaticCardParams } from "@/lib/getPublicCardByGvId";
import { getSiteOrigin } from "@/lib/getSiteOrigin";

type MetadataItem = {
  label: string;
  value: string;
};

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  return getStaticCardParams(100);
}

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
  const card = await getPublicCardByGvId(params.gv_id);

  if (!card) {
    notFound();
  }

  const summaryParts = [
    card.set_name,
    card.number ? `#${card.number}` : undefined,
    card.rarity,
  ].filter((value): value is string => Boolean(value));
  const metadata: MetadataItem[] = [
    card.set_name ? { label: "Set", value: card.set_name } : null,
    card.number ? { label: "Card number", value: card.number } : null,
    card.rarity ? { label: "Rarity", value: card.rarity } : null,
    card.artist ? { label: "Illustrator", value: card.artist } : null,
  ].filter((item): item is MetadataItem => item !== null);

  return (
    <div className="space-y-8 py-4">
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          {card.image_url ? (
            <img src={card.image_url} alt={card.name} className="w-full rounded-2xl object-contain" />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
              No image
            </div>
          )}
        </div>

        <div className="space-y-6 rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Canonical Card</p>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">{card.name}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-slate-600">{card.gv_id}</p>
                <CopyButton text={card.gv_id} />
              </div>
              {summaryParts.length > 0 && <p className="text-base font-medium text-slate-700">{summaryParts.join(" • ")}</p>}
            </div>
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
        </div>
      </div>
    </div>
  );
}
