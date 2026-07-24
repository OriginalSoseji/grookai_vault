import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const OUT_PATH = path.join(ROOT, 'data', 'grookai_dex', 'pokemon_species_seed_v1.json');
const POKEAPI_ROOT = 'https://pokeapi.co/api/v2';

export const GROOKAI_DEX_EXPECTED_SPECIES_COUNT = 1025;
export const GROOKAI_DEX_GENERATION_IDS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9]);
export const GROOKAI_DEX_CANONICAL_TYPES = Object.freeze([
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
]);
export const GROOKAI_DEX_METADATA_SOURCE_READ_COUNT =
  GROOKAI_DEX_GENERATION_IDS.length + GROOKAI_DEX_CANONICAL_TYPES.length;

function titleCaseSlug(slug) {
  return String(slug)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function extractNationalDexNumber(url) {
  return extractResourceNumber(url, 'pokemon-species');
}

function extractResourceNumber(url, resourceName) {
  const match = String(url ?? '').match(new RegExp(`/${resourceName}/(\\d+)/?$`));
  if (!match) {
    throw new Error(`[grookai-dex-seed] Could not parse ${resourceName} number from ${url}`);
  }
  return Number.parseInt(match[1], 10);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'grookai-dex-seed-builder/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(
      `[grookai-dex-seed] PokeAPI request failed for ${url}: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
}

export function buildSpeciesMetadataMaps({ generationPayloads, typePayloads }) {
  if (generationPayloads.length !== GROOKAI_DEX_GENERATION_IDS.length) {
    throw new Error(
      `[grookai-dex-seed] Expected ${GROOKAI_DEX_GENERATION_IDS.length} generation payloads, received ${generationPayloads.length}`,
    );
  }
  if (typePayloads.length !== GROOKAI_DEX_CANONICAL_TYPES.length) {
    throw new Error(
      `[grookai-dex-seed] Expected ${GROOKAI_DEX_CANONICAL_TYPES.length} type payloads, received ${typePayloads.length}`,
    );
  }

  const generationByDexNumber = new Map();
  const speciesRowByDexNumber = new Map();
  for (const { generation, payload } of generationPayloads) {
    if (!GROOKAI_DEX_GENERATION_IDS.includes(generation)) {
      throw new Error(`[grookai-dex-seed] Unsupported generation payload: ${generation}`);
    }
    const speciesRows = Array.isArray(payload?.pokemon_species) ? payload.pokemon_species : [];
    for (const species of speciesRows) {
      const nationalDexNumber = extractNationalDexNumber(species?.url);
      const slug = String(species?.name ?? '').trim().toLowerCase();
      if (!slug) {
        throw new Error(
          `[grookai-dex-seed] Missing species slug for National Dex ${nationalDexNumber}`,
        );
      }
      const existing = generationByDexNumber.get(nationalDexNumber);
      if (existing != null && existing !== generation) {
        throw new Error(
          `[grookai-dex-seed] Conflicting generations for National Dex ${nationalDexNumber}: ${existing}, ${generation}`,
        );
      }
      generationByDexNumber.set(nationalDexNumber, generation);
      const existingSpecies = speciesRowByDexNumber.get(nationalDexNumber);
      if (existingSpecies != null && existingSpecies.name !== slug) {
        throw new Error(
          `[grookai-dex-seed] Conflicting species slugs for National Dex ${nationalDexNumber}: ${existingSpecies.name}, ${slug}`,
        );
      }
      speciesRowByDexNumber.set(nationalDexNumber, {
        name: slug,
        url: species.url,
      });
    }
  }

  const typesByDexNumber = new Map();
  for (const { type, payload } of typePayloads) {
    if (!GROOKAI_DEX_CANONICAL_TYPES.includes(type)) {
      throw new Error(`[grookai-dex-seed] Unsupported Pokemon type payload: ${type}`);
    }
    const pokemonRows = Array.isArray(payload?.pokemon) ? payload.pokemon : [];
    for (const row of pokemonRows) {
      const nationalDexNumber = extractResourceNumber(row?.pokemon?.url, 'pokemon');
      const current = typesByDexNumber.get(nationalDexNumber) ?? [];
      if (!current.includes(type)) {
        typesByDexNumber.set(nationalDexNumber, [...current, type]);
      }
    }
  }

  return {
    generationByDexNumber,
    typesByDexNumber,
    speciesRows: [...speciesRowByDexNumber.values()],
  };
}

export function enrichSpeciesRows(results, metadata) {
  const seenDexNumbers = new Set();
  const species = results
    .map((row) => {
      const slug = String(row.name ?? '').trim().toLowerCase();
      const nationalDexNumber = extractNationalDexNumber(row.url);
      const generation = metadata.generationByDexNumber.get(nationalDexNumber);
      const types = metadata.typesByDexNumber.get(nationalDexNumber) ?? [];
      if (!slug || !Number.isInteger(nationalDexNumber)) {
        throw new Error(`[grookai-dex-seed] Invalid species row: ${JSON.stringify(row)}`);
      }
      if (seenDexNumbers.has(nationalDexNumber)) {
        throw new Error(`[grookai-dex-seed] Duplicate National Dex number: ${nationalDexNumber}`);
      }
      if (!Number.isInteger(generation) || !GROOKAI_DEX_GENERATION_IDS.includes(generation)) {
        throw new Error(
          `[grookai-dex-seed] Missing generation for ${slug} (#${nationalDexNumber})`,
        );
      }
      if (
        types.length < 1 ||
        types.length > 2 ||
        types.some((type) => !GROOKAI_DEX_CANONICAL_TYPES.includes(type))
      ) {
        throw new Error(
          `[grookai-dex-seed] Missing or invalid types for ${slug} (#${nationalDexNumber}): ${JSON.stringify(types)}`,
        );
      }
      seenDexNumbers.add(nationalDexNumber);
      return {
        nationalDexNumber,
        slug,
        canonicalName: slug,
        displayName: titleCaseSlug(slug),
        generation,
        types,
      };
    })
    .sort((left, right) => left.nationalDexNumber - right.nationalDexNumber);

  return species;
}

async function fetchSpeciesMetadata() {
  const requests = [
    ...GROOKAI_DEX_GENERATION_IDS.map((generation) => ({
      kind: 'generation',
      value: generation,
      url: `${POKEAPI_ROOT}/generation/${generation}`,
    })),
    ...GROOKAI_DEX_CANONICAL_TYPES.map((type) => ({
      kind: 'type',
      value: type,
      url: `${POKEAPI_ROOT}/type/${type}`,
    })),
  ];
  if (requests.length !== GROOKAI_DEX_METADATA_SOURCE_READ_COUNT) {
    throw new Error(
      `[grookai-dex-seed] Metadata read contract drifted: expected ${GROOKAI_DEX_METADATA_SOURCE_READ_COUNT}, received ${requests.length}`,
    );
  }

  const responses = await Promise.all(
    requests.map(async (request) => ({ request, payload: await fetchJson(request.url) })),
  );
  return buildSpeciesMetadataMaps({
    generationPayloads: responses
      .filter(({ request }) => request.kind === 'generation')
      .map(({ request, payload }) => ({ generation: request.value, payload })),
    typePayloads: responses
      .filter(({ request }) => request.kind === 'type')
      .map(({ request, payload }) => ({ type: request.value, payload })),
  });
}

async function main() {
  const metadata = await fetchSpeciesMetadata();
  const species = enrichSpeciesRows(metadata.speciesRows, metadata);
  if (species.length !== GROOKAI_DEX_EXPECTED_SPECIES_COUNT) {
    throw new Error(
      `[grookai-dex-seed] Species count mismatch: expected ${GROOKAI_DEX_EXPECTED_SPECIES_COUNT}, received ${species.length}`,
    );
  }

  const seed = {
    metadata: {
      contract: 'GROOKAI_DEX_V1',
      source: 'pokeapi',
      sourceUrl: `${POKEAPI_ROOT}/generation/`,
      typeSourceUrl: `${POKEAPI_ROOT}/type/`,
      generatedAt: new Date().toISOString(),
      expectedSpeciesCount: GROOKAI_DEX_EXPECTED_SPECIES_COUNT,
      speciesCount: species.length,
      metadataSourceReadCount: GROOKAI_DEX_METADATA_SOURCE_READ_COUNT,
      note: 'Generated seed for Grookai Dex V1 with canonical generation and type metadata. Display-name exceptions are applied by pokemon_species_exceptions_v1.json.',
    },
    species,
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');
  console.log(`[grookai-dex-seed] wrote ${species.length} species to ${path.relative(ROOT, OUT_PATH)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error('[grookai-dex-seed] fatal:', error);
    process.exitCode = 1;
  });
}
