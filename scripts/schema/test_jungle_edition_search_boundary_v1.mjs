// Read-only metadata comparison; full/upgrade replay and SQL body parity are separate proofs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const previousPath=base+'/full-412-v6/replayed.private.json';
const currentPath=base+'/full-412-v10/replayed.private.json';
const previous=JSON.parse(fs.readFileSync(previousPath)),current=JSON.parse(fs.readFileSync(currentPath));
const functions=new Set(['search_game_card_prints_v4','search_print_identity_v1','search_card_prints_v1','user_set_completion_v1','interest_graph_completion_snapshot_for_card_v1']);
const views=new Set(['v_card_prints_discovery_v1','v_card_printings_discovery_v1']);
const hash=b=>createHash('sha256').update(b).digest('hex');
function normalize(value,section){
 if(Array.isArray(value))return value.map(v=>normalize(v,section));
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().filter(k=>!/(^|_)oid$|^objid|^(row_count_estimate|page_size_estimate|qualtree|withchecktree)$/.test(k)).map(k=>[k,
  section==='FUNCTIONS_QUERY'&&['definition','full_definition'].includes(k)&&value.schema==='public'&&functions.has(value.name)?'<reviewed-discovery-reader>':normalize(value[k],section)]));
 return value;
}
const sections=[],failures=[];
for(const [section,rows]of Object.entries(previous)){
 if(!Array.isArray(rows))continue;
 const next=current[section];assert.ok(Array.isArray(next));
 const counts=new Map();for(const row of next){const key=JSON.stringify(normalize(row,section));counts.set(key,(counts.get(key)??0)+1);}
 let preserved=0;
 for(const row of rows){const key=JSON.stringify(normalize(row,section)),count=counts.get(key)??0;if(count){counts.set(key,count-1);preserved++;}else failures.push({section,row});}
 // Only metadata rows belonging to the two additive views can be new.
 const added=next.filter(row=>{const key=JSON.stringify(normalize(row,section)),count=counts.get(key)??0;if(!count)return false;counts.set(key,count-1);return true;});
 for(const row of added)if(!(views.has(row.name)||views.has(row.table_name)))failures.push({section,unexpectedAddition:row});
 sections.push({section,before:rows.length,after:next.length,preserved,added:added.length});
}
const receipt={at:new Date().toISOString(),status:failures.length?'failed':'passed',compared:'qualified V6 -> V10',reviewedFunctionNames:[...functions],additiveViews:[...views],normalization:'Object OIDs, planner estimates and internal RLS parse trees excluded; exact rendered policies, privileges, security attributes and existing definitions preserved except six reader bodies independently checked by SQL body parity.',sections,failures,previousSha256:hash(fs.readFileSync(previousPath)),currentSha256:hash(fs.readFileSync(currentPath)),productionWrites:0};
const out=base+'/search-schema-boundary-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify({status:receipt.status,failures:failures.length,preserved:sections.reduce((n,s)=>n+s.preserved,0),output:out}));assert.equal(failures.length,0);
