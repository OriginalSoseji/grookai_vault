import "server-only";

import type { User } from "@supabase/supabase-js";

import { createServerAdminClient } from "@/lib/supabase/admin";
import {
  resolveDatabaseGrookaiUserEntitlement,
  resolveStaticGrookaiUserEntitlement,
  type GrookaiEntitlementRecord,
  type GrookaiUserEntitlement,
} from "@/lib/entitlements/grookaiUserEntitlements";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isFounderEmergencyEntitlement(entitlement: GrookaiUserEntitlement) {
  return entitlement.tier === "founder_admin" && entitlement.source === "env_founder_allowlist";
}

function chooseBestRecord(records: GrookaiEntitlementRecord[], user: Pick<User, "id" | "email">) {
  const email = normalizeEmail(user.email);
  const active = records.filter((record) => record.is_active !== false);
  const byUserId = active.find((record) => record.user_id && record.user_id === user.id);
  if (byUserId) return byUserId;
  return active.find((record) => normalizeEmail(record.email) === email) ?? null;
}

export async function resolveServerUserEntitlement(user: User | null): Promise<GrookaiUserEntitlement> {
  const staticEntitlement = resolveStaticGrookaiUserEntitlement({ user });

  if (!user || isFounderEmergencyEntitlement(staticEntitlement)) {
    return staticEntitlement;
  }

  const email = normalizeEmail(user.email);
  if (!email && !user.id) {
    return staticEntitlement;
  }

  try {
    const admin = createServerAdminClient();
    const filters = [`user_id.eq.${user.id}`];
    if (email) {
      filters.push(`email.eq.${email}`);
    }

    const { data, error } = await admin
      .from("user_entitlements")
      .select("user_id,email,tier,role,features,is_active,source,notes")
      .or(filters.join(","));

    if (error) {
      return staticEntitlement;
    }

    const record = chooseBestRecord((data ?? []) as GrookaiEntitlementRecord[], user);
    return resolveDatabaseGrookaiUserEntitlement({ user, record }) ?? staticEntitlement;
  } catch {
    return staticEntitlement;
  }
}
