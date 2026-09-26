import "server-only";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { createSellerStripeClient, readSellerStripeConfig } from "./vendorSellerStripeGateway";
import { SELLER_ACCOUNT_MODEL, sellerReturnOrigin } from "./vendorSellerEnrollment";
import { createVendorSellerRepository, SellerError } from "./vendorSellerRepository";
import { createVendorSellerService } from "./vendorSellerService";
import { createVendorSellerHandlers } from "./vendorSellerHandlers";
export function getVendorSellerRuntime() {
  const config = readSellerStripeConfig(process.env); if (!config) return null;
  const onboardingEnabled = process.env.GROOKAI_VENDOR_ONBOARDING_ENABLED === "true";
  // Explicit deployment choice: a fixture/working assumption cannot silently
  // select an immutable financial liability/dashboard model for real accounts.
  if (onboardingEnabled && process.env.STRIPE_SELLER_ACCOUNT_MODEL !== SELLER_ACCOUNT_MODEL)
    throw new SellerError("seller_model_required");
  const origin = sellerReturnOrigin(getSiteOrigin(), config.scope.livemode);
  const stripe = createSellerStripeClient(config), repo = createVendorSellerRepository(createServerAdminClient());
  return { config, stripe, repo, service: createVendorSellerService({ repo, stripe, config, onboardingEnabled, origin }) };
}
export const vendorSellerHandlers = createVendorSellerHandlers({
  async authenticate() {
    const client = await createServerComponentClient(), { data, error } = await client.auth.getUser();
    return error ? null : data.user?.id ?? null;
  },
  origin: getSiteOrigin, runtime: getVendorSellerRuntime,
  async retainedStatus() {
    const client = await createServerComponentClient();
    const { data, error } = await client.rpc("vendor_seller_owner_status_v1");
    if (error || data?.schema_version !== "VENDOR_SELLER_BINDING_V1") throw new SellerError("seller_unavailable");
    return { enabled: false, onboardingEnabled: false, testMode: data.binding?.testMode ?? null,
      state: data.binding?.state ?? "none", hasConnectedAccount: data.binding?.hasConnectedAccount ?? false,
      recoveryRequired: data.binding?.creationNeedsRecovery ?? false, readiness: null };
  },
});
