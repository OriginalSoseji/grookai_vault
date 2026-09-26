import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const ts=require('typescript');
function compile(relative,imports={}) {
  const source=fs.readFileSync(new URL(relative,import.meta.url),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,process:{env:{}},require:name=>{
    if(name==='server-only')return {};
    assert.ok(Object.hasOwn(imports,name),`Unexpected dependency: ${name}`);return imports[name];
  }},{filename:relative});
  return module.exports;
}
const core=compile('../../apps/web/src/lib/entitlements/grookaiUserEntitlements.ts');
const user={id:'a3000000-0000-4000-8000-000000000001',email:'reader@fixture.invalid'};
function setup(effective,legacy=[]) {
  const calls=[];
  const admin={rpc:async(name,args)=>{calls.push({name,args});return effective;},from:table=>{
    calls.push({table});return {select:()=>({or:async()=>({data:legacy,error:null})})};
  }};
  const {resolveServerUserEntitlement}=compile('../../apps/web/src/lib/entitlements/resolveServerUserEntitlement.ts',{
    '@/lib/supabase/admin':{createServerAdminClient:()=>admin},
    '@/lib/entitlements/grookaiUserEntitlements':core,
  });
  return {read:resolveServerUserEntitlement,calls};
}
const record={user_id:user.id,is_active:true,tier:'vendor',role:'vendor',features:{store_app:true,store_web:true,vendor_tools:true},source:'manual'};
test('server consumes database-computed paid capabilities using the authenticated UUID',async()=>{
 const x=setup({data:record,error:null});const r=await x.read(user);
 assert.equal(r.tier,'vendor');assert.equal(r.features.store_web,true);assert.equal(r.capabilities.canUseVendorTools,true);
 assert.equal(x.calls.length,1);assert.equal(x.calls[0].name,'grookai_effective_entitlement_v1');assert.equal(x.calls[0].args.p_user_id,user.id);
});
test('expired billing uses returned manual tier and cannot revive a stale paid record',async()=>{
 const x=setup({data:{...record,tier:'premium',role:'collector',features:{assistant:true,store_app:false,store_web:false,vendor_tools:false}},error:null},[record]);
 const r=await x.read(user);assert.equal(r.tier,'premium');assert.equal(r.features.store_web,false);assert.equal(r.capabilities.canUseVendorTools,false);assert.equal(x.calls.length,1);
});
test('app-only paid record retains vendor tools while web store access stays false',async()=>{
 const x=setup({data:{...record,features:{store_app:true,store_web:false,vendor_tools:true}},error:null});
 const r=await x.read(user);assert.equal(r.features.store_app,true);assert.equal(r.features.store_web,false);assert.equal(r.capabilities.canUseVendorTools,true);
});
test('pre-billing deployment without the additive RPC retains manual database access',async()=>{
 const x=setup({data:null,error:{code:'PGRST202'}},[{...record,features:{vendor_tools:true}}]);
 const r=await x.read(user);assert.equal(r.tier,'vendor');assert.equal(r.features.store_app,undefined);assert.equal(x.calls[1].table,'user_entitlements');
});
test('inactive records do not grant paid capabilities through either read path',async()=>{
 const x=setup({data:null,error:null},[{...record,is_active:false}]);
 const r=await x.read(user);assert.equal(r.tier,'free');assert.equal(r.capabilities.canUseVendorTools,false);
});
test('anonymous browsing performs no entitlement database call',async()=>{
 const x=setup({data:record,error:null});assert.equal((await x.read(null)).tier,'anonymous');assert.equal(x.calls.length,0);
});
test('existing founder emergency access remains independent of billing',async()=>{
 const x=setup({data:record,error:null});const r=await x.read({...user,email:'ccabrl@gmail.com'});
 assert.equal(r.tier,'founder_admin');assert.equal(r.capabilities.canUseFounderTools,true);assert.equal(x.calls.length,0);assert.equal(r.features.store_app,undefined);
});
