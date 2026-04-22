import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import type { PublicProvisionalCard } from "@/lib/provisional/publicProvisionalTypes";
import { PROVISIONAL_DETAIL_TRUST_COPY } from "@/lib/provisional/provisionalProductCopy";

type PublicProvisionalDiscoverySectionProps = {
  cards: PublicProvisionalCard[];
};

// LOCK: Unconfirmed feed cards must remain calm, secondary, and non-canonical.
// LOCK: Do not add vault, pricing, ownership, provenance, or canonical route actions here.
export default function PublicProvisionalDiscoverySection({ cards }: PublicProvisionalDiscoverySectionProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
      <section className="space-y-4 border-t border-slate-200 pt-6 md:pt-8">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">Unconfirmed Cards</h2>
          <p className="text-sm text-slate-600">{PROVISIONAL_DETAIL_TRUST_COPY}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.candidate_id}
              href={`/provisional/${encodeURIComponent(card.candidate_id)}`}
              className="block rounded-[8px] border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex gap-3">
                <PublicCardImage
                  src={card.image_url ?? undefined}
                  alt={card.display_name}
                  imageClassName="h-24 w-16 rounded-[8px] border border-slate-200 bg-white object-contain p-1"
                  fallbackClassName="flex h-24 w-16 items-center justify-center rounded-[8px] border border-slate-200 bg-slate-100 px-2 text-center text-[10px] text-slate-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-semibold text-slate-950">{card.display_name}</p>
                    <p className="truncate text-xs text-slate-600">
                      {[card.set_hint, card.number_hint ? `#${card.number_hint}` : null]
                        .filter(Boolean)
                        .join(" ")}
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
