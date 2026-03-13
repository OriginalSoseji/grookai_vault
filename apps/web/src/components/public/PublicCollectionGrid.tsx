import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import type { SharedCard } from "@/lib/getSharedCardsBySlug";

type PublicCollectionGridProps = {
  cards: SharedCard[];
};

export function PublicCollectionGrid({ cards }: PublicCollectionGridProps) {
  return (
    <section className="space-y-4">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.gv_id}
            href={`/card/${card.gv_id}`}
            className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <PublicCardImage
              src={card.image_url}
              alt={card.name}
              imageClassName="aspect-[3/4] w-full bg-slate-50 object-contain p-6"
              fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
              fallbackLabel={card.name}
            />
            <div className="space-y-2 border-t border-slate-200 px-5 py-5">
              <p className="line-clamp-2 text-[1.35rem] font-semibold tracking-tight text-slate-950">{card.name}</p>
              <p className="text-sm text-slate-600">
                {[card.set_name, card.number !== "—" ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ")}
              </p>
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
        ))}
      </div>
    </section>
  );
}
