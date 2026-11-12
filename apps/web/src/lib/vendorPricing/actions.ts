"use server";

import {requireServerUser} from "@/lib/auth/requireServerUser";
import {notifySquareOfferSaved} from "@/lib/square/notifyOfferSaved";
import type {PricingWorkspace, PricingQuote} from "./types";

// The authenticated RPC owns identity, permission, arithmetic and concurrency.
// Never accept an owner ID or a calculated asking price from this form.
export async function vendorPricingAction(action: string, data: Record<string, unknown> = {}) {
  const allowed = ["workspace", "preview", "calculate", "save_rule", "save_settings", "apply"];
  if (!allowed.includes(action)) return {ok: false as const, message: "This pricing action is unavailable."};
  const {supabase, user} = await requireServerUser("/account/pricing");
  const result = await supabase.rpc("vendor_pricing_v1", {p_action: action, p_data: data});
  if (result.error || result.data?.ok === false) {
    const code = result.data?.error ?? result.error?.message ?? "";
    const message = /changed|revision|conflict/.test(code)
      ? "This pricing setting changed. Reload it before saving again."
      : /invalid_rule|invalid_result/.test(code) ? "Check the percentage, USD adjustment, rounding increment, and minimum / maximum amounts."
      : /no_exact_market/.test(code) ? "No fresh exact market reference is available. Choose My price or try later."
      : /held|busy/.test(code) ? "This copy is in a checkout or another update. Try again after it finishes."
      : "Pricing could not be confirmed. Reload before retrying. Your last confirmed price is retained.";
    return {ok: false as const, message};
  }
  const value = result.data as PricingWorkspace & PricingQuote & {id?: string; amountMinor?: number};
  const squareStatus = action === "apply" && value.status === "ready" && value.id
    ? await notifySquareOfferSaved(user.id, value.id, {waitForResult: true}) : undefined;
  return {ok: true as const, value, squareStatus};
}
