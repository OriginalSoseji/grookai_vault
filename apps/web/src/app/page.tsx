import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import type { CardSummary } from "@/types/cards";

type HomeCardRow = {
  gv_id: string | null;
  name: string | null;
  image_url: string | null;
};

function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, anon);
}

export default async function HomePage() {
  const supabase = createServerSupabase();
  const { data } = await supabase.from("card_prints").select("gv_id,name,image_url").limit(6);

  const cards: CardSummary[] = ((data ?? []) as HomeCardRow[])
    .filter((row): row is { gv_id: string; name: string | null; image_url: string | null } => Boolean(row.gv_id))
    .map((row) => ({
      gv_id: row.gv_id,
      name: row.name ?? "Unknown",
      number: "",
      image_url: row.image_url ?? undefined,
    }));

  return (
    <div className="space-y-16 py-8">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
        <div className="space-y-6">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">Canonical Identity</p>
          <div className="space-y-4">
            <h1 className="text-5xl font-semibold tracking-tight text-slate-950">Grookai Vault</h1>
            <p className="max-w-2xl text-lg text-slate-600">
              A collector-first card catalog anchored by stable Grookai Vault IDs.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/explore" className="rounded bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800">
              Explore cards
            </Link>
            <Link href="/login" className="rounded border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Sign in
            </Link>
          </div>
        </div>

        <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.gv_id}
              href={`/card/${card.gv_id}`}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:-translate-y-0.5 hover:bg-white"
            >
              {card.image_url ? (
                <img src={card.image_url} alt={card.name} className="aspect-[3/4] w-full object-contain p-3" />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center bg-slate-100 text-sm text-slate-500">
                  No image
                </div>
              )}
              <div className="space-y-1 border-t border-slate-200 px-3 py-3">
                <p className="line-clamp-2 text-sm font-medium text-slate-900">{card.name}</p>
                <p className="text-xs text-slate-500">{card.gv_id}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-slate-950">What is Grookai Vault</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Grookai Vault gives collectors a clean way to explore card prints through a stable public ID. Each card
            page is built around the card itself first, with a Grookai Vault ID that stays consistent across the wider
            product.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-slate-950">Future vision</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This is the first public layer of a broader collector experience: card discovery, collection context, and
            future product surfaces that all resolve to the same canonical card record.
          </p>
        </div>
      </section>
    </div>
  );
}
