import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const paths=[base+'/full-415-v17/replayed.private.json',base+'/populated-source-v1/resolved-readiness-upgrade-1790884925710/full-schema.private.json'];
const [before,after]=paths.map(p=>JSON.parse(fs.readFileSync(p)));
const functions=new Set(['jungle_edition_price_row_valid_v1']);
const views=new Set(['v_tcgplayer_jungle_edition_assignment_candidates_v1']);
function normalize(v,section){
 if(Array.isArray(v))return v.map(r=>normalize(r,section));if(!v||typeof v!=='object')return v;
 const reviewed=section==='FUNCTIONS_QUERY'&&functions.has(v.name)||section==='ALL_RELATIONS_QUERY'&&views.has(v.name);
 return Object.fromEntries(Object.keys(v).sort().filter(k=>!/(^|_)oid$|^objid|^(row_count_estimate|page_size_estimate|qualtree|withchecktree)$/.test(k)).map(k=>[k,reviewed&&['definition','full_definition'].includes(k)?'<separately-source-proved-body>':normalize(v[k],section)]));
}
const newFunction='tcgplayer_jungle_assignment_candidates_for_products_v1';
const additional=r=>String(r.name??'').startsWith(newFunction);
const sections=[];
for(const [name,rows]of Object.entries(before)){
 if(!Array.isArray(rows)||name==='LEDGER')continue;
 const current=after[name].filter(r=>!additional(r));
 assert.deepEqual(current.map(r=>JSON.stringify(normalize(r,name))).sort(),rows.map(r=>JSON.stringify(normalize(r,name))).sort(),name);
 sections.push({section:name,rows:rows.length});
}
const access=after.SECURITY.filter(additional);assert.equal(access.length,1);assert.deepEqual(access[0].acl,['postgres=X/postgres','service_role=X/postgres']);assert.equal(access[0].attributes.security_definer,false);
assert.equal(after.FUNCTIONS_QUERY.filter(additional).length,6);
assert.deepEqual(after.LEDGER.filter(r=>!before.LEDGER.some(p=>p.version===r.version)),['20261001210000','20261001213000','20261001220000','20261001223000'].map(version=>({version})));
const receipt={at:new Date().toISOString(),status:'passed',sections,unchangedMetadataRows:sections.reduce((n,s)=>n+s.rows,0),permittedBodies:[...functions,...views],newServiceOnlyFunctions:1,permissionsPreserved:true,sourceSnapshots:paths.map(p=>({path:p,sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')})),productionWrites:0};
fs.writeFileSync(base+'/populated-source-v1/schema-boundary.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify({status:receipt.status,metadataRows:receipt.unchangedMetadataRows,newServiceOnlyFunctions:1,permissionsPreserved:true}));
