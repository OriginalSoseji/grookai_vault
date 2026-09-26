import { acquisitionUuid } from "./orderAcquisitionTypes.ts";

export const refundReviewIssues = {
  unconfirmed: "A refund outcome is still unconfirmed. Check the existing request before starting another refund.",
  pending: "A refund is still processing or needs attention.",
  refunded: "Money has been refunded. Review the buyer’s remaining refund or fulfillment needs separately.",
  dispute: "This payment has dispute history that requires a separate review.",
  history_changed: "The latest refund outcome differs from the saved history. Refresh refund status and review again.",
  payment_review: "The payment or inventory requires further review.",
} as const;
export type RefundReview = {
  schema: "VENDOR_ORDER_REFUND_REVIEW_V1"; orderId: string; checkedAt: number; currency: "usd";
  totalAmountMinor: number; succeededMinor: number; pendingMinor: number; failedMinor: number; canceledMinor: number;
  decision: "held" | "operator_review_required"; issues: (keyof typeof refundReviewIssues)[];
  clearsFinancialHolds: false; permitsFulfillment: false;
};
export function refundReview(value: unknown): RefundReview {
  const fail = () => new Error("Refund review is unavailable.");
  if (!value || typeof value !== "object" || Array.isArray(value)) throw fail();
  const v = value as Record<string, unknown>;
  const amount = (n: unknown, max = 99_999_999): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= max;
  if (v.schema !== "VENDOR_ORDER_REFUND_REVIEW_V1" || typeof v.orderId !== "string" || !acquisitionUuid.test(v.orderId) ||
    !amount(v.checkedAt, 253_402_300_799) || v.currency !== "usd" || !amount(v.totalAmountMinor) || !v.totalAmountMinor ||
    !amount(v.succeededMinor) || !amount(v.pendingMinor) || v.succeededMinor + v.pendingMinor > v.totalAmountMinor ||
    !amount(v.failedMinor, 500 * 99_999_999) || !amount(v.canceledMinor, 500 * 99_999_999) ||
    !["held", "operator_review_required"].includes(String(v.decision)) || v.clearsFinancialHolds !== false || v.permitsFulfillment !== false ||
    !Array.isArray(v.issues) || v.issues.length > 6 || new Set(v.issues).size !== v.issues.length ||
    v.issues.some(x => typeof x !== "string" || !Object.hasOwn(refundReviewIssues, x)) ||
    (v.decision === "held" ? !v.issues.length : v.issues.length || v.succeededMinor || v.pendingMinor || !(v.failedMinor + v.canceledMinor))) throw fail();
  return { schema: "VENDOR_ORDER_REFUND_REVIEW_V1", orderId: v.orderId, checkedAt: v.checkedAt, currency: "usd",
    totalAmountMinor: v.totalAmountMinor, succeededMinor: v.succeededMinor, pendingMinor: v.pendingMinor,
    failedMinor: v.failedMinor, canceledMinor: v.canceledMinor, decision: v.decision as RefundReview["decision"],
    issues: v.issues as RefundReview["issues"], clearsFinancialHolds: false, permitsFulfillment: false };
}
