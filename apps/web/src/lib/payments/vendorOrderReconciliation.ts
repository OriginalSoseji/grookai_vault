import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SellerStripeConfig } from "./vendorSellerStripeGateway.ts";
import { assertSellerScope } from "./vendorSellerPolicy.ts";
import { reconcileVendorOrder, VendorOrderError } from "./vendorOrderService.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
// Private, explicitly invoked sweep. No scheduler, provider POST, event deletion
// or acknowledgement. Scanning durable bindings also recovers lost/pre-bind
// signals. Unbound ambiguous attempts require the separate GET recovery path.
export async function reconcileVendorOrderPage(admin: SupabaseClient, stripe: Stripe, config: SellerStripeConfig,
  input: { after?: string; limit?: number } = {}, now: () => number = () => Math.floor(Date.now() / 1000)) {
  assertSellerScope(config.scope);
  const limit = input.limit ?? 10;
  if (!Number.isInteger(limit) || limit < 1 || limit > 25 || (input.after !== undefined && !uuid.test(input.after)))
    throw new VendorOrderError("order_reconcile_invalid");
  const started = now();
  if (!Number.isSafeInteger(started) || started < 0) throw new VendorOrderError("order_reconcile_invalid");
  const remaining = () => { const n = now(); return Number.isSafeInteger(n) && n >= started && n - started < 60; };
  const clock = () => { if (!remaining()) throw new VendorOrderError("order_reconcile_budget_exhausted"); return now(); };
  let query = admin.from("vendor_order_attempts").select("order_id,stripe_account_id,livemode,session_id")
    .eq("stripe_account_id", config.scope.accountId).eq("livemode", config.scope.livemode).not("session_id", "is", null)
    .order("order_id", { ascending: true }).limit(limit + 1);
  if (input.after) query = query.gt("order_id", input.after);
  const { data, error } = await query;
  if (error || !Array.isArray(data) || data.length > limit + 1) throw new VendorOrderError("order_storage_unavailable");
  let previous = input.after ?? "";
  for (const row of data) {
    if (!uuid.test(row.order_id) || row.order_id <= previous || row.stripe_account_id !== config.scope.accountId ||
      row.livemode !== config.scope.livemode || typeof row.session_id !== "string" ||
      !new RegExp(`^cs_${config.scope.livemode ? "live" : "test"}_[A-Za-z0-9]+$`).test(row.session_id))
      throw new VendorOrderError("order_reconcile_scope_mismatch");
    previous = row.order_id;
  }
  const succeeded: string[] = [], failed: string[] = [];
  let after = input.after ?? null, visited = 0;
  for (const row of data.slice(0, limit)) {
    if (!remaining()) break;
    try { await reconcileVendorOrder(admin, stripe, config, row.order_id, clock); succeeded.push(row.order_id); }
    catch { failed.push(row.order_id); }
    after = row.order_id; visited++;
  }
  // No skipped row is hidden by advancing past the last attempted ID. Failed
  // IDs are explicitly returned for retry and are scanned again on a new sweep.
  return { succeeded, failed, next: visited < data.length ? after : null,
    complete: visited === data.length, budgetExhausted: !remaining() };
}
