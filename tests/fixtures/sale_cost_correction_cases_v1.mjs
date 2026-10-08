import {saleDiscountProfitCases} from './sale_discount_profit_cases_v1.mjs';
export const correctionOwner='d1000000-0000-4000-8000-000000000001';
const original=saleDiscountProfitCases[0];
export function correctionFixture() {
 const receipt=structuredClone(original.receipt),snapshot=structuredClone(original.snapshot);
 const request={version:1,requestId:'c1000000-0000-4000-8000-000000000001',receipt:structuredClone(receipt),lineIndex:1,expectedRevision:'0',action:'set',cost:{minor:'2000',currency:'USD'},reason:'Found the original purchase invoice.'};
 const outcome={version:1,ownerId:correctionOwner,request,status:'applied',revision:'1',source:'canonical',recordedAt:'2030-01-02T14:35:00.123456+00:00'};
 return {receipt,snapshot,outcome,state:{version:1,ownerId:correctionOwner,receiptId:receipt.id,receipt:structuredClone(receipt),source:'canonical',lines:[outcome]}};
}
const fullyKnown={knownProfitMinor:'5500',knownCostMinor:'8000',knownSalesMinor:'13500',unknownSalesMinor:'0',knownLines:2,knownUnits:'3',attestedLines:1,restoredLines:0};
function profit(name,change,want=fullyKnown,reasons=[]) { const f=correctionFixture();change?.(f);return {name,...f,want,reasons}; }
function undiscounted(f) { f.receipt.discountMinor=0;f.receipt.totalMinor=15100;f.state.receipt=structuredClone(f.receipt);f.outcome.request.receipt=structuredClone(f.receipt);f.snapshot=null;f.state.source='legacy';f.outcome.source='legacy'; }
export const correctionProfitCases=[
 profit('full-line two-copy attestation uses net allocated revenue'),
 profit('known zero supplies full-line cost',f=>f.outcome.request.cost.minor='0',{...fullyKnown,knownCostMinor:'6000',knownProfitMinor:'7500'}),
 profit('foreign currency replaces prior coverage truthfully',f=>f.outcome.request.cost.currency='CAD',{...fullyKnown,knownProfitMinor:'3000',knownCostMinor:'6000',knownSalesMinor:'9000',unknownSalesMinor:'4500',knownLines:1,knownUnits:'1'},['foreign_currency']),
 profit('restore keeps original unlinked gap',f=>{f.outcome.request.action='restore';f.outcome.request.cost=null;},{...fullyKnown,knownProfitMinor:'3000',knownCostMinor:'6000',knownSalesMinor:'9000',unknownSalesMinor:'4500',knownLines:1,knownUnits:'1',attestedLines:0,restoredLines:1},['unlinked']),
 profit('correct previously known line',f=>f.outcome.request.lineIndex=0,{...fullyKnown,knownProfitMinor:'7000',knownCostMinor:'2000',knownSalesMinor:'9000',unknownSalesMinor:'4500',knownLines:1,knownUnits:'1'},['unlinked']),
 profit('manual history without snapshot accepts exact full-line attestation',undiscounted,{...fullyKnown,knownProfitMinor:'3000',knownCostMinor:'2000',knownSalesMinor:'5000',unknownSalesMinor:'10000',knownLines:1,knownUnits:'2'},['missing_snapshot']),
 profit('manual restore without snapshot stays unknown',f=>{undiscounted(f);f.outcome.request.action='restore';f.outcome.request.cost=null;},{...fullyKnown,knownProfitMinor:null,knownCostMinor:'0',knownSalesMinor:'0',unknownSalesMinor:'15000',knownLines:0,knownUnits:'0',attestedLines:0,restoredLines:1},['missing_snapshot']),
 ...[
  ['old discount cannot acquire invented allocation',f=>{f.snapshot.version=1;delete f.snapshot.allocation;},'discount_allocation_missing'],
  ['missing discounted snapshot cannot acquire invented allocation',f=>f.snapshot=null,'missing_snapshot'],
  ['inconsistent snapshot remains review required',f=>f.snapshot.lines[0].cost.minor='6001','snapshot_mismatch'],
  ['changed saved receipt cannot inherit correction',f=>f.state.receipt.note='changed','correction_receipt_mismatch'],
  ['changed reviewed line cannot inherit correction',f=>f.outcome.request.receipt.items[1].description='another item','correction_receipt_mismatch'],
  ['changed authority source cannot inherit correction',f=>f.state.source='legacy','correction_receipt_mismatch'],
  ['unavailable or ambiguous authority excludes corrected basis',f=>{f.state.source=null;f.state.receipt=null;},'correction_receipt_mismatch'],
 ].map(([name,change,reason])=>profit(name,change,{...fullyKnown,knownProfitMinor:null,knownCostMinor:'0',knownSalesMinor:'0',unknownSalesMinor:'13500',knownLines:0,knownUnits:'0',attestedLines:0},[reason])),
];
const badRequest=[
 ['missing reason',r=>delete r.reason],['blank reason',r=>r.reason='\u0085 \n'],['control reason',r=>r.reason='bad\u0000'],['unpaired surrogate',r=>r.reason='\ud800'],['oversize reason',r=>r.reason='x'.repeat(501)],
 ['extra field',r=>r.extra=true],['purchase',r=>r.receipt.version=2],['invalid receipt id',r=>r.receipt.id='other'],['empty lines',r=>r.receipt.items=[]],['negative line',r=>r.lineIndex=-1],['missing line',r=>r.lineIndex=2],['fractional line',r=>r.lineIndex=.5],
 ['uppercase request id',r=>r.requestId=r.requestId.toUpperCase()],['leading zero revision',r=>r.expectedRevision='00'],['negative revision',r=>r.expectedRevision='-1'],['numeric revision',r=>r.expectedRevision=0],['revision overflow',r=>r.expectedRevision='9223372036854775807'],
 ['negative cost',r=>r.cost.minor='-1'],['fractional cost',r=>r.cost.minor='1.0'],['leading zero cost',r=>r.cost.minor='01'],['numeric cost',r=>r.cost.minor=1],['oversize cost',r=>r.cost.minor='1000000000000'],['lowercase currency',r=>r.cost.currency='usd'],['extra cost',r=>r.cost.amount='20'],['set without cost',r=>r.cost=null],['restore with cost',r=>r.action='restore'],['unknown action',r=>r.action='delete'],
];
export const correctionRequestCases=[
 ...[['normal',()=>{}],['zero',r=>r.cost.minor='0'],['foreign',r=>r.cost.currency='CAD'],['legacy uppercase receipt',r=>r.receipt.id=r.receipt.id.toUpperCase()],['maximum cost',r=>r.cost.minor='999999999999'],['maximum prior revision',r=>r.expectedRevision='9223372036854775806'],['multiline unicode reason',r=>r.reason='Invoice 😀\nSecond line'],['restore',r=>{r.action='restore';r.cost=null;}]].map(([name,change])=>{const r=correctionFixture().outcome.request;change(r);return {name,request:r,valid:true};}),
 ...badRequest.map(([name,change])=>{const r=correctionFixture().outcome.request;change(r);return {name,request:r,valid:false};}),
];
