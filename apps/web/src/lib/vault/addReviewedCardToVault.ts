import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { assertAuthenticatedVaultUser } from "@/lib/vault/assertAuthenticatedVaultUser";
import { getPublicCardPrintingOptions } from "@/lib/cards/getPublicCardPrintingOptions";
import { parseCollectorMoney, splitCollectorCost } from "./collectorMoney";
import { executeOwnerWriteV1 } from "@/lib/contracts/execute_owner_write_v1";
import {assertJungleEditionSelection,getJungleEditionResolution} from "@/lib/cards/jungleEditionResolution";

export async function addReviewedCardToVault(
  { client, userId, cardPrintId, name, formData }: {
    client: SupabaseClient;
    userId: string;
    cardPrintId: string;
    name: string;
    formData: FormData;
  },
) {
  await assertAuthenticatedVaultUser(client, userId);
  return executeOwnerWriteV1({
    execution_name: "add_reviewed_card_to_vault",
    actor_id: userId,
    write: async () => {
      const id = String(formData.get("request_id") ?? "");
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          .test(id)
      ) throw new Error("Reload the add form and try again.");
      const printingId = String(formData.get("card_printing_id") ?? "").trim();
      assertJungleEditionSelection(await getJungleEditionResolution(client,cardPrintId),cardPrintId,printingId);
      const quantity = Number(formData.get("quantity"));
      const cost = parseCollectorMoney(
        String(formData.get("total_paid") ?? ""),
      );
      const costs = splitCollectorCost(cost, quantity);
      const condition = String(formData.get("condition") ?? "Unspecified");
      if (
        !["Unspecified", "NM", "LP", "MP", "HP", "DMG"].includes(condition)
      ) throw new Error("Choose a supported condition.");
      if (formData.get("reviewed") !== "on") {
        throw new Error("Review this addition before saving.");
      }
      const admin = createServerAdminClient();
      const printings = await getPublicCardPrintingOptions(admin, [
        cardPrintId,
      ]);
      if (
        !printings.some((printing) => printing.id === printingId)
      ) throw new Error("Choose an exact governed printing.");
      const call = async (action: string, payload: Record<string, unknown>, allowMissing = false) => {
        const { data, error } = await admin.rpc("vault_intake_request_v1", {
          p_actor_user_id: userId,
          p_action: action,
          p_payload: payload,
        });
        if (error || data?.version !== 1 || typeof data.ok !== "boolean" ||
          typeof data.operation_id !== "string") {
          throw new Error("Saving is unavailable. Your review can be retried.");
        }
        if (!data.ok) {
          if (allowMissing && data.error?.code === "not_found") return null;
          throw new Error(data.error?.code === "intake_writes_disabled"
            ? "Saving is temporarily paused. Your review is retained."
            : "The addition could not be confirmed. Keep this review and retry.");
        }
        if (!Object.prototype.hasOwnProperty.call(data, "result")) {
          throw new Error("Saving could not be confirmed. Keep this review and retry.");
        }
        return data.result;
      };
      // The existing batch lock makes retries safe after a lost response or refresh.
      const previous = await call("batch.get", { id }, true);
      let revision = previous?.revision ?? 0;
      if (previous?.state !== "saved") {
        if (
          previous && previous.snapshot?.items?.[0]?.card_id !== cardPrintId
        ) throw new Error("This draft belongs to another card.");
        const snapshot = {
          items: [{
            id,
            card_id: cardPrintId,
            card_printing_id: printingId,
            quantity,
            condition,
            state: "confirmed",
            notes: "",
            copy_costs_cents: costs,
            allocation: {
              method: cost === null ? "unknown_cost_v1" : "manual_row_total_v1",
              quantity,
            },
          }],
          allocation_reviewed: true,
        };
        const saved = await call("batch.save", {
          id,
          revision,
          lot_id: null,
          title: `${name} · manual add`,
          currency: "USD",
          acquired_on: new Date().toISOString().slice(0, 10),
          tags: [],
          snapshot,
        });
        revision = saved.revision;
      }
      const committed = await call("batch.commit", { id, revision });
      const instanceIds: string[] = (committed.saved_items ?? []).flatMap((
        item: { instance_ids: string[] },
      ) => item.instance_ids);
      if (!instanceIds.length) {
        throw new Error(
          "No saved copies were returned. Retry this retained draft.",
        );
      }
      const { data: copies, error } = await admin.from("vault_item_instances")
        .select("id,gv_vi_id").eq("user_id", userId).in("id", instanceIds);
      if (error || copies?.length !== instanceIds.length) {
        throw new Error("Copies were saved. Retry to load their identities.");
      }
      return {
        success: true as const,
        gvvi_id: copies[0]?.gv_vi_id ?? null,
        gvvi_ids: copies.map((copy) => copy.gv_vi_id),
        quantity: instanceIds.length,
      };
    },
  });
}
