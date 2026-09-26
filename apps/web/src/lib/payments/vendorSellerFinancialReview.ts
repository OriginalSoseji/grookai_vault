import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { assertSellerBinding } from "./vendorSellerPolicy.ts";
import type { SellerBinding } from "./vendorSellerPolicy.ts";
import type { SellerStripeConfig } from "./vendorSellerStripeGateway.ts";
import { SellerError } from "./vendorSellerRepository.ts";

export function sellerReviewHash(value: unknown): string {
  function canonical(v: unknown): string {
    if (v === undefined) throw new SellerError("seller_review_invalid");
    if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
    if (v !== null && typeof v === "object") return `{${Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => `${JSON.stringify(k)}:${canonical(x)}`).join(",")}}`;
    if (typeof v === "number" && !Number.isFinite(v)) throw new SellerError("seller_review_invalid");
    return JSON.stringify(v);
  }
  return createHash("sha256").update(canonical(value)).digest("hex");
}
function requireEvidence(value: unknown): asserts value {
  if (!value) throw new SellerError("seller_financial_evidence_invalid");
}
function record(value: unknown): Record<string, unknown> {
  requireEvidence(value && typeof value === "object" && !Array.isArray(value)); return value as Record<string, unknown>;
}
function amount(value: unknown): number { requireEvidence(Number.isSafeInteger(value)); return value as number; }
function currency(value: unknown): string { requireEvidence(typeof value === "string" && /^[a-z]{3}$/.test(value)); return value as string; }
function reference(value: unknown, prefix: string): string | null {
  if (value === null) return null;
  requireEvidence(typeof value === "string" && new RegExp(`^${prefix}_[A-Za-z0-9]+$`).test(value)); return value as string;
}
function balanceEvidence(value: unknown, mode: boolean) {
  const b = record(value); requireEvidence(b.object === "balance" && b.livemode === mode);
  let nonzero = false;
  function source(value: unknown) {
    if (value === undefined) return null;
    const s = record(value); requireEvidence(Object.keys(s).length <= 20);
    for (const [k, v] of Object.entries(s)) { requireEvidence(/^[a-z_]+$/.test(k)); if (amount(v) !== 0) nonzero = true; }
    return s;
  }
  function rows(value: unknown, optional = false) {
    if (optional && (value === undefined || value === null)) return null;
    requireEvidence(Array.isArray(value) && value.length <= 100);
    const seen = new Set<string>();
    return value.map(raw => {
      const r = record(raw), c = currency(r.currency), n = amount(r.amount);
      requireEvidence(!seen.has(c)); seen.add(c); if (n !== 0) nonzero = true;
      // Instant payout destination details are unnecessary PII. The total/source
      // balances are evidence; their absence never establishes deletion clearance.
      return { currency: c, amount: n, source: source(r.source_types) };
    }).sort((a, b) => a.currency.localeCompare(b.currency));
  }
  const issuing = b.issuing == null ? null : record(b.issuing), prefunding = b.refund_and_dispute_prefunding == null ? null : record(b.refund_and_dispute_prefunding);
  const evidence = { available: rows(b.available), pending: rows(b.pending), reserved: rows(b.connect_reserved, true),
    instant: rows(b.instant_available, true), issuing: issuing ? rows(issuing.available) : null,
    prefunding: prefunding ? { available: rows(prefunding.available), pending: rows(prefunding.pending) } : null };
  return { evidence, nonzero };
}
const specs = {
  paymentIntents: { object: "payment_intent", prefix: "pi", statuses: ["requires_payment_method", "requires_confirmation", "requires_action", "processing", "requires_capture", "canceled", "succeeded"], terminal: ["canceled", "succeeded"] },
  refunds: { object: "refund", prefix: "re", statuses: ["pending", "requires_action", "succeeded", "failed", "canceled"], terminal: ["succeeded", "canceled"] },
  disputes: { object: "dispute", prefix: "du", statuses: ["warning_needs_response", "warning_under_review", "warning_closed", "needs_response", "under_review", "won", "lost", "prevented"], terminal: ["warning_closed", "won", "lost", "prevented"] },
  payouts: { object: "payout", prefix: "po", statuses: ["pending", "in_transit", "paid", "failed", "canceled"], terminal: ["paid", "canceled"] },
  checkouts: { object: "checkout.session", prefix: "cs", statuses: ["open", "complete", "expired"], terminal: ["complete", "expired"] },
  charges: { object: "charge", prefix: "ch", statuses: ["succeeded", "pending", "failed"], terminal: ["succeeded", "failed"] },
} as const;
type Kind = keyof typeof specs;
export type SellerFinancialReview = { version: "vendor-seller-financial-review-v1"; checkedAt: number;
  deletionPermitted: false; completeLists: boolean; nonzeroBalance: boolean;
  counts: Record<Kind, { observed: number; needsReview: number; complete: boolean }>;
  reviewReasons: string[]; evidenceHash: string };

// Private, read-only, bounded exposure inventory. No result authorizes deletion,
// disconnect, refunds, payouts, cancellation or balance movement. The connected
// account can have activity outside Grookai; never mutate those resources here.
export async function readSellerFinancialReview(stripe: Stripe, config: SellerStripeConfig,
  binding: SellerBinding, ownerId: string, clock: () => number = () => Math.floor(Date.now() / 1000)): Promise<SellerFinancialReview> {
  assertSellerBinding(binding, config.scope, ownerId);
  const start = clock(); requireEvidence(Number.isSafeInteger(start) && start >= 0);
  const checkTime = () => { const t = clock(); if (!Number.isSafeInteger(t) || t < start || t - start >= 60) throw new SellerError("seller_financial_review_expired"); };
  async function read<T>(fn: () => Promise<T>): Promise<T> {
    checkTime(); let value: T;
    try { value = await fn(); } catch { throw new SellerError("seller_financial_provider_unavailable"); }
    checkTime(); return value;
  }
  const platform = await read(() => stripe.accounts.retrieve(null));
  requireEvidence(platform.object === "account" && platform.id === config.scope.accountId);
  const pb = await read(() => stripe.balance.retrieve()); requireEvidence(pb.object === "balance" && pb.livemode === config.scope.livemode);
  const account = await read(() => stripe.accounts.retrieve(binding.connectedAccountId)), c = account.controller;
  requireEvidence(account.object === "account" && account.id === binding.connectedAccountId &&
    c?.type === "application" && c.is_controller === true && c.fees?.payer === binding.controller.feesPayer &&
    c.losses?.payments === binding.controller.paymentLosses && c.requirement_collection === binding.controller.requirementCollection && c.stripe_dashboard?.type === binding.controller.dashboard);
  const options = { stripeAccount: binding.connectedAccountId }, before = balanceEvidence(await read(() => stripe.balance.retrieve({}, options)), config.scope.livemode);
  const readers = {
    paymentIntents: (p: Stripe.PaymentIntentListParams) => stripe.paymentIntents.list(p, options),
    refunds: (p: Stripe.RefundListParams) => stripe.refunds.list(p, options),
    disputes: (p: Stripe.DisputeListParams) => stripe.disputes.list(p, options),
    payouts: (p: Stripe.PayoutListParams) => stripe.payouts.list(p, options),
    checkouts: (p: Stripe.Checkout.SessionListParams) => stripe.checkout.sessions.list(p, options),
    charges: (p: Stripe.ChargeListParams) => stripe.charges.list(p, options),
  };
  const counts = {} as SellerFinancialReview["counts"], evidence: Record<string, unknown[]> = {};
  const reasons = new Set<string>(["retained_order_ledger_required", "future_claims_require_retention"]);
  for (const kind of Object.keys(specs) as Kind[]) {
    const spec = specs[kind], seen = new Set<string>(), items: Record<string, unknown>[] = []; let cursor: string | undefined, complete = false, needsReview = 0;
    // Up to 500 records per type. A full fifth page explicitly reports incomplete
    // if has_more, never silently equating the first page with all obligations.
    for (let page = 0; page < 5; page++) {
      const result = await read<Stripe.ApiList<{ id: string }>>(() => readers[kind]({ limit: 100, ...(cursor ? { starting_after: cursor } : {}) }));
      requireEvidence(result.object === "list" && Array.isArray(result.data) && result.data.length <= 100 && typeof result.has_more === "boolean" && (!result.has_more || result.data.length > 0));
      for (const raw of result.data) {
        const row = record(raw), id = reference(row.id, spec.prefix);
        requireEvidence(id && row.object === spec.object && !seen.has(id) && Number.isSafeInteger(row.created) && (row.created as number) >= 0 && (row.created as number) <= clock());
        seen.add(id);
        // Refund V1 has no livemode; mode comes from the verified Balance and
        // mandatory connected-account request scope, never an invented field.
        if (kind !== "refunds") requireEvidence(row.livemode === config.scope.livemode);
        requireEvidence(typeof row.status === "string" && (spec.statuses as readonly string[]).includes(row.status));
        let review = !(spec.terminal as readonly string[]).includes(row.status);
        const item: Record<string, unknown> = { id, status: row.status, created: row.created };
        if (kind === "checkouts") {
          requireEvidence(["payment", "subscription", "setup"].includes(row.mode as string) && ["paid", "unpaid", "no_payment_required"].includes(row.payment_status as string));
          item.mode = row.mode; item.paymentStatus = row.payment_status;
          item.amountTotal = row.amount_total === null ? null : amount(row.amount_total);
          item.currency = row.currency === null ? null : currency(row.currency);
          requireEvidence(item.amountTotal === null || (item.amountTotal as number) >= 0);
          if (row.mode !== "setup" && (item.amountTotal === null || item.currency === null)) review = true;
          if (row.status === "complete" && row.payment_status === "unpaid") review = true;
        } else {
          item.amount = amount(row.amount); requireEvidence((item.amount as number) >= 0); item.currency = currency(row.currency);
          if (kind === "paymentIntents") {
            item.received = amount(row.amount_received); item.capturable = amount(row.amount_capturable);
            requireEvidence((item.received as number) >= 0 && (item.capturable as number) >= 0);
            if ((item.capturable as number) > 0) review = true;
          }
          if (kind === "charges") {
            requireEvidence(typeof row.paid === "boolean" && typeof row.captured === "boolean" && typeof row.disputed === "boolean");
            item.paid = row.paid; item.captured = row.captured; item.disputed = row.disputed;
            item.refunded = amount(row.amount_refunded); requireEvidence((item.refunded as number) >= 0 && (item.refunded as number) <= (item.amount as number));
            if ((row.paid && !row.captured) || row.disputed) review = true;
          }
          if (kind === "refunds" || kind === "disputes") {
            item.charge = reference(row.charge, "ch"); item.paymentIntent = reference(row.payment_intent, "pi");
            requireEvidence(item.charge || item.paymentIntent);
          }
        }
        if (review) needsReview++; items.push(item);
      }
      if (!result.has_more) { complete = true; break; }
      cursor = result.data[result.data.length - 1].id;
    }
    counts[kind] = { observed: items.length, needsReview, complete };
    evidence[kind] = items.sort((a, b) => (a.id as string).localeCompare(b.id as string));
    if (!complete) reasons.add(`${kind}_inventory_incomplete`); if (needsReview) reasons.add(`${kind}_require_review`);
  }
  const after = balanceEvidence(await read(() => stripe.balance.retrieve({}, options)), config.scope.livemode);
  const nonzero = before.nonzero || after.nonzero;
  if (nonzero) reasons.add("nonzero_balance");
  if (sellerReviewHash(before.evidence) !== sellerReviewHash(after.evidence)) reasons.add("balance_changed_during_review");
  checkTime();
  return { version: "vendor-seller-financial-review-v1", checkedAt: start, deletionPermitted: false,
    completeLists: Object.values(counts).every(v => v.complete), nonzeroBalance: nonzero, counts,
    reviewReasons: [...reasons].sort(), evidenceHash: sellerReviewHash({ binding, before: before.evidence, after: after.evidence, evidence, counts }) };
}
