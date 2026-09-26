import { NextRequest } from "next/server";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { boundedIntakeBody, intakeContext, intakeFailure, intakeReply, ownedIntakeReceipt, verifyIntakeMedia } from "@/lib/stores/batchCommitServer";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: NextRequest) {
  const auth = await intakeContext(request); if (auth.response) return auth.response;
  try {
    const input = JSON.parse((await boundedIntakeBody(request, 1024)).toString("utf8"));
    const receipt = await ownedIntakeReceipt(auth.client, auth.user.id, auth.owner.store!.id, input.batch_id, input.item_id);
    if (!receipt.completed_at) {
      await verifyIntakeMedia(receipt, "front");
      if (receipt.request.back_sha256) await verifyIntakeMedia(receipt, "back");
    }
    const { data, error } = await createServerAdminClient().rpc("vendor_batch_intake_finish_v1", { p_owner: auth.user.id, p_store: auth.owner.store!.id, p_batch: receipt.batch_id, p_item: receipt.item_id });
    if (error) return intakeReply({ error: error.message }, error.code === "42501" ? 403 : 409);
    return intakeReply(data);
  } catch (error) { return intakeFailure(error); }
}
