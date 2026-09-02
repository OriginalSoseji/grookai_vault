import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repositoryRoot = path.resolve(__dirname, '..', '..');
const spriteDirectory = path.join(
  repositoryRoot,
  'apps',
  'web',
  'public',
  'dex',
  'sprites',
  'v1',
);

test('Grookai Dex uses one self-hosted pixel sprite contract on web and Flutter', () => {
  const webSource = fs.readFileSync(
    path.join(repositoryRoot, 'apps', 'web', 'src', 'lib', 'grookaiDex', 'pokemonSprite.ts'),
    'utf8',
  );
  const flutterSource = fs.readFileSync(
    path.join(repositoryRoot, 'lib', 'utils', 'pokemon_sprite_url.dart'),
    'utf8',
  );
  const dexScreenSource = fs.readFileSync(
    path.join(repositoryRoot, 'lib', 'screens', 'dex', 'grookai_dex_screen.dart'),
    'utf8',
  );
  const speciesScreenSource = fs.readFileSync(
    path.join(repositoryRoot, 'lib', 'screens', 'dex', 'grookai_dex_species_screen.dart'),
    'utf8',
  );

  assert.match(webSource, /GROOKAI_DEX_SPRITE_BASE_PATH = "\/dex\/sprites\/v1"/);
  assert.match(flutterSource, /'grookaivault\.com',[\s\S]*'\/dex\/sprites\/v1\/\$nationalDexNumber\.png'/);
  assert.doesNotMatch(webSource, /raw\.githubusercontent\.com|PokeAPI/);
  assert.doesNotMatch(flutterSource, /raw\.githubusercontent\.com|_next\/image/);
  assert.match(dexScreenSource, /filterQuality:\s*FilterQuality\.none/);
  assert.match(speciesScreenSource, /filterQuality:\s*FilterQuality\.none/);
});

test('the self-hosted sprite corpus covers every seeded National Dex species', () => {
  const seed = JSON.parse(
    fs.readFileSync(
      path.join(repositoryRoot, 'data', 'grookai_dex', 'pokemon_species_seed_v1.json'),
      'utf8',
    ),
  );
  const manifest = JSON.parse(
    fs.readFileSync(path.join(spriteDirectory, 'manifest.json'), 'utf8'),
  );
  const expectedNumbers = new Set(
    seed.species.map((row) => row.nationalDexNumber),
  );
  const sortedExpectedNumbers = [...expectedNumbers].sort((left, right) => left - right);
  const verifiedFiles = [];

  assert.equal(manifest.schema_version, 'GROOKAI_DEX_PIXEL_SPRITES_V1');
  assert.equal(manifest.sprite_count, expectedNumbers.size);
  assert.equal(manifest.files.length, expectedNumbers.size);
  assert.equal(manifest.first_national_dex_number, sortedExpectedNumbers[0]);
  assert.equal(manifest.last_national_dex_number, sortedExpectedNumbers.at(-1));

  for (const file of manifest.files) {
    assert.equal(expectedNumbers.delete(file.national_dex_number), true);
    const buffer = fs.readFileSync(
      path.join(spriteDirectory, `${file.national_dex_number}.png`),
    );
    assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG');
    assert.equal(buffer.length, file.bytes);
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    assert.equal(fileHash, file.sha256);
    verifiedFiles.push(`${file.national_dex_number}:${fileHash}`);
  }
  assert.equal(expectedNumbers.size, 0);
  assert.equal(
    crypto.createHash('sha256').update(verifiedFiles.join('\n')).digest('hex'),
    manifest.aggregate_sha256,
  );
});

test('the sync tool refuses to replace an immutable corpus from another source commit', () => {
  const result = spawnSync(
    process.execPath,
    [path.join(repositoryRoot, 'scripts', 'catalog', 'sync_pokemon_dex_sprites.mjs')],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        POKEAPI_SPRITES_COMMIT: '0000000000000000000000000000000000000000',
      },
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing to replace immutable \/dex\/sprites\/v1 assets/);
});
