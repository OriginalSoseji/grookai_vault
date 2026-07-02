import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { getPublicSetByCode, getPublicSetCards } from "@/lib/publicSets";

export const revalidate = 300;
export const dynamicParams = true;

type SetIdRegistryPageProps = {
  params: { set_code: string };
};

function getCardUrl(gvId: string) {
  return `/card/${encodeURIComponent(gvId)}`;
}

export async function generateMetadata({
  params,
}: SetIdRegistryPageProps): Promise<Metadata> {
  const setDetail = await getPublicSetByCode(params.set_code);
  if (!setDetail) {
    return { title: "Set card IDs not found | Grookai Vault" };
  }

  const siteOrigin = getSiteOrigin();
  const setCode = setDetail.code.toUpperCase();
  const title = `${setDetail.name} ${setCode} Grookai card ID registry | Grookai Vault`;
  const description = `Every public Grookai Vault card ID in ${setDetail.name} ${setCode}, with direct canonical card links for Google indexing and collector lookup.`;

  return {
    title,
    description,
    alternates: siteOrigin
      ? { canonical: `${siteOrigin}/sets/${setDetail.code}/ids` }
      : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      url: siteOrigin ? `${siteOrigin}/sets/${setDetail.code}/ids` : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function SetIdRegistryPage({
  params,
}: SetIdRegistryPageProps) {
  const setDetail = await getPublicSetByCode(params.set_code);
  if (!setDetail) {
    notFound();
  }

  const cards = await getPublicSetCards(setDetail.code, 0, setDetail.card_count);
  const siteOrigin = getSiteOrigin();
  const setCode = setDetail.code.toUpperCase();
  const collectionSchema = siteOrigin
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${setDetail.name} ${setCode} Grookai card ID registry`,
        url: `${siteOrigin}/sets/${setDetail.code}/ids`,
        isPartOf: {
          "@type": "WebSite",
          name: "Grookai Vault",
          url: siteOrigin,
        },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: cards.length,
          itemListElement: cards.map((card, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${siteOrigin}${getCardUrl(card.gv_id)}`,
            item: {
              "@type": "Product",
              name: resolveDisplayIdentity(card).display_name,
              sku: card.gv_id,
              mpn: card.gv_id,
              identifier: {
                "@type": "PropertyValue",
                propertyID: "Grookai Vault ID",
                value: card.gv_id,
              },
            },
          })),
        },
      }
    : null;

  return (
    <main className="gv-page-shell gv-mobile-safe-content">
      {collectionSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(collectionSchema).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      <div className="gv-page-container gv-page-rhythm py-5">
        <section className="gv-soft-surface px-5 py-6 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="gv-eyebrow">Card ID registry</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-4xl">
                {setDetail.name} {setCode} card IDs
              </h1>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                Every public Grookai Vault canonical ID in this set, linked directly to its card page.
              </p>
            </div>
            <Link href={`/sets/${encodeURIComponent(setDetail.code)}`} className="gv-secondary-button min-h-0 px-4 py-2 text-sm">
              Back to set
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="gv-metadata-pill">{setCode}</span>
            <span className="gv-metadata-pill">{cards.length.toLocaleString()} card IDs</span>
            {typeof setDetail.printed_total === "number" ? (
              <span className="gv-metadata-pill">{setDetail.printed_total} printed cards</span>
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/70 pb-3 dark:border-white/[0.08]">
            <div>
              <p className="gv-eyebrow">Canonical links</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-50">
                Direct card pages
              </h2>
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {cards.length.toLocaleString()} result{cards.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => {
              const displayIdentity = resolveDisplayIdentity(card);
              return (
                <Link
                  key={card.gv_id}
                  href={getCardUrl(card.gv_id)}
                  className="gv-soft-surface block px-4 py-4 transition hover:border-slate-400 hover:bg-slate-50/70 dark:hover:border-white/20 dark:hover:bg-white/[0.04]"
                >
                  <span className="block font-mono text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    {card.gv_id}
                  </span>
                  <span className="mt-2 block text-base font-black text-slate-950 dark:text-slate-50">
                    {displayIdentity.base_name}
                  </span>
                  {displayIdentity.printed_name ? (
                    <span className="mt-1 block text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {displayIdentity.printed_name}
                    </span>
                  ) : null}
                  <span className="mt-3 block text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {card.number ? `#${card.number}` : "No printed number"}
                    {card.rarity ? ` • ${card.rarity}` : ""}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
