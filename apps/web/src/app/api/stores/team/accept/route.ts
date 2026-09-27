import { NextRequest } from "next/server";
import { teamBody, teamClient, teamFailure, teamJson } from "@/lib/stores/storeTeamServer";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try { const client = await teamClient(request, true); const body = await teamBody(request);
    const { data, error } = await client.rpc("vendor_store_team_accept_v1", { p_token: body.token });
    if (error) throw error; return teamJson({ store_id: data });
  } catch (error) { return teamFailure(error); }
}
