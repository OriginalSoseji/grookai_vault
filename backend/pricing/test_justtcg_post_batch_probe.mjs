import '../env.mjs';

import {
  fetchJustTcgCardsByTcgplayerIdsBatch,
  resolveJustTcgBatchByTcgplayerIds,
  uniqueValues,
} from './justtcg_client.mjs';

const PROBE_IDS = ['86760', '87103', '88335'];

function getSetLabel(card) {
  if (typeof card?.set_name === 'string' && card.set_name.trim()) {
    return card.set_name.trim();
  }

  if (typeof card?.set === 'string' && card.set.trim()) {
    return card.set.trim();
  }

  if (card?.set && typeof card.set === 'object') {
    if (typeof card.set.name === 'string' && card.set.name.trim()) {
      return card.set.name.trim();
    }

    if (typeof card.set.code === 'string' && card.set.code.trim()) {
      return card.set.code.trim();
    }
  }

  return 'null';
}

async function main() {
  const requestBody = PROBE_IDS.map((tcgplayerId) => ({
    tcgplayerId,
    game: 'pokemon',
  }));

  console.log('🔍 Testing JustTCG POST batch probe...');
  console.log('request shape:', JSON.stringify(requestBody, null, 2));

  const response = await fetchJustTcgCardsByTcgplayerIdsBatch(PROBE_IDS);
  const payloadKeys =
    response.payload && typeof response.payload === 'object' ? Object.keys(response.payload) : [];

  console.log('HTTP status:', response.status);
  console.log('response ok:', response.ok);
  console.log('top-level raw response keys:', payloadKeys.length > 0 ? payloadKeys.join(', ') : '(none)');

  if (!response.ok) {
    console.log('returned card candidates:', 0);
    console.log('\nDETERMINISTIC SUMMARY:');
    console.log(`requested ids count: ${PROBE_IDS.length}`);
    console.log('returned ids count: 0');
    console.log(`missing ids: ${PROBE_IDS.join(', ')}`);
    console.log('unexpected ids: none');
    console.log('duplicate ids: none');
    console.log('all rows include tcgplayerId?: FAIL');
    console.log('safe batch verdict: FAIL');
    console.log(`error: ${response.error}`);
    return;
  }

  const resolved = resolveJustTcgBatchByTcgplayerIds(PROBE_IDS, response.payload);
  const returnedIds = uniqueValues(
    resolved.cards.map((card) => {
      if (card?.tcgplayerId === undefined || card?.tcgplayerId === null) {
        return '';
      }

      return String(card.tcgplayerId).trim();
    }),
  );
  const missingIds = PROBE_IDS.filter((tcgplayerId) => resolved.results[tcgplayerId]?.status === 'missing');
  const allRowsIncludeTcgplayerId = resolved.malformedRowCount === 0;
  const safeBatchPass =
    response.status === 200 &&
    resolved.cards.length > 0 &&
    missingIds.length === 0 &&
    resolved.unexpectedReturnedIds.length === 0 &&
    resolved.duplicateReturnedIds.length === 0 &&
    allRowsIncludeTcgplayerId;

  console.log('returned card candidates:', resolved.cards.length);

  for (const card of resolved.cards) {
    console.log(
      `card: id=${card?.id ?? 'null'} | name=${card?.name ?? 'null'} | tcgplayerId=${card?.tcgplayerId ?? 'null'} | set=${getSetLabel(card)} | number=${card?.number ?? 'null'}`,
    );
  }

  console.log('\nDETERMINISTIC SUMMARY:');
  console.log(`requested ids count: ${PROBE_IDS.length}`);
  console.log(`returned ids count: ${returnedIds.length}`);
  console.log(`missing ids: ${missingIds.length > 0 ? missingIds.join(', ') : 'none'}`);
  console.log(`unexpected ids: ${resolved.unexpectedReturnedIds.length > 0 ? resolved.unexpectedReturnedIds.join(', ') : 'none'}`);
  console.log(`duplicate ids: ${resolved.duplicateReturnedIds.length > 0 ? resolved.duplicateReturnedIds.join(', ') : 'none'}`);
  console.log(`all rows include tcgplayerId?: ${allRowsIncludeTcgplayerId ? 'PASS' : 'FAIL'}`);
  console.log(`safe batch verdict: ${safeBatchPass ? 'PASS' : 'FAIL'}`);
}

main().catch((error) => {
  console.error('❌ Unhandled JustTCG POST batch probe failure:', error);
  process.exit(1);
});
