import Link from "next/link";
import { StoreProductImage } from "./StoreProductImage";
import type { CustomProductDetail } from "@/lib/stores/storefrontTypes";
export function CustomProductView({ data }: { data: CustomProductDetail }) {
  const p = data.product,
    base = `/store/${encodeURIComponent(data.store.slug)}`;
  const api = `/api/stores/${encodeURIComponent(data.store.slug)}${data.preview ? "/preview" : ""}/products/${p.id}`;
  return (
    <article className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Link
        href={`${base}${data.preview ? "?preview=1" : ""}`}
        className="underline"
      >
        Back to {data.store.display_name}
      </Link>
      {data.preview && (
        <p role="status" className="rounded-xl bg-amber-50 p-4 text-amber-950">
          Owner preview · This preview does not publish the product.
        </p>
      )}
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          {p.photo_ids.length ? (
            p.photo_ids.map((photo, i) => (
              <StoreProductImage
                key={photo}
                src={`${api}/media/${encodeURIComponent(photo)}`}
                alt={`${p.title || "Custom collectible"} — vendor photo ${i + 1}`}
                className="w-full rounded-2xl border object-contain"
              />
            ))
          ) : (
            <div className="rounded-2xl border p-16 text-center">
              Add a vendor photo
            </div>
          )}
        </div>
        <div className="space-y-5">
          <p className="text-sm text-slate-600">Seller-provided details</p>
          <h1 className="break-words text-3xl font-semibold">
            {p.title || "Untitled collectible"}
          </h1>
          <p className="whitespace-pre-wrap break-words">
            {p.description || "Description not added yet."}
          </p>
          {p.asking_price_amount != null && p.asking_price_amount > 0 && (
            <p className="text-2xl font-semibold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: p.asking_price_currency,
              }).format(p.asking_price_amount)}{" "}
              <span className="text-sm font-normal">asking price</span>
            </p>
          )}
          <p>
            {p.available_quantity > 0
              ? `${p.available_quantity} available (vendor-reported)`
              : "Not currently available"}
          </p>
          <dl className="space-y-3">
            {[
              ["Category", p.category],
              ["Franchise", p.franchise],
              ["Manufacturer", p.manufacturer],
              ["Release region", p.release_region],
              ["Language", p.language],
              ["Condition", p.condition_description],
              ["Packaging", p.packaging_description],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-sm text-slate-500">{k}</dt>
                  <dd className="whitespace-pre-wrap break-words">{v}</dd>
                </div>
              ))}
          </dl>
          {data.store.collector_slug && (
            <Link
              className="inline-block underline"
              href={`/u/${encodeURIComponent(data.store.collector_slug)}`}
            >
              Meet the seller
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
