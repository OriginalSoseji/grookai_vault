"use client";

import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import { useViewDensity, type ViewDensity } from "@/hooks/useViewDensity";
import type { PublicWallCard } from "@/lib/sharedCards/publicWall.shared";
import { getWallCategoryLabel } from "@/lib/sharedCards/wallCategories";

type PublicCollectionGridProps = {
  cards: PublicWallCard[];
  density?: ViewDensity;
};

const gridClassMap: Record<ViewDensity, string> = {
  compact: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6",
  default: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  large: "grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
};

const gapClassMap: Record<ViewDensity, string> = {
  compact: "gap-2 sm:gap-3",
  default: "gap-2.5 sm:gap-3.5",
  large: "gap-3 sm:gap-4",
};

export function PublicCollectionGrid({
  cards,
  density: providedDensity,
}: PublicCollectionGridProps) {
  const storedDensity = useViewDensity();
  const density = providedDensity ?? storedDensity.density;

  return (
    <section className="space-y-4">
      <div className={`grid ${gridClassMap[density]} ${gapClassMap[density]}`}>
        {cards.map((card) => (
          (() => {
            const wallCategoryLabel = getWallCategoryLabel(card.wall_category);
            const rawCount = card.raw_count ?? 0;
            const slabCount = card.slab_count ?? 0;
            const mixedSummary =
              rawCount > 0 && slabCount > 0
                ? slabCount === 1 && card.grader && card.grade
                  ? `${rawCount} Raw + 1 ${[card.grader, card.grade].filter(Boolean).join(" ")}`
                  : `${rawCount} Raw + ${slabCount} Slab`
                : null;
            const slabSummary =
              mixedSummary ??
              (card.is_slab ? [card.grader, card.grade].filter(Boolean).join(" ") || "Graded slab" : null);
            const ownedCount = card.owned_count ?? 0;

            return (
              <Link
                key={card.gv_id}
                href={`/card/${card.gv_id}`}
                className="group overflow-hidden rounded-[1.45rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="relative">
                  <PublicCardImage
                    src={card.image_url}
                    alt={card.name}
                    imageClassName="aspect-[3/4] w-full bg-slate-50 object-contain p-3.5 transition duration-200 group-hover:scale-[1.02] sm:p-4"
                    fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
                    fallbackLabel={card.name}
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
                    <div className="flex min-w-0 flex-wrap gap-1.5">
                      {card.is_slab ? (
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 shadow-sm">
                          Slab
                        </span>
                      ) : null}
                      {wallCategoryLabel ? (
                        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700 shadow-sm">
                          {wallCategoryLabel}
                        </span>
                      ) : null}
                    </div>
                    {ownedCount > 1 ? (
                      <span className="inline-flex rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm">
                        Qty {ownedCount}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-1 border-t border-slate-200 px-3.5 py-2.5 sm:px-4 sm:py-3">
                  <p className="line-clamp-2 text-sm font-semibold tracking-tight text-slate-950 sm:text-base">{card.name}</p>
                  <p className="line-clamp-1 text-xs text-slate-500 sm:text-sm">
                    {[card.set_name, card.number !== "—" ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ")}
                  </p>
                  {slabSummary ? (
                    <p className="line-clamp-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-700">{slabSummary}</p>
                  ) : null}
                  {card.public_note ? <p className="line-clamp-2 text-xs leading-5 text-slate-500">{card.public_note}</p> : null}
                </div>
              </Link>
            );
          })()
        ))}
      </div>
    </section>
  );
}
