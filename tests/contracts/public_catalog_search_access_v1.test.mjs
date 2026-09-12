import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { catalogSearchAccess } from '../../apps/web/src/lib/catalogSearchAccess.ts';

test('release-authorized public catalogs allow anonymous search', () => {
  assert.deepEqual(catalogSearchAccess({data:true,error:null},false),{allowed:true,status:200,error:null});
});
test('signed-in and hidden catalogs do not become public through the API', () => {
  assert.equal(catalogSearchAccess({data:false,error:null},false).status,401);
  assert.equal(catalogSearchAccess({data:false,error:null},true).status,403);
  assert.equal(catalogSearchAccess({data:true,error:null},true).allowed,true);
});
test('RPC errors and malformed responses fail closed even for authenticated users', () => {
  for(const authenticated of [true,false]) {
    for(const data of [null,undefined,1,'true',[],{}]) assert.equal(catalogSearchAccess({data,error:null},authenticated).status,503);
    assert.equal(catalogSearchAccess({data:true,error:{message:'timeout'}},authenticated).status,503);
  }
});
test('catalog access repair preserves pricing and owner auth and never uses a service client', () => {
  const route=fs.readFileSync(new URL('../../apps/web/src/app/api/resolver/search/route.ts',import.meta.url),'utf8');
  assert.match(route,/valueSortRequested && !userId/);
  assert.match(route,/authenticatedIncludePricing = pricingRequested && Boolean\(userId\)/);
  assert.match(route,/requestSupabase!\.rpc\("catalog_game_visible_to_request_v1",\s*\{\s*p_game_code: gameScope/);
  assert.match(route,/getOwnedCardPrintIdsForUser\(userId\)/);
  assert.doesNotMatch(route,/createService|SUPABASE_SECRET|SERVICE_ROLE/);
});
