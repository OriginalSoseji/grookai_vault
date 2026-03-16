import Link from "next/link";
import { redirect } from "next/navigation";
import PublicCardImage from "@/components/PublicCardImage";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WallFeedRow = {
  id: string;
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  set_name: string | null;
  number: string | null;
  created_at: string | null;
  image_url: string | null;
  image_best: string | null;
  image_alt_url: string | null;
};

type WallCard = {
  id: string;
  gv_id: string;
  name: string;
  set_code: string;
  set_name: string;
  number: string;
  created_at: string | null;
  image_url?: string;
};

function formatTimeAgo(value: string | null) {
  if (!value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.max(1, Math.floor(diffMs / 1000));

  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeFeed(rows: WallFeedRow[] | null | undefined): WallCard[] {
  return (rows ?? [])
    .filter((row): row is WallFeedRow & { gv_id: string } => typeof row.gv_id === "string" && row.gv_id.length > 0)
    .map((row) => ({
      id: row.id,
      gv_id: row.gv_id,
      name: row.name?.trim() || "Unknown card",
      set_code: row.set_code?.trim() || "Unknown set",
      set_name: row.set_name?.trim() || row.set_code?.trim() || "Unknown set",
      number: row.number?.trim() || "—",
      created_at: row.created_at,
      image_url: getBestPublicCardImageUrl(row.image_url, row.image_best ?? row.image_alt_url),
    }));
}

export default async function WallPage() {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=%2Fwall");
  }

  const { data, error } = await supabase
    .from("v_recently_added")
    .select("id,gv_id,name,set_code,set_name,number,created_at,image_url,image_best,image_alt_url")
    .eq("user_id", user.id)
    .limit(50)
    .order("created_at", { ascending: false });

  const feed = normalizeFeed((data ?? null) as WallFeedRow[] | null);

  return (
    <div className="space-y-8 py-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-sm shadow-slate-200/70 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Your Wall</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Your recent vault activity.</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-600">
              See the latest cards you have added and jump back into your collection.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Feed Window</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{feed.length}</p>
            <p className="mt-1 text-sm text-slate-600">{feed.length === 1 ? "recent item" : "recent items"}</p>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
          Wall feed could not be loaded right now: {error.message}
        </section>
      ) : feed.length === 0 ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 text-sm text-slate-600 shadow-sm">
          No recent vault activity yet.
        </section>
      ) : (
        <section className="space-y-4">
          {feed.map((item) => (
            <Link
              key={item.id}
              href={`/card/${item.gv_id}`}
              className="block rounded-[2rem] border border-slate-200 bg-white px-5 py-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <PublicCardImage
                  src={item.image_url}
                  alt={item.name}
                  imageClassName="h-40 w-28 rounded-[1.25rem] border border-slate-200 bg-slate-50 object-contain p-2"
                  fallbackClassName="flex h-40 w-28 items-center justify-center rounded-[1.25rem] border border-slate-200 bg-slate-100 px-3 text-center text-xs text-slate-500"
                  fallbackLabel={item.name}
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-medium tracking-tight text-slate-950">{item.name}</h2>
                    <p className="text-sm text-slate-600">
                      {[item.set_name || item.set_code, item.number !== "—" ? `#${item.number}` : undefined].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                  <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                    Added to vault
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                    <p>{formatTimeAgo(item.created_at)}</p>
                    <p>{item.gv_id}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
