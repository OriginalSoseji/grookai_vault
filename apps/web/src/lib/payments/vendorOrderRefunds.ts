import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SellerStripeConfig } from "./vendorSellerStripeGateway.ts";
import type { CheckoutOrderBinding, CheckoutEvidence } from "./vendorCheckoutEvidence.ts";
import { assertCheckoutOrderBinding, readVerifiedCheckoutEvidence, requireVerifiedCheckoutRefundInventory,
  requireVerifiedCheckoutDisputeInventory } from "./vendorCheckoutEvidence.ts";

export type RefundCommand = { orderId: string; requestId: string; amountMinor: number; reason: "requested_by_customer" | "duplicate" };
type RefundRequest = {
  id: string; request_version: "v1"; order_id: string; actor_id: string; amount_minor: number; reason: RefundCommand["reason"];
  charge_id: string; payment_intent_id: string; platform_account_id: string; connected_account_id: string; livemode: boolean;
  creation_started_at: string; lease_token: string; lease_fence: number; lease_expires_at: string;
  refund_id: string | null; status: "unbound" | "pending" | "requires_action" | "succeeded" | "failed" | "canceled";
};
type RefundContext = { binding: CheckoutOrderBinding; paid: boolean; requests: RefundRequest[] };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const orderUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class OrderRefundError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.name = "OrderRefundError"; this.code = code; }
}
function requireValue(value: unknown, code = "order_refund_invalid"): asserts value { if (!value) throw new OrderRefundError(code); }
function command(input: RefundCommand) {
  requireValue(input && orderUuid.test(input.orderId) && uuid.test(input.requestId) && Number.isSafeInteger(input.amountMinor) &&
    input.amountMinor > 0 && input.amountMinor <= 99_999_999 && ["requested_by_customer", "duplicate"].includes(input.reason));
}
function project(r: RefundRequest) {
  return { orderId: r.order_id, requestId: r.id, amountMinor: r.amount_minor, status: r.status };
}

// Private service. Actor comes from real Auth; provider identities and original
// request bytes come only from the retained order/command, never a browser form.
export function createOrderRefundService(admin: SupabaseClient, stripe: Stripe, config: SellerStripeConfig,
  options: { enabled?: boolean; now?: () => number } = {}) {
  const now = options.now ?? (() => Math.floor(Date.now() / 1000));
  async function rpc<T>(name: string, params: Record<string, unknown>): Promise<T> {
    const { data, error } = await admin.rpc(name, params);
    if (error) throw new OrderRefundError(/^order_[a-z_]+$/.test(error.message ?? "") ? error.message : "order_refund_storage_unavailable");
    return data as T;
  }
  function request(r: RefundRequest, context: RefundContext): RefundRequest {
    const b = context.binding;
    requireValue(r && uuid.test(r.id) && r.request_version === "v1" && r.order_id === b.orderId && r.actor_id === b.seller.ownerId &&
      Number.isSafeInteger(r.amount_minor) && r.amount_minor > 0 && r.amount_minor <= 99_999_999 &&
      ["requested_by_customer", "duplicate"].includes(r.reason) && r.platform_account_id === config.scope.accountId &&
      r.connected_account_id === b.seller.connectedAccountId && r.livemode === config.scope.livemode &&
      /^ch_[A-Za-z0-9]{1,252}$/.test(r.charge_id) && r.payment_intent_id === b.paymentIntentId &&
      uuid.test(r.lease_token) && Number.isSafeInteger(r.lease_fence) && r.lease_fence > 0 &&
      Number.isFinite(Date.parse(r.creation_started_at)) && Number.isFinite(Date.parse(r.lease_expires_at)) &&
      ["unbound", "pending", "requires_action", "succeeded", "failed", "canceled"].includes(r.status) &&
      (r.refund_id === null ? r.status === "unbound" : /^re_[A-Za-z0-9]{1,252}$/.test(r.refund_id) && r.status !== "unbound"),
    "order_refund_storage_invalid");
    return r;
  }
  async function context(orderId: string, actor: string | null): Promise<RefundContext> {
    requireValue(orderUuid.test(orderId) && (actor === null || orderUuid.test(actor)));
    const c = await rpc<RefundContext | null>("vendor_order_refund_context_v1", { p_order_id: orderId, p_actor_id: actor });
    requireValue(c && c.binding?.orderId === orderId && c.paid === true && Array.isArray(c.requests) && c.requests.length <= 500 &&
      (actor === null || c.binding.seller?.ownerId === actor), "order_refund_unavailable");
    for (const r of c.requests) request(r, c);
    requireValue(new Set(c.requests.map(r => r.id)).size === c.requests.length, "order_refund_storage_invalid");
    return c;
  }
  async function evidence(c: RefundContext) {
    const proof = await readVerifiedCheckoutEvidence(stripe, config, c.binding, now);
    const inventory = requireVerifiedCheckoutRefundInventory(proof, c.binding, config.scope, now());
    requireValue(inventory.complete, "order_refund_inventory_incomplete");
    return { proof, inventory };
  }
  function args(c: RefundContext, verified: Awaited<ReturnType<typeof evidence>>) {
    // Repeat the original-proof check immediately before each privileged write.
    const inventory = requireVerifiedCheckoutRefundInventory(verified.proof, c.binding, config.scope, now());
    return { p_order_id: c.binding.orderId, p_revision: c.binding.revision, p_evidence: verified.proof, p_inventory: inventory };
  }
  async function observe(c: RefundContext, verified: Awaited<ReturnType<typeof evidence>>) {
    await rpc("vendor_order_refund_observe_v1", args(c, verified));
  }
  async function recover(c: RefundContext, r: RefundRequest, verified: Awaited<ReturnType<typeof evidence>>) {
    if (r.refund_id) {
      await observe(c, verified);
      const updated = await context(c.binding.orderId, r.actor_id);
      const saved = updated.requests.find(x => x.id === r.id); requireValue(saved, "order_refund_unavailable");
      return project(saved);
    }
    const matches = verified.inventory.rows.filter(x => x.requestId === r.id);
    requireValue(matches.length <= 1, "order_refund_ambiguous_match");
    if (!matches.length) return null;
    requireValue(matches[0].amountMinor === r.amount_minor, "order_refund_binding_mismatch");
    const lease = request(await rpc<RefundRequest>("vendor_order_refund_recovery_v1", {
      p_order_id: c.binding.orderId, p_request_id: r.id, p_token: randomUUID(),
    }), c);
    const saved = request(await rpc<RefundRequest>("vendor_order_refund_bind_v1", { ...args(c, verified), p_request_id: r.id,
      p_token: lease.lease_token, p_fence: lease.lease_fence, p_refund_id: matches[0].id }), c);
    return project(saved);
  }
  return {
    async requestResolution(orderId: string, requestId: string, actor: string) {
      requireValue(uuid.test(requestId));
      const c = await context(orderId, actor);
      const { data: existing, error } = await admin.from("vendor_order_resolution_cases")
        .select("id,order_id").eq("id", requestId).maybeSingle();
      requireValue(!error, "order_resolution_unavailable");
      if (existing) {
        requireValue(existing.order_id === orderId && existing.id === requestId, "order_resolution_conflict");
        return { caseId: requestId };
      }
      const verified = await evidence(c);
      const disputes = requireVerifiedCheckoutDisputeInventory(verified.proof, c.binding, config.scope, now());
      requireValue(disputes.complete && disputes.rows.length === 0 && disputes.reviewReasons.length === 0,
        "order_resolution_not_ready");
      const caseId = await rpc<string>("vendor_order_resolution_request_v1", {
        ...args(c, verified), p_actor_id: actor, p_request_id: requestId, p_disputes: disputes,
      });
      requireValue(caseId === requestId, "order_resolution_unavailable");
      return { caseId };
    },
    // Called after atomic payment apply with the ORIGINAL in-process proof. A
    // later revision requires a new provider observation, never rebasing proof.
    // This path has no provider POST and remains available with issuance off.
    async recoverVerified(order: CheckoutOrderBinding, proof: CheckoutEvidence, appliedRevision: number) {
      const inventory = requireVerifiedCheckoutRefundInventory(proof, order, config.scope, now());
      requireValue(inventory.complete, "order_refund_inventory_incomplete");
      // Identical provider observations may reuse an existing ledger revision.
      requireValue(Number.isSafeInteger(appliedRevision) && appliedRevision >= order.revision, "order_revision_conflict");
      const c = await context(order.orderId, null);
      assertCheckoutOrderBinding(c.binding, config.scope, now());
      requireValue(c.binding.revision === appliedRevision, "order_revision_conflict");
      const immutable = ({ revision: _revision, stockState: _stock, paymentIntentId: _intent, ...rest }: CheckoutOrderBinding) => {
        void _revision; void _stock; void _intent; return rest;
      };
      requireValue(isDeepStrictEqual(immutable(c.binding), immutable(order)) && c.binding.paymentIntentId === proof.paymentIntentId,
        "order_refund_binding_mismatch");
      const pending = c.requests.filter(r => r.refund_id === null);
      requireValue(pending.length <= 1, "order_refund_ambiguous_requests");
      let recovered = 0;
      for (const r of pending) {
        const matches = inventory.rows.filter(row => row.requestId === r.id);
        requireValue(matches.length <= 1, "order_refund_ambiguous_match");
        if (!matches.length) continue; // Absence is not definitive rejection.
        const match = matches[0];
        requireValue(r.charge_id === proof.chargeId && r.payment_intent_id === proof.paymentIntentId &&
          match.amountMinor === r.amount_minor && match.createdAt >= Date.parse(r.creation_started_at) / 1000 - 5,
        "order_refund_binding_mismatch");
        const lease = request(await rpc<RefundRequest>("vendor_order_refund_recovery_v1", {
          p_order_id: order.orderId, p_request_id: r.id, p_token: randomUUID(),
        }), c);
        requireValue(lease.id === r.id && lease.amount_minor === r.amount_minor && lease.charge_id === r.charge_id &&
          (lease.refund_id === null || lease.refund_id === match.id), "order_refund_binding_mismatch");
        const currentInventory = requireVerifiedCheckoutRefundInventory(proof, order, config.scope, now());
        const saved = request(await rpc<RefundRequest>("vendor_order_refund_bind_v1", {
          p_order_id: order.orderId, p_revision: appliedRevision, p_evidence: proof, p_inventory: currentInventory,
          p_request_id: r.id, p_token: lease.lease_token, p_fence: lease.lease_fence, p_refund_id: match.id,
        }), c);
        requireValue(saved.id === r.id && saved.refund_id === match.id && saved.status === match.status, "order_refund_binding_mismatch");
        recovered++;
      }
      return { recovered, unresolved: pending.length - recovered };
    },
    // A private review aid, not a financial clearance token. It deliberately
    // retains the need to review buyer intent, historical holds and notifications.
    async reviewResolution(orderId: string, actor: string) {
      const c = await context(orderId, actor), verified = await evidence(c);
      const disputes = requireVerifiedCheckoutDisputeInventory(verified.proof, c.binding, config.scope, now());
      const inventory = verified.inventory, reasons = new Set<string>();
      if (c.binding.stockState !== "consumed") reasons.add("stock_not_consumed");
      if (c.requests.some(r => r.refund_id === null)) reasons.add("unbound_request");
      if (!inventory.rows.length) reasons.add("no_terminal_refund_evidence");
      if (inventory.succeededMinor > 0) reasons.add("successful_refund_requires_separate_resolution");
      if (inventory.pendingMinor > 0) reasons.add("refund_still_pending");
      if (!disputes.complete || disputes.rows.length) reasons.add("dispute_review_required");
      const allowed = new Set(["refund_requires_reconciliation", "refund_failed"]);
      for (const reason of verified.proof.reviewReasons) if (!allowed.has(reason)) reasons.add(reason);
      for (const r of c.requests.filter(r => r.refund_id !== null)) {
        const row = inventory.rows.find(x => x.id === r.refund_id);
        if (!row || row.amountMinor !== r.amount_minor || row.status !== r.status) reasons.add("retained_refund_differs");
      }
      return { orderId, checkedAt: verified.proof.checkedAt, currency: "usd" as const,
        totalAmountMinor: verified.proof.amountMinor, succeededMinor: inventory.succeededMinor,
        pendingMinor: inventory.pendingMinor, failedMinor: inventory.failedMinor, canceledMinor: inventory.canceledMinor,
        decision: reasons.size ? "held" as const : "operator_review_required" as const,
        reasons: [...reasons].sort(), clearsFinancialHolds: false as const, permitsFulfillment: false as const };
    },
    async preview(orderId: string, actor: string) {
      const c = await context(orderId, actor), verified = await evidence(c);
      await observe(c, verified);
      return { orderId, currency: "usd" as const, totalAmountMinor: verified.proof.amountMinor,
        succeededMinor: verified.inventory.succeededMinor, pendingMinor: verified.inventory.pendingMinor,
        availableMinor: Math.max(0, verified.proof.amountMinor - verified.inventory.succeededMinor - verified.inventory.pendingMinor),
        uncertain: c.requests.some(r => r.refund_id === null), checkedAt: verified.proof.checkedAt };
    },
    async refresh(orderId: string, requestId: string, actor: string) {
      requireValue(uuid.test(requestId));
      const c = await context(orderId, actor), r = c.requests.find(x => x.id === requestId);
      requireValue(r, "order_refund_unavailable");
      const verified = await evidence(c);
      return await recover(c, r, verified) ?? project(r);
    },
    async create(input: RefundCommand, actor: string) {
      command(input);
      requireValue(options.enabled === true, "order_refunds_disabled");
      const c = await context(input.orderId, actor), existing = c.requests.find(r => r.id === input.requestId);
      if (existing) requireValue(existing.amount_minor === input.amountMinor && existing.reason === input.reason, "order_refund_request_conflict");
      const verified = await evidence(c);
      if (existing) { const recovered = await recover(c, existing, verified); if (recovered) return recovered; }
      const prepared = request(await rpc<RefundRequest>("vendor_order_refund_prepare_v1", { ...args(c, verified), p_actor_id: actor,
        p_request_id: input.requestId, p_amount: input.amountMinor, p_reason: input.reason, p_token: randomUUID() }), c);
      if (prepared.refund_id) return project(prepared);
      const started = Math.floor(Date.parse(prepared.creation_started_at) / 1000), expires = Date.parse(prepared.lease_expires_at) / 1000, t = now();
      requireValue(Number.isSafeInteger(t) && started <= t && t < started + 23 * 3600 && t < expires, "order_refund_recovery_required");
      let providerId: string;
      try {
        // V1 bytes are immutable across every ambiguous retry. Future fee or
        // charge models require a new request version, never changing this one.
        const result = await stripe.refunds.create({ charge: prepared.charge_id, amount: prepared.amount_minor,
          reason: prepared.reason, refund_application_fee: false, reverse_transfer: false,
          metadata: { grookai_refund_request_id: prepared.id } }, {
          stripeAccount: prepared.connected_account_id, idempotencyKey: `grookai-refund-v1-${prepared.id}`,
        });
        requireValue(typeof result.id === "string" && /^re_[A-Za-z0-9]{1,252}$/.test(result.id), "order_refund_provider_uncertain");
        providerId = result.id;
      } catch { throw new OrderRefundError("order_refund_provider_uncertain"); }
      // A successful POST alone never marks a refund complete. Reread current
      // parent payment and scoped refund inventory before its durable binding.
      const current = await context(input.orderId, actor), after = await evidence(current);
      const match = after.inventory.rows.find(r => r.id === providerId);
      requireValue(match?.requestId === prepared.id && match.amountMinor === prepared.amount_minor, "order_refund_binding_mismatch");
      const saved = request(await rpc<RefundRequest>("vendor_order_refund_bind_v1", { ...args(current, after), p_request_id: prepared.id,
        p_token: prepared.lease_token, p_fence: prepared.lease_fence, p_refund_id: providerId }), current);
      return project(saved);
    },
  };
}
