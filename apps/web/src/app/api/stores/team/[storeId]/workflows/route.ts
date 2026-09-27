import { NextRequest } from "next/server";
import { teamBody, teamClient, teamFailure, teamJson, teamUuid } from "@/lib/stores/storeTeamServer";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ storeId: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    const client = await teamClient(request), store = teamUuid((await context.params).storeId);
    const { data, error } = await client.rpc("vendor_store_team_workflows_v1", { p_store: store });
    if (error) throw error;
    return teamJson(data);
  } catch (error) { return teamFailure(error); }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const client = await teamClient(request, true), store = teamUuid((await context.params).storeId), body = await teamBody(request);
    if (!["create", "rename", "assign"].includes(String(body.action))) throw new Error("Invalid section action");
    const { data, error } = await client.rpc("vendor_store_team_section_v1", { p_store: store, p_action: body.action,
      p_request: body.request ?? null, p_section: body.section ?? null, p_expected: body.expected ?? null, p_data: body.data });
    if (error) throw error;
    return teamJson(data);
  } catch (error) { return teamFailure(error); }
}
