import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {test} from 'node:test';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const ts=createRequire(root+'/apps/web/package.json')('typescript');
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'/apps/web/src/components/stores/storeAvailability.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const availability=context.exports.storeAvailability;
const owner=()=>({store:{app_published:true,web_published:true},capabilities:{store_app:true,store_web:true},rollout:{app_enabled:true,web_enabled:true},profile:{public_profile_enabled:true,vault_sharing_enabled:true,slug:'example-store',display_name:'Example store'}});

test('complete access and explicit publication expose the selected audiences',()=>{
  const result=availability(owner());assert.equal(result.app,true);assert.equal(result.web,true);
});
for(const [group,key,value] of [
  ['capabilities','store_app',false],['rollout','app_enabled',false],
  ['profile','public_profile_enabled',false],['profile','vault_sharing_enabled',false],
  ['profile','slug',''],['profile','display_name',''],
]) test(`retained publication cannot imply availability without ${group}.${key}`,()=>{
  const data=owner();data[group][key]=value;const result=availability(data);
  assert.equal(result.app,false);assert.equal(result.web,false);
  assert.equal(data.store.app_published,true);assert.equal(data.store.web_published,true);
});
for(const [group,key] of [['capabilities','store_web'],['rollout','web_enabled'],['store','web_published']]) {
  test(`${group}.${key} can close web independently of the app`,()=>{
    const data=owner();data[group][key]=false;const result=availability(data);
    assert.equal(result.app,true);assert.equal(result.web,false);
  });
}
test('app publication is independent of public web publication',()=>{
  const data=owner();data.store.app_published=false;const result=availability(data);
  assert.equal(result.app,false);assert.equal(result.web,true);
});
for(const field of ['store','profile']) test(`missing ${field} never exposes a public audience`,()=>{
  const data=owner();data[field]=null;const result=availability(data);
  assert.equal(result.app,false);assert.equal(result.web,false);
});
