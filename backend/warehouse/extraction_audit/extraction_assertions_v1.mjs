function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function matchesType(expectedType, value) {
  switch (expectedType) {
    case 'object':
      return isPlainObject(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    default:
      return true;
  }
}

function validateNode(schema, value, pointer, errors) {
  if (!schema || typeof schema !== 'object') {
    return;
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const typeOk = types.some((typeName) => matchesType(typeName, value));
    if (!typeOk) {
      errors.push(`${pointer}: expected type ${types.join('|')}`);
      return;
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${pointer}: expected one of ${schema.enum.join(', ')}`);
  }

  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      errors.push(`${pointer}: expected >= ${schema.minimum}`);
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      errors.push(`${pointer}: expected <= ${schema.maximum}`);
    }
  }

  if (isPlainObject(value)) {
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      if (!(key in value)) {
        errors.push(`${pointer}.${key}: missing required property`);
      }
    }

    const properties = isPlainObject(schema.properties) ? schema.properties : {};
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (key in value) {
        validateNode(propertySchema, value[key], `${pointer}.${key}`, errors);
      }
    }
    return;
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => {
      validateNode(schema.items, item, `${pointer}[${index}]`, errors);
    });
  }
}

export function validateSchema(schema, value) {
  const errors = [];
  validateNode(schema, value, '$', errors);
  return {
    ok: errors.length === 0,
    errors,
  };
}

function normalizeString(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeName(value) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  return normalized.toLowerCase();
}

function normalizeNumber(value) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  const compact = normalized.replace(/\s+/g, '');
  const match = compact.match(/^(\d{1,3})\/(\d{1,3})$/);
  if (match) {
    return `${match[1].padStart(3, '0')}/${match[2].padStart(3, '0')}`;
  }
  return compact.toUpperCase();
}

function normalizeSet(value) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  return normalized.toUpperCase();
}

function normalizeModifierKey(value) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  return normalized.toLowerCase();
}

export function classifySetOutcome(caseDef, result) {
  const expectedSet = normalizeSet(caseDef?.expected?.set);
  const actualSet = normalizeSet(result?.identity?.set);
  const ambiguityFlags = Array.isArray(result?.raw_signals?.set_identity?.ambiguity_flags)
    ? result.raw_signals.set_identity.ambiguity_flags
    : [];
  const setStatus = normalizeString(result?.raw_signals?.set_identity?.status);

  if (expectedSet) {
    if (actualSet === expectedSet) {
      return 'set_correct';
    }
    if (!actualSet) {
      return 'set_wrong';
    }
    return 'set_wrong';
  }

  if (!actualSet) {
    return 'set_unresolved_honest';
  }

  if (setStatus !== 'READY' || ambiguityFlags.length > 0) {
    return 'set_ambiguous';
  }

  return 'set_correct';
}

export function classifyModifierOutcome(caseDef, result) {
  const expectedModifier = caseDef?.expected?.printed_modifier ?? undefined;
  const actualModifier = result?.printed_modifier ?? null;
  const actualKey = normalizeModifierKey(actualModifier?.modifier_key);
  const actualStatus = normalizeString(actualModifier?.status);

  if (expectedModifier === undefined) {
    return actualKey ? 'modifier_detected' : 'modifier_not_expected';
  }

  if (expectedModifier === null) {
    return actualKey ? 'modifier_wrong' : 'modifier_unresolved_honest';
  }

  const expectedKey = normalizeModifierKey(expectedModifier.modifier_key);
  const expectedStatus = normalizeString(expectedModifier.status);

  if (expectedKey && actualKey === expectedKey && (!expectedStatus || actualStatus === expectedStatus)) {
    return 'modifier_correct';
  }

  if (!actualKey) {
    return 'modifier_missing';
  }

  return 'modifier_wrong';
}

function isPlausibleNumber(value) {
  const normalized = normalizeString(value);
  if (!normalized) return false;
  return /^[A-Z0-9-]+(?:\/\d{1,3})?$/i.test(normalized);
}

function isPlausibleSet(value) {
  const normalized = normalizeString(value);
  if (!normalized) return false;
  return /^[A-Z0-9][A-Z0-9._-]{0,31}$/i.test(normalized);
}

export function validateSemantics(result) {
  const violations = [];
  const warnings = [];

  const name = normalizeString(result?.identity?.name);
  const number = normalizeString(result?.identity?.number);
  const setCode = normalizeString(result?.identity?.set);
  const printedModifier = result?.printed_modifier ?? null;
  const confidence = result?.confidence?.identity ?? {};

  if (result?.status === 'READY') {
    if (!name) violations.push('READY result requires identity.name');
    if (!number) violations.push('READY result requires identity.number');
    if (!setCode) violations.push('READY result requires identity.set');
  }

  if (name && name.length < 2) {
    violations.push('identity.name is too short to be meaningful');
  }

  if (number && !isPlausibleNumber(number)) {
    violations.push(`identity.number is not plausible: ${number}`);
  }

  if (setCode && !isPlausibleSet(setCode)) {
    violations.push(`identity.set is not plausible: ${setCode}`);
  }

  for (const [field, rawValue] of Object.entries({
    overall: result?.confidence?.overall,
    name: confidence?.name,
    number: confidence?.number,
    set: confidence?.set,
  })) {
    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
      violations.push(`confidence.${field} is missing or non-numeric`);
      continue;
    }
    if (rawValue < 0 || rawValue > 1) {
      violations.push(`confidence.${field} is outside [0,1]`);
    }
    if (field !== 'overall' && rawValue < 0.5) {
      warnings.push(`low_confidence:${field}`);
    }
  }

  if (!Array.isArray(result?.errors)) {
    violations.push('errors must be an array');
  }

  if (printedModifier && typeof printedModifier === 'object') {
    const modifierStatus = normalizeString(printedModifier.status);
    const modifierKey = normalizeString(printedModifier.modifier_key);
    const modifierLabel = normalizeString(printedModifier.modifier_label);
    const modifierConfidence = printedModifier.confidence;

    if (modifierStatus && !['READY', 'PARTIAL', 'BLOCKED'].includes(modifierStatus)) {
      violations.push(`printed_modifier.status is invalid: ${modifierStatus}`);
    }
    if (modifierStatus === 'READY' && !modifierKey) {
      violations.push('printed_modifier READY requires modifier_key');
    }
    if (modifierStatus === 'READY' && !modifierLabel) {
      violations.push('printed_modifier READY requires modifier_label');
    }
    if (modifierConfidence !== null && modifierConfidence !== undefined) {
      if (typeof modifierConfidence !== 'number' || !Number.isFinite(modifierConfidence)) {
        violations.push('printed_modifier.confidence is missing or non-numeric');
      } else if (modifierConfidence < 0 || modifierConfidence > 1) {
        violations.push('printed_modifier.confidence is outside [0,1]');
      } else if (modifierConfidence < 0.5) {
        warnings.push('low_confidence:printed_modifier');
      }
    }
  }

  return {
    ok: violations.length === 0,
    violations,
    warnings,
  };
}

export function validateExpected(caseDef, result) {
  const failures = [];
  const expected = caseDef?.expected ?? {};

  if (normalizeString(expected.status) && expected.status !== result?.status) {
    failures.push(`status mismatch: expected ${expected.status}, got ${result?.status ?? 'null'}`);
  }

  if (expected.name !== undefined && expected.name !== null) {
    const expectedName = normalizeName(expected.name);
    const actualName = normalizeName(result?.identity?.name);
    if (expectedName !== actualName) {
      failures.push(`name mismatch: expected ${expected.name}, got ${result?.identity?.name ?? 'null'}`);
    }
  }

  if (expected.number !== undefined && expected.number !== null) {
    const expectedNumber = normalizeNumber(expected.number);
    const actualNumber = normalizeNumber(result?.identity?.number);
    if (expectedNumber !== actualNumber) {
      failures.push(
        `number mismatch: expected ${expected.number}, got ${result?.identity?.number ?? 'null'}`,
      );
    }
  }

  if (expected.set !== undefined && expected.set !== null) {
    const expectedSet = normalizeSet(expected.set);
    const actualSet = normalizeSet(result?.identity?.set);
    if (expectedSet !== actualSet) {
      failures.push(`set mismatch: expected ${expected.set}, got ${result?.identity?.set ?? 'null'}`);
    }
  }

  if (expected.printed_modifier !== undefined) {
    const expectedModifier = expected.printed_modifier ?? null;
    const actualModifier = result?.printed_modifier ?? null;

    if (expectedModifier === null) {
      if (actualModifier?.modifier_key) {
        failures.push(`printed_modifier mismatch: expected null, got ${actualModifier.modifier_key}`);
      }
    } else {
      const expectedStatus = normalizeString(expectedModifier.status);
      const expectedKey = normalizeModifierKey(expectedModifier.modifier_key);
      const actualStatus = normalizeString(actualModifier?.status);
      const actualKey = normalizeModifierKey(actualModifier?.modifier_key);

      if (expectedStatus && expectedStatus !== actualStatus) {
        failures.push(`printed_modifier status mismatch: expected ${expectedStatus}, got ${actualStatus ?? 'null'}`);
      }
      if (expectedKey && expectedKey !== actualKey) {
        failures.push(
          `printed_modifier key mismatch: expected ${expectedModifier.modifier_key}, got ${actualModifier?.modifier_key ?? 'null'}`,
        );
      }
    }
  }

  return {
    ok: failures.length === 0,
    failures,
  };
}

export function stableOutputView(result) {
  return {
    status: result?.status ?? null,
    identity: {
      name: normalizeString(result?.identity?.name),
      number: normalizeNumber(result?.identity?.number),
      set: normalizeSet(result?.identity?.set),
    },
    printed_modifier: {
      status: normalizeString(result?.printed_modifier?.status),
      modifier_key: normalizeModifierKey(result?.printed_modifier?.modifier_key),
      confidence:
        typeof result?.printed_modifier?.confidence === 'number'
          ? Number(result.printed_modifier.confidence.toFixed(4))
          : null,
    },
    confidence: {
      overall:
        typeof result?.confidence?.overall === 'number'
          ? Number(result.confidence.overall.toFixed(4))
          : null,
      identity: {
        name:
          typeof result?.confidence?.identity?.name === 'number'
            ? Number(result.confidence.identity.name.toFixed(4))
            : null,
        number:
          typeof result?.confidence?.identity?.number === 'number'
            ? Number(result.confidence.identity.number.toFixed(4))
            : null,
        set:
          typeof result?.confidence?.identity?.set === 'number'
            ? Number(result.confidence.identity.set.toFixed(4))
            : null,
      },
    },
    errors: Array.isArray(result?.errors) ? [...result.errors].sort() : [],
  };
}

export function validateDeterminism(results) {
  const failures = [];
  if (!Array.isArray(results) || results.length === 0) {
    return { ok: false, failures: ['no_runs_executed'] };
  }
  const baseline = JSON.stringify(stableOutputView(results[0]));
  results.slice(1).forEach((result, index) => {
    const current = JSON.stringify(stableOutputView(result));
    if (current !== baseline) {
      failures.push(`run_${index + 2}_mismatch`);
    }
  });
  return {
    ok: failures.length === 0,
    failures,
  };
}

export function validateReplay(firstResult, secondResult) {
  const left = JSON.stringify(stableOutputView(firstResult));
  const right = JSON.stringify(stableOutputView(secondResult));
  const ok = left === right;
  return {
    ok,
    failures: ok ? [] : ['replay_output_mismatch'],
  };
}
