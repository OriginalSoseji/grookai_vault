import type { CustomStoreProduct, Storefront, StoreOwner } from "@/lib/stores/storefrontTypes";
export type OwnerModel = StoreOwner & { inventory: Storefront | null };
export type OwnerProduct = Omit<CustomStoreProduct, "entry_type" | "photo_ids"> & {
  version: number; published: boolean; archived_at: string | null;
  private_sku: string; photo_paths: string[]; section_ids: string[];
  ineligible_reason: string | null; suspension_reason: string | null;
};
export type ProductList = { products: OwnerProduct[]; total: number; offset: number; limit: number };
export async function storeRequest<T>(url: string, body?: Record<string, unknown> | FormData): Promise<T> {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin", ...(body ? { method: "POST", ...(body instanceof FormData ? { body } : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) } : {}) });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = null; }
  if (!response.ok) throw new Error(response.status === 401 ? "Your session ended. Sign in again to continue; your unsaved changes are still here." : data?.error ?? text ?? "Request failed");
  return data as T;
}
export const ownerChange = (body: Record<string, unknown>) => storeRequest("/api/stores/owner", body);
export async function productChange(product: OwnerProduct | null, action: string, data: Record<string, unknown> = {}) {
  const result = await storeRequest<ProductList>("/api/stores/owner/products", { id: product?.id ?? null, version: product?.version ?? null, action, data });
  if (!result.products[0]) throw new Error("Product could not be read back. Reload before editing.");
  return result.products[0];
}
export async function uploadStoreImage(file: File, kind: string, product?: string) {
  if (file.size > 5 * 1024 * 1024 || file.size === 0) throw new Error("Choose an image up to 5 MB");
  const data = new FormData(); data.set("file", file); data.set("kind", kind);
  if (product) data.set("product", product);
  return (await storeRequest<{ path: string }>("/api/stores/owner/media", data)).path;
}
