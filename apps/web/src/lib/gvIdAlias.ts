type PublicGvIdAliasRule = {
  name: "smp" | "col1";
  legacyPrefix: string;
  canonicalPrefix: string;
  legacyPattern: RegExp;
  canonicalPattern: RegExp;
};

const PUBLIC_GV_ID_ALIAS_RULES: PublicGvIdAliasRule[] = [
  {
    name: "smp",
    legacyPrefix: "GV-PK-PR-SM-",
    canonicalPrefix: "GV-PK-SM-",
    legacyPattern: /^GV-PK-PR-SM-SM[0-9]+(?:-.+)?$/i,
    canonicalPattern: /^GV-PK-SM-SM[0-9]+(?:-.+)?$/i,
  },
  {
    name: "col1",
    legacyPrefix: "GV-PK-CL-",
    canonicalPrefix: "GV-PK-COL-",
    legacyPattern: /^GV-PK-CL-(?:SL[0-9]+|[0-9]+)(?:-.+)?$/i,
    canonicalPattern: /^GV-PK-COL-(?:SL[0-9]+|[0-9]+)(?:-.+)?$/i,
  },
];

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getAliasRuleByName(name: PublicGvIdAliasRule["name"]) {
  return PUBLIC_GV_ID_ALIAS_RULES.find((rule) => rule.name === name) ?? null;
}

function getLegacyAliasRule(value: string) {
  return PUBLIC_GV_ID_ALIAS_RULES.find((rule) => rule.legacyPattern.test(value)) ?? null;
}

function getCanonicalAliasRule(value: string) {
  return (
    PUBLIC_GV_ID_ALIAS_RULES.find(
      (rule) => rule.canonicalPattern.test(value) && !rule.legacyPattern.test(value),
    ) ?? null
  );
}

export function normalizeRequestedPublicGvId(value: string) {
  return value.trim().toUpperCase();
}

export function isLegacySmpGvId(value: string) {
  const normalized = normalizeRequestedPublicGvId(value);
  const rule = getAliasRuleByName("smp");
  return Boolean(rule?.legacyPattern.test(normalized));
}

export function isCanonicalSmpGvId(value: string) {
  const normalized = normalizeRequestedPublicGvId(value);
  const rule = getAliasRuleByName("smp");
  return Boolean(rule?.canonicalPattern.test(normalized) && !rule?.legacyPattern.test(normalized));
}

export function toCanonicalPublicGvId(value: string) {
  const normalized = normalizeRequestedPublicGvId(value);
  const rule = getLegacyAliasRule(normalized);

  if (rule) {
    return normalized.replace(rule.legacyPrefix, rule.canonicalPrefix);
  }

  return normalized;
}

export function toLegacyCompatibleGvId(value: string) {
  const normalized = normalizeRequestedPublicGvId(value);
  const rule = getCanonicalAliasRule(normalized);

  if (rule) {
    return normalized.replace(rule.canonicalPrefix, rule.legacyPrefix);
  }

  return normalized;
}

export function getCompatiblePublicGvIdCandidates(value: string) {
  const normalized = normalizeRequestedPublicGvId(value);
  const candidates = [normalized];

  if (getLegacyAliasRule(normalized)) {
    candidates.push(toCanonicalPublicGvId(normalized));
  } else if (getCanonicalAliasRule(normalized)) {
    candidates.push(toLegacyCompatibleGvId(normalized));
  }

  return uniqueValues(candidates);
}

export function pickResolvedPublicGvIdRow<T extends { gv_id: string | null }>(
  rows: T[],
  requestedGvId: string,
) {
  if (rows.length === 0) {
    return null;
  }

  const normalizedRequested = normalizeRequestedPublicGvId(requestedGvId);
  const exact = rows.find((row) => normalizeRequestedPublicGvId(row.gv_id ?? "") === normalizedRequested);
  if (exact) {
    return exact;
  }

  const canonical = toCanonicalPublicGvId(normalizedRequested);
  const canonicalMatch = rows.find(
    (row) => normalizeRequestedPublicGvId(row.gv_id ?? "") === canonical,
  );
  if (canonicalMatch) {
    return canonicalMatch;
  }

  const legacy = toLegacyCompatibleGvId(normalizedRequested);
  const legacyMatch = rows.find(
    (row) => normalizeRequestedPublicGvId(row.gv_id ?? "") === legacy,
  );
  return legacyMatch ?? rows[0] ?? null;
}
