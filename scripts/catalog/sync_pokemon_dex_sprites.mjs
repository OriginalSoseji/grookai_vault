import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repositoryRoot = path.resolve(__dirname, '..', '..');
const speciesSeedPath = path.join(
  repositoryRoot,
  'data',
  'grookai_dex',
  'pokemon_species_seed_v1.json',
);
const outputDirectory = path.join(
  repositoryRoot,
  'apps',
  'web',
  'public',
  'dex',
  'sprites',
  'v1',
);
const sourceCommit = (
  process.env.POKEAPI_SPRITES_COMMIT ??
  'b2486a428a7548c874ad3900951d5334a40d21a5'
).trim();
const concurrency = Math.max(
  1,
  Math.min(32, Number.parseInt(process.env.POKEMON_SPRITE_SYNC_CONCURRENCY ?? '16', 10) || 16),
);
const sourcePathTemplate = `https://raw.githubusercontent.com/PokeAPI/sprites/${sourceCommit}/sprites/pokemon/{national_dex_number}.png`;

function spriteSourceUrl(nationalDexNumber) {
  return sourcePathTemplate.replace('{national_dex_number}', String(nationalDexNumber));
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function isPng(buffer) {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

async function downloadSprite(nationalDexNumber) {
  const response = await fetch(spriteSourceUrl(nationalDexNumber), {
    headers: { 'User-Agent': 'Grookai-Dex-Sprite-Sync/1.0' },
  });
  if (!response.ok) {
    throw new Error(`Sprite ${nationalDexNumber} returned HTTP ${response.status}.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!isPng(buffer)) {
    throw new Error(`Sprite ${nationalDexNumber} is not a valid PNG.`);
  }

  const relativePath = `${nationalDexNumber}.png`;
  await fs.writeFile(path.join(outputDirectory, relativePath), buffer);
  return {
    national_dex_number: nationalDexNumber,
    path: `/dex/sprites/v1/${relativePath}`,
    bytes: buffer.length,
    sha256: sha256(buffer),
  };
}

async function runPool(values, worker) {
  const results = new Array(values.length);
  let cursor = 0;

  async function consume() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(values[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => consume()),
  );
  return results;
}

const seed = JSON.parse(await fs.readFile(speciesSeedPath, 'utf8'));
const dexNumbers = [...new Set(
  (seed.species ?? [])
    .map((row) => row.nationalDexNumber)
    .filter((value) => Number.isSafeInteger(value) && value > 0),
)].sort((left, right) => left - right);

if (dexNumbers.length !== seed.metadata?.expectedSpeciesCount) {
  throw new Error(
    `Species seed mismatch: expected ${seed.metadata?.expectedSpeciesCount}, found ${dexNumbers.length}.`,
  );
}

await fs.mkdir(outputDirectory, { recursive: true });
const files = await runPool(dexNumbers, downloadSprite);
const manifest = {
  schema_version: 'GROOKAI_DEX_PIXEL_SPRITES_V1',
  source: {
    repository: 'https://github.com/PokeAPI/sprites',
    commit: sourceCommit,
    path_template: sourcePathTemplate,
  },
  species_seed: 'data/grookai_dex/pokemon_species_seed_v1.json',
  sprite_count: files.length,
  first_national_dex_number: dexNumbers[0],
  last_national_dex_number: dexNumbers.at(-1),
  aggregate_sha256: sha256(
    Buffer.from(files.map((file) => `${file.national_dex_number}:${file.sha256}`).join('\n')),
  ),
  files,
};

await fs.writeFile(
  path.join(outputDirectory, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  sprite_count: manifest.sprite_count,
  source_commit: sourceCommit,
  aggregate_sha256: manifest.aggregate_sha256,
  output_directory: path.relative(repositoryRoot, outputDirectory),
}));
