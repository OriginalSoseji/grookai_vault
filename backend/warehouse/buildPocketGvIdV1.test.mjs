import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPocketCardPrintGvIdV1,
  buildPocketCardPrintingGvIdV1,
  derivePocketNumberTokenFromSourceIdV1,
  resolvePocketFinishSuffixV1,
} from './buildPocketGvIdV1.mjs';

test('pocket parent gv ids use the separated GV-TCGP namespace', () => {
  assert.equal(
    buildPocketCardPrintGvIdV1({ setCode: 'A1', number: '001' }),
    'GV-TCGP-A1-001',
  );

  assert.equal(
    buildPocketCardPrintGvIdV1({ setsCode: 'P-A', number: '007' }),
    'GV-TCGP-P-A-007',
  );
});

test('pocket child printing gv ids use governed finish suffixes', () => {
  assert.equal(resolvePocketFinishSuffixV1('normal'), 'STD');
  assert.equal(resolvePocketFinishSuffixV1('holo'), 'HOLO');
  assert.equal(resolvePocketFinishSuffixV1('reverse'), 'RH');

  assert.equal(
    buildPocketCardPrintingGvIdV1({
      setCode: 'A1a',
      number: '025',
      finishKey: 'holo',
    }),
    'GV-TCGP-A1A-025-HOLO',
  );
});

test('pocket parent gv ids can derive missing numbers from exact matching source ids', () => {
  assert.equal(
    derivePocketNumberTokenFromSourceIdV1({ setCode: 'A1a', externalId: 'A1a-084' }),
    '084',
  );
  assert.equal(
    buildPocketCardPrintGvIdV1({ setCode: 'A1a', externalId: 'A1a-084' }),
    'GV-TCGP-A1A-084',
  );
  assert.equal(
    buildPocketCardPrintGvIdV1({ setCode: 'P-A', externalId: 'P-A-007' }),
    'GV-TCGP-P-A-007',
  );
  assert.equal(
    derivePocketNumberTokenFromSourceIdV1({ setCode: 'A2', externalId: 'A1-084' }),
    null,
  );
});

test('pocket builder rejects physical parent gv ids and unsupported finish keys', () => {
  assert.throws(
    () => buildPocketCardPrintingGvIdV1({ parentGvId: 'GV-PK-MEW-025', finishKey: 'holo' }),
    /pocket_printing_parent_gv_id_invalid/,
  );

  assert.throws(
    () => buildPocketCardPrintingGvIdV1({ setCode: 'A1', number: '001', finishKey: 'cosmos' }),
    /pocket_printing_finish_suffix_missing/,
  );
});
