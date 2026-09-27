import { NextRequest } from "next/server";
import { teamClient, teamFailure, teamJson } from "@/lib/stores/storeTeamServer";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try { const client = await teamClient(request); const { data, error } = await client.rpc("vendor_store_team_stores_v1");
    if (error) throw error; return teamJson(data); } catch (error) { return teamFailure(error); }
}
