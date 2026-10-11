import test from 'node:test';
import assert from 'node:assert/strict';
import * as m from '../../apps/web/src/lib/sales/negotiatedDraft.mjs';
const id='11111111-1111-4111-8111-111111111111',copy='22222222-2222-4222-8222-222222222222';
const incoming={description:'Incoming bundle',quantity:3,valueMinor:null,rateBps:null,creditMinor:650,cardId:null,printingId:null,condition:null,addToVault:false};
function draft(){return m.addNegotiatedTrade({...m.newNegotiatedDraft(id,'Shop'),items:[{instanceId:copy,description:'Outgoing',quantity:1,unitMinor:1000,gvviId:'GVVI-PRIVATE',askingMinor:1200,image:'https://example.invalid/image'}],note:'PRIVATE NOTE',customer:{name:'PRIVATE NAME',email:'private@example.invalid',phone:'',wants:'PRIVATE WANTS',notes:'PRIVATE CONTEXT'}},incoming);}
test('empty held trade is valid but cannot be recorded',()=>{const d=m.newNegotiatedDraft(id);assert.equal(m.validateNegotiatedDraft(d),d);assert.throws(()=>m.negotiatedDraftRequest(d,id,true));});
test('credit is the agreed whole line even for a quantity of three',()=>{assert.deepEqual(m.negotiatedDraftTotals(draft()),{subtotal:1000,credit:650,total:1000,balance:350});});
test('request projects only wire fields and preserves independent agreed terms',()=>{const d=draft(),r=m.negotiatedDraftRequest(d,id,true);assert.equal(r.cart.version,5);assert.equal(r.cart.trades[0].creditMinor,650);assert.equal(r.cart.trades[0].valueMinor,null);assert.equal(r.cart.items[0].instanceId,copy);assert.equal(r.cart.items[0].gvviId,undefined);assert.equal(r.cart.note,'PRIVATE NOTE');assert.deepEqual(r.cart.payments,[{method:'Cash',amountMinor:350,tenderedMinor:350}]);});
test('customer preview omits private notes, rates, references and inventory IDs',()=>{const d=draft();d.trades[0]={...d.trades[0],valueMinor:1000,rateBps:6000};const view=m.negotiatedDraftCustomerView(d),encoded=JSON.stringify(view);for(const token of ['PRIVATE','valueMinor','rateBps','instanceId','gvviId','askingMinor','example.invalid'])assert.ok(!encoded.includes(token),token);assert.equal(view.trades[0].creditMinor,650);});
test('contact/payment edits can be held, but incomplete settlement cannot be recorded',()=>{const d=draft();d.customer.email='incomplete';d.payments=[{method:'Cash',amountMinor:1,tenderedMinor:1}];assert.equal(m.validateNegotiatedDraft(d),d);assert.throws(()=>m.negotiatedDraftRequest(d,id,true));});
test('duplicate outgoing copy or unrecognized draft shape rejects',()=>{const d=draft();assert.throws(()=>m.validateNegotiatedDraft({...d,items:[...d.items,...d.items]}));assert.throws(()=>m.validateNegotiatedDraft({...d,kind:undefined}));assert.throws(()=>m.validateNegotiatedDraft({...d,extra:true}));assert.throws(()=>m.negotiatedDraftRequest(d,id,false));});
test('even and payout terms keep agreed amounts without deriving references',()=>{for(const creditMinor of [1000,1500]){const d=draft();d.trades[0]={...d.trades[0],creditMinor};const r=m.negotiatedDraftRequest(d,id,true);assert.equal(r.cart.trades[0].creditMinor,creditMinor);assert.equal(r.cart.payments.length,creditMinor===1000?0:1);}});

// The checked-in vectors are also consumed by native tests.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/negotiated_draft_web_v1.json',import.meta.url)));
test('native draft vectors bind the current JS source',()=>assert.equal(fixture.sourceSha256,createHash('sha256').update(fs.readFileSync(new URL('../../apps/web/src/lib/sales/negotiatedDraft.mjs',import.meta.url))).digest('hex')));
for(const row of fixture.cases) test('shared draft: '+row.name,()=>{const args=structuredClone(row.args), before=structuredClone(args);if(row.expected.ok)assert.deepEqual(m[row.fn](...args),row.expected.value);else assert.throws(()=>m[row.fn](...args));assert.deepEqual(args,before);});
