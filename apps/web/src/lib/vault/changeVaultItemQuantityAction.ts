"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";
import {
  updateVaultItemQuantity,
  type UpdateVaultItemQuantityResult,
} from "@/lib/vault/updateVaultItemQuantity";

export type VaultQuantityMutationInput = {
  itemId: string;
  type: "increment" | "decrement";
};

export async function changeVaultItemQuantityAction(
  input: VaultQuantityMutationInput,
): Promise<UpdateVaultItemQuantityResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Sign in required.");
  }

  const result = await updateVaultItemQuantity({
    type: input.type,
    client,
    userId: user.id,
    itemId: input.itemId,
  });

  revalidatePath("/vault");
  return result;
}
