// Private owner attestations. These values must never enter a customer receipt.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const maxRevision=9223372036854775807n;
const check=v=>{if(!v)throw Error('Historical cost data needs review. Preserve any pending correction.');};
const copy=v=>JSON.parse(JSON.stringify(v));
export const sameCostEvidence=(a,b)=>stable(a)===stable(b);
const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
function fields(v,keys){check(v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k)));}
function id(v,legacy=false){check(typeof v==='string'&&v.length===36&&uuid.test(legacy?v.toLowerCase():v));}
function decimal(v,max){check(typeof v==='string'&&/^(0|[1-9][0-9]{0,18})$/.test(v)&&BigInt(v)<=max);return BigInt(v);}
function receipt(v){check(v!==null&&typeof v==='object'&&!Array.isArray(v)&&v.version===1);id(v.id,true);check(Array.isArray(v.items)&&v.items.length>=1&&v.items.length<=50);}
function stamp(v){
 check(typeof v==='string'&&v.length<=40);const m=v.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-](\d{2}):(\d{2}))$/);
 check(!!m&&m[1].slice(0,4)!=='0000'&&+m[2]<24&&+m[3]<60&&+m[4]<60&&(m[6]==='Z'||(+m[7]<24&&+m[8]<60))&&Number.isFinite(Date.parse(v)));
 const d=new Date(m[1]+'T00:00:00Z');check(Number.isFinite(+d)&&d.toISOString().slice(0,10)===m[1]);
}
export function validateSaleCostCorrectionRequest(v){
 fields(v,['version','requestId','receipt','lineIndex','expectedRevision','action','cost','reason']);check(v.version===1);id(v.requestId);receipt(v.receipt);
 check(Number.isInteger(v.lineIndex)&&v.lineIndex>=0&&v.lineIndex<v.receipt.items.length);decimal(v.expectedRevision,maxRevision-1n);
 check(typeof v.reason==='string'&&Array.from(v.reason).length<=500&&v.reason.replace(/^[\s\u0085]+|[\s\u0085]+$/gu,'').length>0&&!/[\uD800-\uDFFF]/u.test(v.reason)&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v.reason));
 if(v.action==='set'){fields(v.cost,['minor','currency']);decimal(v.cost.minor,999999999999n);check(typeof v.cost.currency==='string'&&/^[A-Z]{3}$/.test(v.cost.currency));}
 else check(v.action==='restore'&&v.cost===null);
 check(new TextEncoder().encode(JSON.stringify(v)).length<=65536);return copy(v);
}
export function validateSaleCostCorrectionOutcome(v,ownerId){
 id(ownerId);fields(v,['version','ownerId','request','status','revision','source','recordedAt']);check(v.version===1&&v.ownerId===ownerId);
 const r=validateSaleCostCorrectionRequest(v.request);stamp(v.recordedAt);
 if(v.status==='applied'){check(['canonical','legacy'].includes(v.source));check(decimal(v.revision,maxRevision)===BigInt(r.expectedRevision)+1n);}
 else check(v.status==='cancelled'&&v.revision===null&&v.source===null);
 return copy(v);
}
export function confirmedSaleCostCorrection(request,outcome,ownerId){
 const r=validateSaleCostCorrectionRequest(request),o=validateSaleCostCorrectionOutcome(outcome,ownerId);check(sameCostEvidence(r,o.request));return o;
}
export function validateSaleCostCorrectionStates(value,ownerId,receiptIds){
 id(ownerId);check(Array.isArray(receiptIds)&&receiptIds.length<=10000);const ids=new Set();
 for(const v of receiptIds){id(v,true);check(!ids.has(v.toLowerCase()));ids.add(v.toLowerCase());}
 check(Array.isArray(value)&&value.length===ids.size);const seen=new Set();
 for(const s of value){
  fields(s,['version','ownerId','receiptId','receipt','source','lines']);id(s.receiptId);check(s.version===1&&s.ownerId===ownerId&&ids.has(s.receiptId)&&!seen.has(s.receiptId));seen.add(s.receiptId);
  if(s.source===null)check(s.receipt===null);else{check(['canonical','legacy'].includes(s.source));receipt(s.receipt);check(s.receipt.id.toLowerCase()===s.receiptId);}
  check(Array.isArray(s.lines)&&s.lines.length<=50);let previous=-1;const requests=new Set();
  for(const raw of s.lines){const o=validateSaleCostCorrectionOutcome(raw,ownerId),r=o.request;check(o.status==='applied'&&r.receipt.id.toLowerCase()===s.receiptId&&r.lineIndex>previous&&!requests.has(r.requestId));previous=r.lineIndex;requests.add(r.requestId);}
 }
 return copy(value);
}
export function validateSaleCostCorrectionHistory(value,ownerId,receiptId,lineIndex,beforeRevision=null){
 id(receiptId,true);check(Number.isInteger(lineIndex)&&lineIndex>=0&&lineIndex<50&&Array.isArray(value)&&value.length<=50);
 let previous=beforeRevision===null?maxRevision+1n:decimal(beforeRevision,maxRevision);const seen=new Set();
 for(const raw of value){const o=validateSaleCostCorrectionOutcome(raw,ownerId),r=o.request;check(o.status==='applied'&&r.receipt.id.toLowerCase()===receiptId.toLowerCase()&&r.lineIndex===lineIndex&&BigInt(o.revision)<previous&&!seen.has(r.requestId));previous=BigInt(o.revision);seen.add(r.requestId);}
 return copy(value);
}
