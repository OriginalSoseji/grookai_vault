import "server-only";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { readAcquisitionConfig } from "./orderAcquisitionPolicy";
import { createAcquisitionRepository, createAcquisitionService } from "./orderAcquisitionService";
import { createAcquisitionHandlers } from "./orderAcquisitionHttp";
export function acquisitionAvailable() { try { return readAcquisitionConfig(process.env, getSiteOrigin()) !== null; } catch { return false; } }
export const acquisitionHandler = createAcquisitionHandlers({
  async authenticate() { const client = await createServerComponentClient(), { data, error } = await client.auth.getUser();return error ? null : data.user?.id ?? null; },
  origin: getSiteOrigin,
  service() { const config = readAcquisitionConfig(process.env, getSiteOrigin());return config ? createAcquisitionService(createAcquisitionRepository(createServerAdminClient()), config) : null; },
});
