import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const read=name=>readFileSync(new URL(`../../supabase/migrations/${name}`,import.meta.url),'utf8').replaceAll('\r\n','\n');
const original=read('20260907180000_sealed_owned_instances_v1.sql');
const candidate=read('20260908193000_sealed_ownership_account_canary_v1.sql');
function addBody(source){return source.split('create or replace function public.vault_add_sealed_copies_v1(')[1].split('end $$;')[0];}
test('writer changes only addition policy and preserves all identity/journal checks',()=>{
  assert.equal(addBody(candidate),addBody(original).replace('if not exists(select 1 from public.sealed_ownership_controls_v1 where enabled) then','if not public.sealed_ownership_add_allowed_v1(p_variant_id,p_quantity) then'));
});
test('migration is default off with no enrollment or activation DML',()=>{
  assert.match(candidate,/canary_enabled boolean not null default false/);
  const ddl=candidate.split('create or replace function public.vault_add_sealed_copies_v1(')[0];
  assert.doesNotMatch(ddl,/\b(insert into|update public|delete from)\b/i);
  assert.match(candidate,/max_created_copies between 1 and 25/);
  assert.match(candidate,/interval '24 hours'/);
});
test('allowance uses cumulative journal, not remaining active inventory',()=>{
  const policy=candidate.split('create or replace function public.sealed_ownership_add_allowed_v1')[1].split('$$;')[0];
  assert.match(policy,/request\.operation='add'/);
  assert.match(policy,/sum\(\(request\.result->>'created_count'\)::integer\)/);
  assert.doesNotMatch(policy,/archived_at|created_at|vault_item_instances/);
  assert.match(policy,/grant_row\.user_id=auth\.uid\(\)/);
  assert.match(policy,/target\.variant_id=p_variant_id/);
  assert.match(policy,/statement_timestamp\(\) < grant_row\.expires_at/);
});
test('schema and feature activation remain distinct',()=>{
  assert.match(candidate,/force row level security/g);
  assert.match(candidate,/revoke all on function public\.sealed_ownership_add_allowed_v1\(uuid,integer\) from public,anon,authenticated,service_role/);
  assert.doesNotMatch(candidate,/grant .*delete|grant .*truncate|grant .*canary.* to authenticated/i);
});
