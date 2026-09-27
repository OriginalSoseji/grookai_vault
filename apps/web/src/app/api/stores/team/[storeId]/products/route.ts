import { NextRequest } from "next/server";
import { teamBody, teamClient, teamFailure, teamJson, teamUuid } from "@/lib/stores/storeTeamServer";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ storeId: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    const client = await teamClient(request), store = teamUuid((await context.params).storeId);
    const { data, error } = await client.rpc("vendor_store_team_products_v1", { p_store: store,
      p_product_id: request.nextUrl.searchParams.has("id") ? teamUuid(request.nextUrl.searchParams.get("id") ?? "") : null,
      p_offset: Number(request.nextUrl.searchParams.get("offset") ?? 0) });
    if (error) throw error;
    return teamJson(data);
  } catch (error) { return teamFailure(error); }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const client = await teamClient(request, true), store = teamUuid((await context.params).storeId), body = await teamBody(request);
    const { data, error } = await client.rpc("vendor_store_team_product_v1", { p_store: store, p_request: body.request ?? null,
      p_product_id: body.id ?? null, p_expected_version: body.version ?? null, p_action: body.action, p_data: body.data ?? {} });
    if (error) throw error;
    return teamJson(data);
  } catch (error) { return teamFailure(error); }
}
