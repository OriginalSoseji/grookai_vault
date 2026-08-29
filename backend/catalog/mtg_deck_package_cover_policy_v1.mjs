export const MTG_DECK_PACKAGE_COVER_POLICY_VERSION =
  "MTG_DECK_PACKAGE_COVER_POLICY_V1";

const DECK_SET_TYPES = new Set([
  "archenemy",
  "commander",
  "duel_deck",
  "planechase",
  "premium_deck",
]);

const PACKAGE_CUES = [
  /\bcommander deck\b/,
  /\bduel decks?\b/,
  /\btheme decks?\b/,
  /\bevent decks?\b/,
  /\bwelcome decks?\b/,
  /\bpreconstructed decks?\b/,
  /\bdeck display\b/,
  /\bdeck case\b/,
  /\bbox set\b/,
  /\bset of \d+\b/,
  /\bstarter commander deck\b/,
];

export function normalizeMtgCatalogText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMtgSetCode(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizedSetType(set) {
  return normalizeMtgCatalogText(
    set.catalog_set_type ?? set.set_type ?? set.source?.scryfall?.set_type,
  ).replaceAll(" ", "_");
}

function tokenSignature(value) {
  return normalizeMtgCatalogText(value)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !["magic", "the", "gathering", "universes", "beyond"].includes(token))
    .sort()
    .join(" ");
}

export function isMtgDeckRelease(set) {
  const setType = normalizedSetType(set);
  if (DECK_SET_TYPES.has(setType)) return true;
  return ["box", "memorabilia", "starter"].includes(setType) &&
    /\b(deck|decks)\b/.test(normalizeMtgCatalogText(set.name));
}

function groupIsCompatible(set, group) {
  const setName = normalizeMtgCatalogText(set.name);
  const groupName = normalizeMtgCatalogText(group.name);
  const setType = normalizedSetType(set);

  if (/\b(tokens?|art series)\b/.test(groupName) && !/\b(tokens?|art series)\b/.test(setName)) {
    return false;
  }
  if (groupName.startsWith("planechase ") && setType !== "planechase") {
    return false;
  }
  if (setType === "planechase" && !groupName.includes("planechase")) {
    return false;
  }
  if (setName.includes("anthology") && !groupName.includes("anthology")) {
    return false;
  }
  return true;
}

export function scoreMtgSetGroupMatch(set, group) {
  if (!isMtgDeckRelease(set) || !groupIsCompatible(set, group)) return -1;
  const code = normalizeMtgSetCode(set.code);
  const abbreviation = normalizeMtgSetCode(group.abbreviation);
  const setName = normalizeMtgCatalogText(set.name);
  const groupName = normalizeMtgCatalogText(group.name);
  let score = 0;
  if (code && abbreviation === code) score += 1000;
  if (setName && groupName === setName) score += 900;
  if (tokenSignature(setName) === tokenSignature(groupName)) score += 700;
  return score;
}

export function chooseMtgSourceGroup(set, groups) {
  const candidates = groups
    .map((group) => ({ group, score: scoreMtgSetGroupMatch(set, group) }))
    .filter((entry) => entry.score >= 700)
    .sort(
      (left, right) =>
        right.score - left.score ||
        Number(left.group.group_id) - Number(right.group.group_id),
    );
  if (candidates.length === 0) return null;
  if (candidates[1]?.score === candidates[0].score) return null;
  return {
    ...candidates[0],
    match_reason:
      candidates[0].score >= 1900
        ? "exact_code_and_name"
        : candidates[0].score >= 1000
          ? "exact_group_abbreviation"
          : "exact_normalized_group_name",
  };
}

export function scoreMtgPackageProduct(product, group) {
  if (!product.image_url) return -1;
  const productName = normalizeMtgCatalogText(product.name);
  const groupName = normalizeMtgCatalogText(group.name);
  if (/\bdisplay commander\b|\bthick stock\b/.test(productName)) return -1;
  if (!PACKAGE_CUES.some((pattern) => pattern.test(productName))) return -1;

  let score = 100;
  if (productName.startsWith(`${groupName} `) || productName === groupName) score += 200;
  if (/\b(set of \d+|deck display|deck case|box set)\b/.test(productName)) score += 500;
  if (/\b(commander deck|duel decks?|starter commander deck)\b/.test(productName)) score += 350;
  if (/\b(theme deck|event deck|welcome deck|preconstructed deck)\b/.test(productName)) score += 300;
  if (/collector s edition/.test(productName)) score -= 25;
  return score;
}

export function rankMtgPackageProducts(products, group) {
  return products
    .map((product) => ({ product, score: scoreMtgPackageProduct(product, group) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        Number(left.product.product_id) - Number(right.product.product_id),
    );
}

export function chooseMtgPackageProduct(products, group) {
  const candidates = rankMtgPackageProducts(products, group);
  return candidates[0] ?? null;
}
