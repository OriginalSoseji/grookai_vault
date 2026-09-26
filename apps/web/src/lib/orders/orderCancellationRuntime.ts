import "server-only";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { cancellationEnabled, cancellationHandler, cancellationService } from "./orderCancellation";
export function canOfferCancellation() { try { return cancellationEnabled(process.env, getSiteOrigin()); } catch { return false; } }
export const cancelOrder = cancellationHandler({
  origin: getSiteOrigin,
  async authenticate() { const client = await createServerComponentClient(), { data, error } = await client.auth.getUser();return error ? null : data.user?.id ?? null; },
  service() { return cancellationEnabled(process.env, getSiteOrigin()) ? cancellationService(createServerAdminClient()) : null; },
});
