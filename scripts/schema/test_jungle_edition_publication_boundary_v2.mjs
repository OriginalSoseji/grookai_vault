// Exact metadata comparison except the two separately source-proved current
// readers and the two NOT NULL fields replaced by the disjoint lane constraint.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const oldPath=base+'/full-412-v12/replayed.private.json',newPath=base+'/full-412-v14/replayed.private.json';
const previous=JSON.parse(fs.readFileSync(oldPath)),current=JSON.parse(fs.readFileSync(newPath));
const hash=b=>createHash('sha256').update(b).digest('hex');
const functions=new Set(['jungle_edition_price_row_valid_v1','guard_jungle_edition_price_batch_v1','guard_jungle_edition_publication_pointer_v1']);
const views=new Set(['v_tcgplayer_market_qualification_candidates_v2']);
const tables=new Set(['market_price_pipeline_candidates','market_price_qualification_decisions','market_price_publication_snapshots']);
const triggers=new Set(['guard_jungle_edition_qualification_v1','guard_jungle_edition_snapshot_v1','guard_jungle_edition_publication_pointer_v1']);
function normalized(row,section){
 if(Array.isArray(row))return row.map(v=>normalized(v,section));
 if(!row||typeof row!=='object')return row;
 if(section==='SECURITY'&&tables.has(row.name)){
  const columns=row.attributes.columns.filter(column=>{
   if(column.name!=='edition_assignment_id')return true;
   assert.deepEqual(column,{name:'edition_assignment_id',acl:[]});return false;
  });
  row={...row,attributes:{...row.attributes,columns}};
 }
 return Object.fromEntries(Object.keys(row).sort().filter(k=>!/(^|_)oid$|^objid|^(row_count_estimate|page_size_estimate|qualtree|withchecktree)$/.test(k)).map(k=>{
  const reader=(section==='FUNCTIONS_QUERY'&&row.name==='get_market_pricing_read_model_v1')||(section==='ALL_RELATIONS_QUERY'&&row.name==='v_market_price_current_v1');
  const lane=section==='ALL_RELATIONS_QUERY'&&row.name==='market_price_publication_snapshots'&&['source_mapping_id','variant_assignment_id'].includes(row.attname);
  return [k,reader&&['definition','full_definition'].includes(k)?'<separately-proved-current-price-reader>':lane&&k==='not_null'?'<disjoint-assignment-lane-constraint>':normalized(row[k],section)];
 }));
}
function permittedAddition(row,section){
 const name=String(row.name??'').split('(')[0];
 if(views.has(name)||functions.has(name))return true;
 if(section==='TRIGGERS_QUERY')return triggers.has(name)&&tables.has(row.table_name)||name==='guard_jungle_edition_publication_pointer_v1'&&row.table_name==='market_price_current_publication';
 if(section==='ALL_RELATIONS_QUERY')return tables.has(name)&&row.attname==='edition_assignment_id';
 if(section==='CONSTRAINTS_QUERY')return tables.has(row.table_name)&&/edition_assignment_id/.test(row.definition);
 if(section==='DEPS_QUERY')return row.name==='v_market_price_current_v1'&&['jungle_edition_identity_links_v1','jungle_edition_price_row_valid_v1'].includes(row.name_dependent_on);
 return false;
}
const sections=[],failures=[];
for(const [section,rows]of Object.entries(previous)){
 if(!Array.isArray(rows))continue;const next=current[section];assert.ok(Array.isArray(next));
 const bag=new Map();for(const row of next){const key=JSON.stringify(normalized(row,section));bag.set(key,(bag.get(key)??0)+1);}
 let preserved=0;for(const row of rows){const key=JSON.stringify(normalized(row,section)),count=bag.get(key)??0;if(count){bag.set(key,count-1);preserved++;}else failures.push({section,row});}
 const added=next.filter(row=>{const key=JSON.stringify(normalized(row,section)),count=bag.get(key)??0;if(!count)return false;bag.set(key,count-1);return true;});
 for(const row of added)if(!permittedAddition(row,section))failures.push({section,unexpectedAddition:row});
 sections.push({section,before:rows.length,after:next.length,preserved,added:added.length});
}
const receipt={status:failures.length?'failed':'passed',at:new Date().toISOString(),compared:'qualified V12 -> V14',normalization:'OIDs, planner estimates and internal policy parse trees excluded; only two separately source-proved reader definitions, two snapshot NOT NULL fields and three reviewed added column entries with exactly empty column ACLs normalize. The replacement lane constraint is independently exercised. All other existing metadata preserved.',sections,failures,previousSha256:hash(fs.readFileSync(oldPath)),currentSha256:hash(fs.readFileSync(newPath)),productionWrites:0};
const out=base+'/publication-schema-boundary-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify({status:receipt.status,failures:failures.length,preserved:sections.reduce((n,s)=>n+s.preserved,0),output:out}));assert.equal(failures.length,0);
