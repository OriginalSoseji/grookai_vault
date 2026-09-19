/* eslint-disable @next/next/no-img-element -- governed card/media URLs include honest missing-image states */
import Link from "next/link";
import { StoreProductImage } from "./StoreProductImage";
import type { Storefront, StoreFilters } from "@/lib/stores/storefrontTypes";
import { buildLoginHref } from "@/lib/auth/routeAccess";

export function StorefrontView({
  data,
  filters = {},
}: {
  data: Storefront;
  filters?: StoreFilters;
}) {
  const { store } = data;
  const base = `/store/${encodeURIComponent(store.slug)}`;
  const params = new URLSearchParams();
  if (data.preview) params.set("preview", "1");
  if (filters.query) params.set("q", filters.query);
  if (filters.sectionId) params.set("section", filters.sectionId);
  if (filters.condition) params.set("condition", filters.condition);
  if (filters.kind) params.set("kind", filters.kind);
  const pageHref = (offset: number) => {
    const next = new URLSearchParams(params);
    next.set("offset", String(offset));
    return `${base}?${next}`;
  };
  const media = (kind: string) =>
    `/api/stores/${encodeURIComponent(store.slug)}${data.preview ? "/preview" : ""}/media/${kind}`;
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {data.preview && (
        <p role="status" className="rounded-xl bg-amber-50 p-4 text-amber-950">
          Owner preview. Eligible selected copies and complete custom listings
          appear here.
        </p>
      )}
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {store.has_banner ? (
          <img
            src={media("banner")}
            alt=""
            className="h-44 w-full object-cover sm:h-64"
          />
        ) : (
          <div className="h-24 bg-slate-900" />
        )}
        <div className="flex flex-wrap gap-5 p-6 sm:p-8">
          {store.has_logo && (
            <img
              src={media("logo")}
              alt={`${store.display_name} logo`}
              className="h-20 w-20 rounded-2xl object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Independent store · Grookai Vault
            </p>
            <h1 className="mt-2 break-words text-3xl font-semibold text-slate-950">
              {store.display_name}
            </h1>
            {store.description && (
              <p className="mt-3 max-w-2xl whitespace-pre-line text-slate-600">
                {store.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
              {store.collector_slug && (
                <Link
                  href={`/u/${encodeURIComponent(store.collector_slug)}`}
                  className="underline"
                >
                  Meet the collector
                </Link>
              )}
              <Link
                href={buildLoginHref(`${base}?${params}`)}
                className="underline"
              >
                Sign in to Grookai
              </Link>
            </div>
          </div>
        </div>
      </header>
      <section aria-label="Sale inventory" className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold">Available collectibles</h2>
          <p className="mt-1 text-sm text-slate-600">
            Browse asking prices and seller-provided listings.
          </p>
        </div>
        <form
          method="get"
          className="flex flex-wrap items-end gap-3 rounded-2xl bg-slate-50 p-4"
        >
          {data.preview && <input type="hidden" name="preview" value="1" />}
          <label className="min-w-48 flex-1 text-sm">
            Search
            <input
              name="q"
              defaultValue={filters.query}
              placeholder="Name or GV-ID"
              maxLength={120}
              className="mt-1 block w-full rounded-lg border p-2"
            />
          </label>
          <label className="text-sm">
            Section
            <select
              name="section"
              defaultValue={filters.sectionId ?? ""}
              className="mt-1 block rounded-lg border p-2"
            >
              <option value="">All sections</option>
              {data.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Condition
            <select
              name="condition"
              defaultValue={filters.condition ?? ""}
              className="mt-1 block rounded-lg border p-2"
            >
              <option value="">All conditions</option>
              {["NM", "LP", "MP", "HP", "DMG"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Type
            <select
              name="kind"
              defaultValue={filters.kind ?? "all"}
              className="mt-1 block rounded-lg border p-2"
            >
              <option value="all">All collectibles</option>
              <option value="catalog">Catalog copies</option>
              <option value="custom">Custom collectibles</option>
              <option value="raw">Raw</option>
              <option value="slab">Graded</option>
            </select>
          </label>
          <button className="rounded-lg bg-slate-900 px-5 py-2 text-white">
            Apply
          </button>
        </form>
        <p className="text-sm text-slate-500">
          {data.total} {data.total === 1 ? "listing" : "listings"}
        </p>
        {data.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-slate-600">
            No available collectibles match this view.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.items.map((item) =>
              item.entry_type === "custom_product" ? (
                <Link
                  key={`custom:${item.id}`}
                  href={`${base}/products/${item.id}${data.preview ? "?preview=1" : ""}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 hover:border-slate-400"
                >
                  <div className="flex aspect-[3/4] items-center justify-center rounded-xl bg-slate-50 p-3">
                    {item.photo_ids[0] && (
                      <StoreProductImage
                        src={`/api/stores/${encodeURIComponent(store.slug)}${data.preview ? "/preview" : ""}/products/${item.id}/media/${item.photo_ids[0]}`}
                        alt={item.title}
                        className="max-h-full max-w-full object-contain"
                      />
                    )}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Custom collectible · Seller-provided details
                  </p>
                  <h3 className="mt-1 font-semibold">{item.title}</h3>
                  <p className="mt-3 text-lg font-semibold">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: item.asking_price_currency,
                    }).format(item.asking_price_amount ?? 0)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Asking price · {item.available_quantity} available
                  </p>
                </Link>
              ) : (
                <Link
                  key={item.id}
                  href={`/gvvi/${encodeURIComponent(item.gv_vi_id)}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-slate-900"
                >
                  <div className="flex aspect-[3/4] items-center justify-center rounded-xl bg-slate-50 p-3">
                    {item.display_image_url ? (
                      <img
                        src={item.display_image_url}
                        alt={item.display_name}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-center text-sm text-slate-500">
                        Image unavailable
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 font-semibold">{item.display_name}</h3>
                  <p className="text-xs text-slate-500">
                    {item.set_code} · {item.number}
                  </p>
                  <p className="mt-1 text-sm">
                    {item.finish_label} ·{" "}
                    {item.is_graded
                      ? [
                          item.grade_company,
                          item.grade_label ?? item.grade_value,
                        ]
                          .filter(Boolean)
                          .join(" ")
                      : (item.condition_label ?? "Condition not recorded")}
                  </p>
                  <p className="mt-3 text-lg font-semibold">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: item.asking_price_currency,
                    }).format(item.asking_price_amount)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Asking price · {item.gv_vi_id}
                  </p>
                  {item.display_image_kind !== "exact" &&
                    item.display_image_url && (
                      <p className="mt-1 text-xs text-slate-500">
                        Representative artwork
                      </p>
                    )}
                </Link>
              ),
            )}
          </div>
        )}
        <nav
          aria-label="Inventory pages"
          className="flex justify-between gap-4"
        >
          {data.offset > 0 ? (
            <Link
              className="rounded-lg border px-4 py-2"
              href={pageHref(Math.max(0, data.offset - data.limit))}
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          {data.offset + data.limit < data.total && (
            <Link
              className="rounded-lg border px-4 py-2"
              href={pageHref(data.offset + data.limit)}
            >
              Next
            </Link>
          )}
        </nav>
      </section>
    </main>
  );
}
