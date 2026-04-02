export const TK_MANIFEST_V1_FAMILY_CONFIG = {
  'bw-trainer-kit-excadrill-zoroark-pokemon': {
    decks: {
      'tk-bw-e': { marker: 'Excadrill', expected_slot_count: 30 },
      'tk-bw-z': { marker: 'Zoroark', expected_slot_count: 30 },
    },
  },
  'dp-trainer-kit-manaphy-lucario-pokemon': {
    decks: {
      'tk-dp-l': { marker: 'Lucario', expected_slot_count: 11 },
      'tk-dp-m': { marker: 'Manaphy', expected_slot_count: 12 },
    },
  },
};

const KNOWN_TRAINER_NAMES = new Set([
  'Potion',
  'PlusPower',
  'Energy Search',
  'Energy Retrieval',
  'Energy Switch',
  'Pokémon Communication',
]);

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function parseSlot(value, familyId, deckCode) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    throw new Error(`[tk-manifest-v1] STOP: missing slot number for ${familyId}/${deckCode}.`);
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isInteger(parsed) || Number.isNaN(parsed)) {
    throw new Error(
      `[tk-manifest-v1] STOP: invalid slot "${normalized}" for ${familyId}/${deckCode}.`,
    );
  }

  return parsed;
}

function classifyCard(name) {
  const normalized = normalizeTextOrNull(name);
  if (!normalized) {
    throw new Error('[tk-manifest-v1] STOP: unknown classification for empty card name.');
  }

  if (KNOWN_TRAINER_NAMES.has(normalized)) {
    return 'TRAINER';
  }

  if (normalized.includes('Energy')) {
    return 'ENERGY';
  }

  return 'POKEMON';
}

export function stripTkSlotSuffix(nameRaw) {
  const normalized = normalizeTextOrNull(nameRaw);
  if (!normalized) {
    return null;
  }

  const stripped = normalized.replace(/\s*\(#\d+(?: [^)]+)?\)\s*$/i, '').trim();
  return stripped.length > 0 ? stripped : normalized;
}

export function extractTkDeckSlot(numberRaw) {
  const normalized = normalizeTextOrNull(numberRaw);
  if (!normalized) {
    throw new Error('[tk-manifest-v1] STOP: missing TK slot number.');
  }

  const [left] = normalized.split('/');
  const slot = Number.parseInt(String(left ?? '').trim(), 10);
  if (!Number.isInteger(slot) || Number.isNaN(slot)) {
    throw new Error(`[tk-manifest-v1] STOP: invalid TK slot "${normalized}".`);
  }

  return slot;
}

export function resolveTkFamilyConfig(familyId) {
  const config = TK_MANIFEST_V1_FAMILY_CONFIG[familyId] ?? null;
  if (!config) {
    throw new Error(`[tk-manifest-v1] STOP: family not in TK_MANIFEST_V1: ${familyId}`);
  }
  return config;
}

export async function buildTkManifestV1ForFamily(supabase, familyId) {
  const familyConfig = resolveTkFamilyConfig(familyId);
  const deckCodes = Object.keys(familyConfig.decks);

  const { data, error } = await supabase
    .from('card_prints')
    .select('id,set_code,name,number')
    .in('set_code', deckCodes)
    .order('set_code', { ascending: true })
    .order('number', { ascending: true });

  if (error) {
    throw error;
  }

  const manifest = {
    family_id: familyId,
    decks: {},
  };

  for (const deckCode of deckCodes) {
    manifest.decks[deckCode] = {
      marker: familyConfig.decks[deckCode].marker,
      expected_slot_count: familyConfig.decks[deckCode].expected_slot_count,
      slots: {},
    };
  }

  for (const row of data ?? []) {
    const deckCode = normalizeTextOrNull(row.set_code);
    if (!deckCode || !manifest.decks[deckCode]) {
      throw new Error(`[tk-manifest-v1] STOP: unexpected deck "${deckCode}" for ${familyId}.`);
    }

    const slot = parseSlot(row.number, familyId, deckCode);
    const expectedSlotCount = familyConfig.decks[deckCode].expected_slot_count;
    if (slot < 1 || slot > expectedSlotCount) {
      throw new Error(
        `[tk-manifest-v1] STOP: slot ${slot} out of range for ${familyId}/${deckCode}.`,
      );
    }

    if (manifest.decks[deckCode].slots[slot]) {
      throw new Error(`[tk-manifest-v1] STOP: duplicate slot ${slot} in ${deckCode}.`);
    }

    const occupantName = normalizeTextOrNull(row.name);
    manifest.decks[deckCode].slots[slot] = {
      card_print_id: row.id,
      set_code: deckCode,
      number: String(slot),
      name: occupantName,
      class: classifyCard(occupantName),
    };
  }

  for (const deckCode of deckCodes) {
    const slots = manifest.decks[deckCode].slots;
    const expectedSlotCount = familyConfig.decks[deckCode].expected_slot_count;
    const slotNumbers = Object.keys(slots)
      .map((value) => Number.parseInt(value, 10))
      .sort((left, right) => left - right);

    if (slotNumbers.length !== expectedSlotCount) {
      throw new Error(
        `[tk-manifest-v1] STOP: ${deckCode} has ${slotNumbers.length} slots, expected ${expectedSlotCount}.`,
      );
    }

    for (let slot = 1; slot <= expectedSlotCount; slot += 1) {
      const occupant = slots[slot];
      if (!occupant) {
        throw new Error(`[tk-manifest-v1] STOP: ${deckCode} missing slot ${slot}.`);
      }
      if (!occupant.card_print_id || !occupant.name || !occupant.class) {
        throw new Error(`[tk-manifest-v1] STOP: ${deckCode} slot ${slot} has invalid occupant.`);
      }
    }
  }

  return manifest;
}
