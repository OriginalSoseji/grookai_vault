import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEventParentRecovery} from '../../scripts/schema/product_event_parent_v1.mjs';
function sample(){
 const seal={},actual={},addressChanges={};
 for(const mode of ['full','upgrade']){
  seal[mode]={address:mode==='full'?'10.246.79.3':'10.246.80.3',readonly:'on',controls:{enabled:false},retained:Object.fromEntries(Array.from({length:32},(_,n)=>['table'+n,'same']))};
  actual[mode]={...structuredClone(seal[mode]),address:mode==='full'?'10.246.79.7':'10.246.80.6'};
  addressChanges[mode]={before:seal[mode].address,after:actual[mode].address,actualContainerAddressChecked:true};
 }
 return [seal,{status:'passed_data_unchanged_address_remapped',readOnly:true,productionWrites:0,originalSealUnmodified:true,addressChanges,actual:structuredClone(actual)},actual];
}
test('attested address transition preserves every other sealed field',()=>{const args=sample();assert.deepEqual(validateEventParentRecovery(...args),args[2]);});
test('row changes, control changes and unobserved addresses refuse',()=>{
 for(const change of [a=>a[2].full.retained.table0='changed',a=>a[2].upgrade.controls.enabled=true,a=>a[2].full.address='10.246.79.8',a=>a[1].addressChanges.full.actualContainerAddressChecked=false,a=>a[1].addressChanges.full.before='unrelated',a=>a[1].actual.full.retained.table0='changed',a=>a[1].productionWrites=1,a=>a[1].originalSealUnmodified=false]){
  const args=sample();change(args);assert.throws(()=>validateEventParentRecovery(...args));
 }
});
