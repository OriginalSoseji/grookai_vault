import type { SupabaseClient } from "@supabase/supabase-js";
import { escapePostgrestLikePattern } from "@/lib/publicSetCanonicalization";

type PublicSetCodeRow = {
  code: string | null;
};

export async function resolveVisiblePublicSetCodes(
  supabase: SupabaseClient,
  normalizedCode: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("sets")
    .select("code")
    .ilike("code", escapePostgrestLikePattern(normalizedCode));

  if (error) {
    throw new Error(`[sets.resolve-exact-codes] ${error.message}`);
  }

  return Array.from(new Set(((data ?? []) as PublicSetCodeRow[]).map((row) => row.code?.trim() ?? "").filter(Boolean)));
}
