import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { suggestionRequestIsPrivate, suggestionResponseHeaders } from '../../apps/web/src/lib/search/suggestionAccess.mjs';

test('anonymous suggestions remain cacheable without a user session',()=>{
  assert.equal(suggestionRequestIsPrivate(new Headers(),[]),false);
  assert.equal(suggestionRequestIsPrivate(new Headers(),[{name:'theme',value:'dark'}]),false);
  assert.match(suggestionResponseHeaders(false)['Cache-Control'],/^public,/);
});
test('cookie, chunked cookie and bearer requests are private regardless of claimed identity',()=>{
  for(const name of ['sb-project-auth-token','sb-project-auth-token.0']) {
    assert.equal(suggestionRequestIsPrivate(new Headers(),[{name,value:'opaque'}]),true);
  }
  for(const authorization of ['Bearer opaque','invalid']) {
    assert.equal(suggestionRequestIsPrivate(new Headers({authorization}),[]),true);
  }
  assert.equal(suggestionResponseHeaders(true)['Cache-Control'],'private, no-store');
  assert.equal(suggestionResponseHeaders(true).Vary,'Cookie, Authorization');
});
test('signed-in suggestions use the viewer-scoped governed reader, never admin or shared cache',()=>{
  const source=readFileSync(new URL('../../apps/web/src/app/api/search/suggestions/route.ts',import.meta.url),'utf8');
  assert.match(source,/privateRequest \? await createServerComponentClient\(\) : createPublicServerClient\(60\)/);
  assert.match(source,/suggestionResponseHeaders\(privateRequest\)/);
  assert.match(source,/search_game_card_prints_v4/);
  assert.match(source,/dynamic = "force-dynamic"/);
  assert.doesNotMatch(source,/createServerAdminClient/);
});
