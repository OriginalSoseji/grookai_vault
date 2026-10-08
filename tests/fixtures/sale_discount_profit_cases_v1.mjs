// Fixed examples with independently specified financial outcomes.
import {saleDiscountAllocation} from '../../apps/web/src/lib/sales/saleDiscount.mjs';
const id='a1000000-0000-4000-8000-000000000001',copy='b1000000-0000-4000-8000-000000000001';
const receipt={version:1,id,number:'GV-20300101-A1000000',createdAt:'2030-01-01T12:00:00.000Z',storeName:'Fixture',customerName:'',method:'Cash',note:'',sourceDispositionId:null,
 items:[{description:'Known copy',quantity:1,unitMinor:10000,lineMinor:10000},{description:'Unlinked copies',quantity:2,unitMinor:2500,lineMinor:5000}],subtotalMinor:15000,discountMinor:1500,taxMinor:100,totalMinor:13600};
const snapshot={version:2,receiptId:id,soldAt:receipt.createdAt,salesCurrency:'USD',allocation:saleDiscountAllocation(receipt.items,1500),lines:[
 {index:0,instanceId:copy,quantity:1,salesMinor:'10000',status:'known',cost:{amount:'60.00',currency:'USD',minor:'6000',status:'known'}},
 {index:1,instanceId:null,quantity:2,salesMinor:'5000',status:'unlinked',cost:{amount:null,currency:null,minor:null,status:'missing_amount'}}]};
const mixed={itemSalesMinor:'13500',knownSalesMinor:'9000',unknownSalesMinor:'4500',knownCostMinor:'6000',knownProfitMinor:'3000',knownLines:1,totalLines:2,knownUnits:'1',totalUnits:'3'};
const uncovered={...mixed,knownSalesMinor:'0',unknownSalesMinor:'13500',knownCostMinor:'0',knownProfitMinor:null,knownLines:0,knownUnits:'0'};
function fixture(name,change,want=mixed,reasons=['unlinked']){
 const r=structuredClone(receipt),s=structuredClone(snapshot);change?.(r,s);
 return {name,receipt:r,snapshot:s,want,reasons};
}
export const saleDiscountProfitCases=[
 fixture('mixed known and unlinked net sales'),
 fixture('known zero cost stays covered',(_r,s)=>s.lines[0].cost={amount:'0',currency:'USD',minor:'0',status:'known'},{...mixed,knownCostMinor:'0',knownProfitMinor:'9000'}),
 fixture('foreign cost stays uncovered',(_r,s)=>{s.lines[0].status='foreign_currency';s.lines[0].cost.currency='CAD';},uncovered,['foreign_currency','unlinked']),
 fixture('legacy gross snapshot cannot invent allocation',(_r,s)=>{s.version=1;delete s.allocation;},uncovered,['discount_allocation_missing']),
 fixture('extra allocation on legacy snapshot cannot qualify history',(_r,s)=>s.version=1,uncovered,['discount_allocation_missing']),
 fixture('missing allocation',(_r,s)=>delete s.allocation,uncovered,['snapshot_mismatch']),
 fixture('changed allocation method',(_r,s)=>s.allocation.method='arbitrary',uncovered,['snapshot_mismatch']),
 fixture('changed net sales',(_r,s)=>s.allocation.lines[0].netMinor='9001',uncovered,['snapshot_mismatch']),
 fixture('line order does not realign private costs',(_r,s)=>s.lines.reverse(),uncovered,['snapshot_mismatch']),
 fixture('allocation order must match receipt',(_r,s)=>s.allocation.lines.reverse(),uncovered,['snapshot_mismatch']),
 fixture('unknown snapshot version',(_r,s)=>s.version=3,uncovered,['snapshot_mismatch']),
 fixture('cost amount and minor must agree',(_r,s)=>s.lines[0].cost.minor='6001',uncovered,['snapshot_mismatch']),
 fixture('tax does not increase profit',(r)=>{r.taxMinor=1500;r.totalMinor=15000;}),
 fixture('zero discount version2',(r,s)=>{r.discountMinor=0;r.totalMinor=15100;s.allocation=saleDiscountAllocation(r.items,0);},
  {...mixed,itemSalesMinor:'15000',knownSalesMinor:'10000',unknownSalesMinor:'5000',knownProfitMinor:'4000'}),
 fixture('original version1 remains compatible',(r,s)=>{r.discountMinor=0;r.totalMinor=15100;s.version=1;delete s.allocation;},
  {...mixed,itemSalesMinor:'15000',knownSalesMinor:'10000',unknownSalesMinor:'5000',knownProfitMinor:'4000'}),
 fixture('zero net known line retains its loss',(r,s)=>{
  r.items[0].unitMinor=1;r.items[0].lineMinor=1;r.items[1].quantity=1;r.items[1].unitMinor=100;r.items[1].lineMinor=100;
  r.subtotalMinor=101;r.discountMinor=100;r.taxMinor=0;r.totalMinor=1;s.allocation=saleDiscountAllocation(r.items,100);
  s.lines[0].salesMinor='1';s.lines[0].cost={amount:'0.02',currency:'USD',minor:'2',status:'known'};s.lines[1].quantity=1;s.lines[1].salesMinor='100';
 },{itemSalesMinor:'1',knownSalesMinor:'0',unknownSalesMinor:'1',knownCostMinor:'2',knownProfitMinor:'-2',knownLines:1,totalLines:2,knownUnits:'1',totalUnits:'2'}),
 fixture('full discount retains cost and separate tax',(r,s)=>{r.discountMinor=15000;r.taxMinor=1;r.totalMinor=1;s.allocation=saleDiscountAllocation(r.items,15000);},
  {...mixed,itemSalesMinor:'0',knownSalesMinor:'0',unknownSalesMinor:'0',knownProfitMinor:'-6000'}),
];
