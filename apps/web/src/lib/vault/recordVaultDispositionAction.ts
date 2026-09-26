"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";
import { executeOwnerWriteV1 } from "@/lib/contracts/execute_owner_write_v1";
import { DispositionError, recordOwnerDisposition, type DispositionReceipt } from "@/lib/vault/vaultDisposition";

export async function recordVaultDispositionAction(input: unknown): Promise<
  { ok: true; receipt: DispositionReceipt } | { ok: false; message: string }
> {
  try {
    const client = await createServerComponentClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { ok: false, message: "Sign in required." };
    const receipt = await executeOwnerWriteV1({
      execution_name: "record_exact_copy_disposition",
      actor_id: user.id,
      // The authenticated RPC remains the mutation authority, including its lock.
      write: context => recordOwnerDisposition(client, user.id, input, context.adminClient),
    });
    revalidatePath("/", "layout");
    revalidatePath("/vault");
    revalidatePath("/account/store");
    revalidatePath(`/vault/gvvi/${receipt.gvviId}`);
    revalidatePath(`/gvvi/${receipt.gvviId}`);
    return { ok: true, receipt };
  } catch (error) {
    return { ok: false, message: error instanceof DispositionError ? error.message : "The transaction could not be confirmed. Refresh to check its status before trying again." };
  }
}
