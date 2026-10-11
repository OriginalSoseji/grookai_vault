import {input,id} from './event_report_cases_v1.mjs';
export function correctedEventInput(){
 const a=input();a.costBasis='owner_corrected';
 a.correctionStates=a.receipts.map((receipt,i)=>({version:1,ownerId:a.ownerId,receiptId:receipt.id,receipt:structuredClone(receipt),source:'legacy',lines:[{version:1,ownerId:a.ownerId,status:'applied',revision:'1',source:'legacy',recordedAt:'2026-10-08T14:00:00Z',request:{version:1,requestId:id(800+i),receipt:structuredClone(receipt),lineIndex:0,expectedRevision:'0',action:'set',cost:{minor:i?'2000':'5500',currency:'USD'},reason:'Matched the purchase invoice.'}}]}));
 return a;
}
export const cases=[];
function add(name,change,expected,valid=true){const args=correctedEventInput();change(args);cases.push({name,args,expected,valid});}
const full={salesMinor:'15000',operatingExpenseMinor:'1000',knownCostEventSubtotalMinor:'6500',profit:{knownCostMinor:'7500',knownProfitMinor:'7500',unknownSalesMinor:'0',attestedLines:2}};
add('both whole-line corrections reconcile',()=>{},full);
add('filter keeps every active expense',a=>a.query='Card 2',{salesMinor:'5000',operatingExpenseMinor:'1000',knownCostEventSubtotalMinor:'2000',profit:{knownCostMinor:'2000',knownProfitMinor:'3000',unknownSalesMinor:'0',attestedLines:1}});
add('restore preserves original missing evidence',a=>{const r=a.correctionStates[1].lines[0].request;r.action='restore';r.cost=null;},{knownCostEventSubtotalMinor:'3500',profit:{knownCostMinor:'5500',knownProfitMinor:'4500',unknownSalesMinor:'5000',attestedLines:1,restoredLines:1}});
add('foreign corrected costs stay uncovered',a=>a.correctionStates[1].lines[0].request.cost.currency='CAD',{knownCostEventSubtotalMinor:'3500',profit:{knownCostMinor:'5500',knownProfitMinor:'4500',unknownSalesMinor:'5000'}});
add('zero whole-line cost is known',a=>a.correctionStates[1].lines[0].request.cost.minor='0',{knownCostEventSubtotalMinor:'8500',profit:{knownCostMinor:'5500',knownProfitMinor:'9500',unknownSalesMinor:'0'}});
add('empty filter does not invent contribution',a=>a.query='absent',{salesMinor:'0',operatingExpenseMinor:'1000',knownCostEventSubtotalMinor:null});
add('original basis ignores later costs',a=>a.costBasis='original',{knownCostEventSubtotalMinor:'3000',profit:{knownCostMinor:'6000',knownProfitMinor:'4000',unknownSalesMinor:'5000'}});
for(const [name,change] of [
 ['missing state even outside visible filter',a=>{a.query='Card 1';a.correctionStates.pop();}],
 ['foreign private state',a=>a.correctionStates[0].ownerId=id(900)],
 ['duplicate private state',a=>a.correctionStates.push(structuredClone(a.correctionStates[0]))],
 ['unknown basis',a=>a.costBasis='current_inventory'],
])add(name,change,null,false);
