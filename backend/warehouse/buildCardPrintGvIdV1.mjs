const BASE_PREFIX = 'GV-PK';
const BASE_VARIANT_KEYS = new Set(['', 'base']);
const SUFFIX_ONLY_VARIANT_KEYS = new Set(['A', 'B', 'CC']);
const PREFIX_ONLY_VARIANT_KEYS = new Set(['RC', 'SH']);
const MCD_FAMILY_TOKEN = 'MCD';
const SMP_SET_CODE_KEY = 'smp';
const SMP_NAMESPACE_TOKEN = 'SM';
const ECARD3_SET_CODE_KEY = 'ecard3';
const ECARD3_NAMESPACE_TOKEN = 'SK';
const COL1_SET_CODE_KEY = 'col1';
const COL1_NAMESPACE_TOKEN = 'COL';
export const MCD_NAMESPACE_YEAR_BY_SET_CODE_V1 = Object.freeze({
  '2011bw': '2011',
  '2012bw': '2012',
  '2014xy': '2014',
  '2015xy': '2015',
  '2016xy': '2016',
  '2017sm': '2017',
  '2018sm': '2018',
  '2019sm': '2019',
  '2021swsh': '2021',
  'mcd11': '2011',
  'mcd12': '2012',
  'mcd14': '2014',
  'mcd15': '2015',
  'mcd16': '2016',
  'mcd17': '2017',
  'mcd18': '2018',
  'mcd19': '2019',
  'mcd21': '2021',
  'mcd22': '2022',
});
const MCD_NAMESPACE_YEAR_REGISTRY_V1 = new Map(Object.entries(MCD_NAMESPACE_YEAR_BY_SET_CODE_V1));
const CONTROLLED_SUFFIX_REGISTRY_V2 = new Map([
  ['s', 'S'],
  ['shiny', 'S'],
  ['rh', 'RH'],
  ['reverse', 'RH'],
  ['reverseholo', 'RH'],
  ['pb', 'PB'],
  ['pokeball', 'PB'],
  ['mb', 'MB'],
  ['masterball', 'MB'],
]);

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

function normalizeLowerRegistryKey(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  return normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '')
    .toLowerCase();
}

function normalizeFourDigitYearToken(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  const yearToken = normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^0-9]+/g, '');

  if (!/^20\d{2}$/.test(yearToken)) {
    throw new Error('gv_id_mcd_year_invalid');
  }

  return yearToken;
}

function emitNamespaceDecision(input, decision) {
  if (typeof input?.onNamespaceDecision === 'function') {
    input.onNamespaceDecision(decision);
  }

  if (input?.logNamespaceDecision === true) {
    console.info(`[gv_id_namespace] ${JSON.stringify(decision)}`);
  }
}

export function resolveMcdNamespaceYearV1(input = {}) {
  const explicitYear = normalizeFourDigitYearToken(
    input.namespaceYear ?? input.setYear ?? input.releaseYear ?? input.year,
  );
  if (explicitYear) {
    return {
      year_token: explicitYear,
      source: 'explicit_year',
    };
  }

  const setCodeKey = normalizeLowerRegistryKey(input.setCode);
  const mappedYear = setCodeKey ? MCD_NAMESPACE_YEAR_REGISTRY_V1.get(setCodeKey) ?? null : null;
  if (mappedYear) {
    return {
      year_token: mappedYear,
      source: 'set_code_registry',
    };
  }

  throw new Error('gv_id_mcd_year_missing');
}

export function resolveSmpPromoNumberTokenV1(input = {}) {
  const promoNumberToken = normalizeUpperAlnumToken(input.number);
  if (!promoNumberToken) {
    throw new Error('gv_id_smp_promo_number_missing');
  }

  if (!/^SM\d{2,3}$/.test(promoNumberToken)) {
    throw new Error('gv_id_smp_promo_number_invalid');
  }

  return promoNumberToken;
}

export function resolveEcard3PrintedNumberTokenV1(input = {}) {
  const printedNumberToken = normalizeUpperAlnumToken(input.number);
  if (!printedNumberToken) {
    throw new Error('gv_id_ecard3_printed_number_missing');
  }

  if (!/^(?:[0-9]+|H[0-9]+)$/.test(printedNumberToken)) {
    throw new Error('gv_id_ecard3_printed_number_invalid');
  }

  return printedNumberToken;
}

export function resolveCol1PrintedNumberTokenV1(input = {}) {
  const printedNumberToken = normalizeUpperAlnumToken(input.number);
  if (!printedNumberToken) {
    throw new Error('gv_id_col1_printed_number_missing');
  }

  if (!/^(?:[0-9]+|SL[0-9]+)$/.test(printedNumberToken)) {
    throw new Error('gv_id_col1_printed_number_invalid');
  }

  return printedNumberToken;
}

export function resolveGvIdNamespaceDecisionV1(input = {}) {
  const printedSetToken = normalizeUpperHyphenToken(input.printedSetAbbrev);
  const setCodeToken = normalizeUpperHyphenToken(input.setCode);
  const baseSetToken = printedSetToken || setCodeToken;

  if (!baseSetToken) {
    throw new Error('gv_id_set_token_missing');
  }

  const setCodeKey = normalizeLowerRegistryKey(input.setCode);
  const col1FamilyDetected =
    setCodeKey === COL1_SET_CODE_KEY || baseSetToken === COL1_NAMESPACE_TOKEN;
  if (col1FamilyDetected) {
    return {
      family: COL1_NAMESPACE_TOKEN,
      namespace_contract: 'col1_identity_contract_v1',
      set_code_key: setCodeKey,
      set_token: COL1_NAMESPACE_TOKEN,
      year_token: null,
      source: setCodeKey === COL1_SET_CODE_KEY ? 'set_code' : 'printed_set_abbrev',
    };
  }

  const ecard3FamilyDetected =
    setCodeKey === ECARD3_SET_CODE_KEY || baseSetToken === ECARD3_NAMESPACE_TOKEN;
  if (ecard3FamilyDetected) {
    return {
      family: ECARD3_NAMESPACE_TOKEN,
      namespace_contract: 'ecard3_identity_contract_v1',
      set_code_key: setCodeKey,
      set_token: ECARD3_NAMESPACE_TOKEN,
      year_token: null,
      source: setCodeKey === ECARD3_SET_CODE_KEY ? 'set_code' : 'printed_set_abbrev',
    };
  }

  const smpFamilyDetected = setCodeKey === SMP_SET_CODE_KEY || baseSetToken === 'SMP';
  if (smpFamilyDetected) {
    return {
      family: SMP_NAMESPACE_TOKEN,
      namespace_contract: 'smp_identity_contract_v1',
      set_code_key: setCodeKey,
      set_token: SMP_NAMESPACE_TOKEN,
      year_token: null,
      source: setCodeKey === SMP_SET_CODE_KEY ? 'set_code' : 'printed_set_abbrev',
    };
  }

  const mcdFamilyDetected =
    baseSetToken === MCD_FAMILY_TOKEN ||
    (setCodeKey ? MCD_NAMESPACE_YEAR_REGISTRY_V1.has(setCodeKey) : false);

  if (!mcdFamilyDetected) {
    return {
      family: baseSetToken,
      namespace_contract: 'default_base_namespace_v1',
      set_code_key: setCodeKey,
      set_token: baseSetToken,
      year_token: null,
      source: printedSetToken === baseSetToken ? 'printed_set_abbrev' : 'set_code',
    };
  }

  const { year_token: yearToken, source } = resolveMcdNamespaceYearV1(input);
  return {
    family: MCD_FAMILY_TOKEN,
    namespace_contract: 'mcd_namespace_contract_v1',
    set_code_key: setCodeKey,
    set_token: `${MCD_FAMILY_TOKEN}-${yearToken}`,
    year_token: yearToken,
    source,
  };
}

export function normalizeGvIdSuffixV1(variantKey) {
  const normalizedVariant = normalizeTextOrNull(variantKey);
  if (!normalizedVariant) {
    return null;
  }

  return normalizeUpperHyphenToken(normalizedVariant);
}

export function resolveControlledGvIdSuffixV2(variantKey) {
  const registryKey = normalizeLowerRegistryKey(variantKey);
  if (!registryKey) {
    return null;
  }

  return CONTROLLED_SUFFIX_REGISTRY_V2.get(registryKey) ?? null;
}

export function resolveGvIdExtensionTokenV2(variantKey) {
  const controlledSuffix = resolveControlledGvIdSuffixV2(variantKey);
  if (controlledSuffix) {
    return controlledSuffix;
  }

  return normalizeGvIdSuffixV1(variantKey);
}

export function buildCardPrintGvIdV1(input = {}) {
  const namespaceDecision = resolveGvIdNamespaceDecisionV1(input);
  emitNamespaceDecision(input, namespaceDecision);

  const setToken = namespaceDecision.set_token;
  const rawNumberToken =
    namespaceDecision.namespace_contract === 'col1_identity_contract_v1'
      ? resolveCol1PrintedNumberTokenV1(input)
      : namespaceDecision.namespace_contract === 'smp_identity_contract_v1'
      ? resolveSmpPromoNumberTokenV1(input)
      : namespaceDecision.namespace_contract === 'ecard3_identity_contract_v1'
        ? resolveEcard3PrintedNumberTokenV1(input)
      : normalizeUpperAlnumToken(input.number) ||
        normalizeUpperAlnumToken(input.numberPlain);
  const variantToken = normalizeUpperAlnumToken(input.variantKey);

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

  const suffixToken = resolveGvIdExtensionTokenV2(input.variantKey);
  if (!suffixToken) {
    throw new Error('gv_id_variant_suffix_missing');
  }

  return `${BASE_PREFIX}-${setToken}-${rawNumberToken}-${suffixToken}`;
}
