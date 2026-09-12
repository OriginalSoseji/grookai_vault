import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const sql=read('scripts/preview/sql/collector_cameo_read_candidate_v1.sql');
test('confirmed cameo reader cannot promote source-only associations or changed evidence',()=>{
  for(const text of ['a.active and c.active',"c.match_status='APPROVED_MATCH'",'c.source_row_hash=a.source_row_hash','cp.image_path=a.reviewed_image_path','a.display_note']) assert.ok(sql.includes(text));
  assert.doesNotMatch(sql,/select.*c\.notes_raw/);
  assert.match(sql,/default false/);
  assert.match(sql,/host_description is not null/);
});
test('bounded public projection preserves raw evidence privileges and visibility boundaries',()=>{
  assert.match(sql,/revoke all on public.card_cameo_confirmations_v1 from public,anon,authenticated,service_role/);
  assert.doesNotMatch(sql,/grant.*(?:insert|update|delete|all).*to (?:anon|authenticated|service_role)/i);
  assert.match(sql,/limit 100/);
  assert.match(sql,/p_offset between 0 and 1000/);
  assert.match(sql,/sc.release_status='public'/);
  assert.match(sql,/security definer set search_path=pg_catalog,public/);
});
test('card and Dex use the bounded projection, never a raw-admin fallback',()=>{
  const card=read('apps/web/src/lib/getPublicCardByGvId.ts');
  const dex=read('apps/web/src/lib/grookaiDex/getGrookaiDexSpeciesDetail.ts');
  assert.match(card,/rpc\("get_public_card_cameos_v2"/);
  assert.match(dex,/rpc\("get_public_card_cameos_v2"/);
  assert.doesNotMatch(card+dex,/\.from\("(?:card_print_cameos|v_card_print_cameos_public_v1)"\)/);
});
test('SQL replay exercises negative evidence and disclosure states and rolls back',()=>{
  const tests=read('scripts/preview/sql/collector_cameo_read_tests_v1.sql');
  for(const guard of ['unconfirmed_association_leak','inactive_confirmation_leak','raw_evidence_grant_leak','representation_without_host_accepted','changed_image_confirmation','stale_source_confirmation','hidden_catalog_leak','signed_in_catalog_leak','rollback;']) assert.ok(tests.includes(guard));
});
