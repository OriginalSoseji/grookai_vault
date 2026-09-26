import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { SellerStripeConfig } from "./vendorSellerStripeGateway.ts";
import type { CheckoutOrderBinding } from "./vendorCheckoutEvidence.ts";
import { readVerifiedCheckoutEvidence, requireVerifiedCheckoutEvidence, requireVerifiedCheckoutRefundInventory } from "./vendorCheckoutEvidence.ts";
import { verifyCheckoutSignal } from "./vendorCheckoutSignals.ts";
import { createOrderRefundService, OrderRefundError } from "./vendorOrderRefunds.ts";

// Private service boundary. No route accepts quotes, payment evidence or seller
// identities from a browser. Creation/policy/provider adapters remain separate.
export class VendorOrderError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.name = "VendorOrderError"; this.code = code; }
}
type PersistedOrder = { id: string; revision: number; paid: boolean; review_reasons: string[] };
export type VendorOrderResult = { orderId: string; revision: number; paid: boolean; needsReview: boolean };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function rpc<T>(admin: SupabaseClient, name: string, params: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.rpc(name, params);
  if (error) throw new VendorOrderError(/^order_[a-z_]+$/.test(error.message ?? "") ? error.message : "order_storage_unavailable");
  return data as T;
}

// Always reload the immutable projection. A conflict requires a completely new
// provider observation; never rebase a stale proof onto a new revision.
export async function reconcileVendorOrder(admin: SupabaseClient, stripe: Stripe, config: SellerStripeConfig,
  orderId: string, clock: () => number = () => Math.floor(Date.now() / 1000)): Promise<VendorOrderResult> {
  if (!uuid.test(orderId)) throw new VendorOrderError("order_invalid");
  for (let attempt = 0; attempt < 2; attempt++) {
    const order = await rpc<CheckoutOrderBinding | null>(admin, "vendor_order_binding_v1", { p_order_id: orderId });
    if (!order || order.orderId !== orderId) throw new VendorOrderError("order_not_bound");
    const evidence = await readVerifiedCheckoutEvidence(stripe, config, order, clock);
    requireVerifiedCheckoutEvidence(evidence, order, config.scope, clock());
    try {
      const saved = await rpc<PersistedOrder>(admin, "vendor_order_apply_v1", { p_order_id: order.orderId,
        p_revision: order.revision, p_platform: config.scope.accountId, p_connected: order.seller.connectedAccountId,
        p_live: config.scope.livemode, p_evidence: evidence });
      let unresolvedRefund = false;
      if (evidence.payment === "paid") {
        const inventory = requireVerifiedCheckoutRefundInventory(evidence, order, config.scope, clock());
        // This revision comes from our own successful apply. The original sealed
        // proof is still validated against its original binding, never rewritten.
        // A later concurrent writer forces a completely fresh observation.
        await rpc(admin, "vendor_order_refund_observe_v1", { p_order_id: order.orderId,
          p_revision: saved.revision, p_evidence: evidence, p_inventory: inventory });
        const recovery = await createOrderRefundService(admin, stripe, config, { now: clock })
          .recoverVerified(order, evidence, saved.revision);
        unresolvedRefund = recovery.unresolved > 0;
      }
      return { orderId: saved.id, revision: saved.revision, paid: saved.paid, needsReview: saved.review_reasons.length > 0 || unresolvedRefund };
    } catch (error) {
      if (!(error instanceof VendorOrderError || error instanceof OrderRefundError) || error.code !== "order_revision_conflict" || attempt === 1) throw error;
    }
  }
  throw new VendorOrderError("order_revision_conflict");
}

// Call only with the untouched signed body. Enqueue is durable even before a
// session has bound; null means no current lookup, not successful fulfillment.
export async function recordVendorCheckoutSignal(admin: SupabaseClient, stripe: Stripe, config: SellerStripeConfig,
  payload: string, signature: string, receivedAtMs = Date.now()): Promise<{ orderId: string | null; ignored: boolean }> {
  const event = verifyCheckoutSignal(stripe, config, payload, signature, receivedAtMs);
  if (!event) return { orderId: null, ignored: true };
  const orderId = await rpc<string | null>(admin, "vendor_order_signal_v1", { p_platform: config.scope.accountId,
    p_connected: event.connectedAccountId, p_live: event.livemode, p_event: event.eventId, p_kind: event.kind,
    p_resource: event.resourceId, p_created: new Date(event.createdAt * 1000).toISOString() });
  return { orderId, ignored: false };
}
