import { NextRequest } from "next/server";
import { teamBody, teamClient, teamFailure, teamJson, teamUuid } from "@/lib/stores/storeTeamServer";
import { createStorePublicClient } from "@/lib/stores/storefrontServer";
import { storeCatalogPageIds } from "@/lib/stores/storeCatalogSearch.mjs";
import { getPublicCardPrintingOptions } from "@/lib/cards/getPublicCardPrintingOptions";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ storeId: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    const client = await teamClient(request), store = teamUuid((await context.params).storeId);
    const access = await client.rpc("vendor_store_team_workflows_v1", { p_store: store });
    if (access.error || !access.data?.enabled) throw access.error ?? new Error("Workflow unavailable");
    const q = (request.nextUrl.searchParams.get("q") ?? "").trim(), offset = Number(request.nextUrl.searchParams.get("offset") ?? 0);
    if (q.length < 2 || q.length > 120 || !/^[\p{L}\p{N}\s.'’:!&+/#-]+$/u.test(q)) throw new Error("Search with 2–120 letters, numbers or name characters.");
    if (!Number.isInteger(offset) || offset < 0 || offset > 10000) throw new Error("Invalid page");
    const publicClient = createStorePublicClient(), page = await storeCatalogPageIds(publicClient, q, offset);
    if (!page.ids.length) return teamJson({ more: false, cards: [] });
    const { data, error } = await publicClient.from("card_prints").select("id,gv_id,name,number,set_code,variant_key,printed_identity_modifier,sets(identity_model),image_source,image_path,image_url,image_alt_url,image_status,image_note").in("id", page.ids).order("name").order("gv_id");
    if (error) throw new Error("Catalog search unavailable");
    const rows = data ?? [], printings = await getPublicCardPrintingOptions(publicClient, rows.map(row => row.id));
    return teamJson({ more: page.more, cards: await Promise.all(rows.map(async row => {
      const set = (Array.isArray(row.sets) ? row.sets[0] : row.sets) as { identity_model?: string } | null;
      return { id: row.id, gv_id: row.gv_id, name: resolveDisplayIdentity({ ...row, set_identity_model: set?.identity_model }).display_name,
        number: row.number, set_code: row.set_code, image: (await resolveCardImageFieldsV1(row)).display_image_url,
        printings: printings.filter(p => p.card_print_id === row.id && p.printing_gv_id).map(p => ({ id: p.id, printing_gv_id: p.printing_gv_id, finish_label: p.finish_label })) };
    })) });
  } catch (error) { return teamFailure(error); }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const client = await teamClient(request, true), store = teamUuid((await context.params).storeId), body = await teamBody(request);
    const { data, error } = await client.rpc("vendor_store_team_add_card_v1", { p_store: store, p_request: teamUuid(String(body.request ?? "")), p_data: body.data });
    if (error) throw error;
    return teamJson(data);
  } catch (error) { return teamFailure(error); }
}
