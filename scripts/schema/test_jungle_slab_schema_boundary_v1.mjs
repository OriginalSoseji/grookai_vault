// Compare the same retained DB before/after its actual421->422 CLI upgrade.
// Only the one receipt table, four new functions, two new triggers, and the
// printing-parent function/trigger replacement are allowed to differ.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const dir='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001/retained-slab-upgrade-v1';
assert.equal(process.argv.length,2);
const read=p=>JSON.parse(fs.readFileSync(dir+'/'+p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(read('receipt.json').status,'passed');const before=read('before-schema.private.json'),after=read('after-schema.private.json');
const table='jungle_slab_intake_receipts_v1';
const functions=new Set(['guard_jungle_slab_receipt_v1','guard_jungle_slab_certificate_v1','assert_jungle_slab_observation_v1','admin_jungle_slab_intake_v1','assert_vault_item_instance_card_printing_parent_v1']);
const triggers=new Set(['guard_jungle_slab_receipt_v1','guard_jungle_slab_certificate_v1','trg_vault_item_instances_card_printing_parent_v1']);
const allowed=(section,row)=>{
 if(section==='LEDGER')return row.version==='20261002010000';
 if(section==='SECURITY')return row.name===table||functions.has(row.name.split('(')[0]);
 if(row.schema!=='public')return false;
 if(section==='FUNCTIONS_QUERY')return functions.has(row.name);
 if(section==='TRIGGERS_QUERY')return triggers.has(row.name);
 if(section==='ALL_RELATIONS_QUERY')return row.name===table;
 if(section==='INDEXES_QUERY'||section==='CONSTRAINTS_QUERY')return row.table_name===table;
 return false;
};
const normalized=row=>JSON.stringify(row,(k,v)=>['page_size_estimate','row_count_estimate'].includes(k)?undefined:v);
const sections=[];
assert.deepEqual(Object.keys(before).sort(),Object.keys(after).sort());
for(const [section,rows]of Object.entries(before)){
 if(!Array.isArray(rows)){assert.deepEqual(after[section],rows,section);continue;}
 const original=rows.filter(r=>!allowed(section,r)),current=after[section].filter(r=>!allowed(section,r));
 assert.deepEqual(current.map(normalized).sort(),original.map(normalized).sort(),section);
 sections.push({section,preserved:original.length,allowedBefore:rows.length-original.length,allowedAfter:after[section].length-current.length});
}
assert.equal(sections.find(s=>s.section==='SECURITY').preserved,1135);
assert.equal(sections.find(s=>s.section==='TRIGGERS_QUERY').allowedBefore,1);
assert.equal(sections.find(s=>s.section==='ALL_RELATIONS_QUERY').allowedAfter,13);
assert.equal(after.SECURITY.find(r=>r.name===table).acl.join(','),'postgres=arwdDxtm/postgres');
assert.equal(after.SECURITY.find(r=>r.name.startsWith('admin_jungle_slab_intake_v1(')).acl.join(','),'postgres=X/postgres,service_role=X/postgres');
const receipt={at:new Date().toISOString(),status:'passed',sections,preservedMetadataRows:sections.reduce((s,r)=>s+r.preserved,0),normalization:'Only physical planner page_size_estimate and row_count_estimate omitted; same-instance object OIDs retained.',beforeSha256:sha(fs.readFileSync(dir+'/before-schema.private.json')),afterSha256:sha(fs.readFileSync(dir+'/after-schema.private.json')),productionWrites:0,localWrites:0};
fs.writeFileSync(dir+'/schema-boundary.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
