import type { SupabaseClient } from "@supabase/supabase-js";

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
  const normalizedGameCode = gameCode?.trim().toLowerCase();
  const { data, error } = await supabase.rpc("resolve_visible_set_references_v1", {
    code_in: normalizedCode, game_code_in: normalizedGameCode || null,
  });

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
