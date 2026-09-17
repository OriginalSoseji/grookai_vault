import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture, seal} from '../fixtures/warehouse_printing_authority_v1.mjs';
import {freezeWarehousePrintingAuthority, assertWarehousePrintingAuthority}
  from '../../backend/warehouse/printing_authority_v1.mjs';
function packaged() {const f=fixture();return {...f,bundle:freezeWarehousePrintingAuthority(f)};}

test('source bytes survive JSON staging and bind the exact candidate and live parent',()=>{
  const f=packaged();
  const frozen=JSON.parse(JSON.stringify(f.bundle));
  const result=assertWarehousePrintingAuthority(frozen,f);
  assert.equal(result.printing.printing_gv_id,f.target.printing_gv_id);
  assert.equal(result.execution_authorized,false);
  for (const [ref,bytes] of f.artifacts) assert.deepEqual(result.artifacts.get(ref),bytes);
  assert.deepEqual(f.bundle,freezeWarehousePrintingAuthority(f));
});
test('frozen package is independent of later mutable manifest changes',()=>{
  const f=packaged();f.manifest.parents[0].name='changed';
  assert.equal(assertWarehousePrintingAuthority(f.bundle,f).parent.name,'Fixture');
});
for (const field of ['candidate_id','card_print_id','finish_key','printing_gv_id']) {
  test(`cannot reuse an evidence package for another ${field}`,()=>{
    const f=packaged();f.target[field]='other';
    assert.throws(()=>assertWarehousePrintingAuthority(f.bundle,f),/live_target_mismatch/);
  });
}
for (const field of ['id','set_id','gv_id','name','printed_coordinate','identity_domain','variant_key',
  'printed_identity_modifier','game','language','set_code']) {
  test(`live parent drift is rejected for ${field}`,()=>{
    const f=packaged();f.parent[field]='different';
    assert.throws(()=>assertWarehousePrintingAuthority(f.bundle,f),/live_(parent|scope)_mismatch/);
  });
}
test('a missing variant dimension is not normalized into the expected null',()=>{
  const f=packaged();delete f.parent.printed_identity_modifier;
  assert.throws(()=>assertWarehousePrintingAuthority(f.bundle,f),/live_parent_missing/);
});
for (const defect of ['missing_bytes','changed_bytes','duplicate_ref','extra_ref','noncanonical_base64',
  'unreviewed_manifest','wrong_manifest_hash','unbound_finish','unbound_candidate','missing_gvid']) {
  test(`rehashing an envelope cannot hide ${defect}`,()=>{
    const f=packaged();
    if(defect==='missing_bytes')f.bundle.artifacts.pop();
    if(defect==='changed_bytes')f.bundle.artifacts[0].base64=Buffer.from('changed').toString('base64');
    if(defect==='duplicate_ref')f.bundle.artifacts.push({...f.bundle.artifacts[0]});
    if(defect==='extra_ref')f.bundle.artifacts.push({ref:'extra',base64:'YQ=='});
    if(defect==='noncanonical_base64')f.bundle.artifacts[0].base64+='\n';
    if(defect==='unreviewed_manifest') {
      f.bundle.manifest.parents[0].variant_key='stamp';f.bundle.manifest=seal(f.bundle.manifest);
    }
    if(defect==='wrong_manifest_hash')f.bundle.manifest.fingerprint='0'.repeat(64);
    if(defect==='unbound_finish')f.bundle.target.finish_key='normal';
    if(defect==='unbound_candidate')f.bundle.target.candidate_id='';
    if(defect==='missing_gvid')delete f.bundle.target.printing_gv_id;
    f.bundle=seal(f.bundle);
    assert.throws(()=>assertWarehousePrintingAuthority(f.bundle,f));
  });
}
test('hash tampering and a missing package fail before canonical readiness',()=>{
  const f=packaged();f.bundle.fingerprint='0'.repeat(64);
  assert.throws(()=>assertWarehousePrintingAuthority(f.bundle,f),/fingerprint_mismatch/);
  assert.throws(()=>assertWarehousePrintingAuthority(null,f),/authority_required/);
});
test('unknown finishes never default to Normal or the only available printing',()=>{
  const f=fixture();f.target.finish_key='unknown';
  assert.throws(()=>freezeWarehousePrintingAuthority(f),/not_in_reviewed_master/);
});
test('provider price buckets are not accepted as printing evidence',()=>{
  const f=fixture();f.manifest.printings[0].evidence[0].kind='price_bucket';f.manifest=seal(f.manifest);
  assert.throws(()=>freezeWarehousePrintingAuthority(f),/price_or_unreviewed_evidence/);
});
