/* eslint-disable @next/next/no-img-element -- governed card/media URLs include honest missing-image states */
import Link from "next/link";
import { purchaseHref } from "@/lib/orders/orderAcquisitionTypes";
import { StoreProductImage } from "./StoreProductImage";
import type { CustomStoreProduct, StoreEntry, Storefront, StoreFilters, StoreItem } from "@/lib/stores/storefrontTypes";
import { buildLoginHref } from "@/lib/auth/routeAccess";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { SharePublicLinkButton } from "./SharePublicLinkButton";

function jsonLdMarkup(value: Record<string, unknown>) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function formatPrice(amount: number | null | undefined, currency: string) {
  if (amount == null) return "Price on request";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function storeMediaPath(slug: string, preview: boolean, kind: string) {
  return `/api/stores/${encodeURIComponent(slug)}${preview ? "/preview" : ""}/media/${kind}`;
}

function StoreItemCard({
  item,
  store,
  preview,
  purchaseEnabled,
}: {
  item: StoreEntry;
  store: Storefront["store"];
  preview: boolean;
  purchaseEnabled: boolean;
}) {
  const base = `/store/${encodeURIComponent(store.slug)}`;
  const purchaseLink = purchaseHref({
    storeId: store.id,
    itemId: item.id,
    kind: item.entry_type === "custom_product" ? "custom" : "copy",
    quantity: 1,
  });

  if (item.entry_type === "custom_product") {
    const product = item as CustomStoreProduct;
    return (
      <article className="gv-store-product-card group">
        <Link href={`${base}/products/${product.id}${preview ? "?preview=1" : ""}`} className="block">
          <div className="gv-store-product-art">
            <span className="gv-store-product-badge">Custom collectible</span>
            {product.photo_ids[0] ? (
              <StoreProductImage
                src={`/api/stores/${encodeURIComponent(store.slug)}${preview ? "/preview" : ""}/products/${product.id}/media/${product.photo_ids[0]}`}
                alt={product.title}
                className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <span className="px-6 text-center text-sm font-medium text-slate-400 dark:text-slate-500">Photo coming soon</span>
            )}
          </div>
          <div className="space-y-2 px-1 pt-4">
            <p className="gv-store-product-kicker">Seller-provided details</p>
            <h3 className="line-clamp-2 text-base font-bold text-slate-950 dark:text-slate-50">{product.title}</h3>
            <div className="flex items-end justify-between gap-3">
              <p className="text-lg font-black tracking-tight text-slate-950 dark:text-slate-50">{formatPrice(product.asking_price_amount, product.asking_price_currency)}</p>
              <p className="text-right text-xs font-medium text-slate-500 dark:text-slate-400">{product.available_quantity} available</p>
            </div>
          </div>
        </Link>
        {!preview && purchaseEnabled ? <Link href={purchaseLink} prefetch={false} className="gv-primary-button mt-4 block w-full text-center text-sm">Review order</Link> : null}
      </article>
    );
  }

  const catalogItem = item as StoreItem;
  const condition = catalogItem.is_graded
    ? [catalogItem.grade_company, catalogItem.grade_label ?? catalogItem.grade_value].filter(Boolean).join(" ")
    : catalogItem.condition_label ?? "Condition not recorded";

  return (
    <article className="gv-store-product-card group">
      <Link href={`/gvvi/${encodeURIComponent(catalogItem.gv_vi_id)}`} className="block">
        <div className="gv-store-product-art">
          {catalogItem.display_image_url ? (
            <img src={catalogItem.display_image_url} alt={catalogItem.display_name} loading="lazy" className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]" />
          ) : (
            <span className="px-6 text-center text-sm font-medium text-slate-400 dark:text-slate-500">Image unavailable</span>
          )}
          <span className="gv-store-product-badge">{catalogItem.finish_label ?? "Catalog copy"}</span>
        </div>
        <div className="space-y-2 px-1 pt-4">
          <p className="gv-store-product-kicker">{catalogItem.set_code} · {catalogItem.number}</p>
          <h3 className="line-clamp-2 text-base font-bold text-slate-950 dark:text-slate-50">{catalogItem.display_name}</h3>
          <div className="flex items-end justify-between gap-3">
            <p className="text-lg font-black tracking-tight text-slate-950 dark:text-slate-50">{formatPrice(catalogItem.asking_price_amount, catalogItem.asking_price_currency)}</p>
            <p className="max-w-[48%] text-right text-xs font-medium text-slate-500 dark:text-slate-400">{condition}</p>
          </div>
          {catalogItem.display_image_kind !== "exact" && catalogItem.display_image_url ? <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Representative artwork</p> : null}
        </div>
      </Link>
      {!preview && purchaseEnabled ? <Link href={purchaseLink} prefetch={false} className="gv-primary-button mt-4 block w-full text-center text-sm">Review order</Link> : null}
    </article>
  );
}

export function StorefrontView({
  data,
  filters = {},
  purchaseEnabled = false,
}: {
  data: Storefront;
  filters?: StoreFilters;
  purchaseEnabled?: boolean;
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
  const hasFilters = Boolean(filters.query || filters.sectionId || filters.condition || (filters.kind && filters.kind !== "all"));
  const storefrontUrl = `${getSiteOrigin()}${base}`;
  const storefrontJsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.display_name,
    description: store.description || `Collectibles from ${store.display_name} on Grookai Vault.`,
    url: storefrontUrl,
    image: store.has_banner ? `${getSiteOrigin()}${storeMediaPath(store.slug, false, "banner")}` : undefined,
    numberOfItems: data.total,
    brand: { "@type": "Brand", name: "Grookai Vault" },
  };

  return (
    <main className="gv-page-container gv-page-rhythm py-5 sm:py-8">
      {!data.preview ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdMarkup(storefrontJsonLd) }} /> : null}
      {data.preview ? <p role="status" className="gv-store-preview-note mb-5">Private owner preview · only you can open this link. Public customers see published listings and eligible inventory. <Link href="/account/store" className="ml-1 font-bold underline underline-offset-4">Open store workspace</Link></p> : null}

      <header className="gv-storefront-hero">
        {store.has_banner ? <img src={storeMediaPath(store.slug, data.preview, "banner")} alt="" className="gv-storefront-hero-media" /> : <div className="gv-storefront-hero-media gv-storefront-hero-fallback" aria-hidden="true" />}
        <div className="gv-storefront-hero-overlay" aria-hidden="true" />
        <div className="gv-storefront-hero-content">
          <div className="flex flex-wrap items-center gap-2"><span className="gv-storefront-eyebrow">Independent collector store</span><span className="gv-storefront-eyebrow gv-storefront-eyebrow-muted">Powered by Grookai Vault</span></div>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end">
            {store.has_logo ? <img src={storeMediaPath(store.slug, data.preview, "logo")} alt={`${store.display_name} logo`} className="h-20 w-20 rounded-2xl border border-white/25 bg-black/20 object-cover shadow-2xl backdrop-blur sm:h-24 sm:w-24" /> : null}
            <div className="min-w-0 max-w-3xl"><h1 className="gv-storefront-title">{store.display_name}</h1>{store.description ? <p className="mt-3 max-w-2xl whitespace-pre-line text-base leading-7 text-white/78 sm:text-lg">{store.description}</p> : null}</div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3"><a href="#inventory" className="gv-storefront-hero-button">Browse inventory</a><SharePublicLinkButton title={`${store.display_name} on Grookai Vault`} label="Share store" className="gv-storefront-hero-link" />{store.collector_slug ? <Link href={`/u/${encodeURIComponent(store.collector_slug)}`} className="gv-storefront-hero-link">Meet the collector</Link> : null}<Link href={buildLoginHref(`${base}?${params}`)} className="gv-storefront-hero-link">Sign in to Grookai</Link></div>
          <div className="mt-7 flex flex-wrap gap-6 border-t border-white/15 pt-5 text-sm text-white/70"><span><strong className="text-white">{data.total}</strong> listings</span><span><strong className="text-white">{data.sections.length}</strong> collections</span><span>Secure order review before payment</span></div>
        </div>
      </header>

      <section id="inventory" aria-label="Sale inventory" className="mt-10 space-y-6 scroll-mt-6">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="gv-eyebrow">The shop</p><h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-4xl">Available collectibles</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">Browse verified catalog copies and seller-provided collectibles. Open any item for its full details before you review an order.</p></div><span className="gv-metadata-pill">{data.total} {data.total === 1 ? "listing" : "listings"}</span></div>

        <form method="get" className="gv-storefront-filters">
          {data.preview ? <input type="hidden" name="preview" value="1" /> : null}
          <label className="min-w-0 flex-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Search the shop<input name="q" defaultValue={filters.query} placeholder="Search by name or GV-ID" maxLength={120} className="gv-storefront-input mt-2 w-full" /></label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Collection<select name="section" defaultValue={filters.sectionId ?? ""} className="gv-storefront-input mt-2"><option value="">All collections</option>{data.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Condition<select name="condition" defaultValue={filters.condition ?? ""} className="gv-storefront-input mt-2"><option value="">All conditions</option>{["NM", "LP", "MP", "HP", "DMG"].map((condition) => <option key={condition}>{condition}</option>)}</select></label>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Type<select name="kind" defaultValue={filters.kind ?? "all"} className="gv-storefront-input mt-2"><option value="all">All collectibles</option><option value="catalog">Catalog copies</option><option value="custom">Custom collectibles</option><option value="raw">Raw</option><option value="slab">Graded</option></select></label>
          <div className="flex items-center gap-2 pt-5 sm:pt-0"><button className="gv-primary-button whitespace-nowrap text-sm">Apply filters</button>{hasFilters ? <Link href={`${base}${data.preview ? "?preview=1" : ""}`} className="gv-secondary-button whitespace-nowrap text-sm">Reset</Link> : null}</div>
        </form>

        {data.items.length === 0 ? <div className="gv-storefront-empty"><p className="gv-eyebrow">Nothing matched</p><h3 className="mt-2 text-xl font-bold text-slate-950 dark:text-slate-50">No collectibles in this view</h3><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Try clearing a filter or searching for another card, set, or collectible.</p>{hasFilters ? <Link href={`${base}${data.preview ? "?preview=1" : ""}`} className="gv-secondary-button mt-5 inline-flex text-sm">View all listings</Link> : null}</div> : <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{data.items.map((item) => <StoreItemCard key={`${item.entry_type}:${item.id}`} item={item} store={store} preview={data.preview} purchaseEnabled={purchaseEnabled} />)}</div>}

        <nav aria-label="Inventory pages" className="flex items-center justify-between gap-4 border-t border-slate-200/70 pt-6 dark:border-white/[0.08]">{data.offset > 0 ? <Link className="gv-secondary-button text-sm" href={pageHref(Math.max(0, data.offset - data.limit))}>Previous</Link> : <span />}{data.offset + data.limit < data.total ? <Link className="gv-secondary-button text-sm" href={pageHref(data.offset + data.limit)}>Next page</Link> : <span />}</nav>
      </section>
    </main>
  );
}
