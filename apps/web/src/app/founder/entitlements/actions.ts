"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireFounderAccess } from "@/lib/founder/requireFounderAccess";
import { createServerAdminClient } from "@/lib/supabase/admin";

const TIER_VALUES = ["free", "premium", "vendor", "founder_admin"] as const;
const ROLE_VALUES = ["collector", "subscriber", "vendor", "founder", "internal"] as const;
const FEATURE_KEYS = [
  "assistant",
  "vendor_tools",
  "founder_tools",
  "grookai_intelligence",
  "internal_debug",
  "catalog_audits",
] as const;

type EntitlementTier = (typeof TIER_VALUES)[number];
type EntitlementRole = (typeof ROLE_VALUES)[number];
type FeatureKey = (typeof FEATURE_KEYS)[number];

function normalizeOptionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeEmail(value: FormDataEntryValue | null) {
  return normalizeOptionalText(value)?.toLowerCase() ?? null;
}

function resolveTier(value: FormDataEntryValue | null): EntitlementTier {
  if (typeof value === "string" && TIER_VALUES.includes(value as EntitlementTier)) {
    return value as EntitlementTier;
  }

  return "free";
}

function resolveRole(value: FormDataEntryValue | null, tier: EntitlementTier): EntitlementRole {
  if (typeof value === "string" && ROLE_VALUES.includes(value as EntitlementRole)) {
    return value as EntitlementRole;
  }

  if (tier === "founder_admin") return "founder";
  if (tier === "vendor") return "vendor";
  if (tier === "premium") return "subscriber";
  return "collector";
}

function baseFeaturesForTier(tier: EntitlementTier): Record<FeatureKey, boolean> {
  return {
    assistant: tier === "premium" || tier === "vendor" || tier === "founder_admin",
    vendor_tools: tier === "vendor" || tier === "founder_admin",
    founder_tools: tier === "founder_admin",
    grookai_intelligence: tier === "vendor" || tier === "founder_admin",
    internal_debug: tier === "founder_admin",
    catalog_audits: tier === "founder_admin",
  };
}

function resolveFeatures(formData: FormData, tier: EntitlementTier) {
  const base = baseFeaturesForTier(tier);

  for (const key of FEATURE_KEYS) {
    const fieldName = `feature_${key}`;
    if (formData.has(fieldName)) {
      base[key] = formData.getAll(fieldName).includes("on");
    }
  }

  return base;
}

function buildRedirect(status: string, message: string) {
  const params = new URLSearchParams({ status, message });
  return `/founder/entitlements?${params.toString()}`;
}

function mapMutationMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Entitlement mutation failed.";
}

export async function saveFounderEntitlementAction(formData: FormData) {
  await requireFounderAccess("/founder/entitlements");

  const id = normalizeOptionalText(formData.get("id"));
  const userId = normalizeOptionalText(formData.get("user_id"));
  const email = normalizeEmail(formData.get("email"));
  const tier = resolveTier(formData.get("tier"));
  const role = resolveRole(formData.get("role"), tier);
  const features = resolveFeatures(formData, tier);
  const isActive = !formData.has("is_active") || formData.getAll("is_active").includes("on");
  const notes = normalizeOptionalText(formData.get("notes"));

  if (!userId && !email) {
    redirect(buildRedirect("error", "Email or user id is required."));
  }

  const admin = createServerAdminClient();
  const payload = {
    user_id: userId,
    email,
    tier,
    role,
    features,
    is_active: isActive,
    source: "founder_ui",
    notes,
  };

  try {
    if (id) {
      const { error } = await admin
        .from("user_entitlements")
        .update(payload)
        .eq("id", id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await admin
        .from("user_entitlements")
        .insert(payload);

      if (error) {
        throw error;
      }
    }
  } catch (error) {
    redirect(buildRedirect("error", mapMutationMessage(error)));
  }

  revalidatePath("/founder");
  revalidatePath("/founder/entitlements");
  redirect(buildRedirect("saved", id ? "Entitlement updated." : "Entitlement created."));
}

export async function setFounderEntitlementActiveAction(formData: FormData) {
  await requireFounderAccess("/founder/entitlements");

  const id = normalizeOptionalText(formData.get("id"));
  const isActive = formData.get("is_active") === "true";

  if (!id) {
    redirect(buildRedirect("error", "Entitlement id is required."));
  }

  const admin = createServerAdminClient();
  const { error } = await admin
    .from("user_entitlements")
    .update({
      is_active: isActive,
      source: "founder_ui",
    })
    .eq("id", id);

  if (error) {
    redirect(buildRedirect("error", mapMutationMessage(error)));
  }

  revalidatePath("/founder");
  revalidatePath("/founder/entitlements");
  redirect(buildRedirect("saved", isActive ? "Entitlement reactivated." : "Entitlement deactivated."));
}
