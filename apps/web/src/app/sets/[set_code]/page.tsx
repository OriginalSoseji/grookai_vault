import { notFound } from "next/navigation";
import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import { getPublicSetDetail } from "@/lib/publicSets";

export const dynamic = "force-dynamic";

export default async function SetPage({
  params,
}: {
  params: { set_code: string };
}) {
  const setDetail = await getPublicSetDetail(params.set_code);

  if (!setDetail) {
    notFound();
  }

  return (
    <div className="space-y-8 py-6">
      <section className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Public Set</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">{setDetail.name}</h1>
        <p className="text-sm text-slate-600">
          {[
            setDetail.code,
            typeof setDetail.release_year === "number" ? String(setDetail.release_year) : undefined,
            typeof setDetail.printed_total === "number" ? `${setDetail.printed_total} cards` : undefined,
          ]
            .filter(Boolean)
            .join(" • ")}
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm text-slate-600">
            {setDetail.cards.length} card{setDetail.cards.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {setDetail.cards.map((card) => (
            <Link
              key={card.gv_id}
              href={`/card/${card.gv_id}`}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <PublicCardImage
                src={card.image_url}
                alt={card.name}
                imageClassName="aspect-[3/4] w-full bg-slate-50 object-contain p-6"
                fallbackClassName="flex aspect-[3/4] items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
              />
              <div className="space-y-2 border-t border-slate-200 px-4 py-4">
                <p className="line-clamp-2 text-lg font-medium text-slate-950">{card.name}</p>
                <p className="text-sm text-slate-600">
                  {[card.number ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ")}
                </p>
                <p className="text-xs font-medium tracking-[0.08em] text-slate-500">{card.gv_id}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
