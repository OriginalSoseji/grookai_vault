"use server";

import { normalizeVaultIntent, type VaultIntent } from "@/lib/network/intent";

export type SaveVaultItemIntentInput = {
  itemId: string;
  intent: VaultIntent;
};

export type SaveVaultItemIntentResult =
  | {
      ok: true;
      itemId: string;
      intent: VaultIntent;
    }
  | {
      ok: false;
      itemId: string;
      message: string;
    };

export async function saveVaultItemIntentAction(
  input: SaveVaultItemIntentInput,
): Promise<SaveVaultItemIntentResult> {
  const nextIntent = normalizeVaultIntent(input.intent);
  const normalizedItemId = input.itemId.trim();
  if (!normalizedItemId || !nextIntent) {
    return {
      ok: false,
      itemId: input.itemId,
      message: "Vault intent is invalid.",
    };
  }

  // LOCK: Do not read or write vault_items.intent for public intent logic.
  // LOCK: Intent authority is vault_item_instances.intent via exact-copy actions.
  return {
    ok: false,
    itemId: normalizedItemId,
    message:
      "Grouped vault intent is legacy. Update exact-copy intent instead.",
  };
}
