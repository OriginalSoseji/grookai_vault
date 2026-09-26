import { NextRequest } from "next/server";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { inventoryId } from "@/lib/stores/storeInventoryInput";
import { batchCancellationEnabled, boundedIntakeBody, intakeContext, intakeFailure, intakeReply } from "@/lib/stores/batchCommitServer";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== getSiteOrigin()) return intakeReply({ error: "Invalid request origin" }, 403);
  const auth = await intakeContext(request, false); if (auth.response) return auth.response;
  if (!batchCancellationEnabled()) return intakeReply({ error: "Cancellation is not enabled here. Your saved attempt is retained." }, 503);
  try {
    const input = JSON.parse((await boundedIntakeBody(request, 1024)).toString("utf8"));
    const { data, error } = await createServerAdminClient().rpc("vendor_batch_intake_cancel_v1", {
      p_owner: auth.user.id, p_store: auth.owner.store!.id,
      p_batch: inventoryId(input.batch_id), p_item: inventoryId(input.item_id),
    });
    if (error) return intakeReply({ error: error.message }, error.code === "42501" ? 403 : 409);
    return intakeReply(data);
  } catch (error) { return intakeFailure(error); }
}
