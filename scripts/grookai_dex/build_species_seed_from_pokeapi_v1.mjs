import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const OUT_PATH = path.join(ROOT, 'data', 'grookai_dex', 'pokemon_species_seed_v1.json');
const SOURCE_URL = 'https://pokeapi.co/api/v2/pokemon-species?limit=2000&offset=0';

function titleCaseSlug(slug) {
  return String(slug)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function extractNationalDexNumber(url) {
  const match = String(url ?? '').match(/\/pokemon-species\/(\d+)\/?$/);
  if (!match) {
    throw new Error(`[grookai-dex-seed] Could not parse national dex number from ${url}`);
  }
  return Number.parseInt(match[1], 10);
}

async function main() {
  const response = await fetch(SOURCE_URL, {
    headers: {
      'User-Agent': 'grookai-dex-seed-builder/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`[grookai-dex-seed] PokeAPI request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const results = Array.isArray(payload.results) ? payload.results : [];
  const species = results
    .map((row) => {
      const slug = String(row.name ?? '').trim().toLowerCase();
      const nationalDexNumber = extractNationalDexNumber(row.url);
      if (!slug || !Number.isInteger(nationalDexNumber)) {
        throw new Error(`[grookai-dex-seed] Invalid species row: ${JSON.stringify(row)}`);
      }
      return {
        nationalDexNumber,
        slug,
        canonicalName: slug,
        displayName: titleCaseSlug(slug),
      };
    })
    .sort((left, right) => left.nationalDexNumber - right.nationalDexNumber);

  const seed = {
    metadata: {
      contract: 'GROOKAI_DEX_V1',
      source: 'pokeapi',
      sourceUrl: SOURCE_URL,
      generatedAt: new Date().toISOString(),
      expectedSpeciesCount: payload.count,
      speciesCount: species.length,
      note: 'Generated seed for Grookai Dex V1. Display-name exceptions are applied by pokemon_species_exceptions_v1.json.',
    },
    species,
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');
  console.log(`[grookai-dex-seed] wrote ${species.length} species to ${path.relative(ROOT, OUT_PATH)}`);
}

main().catch((error) => {
  console.error('[grookai-dex-seed] fatal:', error);
  process.exitCode = 1;
});
