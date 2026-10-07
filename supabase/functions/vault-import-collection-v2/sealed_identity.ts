// Read-only planning for the next import writer. An identity match is never a
// save selection: sealed copies need atomic source/group retention first.
import { field, game, parseCsv, text, type SourceRow } from "./source.ts";

export type SealedReleaseEvidence = {
  game: string; releaseId: string; state: string; expectedMembers: number;
};
export type SealedVariantEvidence = {
  variantId: string; familyId: string; name: string; game: string;
  packageForm: string; language: string | null; region: string | null;
  edition: string | null; wave: string | null; identityFingerprint: string;
  releaseId: string | null; releaseState: string | null;
  memberMappingId: string | null; mappingId: string | null;
  mappingVariantId: string | null; mappingStatus: string | null;
  reviewDecision: string | null; promotionAuthorized: boolean | null;
  sourceName: string | null; sourceSet: string | null;
};
export type SealedCatalogEvidence = {
  releases: SealedReleaseEvidence[]; variants: SealedVariantEvidence[];
};
export type SealedReviewStatus = "card_path" | "unsupported_game" | "grade_review" |
  "watchlist_review" | "invalid_quantity" | "finish_review" | "missing_identity" |
  "unreleased_identity" | "set_review" | "language_review" | "ambiguous_identity" |
  "variant_review" | "exact_identity";
export type SealedIdentityReview = {
  sourceIndex: number; source: SourceRow; status: SealedReviewStatus;
  quantity: number | null; candidates: SealedVariantEvidence[];
  // This literal intentionally cannot be mistaken for the card writer's selection.
  saveEligible: false;
};
const key = (value: string) => text(value).normalize("NFC").toLowerCase();
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const forms = new Set(["pack", "sleeved_pack", "booster_box", "display", "case", "deck", "deck_display", "kit", "tin", "collection", "bundle", "promo_pack"]);

// Explicit provider group labels, scoped to Pokemon. Do not generally strip
// prefixes, editions, language markers, artwork, retailer or package qualifiers.
const pokemonGroups: Record<string, string> = {
  "sv: 151": "151",
  "scarlet & violet base set": "scarlet & violet",
  "me: ascended heroes": "ascended heroes",
  "sv: black bolt": "black bolt",
  "me04: chaos rising": "chaos rising",
  "swsh: crown zenith": "crown zenith",
  "sv10: destined rivals": "destined rivals",
  "sv09: journey together": "journey together",
  "swsh11: lost origin": "lost origin",
  "me01: mega evolution": "mega evolution",
  "me03: perfect order": "perfect order",
  "me02: phantasmal flames": "phantasmal flames",
  "me05: pitch black": "pitch black",
  "sv: prismatic evolutions": "prismatic evolutions",
  "sv01: scarlet & violet base set": "scarlet & violet",
  "sv: shrouded fable": "shrouded fable",
  "swsh08: fusion strike": "fusion strike",
  "sv08: surging sparks": "surging sparks",
  "sv: scarlet & violet 151": "151",
  "sv05: temporal forces": "temporal forces",
  "sv06: twilight masquerade": "twilight masquerade",
  "swsh04: vivid voltage": "vivid voltage",
  "sv: white flare": "white flare",
};
export function sealedSourceSetKey(value: string, scope: string): string {
  const label = key(value);
  if (scope === "pokemon") return pokemonGroups[label] ?? label;
  if (scope === "mtg") return ({
    "universes beyond: final fantasy": "final fantasy",
    "commander: final fantasy": "final fantasy commander",
  } as Record<string, string>)[label] ?? label;
  return label;
}

// Reviewed full product labels, not fuzzy matching or general prefix removal.
// Each alias is one-way and bound to its game, set and physical package form.
// Extra language, retailer, artwork, case or edition text never matches a key.
const productLabels = [
  { game: "mtg", set: "final fantasy", source: "universes beyond: final fantasy - collector booster display", target: "final fantasy - collector booster display", form: "display" },
  { game: "mtg", set: "final fantasy", source: "universes beyond: final fantasy - gift bundle", target: "final fantasy - gift bundle", form: "bundle" },
  { game: "mtg", set: "final fantasy", source: "universes beyond: final fantasy - starter kit", target: "final fantasy - starter kit", form: "kit" },
  { game: "pokemon", set: "prismatic evolutions", source: "prismatic evolutions super premium collection", target: "prismatic evolutions super-premium collection", form: "collection" },
] as const;

function matchesProductLabel(name: string, set: string, scope: string, variant: SealedVariantEvidence): boolean {
  return productLabels.some(alias => alias.game === scope && alias.set === set && alias.source === name &&
    variant.packageForm === alias.form &&
    (key(variant.name) === alias.target || (variant.memberMappingId !== null && key(variant.sourceName!) === alias.target)));
}

// The planner consumes a complete, single-snapshot catalog. A short/truncated
// export or conflicting bindings must fail, not manufacture unique matches.
export function validateSealedCatalogEvidence(catalog: SealedCatalogEvidence): void {
  if (!catalog || !Array.isArray(catalog.releases) || !Array.isArray(catalog.variants)) throw new Error("invalid_sealed_catalog");
  const releases = new Map<string, SealedReleaseEvidence>(), ids = new Set<string>();
  for (const release of catalog.releases) {
    if (!release || typeof release.game !== "string" || !release.game || releases.has(release.game) ||
      !uuid.test(release.releaseId) || release.state !== "frozen" ||
      !Number.isSafeInteger(release.expectedMembers) || release.expectedMembers < 0) throw new Error("invalid_sealed_release");
    releases.set(release.game, release);
  }
  const counts = new Map<string, number>();
  for (const variant of catalog.variants) {
    if (!variant || !uuid.test(variant.variantId) || ids.has(variant.variantId) || !uuid.test(variant.familyId) ||
      typeof variant.game !== "string" || !variant.game || typeof variant.name !== "string" || !key(variant.name) ||
      !forms.has(variant.packageForm) || !/^[a-f0-9]{64}$/.test(variant.identityFingerprint)) throw new Error("invalid_sealed_variant");
    ids.add(variant.variantId);
    for (const value of [variant.language, variant.region, variant.edition, variant.wave]) {
      if (value !== null && (typeof value !== "string" || !key(value))) throw new Error("invalid_sealed_dimensions");
    }
    const release = releases.get(variant.game);
    if (variant.releaseId !== (release?.releaseId ?? null) || variant.releaseState !== (release?.state ?? null)) throw new Error("sealed_release_changed");
    if (variant.memberMappingId === null) {
      if ([variant.mappingId, variant.mappingVariantId, variant.mappingStatus, variant.reviewDecision,
        variant.promotionAuthorized, variant.sourceName, variant.sourceSet].some(v => v !== null)) throw new Error("unbound_sealed_mapping");
      continue;
    }
    if (!release || !uuid.test(variant.memberMappingId) || variant.memberMappingId !== variant.mappingId ||
      variant.mappingVariantId !== variant.variantId || variant.mappingStatus !== "exact_reviewed" ||
      variant.reviewDecision !== "confirmed_sealed" || variant.promotionAuthorized !== true ||
      typeof variant.sourceName !== "string" || !key(variant.sourceName) ||
      typeof variant.sourceSet !== "string" || !key(variant.sourceSet)) throw new Error("invalid_sealed_mapping");
    counts.set(variant.game, (counts.get(variant.game) ?? 0) + 1);
  }
  for (const release of releases.values()) {
    if ((counts.get(release.game) ?? 0) !== release.expectedMembers) throw new Error("incomplete_sealed_catalog");
  }
}

function sourceLanguage(name: string): string | null {
  // Labels are retained in the name comparison. No English substitution or
  // removal of unknown/multiple language qualifiers is permitted.
  const tokens = [...name.matchAll(/\(([^()]*)\)|\[([^\[\]]*)\]/g)].map(m => key(m[1] ?? m[2]));
  const codes: Record<string, string> = { jp: "ja", japanese: "ja", cn: "zh", chinese: "zh", kr: "ko", korean: "ko", english: "en", en: "en", french: "fr", german: "de", italian: "it", spanish: "es", portuguese: "pt", russian: "ru" };
  const languages = tokens.flatMap(t => codes[t] ? [codes[t]] : []);
  return languages.length > 1 ? null : languages[0] ?? "en";
}

export function planCollectrSealedIdentities(csv: string, catalog: SealedCatalogEvidence, reviewIndices?: readonly number[]) {
  if (new TextEncoder().encode(csv).length > 2097152) throw new Error("import_source_too_large");
  const source = parseCsv(csv);
  validateSealedCatalogEvidence(catalog);
  const indices = reviewIndices ? [...reviewIndices] : source.map((_, i) => i);
  if (new Set(indices).size !== indices.length || indices.some(i => !Number.isInteger(i) || i < 0 || i >= source.length)) throw new Error("invalid_review_indices");
  indices.sort((a, b) => a - b);
  const rows: SealedIdentityReview[] = indices.map(sourceIndex => {
    const row = source[sourceIndex];
    const result = (status: SealedReviewStatus, candidates: SealedVariantEvidence[] = [], quantity: number | null = null): SealedIdentityReview => ({ sourceIndex, source: { ...row }, status, quantity, candidates: candidates.map(v => ({ ...v })), saveEligible: false });
    if (field(row, "card number", "number").trim()) return result("card_path");
    const scope = game(field(row, "category", "game"));
    if (!["pokemon", "mtg", "one_piece"].includes(scope)) return result("unsupported_game");
    if (!["", "ungraded"].includes(key(field(row, "grade")))) return result("grade_review");
    if (!["", "false"].includes(key(field(row, "watchlist")))) return result("watchlist_review");
    const quantityText = text(field(row, "quantity", "qty")).replaceAll(",", "") || "1";
    const quantity = Number(quantityText);
    if (!/^\d+$/.test(quantityText) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 50000) return result("invalid_quantity");
    if (!["", "normal"].includes(key(field(row, "variance", "finish")))) return result("finish_review", [], quantity);
    const name = key(field(row, "product name", "card name")), set = sealedSourceSetKey(field(row, "set", "series"), scope);
    if (!name || !set) return result("missing_identity", [], quantity);
    const named = catalog.variants.filter(v => v.game === scope &&
      (key(v.name) === name || (v.memberMappingId !== null && key(v.sourceName!) === name) || matchesProductLabel(name, set, scope, v)));
    if (!named.length) return result("missing_identity", [], quantity);
    const released = named.filter(v => v.memberMappingId !== null);
    if (!released.length) return result("unreleased_identity", named, quantity);
    const scoped = released.filter(v => sealedSourceSetKey(v.sourceSet!, scope) === set);
    if (!scoped.length) return result("set_review", released, quantity);
    const language = sourceLanguage(name);
    const localized = scoped.filter(v => language !== null && v.language === language);
    if (!localized.length) return result("language_review", scoped, quantity);
    // An unqualified duplicate cannot be resolved by preferring empty dimensions.
    if (localized.length > 1) return result("ambiguous_identity", localized, quantity);
    if ([localized[0].region, localized[0].edition, localized[0].wave].some(v => v !== null)) return result("variant_review", localized, quantity);
    return result("exact_identity", localized, quantity);
  });
  const counts: Partial<Record<SealedReviewStatus, number>> = {};
  for (const row of rows) counts[row.status] = (counts[row.status] ?? 0) + 1;
  return { schemaVersion: 1, mode: "identity_review_only" as const, sourceRows: source.length,
    examinedRows: rows.length, counts, exactIdentityRows: counts.exact_identity ?? 0,
    exactIdentitySourceQuantity: rows.filter(r => r.status === "exact_identity").reduce((n, r) => n + r.quantity!, 0),
    saveEligibleCopies: 0, rows };
}
