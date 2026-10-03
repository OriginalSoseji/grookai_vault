import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
import {createRequire} from 'node:module';import {randomUUID} from 'node:crypto';import test from 'node:test';
const require=createRequire(import.meta.url),ts=require('typescript');
const webRequire=createRequire(path.resolve('apps/web/package.json'));
function loader(mocks={},env={}){
 const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);
 const module={exports:{}};cache.set(file,module.exports);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,Buffer,console,process:{env},require:spec=>{
  if(Object.hasOwn(mocks,spec))return mocks[spec];if(spec==='server-only')return {};
  if(spec.startsWith('node:'))return require(spec);if(spec==='react/jsx-runtime')return webRequire(spec);
  if(spec.startsWith('@/'))return load('apps/web/src/'+spec.slice(2)+'.ts');throw Error('Unexpected import '+spec);
 }});return module.exports;}return load;
}
const resolution={...JSON.parse(fs.readFileSync('tests/fixtures/jungle_edition_resolution_v1.json')),status:'ready'};
const option=resolution.options[0],owner=randomUUID(),secret='test-only-'.repeat(8),certNumber='00001234';
const response=()=>({PSACert:{CertNumber:certNumber,CardGrade:'10',GradeDescription:'GEM MT 10',Year:'1999',Brand:'POKEMON JUNGLE',Category:'TCG Cards',CardNumber:'1',Subject:'CLEFABLE-HOLO',Variety:'1ST EDITION',IsPSADNA:false,IsDualCert:false}});
const cryptoModule=loader()('apps/web/src/lib/slabs/jungleSlabTicket.ts');
const ticket=()=>({version:1,ownerId:owner,requestId:randomUUID(),cardPrintId:option.card_print_id,printingId:option.card_printing_id,
 certNumber,grade:'10',gvId:option.gv_id,issuedAt:100000,expiresAt:200000,payload:response()});
test('ticket round trip preserves original source privately',()=>{const t=ticket(),sealed=cryptoModule.sealJungleSlabTicket(t,secret,100000);assert.ok(!sealed.includes(certNumber));assert.equal(JSON.stringify(cryptoModule.openJungleSlabTicket(sealed,secret,owner,110000)),JSON.stringify(t));});
for(const [name,mutate]of [['expired',t=>t.expiresAt=100000],['overlong validity',t=>t.expiresAt=9999999],['future issued',t=>t.issuedAt=150000],['numeric certificate',t=>t.certNumber=1234],['invalid owner',t=>t.ownerId='bad'],['unsupported grade',t=>t.grade='10.5'],['oversized payload',t=>t.payload={large:'x'.repeat(17000)}]])test(name+' cannot be sealed',()=>{const t=ticket();mutate(t);assert.throws(()=>cryptoModule.sealJungleSlabTicket(t,secret,100000));});
for(const kind of ['wrong owner','wrong key','tampered body','tampered tag','expired','oversized token'])test(kind+' cannot be opened',()=>{
 let s=cryptoModule.sealJungleSlabTicket(ticket(),secret,100000);if(kind==='tampered body'){const parts=s.split('.');parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);s=parts.join('.');}
 if(kind==='tampered tag')s=s.slice(0,-2)+(s.at(-2)==='A'?'B':'A')+s.at(-1);if(kind==='oversized token')s+='x'.repeat(33000);
 assert.throws(()=>cryptoModule.openJungleSlabTicket(s,kind==='wrong key'?secret+'x':secret,kind==='wrong owner'?randomUUID():owner,kind==='expired'?200000:110000));
});
function harness(){
 const state={owner,authError:false,ready:true,source:response(),providerCalls:0,rpcCalls:[],copies:0,lost:false,copyDrift:false,anchorDrift:false,certDrift:false,invalidRpc:false,dbError:null};
 const canonical={id:option.card_print_id,gv_id:option.gv_id,name:'Clefable',number:'1',set_code:'base2',identity_domain:'pokemon_eng_standard',printed_identity_modifier:'edition:first_edition'};
 const query=data=>({select(){return this;},eq(){return this;},async single(){return {data:typeof data==='function'?data():data,error:null};}});
 const client={auth:{getUser:async()=>({data:{user:state.owner?{id:state.owner}:null},error:state.authError?{}:null})},
  rpc:async()=>({data:{...resolution,status:state.ready?'ready':'unavailable',options:state.ready?resolution.options:[]},error:null}),from:()=>query(canonical)};
 const ids={instance:randomUUID(),anchor:randomUUID(),cert:randomUUID()};
 const admin={rpc:async(name,args)=>{assert.equal(name,'admin_jungle_slab_intake_v1');state.rpcCalls.push(structuredClone(args));if(state.dbError)return {data:null,error:{message:state.dbError}};state.copies=1;
  if(state.lost){state.lost=false;throw Error('response lost after synthetic commit');}return {data:state.invalidRpc?{}:{instance_id:ids.instance,gv_vi_id:'GVVI-TEST-1'},error:null};},
  from:table=>query(()=>table==='vault_item_instances'?{id:ids.instance,user_id:state.copyDrift?randomUUID():owner,gv_vi_id:'GVVI-TEST-1',card_print_id:null,card_printing_id:option.card_printing_id,slab_cert_id:ids.cert,legacy_vault_item_id:ids.anchor,archived_at:null,is_graded:true,grade_company:'PSA',grade_value:'10'}
   :table==='slab_certs'?{card_print_id:option.card_print_id,normalized_grader:'PSA',normalized_cert_number:state.certDrift?'123':certNumber,grade:10}
   :{user_id:owner,card_id:option.card_print_id,qty:state.anchorDrift?0:1,archived_at:null})};
 const env={JUNGLE_SLAB_INTAKE_ENABLED:'true',JUNGLE_SLAB_INTAKE_SECRET:secret};let parse;
 const load=loader({'@/lib/supabase/server':{createServerComponentClient:async()=>client},'@/lib/supabase/admin':{createServerAdminClient:()=>admin},
  'next/cache':{revalidatePath(){}},'@/lib/slabs/psaVerificationAdapter':{verifyPsaCert:async c=>{state.providerCalls++;return parse(c,state.source);}}},env);
 parse=load('apps/web/src/lib/slabs/psaCertificateResponse.ts').parsePsaCertificateResponse;
 return {state,env,actions:load('apps/web/src/lib/slabs/jungleSlabActions.ts'),input:{cardPrintId:option.card_print_id,printingId:option.card_printing_id,certNumber,certNumberConfirm:certNumber,grade:'10'}};
}
test('prepare is read-only and save uses current authenticated owner plus exact source',async()=>{
 const h=harness(),p=await h.actions.prepareJungleSlab({...h.input,userId:randomUUID(),payload:{forged:true}});assert.equal(p.ok,true);assert.equal(h.state.rpcCalls.length,0);
 const result=await h.actions.saveJungleSlab(p.token,true);assert.equal(result.ok,true);assert.equal(h.state.rpcCalls[0].p_user_id,owner);assert.deepEqual(h.state.rpcCalls[0].p_provider_payload,response());assert.equal(h.state.providerCalls,1);
});
test('lost response retry reuses exact request and observation after provider changes',async()=>{
 const h=harness(),p=await h.actions.prepareJungleSlab(h.input);h.state.lost=true;
 assert.equal((await h.actions.saveJungleSlab(p.token,true)).ok,false);h.state.source={PSACert:{CertNumber:'different'}};
 assert.equal((await h.actions.saveJungleSlab(p.token,true)).ok,true);assert.deepEqual(h.state.rpcCalls[0],h.state.rpcCalls[1]);assert.equal(h.state.providerCalls,1);assert.equal(h.state.copies,1);
});
for(const [name,change]of [['signed out',h=>h.state.owner=null],['auth server error',h=>h.state.authError=true],['release disabled',h=>h.env.JUNGLE_SLAB_INTAKE_ENABLED='false'],['missing key',h=>delete h.env.JUNGLE_SLAB_INTAKE_SECRET],['wrong child',h=>h.input.printingId=resolution.options[1].card_printing_id],['unavailable pair',h=>h.state.ready=false],['wrong cert confirmation',h=>h.input.certNumberConfirm='12']])test(name+' stops before provider and writer',async()=>{
 const h=harness();change(h);assert.equal((await h.actions.prepareJungleSlab(h.input)).ok,false);assert.equal(h.state.providerCalls,0);assert.equal(h.state.rpcCalls.length,0);
});
for(const [name,change]of [['wrong PSA certificate',h=>h.state.source.PSACert.CertNumber='123'],['wrong edition',h=>h.state.source.PSACert.Variety='UNLIMITED'],['selected grade mismatch',h=>h.input.grade='9']])test(name+' cannot prepare a save',async()=>{const h=harness();change(h);assert.equal((await h.actions.prepareJungleSlab(h.input)).ok,false);assert.equal(h.state.rpcCalls.length,0);});
for(const [name,change,confirmed]of [['different signed-in owner',h=>h.state.owner=randomUUID(),true],['signed out before save',h=>h.state.owner=null,true],['retired pair',h=>h.state.ready=false,true],['release disabled before save',h=>h.env.JUNGLE_SLAB_INTAKE_ENABLED='false',true],['unconfirmed ownership',()=>{},false]])test(name+' cannot mutate',async()=>{
 const h=harness(),p=await h.actions.prepareJungleSlab(h.input);change(h);assert.equal((await h.actions.saveJungleSlab(p.token,confirmed)).ok,false);assert.equal(h.state.rpcCalls.length,0);
});
for(const field of ['copyDrift','certDrift','anchorDrift','invalidRpc'])test(field+' cannot report success',async()=>{const h=harness(),p=await h.actions.prepareJungleSlab(h.input);h.state[field]=true;assert.equal((await h.actions.saveJungleSlab(p.token,true)).ok,false);});
for(const [code,message]of [['JUNGLE_SLAB_ALREADY_OWNED',/already in your Vault/],['JUNGLE_SLAB_RETRY_STATE_CHANGED',/saved copy has changed/],['JUNGLE_SLAB_EXISTING_CERTIFICATE_MISMATCH',/needs review/]])test(code+' gives a useful terminal message',async()=>{
 const h=harness(),p=await h.actions.prepareJungleSlab(h.input);h.state.dbError=code;const result=await h.actions.saveJungleSlab(p.token,true);assert.equal(result.ok,false);assert.match(result.message,message);assert.equal(h.state.copies,0);
});

test('UI requires explicit selection/ownership and retains the same ticket after interrupted save',async()=>{
 const slots=[];let cursor=0,preparedCalls=0;const savedTokens=[];
 const load=loader({'react':{useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],v=>{slots[i]=v;}];}},
  'next/navigation':{useRouter:()=>({refresh(){}})},'@/lib/slabs/jungleSlabActions':{
   prepareJungleSlab:async()=>{preparedCalls++;return {ok:true,token:'sealed-ticket',label:'Clefable First Edition',grade:'10',certNumber};},
   saveJungleSlab:async token=>{savedTokens.push(token);if(savedTokens.length===1)throw Error('lost response');return {ok:true,gvviId:'GVVI-TEST-1'};}}});
 const Component=load('apps/web/src/components/slabs/AddJungleSlabAction.tsx').default;
 const render=()=>{cursor=0;const nodes=[];const walk=n=>{if(!n||typeof n!=='object')return;if(Array.isArray(n)){n.forEach(walk);return;}nodes.push(n);walk(n.props?.children);};walk(Component({options:resolution.options}));return nodes;};
 let nodes=render();assert.equal(nodes.find(n=>n.type==='select').props.value,'');
 nodes.find(n=>n.type==='select').props.onChange({target:{value:option.card_printing_id}});nodes=render();
 const inputs=nodes.filter(n=>n.type==='input');inputs[0].props.onChange({target:{value:certNumber}});inputs[1].props.onChange({target:{value:certNumber}});
 nodes=render();await nodes.find(n=>n.type==='button').props.onClick();nodes=render();
 assert.equal(nodes.filter(n=>n.type==='button').at(-1).props.disabled,true);
 nodes.find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});nodes=render();
 await nodes.filter(n=>n.type==='button').at(-1).props.onClick();nodes=render();await nodes.filter(n=>n.type==='button').at(-1).props.onClick();
 assert.deepEqual(savedTokens,['sealed-ticket','sealed-ticket']);assert.equal(preparedCalls,1);
});
