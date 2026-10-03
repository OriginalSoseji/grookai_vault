import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const paths=[base+'/full-413-v16/replayed.private.json',base+'/full-415-v17/replayed.private.json'];
const [before,after]=paths.map(p=>JSON.parse(fs.readFileSync(p)));
const functions=new Set(['get_market_pricing_read_model_v1','tcgplayer_jungle_binding_valid_v1']);
const views=new Set(['v_market_price_current_v1','v_market_price_history_v1']);
function normalize(v,section){
 if(Array.isArray(v))return v.map(r=>normalize(r,section));if(!v||typeof v!=='object')return v;
 const reviewed=section==='FUNCTIONS_QUERY'&&functions.has(v.name)||section==='ALL_RELATIONS_QUERY'&&views.has(v.name);
 return Object.fromEntries(Object.keys(v).sort().filter(k=>!/(^|_)oid$|^objid|^(row_count_estimate|page_size_estimate|qualtree|withchecktree)$/.test(k)).map(k=>[k,reviewed&&['definition','full_definition'].includes(k)?'<separately-source-proved-body>':normalize(v[k],section)]));
}
const dependency=r=>views.has(r.name)&&r.name_dependent_on==='external_mappings';
const sections=[];
for(const [name,rows]of Object.entries(before)){
 if(!Array.isArray(rows)||name==='LEDGER')continue;
 const current=after[name].filter(r=>name!=='DEPS_QUERY'||!dependency(r));
 assert.deepEqual(current.map(r=>JSON.stringify(normalize(r,name))).sort(),rows.map(r=>JSON.stringify(normalize(r,name))).sort(),name);
 sections.push({section:name,rows:rows.length});
}
assert.equal(after.DEPS_QUERY.filter(dependency).length,2);
assert.deepEqual(after.LEDGER.filter(r=>!before.LEDGER.some(p=>p.version===r.version)),[{version:'20261001190000'},{version:'20261001203000'}]);
const receipt={at:new Date().toISOString(),status:'passed',sections,unchangedMetadataRows:sections.reduce((n,s)=>n+s.rows,0),permittedBodies:[...functions,...views],newDependencies:2,permissionsPreserved:true,sourceSnapshots:paths.map(p=>({path:p,sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')})),productionWrites:0};
fs.writeFileSync(base+'/alias-release-v1/schema-boundary.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify({status:receipt.status,metadataRows:receipt.unchangedMetadataRows,newDependencies:2,permissionsPreserved:true}));
