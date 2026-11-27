import fs from 'node:fs';import assert from 'node:assert/strict';import test from 'node:test';
const dir=new URL('../../supabase/migrations/',import.meta.url),old=fs.readFileSync(new URL('20261013123000_pokemon_tcgplayer_gym_challenge_edition_assignment_v1.sql',dir),'utf8').replaceAll('\r\n','\n'),next=fs.readFileSync(new URL('20261126193000_jungle_scoped_price_lineage_recovery_v1.sql',dir),'utf8').replaceAll('\r\n','\n');
test('the complete deployed restricted validator is preserved outside its assignment selector',()=>{
 const before=old.match(/create or replace function public\.jungle_edition_price_row_restricted_valid_v1\(row_data jsonb\)[\s\S]*?as \$\$([\s\S]*?)\$\$;/i)?.[1].trim();
 const after=next.match(/AS \$function\$([\s\S]*?)\$function\$/)?.[1].trim();assert.ok(before&&after);
 const priorSelector=/from public\.v_tcgplayer_jungle_edition_current_assignments_v1 assignment\s+where assignment\.id=\(row_data->>'edition_assignment_id'\)::uuid;/;
 const newSelector=/from public\.tcgplayer_jungle_edition_assignments_v1 assignment\s+cross join lateral public\.tcgplayer_jungle_assignment_candidates_for_products_v1\(\s+array\[\(assignment\.assignment_payload#>>'\{source,product_id\}'\)::integer\]\) candidate\s+where assignment\.id=\(row_data->>'edition_assignment_id'\)::uuid\s+and candidate\.source_observation_id=assignment\.source_observation_id\s+and candidate\.source_sync_run_id=assignment\.source_sync_run_id\s+and candidate\.binding_id=assignment\.binding_id\s+and candidate\.assignment_sha256=assignment\.assignment_sha256\s+and candidate\.assignment_payload=assignment\.assignment_payload;/;
 assert.match(before,priorSelector);assert.match(after,newSelector);assert.equal(after.replace(newSelector,'ASSIGNMENT_SELECTOR'),before.replace(priorSelector,'ASSIGNMENT_SELECTOR'));
});
test('forward correction changes exactly one invoker function and no data, permissions or other schema objects',()=>{
 assert.equal((next.match(/CREATE OR REPLACE FUNCTION/gi)||[]).length,1);assert.match(next,/CREATE OR REPLACE FUNCTION public\.jungle_edition_price_row_restricted_valid_v1\(row_data jsonb\)/);assert.doesNotMatch(next,/\b(?:SECURITY DEFINER|GRANT|REVOKE|ALTER|DROP|INSERT INTO|UPDATE public\.|DELETE FROM|TRUNCATE|CREATE INDEX)\b/i);assert.match(next,/\bSTABLE\s+SET search_path TO ''/);
});
