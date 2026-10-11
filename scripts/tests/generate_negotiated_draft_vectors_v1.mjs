import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as model from '../../apps/web/src/lib/sales/negotiatedDraft.mjs';
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const line={description:'Incoming bundle',quantity:3,valueMinor:null,rateBps:null,creditMinor:650,cardId:null,printingId:null,condition:null,addToVault:false};
const draft=()=>model.addNegotiatedTrade({...model.newNegotiatedDraft(id,'Shop'),items:[{instanceId:other,gvviId:'GVVI-PRIVATE',description:'Outgoing',quantity:1,unitMinor:1000}],note:'PRIVATE'},line);
const rows=[];
function add(name,fn,args,valid){let expected;try{expected={ok:true,value:model[fn](...args)};}catch{expected={ok:false};}assert.equal(expected.ok,valid,name);rows.push({name,fn,args,expected});}
add('new empty draft','newNegotiatedDraft',[id,''],true);
add('validated draft','validateNegotiatedDraft',[draft()],true);
add('whole line totals','negotiatedDraftTotals',[draft()],true);
add('private-safe preview','negotiatedDraftCustomerView',[draft()],true);
add('exact request','negotiatedDraftRequest',[draft(),id,true],true);
add('requires exchange confirmation','negotiatedDraftRequest',[draft(),id,false],false);
add('empty cannot complete','negotiatedDraftRequest',[model.newNegotiatedDraft(id,'Shop'),id,true],false);
for(const [index,edit]of [
 d=>d.kind='sale',d=>delete d.kind,d=>d.extra=true,d=>d.id='bad',d=>d.taxMinor=-1,d=>d.taxMinor=100000001,
 d=>d.note='a'.repeat(351),d=>d.items[0].quantity=2,d=>d.items[0].unitMinor=0,d=>d.items.push({...d.items[0]}),
 d=>d.items[0].extra=true,d=>d.items[0].image=1,d=>d.items[0].askingMinor=-1,d=>d.items[0].gvviId=null,
 d=>d.trades[0]={...d.trades[0],creditMinor:-1},d=>d.trades[0]={...d.trades[0],creditMinor:100000001},
 d=>d.trades[0]={...d.trades[0],valueMinor:1000},d=>d.trades[0]={...d.trades[0],rateBps:6000},
 d=>d.trades[0]={...d.trades[0],addToVault:true},d=>d.customerId='bad',d=>d.customer.extra=true,
 d=>d.payments=[{method:'Cash',amountMinor:0,tenderedMinor:0,extra:true}],d=>d.payments=[{method:'Unknown',amountMinor:1,tenderedMinor:1}],
 d=>d.items=Array.from({length:51},()=>({description:'Quick',quantity:1,unitMinor:1})),
].entries()){const d=draft();edit(d);add('reject draft '+index,'validateNegotiatedDraft',[d],false);}
for(const creditMinor of [0,1000,1500]){const d=draft();d.trades[0]={...d.trades[0],creditMinor};add('settlement '+creditMinor,'negotiatedDraftRequest',[d,id,true],true);}
const incomplete=draft();incomplete.customer.email='incomplete';incomplete.payments=[{method:'Cash',amountMinor:1,tenderedMinor:1}];
add('incomplete edits may hold','validateNegotiatedDraft',[incomplete],true);add('incomplete edits cannot complete','negotiatedDraftRequest',[incomplete,id,true],false);
const known=draft();known.trades[0]={...known.trades[0],valueMinor:1000,rateBps:6000};
add('reference does not reprice agreement','negotiatedDraftRequest',[known,id,true],true);
const sourceSha256=createHash('sha256').update(fs.readFileSync(new URL('../../apps/web/src/lib/sales/negotiatedDraft.mjs',import.meta.url))).digest('hex');
fs.writeFileSync(new URL('../../test/fixtures/negotiated_draft_web_v1.json',import.meta.url),JSON.stringify({sourceSha256,cases:rows},null,2));console.log(JSON.stringify({cases:rows.length}));
