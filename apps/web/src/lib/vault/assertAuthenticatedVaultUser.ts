import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function assertAuthenticatedVaultUser(
  client: SupabaseClient,
  expectedUserId: string,
) {
  const normalizedExpectedUserId = expectedUserId.trim();
  if (!normalizedExpectedUserId) {
    throw new Error("Vault operation requires an authenticated user id.");
  }

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user || user.id !== normalizedExpectedUserId) {
    throw new Error("Vault operation requires the current authenticated owner.");
  }

  return user;
}
