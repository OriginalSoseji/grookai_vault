import Link from "next/link";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import PublicCardImage from "@/components/PublicCardImage";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type VaultItemRow = {
  id: string;
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  number: string | null;
  condition_label: string | null;
  quantity: number | null;
  effective_price: number | null;
  image_url: string | null;
  created_at: string | null;
};

type RecentItemRow = {
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

type VaultCard = {
  id: string;
  gv_id: string;
  name: string;
  set_code: string;
  number: string;
  condition_label: string;
  quantity: number;
  effective_price: number | null;
  image_url?: string;
  created_at: string | null;
};

type RecentCard = {
  id: string;
  gv_id: string;
  name: string;
  set_code: string;
  set_name: string;
  number: string;
  created_at: string | null;
  image_url?: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatCurrency(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Value unavailable";
  }

  return currencyFormatter.format(value);
}

function formatTimeAgo(value: string | null) {
  if (!value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.max(1, Math.floor(diffMs / 1000));

  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeVaultItems(rows: VaultItemRow[] | null | undefined): VaultCard[] {
  return (rows ?? [])
    .filter((row): row is VaultItemRow & { gv_id: string } => typeof row.gv_id === "string" && row.gv_id.length > 0)
    .map((row) => ({
      id: row.id,
      gv_id: row.gv_id,
      name: row.name?.trim() || "Unknown card",
      set_code: row.set_code?.trim() || "Unknown set",
      number: row.number?.trim() || "—",
      condition_label: row.condition_label?.trim() || "Unknown",
      quantity: typeof row.quantity === "number" ? row.quantity : 0,
      effective_price: typeof row.effective_price === "number" ? row.effective_price : null,
      image_url: getBestPublicCardImageUrl(row.image_url),
      created_at: row.created_at,
    }));
}

function normalizeRecentItems(rows: RecentItemRow[] | null | undefined): RecentCard[] {
  return (rows ?? [])
    .filter((row): row is RecentItemRow & { gv_id: string } => typeof row.gv_id === "string" && row.gv_id.length > 0)
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

export default async function VaultPage() {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center py-10">
        <section className="w-full max-w-2xl space-y-10 text-center">
          <div className="space-y-5">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Your vault, anchored by Grookai ID.</h1>
            <p className="text-base leading-7 text-slate-600">
              Sign in to see your collection, pricing snapshots, and the GV-ID lane behind every vault item.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white px-8 py-8 shadow-sm">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Vault Access</p>
              <p className="text-sm leading-7 text-slate-600">
                The web vault reads your ownership lane from <code>v_vault_items_web</code> and links every item by
                GV-ID.
              </p>
              <div className="flex justify-center pt-2">
                <GoogleSignInButton
                  label="Sign in with Google"
                  nextPath="/vault"
                  className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const [{ data: itemsData, error: itemsError }, { data: recentData, error: recentError }] = await Promise.all([
    supabase
      .from("v_vault_items_web")
      .select("id,gv_id,name,set_code,number,condition_label,quantity,effective_price,image_url,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("v_recently_added")
      .select("id,gv_id,name,set_code,set_name,number,created_at,image_url,image_best,image_alt_url")
      .limit(10),
  ]);

  const items = normalizeVaultItems((itemsData ?? null) as VaultItemRow[] | null);
  const recent = normalizeRecentItems((recentData ?? null) as RecentItemRow[] | null);

  return (
    <div className="space-y-10 py-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-sm shadow-slate-200/70 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Web Vault</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Your collection, on the GV-ID lane.</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-600">
              Every card here is read from <code>v_vault_items_web</code> and linked to its canonical card page by
              Grookai ID.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Vault Snapshot</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{items.length}</p>
            <p className="mt-1 text-sm text-slate-600">{items.length === 1 ? "card in your vault" : "cards in your vault"}</p>
          </div>
        </div>
      </section>

      {itemsError ? (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
          Vault could not be loaded right now: {itemsError.message}
        </section>
      ) : items.length === 0 ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
          <div className="mx-auto max-w-xl space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Your vault is empty.</h2>
            <p className="text-sm leading-7 text-slate-600">Start building your collection.</p>
            <div className="flex justify-center pt-1">
              <Link
                href="/explore"
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Browse Cards
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Vault Cards</h2>
              <p className="text-sm text-slate-600">Linked to canonical card pages by GV-ID.</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/card/${item.gv_id}`}
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <PublicCardImage
                  src={item.image_url}
                  alt={item.name}
                  imageClassName="aspect-[3/4] w-full bg-slate-50 object-contain p-6"
                  fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
                  fallbackLabel={item.name}
                />
                <div className="space-y-3 border-t border-slate-200 px-5 py-5">
                  <div className="space-y-1">
                    <p className="line-clamp-2 text-xl font-medium text-slate-950">{item.name}</p>
                    <p className="text-sm text-slate-600">
                      {item.set_code} {item.number !== "—" ? item.number : ""}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                    <div className="rounded-2xl bg-slate-50 px-3 py-2">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Condition</dt>
                      <dd className="mt-1 font-medium text-slate-900">{item.condition_label}</dd>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Qty</dt>
                      <dd className="mt-1 font-medium text-slate-900">{item.quantity}</dd>
                    </div>
                    <div className="col-span-2 rounded-2xl bg-slate-50 px-3 py-2">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Value</dt>
                      <dd className="mt-1 font-medium text-slate-900">{formatCurrency(item.effective_price)}</dd>
                    </div>
                  </dl>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <p className="text-xs font-medium tracking-[0.08em] text-slate-500">{item.gv_id}</p>
                    <p className="text-xs text-slate-500">{formatTimeAgo(item.created_at)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Recently Added</h2>
            <p className="text-sm text-slate-600">Latest vault activity from the existing <code>v_recently_added</code> view.</p>
          </div>
          <Link href="/wall" className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">
            View wall
          </Link>
        </div>

        {recentError ? (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
            Recently added feed could not be loaded right now: {recentError.message}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 text-sm text-slate-600 shadow-sm">
            No recently added items yet.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recent.map((item) => (
              <Link
                key={item.id}
                href={`/card/${item.gv_id}`}
                className="min-w-[220px] max-w-[220px] flex-none overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <PublicCardImage
                  src={item.image_url}
                  alt={item.name}
                  imageClassName="aspect-[3/4] w-full bg-slate-50 object-contain p-5"
                  fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
                  fallbackLabel={item.name}
                />
                <div className="space-y-2 border-t border-slate-200 px-4 py-4">
                  <p className="line-clamp-2 text-base font-medium text-slate-950">{item.name}</p>
                  <p className="text-sm text-slate-600">
                    {[item.set_code || item.set_name, item.number !== "—" ? `#${item.number}` : undefined].filter(Boolean).join(" • ")}
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs font-medium tracking-[0.08em] text-slate-500">{item.gv_id}</p>
                    <p className="text-xs text-slate-500">{formatTimeAgo(item.created_at)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
