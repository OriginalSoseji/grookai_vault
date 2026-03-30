function normalizeTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function mapAmbiguousDigitCharacters(token) {
  let ambiguous = false;
  const mapped = String(token).replace(/[OQ]/gi, () => {
    ambiguous = true;
    return '0';
  }).replace(/[Il|]/g, () => {
    ambiguous = true;
    return '1';
  });
  return {
    value: mapped,
    ambiguous,
  };
}

function buildSlashNumber(numerator, denominator) {
  return `${numerator}/${denominator}`;
}

export function parseCollectorNumberV1(rawText) {
  const rawNumberText = normalizeTextOrNull(rawText);
  const errors = [];
  const ambiguityFlags = [];

  if (!rawNumberText) {
    return {
      ok: false,
      raw_number_text: null,
      number_raw: null,
      number_plain: null,
      printed_total: null,
      ambiguity_flags: [],
      errors: ['missing_number_text'],
    };
  }

  const compact = rawNumberText
    .replace(/[‐‑–—]/g, '-')
    .replace(/[⁄∕]/g, '/')
    .replace(/\s+/g, '');

  const slashMatch = compact.match(/^([0-9OQIl|]{1,4})\/([0-9OQIl|]{1,4})$/);
  if (!slashMatch) {
    return {
      ok: false,
      raw_number_text: rawNumberText,
      number_raw: null,
      number_plain: null,
      printed_total: null,
      ambiguity_flags: [],
      errors: ['malformed_collector_number'],
    };
  }

  const numeratorMapped = mapAmbiguousDigitCharacters(slashMatch[1]);
  const denominatorMapped = mapAmbiguousDigitCharacters(slashMatch[2]);

  if (numeratorMapped.ambiguous) ambiguityFlags.push('numerator_ocr_ambiguity');
  if (denominatorMapped.ambiguous) ambiguityFlags.push('denominator_ocr_ambiguity');

  if (!/^\d+$/.test(numeratorMapped.value) || !/^\d+$/.test(denominatorMapped.value)) {
    errors.push('non_numeric_collector_number');
  }

  const printedTotal = /^\d+$/.test(denominatorMapped.value) ? Number.parseInt(denominatorMapped.value, 10) : null;
  const numeratorValue = /^\d+$/.test(numeratorMapped.value) ? Number.parseInt(numeratorMapped.value, 10) : null;

  if (printedTotal !== null && printedTotal <= 0) {
    errors.push('printed_total_out_of_range');
  }
  if (numeratorValue !== null && numeratorValue < 0) {
    errors.push('collector_number_out_of_range');
  }
  if (numeratorValue !== null && printedTotal !== null && numeratorValue > printedTotal) {
    ambiguityFlags.push('collector_number_exceeds_printed_total');
  }

  const numberRaw = buildSlashNumber(numeratorMapped.value, denominatorMapped.value);

  return {
    ok: errors.length === 0,
    raw_number_text: rawNumberText,
    number_raw: numberRaw,
    number_plain: numeratorMapped.value,
    printed_total: printedTotal,
    ambiguity_flags: ambiguityFlags,
    errors,
  };
}

export function compareParsedCollectorNumbersV1(left, right) {
  if (!left?.ok || !right?.ok) {
    return {
      agrees: false,
      comparable: false,
      reason: 'missing_comparable_number',
    };
  }

  return {
    agrees:
      left.number_raw === right.number_raw &&
      left.number_plain === right.number_plain &&
      left.printed_total === right.printed_total,
    comparable: true,
    reason: null,
  };
}
