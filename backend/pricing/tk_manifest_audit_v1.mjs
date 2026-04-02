import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';
import { buildTkManifestV1ForFamily } from './tk_manifest_v1.mjs';

const TARGET_FAMILY = 'bw-trainer-kit-excadrill-zoroark-pokemon';

if (process.env.SUPABASE_URL_LOCAL) {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL_LOCAL;
}
if (process.env.SUPABASE_SECRET_KEY_LOCAL) {
  process.env.SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY_LOCAL;
}

function parseArgs(argv) {
  return {
    verbose: argv.includes('--verbose'),
  };
}

function summarizeDeck(deckManifest) {
  const summary = {
    slot_count: 0,
    pokemon_count: 0,
    trainer_count: 0,
    energy_count: 0,
  };

  for (const occupant of Object.values(deckManifest.slots)) {
    summary.slot_count += 1;

    if (occupant.class === 'POKEMON') {
      summary.pokemon_count += 1;
    } else if (occupant.class === 'TRAINER') {
      summary.trainer_count += 1;
    } else if (occupant.class === 'ENERGY') {
      summary.energy_count += 1;
    } else {
      throw new Error(`[tk-manifest-audit] STOP: unknown classification "${occupant.class}".`);
    }
  }

  return summary;
}

function printSummary(manifest, options) {
  const decks = manifest.decks;
  const deckCodes = Object.keys(decks);

  console.log(`family=${TARGET_FAMILY}`);
  console.log(`decks=${deckCodes.join(', ')}`);

  for (const deck of deckCodes) {
    const summary = summarizeDeck(decks[deck]);
    console.log(`deck=${deck}`);
    console.log(`slot_count=${summary.slot_count}`);
    console.log(`pokemon_count=${summary.pokemon_count}`);
    console.log(`trainer_count=${summary.trainer_count}`);
    console.log(`energy_count=${summary.energy_count}`);
  }

  if (options.verbose) {
    console.log(
      JSON.stringify(
        {
          [TARGET_FAMILY]: {
            decks: manifest.decks,
          },
        },
        null,
        2,
      ),
    );
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const supabase = createBackendClient();
  const manifest = await buildTkManifestV1ForFamily(supabase, TARGET_FAMILY);
  printSummary(manifest, options);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
