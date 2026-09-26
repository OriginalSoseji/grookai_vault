// Provider evidence only. This is not checkout authorization, an entitlement,
// payment confirmation, or proof of a payout. Callers must load the immutable
// binding from server storage and re-read Stripe before starting checkout.
export type SellerScope = { accountId: string; livemode: boolean };
export type SellerController = {
  feesPayer: "account" | "application";
  paymentLosses: "stripe" | "application";
  requirementCollection: "stripe" | "application";
  dashboard: "full" | "express" | "none";
};
export type SellerBinding = {
  id: string; ownerId: string; storeId: string;
  platformAccountId: string; connectedAccountId: string; livemode: boolean;
  controller: SellerController;
};
export type SellerReadinessReason = "incomplete_evidence" | "controller_mismatch" |
  "details_required" | "charges_disabled" | "payouts_disabled" |
  "card_payments_inactive" | "transfers_inactive" | "account_restricted" |
  "requirements_due" | "verification_pending";
export type SellerReadiness = {
  version: "vendor-seller-readiness-v1";
  bindingId: string; storeId: string; connectedAccountId: string;
  platformAccountId: string; livemode: boolean; checkedAt: number;
  capabilitiesReady: boolean; reasons: SellerReadinessReason[];
  requirements: { currentlyDue: number | null; pastDue: number | null;
    pendingVerification: number | null; eventuallyDue: number | null };
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const accountId = /^acct_[A-Za-z0-9]+$/;
export function assertSellerScope(scope: SellerScope): void {
  if (!scope || !accountId.test(scope.accountId) || typeof scope.livemode !== "boolean")
    throw new Error("Invalid seller provider scope");
}

export function assertSellerBinding(binding: SellerBinding, scope: SellerScope, ownerId: string): void {
  assertSellerScope(scope);
  const controller = binding?.controller;
  if (!binding || !uuid.test(binding.id) || !uuid.test(binding.ownerId) || !uuid.test(binding.storeId) ||
      !uuid.test(ownerId) || binding.ownerId !== ownerId ||
      binding.platformAccountId !== scope.accountId || binding.livemode !== scope.livemode ||
      !accountId.test(binding.connectedAccountId) || binding.connectedAccountId === scope.accountId ||
      !controller || !["account", "application"].includes(controller.feesPayer) ||
      !["stripe", "application"].includes(controller.paymentLosses) ||
      !["stripe", "application"].includes(controller.requirementCollection) ||
      !["full", "express", "none"].includes(controller.dashboard))
    throw new Error("Invalid seller account binding");
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function fieldCount(value: unknown): number | null {
  // Stripe can return null when evidence is unavailable. Null is not an empty list.
  return Array.isArray(value) && value.length <= 1000 &&
    value.every(field => typeof field === "string" && field.length > 0 && field.length <= 512)
    ? value.length : null;
}

export function projectSellerReadiness(input: {
  binding: SellerBinding; scope: SellerScope; ownerId: string;
  account: unknown; balance: unknown; checkedAt: number;
}): SellerReadiness {
  const { binding, scope, ownerId, checkedAt } = input;
  assertSellerBinding(binding, scope, ownerId);
  if (!Number.isSafeInteger(checkedAt) || checkedAt < 0) throw new Error("Invalid seller observation time");
  const account = record(input.account), balance = record(input.balance);
  if (!account || account.object !== "account" || account.id !== binding.connectedAccountId || account.deleted === true)
    throw new Error("Seller account evidence mismatch");
  // V1 Account has no livemode field. Environment proof comes from Balance
  // retrieved with the same connected-account request scope, not invented fields
  // or metadata on Account. Raw balances never leave this boundary.
  if (!balance || balance.object !== "balance" || balance.livemode !== scope.livemode)
    throw new Error("Seller account mode mismatch");
  const reasons: SellerReadinessReason[] = [];
  const add = (reason: SellerReadinessReason) => { if (!reasons.includes(reason)) reasons.push(reason); };
  const controller = record(account.controller), capabilities = record(account.capabilities);
  const requirements = record(account.requirements);
  const counts = {
    currentlyDue: fieldCount(requirements?.currently_due),
    pastDue: fieldCount(requirements?.past_due),
    pendingVerification: fieldCount(requirements?.pending_verification),
    eventuallyDue: fieldCount(requirements?.eventually_due),
  };
  if (!controller || !capabilities || !requirements ||
      Object.values(counts).some(count => count === null) ||
      typeof account.details_submitted !== "boolean" || typeof account.charges_enabled !== "boolean" ||
      typeof account.payouts_enabled !== "boolean" ||
      !(requirements.disabled_reason === null || typeof requirements.disabled_reason === "string"))
    add("incomplete_evidence");
  if (controller?.type !== "application" || controller.is_controller !== true ||
      record(controller.fees)?.payer !== binding.controller.feesPayer ||
      record(controller.losses)?.payments !== binding.controller.paymentLosses ||
      controller.requirement_collection !== binding.controller.requirementCollection ||
      record(controller.stripe_dashboard)?.type !== binding.controller.dashboard)
    add("controller_mismatch");
  if (account.details_submitted !== true) add("details_required");
  if (account.charges_enabled !== true) add("charges_disabled");
  if (account.payouts_enabled !== true) add("payouts_disabled");
  if (capabilities?.card_payments !== "active") add("card_payments_inactive");
  if (capabilities?.transfers !== "active") add("transfers_inactive");
  if (requirements?.disabled_reason !== null && requirements?.disabled_reason !== undefined) add("account_restricted");
  if ((counts.currentlyDue ?? 0) > 0 || (counts.pastDue ?? 0) > 0) add("requirements_due");
  if ((counts.pendingVerification ?? 0) > 0) add("verification_pending");
  // Future threshold requirements alone do not disable an otherwise ready seller.
  // Current or pending requirements are conservatively blocked even during grace.
  return { version: "vendor-seller-readiness-v1", bindingId: binding.id, storeId: binding.storeId,
    connectedAccountId: binding.connectedAccountId, platformAccountId: scope.accountId,
    livemode: scope.livemode, checkedAt, capabilitiesReady: reasons.length === 0, reasons, requirements: counts };
}
