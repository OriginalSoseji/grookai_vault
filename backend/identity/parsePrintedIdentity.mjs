function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function buildParsedIdentity(token, source) {
  const normalized = normalizeText(token);
  if (!normalized) return null;

  if (/^[0-9]+\/[0-9]+$/.test(normalized)) {
    return {
      printed_identity: normalized,
      number_plain: normalized.split('/', 1)[0],
      number_suffix: null,
      source,
    };
  }

  if (/^[0-9]+$/.test(normalized)) {
    return {
      printed_identity: normalized,
      number_plain: normalized,
      number_suffix: null,
      source,
    };
  }

  const numericPrefix = normalized.match(/^([0-9]+)([A-Za-z!?\*]+)$/);
  if (numericPrefix) {
    return {
      printed_identity: normalized,
      number_plain: numericPrefix[1],
      number_suffix: numericPrefix[2],
      source,
    };
  }

  const alphaPrefix = normalized.match(/^([A-Za-z!?\*]+)([0-9]+)$/);
  if (alphaPrefix) {
    return {
      printed_identity: normalized,
      number_plain: alphaPrefix[2],
      number_suffix: alphaPrefix[1],
      source,
    };
  }

  if (/^[A-Za-z!?\*]+$/.test(normalized)) {
    return {
      printed_identity: normalized,
      number_plain: null,
      number_suffix: normalized,
      source,
    };
  }

  return null;
}

export function normalizePrintedName(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return normalized.toLowerCase().replace(/\s+/g, ' ');
}

export function parseExternalId(externalId) {
  const normalized = normalizeText(externalId);
  if (!normalized) return null;

  const token = normalized.split('-').filter(Boolean).at(-1) ?? normalized;
  return buildParsedIdentity(token, 'external_id');
}

export function parseRawNumber(raw) {
  const normalized = normalizeText(raw);
  if (!normalized) return null;
  return buildParsedIdentity(normalized, 'raw_number');
}
