const POCKET_PREFIX = 'GV-TCGP';

const FINISH_SUFFIX = Object.freeze({
  normal: 'STD',
  holo: 'HOLO',
  reverse: 'RH',
});

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeSetToken(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  return normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
}

function normalizeNumberToken(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  return normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '')
    .toUpperCase();
}

export function derivePocketNumberTokenFromSourceIdV1(input = {}) {
  const setToken = normalizeSetToken(input.setCode ?? input.set_code ?? input.setsCode ?? input.sets_code);
  if (!setToken) return null;

  const externalId = normalizeTextOrNull(
    input.externalId
      ?? input.external_id
      ?? input.tcgdexId
      ?? input.tcgdex_id,
  );
  if (!externalId) return null;

  const match = externalId
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .match(/^(.+)-([A-Za-z0-9]+)$/);
  if (!match) return null;

  const externalSetToken = normalizeSetToken(match[1]);
  if (externalSetToken !== setToken) return null;

  return normalizeNumberToken(match[2]);
}

export function resolvePocketFinishSuffixV1(finishKey) {
  const key = normalizeTextOrNull(finishKey)?.toLowerCase() ?? null;
  return key ? FINISH_SUFFIX[key] ?? null : null;
}

export function buildPocketCardPrintGvIdV1(input = {}) {
  const setToken = normalizeSetToken(input.setCode ?? input.set_code ?? input.setsCode ?? input.sets_code);
  if (!setToken) throw new Error('pocket_gv_id_set_token_missing');

  const numberToken = normalizeNumberToken(input.number ?? input.numberPlain ?? input.number_plain)
    ?? derivePocketNumberTokenFromSourceIdV1(input);
  if (!numberToken) throw new Error('pocket_gv_id_number_token_missing');

  return `${POCKET_PREFIX}-${setToken}-${numberToken}`;
}

export function buildPocketCardPrintingGvIdV1(input = {}) {
  const parentGvId = normalizeTextOrNull(input.parentGvId ?? input.parent_gv_id)
    ?? buildPocketCardPrintGvIdV1(input);
  if (!parentGvId.startsWith(`${POCKET_PREFIX}-`)) {
    throw new Error('pocket_printing_parent_gv_id_invalid');
  }

  const finishSuffix = resolvePocketFinishSuffixV1(input.finishKey ?? input.finish_key);
  if (!finishSuffix) throw new Error('pocket_printing_finish_suffix_missing');

  return `${parentGvId}-${finishSuffix}`;
}
