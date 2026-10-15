import Link from "next/link";
import { purchaseHref } from "@/lib/orders/orderAcquisitionTypes";
import { StoreProductImage } from "./StoreProductImage";
import type { CustomProductDetail } from "@/lib/stores/storefrontTypes";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { SharePublicLinkButton } from "./SharePublicLinkButton";

function jsonLdMarkup(value: Record<string, unknown>) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function formatPrice(amount: number | null, currency: string) {
  if (amount == null || amount <= 0) return "Price on request";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function CustomProductView({
  data,
  purchaseEnabled = false,
}: {
  data: CustomProductDetail;
  purchaseEnabled?: boolean;
}) {
  const p = data.product;
  const base = `/store/${encodeURIComponent(data.store.slug)}`;
  const api = `/api/stores/${encodeURIComponent(data.store.slug)}${data.preview ? "/preview" : ""}/products/${p.id}`;
  const purchaseLink = purchaseHref({ storeId: data.store.id, itemId: p.id, kind: "custom", quantity: 1 });
  const productUrl = `${getSiteOrigin()}${base}/products/${encodeURIComponent(p.id)}`;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title || "Collectible",
    description: p.description || undefined,
    url: productUrl,
    image: p.photo_ids.map((photo) => `${getSiteOrigin()}${api}/media/${encodeURIComponent(photo)}`),
    sku: p.id,
    brand: p.manufacturer ? { "@type": "Brand", name: p.manufacturer } : undefined,
    offers: p.asking_price_amount != null && p.asking_price_amount > 0 ? {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: p.asking_price_currency,
      price: p.asking_price_amount,
      availability: p.available_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: data.store.display_name },
    } : undefined,
  };

  return (
    <main className="gv-page-container gv-page-rhythm py-5 sm:py-8">
      {!data.preview ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdMarkup(productJsonLd) }} /> : null}
      <nav aria-label="Store navigation" className="mb-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
        <Link href={`${base}${data.preview ? "?preview=1" : ""}`} className="transition hover:text-slate-950 dark:hover:text-white">{data.store.display_name}</Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-950 dark:text-white">Collectible details</span>
      </nav>

      {data.preview ? <p role="status" className="gv-store-preview-note mb-5">Owner preview · this collectible is not public yet. <Link href="/account/store" className="font-bold underline underline-offset-4">Return to store workspace</Link></p> : null}

      <article className="grid overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/70 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
        <div className="border-b border-slate-200/70 p-4 dark:border-white/[0.08] sm:p-7 lg:border-b-0 lg:border-r">
          {p.photo_ids.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {p.photo_ids.map((photo, index) => (
                <div key={photo} className="flex min-h-[20rem] items-center justify-center overflow-hidden rounded-2xl bg-slate-50/80 p-5 dark:bg-white/[0.04]">
                  <StoreProductImage key={photo} src={`${api}/media/${encodeURIComponent(photo)}`} alt={`${p.title || "Custom collectible"} — seller photo ${index + 1}`} className="max-h-[42rem] w-full object-contain" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[24rem] items-center justify-center rounded-2xl bg-slate-50/80 p-16 text-center text-sm font-medium text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">Seller photo coming soon</div>
          )}
        </div>

        <div className="flex flex-col p-6 sm:p-9 lg:p-12">
          <div className="flex flex-wrap items-center gap-2"><span className="gv-storefront-eyebrow">Custom collectible</span><span className="gv-metadata-pill">Seller-provided details</span></div>
          <h1 className="mt-5 max-w-xl text-4xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-5xl">{p.title || "Untitled collectible"}</h1>
          <p className="mt-5 whitespace-pre-wrap break-words text-base leading-7 text-slate-600 dark:text-slate-300">{p.description || "Description not added yet."}</p>

          <div className="mt-8 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5 dark:border-white/[0.08] dark:bg-white/[0.04]">
            <p className="text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50">{formatPrice(p.asking_price_amount, p.asking_price_currency)}</p>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{p.available_quantity > 0 ? `${p.available_quantity} available` : "Not currently available"}</p>
            {purchaseEnabled && !data.preview && p.available_quantity > 0 ? <Link href={purchaseLink} prefetch={false} className="gv-primary-button mt-5 block w-full text-center">Review order</Link> : null}
          </div>

          <dl className="mt-8 grid gap-x-6 gap-y-5 border-t border-slate-200/70 pt-6 dark:border-white/[0.08] sm:grid-cols-2">
            {[["Category", p.category], ["Franchise", p.franchise], ["Manufacturer", p.manufacturer], ["Release region", p.release_region], ["Language", p.language], ["Condition", p.condition_description], ["Packaging", p.packaging_description]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</dd></div>)}
          </dl>

          <div className="mt-auto flex flex-wrap gap-4 pt-8 text-sm font-semibold">
            <SharePublicLinkButton title={`${p.title || "Collectible"} from ${data.store.display_name}`} label="Share listing" className="gv-secondary-button" />
            {data.store.collector_slug ? <Link className="gv-secondary-button" href={`/u/${encodeURIComponent(data.store.collector_slug)}`}>Meet the seller</Link> : null}
            <Link className="gv-ghost-button inline-flex items-center rounded-xl px-3 py-2" href={`${base}${data.preview ? "?preview=1" : ""}`}>Back to the store</Link>
          </div>
        </div>
      </article>
    </main>
  );
}
