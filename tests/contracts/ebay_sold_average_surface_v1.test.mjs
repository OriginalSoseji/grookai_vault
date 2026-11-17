import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('numeric eBay browse values are labeled as active-listing evidence, never sold averages', () => {
  const profitability = source('../../apps/web/src/components/sales/CardProfitabilityManager.tsx');
  const history = source('../../lib/widgets/pricing/card_market_history_sheet.dart');
  assert.match(profitability, /eBay active-listing median as a fallback/);
  assert.match(profitability, /\(eBay active median\)/);
  assert.doesNotMatch(profitability, /\(eBay median\)/);
  assert.match(history, /eBay active asking prices are separate and are not sold comps/);
  assert.match(history, /Search eBay sold listings/);
});
