import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
import {createRequire} from 'node:module';import test from 'node:test';
const require=createRequire(import.meta.url),ts=require('typescript');
function loader({mocks={},fetch=()=>{throw Error('Unexpected network call');},env={}}={}){
 const cache=new Map();
 function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);
  const module={exports:{}};cache.set(file,module.exports);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,console,AbortSignal,fetch,process:{env},require:spec=>{
   if(Object.hasOwn(mocks,spec))return mocks[spec];if(spec==='server-only')return {};
   if(spec.startsWith('@/'))return load('apps/web/src/'+spec.slice(2)+'.ts');throw Error('Unexpected import '+spec);
  }});return module.exports;
 }return load;
}
const load=loader(),parser=load('apps/web/src/lib/slabs/psaCertificateResponse.ts');
const review=load('apps/web/src/lib/slabs/reviewJungleSlabCertificate.ts').reviewJungleSlabCertificate;
const cert='00001234';
const payload=()=>({PSACert:{CertNumber:cert,CardGrade:'10',GradeDescription:'GEM MT 10',Year:'1999',Brand:'POKEMON JUNGLE',Category:'TCG Cards',CardNumber:'1',Subject:'CLEFABLE-HOLO',Variety:'1ST EDITION',IsPSADNA:false,IsDualCert:false}});
const parse=p=>parser.parsePsaCertificateResponse(cert,p);
const input=()=>{
 const resolution={...JSON.parse(fs.readFileSync('tests/fixtures/jungle_edition_resolution_v1.json')),status:'ready'};
 const option=resolution.options[0];return {requestedCertNumber:cert,verification:parse(payload()),resolution,selectedPrintingId:option.card_printing_id,
  canonical:{id:option.card_print_id,gv_id:option.gv_id,name:'Clefable',number:'1',set_code:'base2',game_code:'pokemon',language:'en',printed_identity_modifier:'edition:first_edition'}};
};

test('current PSACert wrapper binds requested certificate and preserves leading zeroes',()=>{
 const result=parse(payload());assert.equal(result.verified,true);assert.equal(result.cert_number,cert);assert.equal(result.identity.certNumber,cert);
 assert.equal(parser.normalizePsaCertNumber(' 0000-12 34 '),cert);assert.equal(parser.normalizePsaCertNumber(1234),null);
 assert.equal(parser.normalizePsaCertNumber('O0001234'),null);
});
for(const [name,mutate,code]of [
 ['explicit invalid envelope',p=>p.IsValidRequest=false,'PSA_INVALID_CERT_REQUEST'],
 ['conflicting envelope flags',p=>{p.IsValidRequest=true;p.isValidRequest=false;},'PSA_INVALID_CERT_REQUEST'],
 ['false-like string envelope',p=>p.IsValidRequest='true','PSA_INVALID_CERT_REQUEST'],
 ['no data envelope',p=>p.ServerMessage='No data found','PSA_CERT_NOT_FOUND'],
 ['conflicting messages',p=>{p.ServerMessage='Request successful';p.serverMessage='Invalid CertNo';},'PSA_API_INVALID_RESPONSE'],
 ['wrong cert',p=>p.PSACert.CertNumber='99991234','PSA_CERT_NUMBER_MISMATCH'],
 ['lost leading zeroes',p=>p.PSACert.CertNumber='1234','PSA_CERT_NUMBER_MISMATCH'],
 ['numeric cert',p=>p.PSACert.CertNumber=1234,'PSA_CERT_NUMBER_MISSING'],
 ['missing cert',p=>delete p.PSACert.CertNumber,'PSA_CERT_NUMBER_MISSING'],
 ['nested cert is not a response',p=>{p.Other=p.PSACert;delete p.PSACert;},'PSA_API_INVALID_RESPONSE'],
 ['nested grade cannot fill missing grade',p=>{delete p.PSACert.CardGrade;delete p.PSACert.GradeDescription;p.Other={Grade:'10'};},'PSA_GRADE_MISSING'],
 ['out of range grade',p=>{p.PSACert.CardGrade='100';p.PSACert.GradeDescription='100';},'PSA_GRADE_MISSING'],
 ['conflicting grades',p=>p.PSACert.GradeDescription='NM 7','PSA_GRADE_CONFLICT'],
 ['qualified grade',p=>{p.PSACert.CardGrade='8 (OC)';p.PSACert.GradeDescription='NM-MT 8 (OC)';},'PSA_GRADE_MISSING'],
])test(name+' cannot verify a slab',()=>{const p=payload();mutate(p);const r=parse(p);assert.equal(r.verified,false);assert.equal(r.error_code,code);assert.equal(r.identity,undefined);});
test('documented success envelope and descriptor fallback remain supported',()=>{
 const p=payload();p.IsValidRequest=true;p.ServerMessage='Request successful';delete p.PSACert.CardGrade;
 assert.equal(parse(p).verified,true);assert.equal(parse(p).grade,'GEM MT 10');
});
for(const p of [null,[],true,'10',{Grade:'10'},{DNACert:{CertNumber:cert,Grade:'10'}}])test('malformed/non-card response '+JSON.stringify(p),()=>assert.equal(parse(p).verified,false));

test('explicit selected edition and finish match without changing input or assigning ownership',()=>{
 const i=input(),before=JSON.stringify(i);const r=review(i);assert.equal(r.status,'matched');assert.equal(r.option.card_print_id,i.canonical.id);assert.equal(JSON.stringify(i),before);
 assert.deepEqual(Object.keys(r).sort(),['certNumber','grade','option','status']);
});
for(const [name,mutate]of [
 ['legacy needs owner choice',i=>i.resolution.status='selection_required'],
 ['unready catalog',i=>i.resolution.status='unavailable'],
 ['partial pair',i=>i.resolution.options.pop()],
 ['other printing',i=>i.selectedPrintingId=i.resolution.options[1].card_printing_id],
 ['forged parent GV-ID',i=>i.canonical.gv_id=i.resolution.options[1].gv_id],
 ['different canonical number',i=>i.canonical.number='2'],
 ['different language',i=>i.canonical.language='ja'],
 ['different set',i=>i.canonical.set_code='base1'],
 ['blank canonical edition',i=>i.canonical.printed_identity_modifier=''],
 ['wrong requested cert',i=>i.requestedCertNumber='99991234'],
 ['only convenience verification',i=>delete i.verification.raw_payload],
])test(name+' remains held',()=>{const i=input();mutate(i);assert.equal(review(i).status,'held');});
for(const [name,mutate]of [
 ['blank variety',p=>p.PSACert.Variety=''],['Unlimited for First Edition',p=>p.PSACert.Variety='UNLIMITED'],
 ['mixed editions',p=>p.PSACert.Variety='FIRST EDITION UNLIMITED'],
 ['no symbol variant',p=>p.PSACert.Variety='UNLIMITED NO SYMBOL'],
 ['misprint',p=>p.PSACert.Variety='1ST EDITION ERROR'],
 ['missing finish',p=>p.PSACert.Subject='CLEFABLE'],
 ['conflicting finish',p=>p.PSACert.Variety='1ST EDITION NON-HOLO'],
 ['reverse holo',p=>p.PSACert.Subject='CLEFABLE-REVERSE HOLO'],
 ['wrong subject',p=>p.PSACert.Subject='VAPOREON-HOLO'],
 ['wrong card number',p=>p.PSACert.CardNumber='2'],
 ['different denominator',p=>p.PSACert.CardNumber='1/65'],
 ['coordinate suffix',p=>p.PSACert.CardNumber='1a'],
 ['wrong year',p=>p.PSACert.Year='2000'],
 ['missing year',p=>delete p.PSACert.Year],
 ['foreign label',p=>p.PSACert.Brand='POKEMON FRENCH JUNGLE'],
 ['wrong set',p=>p.PSACert.Brand='POKEMON BASE SET'],
 ['wrong category',p=>p.PSACert.Category='Baseball'],
 ['autograph',p=>p.PSACert.IsPSADNA=true],['dual cert',p=>p.PSACert.IsDualCert=true],
 ['missing autograph flag',p=>delete p.PSACert.IsPSADNA],
 ['unreviewed item status',p=>p.PSACert.ItemStatus='INVALID'],
])test(name+' is not accepted as the selected printing',()=>{const i=input(),p=payload();mutate(p);i.verification=parse(p);assert.equal(review(i).status,'held');});

test('all128 reviewed coordinates accept only their explicit matching synthetic labels',()=>{
 const manifest=JSON.parse(fs.readFileSync('docs/catalog/master_printing_authority_v1/jungle_editions/manifest.json'));
 let checked=0;
 for(const parent of manifest.parents){
  const pair=manifest.parents.filter(p=>p.printed_coordinate===parent.printed_coordinate);
  const options=pair.map(p=>{const child=manifest.printings.find(c=>c.card_print_id===p.id);return {card_print_id:p.id,card_printing_id:child.id,gv_id:p.gv_id,printing_gv_id:child.printing_gv_id,edition:p.printed_identity_modifier.slice(8),finish_key:child.finish_key};});
  const selected=options.find(o=>o.card_print_id===parent.id),p=payload();
  Object.assign(p.PSACert,{CardNumber:parent.printed_coordinate,Subject:parent.name,Variety:(selected.edition==='first_edition'?'1ST EDITION':'UNLIMITED')+' '+(selected.finish_key==='holo'?'HOLO':'NON-HOLO')});
  const i={requestedCertNumber:cert,verification:parse(p),resolution:{version:1,status:'ready',legacy_card_print_id:parent.legacy_card_print_id,options},selectedPrintingId:selected.card_printing_id,
   canonical:{id:parent.id,gv_id:parent.gv_id,name:parent.name,number:parent.printed_coordinate,set_code:'base2',game_code:'pokemon',language:'en',printed_identity_modifier:parent.printed_identity_modifier}};
  assert.equal(review(i).status,'matched',parent.gv_id);i.verification.raw_payload.PSACert.Variety='';assert.equal(review(i).status,'held');checked++;
 }assert.equal(checked,128);
});

test('actual fetch adapter normalizes certificate, binds response and uses bounded uncached server fetch',async()=>{
 const calls=[],adapter=loader({env:{PSA_API_TOKEN:'synthetic-test-token'},fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>payload()};}})('apps/web/src/lib/slabs/psaVerificationAdapter.ts');
 assert.equal((await adapter.verifyPsaCert('0000-12 34')).verified,true);assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://api.psacard.com/publicapi/cert/GetByCertNumber/00001234');assert.equal(calls[0].options.cache,'no-store');assert.ok(calls[0].options.signal instanceof AbortSignal);
 assert.equal((await adapter.verifyPsaCert('12/not-a-cert')).verified,false);assert.equal(calls.length,1);
});
for(const status of [401,403,404,429,500])test('provider HTTP '+status+' is held',async()=>{
 const adapter=loader({env:{PSA_API_TOKEN:'synthetic-test-token'},fetch:async()=>({ok:false,status})})('apps/web/src/lib/slabs/psaVerificationAdapter.ts');
 assert.equal((await adapter.verifyPsaCert(cert)).verified,false);
});
test('missing configuration and provider failure never verify',async()=>{
 assert.equal((await loader()('apps/web/src/lib/slabs/psaVerificationAdapter.ts').verifyPsaCert(cert)).error_code,'MISSING_PSA_CONFIG');
 const adapter=loader({env:{PSA_API_TOKEN:'synthetic-test-token'},fetch:async()=>{throw Error('timeout');}})('apps/web/src/lib/slabs/psaVerificationAdapter.ts');
 assert.equal((await adapter.verifyPsaCert(cert)).error_code,'FETCH_EXCEPTION');
});
test('actual slab action rejects wrong certificate before creating an admin client or any rows',async()=>{
 let adminCalls=0,fetchCalls=0;
 const run=loader({env:{PSA_API_TOKEN:'synthetic-test-token'},fetch:async()=>{fetchCalls++;const p=payload();p.PSACert.CertNumber='99991234';return {ok:true,json:async()=>p};},mocks:{
  'next/cache':{revalidatePath:()=>{}},
  '@/lib/contracts/execute_owner_write_v1':{executeOwnerWriteV1:async p=>p.write({})},
  '@/lib/contracts/owner_write_proofs_v1':{createVaultInstanceActiveProofV1:()=>()=>{}},
  '@/lib/supabase/admin':{createServerAdminClient:()=>{adminCalls++;throw Error('Forbidden write');}},
  '@/lib/supabase/server':{createServerComponentClient:async()=>({rpc:async()=>({data:{version:1,status:'not_applicable',options:[]}})})},
  '@/lib/vault/assertAuthenticatedVaultUser':{assertAuthenticatedVaultUser:async()=>{}},
 }});
 const result=await run('apps/web/src/lib/slabs/createSlabInstance.ts').createSlabInstance({userId:'synthetic-owner',cardPrintId:'synthetic-card',gvId:'GV-TEST',cardName:'Test',grader:'PSA',selectedGrade:'10',certNumber:cert,certNumberConfirm:cert});
 assert.equal(result.ok,false);assert.equal(result.errorCode,'VERIFICATION_FAILED');assert.equal(fetchCalls,1);assert.equal(adminCalls,0);
});

for(const status of ['ready','selection_required','unavailable'])test('Jungle '+status+' still requires the future atomic slab writer',async()=>{
 let providerCalls=0,adminCalls=0;const resolution={...input().resolution,status};
 const run=loader({mocks:{
  'next/cache':{revalidatePath:()=>{}},
  '@/lib/contracts/execute_owner_write_v1':{executeOwnerWriteV1:async p=>p.write({})},
  '@/lib/contracts/owner_write_proofs_v1':{createVaultInstanceActiveProofV1:()=>()=>{}},
  '@/lib/supabase/admin':{createServerAdminClient:()=>{adminCalls++;throw Error('Forbidden write');}},
  '@/lib/supabase/server':{createServerComponentClient:async()=>({rpc:async()=>({data:resolution})})},
  '@/lib/vault/assertAuthenticatedVaultUser':{assertAuthenticatedVaultUser:async()=>{}},
  '@/lib/slabs/psaVerificationAdapter':{verifyPsaCert:async()=>{providerCalls++;return parse(payload());}},
 }});
 const result=await run('apps/web/src/lib/slabs/createSlabInstance.ts').createSlabInstance({userId:'synthetic-owner',cardPrintId:input().canonical.id,gvId:input().canonical.gv_id,cardName:'Clefable',grader:'PSA',selectedGrade:'10',certNumber:cert,certNumberConfirm:cert});
 assert.equal(result.errorCode,'CARD_IDENTITY_UNVERIFIED');assert.equal(providerCalls,0);assert.equal(adminCalls,0);
});

test('ordinary successful slab action still creates its cert, anchor and instance after bound verification',async()=>{
 const calls=[];
 const chain=(table,admin)=>{
  let inserted=false;const q={select:()=>q,eq:()=>q,is:()=>q,
   insert:row=>{inserted=true;calls.push({table,row,admin});return q;},
   maybeSingle:async()=>({data:null,error:null}),
   single:async()=>{assert.equal(inserted,true);return {data:{id:table==='slab_certs'?'cert-id':'anchor-id'},error:null};}};return q;
 };
 const run=loader({env:{PSA_API_TOKEN:'synthetic-test-token'},fetch:async()=>({ok:true,json:async()=>payload()}),mocks:{
  'next/cache':{revalidatePath:()=>{}},
  '@/lib/contracts/execute_owner_write_v1':{executeOwnerWriteV1:async p=>p.write({setMetadata:()=>{}})},
  '@/lib/contracts/owner_write_proofs_v1':{createVaultInstanceActiveProofV1:()=>()=>{}},
  '@/lib/supabase/admin':{createServerAdminClient:()=>({from:t=>chain(t,true),rpc:async(name,args)=>{calls.push({name,args});return {data:{id:'instance-id',gv_vi_id:'GVVI-TEST'},error:null};}})},
  '@/lib/supabase/server':{createServerComponentClient:async()=>({rpc:async()=>({data:{version:1,status:'not_applicable',options:[]}}),from:t=>chain(t,false)})},
  '@/lib/vault/assertAuthenticatedVaultUser':{assertAuthenticatedVaultUser:async()=>{}},
 }});
 const result=await run('apps/web/src/lib/slabs/createSlabInstance.ts').createSlabInstance({userId:'synthetic-owner',cardPrintId:'synthetic-card',gvId:'GV-TEST',cardName:'Test',grader:'PSA',selectedGrade:'10',certNumber:cert,certNumberConfirm:cert});
 assert.equal(result.ok,true);assert.equal(result.certNumber,cert);assert.equal(calls.length,3);
 assert.equal(calls[0].row.cert_number,cert);assert.equal(calls[0].row.card_print_id,'synthetic-card');
 assert.equal(calls[1].row.card_id,'synthetic-card');assert.equal(calls[2].args.p_slab_cert_id,'cert-id');
});
