import { acquisitionUuid } from "./orderAcquisitionTypes.ts";
export const FULFILLMENT_ACTIONS = ["ready_pickup", "collect", "ship", "update_tracking", "deliver"] as const;
export type FulfillmentAction = typeof FULFILLMENT_ACTIONS[number];
export type FulfillmentState = "unfulfilled" | "ready_pickup" | "collected" | "shipped" | "delivered";
export const CARRIERS = { usps: "USPS", ups: "UPS", fedex: "FedEx", dhl: "DHL", other: "Other carrier" } as const;
export type Carrier = keyof typeof CARRIERS;
export type FulfillmentEvent = { requestId: string; sequence: number; action: FulfillmentAction; state: Exclude<FulfillmentState, "unfulfilled">; carrier: Carrier | null; tracking: string | null; recordedAt: string };
export type FulfillmentStatus = { orderId: string; mode: "pickup" | "shipping"; role: "buyer" | "seller"; canManage: boolean; paymentReady: boolean;
  sequence: number; state: FulfillmentState; carrier: Carrier | null; tracking: string | null; updatedAt: string | null; events: FulfillmentEvent[] };
export type FulfillmentCommand = { orderId: string; requestId: string; expectedSequence: number; action: FulfillmentAction; carrier: Carrier | null; tracking: string | null };
const fail = () => new Error("Fulfillment information is unavailable.");
const record = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== "object" || Array.isArray(v)) throw fail(); return v as Record<string, unknown>; };
const id = (v: unknown): v is string => typeof v === "string" && acquisitionUuid.test(v);
const sequence = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v < Number.MAX_SAFE_INTEGER;
const time = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
const validCarrier = (v: unknown): v is Carrier => typeof v === "string" && Object.hasOwn(CARRIERS, v);
const validTracking = (v: unknown): v is string => typeof v === "string" && v === v.trim() && v.length >= 3 && v.length <= 100 && /^[A-Za-z0-9][A-Za-z0-9 -]*$/.test(v);
function action(v: unknown): v is FulfillmentAction { return FULFILLMENT_ACTIONS.includes(v as FulfillmentAction); }
function state(v: unknown): v is FulfillmentState { return ["unfulfilled", "ready_pickup", "collected", "shipped", "delivered"].includes(v as string); }
function trackingMatches(s: FulfillmentState, carrier: unknown, tracking: unknown) {
  return ["shipped", "delivered"].includes(s) ? validCarrier(carrier) && validTracking(tracking) : carrier === null && tracking === null;
}
export function fulfillmentEvent(value: unknown): FulfillmentEvent {
  const e = record(value);
  if (!id(e.requestId) || !sequence(e.sequence) || e.sequence < 1 || !action(e.action) || !state(e.state) || e.state === "unfulfilled" || !time(e.recordedAt) ||
      !trackingMatches(e.state, e.carrier, e.tracking) || ({ ready_pickup: "ready_pickup", collect: "collected", ship: "shipped", update_tracking: "shipped", deliver: "delivered" }[e.action] !== e.state)) throw fail();
  return { requestId: e.requestId, sequence: e.sequence, action: e.action, state: e.state, carrier: e.carrier as Carrier | null, tracking: e.tracking as string | null, recordedAt: e.recordedAt };
}
export function fulfillmentStatus(value: unknown): FulfillmentStatus | null {
  if (value === null) return null;
  const v = record(value);
  if (v.schema !== "VENDOR_ORDER_FULFILLMENT_V1" || !id(v.orderId) || !["pickup", "shipping"].includes(v.mode as string) || !["buyer", "seller"].includes(v.role as string) ||
      typeof v.canManage !== "boolean" || typeof v.paymentReady !== "boolean" || v.canManage && (v.role !== "seller" || !v.paymentReady) || !sequence(v.sequence) || !state(v.state) ||
      !trackingMatches(v.state, v.carrier, v.tracking) || (v.updatedAt !== null && !time(v.updatedAt)) || !Array.isArray(v.events) || v.events.length !== Math.min(v.sequence, 20)) throw fail();
  const events = v.events.map(fulfillmentEvent), seen = new Set<string>();
  events.forEach((e, index) => { if (e.sequence !== Number(v.sequence) - index || seen.has(e.requestId) ||
    (v.mode === "pickup" ? !["ready_pickup", "collected"].includes(e.state) : !["shipped", "delivered"].includes(e.state))) throw fail(); seen.add(e.requestId); });
  if (v.sequence === 0 ? v.state !== "unfulfilled" || v.updatedAt !== null : events[0].state !== v.state || events[0].recordedAt !== v.updatedAt || events[0].carrier !== v.carrier || events[0].tracking !== v.tracking) throw fail();
  return { orderId: v.orderId, mode: v.mode as "pickup" | "shipping", role: v.role as "buyer" | "seller", canManage: v.canManage, paymentReady: v.paymentReady,
    sequence: v.sequence, state: v.state, carrier: v.carrier as Carrier | null, tracking: v.tracking as string | null, updatedAt: v.updatedAt as string | null, events };
}
export function fulfillmentCommand(value: unknown): FulfillmentCommand {
  const v = record(value);
  if (Object.keys(v).sort().join(",") !== "action,carrier,expectedSequence,orderId,requestId,tracking" || !id(v.orderId) || !id(v.requestId) || !sequence(v.expectedSequence) || !action(v.action)) throw fail();
  if (["ship", "update_tracking"].includes(v.action) ? !validCarrier(v.carrier) || !validTracking(v.tracking) : v.carrier !== null || v.tracking !== null) throw fail();
  return { orderId: v.orderId, requestId: v.requestId, expectedSequence: v.expectedSequence, action: v.action, carrier: v.carrier as Carrier | null, tracking: v.tracking as string | null };
}
export function fulfillmentActions(v: FulfillmentStatus): FulfillmentAction[] {
  if (!v.canManage) return [];
  if (v.mode === "pickup") return v.state === "unfulfilled" ? ["ready_pickup"] : v.state === "ready_pickup" ? ["collect"] : [];
  return v.state === "unfulfilled" ? ["ship"] : v.state === "shipped" ? ["update_tracking", "deliver"] : [];
}
