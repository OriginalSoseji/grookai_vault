import { number, text } from "../../../../../supabase/functions/vault-import-collection-v2/source.ts";
import type { CollectionReviewCandidate } from "./collectionPreviewV2";

export const catalogConflictMessage = "Matching catalog records disagree about this card's identity. Grookai needs to resolve these records before this option can be imported.";

// Review candidates already match the source's game/set/name/number scope.
// Separate catalog coordinates are not a physical distinction an owner can
// confirm. This is a review hold, never proof of equivalence or merge authority.
// This classification never uses GV suffixes, prices, rarity or the existence
// of a finish to pick a winner. Distinct stamps/variants remain owner choices.
export function collectionCatalogConflictIds(candidates: readonly CollectionReviewCandidate[]): Set<string> {
  const groups = new Map<string, CollectionReviewCandidate[]>();
  const normalize = (value: string | null | undefined) => text(value ?? "").normalize("NFKC").toLowerCase();
  for (const candidate of candidates) {
    if (!candidate.setCode || !candidate.name || !candidate.number) continue;
    const key = JSON.stringify([
      normalize(candidate.name), number(candidate.number),
      normalize(candidate.variantKey), normalize(candidate.printedIdentityModifier),
    ]);
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }
  const conflicts = new Set<string>();
  for (const group of groups.values()) {
    if (new Set(group.map(candidate => normalize(candidate.setCode))).size > 1) {
      group.forEach(candidate => conflicts.add(candidate.cardId));
    }
  }
  return conflicts;
}
