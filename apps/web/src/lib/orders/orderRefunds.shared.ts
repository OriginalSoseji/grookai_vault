import { acquisitionUuid } from "./orderAcquisitionTypes.ts";
export type RefundState = "unbound" | "pending" | "requires_action" | "succeeded" | "failed" | "canceled";
export type RefundRequestView = { requestId: string; amountMinor: number; reason: "requested_by_customer" | "duplicate"; status: RefundState; createdAt: string; checkedAt: string | null };
export type RefundStatus = { orderId: string; role: "seller" | "buyer"; canRequest: boolean; totalAmountMinor: number; currency: "usd";
  succeededMinor: number; pendingMinor: number; checkedAt: string | null; uncertain: boolean; requests: RefundRequestView[] };
export type RefundAction = { action: "preview"; orderId: string } | { action: "review"; orderId: string } | { action: "refresh"; orderId: string; requestId: string } |
  { action: "create"; orderId: string; requestId: string; amountMinor: number; reason: "requested_by_customer" | "duplicate" };
export const refundLabels: Record<RefundState, string> = { unbound: "Checking outcome", pending: "Refund pending", requires_action: "Refund needs attention", succeeded: "Refund sent", failed: "Refund failed", canceled: "Refund canceled" };
const fail = () => new Error("Refund information is unavailable.");
const id = (v: unknown): v is string => typeof v === "string" && acquisitionUuid.test(v);
const requestId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const amount = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= 99_999_999;
const time = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
const record = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== "object" || Array.isArray(v)) throw fail(); return v as Record<string, unknown>; };
export function refundAction(value: unknown): RefundAction {
  const v = record(value), keys = Object.keys(v).sort().join(",");
  if (!id(v.orderId)) throw fail();
  if ((v.action === "preview" || v.action === "review") && keys === "action,orderId") return { action: v.action, orderId: v.orderId };
  if (!requestId(v.requestId)) throw fail();
  if (v.action === "refresh" && keys === "action,orderId,requestId") return { action: v.action, orderId: v.orderId, requestId: v.requestId };
  if (v.action !== "create" || keys !== "action,amountMinor,orderId,reason,requestId" || !amount(v.amountMinor) || v.amountMinor === 0 ||
    (v.reason !== "requested_by_customer" && v.reason !== "duplicate")) throw fail();
  return { action: v.action, orderId: v.orderId, requestId: v.requestId, amountMinor: v.amountMinor, reason: v.reason };
}
export function refundStatus(value: unknown): RefundStatus | null {
  if (value === null) return null;
  const v = record(value);
  if (v.schema !== "VENDOR_ORDER_REFUNDS_V1" || !id(v.orderId) || (v.role !== "seller" && v.role !== "buyer") ||
    typeof v.canRequest !== "boolean" || v.canRequest && v.role !== "seller" || typeof v.uncertain !== "boolean" || v.canRequest && v.uncertain ||
    !amount(v.totalAmountMinor) || v.totalAmountMinor === 0 || v.currency !== "usd" || !amount(v.succeededMinor) || !amount(v.pendingMinor) ||
    v.succeededMinor + v.pendingMinor > v.totalAmountMinor || (v.checkedAt !== null && !time(v.checkedAt)) ||
    !Array.isArray(v.requests) || v.requests.length > 20) throw fail();
  const seen = new Set<string>();
  const requests = v.requests.map((raw): RefundRequestView => {
    const r = record(raw);
    if (!requestId(r.requestId) || seen.has(r.requestId) || !amount(r.amountMinor) || r.amountMinor === 0 || r.amountMinor > Number(v.totalAmountMinor) ||
      (r.reason !== "requested_by_customer" && r.reason !== "duplicate") || typeof r.status !== "string" || !Object.hasOwn(refundLabels, r.status) ||
      !time(r.createdAt) || (r.checkedAt !== null && !time(r.checkedAt))) throw fail();
    seen.add(r.requestId);
    return { requestId: r.requestId, amountMinor: r.amountMinor, reason: r.reason, status: r.status as RefundState, createdAt: r.createdAt, checkedAt: r.checkedAt as string | null };
  });
  return { orderId: v.orderId, role: v.role, canRequest: v.canRequest, totalAmountMinor: v.totalAmountMinor, currency: v.currency,
    succeededMinor: v.succeededMinor, pendingMinor: v.pendingMinor, checkedAt: v.checkedAt as string | null, uncertain: v.uncertain, requests };
}
export function refundAmountInput(text: string): number | null {
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split("."), value = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return amount(value) && value > 0 ? value : null;
}
