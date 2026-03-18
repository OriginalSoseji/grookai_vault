"use client";

import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import { ViewDensityToggle } from "@/components/collection/ViewDensityToggle";
import { useViewDensity, type ViewDensity } from "@/hooks/useViewDensity";
import type { PublicWallCard } from "@/lib/sharedCards/publicWall.shared";
import { getWallCategoryLabel } from "@/lib/sharedCards/wallCategories";

type PublicCollectionGridProps = {
  cards: PublicWallCard[];
};

const gridClassMap: Record<ViewDensity, string> = {
  compact: "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8",
  default: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  large: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
};

const gapClassMap: Record<ViewDensity, string> = {
  compact: "gap-2 sm:gap-3",
  default: "gap-5",
  large: "gap-6",
};

export function PublicCollectionGrid({ cards }: PublicCollectionGridProps) {
  const { density, setDensity } = useViewDensity();

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">View density</p>
          <p className="text-sm text-slate-600">Switch between compact scanning and larger card inspection.</p>
        </div>
        <ViewDensityToggle value={density} onChange={setDensity} />
      </div>
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

            return (
              <Link
                key={card.gv_id}
                href={`/card/${card.gv_id}`}
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-300 hover:shadow-md"
              >
                <PublicCardImage
                  src={card.image_url}
                  alt={card.name}
                  imageClassName="aspect-[3/4] w-full bg-slate-50 object-contain p-6"
                  fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
                  fallbackLabel={card.name}
                />
                <div className="space-y-2 border-t border-slate-200 px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-[1.35rem] font-semibold tracking-tight text-slate-950">{card.name}</p>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      {card.is_slab ? (
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                          Slab
                        </span>
                      ) : null}
                      {wallCategoryLabel ? (
                        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                          {wallCategoryLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    {[card.set_name, card.number !== "—" ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ")}
                  </p>
                  {mixedSummary ? (
                    <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-700">{mixedSummary}</p>
                    </div>
                  ) : null}
                  {card.is_slab ? (
                    <div className="space-y-1 rounded-[1rem] border border-amber-100 bg-amber-50/70 px-3 py-2">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">
                        {[card.grader, card.grade].filter(Boolean).join(" ") || "Graded slab"}
                      </p>
                      {card.cert_number ? <p className="text-xs text-slate-600">Cert {card.cert_number}</p> : null}
                    </div>
                  ) : null}
                  {card.public_note ? <p className="text-sm leading-7 text-slate-600">{card.public_note}</p> : null}
                  {card.back_image_url ? (
                    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
                      <div className="border-b border-slate-200 px-4 py-2">
                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Back Photo</p>
                      </div>
                      <PublicCardImage
                        src={card.back_image_url}
                        alt={`${card.name} back`}
                        imageClassName="aspect-[3/4] w-full bg-slate-50 object-contain p-4"
                        fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
                        fallbackLabel={`${card.name} back`}
                      />
                    </div>
                  ) : null}
                  <p className="text-xs font-medium tracking-[0.08em] text-slate-500">GV-ID: {card.gv_id}</p>
                </div>
              </Link>
            );
          })()
        ))}
      </div>
    </section>
  );
}
