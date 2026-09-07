import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
test('Pokemon endpoints remain bounded, signed-in and game isolated',()=>{
  const sql=fs.readFileSync('supabase/migrations/20260907070000_pokemon_sealed_catalog_filters_v1.sql','utf8');
  assert.match(sql,/lower\(btrim\(p_game_key\)\) = 'pokemon'/);
  assert.match(sql,/p_package_form text default null/);assert.match(sql,/p_language_code text default null/);
  assert.match(sql,/variant\.package_form = lower\(btrim\(p_package_form\)\)/);
  assert.match(sql,/limit least\(greatest\(coalesce\(p_limit, 50\), 1\), 100\)/);
  assert.match(sql,/to authenticated, service_role/);assert.doesNotMatch(sql,/to anon;/);
});
test('Pokemon signer authenticates and authorizes before signing',()=>{
  const code=fs.readFileSync('supabase/functions/pokemon-sealed-sign-image-v1/index.ts','utf8');
  assert.ok(code.indexOf('requireAuthUser(req)')<code.indexOf('createSignedUrl('));
  assert.match(code,/pokemon_sealed_image_object_signing_authorized_v1/);
  assert.match(code,/authorized !== true/);assert.doesNotMatch(code,/\.list\(|\.upload\(|\.remove\(/);
});
test('Pokemon pages have backend filtering, paging and private routes',()=>{
  const web=fs.readFileSync('apps/web/src/app/sealed/pokemon/page.tsx','utf8');
  assert.match(web,/supabase\.auth\.getUser\(\)/);assert.match(web,/offset: \(page - 1\) \* 24/);
  assert.match(web,/packageForm: form, languageCode: language/);assert.match(web,/gameKey: "pokemon"/);
  const dart=fs.readFileSync('lib/screens/sets/mtg_sealed_catalog_screen.dart','utf8');
  assert.match(dart,/kPokemonSealedClientV1Enabled/);assert.match(dart,/offset: _offset/);
  assert.match(dart,/request == _request/);
});
