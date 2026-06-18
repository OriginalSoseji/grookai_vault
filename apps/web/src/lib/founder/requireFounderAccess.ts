import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { resolveServerUserEntitlement } from "@/lib/entitlements/resolveServerUserEntitlement";
import { resolveStaticGrookaiUserEntitlement } from "@/lib/entitlements/grookaiUserEntitlements";

export function isFounderUser(user: Pick<User, "email"> | null | undefined) {
  return resolveStaticGrookaiUserEntitlement({ user }).capabilities.canUseFounderTools;
}

export async function getFounderAuthUser() {
  const { user } = await requireServerUser("/founder");
  const entitlement = await resolveServerUserEntitlement(user);
  return entitlement.capabilities.canUseFounderTools ? user : null;
}

export async function requireFounderAccess(nextPath: string) {
  const { user } = await requireServerUser(nextPath);
  const entitlement = await resolveServerUserEntitlement(user);

  if (!entitlement.capabilities.canUseFounderTools) {
    redirect("/");
  }

  return { user, entitlement };
}
