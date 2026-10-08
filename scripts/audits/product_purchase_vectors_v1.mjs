// Pinned model parity vectors; inspect/regenerate only after semantic changes.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {purchaseOffer,purchaseRequest,validatePurchaseReceipt,confirmedPurchaseReceipt,purchaseCustomerView} from '../../apps/web/src/lib/sales/salesPurchase.mjs';
const id=n=>`11111111-1111-4111-8111-${String(n).padStart(12,'0')}`;
const line=(patch={})=>({description:'Sample card',quantity:1,unitMinor:650,referenceMinor:1000,rateBps:6500,cardId:id(1),printingId:id(2),condition:'NM',addToVault:true,...patch});
const input=(patch={})=>({storeName:'Sample shop',items:[line()],payments:[{method:'Cash',amountMinor:650,tenderedMinor:650}],note:'Private note',customerId:null,customer:{name:'Sample seller',email:'seller@example.test',phone:'',wants:'',notes:'Private contact'},confirmed:true,...patch});
const request=purchaseRequest(input(),id(9));
const receipt={version:2,kind:'purchase',id:id(9),number:'GVB-20261007-11111111',createdAt:'2026-10-07T12:00:00.000Z',storeName:'Sample shop',customerName:'Sample seller',currency:'USD',
 items:[{...line(),lineMinor:650,printingGvId:'governed_printing:001',instanceId:id(100),gvviId:'GVVI-PURCHASE-1'}],purchaseMinor:650,method:'Cash',payments:{version:1,balanceMinor:-650,entries:[{method:'Cash',amountMinor:650,tenderedMinor:650}],changeMinor:0},note:'Private note'};
const calls={offer:purchaseOffer,request:purchaseRequest,receipt:validatePurchaseReceipt,confirm:confirmedPurchaseReceipt,public:purchaseCustomerView};
const cases=[];
function add(name,action,args){let expected;try{expected={ok:true,value:calls[action](...args)};}catch{expected={ok:false};}cases.push({name,action,args,expected});}
for(const [reference,rate]of [[1,4999],[1,5000],[999,6500],[100000000,10000],[0,1],[1,0],[1,10001],[1.5,6500],['1',5000]])add(`offer ${reference}/${rate}`,'offer',[reference,rate]);
add('canonical request','request',[input(),id(9)]);
add('manual price override','request',[input({items:[line({unitMinor:700})],payments:[{method:'Cash',amountMinor:700,tenderedMinor:700}]}),id(9)]);
add('zero plus paid item','request',[input({items:[line({unitMinor:0}),line()]}),id(9)]);
add('unconfirmed','request',[input({confirmed:false}),id(9)]);
add('unknown field','request',[{...input(),ownerId:id(8)},id(9)]);
add('no incoming items','request',[input({items:[]}),id(9)]);
add('all free intake','request',[input({items:[line({unitMinor:0})],payments:[]}),id(9)]);
for(const [name,patch]of Object.entries({negative:{unitMinor:-1},fraction:{unitMinor:1.5},quantity:{quantity:2},missingRate:{rateBps:null},badPrinting:{printingId:'invented'},badCondition:{condition:'Mint'},quickCreates:{cardId:null,printingId:null,condition:null},quick:{cardId:null,printingId:null,condition:null,addToVault:false},canonicalOptOut:{addToVault:false}}))add(name,'request',[input({items:[line(patch)]}),id(9)]);
for(const method of ['Cash','Card (external terminal)','Bank / payment app','Other','Store credit'])add('payout '+method,'request',[input({payments:[{method,amountMinor:650,tenderedMinor:650}]}),id(9)]);
add('payout cash change','request',[input({payments:[{method:'Cash',amountMinor:650,tenderedMinor:700}]}),id(9)]);
add('split payout','request',[input({payments:[{method:'Cash',amountMinor:250,tenderedMinor:250},{method:'Other',amountMinor:400,tenderedMinor:400}]}),id(9)]);
add('exact receipt','receipt',[receipt]);
add('receipt sub-millisecond timestamp','receipt',[{...receipt,createdAt:'2026-10-07T12:00:00.000123Z'}]);
const mixedRequest=structuredClone(request),mixedReceipt=structuredClone(receipt);mixedRequest.id='ABCDEF12-ABCD-4ABC-8ABC-ABCDEF123456';mixedReceipt.id=mixedRequest.id.toLowerCase();mixedReceipt.number='GVB-20261007-ABCDEF12';
add('mixed-case acknowledgement','confirm',[mixedReceipt,mixedRequest]);add('private projection','public',[receipt]);
for(const [name,mutate]of Object.entries({oldVersion:r=>r.version=1,saleKind:r=>r.kind='sale',currency:r=>r.currency='CAD',date:r=>r.createdAt='2026-02-30T12:00:00.000Z',total:r=>r.purchaseMinor++,line:r=>r.items[0].lineMinor++,payout:r=>r.payments.balanceMinor=650,change:r=>r.payments.changeMinor=1,copy:r=>r.items[0].instanceId=null,unexpected:r=>r.totalMinor=650})){
 const row=structuredClone(receipt);mutate(row);add('receipt '+name,'receipt',[row]);
}
for(const [name,mutate]of Object.entries({printing:r=>r.items[0].printingId=id(3),rate:r=>r.items[0].rateBps=7000,note:r=>r.note='Different note',seller:r=>r.customerName='Different seller',canonicalName:r=>r.items[0].description='Current governed name'})){
 const row=structuredClone(receipt);mutate(row);add('acknowledgement '+name,'confirm',[row,request]);
}
const model='apps/web/src/lib/sales/salesPurchase.mjs';
fs.writeFileSync('test/fixtures/sales_purchase_web_v1.json',JSON.stringify({model,sha256:createHash('sha256').update(fs.readFileSync(model)).digest('hex'),cases},null,2)+'\n');
console.log(JSON.stringify({cases:cases.length,success:cases.filter(c=>c.expected.ok).length,failure:cases.filter(c=>!c.expected.ok).length}));
