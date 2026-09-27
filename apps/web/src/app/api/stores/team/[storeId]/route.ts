import { NextRequest } from "next/server";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import { teamBody, teamClient, teamFailure, teamJson, teamUuid } from "@/lib/stores/storeTeamServer";
import type { TeamWorkspace } from "@/lib/stores/storeTeam";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ storeId: string }> };
export async function GET(request: NextRequest, context: Context) {
  try { const client = await teamClient(request); const store = teamUuid((await context.params).storeId);
    const { data, error } = await client.rpc("vendor_store_team_workspace_v1", { p_store: store,
      p_query: request.nextUrl.searchParams.get("q") ?? "", p_offset: Number(request.nextUrl.searchParams.get("offset") ?? 0) });
    if (error) throw error;
    const workspace = data as TeamWorkspace;
    workspace.items = await Promise.all(workspace.items.map(async item => {
      const image = await resolveCardImageFieldsV1(item as Parameters<typeof resolveCardImageFieldsV1>[0]);
      return { id: item.id, gv_vi_id: item.gv_vi_id, name: item.name, gv_id: item.gv_id, printing_gv_id: item.printing_gv_id,
        condition_label: item.condition_label, finish_label: item.finish_label, is_graded: item.is_graded,
        asking_price_amount: item.asking_price_amount, asking_price_currency: item.asking_price_currency,
        selected: item.selected, updated_at: item.updated_at, ineligible_reason: item.ineligible_reason, display_image_url: image.display_image_url, section_ids: item.section_ids ?? [] };
    }));
    return teamJson(workspace);
  } catch (error) { return teamFailure(error); }
}
export async function POST(request: NextRequest, context: Context) {
  try { const client = await teamClient(request, true); const store = teamUuid((await context.params).storeId); const body = await teamBody(request);
    const result = body.action === "branding" ? await client.rpc("vendor_store_team_brand_v1", {
      p_store: store, p_expected: body.expected, p_name: body.name, p_description: body.description,
    }) : await client.rpc("vendor_store_team_copy_v1", {
      p_store: store, p_instance: body.id, p_action: body.action, p_expected: body.expected, p_data: body.data,
    });
    if (result.error) throw result.error; return teamJson({ ok: true });
  } catch (error) { return teamFailure(error); }
}
