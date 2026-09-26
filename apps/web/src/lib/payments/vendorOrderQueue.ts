import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { SellerStripeConfig } from "./vendorSellerStripeGateway.ts";
import { assertSellerScope } from "./vendorSellerPolicy.ts";
import { createCheckoutRepository, createVendorCheckoutService } from "./vendorCheckoutCreation.ts";
import { reconcileVendorOrder, VendorOrderError } from "./vendorOrderService.ts";

export type QueueOutcome = "verified" | "needs_review" | "retry" | "not_found" | "conflicting_sessions" | "scan_limit";
export type QueueClaim = { orderId: string; token: string; fence: number; lane: "bound" | "discovery"; leaseExpiresAt: string };
export type QueueScan = { scanned: number; complete: boolean; completedSweeps: number };
export type QueueReceipt = { orderId: string; fence: number; result: QueueOutcome; nextRunAt: string };
export type QueueStatus = {
  enabled: boolean; checkedAt: string; lastScanAt: string | null; lastCompletedSweepAt: string | null;
  lastClaimedAt: string | null; lastFinishedAt: string | null; completedSweeps: number;
  total: number; due: number; leased: number; expiredLeases: number; unresolved: number; abandonedClaims: number;
  oldestDueAt: string | null;
  attention: { orderId: string; result: QueueOutcome | null; failures: number; nextRunAt: string; leaseExpiresAt: string | null }[];
};
export interface OrderQueueRepository {
  seed(): Promise<QueueScan>;
  claim(token: string): Promise<QueueClaim | null>;
  finish(claim: QueueClaim, result: QueueOutcome): Promise<QueueReceipt>;
  status(): Promise<QueueStatus>;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const outcomes: QueueOutcome[] = ["verified", "needs_review", "retry", "not_found", "conflicting_sessions", "scan_limit"];
function requireValue(ok: unknown): asserts ok { if (!ok) throw new VendorOrderError("order_queue_invalid"); }
export function createOrderQueueRepository(admin: SupabaseClient, config: Pick<SellerStripeConfig, "scope">): OrderQueueRepository {
  assertSellerScope(config.scope);
  async function rpc<T>(name: string, params: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await admin.rpc(name, { p_platform: config.scope.accountId, p_live: config.scope.livemode, ...params });
    if (error) throw new VendorOrderError("order_queue_storage_unavailable");
    return data as T;
  }
  return {
    seed: () => rpc("vendor_order_reconcile_seed_v1", { p_limit: 100 }),
    claim: token => rpc("vendor_order_reconcile_claim_v1", { p_token: token }),
    finish: (claim, result) => rpc("vendor_order_reconcile_finish_v1", {
      p_order: claim.orderId, p_token: claim.token, p_fence: claim.fence, p_result: result,
    }),
    status: () => rpc("vendor_order_reconcile_status_v1"),
  };
}

// One bounded job per invocation. Persist scan progress before provider IO and
// acknowledge only a durable completion receipt. A crash leaves its fenced lease
// for recovery; no catch branch invents payment evidence or releases inventory.
export function createOrderQueueService(input: { repo: OrderQueueRepository; enabled?: boolean;
  reconcile(id: string): Promise<{ needsReview: boolean }>;
  discover(id: string): Promise<{ orderId: string; state: "reconciled" } |
    { orderId: string; state: "unresolved"; reason: "not_found" | "conflicting_sessions" | "scan_limit" }>;
  token?: () => string; now?: () => number }) {
  const now = input.now ?? Date.now;
  return {
    status: () => input.repo.status(),
    async tick() {
      if (input.enabled !== true) throw new VendorOrderError("order_queue_disabled");
      const scan = await input.repo.seed();
      requireValue(Number.isInteger(scan.scanned) && scan.scanned >= 0 && scan.scanned <= 100 &&
        typeof scan.complete === "boolean" && Number.isSafeInteger(scan.completedSweeps) && scan.completedSweeps >= 0);
      const token = (input.token ?? randomUUID)(); requireValue(uuid.test(token));
      const claim = await input.repo.claim(token);
      if (!claim) return { processed: 0 as const, scan };
      requireValue(uuid.test(claim.orderId) && claim.token === token && Number.isSafeInteger(claim.fence) && claim.fence > 0 &&
        ["bound", "discovery"].includes(claim.lane) && Number.isSafeInteger(now()) && Date.parse(claim.leaseExpiresAt) > now());
      let outcome: QueueOutcome;
      try {
        if (claim.lane === "bound") outcome = (await input.reconcile(claim.orderId)).needsReview ? "needs_review" : "verified";
        else {
          const result = await input.discover(claim.orderId);
          requireValue(result.orderId === claim.orderId);
          if (result.state === "reconciled") outcome = "verified";
          else { requireValue(result.state === "unresolved" && ["not_found", "conflicting_sessions", "scan_limit"].includes(result.reason)); outcome = result.reason; }
        }
      } catch { outcome = "retry"; }
      // Failed finish is not success: a successor must reclaim the lease and
      // reread current provider state. SQL rejects stale tokens/fences/deadlines.
      const receipt = await input.repo.finish(claim, outcome);
      requireValue(receipt.orderId === claim.orderId && receipt.fence === claim.fence && outcomes.includes(receipt.result) &&
        Number.isFinite(Date.parse(receipt.nextRunAt)));
      return { processed: 1 as const, scan, receipt };
    },
  };
}

export function createVendorOrderQueue(admin: SupabaseClient, stripe: Stripe, config: SellerStripeConfig, enabled = false) {
  return createOrderQueueService({ repo: createOrderQueueRepository(admin, config), enabled,
    reconcile: id => reconcileVendorOrder(admin, stripe, config, id),
    discover: id => createVendorCheckoutService({ repo: createCheckoutRepository(admin, stripe, config), stripe, config }).discover(id),
  });
}

const date = (value: string | null) => value === null || typeof value === "string" && Number.isFinite(Date.parse(value));
const count = (value: number) => Number.isSafeInteger(value) && value >= 0;
export function projectOrderQueueStatus(s: QueueStatus): QueueStatus {
  requireValue(s && typeof s.enabled === "boolean" && s.checkedAt !== null && date(s.checkedAt));
  for (const key of ["lastScanAt", "lastCompletedSweepAt", "lastClaimedAt", "lastFinishedAt", "oldestDueAt"] as const) requireValue(date(s[key]));
  for (const key of ["completedSweeps", "total", "due", "leased", "expiredLeases", "unresolved", "abandonedClaims"] as const) requireValue(count(s[key]));
  requireValue(s.due <= s.total && s.leased <= s.total && s.expiredLeases <= s.total && s.unresolved <= s.total && Array.isArray(s.attention) && s.attention.length <= 25);
  const seen = new Set<string>();
  const attention = s.attention.map(a => {
    requireValue(uuid.test(a.orderId) && !seen.has(a.orderId) && (a.result === null || outcomes.includes(a.result)) && count(a.failures) &&
      a.nextRunAt !== null && date(a.nextRunAt) && date(a.leaseExpiresAt)); seen.add(a.orderId);
    return { orderId: a.orderId, result: a.result, failures: a.failures, nextRunAt: a.nextRunAt, leaseExpiresAt: a.leaseExpiresAt };
  });
  return { enabled: s.enabled, checkedAt: s.checkedAt, lastScanAt: s.lastScanAt, lastCompletedSweepAt: s.lastCompletedSweepAt,
    lastClaimedAt: s.lastClaimedAt, lastFinishedAt: s.lastFinishedAt, completedSweeps: s.completedSweeps, total: s.total, due: s.due,
    leased: s.leased, expiredLeases: s.expiredLeases, unresolved: s.unresolved, abandonedClaims: s.abandonedClaims, oldestDueAt: s.oldestDueAt, attention };
}
export function projectOrderQueueTick(value: Awaited<ReturnType<ReturnType<typeof createOrderQueueService>["tick"]>>) {
  requireValue(value && [0, 1].includes(value.processed) && value.scan && count(value.scan.scanned) && value.scan.scanned <= 100 &&
    count(value.scan.completedSweeps) && typeof value.scan.complete === "boolean");
  const scan = { scanned: value.scan.scanned, complete: value.scan.complete, completedSweeps: value.scan.completedSweeps };
  if (value.processed === 0) return { processed: 0 as const, scan };
  const r = value.receipt;
  requireValue(r && uuid.test(r.orderId) && count(r.fence) && r.fence > 0 && outcomes.includes(r.result) && r.nextRunAt !== null && date(r.nextRunAt));
  return { processed: 1 as const, scan, receipt: { orderId: r.orderId, fence: r.fence, result: r.result, nextRunAt: r.nextRunAt } };
}

// Health never treats a clean payment sweep as proof of fulfillment or payouts.
export function orderQueueAlerts(status: QueueStatus): string[] {
  const now = Date.parse(status.checkedAt), alerts: string[] = [];
  if (!Number.isFinite(now)) throw new VendorOrderError("order_queue_invalid");
  if (!status.enabled) alerts.push("disabled");
  if (!status.lastScanAt) alerts.push("not_started");
  else if (!Number.isFinite(Date.parse(status.lastScanAt)) || now - Date.parse(status.lastScanAt) > 15 * 60_000) alerts.push("scan_stale");
  if (status.total > 0 && (!status.lastCompletedSweepAt || now - Date.parse(status.lastCompletedSweepAt) > 24 * 3600_000)) alerts.push("sweep_stale");
  if (status.oldestDueAt && now - Date.parse(status.oldestDueAt) > 15 * 60_000) alerts.push("work_overdue");
  if (status.expiredLeases > 0) alerts.push("expired_leases");
  if (status.unresolved > 0) alerts.push("orders_need_attention");
  return alerts;
}
