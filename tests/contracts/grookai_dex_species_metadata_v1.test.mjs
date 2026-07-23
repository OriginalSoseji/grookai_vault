import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  GROOKAI_DEX_CANONICAL_TYPES as BUILDER_CANONICAL_TYPES,
  GROOKAI_DEX_EXPECTED_SPECIES_COUNT,
  GROOKAI_DEX_GENERATION_IDS,
  GROOKAI_DEX_METADATA_SOURCE_READ_COUNT,
  buildSpeciesMetadataMaps,
  enrichSpeciesRows,
} from '../../scripts/grookai_dex/build_species_seed_from_pokeapi_v1.mjs';
import {
  GROOKAI_DEX_CANONICAL_TYPES as LOADER_CANONICAL_TYPES,
  loadSpeciesSeed,
  validateSpeciesSeed,
} from '../../backend/grookai_dex/grookai_dex_common_v1.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const SEED_PATH = path.join(ROOT, 'data', 'grookai_dex', 'pokemon_species_seed_v1.json');
const WORKER_PATH = path.join(
  ROOT,
  'backend',
  'grookai_dex',
  'grookai_dex_species_worker_v1.mjs',
);
const CHECKPOINT_PATH = path.join(ROOT, 'scripts', 'grookai_dex', 'checkpoint_v1.mjs');
const CHECKPOINT_JSON_PATH = path.join(
  ROOT,
  'docs',
  'audits',
  'grookai_dex_v1',
  'grookai_dex_v1_checkpoint_20260518.json',
);
const CHECKPOINT_MD_PATH = path.join(
  ROOT,
  'docs',
  'audits',
  'grookai_dex_v1',
  'grookai_dex_v1_checkpoint_20260518.md',
);

test('committed Dex seed has complete canonical generation and type metadata', async () => {
  const seed = JSON.parse(await fs.readFile(SEED_PATH, 'utf8'));
  assert.equal(seed.metadata.metadataSourceReadCount, 27);
  assert.equal(seed.species.length, GROOKAI_DEX_EXPECTED_SPECIES_COUNT);
  assert.deepEqual(BUILDER_CANONICAL_TYPES, LOADER_CANONICAL_TYPES);

  const generations = new Set();
  const observedTypes = new Set();
  for (const row of seed.species) {
    assert.ok(
      Number.isInteger(row.generation) && row.generation >= 1 && row.generation <= 9,
      `invalid generation for ${row.slug}`,
    );
    assert.ok(
      Array.isArray(row.types) && row.types.length >= 1 && row.types.length <= 2,
      `invalid type count for ${row.slug}`,
    );
    assert.equal(new Set(row.types).size, row.types.length, `duplicate type for ${row.slug}`);
    for (const type of row.types) {
      assert.equal(type, type.toLowerCase(), `non-lowercase type for ${row.slug}`);
      assert.ok(BUILDER_CANONICAL_TYPES.includes(type), `unknown type ${type} for ${row.slug}`);
      observedTypes.add(type);
    }
    generations.add(row.generation);
  }

  assert.deepEqual([...generations].sort((left, right) => left - right), [
    ...GROOKAI_DEX_GENERATION_IDS,
  ]);
  assert.deepEqual([...observedTypes].sort(), [...BUILDER_CANONICAL_TYPES].sort());

  const loaded = await loadSpeciesSeed();
  const validation = validateSpeciesSeed(loaded);
  assert.deepEqual(validation.errors, []);
  assert.deepEqual(validation.warnings, []);
  assert.equal(loaded.species.length, GROOKAI_DEX_EXPECTED_SPECIES_COUNT);
  assert.ok(loaded.species.every((row) => row.generation != null && row.types.length > 0));
});

test('metadata builder uses 9 generation and 18 type reads and fails closed on gaps', () => {
  assert.equal(GROOKAI_DEX_GENERATION_IDS.length, 9);
  assert.equal(BUILDER_CANONICAL_TYPES.length, 18);
  assert.equal(GROOKAI_DEX_METADATA_SOURCE_READ_COUNT, 27);

  const speciesUrl = 'https://pokeapi.co/api/v2/pokemon-species/1/';
  const pokemonUrl = 'https://pokeapi.co/api/v2/pokemon/1/';
  const generationPayloads = GROOKAI_DEX_GENERATION_IDS.map((generation) => ({
    generation,
    payload: {
      pokemon_species: generation === 1 ? [{ name: 'bulbasaur', url: speciesUrl }] : [],
    },
  }));
  const typePayloads = BUILDER_CANONICAL_TYPES.map((type) => ({
    type,
    payload: {
      pokemon:
        type === 'grass' || type === 'poison'
          ? [{ pokemon: { name: 'bulbasaur', url: pokemonUrl } }]
          : [],
    },
  }));
  const metadata = buildSpeciesMetadataMaps({ generationPayloads, typePayloads });
  assert.deepEqual(
    enrichSpeciesRows([{ name: 'bulbasaur', url: speciesUrl }], metadata),
    [
      {
        nationalDexNumber: 1,
        slug: 'bulbasaur',
        canonicalName: 'bulbasaur',
        displayName: 'Bulbasaur',
        generation: 1,
        types: ['grass', 'poison'],
      },
    ],
  );

  assert.throws(
    () =>
      enrichSpeciesRows([{ name: 'bulbasaur', url: speciesUrl }], {
        generationByDexNumber: new Map(),
        typesByDexNumber: metadata.typesByDexNumber,
      }),
    /Missing generation/,
  );
  assert.throws(
    () =>
      enrichSpeciesRows([{ name: 'bulbasaur', url: speciesUrl }], {
        generationByDexNumber: metadata.generationByDexNumber,
        typesByDexNumber: new Map(),
      }),
    /Missing or invalid types/,
  );
});

test('species worker upserts metadata and checkpoint requires complete coverage', async () => {
  const [
    workerSource,
    checkpointSource,
    checkpointJson,
    checkpointMarkdown,
  ] = await Promise.all([
    fs.readFile(WORKER_PATH, 'utf8'),
    fs.readFile(CHECKPOINT_PATH, 'utf8'),
    fs.readFile(CHECKPOINT_JSON_PATH, 'utf8'),
    fs.readFile(CHECKPOINT_MD_PATH, 'utf8'),
  ]);
  const uuidLiteral = /[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/i;

  assert.match(workerSource, /slug,\s+generation,\s+types,\s+source,/);
  assert.match(workerSource, /generation = excluded\.generation,/);
  assert.match(workerSource, /types = excluded\.types,/);
  assert.match(workerSource, /row\.generation,\s+row\.types,/);

  assert.match(checkpointSource, /as species_generation_count/);
  assert.match(checkpointSource, /as species_types_count/);
  assert.match(checkpointSource, /as species_metadata_count/);
  assert.match(
    checkpointSource,
    /counts\.species_metadata_count === counts\.species_count/,
  );
  assert.doesNotMatch(checkpointSource, uuidLiteral);
  assert.doesNotMatch(checkpointJson, uuidLiteral);
  assert.doesNotMatch(checkpointMarkdown, uuidLiteral);
  assert.doesNotMatch(checkpointSource, /sample_user_id/);
  assert.doesNotMatch(checkpointJson, /sample_user_id/);
  assert.match(checkpointSource, /select distinct ts\.slug, cps\.card_print_id/);
  assert.match(checkpointSource, /left join public\.slab_certs slab/);
  assert.match(
    checkpointSource,
    /coalesce\(vii\.card_print_id, slab\.card_print_id\)/,
  );
  assert.match(checkpointSource, /anonymized_user_progress_samples/);
});
