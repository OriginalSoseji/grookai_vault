import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import test from 'node:test';
const require=createRequire(import.meta.url), ts=require('typescript');
const webRequire=createRequire(path.resolve('apps/web/package.json'));
const loaded=new Map();
function load(file){
  file=path.resolve(file);if(loaded.has(file))return loaded.get(file);
  const module={exports:{}};loaded.set(file,module.exports);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,require: spec=>spec.startsWith('@/')?load('apps/web/src/'+spec.slice(2)+'.ts'):webRequire(spec),Set,Error,console});return module.exports;
}
const edition=load('apps/web/src/lib/cards/jungleEditionResolution.ts');
const display=load('apps/web/src/lib/cards/displayDiscriminator.ts');
const identity=load('apps/web/src/lib/cards/resolveDisplayIdentity.ts');
const edge=load('supabase/functions/_shared/jungle_edition_error.ts');
const fixture=()=>JSON.parse(fs.readFileSync('tests/fixtures/jungle_edition_resolution_v1.json'));
test('ambiguous legacy selection never picks a default edition',()=>{
  const r=edition.parseJungleEditionResolution(fixture());
  assert.throws(()=>edition.assertJungleEditionSelection(r,r.legacy_card_print_id,r.options[0].card_printing_id),/Choose First Edition or Unlimited/);
});
test('ready resolution requires the exact parent and child',()=>{
  const r=edition.parseJungleEditionResolution({...fixture(),status:'ready'});
  for(const x of r.options)assert.doesNotThrow(()=>edition.assertJungleEditionSelection(r,x.card_print_id,x.card_printing_id));
  assert.throws(()=>edition.assertJungleEditionSelection(r,r.options[0].card_print_id,r.options[1].card_printing_id),/verified printing/);
  assert.throws(()=>edition.assertJungleEditionSelection(r,r.options[0].card_print_id,null),/verified printing/);
});
for(const [name,mutate]of [
  ['partial pair',r=>r.options.pop()],['duplicate edition',r=>r.options[1]=r.options[0]],
  ['wrong edition GV-ID',r=>r.options[0].gv_id='GV-PK-JU-1-UNLIMITED'],
  ['cross-parent child',r=>r.options[0].printing_gv_id=r.options[1].printing_gv_id],
  ['other card number',r=>{r.options[1].gv_id='GV-PK-JU-2-UNLIMITED';r.options[1].printing_gv_id='GV-PK-JU-2-UNLIMITED-HOLO';}],
  ['invalid version',r=>r.version=2],['invalid parent',r=>r.legacy_card_print_id='bad']
])test(name+' is rejected',()=>{const r=fixture();mutate(r);assert.throws(()=>edition.parseJungleEditionResolution(r));});
test('missing pre-migration RPC alone is compatible; network and malformed responses fail closed',async()=>{
  const client=result=>({rpc:async(name,args)=>{assert.equal(name,edition.JUNGLE_EDITION_RPC);assert.ok(args.p_card_print_id);return result;}});
  assert.equal((await edition.getJungleEditionResolution(client({error:{code:'PGRST202',message:edition.JUNGLE_EDITION_RPC}}),'id')).status,'not_applicable');
  await assert.rejects(edition.getJungleEditionResolution(client({error:{code:'57014',message:'timeout'}}),'id'));
  await assert.rejects(edition.getJungleEditionResolution(client({data:{version:1,status:'ready',options:[]}}),'id'));
});
test('edition survives child finish and legacy labels do not imply Unlimited',()=>{
  assert.equal(display.getCardPrintDisplayDiscriminator({printedIdentityModifier:'edition:unlimited',finishKey:'holo'}).label,'Unlimited · Holo');
  assert.equal(display.getCardPrintDisplayDiscriminator({printedIdentityModifier:'edition:first_edition',finishKey:'normal'}).label,'1st Edition · Normal');
  assert.equal(identity.resolveDisplayIdentity({name:'Clefable',set_code:'base2',number:'1'}).display_name,'Clefable · Edition unconfirmed');
  assert.equal(identity.resolveDisplayIdentity({name:'Clefable',set_code:'base2',number:'1',variant_key:'no_symbol_error'}).suffix,'No Symbol Error');
  assert.equal(identity.resolveDisplayIdentity({name:'Other',set_code:'base1',number:'1'}).suffix,null);
});
test('actual web choice component links both exact identities and never submits a copy',()=>{
  const component=load('apps/web/src/components/cards/JungleEditionChoices.tsx').default;
  const React=webRequire('react'),{renderToStaticMarkup}=webRequire('react-dom/server');
  const html=renderToStaticMarkup(React.createElement(component,{resolution:fixture()}));
  assert.match(html,/First Edition/);assert.match(html,/Unlimited/);assert.match(html,/Your saved copies stay as they are/);
  for(const x of fixture().options)assert.ok(html.includes(`/card/${x.gv_id}?printing=${x.printing_gv_id}`));
  assert.doesNotMatch(html,/<form|type="submit"/);
  const held=renderToStaticMarkup(React.createElement(component,{resolution:{...fixture(),status:'unavailable',options:[]}}));
  assert.doesNotMatch(held,/href=/);assert.match(held,/being reviewed/);
  const unavailableWithOptions=renderToStaticMarkup(React.createElement(component,{resolution:{...fixture(),status:'unavailable'}}));
  assert.doesNotMatch(unavailableWithOptions,/href=/);
});
test('Edge maps only known edition errors to safe typed conflicts',()=>{
  assert.equal(edge.jungleEditionErrorResponse({message:'JUNGLE_EDITION_REQUIRED'}).error,'JUNGLE_EDITION_REQUIRED');
  assert.equal(edge.jungleEditionErrorResponse({message:'database secret detail'}),null);
  assert.equal(edge.jungleEditionErrorResponse({message:'toString'}),null);
});
