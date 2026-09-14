import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import '../../apps/web/src/lib/publicSetCardOrder.test.mjs';

const source=fs.readFileSync(new URL('../../apps/web/src/lib/publicSets.ts',import.meta.url),'utf8');
const index=source.slice(source.indexOf('const getPublicSetCardOrderIndex'),source.indexOf('export const getPublicSetCards'));
const cards=source.slice(source.indexOf('export const getPublicSetCards'),source.indexOf('export const getPublicWorldChampionshipDecklist'));
test('ordering is exact-set, request-scoped and independent from private pricing and artwork',()=>{
  assert.match(index,/cache\(async function/);
  assert.match(index,/createServerSupabase\(\)/);
  assert.match(index,/\.select\("id,number,number_plain", \{ count: "exact" \}\)/);
  assert.match(index,/\.in\("set_id", setIds\)/);
  assert.match(index,/\.gt\("id", afterId\)/);
  assert.match(index,/\.not\("gv_id", "is", null\)/);
  assert.doesNotMatch(index,/service.role|unstable_cache|image_path|price|ownership/i);
  assert.match(cards,/resolveVisiblePublicSetReferences/);
  assert.match(cards,/orderedIndex\.slice\(offset, offset \+ limit\)/);
  assert.match(cards,/readPublicSetCardPage\(\s*pageIds,/);
  assert.match(cards,/\.in\("id", ids\)/);
  assert.match(cards,/ids => getPublicCardPrintingOptions\(supabase, ids\)/);
  assert.doesNotMatch(cards,/\.range\(offset/);
  assert.match(cards,/getPublicCardPrintingOptions/);
});
