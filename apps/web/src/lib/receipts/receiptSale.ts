import type { SupabaseClient } from "@supabase/supabase-js";
import { DISPOSITION_COLUMNS, mapDispositionReceipt, type DispositionRow } from "../vault/vaultDisposition.ts";

export function receiptSaleId(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : null;
}

export function receiptDestination(cloud: boolean, sale?: unknown): string {
  const path = cloud ? "/account/store/receipts/cloud" : "/account/store/receipts";
  if (sale === undefined) return path;
  const id = receiptSaleId(sale);
  if (!id) throw new Error("This recorded-sale link is invalid.");
  return `${path}?sale=${id}`;
}

export async function readReceiptSale(client: SupabaseClient, ownerId: string, sale: unknown) {
  if (sale === undefined) return null;
  const id = receiptSaleId(sale);
  if (!id) throw new Error("This recorded-sale link is invalid.");
  const { data, error } = await client.from("vault_item_instance_dispositions")
    .select(DISPOSITION_COLUMNS).eq("id", id).eq("user_id", ownerId).maybeSingle();
  if (error || !data) throw new Error("This recorded sale is unavailable for your account.");
  const record = mapDispositionReceipt(data as DispositionRow);
  if (record.type !== "sale" || record.saleCurrency !== "USD" || record.salePrice === null ||
      !Number.isFinite(record.salePrice) || record.salePrice <= 0 || record.salePrice > 1000000) {
    throw new Error("This receipt desk supports completed USD sales up to $1,000,000.");
  }
  const source = await client.rpc("vendor_sales_cart_source_v1", { p_disposition_id: record.id });
  // Compatibility while the additive cart migration is not released. Other
  // failures must not offer a new receipt for an already-recorded cart sale.
  if (source.error && source.error.code !== "PGRST202") throw new Error("Could not load this sale's receipt. Please retry.");
  return { description: record.gvviId, price: record.salePrice.toFixed(2),
    customerName: record.counterparty || "", sourceDispositionId: receiptSaleId(source.data) || record.id };
}
