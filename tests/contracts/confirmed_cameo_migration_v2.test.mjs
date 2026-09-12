import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../../supabase/migrations/20260912050000_confirmed_card_cameo_read_v2.sql',import.meta.url),'utf8');
test('migration adds confirmed-only schema without promoting legacy records',()=>{
  assert.match(sql,/create table if not exists public.card_cameo_confirmations_v1/);
  assert.match(sql,/active boolean not null default false/);
  assert.doesNotMatch(sql,/\b(?:insert into|update|delete from|drop table)\s+public\./i);
  for(const guard of ['c.source_row_hash=a.source_row_hash','cp.image_path=a.reviewed_image_path','a.active and c.active',"c.match_status='APPROVED_MATCH'",'a.display_note'])assert.ok(sql.includes(guard));
});
test('raw confirmation data is private and the RPC is narrowly bounded',()=>{
  assert.match(sql,/enable row level security/);
  assert.match(sql,/revoke all on public.card_cameo_confirmations_v1 from public,anon,authenticated,service_role/);
  assert.match(sql,/grant select on public.card_cameo_confirmations_v1 to service_role/);
  assert.match(sql,/security definer set search_path=pg_catalog,public/);
  assert.match(sql,/p_offset between 0 and 1000/);assert.match(sql,/limit 100/);
  assert.match(sql,/appearance_role='scene_subject' or \(host_description is not null/);
});
test('public set override cannot expose a hidden or signed-in game',()=>{
  assert.ok(sql.includes("and (sc.set_id is null or sc.release_status='public')"));
  assert.ok(sql.includes("and not exists(select 1 from public.catalog_game_release_controls gc"));
  assert.ok(sql.includes("gc.release_status<>'public'"));
});
