import '../env.mjs';

import { assertNoUnsafeJustTcgGetBatchParams } from './justtcg_client.mjs';

const PROBE_IDS = ['86760', '87103', '88335'];

const SHAPES = [
  {
    label: 'Shape A',
    description: 'repeated query param',
    buildParams() {
      const params = new URLSearchParams();
      for (const id of PROBE_IDS) {
        params.append('tcgplayerId', id);
      }
      params.set('game', 'pokemon');
      params.set('include_price_history', 'false');
      return params;
    },
  },
  {
    label: 'Shape B',
    description: 'comma-separated query param',
    buildParams() {
      return new URLSearchParams({
        tcgplayerId: PROBE_IDS.join(','),
        game: 'pokemon',
        include_price_history: 'false',
      });
    },
  },
  {
    label: 'Shape C',
    description: 'json-array-style query param',
    buildParams() {
      const params = new URLSearchParams();
      for (const id of PROBE_IDS) {
        params.append('tcgplayerId[]', id);
      }
      params.set('game', 'pokemon');
      params.set('include_price_history', 'false');
      return params;
    },
  },
];

function runShape(shape) {
  const params = shape.buildParams();

  console.log(`\n=== ${shape.label} (${shape.description}) ===`);
  console.log(`request path: /cards?${params.toString()}`);

  try {
    assertNoUnsafeJustTcgGetBatchParams('/cards', params);
    console.log('guard verdict: FAIL');
    console.log('reason: Unsafe GET batch shape was not blocked.');
    return {
      label: shape.label,
      blocked: false,
    };
  } catch (error) {
    console.log('guard verdict: PASS');
    console.log(`reason: ${error instanceof Error ? error.message : String(error)}`);
    return {
      label: shape.label,
      blocked: true,
    };
  }
}

function printFinalSummary(results) {
  const blocked = results.filter((result) => result.blocked).map((result) => result.label);
  const failed = results.filter((result) => !result.blocked).map((result) => result.label);

  console.log('\n=== COMPARISON SUMMARY ===');
  console.log(`blocked unsafe GET shapes: ${blocked.length > 0 ? blocked.join(', ') : 'none'}`);
  console.log(`failed to block: ${failed.length > 0 ? failed.join(', ') : 'none'}`);
}

async function main() {
  console.log('🔍 Testing JustTCG GET batch guardrails...');
  console.log(`probe ids: ${PROBE_IDS.join(', ')}`);

  const results = [];
  for (const shape of SHAPES) {
    results.push(runShape(shape));
  }

  printFinalSummary(results);
}

main().catch((error) => {
  console.error('❌ Unhandled JustTCG GET guard probe failure:', error);
  process.exit(1);
});
