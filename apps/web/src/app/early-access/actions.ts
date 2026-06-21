"use server";

import { redirect } from "next/navigation";
import { createPublicServerClient } from "@/lib/supabase/publicServer";

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const EARLY_ACCESS_SOURCE = "early_access_page";

function normalizeEmail(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function buildRedirect(status: "joined" | "exists" | "invalid" | "error") {
  const params = new URLSearchParams({ status });
  return `/early-access?${params.toString()}`;
}

export async function joinEarlyAccessAction(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));

  if (!email || email.length > 320 || !EMAIL_PATTERN.test(email)) {
    redirect(buildRedirect("invalid"));
  }

  const supabase = createPublicServerClient(0);
  const { error } = await supabase
    .from("waitlist")
    .insert({
      email,
      source: EARLY_ACCESS_SOURCE,
    });

  if (error?.code === "23505") {
    redirect(buildRedirect("exists"));
  }

  if (error) {
    redirect(buildRedirect("error"));
  }

  redirect(buildRedirect("joined"));
}
