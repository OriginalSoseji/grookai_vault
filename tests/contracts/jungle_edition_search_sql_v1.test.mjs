import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const dir='supabase/migrations/';
const candidate=fs.readFileSync(dir+'20261001050000_jungle_edition_foundation_v1.sql','utf8');
function extract(source,name,index=0){
 const matches=[...source.matchAll(new RegExp('create or replace function public\\.'+name+'\\(', 'gi'))];
 assert.ok(matches[index]);const tail=source.slice(matches[index].index);
 const delimiter=/\bas\s+(\$[a-z_]*\$)/i.exec(tail);assert.ok(delimiter);
 const end=tail.indexOf(delimiter[1],delimiter.index+delimiter[0].length);assert.ok(end>=0);
 return tail.slice(0,tail.indexOf(';',end)+1).replaceAll('\r\n','\n');
}
const readers=[
 ['search_game_card_prints_v4','20260829203000_search_game_card_prints_v4_performance_v2.sql',0],
 ['search_print_identity_v1','20260828021500_print_identity_search_visible_bound_v1.sql',0],
 ['search_card_prints_v1','20260728002603_remote_schema.sql',0],
 ['search_card_prints_v1','20260728002603_remote_schema.sql',1],
 ['user_set_completion_v1','20260706100000_product_evolution_e1_interest_graph_schema_v1.sql',0],
 ['interest_graph_completion_snapshot_for_card_v1','20260706110000_product_evolution_e1_emission_triggers_v1.sql',0],
];
for(const [name,file,index]of readers)test(`${name} overload ${index} preserves the original reader except the reviewed discovery predicate`,()=>{
 const original=extract(fs.readFileSync(dir+file,'utf8'),name,index);
 const changed=extract(candidate,name,index);
 const reverted=changed.replaceAll('public.v_card_prints_discovery_v1','public.card_prints')
  .replace('with discovery as materialized (\n    select public.get_jungle_edition_discovery_exclusions_v1() as excluded\n  ), normalized as (','with normalized as (')
  .replace('  where v.id <> all ((select excluded from discovery)::uuid[])\n    and (p.set_code_norm','  where\n    (p.set_code_norm')
  .replace('  discovery_exclusions uuid[] := public.get_jungle_edition_discovery_exclusions_v1();\n','')
  .replaceAll('where gd.card_print_id <> all(discovery_exclusions)\n      and gd.mapping_active = true','where gd.mapping_active = true');
 assert.equal(reverted,original);
 assert.notEqual(changed,original);
});
test('discovery views retain underlying RLS and compute exclusions once',()=>{
 for(const name of ['v_card_prints_discovery_v1','v_card_printings_discovery_v1']){
  assert.match(candidate,new RegExp(`create view public\\.${name} with \\(security_invoker = true\\)`));
 }
 assert.match(candidate,/card\.id <> all \(\(select public\.get_jungle_edition_discovery_exclusions_v1\(\)\)::uuid\[\]\)/);
 assert.match(candidate,/printing\.card_print_id <> all \(\(select public\.get_jungle_edition_discovery_exclusions_v1\(\)\)::uuid\[\]\)/);
});
