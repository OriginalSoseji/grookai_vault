import { collectrFcaNames } from "./fca_names.ts";

// Mirror the native predicate; the shared fixture corpus checks both runtimes.
export function matchesCollectrMtgIdentity({sourceName, sourceNumber, sourceFinishKey, game, card, identities}: {
  sourceName: string; sourceNumber: string; game: string;
  sourceFinishKey?: string | null;
  card: Record<string, any>; identities: Record<string, any>[];
}): boolean {
  const text = (value: unknown): string => typeof value === "string" ? value.trim().replace(/\s+/g, " ").toLowerCase() : "";
  const number = (value: unknown): string => {
    const raw = text(value).replace(/^#/, "").split("/")[0].trim();
    const parts = /^([a-z]*)(\d+)([a-z]*)$/.exec(raw);
    return parts ? parts[1] + (parts[2].replace(/^0+/, "") || "0") + parts[3] : raw;
  };
  if (game !== "mtg" || identities.length !== 1) return false;
  const identity = identities[0], payload = identity.identity_payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
    identity.is_active !== true || identity.card_print_id !== card.id ||
    identity.identity_domain !== "mtg_eng_paper_print" || card.identity_domain !== "mtg_eng_paper_print" ||
    identity.identity_key_version !== "MTG_ENG_PAPER_PRINT_IDENTITY_V1" ||
    text(payload.language) !== "en" || !text(payload.scryfall_print_id) ||
    text(card.variant_key) !== `scryfall:${text(payload.scryfall_print_id)}` ||
    !text(card.set_code) || text(identity.set_code_identity) !== text(card.set_code) ||
    text(payload.set_code) !== text(card.set_code) ||
    number(identity.printed_number) !== number(card.number) || number(payload.collector_number) !== number(card.number) ||
    !number(sourceNumber) || number(sourceNumber) !== number(card.number) ||
    !text(payload.name) || text(payload.name) !== text(card.name)) return false;
  let name = text(sourceName);
  const labels = new Set<string>();
  while (true) {
    const suffix = /\s+\(([^()]*)\)$/.exec(name);
    if (!suffix) break;
    const label = text(suffix[1]);
    if (labels.has(label)) return false;
    labels.add(label);
    name = name.slice(0, suffix.index);
  }
  // Collectr's FCA combined name and Showcase label describe the reviewed
  // source-material treatment, not a generic equivalence to borderless cards.
  const aliasText = (value: unknown) => text(value).replace(/\u2019/g, "'");
  const pair = collectrFcaNames[number(sourceNumber)];
  const effects = payload.frame_effects;
  const fcaAlias = text(card.set_code) === "fca" && !!pair &&
    payload.layout === "normal" && payload.border_color === "borderless" &&
    Array.isArray(effects) && effects.includes("inverted") &&
    Array.isArray(payload.promo_types) && payload.promo_types.includes("sourcematerial") &&
    aliasText(card.name) === aliasText(pair[1]) &&
    aliasText(name) === aliasText(`${pair[0]} - ${pair[1]}`);
  for (const label of labels) {
    const verified = label === "extended art" ? Array.isArray(effects) && effects.includes("extendedart")
      : label === "showcase" ? fcaAlias || Array.isArray(effects) && effects.includes("showcase")
      : label === "borderless" ? payload.border_color === "borderless"
      // A special treatment belongs to the exact governed parent. Ordinary
      // foil availability alone cannot establish Surge Foil identity.
      : label === "surge foil" ? sourceFinishKey === "foil" &&
        Array.isArray(payload.promo_types) && payload.promo_types.includes("surgefoil") &&
        Array.isArray(payload.finishes) && payload.finishes.length === 1 && payload.finishes[0] === "foil"
      : /^\d+$/.test(label) && number(label) === number(sourceNumber);
    if (!verified) return false;
  }
  if (fcaAlias) return true;
  if (name === text(card.name)) return true;
  const faces = text(payload.name).split(" // ");
  // Adventure exports may use the permanent's name without the attached spell.
  // Require the governed layout and complete identity; never match the spell alone.
  return ["transform", "modal_dfc", "adventure"].includes(payload.layout) && faces.length === 2 && faces.every(Boolean) && name === faces[0];
}
