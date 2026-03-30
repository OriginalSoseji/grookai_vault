const BASE_PREFIX = 'GV-PK';
const BASE_VARIANT_KEYS = new Set(['', 'base']);
const SUFFIX_ONLY_VARIANT_KEYS = new Set(['A', 'B', 'CC']);
const PREFIX_ONLY_VARIANT_KEYS = new Set(['RC', 'SH']);

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeUpperHyphenToken(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  return normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
}

function normalizeUpperAlnumToken(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  return normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '')
    .toUpperCase();
}

export function normalizeGvIdSuffixV1(variantKey) {
  const normalizedVariant = normalizeTextOrNull(variantKey);
  if (!normalizedVariant) {
    return null;
  }

  return normalizeUpperHyphenToken(normalizedVariant);
}

export function buildCardPrintGvIdV1(input = {}) {
  const setToken =
    normalizeUpperHyphenToken(input.printedSetAbbrev) ||
    normalizeUpperHyphenToken(input.setCode);
  const rawNumberToken =
    normalizeUpperAlnumToken(input.number) ||
    normalizeUpperAlnumToken(input.numberPlain);
  const variantToken = normalizeUpperAlnumToken(input.variantKey);

  if (!setToken) {
    throw new Error('gv_id_set_token_missing');
  }

  if (!rawNumberToken) {
    throw new Error('gv_id_number_token_missing');
  }

  if (!variantToken || BASE_VARIANT_KEYS.has(variantToken.toLowerCase())) {
    return `${BASE_PREFIX}-${setToken}-${rawNumberToken}`;
  }

  if (SUFFIX_ONLY_VARIANT_KEYS.has(variantToken)) {
    return `${BASE_PREFIX}-${setToken}-${rawNumberToken}${variantToken}`;
  }

  if (PREFIX_ONLY_VARIANT_KEYS.has(variantToken)) {
    return `${BASE_PREFIX}-${setToken}-${variantToken}${rawNumberToken}`;
  }

  const prefixedFamilyMatch = variantToken.match(/^([A-Z]{2,})([AB])$/);
  if (prefixedFamilyMatch) {
    const [, prefixToken, suffixToken] = prefixedFamilyMatch;
    return `${BASE_PREFIX}-${setToken}-${prefixToken}${rawNumberToken}${suffixToken}`;
  }

  const suffixToken = normalizeGvIdSuffixV1(input.variantKey);
  if (!suffixToken) {
    throw new Error('gv_id_variant_suffix_missing');
  }

  return `${BASE_PREFIX}-${setToken}-${rawNumberToken}-${suffixToken}`;
}
