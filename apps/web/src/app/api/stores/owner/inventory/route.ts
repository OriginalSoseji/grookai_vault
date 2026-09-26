import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { createStorePublicClient, STORE_NO_STORE } from "@/lib/stores/storefrontServer";
import { storeCatalogPageIds } from "@/lib/stores/storeCatalogSearch.mjs";
import type { StoreOwner } from "@/lib/stores/storefrontTypes";
import { inventoryId, inventorySettings, COPY_CONDITIONS } from "@/lib/stores/storeInventoryInput";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { getPublicCardPrintingOptions } from "@/lib/cards/getPublicCardPrintingOptions";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { addCardToVault } from "@/lib/vault/addCardToVault";
import { saveVaultItemInstancePricingAction } from "@/lib/vault/saveVaultItemInstancePricingAction";
import { saveVaultItemInstanceConditionAction } from "@/lib/vault/saveVaultItemInstanceConditionAction";
import { saveVaultItemInstanceIntentAction } from "@/lib/network/saveVaultItemInstanceIntentAction";
import { createWallSectionAction } from "@/lib/wallSections/createWallSectionAction";
import { getOwnerWallSectionMemberships } from "@/lib/wallSections/getOwnerWallSectionMemberships";
export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: STORE_NO_STORE });
async function access() {
  const client = await createServerComponentClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Sign in required");
  const { data, error } = await client.rpc("vendor_store_owner_v1");
  const owner = data as StoreOwner | null;
  if (error || !owner?.store || !owner.capabilities.store_app || !owner.rollout.app_enabled) throw new Error("Store access unavailable");
  return { client, user, owner };
}
async function ownedCopy(context: Awaited<ReturnType<typeof access>>, id: string) {
  const { data, error } = await context.client.from("vault_item_instances")
    .select("id,gv_vi_id,condition_label,intent,pricing_mode,asking_price_amount,asking_price_currency,asking_price_note,slab_cert_id")
    .eq("id", id).eq("user_id", context.user.id).is("archived_at", null).maybeSingle();
  if (error || !data) throw new Error("Copy unavailable");
  return data;
}
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Inventory request failed.";
  return json({ error: message }, message === "Sign in required" ? 401 : message === "Store access unavailable" ? 403 : 400);
}
export async function GET(request: NextRequest) {
  try {
    const context = await access();
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const copy = await ownedCopy(context, inventoryId(id));
      const membership = await getOwnerWallSectionMemberships(context.user.id, id);
      if (membership.loadError) throw new Error("Sections could not be loaded.");
      const { data, error } = await context.client.from("vendor_store_items").select("instance_id").eq("store_id", context.owner.store!.id).eq("instance_id", id).maybeSingle();
      if (error) throw new Error("Store selection could not be loaded.");
      return json({ ...copy, selected: Boolean(data), sections: membership.sections.filter(s => s.is_member && s.is_active).map(s => s.id) });
    }
    const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
    if (q.length < 2 || q.length > 120 || !/^[\p{L}\p{N}\s.'’:!&+/#-]+$/u.test(q)) throw new Error("Search with 2–120 letters, numbers or name characters.");
    const offset = Math.min(10000, Math.max(0, Number(request.nextUrl.searchParams.get("offset")) || 0));
    if (!Number.isInteger(offset)) throw new Error("Invalid page.");
    const publicClient = createStorePublicClient();
    // The governed public search RPC filters before the per-card visibility
    // boundary. A direct wildcard OR forces an RLS scan of the entire catalog.
    const page = await storeCatalogPageIds(publicClient, q, offset);
    if (!page.ids.length) return json({ more: false, cards: [] });
    const { data, error } = await publicClient.from("card_prints").select("id,gv_id,name,number,set_code,variant_key,printed_identity_modifier,sets(identity_model),image_source,image_path,image_url,image_alt_url,image_status,image_note")
      .in("id", page.ids).order("name").order("gv_id");
    if (error) throw new Error("Catalog search unavailable.");
    const rows = data ?? [];
    const printings = await getPublicCardPrintingOptions(publicClient, rows.map(row => row.id));
    return json({ more: page.more, cards: await Promise.all(rows.map(async row => {
      const set = (Array.isArray(row.sets) ? row.sets[0] : row.sets) as { identity_model?: string } | null;
      return { id: row.id, gv_id: row.gv_id, name: resolveDisplayIdentity({ ...row, set_identity_model: set?.identity_model }).display_name, number: row.number, set_code: row.set_code, image: (await resolveCardImageFieldsV1(row)).display_image_url, printings: printings.filter(p => p.card_print_id === row.id && p.printing_gv_id).map(p => ({ id: p.id, printing_gv_id: p.printing_gv_id, finish_label: p.finish_label })) };
    })) });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== getSiteOrigin()) || (!origin && !/^Bearer \S+$/i.test(request.headers.get("authorization") ?? ""))) return json({ error: "Invalid request origin" }, 403);
  let mutationStarted = false;
  try {
    const context = await access();
    const body = await request.json() as Record<string, unknown>;
    if (body.action === "section") {
      if (typeof body.name !== "string") throw new Error("Enter a section name.");
      const result = await createWallSectionAction({ name: body.name });
      if (!result.ok) throw new Error(result.message);
      return json({ ok: true });
    }
    if (body.action === "create") {
      const cardId = inventoryId(body.card_id), printingId = inventoryId(body.printing_id);
      if (!COPY_CONDITIONS.includes(body.condition as typeof COPY_CONDITIONS[number])) throw new Error("Choose a condition.");
      const publicClient = createStorePublicClient();
      const { data: card, error } = await publicClient.from("card_prints").select("id,gv_id,name").eq("id", cardId).maybeSingle();
      const printings = await getPublicCardPrintingOptions(publicClient, [cardId]);
      if (error || !card || !printings.some(p => p.id === printingId && p.printing_gv_id)) throw new Error("Choose an available printing for this card.");
      mutationStarted = true;
      const result = await addCardToVault({ client: context.client, userId: context.user.id, cardPrintId: card.id, gvId: card.gv_id, name: card.name, cardPrintingId: printingId, conditionLabel: String(body.condition) });
      const { data: copy, error: readError } = await context.client.from("vault_item_instances").select("id,gv_vi_id").eq("user_id", context.user.id).eq("gv_vi_id", result.gvvi_id).is("archived_at", null).single();
      if (readError || !copy) throw new Error("Could not confirm the new copy.");
      return json(copy);
    }
    if (body.action !== "save") throw new Error("Unknown inventory action.");
    const id = inventoryId(body.id);
    const copy = await ownedCopy(context, id);
    // Slab condition is immutable here, including missing or non-raw condition labels.
    const settings = inventorySettings(copy.slab_cert_id ? { ...body, condition: "NM" } : body);
    const membership = await getOwnerWallSectionMemberships(context.user.id, id);
    if (membership.loadError || settings.sections.some(id => !membership.sections.some(s => s.id === id && s.is_active))) throw new Error("Choose your own active sections.");
    mutationStarted = true;
    // Existing owner-authorized writers remain the authority. Retrying settings never creates a copy.
    const check = (result: { ok: boolean; message?: string }) => { if (!result.ok) throw new Error(result.message || "Copy details could not be saved."); };
    if (!copy.slab_cert_id) check(await saveVaultItemInstanceConditionAction({ instanceId: id, conditionLabel: settings.condition }));
    check(await saveVaultItemInstancePricingAction({ instanceId: id, pricingMode: settings.mode, askingPriceAmount: settings.amount, askingPriceCurrency: settings.currency, askingPriceNote: copy.asking_price_note }));
    check(await saveVaultItemInstanceIntentAction({ instanceId: id, intent: settings.intent }));
    for (const section of membership.sections.filter(s => s.is_active)) {
      const included = settings.sections.includes(section.id);
      if (included !== section.is_member) {
        const { error } = await context.client.rpc("vault_set_copy_section_memberships_v1", { p_instance_ids: [id], p_section_id: section.id, p_add: included });
        if (error) throw new Error("Section assignment could not be saved.");
      }
      if (included && !context.owner.sections.find(s => s.id === section.id)?.selected) {
        const { error } = await context.client.rpc("vendor_store_select_section_v1", { p_section_id: section.id, p_selected: true, p_position: Math.min(19, Math.max(0, section.position)) });
        if (error) throw new Error("Store section could not be selected.");
      }
    }
    const { error } = await context.client.rpc("vendor_store_select_item_v1", { p_instance_id: id, p_selected: settings.selected });
    if (error) throw new Error("Details saved, but store selection could not be saved. Check the eligibility reason in inventory and your Account & sharing settings.");
    return json({ ok: true });
  } catch (error) {
    if (mutationStarted) return json({ error: "Some changes may already be saved. " + (error instanceof Error ? error.message : "Check inventory before trying again.") }, 409);
    return failure(error);
  }
}
