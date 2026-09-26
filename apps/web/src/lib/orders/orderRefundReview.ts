import type { createOrderRefundService } from "../payments/vendorOrderRefunds.ts";
import { refundReview, type RefundReview } from "./orderRefundReview.shared.ts";

// Project only fixed customer-facing categories, never internal reason strings,
// provider identities or a token that could authorize fulfillment.
export function projectRefundReview(value: Awaited<ReturnType<ReturnType<typeof createOrderRefundService>["reviewResolution"]>>) {
  const issues = new Set<RefundReview["issues"][number]>();
  for (const reason of value.reasons) {
    if (["unbound_request", "no_terminal_refund_evidence"].includes(reason)) issues.add("unconfirmed");
    else if (reason === "refund_still_pending") issues.add("pending");
    else if (reason === "successful_refund_requires_separate_resolution") issues.add("refunded");
    else if (reason === "retained_refund_differs") issues.add("history_changed");
    else if (reason.startsWith("dispute_")) issues.add("dispute");
    else issues.add("payment_review");
  }
  return refundReview({ ...value, schema: "VENDOR_ORDER_REFUND_REVIEW_V1", issues: [...issues].sort() });
}
