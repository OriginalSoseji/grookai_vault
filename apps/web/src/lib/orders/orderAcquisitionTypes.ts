export const ACQUISITION_POLICY = "local-synthetic-pickup-v1";
export const acquisitionUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export type PurchaseSelection = { storeId: string; itemId: string; kind: "copy" | "custom"; quantity: number };
export type QuoteRequest = PurchaseSelection & { requestId: string };
export type PurchaseQuote = { state: "quoted"; token: string; title: string; quantity: number; unitAmountMinor: number;
  shippingAmountMinor: number; taxAmountMinor: number; totalAmountMinor: number; currency: "usd"; fulfillment: "pickup"; expiresAt: number };
export type OrderCreated = { state: "ordered"; orderId: string };
export function purchaseSelection(value: Record<string, unknown>): PurchaseSelection {
  if (typeof value.storeId !== "string" || !acquisitionUuid.test(value.storeId) || typeof value.itemId !== "string" || !acquisitionUuid.test(value.itemId) ||
    typeof value.kind !== "string" || !["copy", "custom"].includes(value.kind) || !Number.isInteger(value.quantity) || Number(value.quantity) < 1 || Number(value.quantity) > 100 || value.kind === "copy" && value.quantity !== 1)
    throw new Error("Invalid purchase selection.");
  return { storeId: value.storeId, itemId: value.itemId, kind: value.kind as PurchaseSelection["kind"], quantity: value.quantity as number };
}
export function purchaseHref(s: PurchaseSelection, requestId?: string) {
  const q = new URLSearchParams({ store: s.storeId, item: s.itemId, kind: s.kind, quantity: String(s.quantity) });
  if (requestId) q.set("request", requestId);
  return `/account/orders/new?${q}`;
}
