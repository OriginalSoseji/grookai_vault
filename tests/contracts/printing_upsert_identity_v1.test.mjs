import assert from 'node:assert/strict';
import test from 'node:test';

import { upsertPrinting } from '../../backend/printing/printing_upsert_v1.mjs';

function createFakeSupabase() {
  const upserts = [];
  const filters = [];

  return {
    upserts,
    filters,
    from(table) {
      if(table==='card_prints')return {select(){return {eq(){return {async single(){return {data:{id:'parent-1',gv_id:'GV-PK-TEST-001'},error:null};}};}};}};
      assert.equal(table, 'card_printings');
      return {
        upsert(payload, options) {
          upserts.push({ payload, options });
          return Promise.resolve({ error: null });
        },
        select() {
          const request = {
            eq(column, value) {
              filters.push([column, value]);
              return request;
            },
            async limit() {
              return { data: [{ card_print_id: 'parent-1', finish_key: 'holo' }], error: null };
            },
          };
          return request;
        },
      };
    },
  };
}

test('printing upsert writes and reads back a supplied governed printing GV-ID', async () => {
  const supabase = createFakeSupabase();
  await upsertPrinting({
    supabase,
    card_print_id: 'parent-1',
    finish_key: 'holo',
    printing_gv_id: 'GV-PK-TEST-001-HOLO',
    parent_gv_id: 'GV-PK-TEST-001',
    source: 'justtcg',
    ref: 'external-card-1',
    evidence: {
      source: 'justtcg',
      external_id: 'external-card-1',
      evidence_type: 'checked_checklist',
      review_status: 'verified',
      source_sha256: 'b'.repeat(64),
      card_print_id: 'parent-1',
      finish_key: 'holo',
    },
  });

  assert.equal(supabase.upserts.length, 1);
  assert.equal(supabase.upserts[0].payload.printing_gv_id, 'GV-PK-TEST-001-HOLO');
  assert.deepEqual(
    supabase.filters,
    [
      ['card_print_id', 'parent-1'],
      ['finish_key', 'holo'],
      ['printing_gv_id', 'GV-PK-TEST-001-HOLO'],
    ],
  );
});

for(const defect of ['missing_gvid','wrong_suffix','wrong_evidence_parent','wrong_evidence_finish','wrong_canonical_parent','price_bucket','variant_flags','unreviewed','missing_hash','wrong_provenance','provisional','invalid_dry_run'])test(`printing upsert blocks ${defect} without writes`,async()=>{
 const supabase=createFakeSupabase();
 const input={supabase,card_print_id:'parent-1',parent_gv_id:'GV-PK-TEST-001',finish_key:'holo',printing_gv_id:'GV-PK-TEST-001-HOLO',
 source:'checklist',ref:'1',
 evidence:{source:'checklist',external_id:'1',evidence_type:'checked_checklist',review_status:'verified',source_sha256:'b'.repeat(64),card_print_id:'parent-1',finish_key:'holo'}};
 if(defect==='missing_gvid')input.printing_gv_id=null;
 if(defect==='wrong_suffix')input.printing_gv_id='GV-PK-TEST-001-STD';
 if(defect==='wrong_evidence_parent')input.evidence.card_print_id='other';
 if(defect==='wrong_evidence_finish')input.evidence.finish_key='normal';
 if(defect==='wrong_canonical_parent'){input.parent_gv_id='GV-PK-OTHER';input.printing_gv_id='GV-PK-OTHER-HOLO';}
 if(defect==='price_bucket')input.evidence.evidence_type='price_bucket';
 if(defect==='variant_flags')input.evidence.evidence_type='variant_printing_label';
 if(defect==='unreviewed')input.evidence.review_status='pending';
 if(defect==='missing_hash')delete input.evidence.source_sha256;
 if(defect==='wrong_provenance')input.ref='different';
 if(defect==='provisional')input.is_provisional=true;
 if(defect==='invalid_dry_run'){input.dryRun=true;input.printing_gv_id=null;}
 await assert.rejects(upsertPrinting(input));assert.equal(supabase.upserts.length,0);
});
