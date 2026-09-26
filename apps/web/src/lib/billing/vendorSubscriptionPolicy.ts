// Pure policy over server-retrieved Stripe objects. This module never grants access
// itself: the durable, fenced database projection is the authorization boundary.
export const VENDOR_BILLING_VERSION = "vendor-billing-v1";
export type VendorPlan = "store_app" | "store_web";
export type PriceCatalog = Readonly<Record<VendorPlan, string>>;
export type BillingScope = { accountId: string; livemode: boolean };
export type Reference = string | { id: string } | null;

export function referenceId(value: Reference | undefined): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

export function validateCatalog(catalog: PriceCatalog): void {
  if (!/^price_[A-Za-z0-9]+$/.test(catalog.store_app) ||
      !/^price_[A-Za-z0-9]+$/.test(catalog.store_web) ||
      catalog.store_app === catalog.store_web) throw new Error("Invalid vendor price catalog");
}

export type SubscriptionSnapshot = {
  id: string; customer: Reference; livemode: boolean; status: string;
  collection_method: string; pause_collection: unknown;
  cancel_at: number | null; cancel_at_period_end: boolean;
  latest_invoice: Reference;
  items: { has_more: boolean; data: Array<{
    id: string; quantity?: number; current_period_start: number; current_period_end: number;
    price: {
      id: string; currency: string; unit_amount: number | null; type: string; livemode: boolean;
      recurring: { interval: string; interval_count: number; usage_type: string } | null;
    };
  }> };
};
export type InvoiceSnapshot = {
  id: string; customer: Reference; livemode: boolean; status: string | null;
  collection_method: string; currency: string;
  status_transitions: { paid_at: number | null };
  parent: { subscription_details?: { subscription: Reference } | null } | null;
  lines: { has_more: boolean; data: Array<{
    period: { start: number; end: number }; quantity: number | null;
    pricing: { price_details?: { price: Reference } | null } | null;
    parent: { subscription_item_details?: { subscription_item: string; subscription: Reference } | null } | null;
  }> };
};
export type SubscriptionProjection = {
  version: typeof VENDOR_BILLING_VERSION;
  subscriptionId: string; customerId: string; plan: VendorPlan | null;
  status: string; cancelAtPeriodEnd: boolean; paidFrom: number | null; paidThrough: number | null;
  features: { store_app: boolean; store_web: boolean };
  reason: "paid" | "inactive" | "unsupported_price" | "unverified_invoice" | "expired";
};

// No free trial, unpaid grace period, or manually marked checkout-success grant.
// A scheduled cancellation retains access only through the verified paid period.
export function projectVendorSubscription(input: {
  subscription: SubscriptionSnapshot; invoice: InvoiceSnapshot | null;
  customerId: string; catalog: PriceCatalog; scope: BillingScope; now: number;
}): SubscriptionProjection {
  const { subscription: sub, invoice, customerId, catalog, scope, now } = input;
  validateCatalog(catalog);
  if (!Number.isSafeInteger(now) || now < 0 || !/^acct_[A-Za-z0-9]+$/.test(scope.accountId))
    throw new Error("Invalid billing scope or clock");
  if (!/^sub_[A-Za-z0-9]+$/.test(sub.id) || !/^cus_[A-Za-z0-9]+$/.test(customerId) ||
      referenceId(sub.customer) !== customerId || sub.livemode !== scope.livemode)
    throw new Error("Subscription ownership or mode mismatch");
  const result: SubscriptionProjection = {
    version: VENDOR_BILLING_VERSION, subscriptionId: sub.id, customerId,
    // Hosted portal cancellation can set cancel_at to the item boundary while
    // leaving Stripe's legacy cancel_at_period_end flag false.
    plan: null, status: sub.status, cancelAtPeriodEnd: sub.cancel_at_period_end ||
      (Number.isSafeInteger(sub.cancel_at) && sub.cancel_at !== null && sub.cancel_at >= 0 &&
       sub.items.data.length === 1 && sub.cancel_at === sub.items.data[0]?.current_period_end),
    paidFrom: null, paidThrough: null, features: { store_app: false, store_web: false }, reason: "inactive",
  };
  if (sub.status !== "active" || sub.pause_collection != null || sub.collection_method !== "charge_automatically") return result;
  const item = sub.items.data[0];
  const plan = (Object.keys(catalog) as VendorPlan[]).find(p => catalog[p] === item?.price.id);
  if (!item || sub.items.has_more || sub.items.data.length !== 1 || item.quantity !== 1 || !plan ||
      item.price.livemode !== scope.livemode || item.price.currency !== "usd" ||
      item.price.unit_amount !== (plan === "store_app" ? 3000 : 5000) ||
      item.price.type !== "recurring" || item.price.recurring?.interval !== "month" ||
      item.price.recurring.interval_count !== 1 || item.price.recurring.usage_type !== "licensed")
    return { ...result, reason: "unsupported_price" };
  result.plan = plan;
  if (!invoice || invoice.id !== referenceId(sub.latest_invoice) || invoice.status !== "paid" ||
      invoice.livemode !== scope.livemode || referenceId(invoice.customer) !== customerId ||
      referenceId(invoice.parent?.subscription_details?.subscription) !== sub.id ||
      invoice.currency !== "usd" || invoice.collection_method !== "charge_automatically" || invoice.lines.has_more ||
      !Number.isSafeInteger(invoice.status_transitions.paid_at) || invoice.status_transitions.paid_at === null ||
      invoice.status_transitions.paid_at < 0 || invoice.status_transitions.paid_at > now)
    return { ...result, reason: "unverified_invoice" };
  const line = invoice.lines.data.find(line =>
    line.parent?.subscription_item_details?.subscription_item === item.id &&
    referenceId(line.parent?.subscription_item_details?.subscription) === sub.id &&
    referenceId(line.pricing?.price_details?.price) === item.price.id && line.quantity === 1 &&
    Number.isSafeInteger(line.period.start) && Number.isSafeInteger(line.period.end) &&
    line.period.start >= item.current_period_start && line.period.start <= now &&
    line.period.start < line.period.end && line.period.end === item.current_period_end);
  if (!line || !Number.isSafeInteger(item.current_period_start) || !Number.isSafeInteger(item.current_period_end))
    return { ...result, reason: "unverified_invoice" };
  if (sub.cancel_at !== null && (!Number.isSafeInteger(sub.cancel_at) || sub.cancel_at < 0))
    throw new Error("Invalid cancellation boundary");
  const paidThrough = Math.min(line.period.end, sub.cancel_at ?? line.period.end);
  const paidFrom = Math.max(line.period.start, invoice.status_transitions.paid_at);
  if (paidThrough <= now) return { ...result, paidThrough, reason: "expired" };
  return { ...result, paidFrom, paidThrough, reason: "paid", features: { store_app: true, store_web: plan === "store_web" } };
}

// Only subscription/invoice notifications cause reconciliation. Payload metadata
// and event ordering are deliberately not entitlement authority.
export function billingEventTarget(event: {
  type: string; livemode: boolean; account?: string; context?: string;
  data: { object: { object?: string; id?: string; customer?: Reference;
    parent?: { subscription_details?: { subscription?: Reference } | null } | null } };
}, scope: BillingScope): { customerId: string; subscriptionId: string } | null {
  if (event.livemode !== scope.livemode || event.account || event.context) throw new Error("Wrong billing event scope");
  const subscriptionEvent = new Set(["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "customer.subscription.paused", "customer.subscription.resumed"]);
  const invoiceEvent = new Set(["invoice.paid", "invoice.payment_failed", "invoice.payment_action_required", "invoice.updated", "invoice.voided", "invoice.marked_uncollectible"]);
  const object = event.data.object;
  if (!subscriptionEvent.has(event.type) && !invoiceEvent.has(event.type)) return null;
  const expectedObject = subscriptionEvent.has(event.type) ? "subscription" : "invoice";
  if (object.object !== expectedObject) throw new Error("Wrong billing event object");
  const subscriptionId = expectedObject === "subscription" ? object.id : referenceId(object.parent?.subscription_details?.subscription);
  const customerId = referenceId(object.customer);
  // One-off invoices on the same Stripe account are unrelated to subscriptions.
  if (expectedObject === "invoice" && !subscriptionId) return null;
  if (!subscriptionId || !/^sub_[A-Za-z0-9]+$/.test(subscriptionId) || !customerId || !/^cus_[A-Za-z0-9]+$/.test(customerId))
    throw new Error("Invalid billing event target");
  return { customerId, subscriptionId };
}
