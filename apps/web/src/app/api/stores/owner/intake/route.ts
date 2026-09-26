import { NextRequest } from "next/server";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { parseBatchCommit } from "@/lib/stores/batchCommitInput";
import { batchCommitEnabled, batchCancellationEnabled, boundedIntakeBody, intakeContext, intakeFailure, intakeReply, ownedIntakeReceipt } from "@/lib/stores/batchCommitServer";
import { visualMatchingEnabled } from "@/lib/stores/visualMatchServer";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const auth = await intakeContext(request, false); if (auth.response) return auth.response;
  const allowed = auth.owner.capabilities.store_app && auth.owner.rollout.app_enabled;
  if (request.nextUrl.searchParams.has("batch")) {
    try { return intakeReply(await ownedIntakeReceipt(auth.client, auth.user.id, auth.owner.store!.id, request.nextUrl.searchParams.get("batch"), request.nextUrl.searchParams.get("item"))); }
    catch { return intakeReply({ error: "Submission unavailable" }, 404); }
  }
  let commit = false;
  if (allowed && batchCommitEnabled()) {
    const { data } = await createServerAdminClient().from("vendor_batch_intake_control").select("enabled").single();
    commit = data?.enabled === true;
  }
  return intakeReply({ commit, recognition: allowed && visualMatchingEnabled(), cancellation: batchCancellationEnabled() });
}
export async function POST(request: NextRequest) {
  const auth = await intakeContext(request); if (auth.response) return auth.response;
  try {
    const payload = parseBatchCommit(JSON.parse((await boundedIntakeBody(request, 16 * 1024)).toString("utf8")));
    const { data, error } = await createServerAdminClient().rpc("vendor_batch_intake_prepare_v1", { p_owner: auth.user.id, p_store: auth.owner.store!.id, p_data: payload });
    if (error) return intakeReply({ error: error.message }, error.code === "42501" ? 403 : 409);
    return intakeReply({ prepared: true, completed: Boolean(data?.completed_at) });
  } catch (error) { return intakeFailure(error); }
}
