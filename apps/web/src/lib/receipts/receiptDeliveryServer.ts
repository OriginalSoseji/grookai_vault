import "server-only";
import { createServerComponentClient } from "@/lib/supabase/server";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { receiptDeliveryService, receiptSender } from "../../../../../backend/receipts/delivery_v1.mjs";

export async function receiptServiceForUser() {
  const owner = await createServerComponentClient();
  const { data: { user }, error } = await owner.auth.getUser();
  if (error || !user) return null;
  return receiptDeliveryService({ owner, admin: createServerAdminClient(), ownerId: user.id,
    sender: receiptSender({ env: process.env }) });
}
