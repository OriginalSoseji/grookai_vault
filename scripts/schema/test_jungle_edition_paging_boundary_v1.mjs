// V14 -> V15 changes only the private candidate view's selector projection.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const beforePath=base+'/full-412-v14/replayed.private.json',afterPath=base+'/full-412-v15/replayed.private.json';
const before=JSON.parse(fs.readFileSync(beforePath)),after=JSON.parse(fs.readFileSync(afterPath));
const hash=b=>createHash('sha256').update(b).digest('hex');
function normalize(row,section){
 if(Array.isArray(row))return row.map(v=>normalize(v,section));
 if(!row||typeof row!=='object')return row;
 const projection=section==='ALL_RELATIONS_QUERY'&&row.name==='v_tcgplayer_market_qualification_candidates_v2';
 return Object.fromEntries(Object.keys(row).sort().filter(k=>!/(^|_)oid$|^objid|^(row_count_estimate|page_size_estimate|qualtree|withchecktree)$/.test(k)).map(k=>[k,projection&&['definition','full_definition'].includes(k)?'<private-candidate-paging-projection>':normalize(row[k],section)]));
}
const sections=[],failures=[];
for(const [section,rows]of Object.entries(before)){
 if(!Array.isArray(rows))continue;assert.ok(Array.isArray(after[section]));
 const bag=new Map();for(const row of after[section]){const k=JSON.stringify(normalize(row,section));bag.set(k,(bag.get(k)??0)+1);}
 let preserved=0;for(const row of rows){const k=JSON.stringify(normalize(row,section)),n=bag.get(k)??0;if(n){bag.set(k,n-1);preserved++;}else failures.push({section,missing:row});}
 for(const [row,n]of bag)if(n)failures.push({section,added:JSON.parse(row),count:n});
 sections.push({section,before:rows.length,after:after[section].length,preserved});
}
const receipt={status:failures.length?'failed':'passed',at:new Date().toISOString(),compared:'V14 -> V15',normalization:'Only private V2 candidate view definition, OIDs, planner estimates and internal policy parse trees. All columns/types, constraints, permissions, triggers and other bodies must be identical.',sections,failures,beforeSha256:hash(fs.readFileSync(beforePath)),afterSha256:hash(fs.readFileSync(afterPath)),productionWrites:0};
const out=base+'/paging-schema-boundary-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify({status:receipt.status,preserved:sections.reduce((n,s)=>n+s.preserved,0),failures:failures.length,out}));assert.equal(failures.length,0);
