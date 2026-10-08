import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertMtgParentLinkPlanV1,assertMtgParentLinksExactV1,captureMtgParentLinkSessionSequencesV1} from '../../scripts/audits/mtg_parent_link_release_v1.mjs';
const plan=JSON.parse(fs.readFileSync(new URL('../../docs/truth/mtg/reality_fracture_parent_links_20261008.json',import.meta.url)));
test('accepts only the reviewed 546 product-to-parent links',()=>assertMtgParentLinkPlanV1(plan));
for(const [name,change] of Object.entries({
  owner:p=>p.insert_rows[0].card_print_id=p.insert_rows[1].card_print_id,
  source:p=>p.insert_rows[0].source_product_id='1',
  truncated:p=>p.insert_rows.pop(),
  expanded:p=>p.insert_rows.push(p.insert_rows[0]),
  boundary:p=>p.boundaries.updates=true,
  evidence:p=>p.insert_rows[0].supporting_printing_mapping_count++,
  approval:p=>p.required_approval='approved',
  conflict:p=>p.unsafe_rows.push({resolution:'conflicting_existing_mapping'}),
}))test('rejects '+name+' drift',()=>{const copy=structuredClone(plan);change(copy);assert.throws(()=>assertMtgParentLinkPlanV1(copy));});
const exact=()=>plan.insert_rows.map((r,i)=>({id:String(1000+i),source:'tcgplayer',external_id:r.source_product_id,card_print_id:r.card_print_id,active:true,
meta:{contract_version:'MTG_TCGPLAYER_PARENT_MAPPING_BACKFILL_V1',mapping_method:'deterministic_mtg_printing_evidence_bridge',derived_from:'exact_tcgplayer_market_printing_mappings',confidence:'1.0000',source_category_id:1,supporting_printing_mapping_count:r.supporting_printing_mapping_count}}));
test('durable readback requires every identity and exact provenance',()=>{assertMtgParentLinksExactV1(exact(),plan);for(const edit of [r=>r.pop(),r=>r[0].active=false,r=>r[0].id='-1',r=>r[0].meta.confidence='0.8',r=>r[0].card_print_id=r[1].card_print_id]){const rows=exact();edit(rows);assert.throws(()=>assertMtgParentLinksExactV1(rows,plan));}});
test('undefined session currval is isolated with a savepoint',async()=>{
  const calls=[];const client={query:async(sql,args)=>{calls.push({sql,args});if(sql.includes('from pg_sequences'))return {rows:[{schemaname:'auth',sequencename:'refresh_tokens_id_seq'}]};if(sql.includes('currval'))throw Object.assign(new Error('undefined'),{code:'55000'});return {rows:[]};}};
  assert.deepEqual(await captureMtgParentLinkSessionSequencesV1(client),[{schemaname:'auth',sequencename:'refresh_tokens_id_seq',session_value:null}]);
  assert.ok(calls.some(c=>c.sql.startsWith('rollback to savepoint')));assert.ok(calls.at(-1).sql.startsWith('release savepoint'));
});
test('sequence read permission failures remain errors',async()=>{
  const client={query:async sql=>{if(sql.includes('from pg_sequences'))return {rows:[{schemaname:'auth',sequencename:'refresh_tokens_id_seq'}]};if(sql.includes('currval'))throw Object.assign(new Error('permission denied'),{code:'42501'});return {rows:[]};}};
  await assert.rejects(()=>captureMtgParentLinkSessionSequencesV1(client),/permission denied/);
});
