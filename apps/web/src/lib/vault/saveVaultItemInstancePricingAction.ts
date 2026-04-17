"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";
import {
  normalizeVaultInstancePricingAmount,
  normalizeVaultInstancePricingCurrency,
  normalizeVaultInstancePricingMode,
  normalizeVaultInstancePricingNote,
  type VaultInstancePricingMode,
} from "@/lib/vaultInstancePricing";

export type SaveVaultItemInstancePricingInput = {
  instanceId: string;
  pricingMode: VaultInstancePricingMode;
  askingPriceAmount?: number | string | null;
  askingPriceCurrency?: string | null;
  askingPriceNote?: string | null;
};

export type SaveVaultItemInstancePricingResult =
  | {
      ok: true;
      instanceId: string;
      pricingMode: VaultInstancePricingMode;
      askingPriceAmount: number | null;
      askingPriceCurrency: string | null;
      askingPriceNote: string | null;
      gvviId: string | null;
    }
  | {
      ok: false;
      instanceId: string;
      message: string;
    };

export async function saveVaultItemInstancePricingAction(
  input: SaveVaultItemInstancePricingInput,
): Promise<SaveVaultItemInstancePricingResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      ok: false,
      instanceId: input.instanceId,
      message: "Sign in required.",
    };
  }

  const normalizedInstanceId = input.instanceId.trim();
  const pricingMode = normalizeVaultInstancePricingMode(input.pricingMode);

  if (!normalizedInstanceId || !pricingMode) {
    return {
      ok: false,
      instanceId: input.instanceId,
      message: "Pricing mode is invalid.",
    };
  }

  const askingPriceAmount =
    pricingMode === "asking" ? normalizeVaultInstancePricingAmount(input.askingPriceAmount) : null;
  const askingPriceCurrency =
    pricingMode === "asking" ? normalizeVaultInstancePricingCurrency(input.askingPriceCurrency) : null;
  const askingPriceNote = pricingMode === "asking" ? normalizeVaultInstancePricingNote(input.askingPriceNote) : null;

  if (pricingMode === "asking" && (askingPriceAmount === null || askingPriceCurrency === null)) {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      message: "Asking price requires both amount and currency.",
    };
  }

  if (
    pricingMode === "asking" &&
    input.askingPriceAmount !== null &&
    input.askingPriceAmount !== undefined &&
    askingPriceAmount === null
  ) {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      message: "Asking price amount must be a non-negative number.",
    };
  }

  const { data: instance, error: instanceError } = await client
    .from("vault_item_instances")
    .select("id,user_id,archived_at,gv_vi_id")
    .eq("id", normalizedInstanceId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();

  if (instanceError || !instance) {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      message: "Pricing could not be saved.",
    };
  }

  const { data, error } = await client
    .from("vault_item_instances")
    .update({
      pricing_mode: pricingMode,
      asking_price_amount: askingPriceAmount,
      asking_price_currency: askingPriceCurrency,
      asking_price_note: askingPriceNote,
    })
    .eq("id", normalizedInstanceId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .select("id,pricing_mode,asking_price_amount,asking_price_currency,asking_price_note,gv_vi_id")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      instanceId: normalizedInstanceId,
      message: "Pricing could not be saved.",
    };
  }

  const gvviId = typeof data.gv_vi_id === "string" ? data.gv_vi_id.trim() : null;
  revalidatePath("/vault");
  revalidatePath("/network");
  if (gvviId) {
    revalidatePath(`/vault/gvvi/${gvviId}`);
    revalidatePath(`/gvvi/${gvviId}`);
  }

  return {
    ok: true,
    instanceId: data.id,
    pricingMode: normalizeVaultInstancePricingMode(data.pricing_mode) ?? "market",
    askingPriceAmount: normalizeVaultInstancePricingAmount(data.asking_price_amount) ?? askingPriceAmount,
    askingPriceCurrency:
      typeof data.asking_price_currency === "string" ? data.asking_price_currency.trim().toUpperCase() : askingPriceCurrency,
    askingPriceNote:
      typeof data.asking_price_note === "string" && data.asking_price_note.trim().length > 0
        ? data.asking_price_note.trim()
        : askingPriceNote,
    gvviId,
  };
}
