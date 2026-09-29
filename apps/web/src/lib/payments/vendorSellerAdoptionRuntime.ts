import "server-only";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { getVendorSellerRuntime } from "./vendorSellerRuntime";
import { createSellerAdoptionService } from "./vendorSellerAdoptionService";
import { createSellerAdoptionHandlers } from "./vendorSellerAdoptionHttp";
import { createSellerAdoptionRepository } from "./vendorSellerAdoptionRepository";

export const sellerAdoptionHandlers = createSellerAdoptionHandlers({
  origin: getSiteOrigin,
  async authenticate() {
    const client = await createServerComponentClient();
    const { data, error } = await client.auth.getUser();
    return error || !data.user?.email ? null : {id:data.user.id, email:data.user.email,
      emailConfirmed:Boolean(data.user.email_confirmed_at)};
  },
  service() {
    if (process.env.GROOKAI_VENDOR_SELLER_ADOPTION_ENABLED !== "true") return null;
    const runtime = getVendorSellerRuntime(); if (!runtime) return null;
    const admin = createServerAdminClient();
    return createSellerAdoptionService({ stripe: runtime.stripe, scope: runtime.config.scope,
      repo: createSellerAdoptionRepository(admin) });
  },
});
