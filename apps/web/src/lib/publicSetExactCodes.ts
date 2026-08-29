import type { SupabaseClient } from "@supabase/supabase-js";
import { escapePostgrestLikePattern } from "@/lib/publicSetCanonicalization";

type PublicSetCodeRow = {
  id: string | null;
  code: string | null;
};

export type PublicSetReference = {
  id: string;
  code: string;
};

export async function resolveVisiblePublicSetReferences(
  supabase: SupabaseClient,
  normalizedCode: string,
  gameCode?: string | null,
): Promise<PublicSetReference[]> {
  let query = supabase
    .from("sets")
    .select("id,code")
    .ilike("code", escapePostgrestLikePattern(normalizedCode));

  const normalizedGameCode = gameCode?.trim().toLowerCase();
  if (normalizedGameCode) {
    query = query.eq("game", normalizedGameCode);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`[sets.resolve-exact-codes] ${error.message}`);
  }

  const references = new Map<string, PublicSetReference>();
  for (const row of (data ?? []) as PublicSetCodeRow[]) {
    const id = row.id?.trim();
    const code = row.code?.trim();
    if (id && code) {
      references.set(id, { id, code });
    }
  }
  return [...references.values()];
}

export async function resolveVisiblePublicSetCodes(
  supabase: SupabaseClient,
  normalizedCode: string,
  gameCode?: string | null,
): Promise<string[]> {
  const references = await resolveVisiblePublicSetReferences(
    supabase,
    normalizedCode,
    gameCode,
  );
  return Array.from(new Set(references.map((reference) => reference.code)));
}
