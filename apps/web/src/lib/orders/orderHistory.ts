import type { SupabaseClient } from "@supabase/supabase-js";

export const ORDER_PAGE_SIZE = 20;
export type OrderRole = "buyer" | "seller";
export type OrderFilters = { status: "all" | "paid" | "unpaid" | "review"; after: string };
export const EMPTY_ORDER_FILTERS: OrderFilters = { status: "all", after: "" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unavailable = () => new Error("Orders could not be loaded. Try again.");
export const validOrderId = (value: string) => uuid.test(value);
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw unavailable();
  return value as Record<string, unknown>;
}
function timestamp(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 19) !== value.slice(0, 19)) throw unavailable();
  return value;
}
export function orderCursor(at: string, id: string) {
  const encoded = Buffer.from(JSON.stringify({ at, id })).toString("base64url");
  decodeOrderCursor(encoded);
  return encoded;
}
export function decodeOrderCursor(value: string): { at: string; id: string } {
  try {
    if (!/^[A-Za-z0-9_-]{1,240}$/.test(value)) throw unavailable();
    const bytes = Buffer.from(value, "base64url");
    if (bytes.toString("base64url") !== value) throw unavailable();
    const c = record(JSON.parse(bytes.toString("utf8")));
    if (Object.keys(c).sort().join(",") !== "at,id" || typeof c.id !== "string" || !uuid.test(c.id)) throw unavailable();
    return { at: timestamp(c.at), id: c.id.toLowerCase() };
  } catch { throw new Error("This order page link is invalid. Start from the newest orders."); }
}
export function orderFilters(raw: Record<string, string | string[] | undefined>): OrderFilters {
  if (Object.keys(raw).some(k => !["status", "after"].includes(k)) || Object.values(raw).some(v => v !== undefined && typeof v !== "string")) throw new Error("Order filters are invalid.");
  const status = raw.status || "all", after = raw.after || "";
  if (typeof status !== "string" || !["all", "paid", "unpaid", "review"].includes(status) || typeof after !== "string") throw new Error("Order filters are invalid.");
  if (after) decodeOrderCursor(after);
  return { status: status as OrderFilters["status"], after };
}
export function ordersHref(role: OrderRole, filters = EMPTY_ORDER_FILTERS) {
  const params = new URLSearchParams();
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.after) params.set("after", filters.after);
  return `${role === "seller" ? "/account/store/orders" : "/account/orders"}${params.size ? `?${params}` : ""}`;
}
export type OrderView = {
  id: string; createdAt: string; title: string; kind: "copy" | "custom";
  condition: string | null; format: "Raw" | "Slab" | null;
  quantity: number; unitAmountMinor: number; shippingAmountMinor: number;
  taxAmountMinor: number; totalAmountMinor: number; currency: "usd";
  fulfillment: "pickup" | "shipping"; paid: boolean; needsReview: boolean;
  stockState: "payment_pending" | "released" | "consumed";
};
export function mapOrder(value: unknown): OrderView {
  const o = record(value), offer = record(o.offer);
  if (typeof o.id !== "string" || !uuid.test(o.id) || offer.schema !== "VENDOR_STOCK_OFFER_V1" || !["copy", "custom"].includes(String(offer.kind))) throw unavailable();
  const title = offer.kind === "copy" ? offer.gvvi : offer.title;
  if (typeof title !== "string" || !title.trim() || title.length > 500 || (offer.kind === "copy" && !/^GVVI-[A-Za-z0-9-]+$/.test(title))) throw unavailable();
  for (const key of ["quantity", "unitAmountMinor", "shippingAmountMinor", "taxAmountMinor"]) {
    if (typeof o[key] !== "number" || !Number.isSafeInteger(o[key]) || Number(o[key]) < 0) throw unavailable();
  }
  const quantity = o.quantity as number, unit = o.unitAmountMinor as number, shipping = o.shippingAmountMinor as number, tax = o.taxAmountMinor as number;
  const total = quantity * unit + shipping + tax;
  if (quantity < 1 || quantity > 100 || unit < 1 || !Number.isSafeInteger(total) || total > 99999999 || o.currency !== "usd" || !["pickup", "shipping"].includes(String(o.fulfillment)) || (o.fulfillment === "pickup" && shipping !== 0)) throw unavailable();
  if (typeof o.paid !== "boolean" || typeof o.needsReview !== "boolean" || !["payment_pending", "released", "consumed"].includes(String(o.stockState))) throw unavailable();
  if (offer.kind === "copy" && (quantity !== 1 || (offer.condition !== null && (typeof offer.condition !== "string" || offer.condition.length > 100)))) throw unavailable();
  // Explicit projection: never spread database objects or provider evidence into UI.
  return { id: o.id.toLowerCase(), createdAt: timestamp(o.createdAt), title, kind: offer.kind as OrderView["kind"],
    condition: offer.kind === "copy" ? offer.condition as string | null : null,
    format: offer.kind === "copy" ? offer.slab_cert_id ? "Slab" : "Raw" : null,
    quantity, unitAmountMinor: unit, shippingAmountMinor: shipping, taxAmountMinor: tax, totalAmountMinor: total,
    currency: "usd", fulfillment: o.fulfillment as OrderView["fulfillment"], paid: o.paid, needsReview: o.needsReview,
    stockState: o.stockState as OrderView["stockState"] };
}
export function orderPresentation(o: OrderView) {
  if (o.needsReview || (o.paid && o.stockState !== "consumed") || (!o.paid && o.stockState === "consumed")) return {
    label: "Needs review", tone: "review", message: "This order needs review before fulfillment. Payment, refund or dispute details may require follow-up." };
  if (o.paid) return { label: "Payment received", tone: "paid", message: "Payment was recorded. This does not confirm shipment, pickup or seller payout." };
  if (o.stockState === "released") return { label: "Payment not completed", tone: "closed", message: "Payment was not completed and the inventory hold was released." };
  return { label: "Payment confirmation pending", tone: "pending", message: "Payment has not been confirmed. Do not pay again while confirmation is pending." };
}
export const orderMoney = (minor: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minor / 100);
export async function readOrder(client: SupabaseClient, id: string): Promise<OrderView | null> {
  if (!validOrderId(id)) return null;
  const { data, error } = await client.rpc("vendor_order_status_v1", { p_order_id: id });
  if (error) throw unavailable();
  if (data === null) return null;
  const view = mapOrder(data);
  if (view.id !== id.toLowerCase()) throw unavailable();
  return view;
}
// Caller supplies an authenticated server client. Admin is created only AFTER
// getUser verifies Auth; its sole query is a bounded participant-scoped ID index.
// Each displayed record still passes the authenticated participant RPC.
export async function readOrderHistory(client: SupabaseClient, getAdmin: () => SupabaseClient, role: OrderRole, filters: OrderFilters) {
  if (!["buyer", "seller"].includes(role)) throw unavailable();
  const normalized = orderFilters(filters);
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user || !uuid.test(user.id)) throw unavailable();
  let query = getAdmin().from("vendor_orders").select("id,created_at").eq(role === "seller" ? "owner_id" : "buyer_id", user.id);
  if (normalized.status === "paid" || normalized.status === "unpaid") query = query.eq("paid", normalized.status === "paid");
  if (normalized.status === "review") query = query.not("review_reasons", "eq", "{}");
  if (normalized.after) {
    const c = decodeOrderCursor(normalized.after);
    query = query.or(`created_at.lt.${c.at},and(created_at.eq.${c.at},id.lt.${c.id})`);
  }
  const { data, error } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(ORDER_PAGE_SIZE + 1);
  if (error || !Array.isArray(data) || data.length > ORDER_PAGE_SIZE + 1) throw unavailable();
  const rows = data.map(row => { const r = record(row); if (typeof r.id !== "string" || !uuid.test(r.id)) throw unavailable(); return { id: r.id, at: timestamp(r.created_at) }; });
  if (new Set(rows.map(r => r.id)).size !== rows.length) throw unavailable();
  // Authorize the lookahead too: an inaccessible row cannot leak even a page count.
  const views = await Promise.all(rows.map(r => readOrder(client, r.id)));
  if (views.some(v => v === null)) throw unavailable();
  const items = (views as OrderView[]).slice(0, ORDER_PAGE_SIZE), last = rows[ORDER_PAGE_SIZE - 1];
  return { items, next: rows.length > ORDER_PAGE_SIZE ? orderCursor(last.at, last.id) : null };
}
