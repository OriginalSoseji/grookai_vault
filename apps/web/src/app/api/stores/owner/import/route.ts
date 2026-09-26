import { createServerComponentClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { handleCustomImport } from "@/lib/stores/customProductImportHttp";
export const dynamic = "force-dynamic";
const handle = (request: Request) => handleCustomImport(request, {client:createServerComponentClient, origin:getSiteOrigin()});
export const GET = handle;
export const POST = handle;
