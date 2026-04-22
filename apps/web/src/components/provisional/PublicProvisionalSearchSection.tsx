import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import type { PublicProvisionalCard } from "@/lib/provisional/publicProvisionalTypes";
import { getProvisionalDisplayLabel, PROVISIONAL_DETAIL_TRUST_COPY } from "@/lib/provisional/provisionalProductCopy";

type PublicProvisionalSearchSectionProps = {
  cards: PublicProvisionalCard[];
};

// LOCK: Provisional UI is non-canonical.
// LOCK: Do not add vault, pricing, ownership, or provenance actions here.
export default function PublicProvisionalSearchSection({ cards }: PublicProvisionalSearchSectionProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
      <section className="space-y-3 rounded-[8px] border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
        <div className="space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Unconfirmed Cards
          </h2>
          <p className="text-sm text-slate-600">{PROVISIONAL_DETAIL_TRUST_COPY}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
              <Link
                key={card.candidate_id}
                href={`/provisional/${encodeURIComponent(card.candidate_id)}`}
                className="block rounded-[8px] border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex gap-3">
                  <PublicCardImage
                    src={card.image_url ?? undefined}
                    alt={card.display_name}
                    imageClassName="h-24 w-16 rounded-[8px] border border-slate-200 bg-white object-contain p-1"
                    fallbackClassName="flex h-24 w-16 items-center justify-center rounded-[8px] border border-slate-200 bg-slate-100 px-2 text-center text-[10px] text-slate-500"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                        {getProvisionalDisplayLabel(card)}
                      </span>
                      {card.source_label ? (
                        <span className="text-[11px] text-slate-500">{card.source_label}</span>
                      ) : null}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold text-slate-950">{card.display_name}</p>
                      <p className="truncate text-xs text-slate-600">
                        {[card.set_hint, card.number_hint ? `#${card.number_hint}` : null]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                      <p className="line-clamp-2 text-xs leading-5 text-slate-500">
                        {card.public_explanation}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
          ))}
        </div>
      </section>
  );
}
