function normalizeTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function collapseWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function sanitizeBrokenCharacters(value) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’`´]/g, "'")
    .replace(/[‐‑–—]/g, '-')
    .replace(/[^\p{L}\p{N}'".:&+\-/,()\s]/gu, ' ')
    .replace(/\s+([,.:/)\]])/g, '$1')
    .replace(/([(\[])\s+/g, '$1');
}

function normalizeForDistance(value) {
  return collapseWhitespace(sanitizeBrokenCharacters(value))
    .toLowerCase()
    .replace(/\bex\b/g, 'ex')
    .trim();
}

function stripLeadingOwnerPrefix(value) {
  return value.replace(/^[\p{L}\p{N}]+['’]s\s+/u, '').trim();
}

export function levenshteinDistanceV1(left, right) {
  const a = normalizeForDistance(left);
  const b = normalizeForDistance(right);

  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const previous = new Array(b.length + 1).fill(0);
  const current = new Array(b.length + 1).fill(0);

  for (let j = 0; j <= b.length; j += 1) {
    previous[j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + substitutionCost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

export function canSafelyAdoptCanonNameV1(rawName, canonName) {
  const normalizedRawName = normalizeTextOrNull(rawName);
  const normalizedCanonName = normalizeTextOrNull(canonName);

  if (!normalizedRawName || !normalizedCanonName) {
    return {
      ok: false,
      distance: null,
      reason: null,
    };
  }

  const comparableRawName = normalizeForDistance(normalizedRawName);
  const comparableCanonName = normalizeForDistance(normalizedCanonName);
  const distance = levenshteinDistanceV1(normalizedRawName, normalizedCanonName);
  const normalizedLength = Math.max(comparableRawName.length, comparableCanonName.length);
  const maxSafeDistance = normalizedLength <= 10 ? 1 : 2;

  if (distance <= maxSafeDistance) {
    return {
      ok: true,
      distance,
      reason: 'small_edit_distance',
    };
  }

  const canonWithoutOwnerPrefix = stripLeadingOwnerPrefix(comparableCanonName);
  if (canonWithoutOwnerPrefix && canonWithoutOwnerPrefix === comparableRawName) {
    return {
      ok: true,
      distance,
      reason: 'owner_prefix_expansion',
    };
  }

  return {
    ok: false,
    distance,
    reason: null,
  };
}

export function normalizeCardNameV1(rawText, options = {}) {
  const rawNameText = normalizeTextOrNull(rawText);
  const canonName = normalizeTextOrNull(options.canonName);

  if (!rawNameText) {
    return {
      ok: false,
      raw_name_text: null,
      normalized_name: null,
      corrected_name: null,
      used_canon_correction: false,
      distance_to_canon: null,
      errors: ['missing_name_text'],
    };
  }

  const normalizedName = collapseWhitespace(sanitizeBrokenCharacters(rawNameText));
  let correctedName = normalizedName;
  let usedCanonCorrection = false;
  let distanceToCanon = null;
  let correctionReason = null;

  if (canonName) {
    const correction = canSafelyAdoptCanonNameV1(normalizedName, canonName);
    distanceToCanon = correction.distance;
    if (correction.ok) {
      correctedName = canonName;
      usedCanonCorrection = true;
      correctionReason = correction.reason;
    }
  }

  return {
    ok: true,
    raw_name_text: rawNameText,
    normalized_name: normalizedName,
    corrected_name: correctedName,
    used_canon_correction: usedCanonCorrection,
    distance_to_canon: distanceToCanon,
    correction_reason: correctionReason,
    errors: [],
  };
}
