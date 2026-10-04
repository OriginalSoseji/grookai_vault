// Read-only preserved snapshots: PR568 definitions/permissions/indexes survive Jungle.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const previousPath='C:/grookai_vault_operator_artifacts/search_database_20261001/full-412-v2/replayed.private.json';
const currentPath=base+'/full-413-v16/replayed.private.json';
const previous=JSON.parse(fs.readFileSync(previousPath)),current=JSON.parse(fs.readFileSync(currentPath));
const names=['get_search_set_catalog_v1','resolve_visible_set_references_v1','card_prints_artist_id_search_v1','sets_code_lower_search_v1'];
const selected=row=>names.some(name=>row.name===name||row.name?.startsWith(name+'('))||(row.schema==='public'&&row.name==='sets'&&row.attname==='search_code_lower');
function normalize(value){
 if(Array.isArray(value))return value.map(normalize);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().filter(k=>!/(^|_)oid$|^objid|^(row_count_estimate|page_size_estimate|qualtree|withchecktree)$/.test(k)).map(k=>[k,normalize(value[k])]));
 return value;
}
const sections=[];
for(const [section,rows]of Object.entries(previous))if(Array.isArray(rows)){
 const before=rows.filter(selected),after=current[section].filter(selected);
 if(!before.length&&!after.length)continue;
 assert.deepEqual(after.map(r=>JSON.stringify(normalize(r))).sort(),before.map(r=>JSON.stringify(normalize(r))).sort(),section);
 sections.push({section,preserved:before.length});
}
assert.ok(sections.some(s=>s.section==='SECURITY'&&s.preserved===2));
assert.ok(sections.some(s=>s.section==='INDEXES_QUERY'&&s.preserved===2));
assert.ok(sections.some(s=>s.section==='FUNCTIONS_QUERY'&&s.preserved>=2));
assert.ok(sections.some(s=>s.section==='ALL_RELATIONS_QUERY'&&s.preserved===1));
const hash=b=>createHash('sha256').update(b).digest('hex');
const receipt={at:new Date().toISOString(),status:'passed',names,sections,previousSha256:hash(fs.readFileSync(previousPath)),currentSha256:hash(fs.readFileSync(currentPath)),productionWrites:0,localWrites:0,
 normalization:'Only object OIDs, planner estimates and internal policy parse trees omitted. Definitions, generated expression, indexes, owners, ACLs and function settings compared exactly.'};
const out=base+'/search-schema-boundary-v16.json';fs.writeFileSync(out,JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify({status:'passed',sections,output:out}));
