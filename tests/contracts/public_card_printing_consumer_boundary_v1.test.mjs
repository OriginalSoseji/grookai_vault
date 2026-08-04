import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');

test('public web printing enumerators use the governed option service', () => {
  for (const path of [
    'apps/web/src/lib/getPublicCardByGvId.ts',
    'apps/web/src/lib/publicSets.ts',
    'apps/web/src/lib/grookaiDex/getGrookaiDexSpeciesDetail.ts',
    'apps/web/src/lib/publicSetMasterSetStats.ts',
    'apps/web/src/app/binders/card-options/route.ts',
  ]) {
    const source = read(path);
    assert.match(source, /getPublicCardPrintingOptions/, path);
    assert.doesNotMatch(source, /\.from\("card_printings"\)/, path);
  }
});

test('search and new Vault writes enforce the governed option boundary', () => {
  const resolver = read('apps/web/src/lib/publicSearchResolver.ts');
  const explore = read('apps/web/src/lib/explore/getExploreRows.ts');
  const addToVault = read('apps/web/src/lib/vault/addCardToVault.ts');

  assert.match(resolver, /getPublicCardPrintingOptions/);
  assert.match(resolver, /publicOptions\.some\(\(option\) => option\.id === cardPrintingId\)/);
  assert.match(explore, /publicPrintingGvIds\.has/);
  assert.match(explore, /publicOptionIds\.has\(childRow\.id\)/);
  assert.match(addToVault, /active governed finish/);
  assert.match(addToVault, /publicOptions\.some\(\(option\) => option\.id === normalizedCardPrintingId\)/);
});

test('owned-copy identity lookups remain intact for historical readback', () => {
  const vault = read('lib/services/vault/vault_card_service.dart');
  const dexWall = read('lib/services/grookai_dex/dex_wall_showcase_service.dart');

  assert.match(vault, /printingById[\s\S]*from\('card_printings'\)/);
  assert.match(dexWall, /_loadPrintingMetadata[\s\S]*from\('card_printings'\)/);
});
