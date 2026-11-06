"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";
import { executeOwnerWriteV1 } from "@/lib/contracts/execute_owner_write_v1";
import { parseCollectorMoney } from "./collectorMoney";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function saveCollectorBulkIntent(ids: string[], intent: string) {
  const client = await createServerComponentClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { ok: false, message: "Sign in required." };
  const selected = [...new Set(ids)];
  if (
    !selected.length || selected.length > 250 ||
    selected.some((id) => !uuid.test(id)) ||
    !["hold", "trade", "sell", "showcase"].includes(intent)
  ) {
    return {
      ok: false,
      message: "Choose 1–250 exact copies and a supported intent.",
    };
  }
  try {
    await executeOwnerWriteV1({
      execution_name: "collector_bulk_intent",
      actor_id: user.id,
      write: async () => {
        const { data: owned, error } = await client.from("vault_item_instances")
          .select("id").eq("user_id", user.id).is("archived_at", null).in(
            "id",
            selected,
          );
        if (error || owned?.length !== selected.length) {
          throw new Error("Selection changed. Reload your copies.");
        }
        const { data: updated, error: updateError } = await client.from(
          "vault_item_instances",
        ).update({ intent }).eq("user_id", user.id).is("archived_at", null).in(
          "id",
          selected,
        ).select("id,intent");
        if (
          updateError || updated?.length !== selected.length ||
          updated.some((row) => row.intent !== intent)
        ) {
          throw new Error(
            "The full selection could not be verified. Reload before retrying.",
          );
        }
      },
    });
    revalidatePath("/vault");
    revalidatePath("/vault/workspace");
    return { ok: true, message: `${selected.length} exact copies updated.` };
  } catch {
    return {
      ok: false,
      message:
        "The full selection could not be verified. Reload before retrying.",
    };
  }
}

export async function recordCollectorOutcome(
  input: {
    instanceId: string;
    type: "sale" | "trade";
    amount: string;
    counterparty: string;
    received: string;
    cashDirection: string;
    cashAmount: string;
  },
) {
  const client = await createServerComponentClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { ok: false, message: "Sign in required." };
  try {
    if (
      !uuid.test(input.instanceId) || !["sale", "trade"].includes(input.type)
    ) throw new Error();
    const amount = input.type === "sale"
      ? parseCollectorMoney(input.amount)
      : null;
    const cash = input.type === "trade" && input.cashDirection !== "none"
      ? parseCollectorMoney(input.cashAmount)
      : null;
    if (input.type === "sale" && (amount === null || amount <= 0)) {
      return {
        ok: false,
        message: "Enter the actual sale price, greater than zero.",
      };
    }
    if (
      input.type === "trade" &&
      (!input.received.trim() || input.received.length > 1000)
    ) {
      return {
        ok: false,
        message: "Describe what you received in this trade.",
      };
    }
    if (
      input.counterparty.length > 200 ||
      !["none", "paid", "received"].includes(input.cashDirection) ||
      (input.cashDirection !== "none" && input.type === "trade" &&
        (!cash || cash <= 0))
    ) throw new Error();
    await executeOwnerWriteV1({
      execution_name: "collector_record_exact_outcome",
      actor_id: user.id,
      write: async () => {
        const { data, error } = await client.rpc(
          "vault_record_exact_instance_disposition_v2",
          {
            p_instance_id: input.instanceId,
            p_disposition_type: input.type,
            p_sale_price_amount: amount === null ? null : amount / 100,
            p_sale_price_currency: amount === null ? null : "USD",
            p_counterparty_label: input.counterparty.trim() || null,
            p_trade_received_description: input.type === "trade"
              ? input.received.trim()
              : null,
            p_trade_cash_direction: cash === null ? null : input.cashDirection,
            p_trade_cash_amount: cash === null ? null : cash / 100,
            p_trade_cash_currency: cash === null ? null : "USD",
          },
        );
        if (
          error || data?.archived_instance_id !== input.instanceId ||
          data?.disposition_type !== input.type || !data.disposition_id
        ) throw new Error();
      },
    });
    revalidatePath("/vault");
    revalidatePath("/vault/workspace");
    return {
      ok: true,
      message: "Outcome recorded. This exact copy has left your active Vault.",
    };
  } catch {
    return {
      ok: false,
      message:
        "Outcome could not be confirmed. Reload the exact copy before retrying.",
    };
  }
}
