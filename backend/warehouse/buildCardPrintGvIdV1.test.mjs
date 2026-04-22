import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PROMO_PREFIX_IDENTITY_RULE_V1,
  buildCardPrintGvIdV1,
  resolvePromoNumberV1,
  resolveSmpPromoNumberTokenV1,
} from './buildCardPrintGvIdV1.mjs';

test('smp promo numbers keep the SM prefix identity contract', () => {
  assert.equal(PROMO_PREFIX_IDENTITY_RULE_V1, 'PROMO_PREFIX_IDENTITY_RULE_V1');
  assert.equal(resolvePromoNumberV1({ setCode: 'smp', number: 'SM10', numberPlain: '10' }), 'SM10');
  assert.equal(resolvePromoNumberV1({ setCode: 'smp', numberPlain: '72' }), 'SM72');
  assert.equal(resolvePromoNumberV1({ setCode: 'smp', number: '46', numberPlain: '46' }), 'SM46');
});

test('smp gv ids build from printed or derived promo prefixes', () => {
  assert.equal(
    buildCardPrintGvIdV1({
      setCode: 'smp',
      printedSetAbbrev: 'SMP',
      number: 'SM10',
      numberPlain: '10',
      variantKey: 'prerelease_stamp',
    }),
    'GV-PK-SM-SM10-PRERELEASE-STAMP',
  );

  assert.equal(
    buildCardPrintGvIdV1({
      setCode: 'smp',
      printedSetAbbrev: 'SMP',
      numberPlain: '72',
      variantKey: 'staff_prerelease_stamp',
    }),
    'GV-PK-SM-SM72-STAFF-PRERELEASE-STAMP',
  );

  assert.equal(
    buildCardPrintGvIdV1({
      setCode: 'smp',
      printedSetAbbrev: 'SMP',
      number: '46',
      numberPlain: '46',
      variantKey: 'prerelease_stamp',
    }),
    'GV-PK-SM-SM46-PRERELEASE-STAMP',
  );
});

test('invalid smp promo formats are still rejected', () => {
  assert.throws(
    () => resolveSmpPromoNumberTokenV1({ setCode: 'smp', number: 'S10' }),
    /gv_id_smp_promo_number_invalid/,
  );
});

test('non-smp promo families keep current behavior in this repair scope', () => {
  assert.equal(resolvePromoNumberV1({ setCode: 'bwp', numberPlain: '51' }), null);
  assert.equal(
    buildCardPrintGvIdV1({
      setCode: 'bwp',
      printedSetAbbrev: 'PR-BLW',
      number: '51',
      numberPlain: '51',
      variantKey: 'prerelease_stamp',
    }),
    'GV-PK-PR-BLW-51-PRERELEASE-STAMP',
  );
});
