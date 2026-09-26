import type Stripe from "stripe";

export type OrderRefundRow = {
  id: string; amountMinor: number; createdAt: number; requestId: string | null;
  status: "pending" | "requires_action" | "succeeded" | "failed" | "canceled";
  balanceTransactionId: string | null; failureBalanceTransactionId: string | null;
  failureReason: string | null; pendingReason: string | null;
};
export type OrderRefundInventory = {
  complete: boolean; rows: OrderRefundRow[]; succeededMinor: number;
  pendingMinor: number; failedMinor: number; canceledMinor: number;
  reviewReasons: string[];
};
export class OrderRefundEvidenceError extends Error {
  constructor(code: string) { super(code); this.name = "OrderRefundEvidenceError"; }
}
function requireValue(value: unknown): asserts value {
  if (!value) throw new OrderRefundEvidenceError("order_refund_evidence_invalid");
}
function record(value: unknown): Record<string, unknown> {
  requireValue(value !== null && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}
function reference(value: unknown, prefix: string): string {
  requireValue(typeof value === "string" && value.length <= 255 && new RegExp(`^${prefix}_[A-Za-z0-9]+$`).test(value));
  return value;
}
function optionalReference(value: unknown): string | null { return value == null ? null : reference(value, "txn"); }
function reason(value: unknown): string | null {
  if (value == null) return null;
  requireValue(typeof value === "string" && /^[a-z_]{1,80}$/.test(value)); return value;
}
const statuses = ["pending", "requires_action", "succeeded", "failed", "canceled"] as const;

// Internal component of the checkout verifier, NOT independent payment proof.
// The caller verifies platform/account/mode and surrounds this bounded scan with
// repeated charge/intent/session observations. Every request uses that same scope.
// Refund V1 has no livemode; never fabricate it or trust metadata for ownership.
export async function readOrderRefundInventory(stripe: Stripe, input: {
  connectedAccountId: string; chargeId: string; paymentIntentId: string;
  currency: "usd"; capturedMinor: number; chargeRefundedMinor: number; chargeCreatedAt: number;
}, read: <T>(fn: () => Promise<T>) => Promise<T>, clock: () => number): Promise<OrderRefundInventory> {
  reference(input.connectedAccountId, "acct"); reference(input.chargeId, "ch"); reference(input.paymentIntentId, "pi");
  requireValue(input.currency === "usd" && Number.isSafeInteger(input.capturedMinor) && input.capturedMinor >= 0 &&
    input.capturedMinor <= 99_999_999 && Number.isSafeInteger(input.chargeRefundedMinor) &&
    input.chargeRefundedMinor >= 0 && input.chargeRefundedMinor <= input.capturedMinor &&
    Number.isSafeInteger(input.chargeCreatedAt) && input.chargeCreatedAt >= 0);
  const rows: OrderRefundRow[] = [], seen = new Set<string>();
  let complete = false, cursor: string | undefined;
  for (let page = 0; page < 5; page++) {
    const list = await read(() => stripe.refunds.list({ charge: input.chargeId, limit: 100,
      ...(cursor ? { starting_after: cursor } : {}) }, { stripeAccount: input.connectedAccountId }));
    requireValue(list.object === "list" && Array.isArray(list.data) && list.data.length <= 100 &&
      typeof list.has_more === "boolean" && (!list.has_more || list.data.length > 0));
    for (const raw of list.data) {
      const r = record(raw), id = reference(r.id, "re"), now = clock();
      requireValue(!seen.has(id) && r.object === "refund" && r.charge === input.chargeId &&
        r.payment_intent === input.paymentIntentId && r.currency === input.currency &&
        Number.isSafeInteger(r.amount) && (r.amount as number) > 0 && (r.amount as number) <= input.capturedMinor &&
        Number.isSafeInteger(now) && Number.isSafeInteger(r.created) &&
        (r.created as number) >= input.chargeCreatedAt && (r.created as number) <= now &&
        statuses.includes(r.status as typeof statuses[number]) &&
        r.source_transfer_reversal == null && r.transfer_reversal == null);
      seen.add(id);
      const metadata = r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata)
        ? r.metadata as Record<string, unknown> : {};
      const requestId = typeof metadata.grookai_refund_request_id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(metadata.grookai_refund_request_id)
        ? metadata.grookai_refund_request_id.toLowerCase() : null;
      rows.push({ id, amountMinor: r.amount as number, createdAt: r.created as number,
        requestId,
        status: r.status as OrderRefundRow["status"], balanceTransactionId: optionalReference(r.balance_transaction),
        failureBalanceTransactionId: optionalReference(r.failure_balance_transaction),
        failureReason: reason(r.failure_reason), pendingReason: reason(r.pending_reason) });
    }
    if (!list.has_more) { complete = true; break; }
    cursor = rows.at(-1)!.id;
  }
  // Canonical order prevents incidental provider ordering from changing evidence.
  rows.sort((a, b) => a.id.localeCompare(b.id));
  const sum = (...states: OrderRefundRow["status"][]) => rows.reduce((n, r) => n + (states.includes(r.status) ? r.amountMinor : 0), 0);
  const succeededMinor = sum("succeeded"), pendingMinor = sum("pending", "requires_action"),
    failedMinor = sum("failed"), canceledMinor = sum("canceled");
  const reviewReasons: string[] = [];
  if (rows.length || input.chargeRefundedMinor) reviewReasons.push("refund_requires_reconciliation");
  if (!complete) reviewReasons.push("refund_inventory_incomplete");
  if (rows.some(r => r.status === "pending")) reviewReasons.push("refund_pending");
  if (rows.some(r => r.status === "requires_action")) reviewReasons.push("refund_action_required");
  if (failedMinor) reviewReasons.push("refund_failed");
  // Pending funds are not successful refunds. Charge aggregates may reflect a
  // refund still processing; mismatches are review evidence, never more capacity.
  if (succeededMinor + pendingMinor > input.capturedMinor ||
      (complete && (input.chargeRefundedMinor < succeededMinor || input.chargeRefundedMinor > succeededMinor + pendingMinor)))
    reviewReasons.push("refund_amount_mismatch");
  return { complete, rows, succeededMinor, pendingMinor, failedMinor, canceledMinor, reviewReasons };
}
