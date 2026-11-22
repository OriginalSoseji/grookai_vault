import model from "../../../../../shared/catalog/pokemon_artwork_classification_v1.json";

type ArtworkCard = {id?: string | null; gv_id?: string | null; name?: string | null; set_code?: string | null;
  number?: string | null; rarity?: string | null; variant_key?: string | null; printed_identity_modifier?: string | null};
const byId = new Map(model.rows.map(row => [row.card_print_id, row]));

// This is a read of precomputed, source-backed catalog metadata. Neither a
// rarity nor another version's artwork may grant the classification.
export function hasVerifiedCatalogFullArt(card: ArtworkCard) {
  const fact = card.id ? byId.get(card.id) : undefined;
  return Boolean(fact && fact.category === "Full Art" &&
    fact.gv_id === card.gv_id && fact.name === card.name && fact.set_code === card.set_code &&
    fact.number === card.number && fact.rarity === card.rarity &&
    fact.variant_key === (card.variant_key ?? "") &&
    fact.printed_identity_modifier === (card.printed_identity_modifier ?? null));
}
