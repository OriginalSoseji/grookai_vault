// Cross-platform compatibility vectors for the already-qualified web model.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {salesProfit,profitMoney} from '../../apps/web/src/lib/sales/salesProfit.mjs';
const source='apps/web/src/lib/sales/salesProfit.mjs';
const sourceSha256=createHash('sha256').update(fs.readFileSync(source)).digest('hex');
assert.equal(sourceSha256,'0ed58f1d986cc5f1fe6ea41c7cb68bed01cb2ccd9e15eaec7502f9fd9a69e498');
assert.ok(process.argv.length===2 || (process.argv.length===3 && process.argv[2]==='--write'));
const id='11111111-1111-4111-8111-111111111111',copy='22222222-2222-4222-8222-222222222222';
const receipt=()=>({id,createdAt:'2026-10-07T12:00:00Z',items:[{quantity:1,unitMinor:2000}],subtotalMinor:2000,discountMinor:0,taxMinor:100,totalMinor:2100});
const snapshot=()=>({version:1,receiptId:id,soldAt:'2026-10-07T12:00:00Z',salesCurrency:'USD',lines:[{index:0,instanceId:copy,quantity:1,salesMinor:'2000',status:'known',cost:{amount:'12.00',currency:'USD',minor:'1200',status:'known'}}]});
const cases=[];
function add(name,receipts=[receipt()],snapshots=[snapshot()]){
 let expected,error=false;try{expected=salesProfit(receipts,snapshots);}catch{error=true;}
 cases.push({name,receipts,snapshots,...(error?{error:true}:{expected})});
}
add('known cost excludes tax');add('empty',[],[]);add('missing snapshot',[receipt()],[]);
for(const [name,cost]of [['zero',{amount:'0.00',minor:'0'}],['loss',{amount:'25.00',minor:'2500'}],['trailing decimal zero',{amount:'12.0000',minor:'1200'}],['foreign',{currency:'CAD'}]]){
 const s=snapshot();Object.assign(s.lines[0].cost,cost);if(name==='foreign')s.lines[0].status='foreign_currency';add(name,[receipt()],[s]);
}
for(const status of ['missing_amount','missing_currency','invalid_amount','invalid_currency','oversized_legacy_value']){
 const s=snapshot();s.lines[0].status=status;Object.assign(s.lines[0].cost,{status,minor:null});add(status,[receipt()],[s]);
}
const unlinked=(index,quantity,salesMinor)=>({index,instanceId:null,quantity,salesMinor,status:'unlinked',cost:{status:'missing_amount',amount:null,currency:null,minor:null}});
const mixed=receipt();mixed.items.push({quantity:2,unitMinor:500});mixed.subtotalMinor=3000;mixed.totalMinor=3100;
const mixedSnapshot=snapshot();mixedSnapshot.lines.push(unlinked(1,2,'1000'));add('mixed quantities and coverage',[mixed],[mixedSnapshot]);
const discounted={...mixed,discountMinor:100,totalMinor:3000};add('discount remains uncovered',[discounted],[mixedSnapshot]);
for(const [name,change]of [
 ['wrong sale time',s=>s.soldAt='2026-10-08T12:00:00Z'],['wrong sales currency',s=>s.salesCurrency='CAD'],
 ['wrong version',s=>s.version=2],['wrong line index',s=>s.lines[0].index=1],['wrong quantity',s=>s.lines[0].quantity=2],
 ['wrong sales',s=>s.lines[0].salesMinor='1999'],['fractional cents',s=>s.lines[0].cost.amount='12.001'],
 ['cost mismatch',s=>s.lines[0].cost.minor='1'],['currency mismatch',s=>s.lines[0].cost.currency='CAD'],
 ['false unlinked',s=>s.lines[0].instanceId=null],['missing cost object',s=>s.lines[0].cost=null],
 ['missing lines',s=>s.lines=[]],['oversized amount',s=>s.lines[0].cost.amount='0'.repeat(1501)],
 ]){const s=snapshot();change(s);add(name,[receipt()],[s]);}
add('identical duplicates',[receipt(),receipt()],[snapshot(),snapshot()]);
add('conflicting receipts',[receipt(),{...receipt(),totalMinor:999}],[snapshot()]);
const conflict=snapshot();conflict.lines[0].cost.amount='99';add('conflicting snapshots',[receipt()],[snapshot(),conflict]);
for(const [name,change]of [['invalid date',r=>r.createdAt='bad'],['subtotal mismatch',r=>r.subtotalMinor=1],['total mismatch',r=>r.totalMinor=1],['discount exceeds sale',r=>r.discountMinor=3000],['negative unit price',r=>r.items[0].unitMinor=-1],['zero quantity',r=>r.items[0].quantity=0],['unsafe integer',r=>r.items[0].unitMinor=9007199254740992]]){
 const r=receipt();change(r);add(name,[r]);
}
const large={...receipt(),items:[{quantity:1,unitMinor:9007199254740991}],subtotalMinor:9007199254740991,taxMinor:0,totalMinor:9007199254740991};
add('aggregate exceeds safe double',[large,{...large,id:'second'}],[]);
const split={...receipt(),method:'Split payment',tradeIn:{totalCreditMinor:3000,balanceMinor:-900},payments:{balanceMinor:-900,entries:[{method:'Cash',amountMinor:900,tenderedMinor:900}]}};
add('trade and split do not change profit',[split]);
const duplicate=receipt();duplicate.items.push({...duplicate.items[0]});duplicate.subtotalMinor=4000;duplicate.totalMinor=4100;
const duplicates=snapshot();duplicates.lines.push({...duplicates.lines[0],index:1});add('same physical copy twice',[duplicate],[duplicates]);
const data={version:1,sourceSha256,cases,money:['0','-1','2000','18014398509481982','-999999999999999999999'].map(minor=>({minor,formatted:profitMoney(minor)}))};
const file='test/fixtures/sales_profit_web_v1.json',text=JSON.stringify(data,null,2)+'\n';
if(process.argv[2]==='--write'){fs.mkdirSync('test/fixtures',{recursive:true});fs.writeFileSync(file,text);}else assert.equal(fs.readFileSync(file,'utf8'),text,'Review model compatibility before regenerating');
console.log(JSON.stringify({cases:cases.length,formatting:data.money.length,sourceSha256}));
