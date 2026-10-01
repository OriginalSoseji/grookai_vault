import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const before=fs.readFileSync('supabase/migrations/20260829203000_search_game_card_prints_v4_performance_v2.sql','utf8').replaceAll('\r\n','\n');
const after=fs.readFileSync('supabase/migrations/20261001210000_search_game_card_prints_v5.sql','utf8').replaceAll('\r\n','\n');
test('bounded V5 preserves every V4 predicate, field, order, offset bound and permission',()=>{
 const normalized=after.slice(after.indexOf('begin;')).replaceAll('search_game_card_prints_v5','search_game_card_prints_v4').replace('set plan_cache_mode = force_custom_plan\n','').replace('limit_in integer default 512','limit_in integer default 50').replace('coalesce(limit_in, 512), 1), 512','coalesce(limit_in, 50), 1), 64');
 assert.equal(normalized,before.slice(before.indexOf('begin;')));
 assert.match(after,/set plan_cache_mode = force_custom_plan/);
 assert.doesNotMatch(after,/\b(?:insert|update|delete|alter|drop)\b/i);
});
