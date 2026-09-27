import { NextRequest } from "next/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { teamBody, teamClient, teamFailure, teamJson } from "@/lib/stores/storeTeamServer";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try { const client = await teamClient(request); const { data, error } = await client.rpc("vendor_store_team_owner_v1");
    if (error) throw error; return teamJson(data); } catch (error) { return teamFailure(error); }
}
export async function POST(request: NextRequest) {
  try { const client = await teamClient(request, true); const body = await teamBody(request);
    if (!["invite", "permissions", "revoke", "cancel"].includes(String(body.action))) throw new Error("Invalid action");
    const { data, error } = await client.rpc("vendor_store_team_change_v1", {
      p_action: body.action, p_email: body.email ?? null, p_subject: body.subject ?? null, p_permissions: body.permissions ?? null,
    });
    if (error) throw error;
    return teamJson(data?.token ? { url: `${getSiteOrigin()}/account/store/team/accept?token=${encodeURIComponent(data.token)}`, expires_at: data.expires_at } : { ok: true });
  } catch (error) { return teamFailure(error); }
}
