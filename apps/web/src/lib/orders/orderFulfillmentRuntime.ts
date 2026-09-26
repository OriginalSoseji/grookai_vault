import "server-only";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { fulfillmentEnabled, fulfillmentHandler, fulfillmentService } from "./orderFulfillment";
export function canOfferFulfillment() { try { return fulfillmentEnabled(process.env, getSiteOrigin()); } catch { return false; } }
export const recordOrderFulfillment = fulfillmentHandler({ origin: getSiteOrigin,
  async authenticate() { const client = await createServerComponentClient(), { data, error } = await client.auth.getUser(); return error ? null : data.user?.id ?? null; },
  service() { return fulfillmentEnabled(process.env, getSiteOrigin()) ? fulfillmentService(createServerAdminClient()) : null; },
});
