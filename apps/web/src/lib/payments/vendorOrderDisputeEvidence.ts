import type Stripe from "stripe";

export type OrderDisputeRow = {
  id: string; amountMinor: number; currency: string; createdAt: number;
  status: "warning_needs_response" | "warning_under_review" | "warning_closed" | "needs_response" | "under_review" | "won" | "lost" | "prevented";
  reason: string; dueBy: number | null; hasEvidence: boolean; pastDue: boolean;
  submissionCount: number; chargeRefundable: boolean; balanceTransactionIds: string[];
};
export type OrderDisputeInventory = { complete: boolean; rows: OrderDisputeRow[]; reviewReasons: string[] };
export class OrderDisputeEvidenceError extends Error {
  constructor() { super("order_dispute_evidence_invalid"); this.name = "OrderDisputeEvidenceError"; }
}
function requireValue(value: unknown): asserts value { if (!value) throw new OrderDisputeEvidenceError(); }
function record(value: unknown): Record<string, unknown> {
  requireValue(value !== null && typeof value === "object" && !Array.isArray(value)); return value as Record<string, unknown>;
}
function ref(value: unknown, prefix: string): string {
  requireValue(typeof value === "string" && value.length <= 255 && new RegExp(`^${prefix}_[A-Za-z0-9]+$`).test(value)); return value;
}
function integer(value: unknown, minimum = 0): number {
  requireValue(Number.isSafeInteger(value) && (value as number) >= minimum); return value as number;
}
const statuses = ["warning_needs_response", "warning_under_review", "warning_closed", "needs_response", "under_review", "won", "lost", "prevented"] as const;

// Internal observation, not independent payment or clearance proof. The checkout
// verifier checks platform/mode and repeats this charge-scoped scan before sealing.
export async function readOrderDisputeInventory(stripe: Stripe, input: {
  connectedAccountId: string; chargeId: string; paymentIntentId: string; livemode: boolean;
  chargeCreatedAt: number; chargeDisputed: boolean;
}, read: <T>(fn: () => Promise<T>) => Promise<T>, clock: () => number): Promise<OrderDisputeInventory> {
  ref(input.connectedAccountId, "acct"); ref(input.chargeId, "ch"); ref(input.paymentIntentId, "pi");
  integer(input.chargeCreatedAt); requireValue(typeof input.livemode === "boolean" && typeof input.chargeDisputed === "boolean");
  const rows: OrderDisputeRow[] = [], seen = new Set<string>(), transactions = new Set<string>();
  let complete = false, cursor: string | undefined;
  for (let page = 0; page < 5; page++) {
    const list = await read(() => stripe.disputes.list({ charge: input.chargeId, limit: 100,
      ...(cursor ? { starting_after: cursor } : {}) }, { stripeAccount: input.connectedAccountId }));
    requireValue(list.object === "list" && Array.isArray(list.data) && list.data.length <= 100 &&
      typeof list.has_more === "boolean" && (!list.has_more || list.data.length > 0));
    for (const raw of list.data) {
      const r = record(raw), id = ref(r.id, "du"), createdAt = integer(r.created), now = integer(clock());
      requireValue(!seen.has(id) && r.object === "dispute" && r.charge === input.chargeId &&
        r.payment_intent === input.paymentIntentId && r.livemode === input.livemode &&
        createdAt >= input.chargeCreatedAt && createdAt <= now && statuses.includes(r.status as OrderDisputeRow["status"]) &&
        typeof r.currency === "string" && /^[a-z]{3}$/.test(r.currency) && typeof r.reason === "string" && /^[a-z_]{1,80}$/.test(r.reason) &&
        typeof r.is_charge_refundable === "boolean");
      // Disputed amount/currency can differ from the charge, including currency
      // conversion. Preserve the provider amount; never cap or infer it.
      const amountMinor = integer(r.amount, 1), detail = record(r.evidence_details);
      const dueBy = detail.due_by === null ? null : integer(detail.due_by);
      requireValue(typeof detail.has_evidence === "boolean" && typeof detail.past_due === "boolean");
      const submissionCount = integer(detail.submission_count);
      requireValue(Array.isArray(r.balance_transactions) && r.balance_transactions.length <= 2);
      const balanceTransactionIds = r.balance_transactions.map(raw => {
        const t = record(raw), id = ref(t.id, "txn"); requireValue(t.object === "balance_transaction" && !transactions.has(id));
        transactions.add(id); return id;
      }).sort();
      seen.add(id); rows.push({ id, amountMinor, currency: r.currency, createdAt,
        status: r.status as OrderDisputeRow["status"], reason: r.reason, dueBy,
        hasEvidence: detail.has_evidence, pastDue: detail.past_due, submissionCount,
        chargeRefundable: r.is_charge_refundable, balanceTransactionIds });
    }
    if (!list.has_more) { complete = true; break; } cursor = rows.at(-1)!.id;
  }
  rows.sort((a, b) => a.id.localeCompare(b.id));
  const reviewReasons: string[] = [];
  if (rows.length || input.chargeDisputed) reviewReasons.push("dispute_requires_reconciliation");
  if (!complete) reviewReasons.push("dispute_inventory_incomplete");
  if (rows.some(r => r.status === "needs_response" || r.status === "warning_needs_response")) reviewReasons.push("dispute_action_required");
  if (rows.some(r => r.status === "lost")) reviewReasons.push("dispute_lost");
  if (complete && input.chargeDisputed && rows.length === 0) reviewReasons.push("dispute_inventory_mismatch");
  // Won/closed/prevented never clear holds, restore stock or establish payouts.
  return { complete, rows, reviewReasons };
}
