import type { VendorPlan } from "./vendorSubscriptionPolicy";
export type VendorBillingStatus = {
  enabled: boolean; checkoutEnabled: boolean; environment: "test"|"live"|null;
  subscriptionStatus?: string; plan?: VendorPlan|null; paidThrough?: string|null; cancelAtPeriodEnd?: boolean;
  canManagePayment?: boolean; hasSubscription?: boolean; checkoutState?: string|null; pendingPlan?: VendorPlan|null;
  eligibilityIssue?: "suspended"|"binding_required"|null; appAvailable?: boolean; webAvailable?: boolean;
  access?: {store_app:boolean;store_web:boolean};
  recoveryRequired?: boolean;
  closeoutPending?:boolean;
};
