import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SELLER_CONTROLLER } from "../payments/vendorSellerEnrollment.ts";
import { ACQUISITION_POLICY, acquisitionUuid as uuid, purchaseSelection } from "./orderAcquisitionTypes.ts";
import type { QuoteRequest, PurchaseQuote, OrderCreated } from "./orderAcquisitionTypes.ts";
import type { AcquisitionConfig } from "./orderAcquisitionPolicy.ts";

export class AcquisitionError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; this.name = "AcquisitionError"; }
}
type Reservation = { id: string; buyer_id: string; owner_id: string; store_id: string; seller_id: string;
  instance_id: string | null; product_id: string | null; quantity: number; offer: Record<string, unknown>;
  state: string; created_at: string; expires_at: string };
type SavedOrder = { id: string; buyer_id: string; reservation_id: string; quote_reference: string; fulfillment: string;
  unit_amount_minor: number; quantity: number; shipping_amount_minor: number; tax_amount_minor: number; currency: string };
type Seller = { id: string; owner_id: string; store_id: string; stripe_account_id: string; livemode: boolean;
  controller: Record<string, unknown>; state: string; closeout_id: string | null };
export interface AcquisitionRepository {
  reserve(id: string, buyer: string, selection: QuoteRequest): Promise<Reservation>;
  reservation(id: string, buyer: string): Promise<Reservation | null>;
  existing(id: string, buyer: string): Promise<SavedOrder | null>;
  seller(id: string): Promise<Seller | null>;
  create(r: Reservation, ids: ReturnType<typeof acquisitionIds>): Promise<SavedOrder>;
  release(id: string, buyer: string): Promise<unknown>;
}
// IDs survive HTTP retry, response loss and signing-secret rotation. UUID input
// is a request anchor, never authority: SQL rechecks its buyer and exact selection.
export function acquisitionIds(buyer: string, request: string) {
  const id = (purpose: string) => { const h = createHash("sha256").update(`grookai-order-acquisition-v1:${purpose}:${buyer}:${request}`).digest("hex");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`; };
  return { reservation: id("reservation"), order: id("order"), attempt: id("attempt"), quote: id("quote") };
}
function requireValue(ok: unknown, code = "quote_unavailable"): asserts ok { if (!ok) throw new AcquisitionError(code); }
const offerHash = (r: Reservation) => createHash("sha256").update(JSON.stringify(Object.entries(r.offer).sort(([a], [b]) => a.localeCompare(b)))).digest("hex");
function snapshot(r: Reservation, buyer: string) {
  requireValue(r && uuid.test(r.id) && r.buyer_id === buyer && uuid.test(r.owner_id) && r.owner_id !== buyer && uuid.test(r.store_id) && uuid.test(r.seller_id));
  requireValue(r.offer && r.offer.schema === "VENDOR_STOCK_OFFER_V1" && r.offer.currency === "USD");
  requireValue(Number.isInteger(r.quantity) && r.quantity >= 1 && r.quantity <= 100);
  const price = String(r.offer.unit_amount);
  requireValue(typeof r.offer.unit_amount === "number" && /^\d+(?:\.\d{1,2})?$/.test(price));
  const [whole, cents = ""] = price.split(".");
  const minor = Number(BigInt(whole) * 100n + BigInt(cents.padEnd(2, "0"))), total = minor * r.quantity;
  requireValue(Number.isSafeInteger(minor) && minor > 0 && Number.isSafeInteger(total) && total <= 99999999);
  const copy = r.offer.kind === "copy", title = copy ? r.offer.gvvi : r.offer.title;
  requireValue(copy ? r.quantity === 1 && typeof r.instance_id === "string" && uuid.test(r.instance_id) && r.product_id === null && r.offer.instance_id === r.instance_id :
    r.offer.kind === "custom" && r.instance_id === null && typeof r.product_id === "string" && uuid.test(r.product_id) && r.offer.product_id === r.product_id);
  requireValue(typeof title === "string" && title.trim().length > 0 && title.length <= 500);
  const created = Date.parse(r.created_at), expiresAt = Date.parse(r.expires_at);
  requireValue(Number.isSafeInteger(created) && Number.isSafeInteger(expiresAt) && expiresAt > created && expiresAt - created <= 120000);
  return { title, quantity: r.quantity, unitAmountMinor: minor, totalAmountMinor: total, expiresAt };
}
export function createAcquisitionService(repo: AcquisitionRepository, config: AcquisitionConfig, now = () => Date.now()) {
  requireValue(/^[a-f0-9]{64}$/.test(config.secret) && /^acct_[A-Za-z0-9]{1,250}$/.test(config.platformAccountId));
  const mac = (payload: string) => createHmac("sha256", Buffer.from(config.secret, "hex")).update(`order-quote-v1.${payload}`).digest();
  const sign = (r: Reservation, buyer: string, request: string) => {
    const payload = Buffer.from(JSON.stringify({ v: ACQUISITION_POLICY, buyer, request, reservation: r.id, offer: offerHash(r), expires: Date.parse(r.expires_at) })).toString("base64url");
    return `${payload}.${mac(payload).toString("base64url")}`;
  };
  async function tokenReservation(token: string, buyer: string) {
    requireValue(typeof token === "string" && token.length <= 2048, "quote_invalid");
    const parts = token.split(".");requireValue(parts.length === 2 && parts.every(p => /^[A-Za-z0-9_-]+$/.test(p)), "quote_invalid");
    const supplied = Buffer.from(parts[1], "base64url");
    requireValue(supplied.length === 32 && supplied.toString("base64url") === parts[1] && timingSafeEqual(supplied, mac(parts[0])), "quote_invalid");
    let c; try { c = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")); } catch { throw new AcquisitionError("quote_invalid"); }
    requireValue(c && c.v === ACQUISITION_POLICY && c.buyer === buyer && uuid.test(c.request) && uuid.test(buyer), "quote_invalid");
    const ids = acquisitionIds(buyer, c.request);requireValue(ids.reservation === c.reservation, "quote_invalid");
    const r = await repo.reservation(c.reservation, buyer);requireValue(r, "quote_invalid");
    const view = snapshot(r, buyer);requireValue(r.id === ids.reservation && offerHash(r) === c.offer && view.expiresAt === c.expires, "quote_invalid");
    return { r, ids, view };
  }
  function ordered(o: SavedOrder, r: Reservation, ids: ReturnType<typeof acquisitionIds>): OrderCreated {
    const v = snapshot(r, r.buyer_id);
    requireValue(o.id === ids.order && o.buyer_id === r.buyer_id && o.reservation_id === r.id && o.quote_reference === ids.quote &&
      o.quantity === v.quantity && o.unit_amount_minor === v.unitAmountMinor && o.shipping_amount_minor === 0 && o.tax_amount_minor === 0 && o.fulfillment === "pickup" && o.currency === "usd");
    return { state: "ordered", orderId: o.id };
  }
  async function seller(r: Reservation) {
    const s = await repo.seller(r.seller_id);
    requireValue(s && s.id === r.seller_id && s.owner_id === r.owner_id && s.store_id === r.store_id && s.stripe_account_id === config.platformAccountId && s.livemode === false &&
      s.state === "bound" && s.closeout_id === null && s.controller && Object.keys(s.controller).length === 4 &&
      Object.entries(SELLER_CONTROLLER).every(([k, v]) => s.controller[k] === v));
  }
  return {
    async quote(buyer: string, request: QuoteRequest): Promise<PurchaseQuote | OrderCreated> {
      requireValue(uuid.test(buyer) && uuid.test(request.requestId), "quote_invalid");purchaseSelection(request);
      const ids = acquisitionIds(buyer, request.requestId), r = await repo.reserve(ids.reservation, buyer, request), view = snapshot(r, buyer);
      requireValue(r.id === ids.reservation && r.store_id === request.storeId && r.quantity === request.quantity &&
        (request.kind === "copy" ? r.instance_id : r.product_id) === request.itemId);
      const existing = await repo.existing(r.id, buyer);if (existing) return ordered(existing, r, ids);
      requireValue(r.state === "held" && view.expiresAt > now(), "quote_expired");await seller(r);
      return { state: "quoted", token: sign(r, buyer, request.requestId), ...view, shippingAmountMinor: 0, taxAmountMinor: 0, currency: "usd", fulfillment: "pickup" };
    },
    async confirm(buyer: string, token: string): Promise<OrderCreated> {
      const { r, ids, view } = await tokenReservation(token, buyer);
      const existing = await repo.existing(r.id, buyer);
      if (existing) return ordered(existing, r, ids); // Known outcome recovery, even after quote expiry/downgrade.
      requireValue(r.state === "held" && view.expiresAt > now(), "quote_expired");await seller(r);
      // SQL atomically rechecks current publication/privacy/eligibility/expiry,
      // promotes the hold and creates exactly one immutable order/attempt.
      return ordered(await repo.create(r, ids), r, ids);
    },
    async cancel(buyer: string, token: string): Promise<OrderCreated | { state: "released" }> {
      const { r, ids } = await tokenReservation(token, buyer), existing = await repo.existing(r.id, buyer);
      if (existing) return ordered(existing, r, ids);
      await repo.release(r.id, buyer);return { state: "released" }; // SQL refuses payment_pending/consumed.
    },
  };
}
export function createAcquisitionRepository(admin: SupabaseClient): AcquisitionRepository {
  const orderColumns = "id,buyer_id,reservation_id,quote_reference,fulfillment,unit_amount_minor,quantity,shipping_amount_minor,tax_amount_minor,currency";
  async function rpc<T>(name: string, params: Record<string, unknown>): Promise<T> { const { data, error } = await admin.rpc(name, params);if (error) throw new AcquisitionError(/^(stock|order)_[a-z_]+$/.test(error.message ?? "") ? error.message : "quote_unavailable");return data as T; }
  return {
    reserve: (id, buyer, s) => rpc("vendor_stock_reserve_v1", { p_id: id, p_buyer_id: buyer, p_store_id: s.storeId, p_instance_id: s.kind === "copy" ? s.itemId : null, p_product_id: s.kind === "custom" ? s.itemId : null, p_quantity: s.quantity }),
    async reservation(id, buyer) { const { data, error } = await admin.from("vendor_stock_reservations").select("id,buyer_id,owner_id,store_id,seller_id,instance_id,product_id,quantity,offer,state,created_at,expires_at").eq("id", id).eq("buyer_id", buyer).maybeSingle();if (error) throw new AcquisitionError("quote_unavailable");return data; },
    async existing(id, buyer) { const { data, error } = await admin.from("vendor_orders").select(orderColumns).eq("reservation_id", id).eq("buyer_id", buyer).maybeSingle();if (error) throw new AcquisitionError("quote_unavailable");return data; },
    async seller(id) { const { data, error } = await admin.from("vendor_seller_accounts").select("id,owner_id,store_id,stripe_account_id,livemode,controller,state,closeout_id").eq("id", id).maybeSingle();if (error) throw new AcquisitionError("quote_unavailable");return data; },
    create: (r, ids) => rpc("vendor_order_create_v1", { p_id: ids.order, p_attempt_id: ids.attempt, p_reservation_id: r.id, p_buyer_id: r.buyer_id, p_quote_reference: ids.quote, p_fulfillment: "pickup", p_shipping: 0, p_tax: 0 }),
    release: (id, buyer) => rpc("vendor_stock_release_v1", { p_id: id, p_buyer_id: buyer }),
  };
}
