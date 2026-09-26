import { readBillingBody } from "../billing/vendorBillingHttp.ts";
import { SellerError } from "./vendorSellerRepository.ts";
import { verifySellerAccountSignal } from "./vendorSellerStripeGateway.ts";
import type { SellerStripeConfig } from "./vendorSellerStripeGateway.ts";
import type { SellerStatus, createVendorSellerService } from "./vendorSellerService.ts";
import type { VendorSellerRepository } from "./vendorSellerRepository.ts";
import type Stripe from "stripe";
export const SELLER_NO_STORE = { "Cache-Control": "private, no-store", "Vary": "Cookie, Authorization", "Referrer-Policy": "no-referrer" };
export type SellerRuntime = { config: SellerStripeConfig; stripe: Stripe; repo: VendorSellerRepository;
  service: ReturnType<typeof createVendorSellerService> };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: SELLER_NO_STORE });
function failure(error: unknown) {
  const cases: Record<string, [number, string]> = {
    seller_busy: [409, "Another seller update is running. Try again shortly."],
    seller_lease_lost: [409, "Seller status changed. Refresh before trying again."],
    seller_store_required: [409, "Create your store before setting up seller payments."],
    seller_creation_recovery_required: [409, "Your earlier setup needs review. Contact Grookai support."],
    seller_onboarding_blocked: [409, "Seller setup needs review. Contact Grookai support."],
    seller_onboarding_unavailable: [503, "Seller setup is not available for this account right now."],
  };
  const [status, message] = cases[error instanceof SellerError ? error.code : ""] ?? [503, "Seller payments are temporarily unavailable. Please try again."];
  return json({ error: message }, status);
}
export function createVendorSellerHandlers(deps: { authenticate(): Promise<string | null>; origin(): string;
  runtime(): SellerRuntime | null; retainedStatus(): Promise<SellerStatus> }) {
  return {
    async ownerGET() {
      try {
        const owner = await deps.authenticate(); if (!owner) return json({ error: "Sign in required." }, 401);
        const runtime = deps.runtime(); return json(runtime ? await runtime.service.status(owner) : await deps.retainedStatus());
      } catch (e) { return failure(e); }
    },
    async ownerPOST(request: Request) {
      try {
        // Cookie-authenticated desktop operation. No caller-selected owner, store,
        // provider identity, controller, return URL or client capability flags.
        if (request.headers.get("origin") !== deps.origin()) return json({ error: "Invalid request origin." }, 403);
        const owner = await deps.authenticate(); if (!owner) return json({ error: "Sign in required." }, 401);
        let body;
        try { body = JSON.parse(await readBillingBody(request, 512)); } catch { return json({ error: "Invalid seller request." }, 400); }
        if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 ||
            !["onboarding", "refresh"].includes(body.action)) return json({ error: "Invalid seller request." }, 400);
        const runtime = deps.runtime(); if (!runtime) throw new SellerError("seller_onboarding_unavailable");
        return json(body.action === "onboarding" ? await runtime.service.onboarding(owner) : { status: await runtime.service.refresh(owner) });
      } catch (e) { return failure(e); }
    },
    async webhook(request: Request) {
      let runtime: SellerRuntime | null;
      try { runtime = deps.runtime(); } catch { return json({ error: "Seller events unavailable." }, 503); }
      if (!runtime) return json({ error: "Seller events unavailable." }, 503);
      let signal;
      try { signal = verifySellerAccountSignal(runtime.stripe, runtime.config, await readBillingBody(request, 256 * 1024), request.headers.get("stripe-signature") ?? ""); }
      catch { return json({ error: "Invalid Connect webhook." }, 400); }
      if (!signal) return json({ received: true });
      try { await runtime.repo.enqueue(runtime.config.scope, signal); return json({ received: true }); }
      catch { return json({ error: "Event could not be retained; retry required." }, 503); }
    },
  };
}
