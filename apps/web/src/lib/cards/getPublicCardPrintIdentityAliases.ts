import type { SupabaseClient } from "@supabase/supabase-js";

export const PUBLIC_CARD_PRINT_IDENTITY_ALIASES_RPC_V1 =
  "get_public_card_print_identity_aliases_v1";

export type PublicCardPrintIdentityAlias = {
  legacy_card_print_id: string;
  canonical_card_print_id: string;
  legacy_set_code: string;
  canonical_set_code: string;
};

const MAX_IDS_PER_REQUEST = 250;

export async function getPublicCardPrintIdentityAliases(
  client: SupabaseClient,
  cardPrintIds: readonly string[],
) {
  const ids = Array.from(new Set(cardPrintIds.map(value => value.trim()).filter(Boolean)));
  const rows: PublicCardPrintIdentityAlias[] = [];
  const seen = new Set<string>();

  for (let start = 0; start < ids.length; start += MAX_IDS_PER_REQUEST) {
    const chunk = ids.slice(start, start + MAX_IDS_PER_REQUEST);
    const {data, error} = await client.rpc(
      PUBLIC_CARD_PRINT_IDENTITY_ALIASES_RPC_V1,
      {p_card_print_ids: chunk},
    );
    if (error || !Array.isArray(data)) {
      throw new Error("Card identity aliases could not be fully read. Retry the preview.");
    }
    for (const value of data as PublicCardPrintIdentityAlias[]) {
      const legacyId = value.legacy_card_print_id?.trim();
      const canonicalId = value.canonical_card_print_id?.trim();
      if (
        !legacyId || !canonicalId || legacyId === canonicalId ||
        !chunk.includes(legacyId) || seen.has(legacyId)
      ) {
        throw new Error("Card identity aliases are incomplete. Retry the preview.");
      }
      seen.add(legacyId);
      rows.push({...value, legacy_card_print_id: legacyId, canonical_card_print_id: canonicalId});
    }
  }

  return rows;
}
export function preferCanonicalCardCandidates<T extends {id: string}>(
  candidates: readonly T[],
  aliases: readonly PublicCardPrintIdentityAlias[],
): T[] {
  const candidateIds = new Set(candidates.map(candidate => candidate.id));
  const canonicalByLegacy = new Map(
    aliases.map(alias => [alias.legacy_card_print_id, alias.canonical_card_print_id]),
  );
  return candidates.filter(candidate => {
    const canonicalId = canonicalByLegacy.get(candidate.id);
    return !canonicalId || !candidateIds.has(canonicalId);
  });
}
