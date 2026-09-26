import { NextRequest } from "next/server";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { COPY_PHOTO_MAX_BYTES } from "@/lib/stores/storeCopyPhoto";
import { VAULT_INSTANCE_MEDIA_BUCKET } from "@/lib/vaultInstanceMedia";
import { boundedIntakeBody, intakeContext, intakeFailure, intakeMediaPath, intakeReply, ownedIntakeReceipt, validateIntakeImage, verifyIntakeMedia } from "@/lib/stores/batchCommitServer";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: NextRequest) {
  const auth = await intakeContext(request); if (auth.response) return auth.response;
  try {
    const side = request.nextUrl.searchParams.get("side");
    if (side !== "front" && side !== "back") throw new Error("Choose a scan side.");
    const receipt = await ownedIntakeReceipt(auth.client, auth.user.id, auth.owner.store!.id, request.nextUrl.searchParams.get("batch"), request.nextUrl.searchParams.get("item"));
    if (receipt.completed_at) return intakeReply({ uploaded: true });
    const expected = receipt.request[`${side}_sha256`]; if (!expected) throw new Error("Scan side unavailable.");
    const bytes = await boundedIntakeBody(request, COPY_PHOTO_MAX_BYTES);
    const contentType = await validateIntakeImage(bytes, expected);
    const { error } = await createServerAdminClient().storage.from(VAULT_INSTANCE_MEDIA_BUCKET)
      .upload(intakeMediaPath(receipt, side), bytes, { contentType, upsert: false, cacheControl: "0" });
    // Reconcile ambiguous responses; never overwrite or delete after a timeout.
    if (error) await verifyIntakeMedia(receipt, side);
    return intakeReply({ uploaded: true });
  } catch (error) { return intakeFailure(error); }
}
