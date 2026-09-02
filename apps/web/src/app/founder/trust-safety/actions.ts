"use server";

import { revalidatePath } from "next/cache";
import { requireFounderAccess } from "@/lib/founder/requireFounderAccess";
import { createServerAdminClient } from "@/lib/supabase/admin";

const TRUST_REPORT_STATUSES = new Set([
  "open",
  "reviewing",
  "actioned",
  "dismissed",
]);

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function setTrustReportStatusAction(formData: FormData) {
  await requireFounderAccess("/founder/trust-safety");

  const reportId = normalizeText(formData.get("report_id"));
  const status = normalizeText(formData.get("status"));
  if (!reportId || !TRUST_REPORT_STATUSES.has(status)) {
    throw new Error("A valid report and review status are required.");
  }

  const admin = createServerAdminClient();
  const { error } = await admin
    .from("trust_reports")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", reportId);

  if (error) {
    throw new Error(`Trust report could not be updated: ${error.message}`);
  }

  revalidatePath("/founder");
  revalidatePath("/founder/trust-safety");
}
