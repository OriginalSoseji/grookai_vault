// Strict transport contracts; server authority owns membership, timezone and state checks.
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const maxRevision=9223372036854775807n;
export const eventExpenseCategories=Object.freeze(['booth','travel','lodging','meals','supplies','fees','other']);
const invalid=()=>{throw new Error('Event data needs review. Refresh before trying again.');};
const check=v=>{if(!v)invalid();};
function fields(v,keys){check(v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype);check(Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k)));}
function id(v,nullable=false){if(nullable&&v===null)return;check(typeof v==='string'&&v.length===36&&uuidPattern.test(v));}
function text(v,min,max,multiline=false){check(typeof v==='string'&&Array.from(v).length<=max&&Array.from(v.replace(/^[\s\u0085]+|[\s\u0085]+$/gu,'')).length>=min&&!/[\uD800-\uDFFF]/u.test(v)&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)&&(multiline||!/[\r\n\t\u0085\u2028\u2029]/.test(v)));}
function decimal(v,max){check(typeof v==='string'&&/^(?:0|[1-9][0-9]{0,18})$/.test(v)&&BigInt(v)<=max&&String(BigInt(v))===v);return BigInt(v);}
function date(v){check(typeof v==='string'&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v)&&v.slice(0,4)!=='0000');const d=new Date(v+'T00:00:00.000Z');check(Number.isFinite(+d)&&d.toISOString().slice(0,10)===v);}
function event(v){
 fields(v,['type','eventId','name','startDate','endDate','timeZone','currency','notes']);id(v.eventId);text(v.name,1,120);text(v.notes,0,1000,true);date(v.startDate);date(v.endDate);check(v.startDate<=v.endDate);
 check(typeof v.timeZone==='string'&&v.timeZone.length<=64&&/^[A-Za-z]/.test(v.timeZone)&&!/[^A-Za-z0-9_+./-]/.test(v.timeZone)&&!v.timeZone.includes('..'));check(v.currency==='USD');
}
function expense(v){
 fields(v,['type','eventId','expenseId','category','description','amountMinor','currency','incurredOn',...(v.type==='expense_update'?['reason']:[])]);id(v.eventId);id(v.expenseId);check(eventExpenseCategories.includes(v.category));text(v.description,1,160);decimal(v.amountMinor,999999999999n);check(v.currency==='USD');date(v.incurredOn);if(v.type==='expense_update')text(v.reason,1,240);
}
export function validateEventOperation(v){
 check(v!==null&&typeof v==='object');
 switch(v.type){
  case 'event_create':case 'event_update':event(v);break;
  case 'event_close':case 'event_reopen':fields(v,['type','eventId','reason']);id(v.eventId);text(v.reason,1,240);break;
  case 'expense_create':case 'expense_update':expense(v);break;
  case 'expense_void':fields(v,['type','eventId','expenseId','reason']);id(v.eventId);id(v.expenseId);text(v.reason,1,240);break;
  case 'receipts_assign':{
   fields(v,['type','eventId','receipts']);id(v.eventId,true);check(Array.isArray(v.receipts)&&v.receipts.length>=1&&v.receipts.length<=100);let previous='';
   for(const r of v.receipts){fields(r,['receiptId','previousEventId']);id(r.receiptId);id(r.previousEventId,true);check(r.receiptId>previous&&r.previousEventId!==v.eventId);previous=r.receiptId;}break;
  }
  default:invalid();
 }
 return JSON.parse(JSON.stringify(v));
}
export function validateEventRequest(v){
 fields(v,['version','requestId','expectedRevision','operation']);check(v.version===1);id(v.requestId);decimal(v.expectedRevision,maxRevision);validateEventOperation(v.operation);check(new TextEncoder().encode(JSON.stringify(v)).length<=65536);return JSON.parse(JSON.stringify(v));
}
const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
export function confirmedEventRequest(request,result,ownerId){
 const r=validateEventRequest(request);id(ownerId);fields(result,['version','ownerId','requestId','previousRevision','revision','operation']);check(result.version===1&&result.ownerId===ownerId&&result.requestId===r.requestId&&result.previousRevision===r.expectedRevision);const revision=decimal(result.revision,maxRevision);check(revision===BigInt(r.expectedRevision)+1n);validateEventOperation(result.operation);check(stable(result.operation)===stable(r.operation));return JSON.parse(JSON.stringify(result));
}
export function eventRequestParams(request){return {p_request:validateEventRequest(request)};}
export function eventMoneyInput(value){if(typeof value!=='string'||!/^\d{1,10}(?:\.\d{1,2})?$/.test(value.trim()))return null;const [whole,fraction='']=value.trim().split('.'),minor=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));return minor<=999999999999n?String(minor):null;}
export function eventMoneyText(minor){const value=decimal(minor,999999999999n);return `${value/100n}.${String(value%100n).padStart(2,'0')}`;}

/** Reject stale-account, malformed or internally contradictory private reads. */
export function validateEventState(v,ownerId,selectedId=null){
 id(ownerId);id(selectedId,true);fields(v,['version','ownerId','revision','entryEnabled','receiptAccess','events','selected']);
 check(v.version===1&&v.ownerId===ownerId&&typeof v.entryEnabled==='boolean'&&typeof v.receiptAccess==='boolean'&&(!v.entryEnabled||v.receiptAccess));
 const revision=decimal(v.revision,maxRevision),events=new Map();
 const rowRevision=r=>check(decimal(r,maxRevision)>0n&&BigInt(r)<=revision);
 const stamp=s=>{check(typeof s==='string'&&s.length<=40);const m=s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-](\d{2}):(\d{2}))$/);check(!!m);date(m[1]);check(+m[2]<24&&+m[3]<60&&+m[4]<60&&(m[6]==='Z'||(+m[7]<24&&+m[8]<60))&&Number.isFinite(Date.parse(s)));return BigInt(Date.parse(s))*1000n+BigInt((m[5]??'').padEnd(6,'0').slice(3));};
 const ordered=(rows,key,max)=>{check(Array.isArray(rows)&&rows.length<=max);let prior='';for(const row of rows){const value=key===null?row:row?.[key];id(value);check(value>prior);prior=value;}};
 ordered(v.events,'eventId',500);
 for(const e of v.events){
  fields(e,['eventId','name','startDate','endDate','timeZone','currency','notes','status','stateReason','revision','createdAt','updatedAt']);
  event({type:'event_create',eventId:e.eventId,name:e.name,startDate:e.startDate,endDate:e.endDate,timeZone:e.timeZone,currency:e.currency,notes:e.notes});
  check(e.status==='open'||e.status==='closed');text(e.stateReason,e.status==='closed'?1:0,240);rowRevision(e.revision);check(stamp(e.updatedAt)>=stamp(e.createdAt));events.set(e.eventId,e);
 }
 if(selectedId===null)check(v.selected===null);
 else{
  const s=v.selected,e=events.get(selectedId);check(!!e);fields(s,['eventId','expenses','assignments','candidates','receiptIdentityConflicts','bookRevision']);check(s.eventId===selectedId);
  ordered(s.expenses,'expenseId',1000);
  for(const x of s.expenses){
   fields(x,['expenseId','eventId','category','description','amountMinor','currency','incurredOn','voided','lastReason','revision','createdAt','updatedAt']);
   expense({type:'expense_create',eventId:x.eventId,expenseId:x.expenseId,category:x.category,description:x.description,amountMinor:x.amountMinor,currency:x.currency,incurredOn:x.incurredOn});
   check(x.eventId===selectedId&&typeof x.voided==='boolean');text(x.lastReason,x.voided?1:0,240);rowRevision(x.revision);check(stamp(x.updatedAt)>=stamp(x.createdAt));
  }
  ordered(s.assignments,'receiptId',10000);const assigned=new Map();
  for(const a of s.assignments){fields(a,['receiptId','eventId','revision']);id(a.eventId,true);check(a.eventId===null||events.has(a.eventId));rowRevision(a.revision);assigned.set(a.receiptId,a.eventId);}
  ordered(s.receiptIdentityConflicts,null,10000);const conflicts=new Set(s.receiptIdentityConflicts);
  if(!v.receiptAccess){check(s.candidates===null&&s.bookRevision===null&&conflicts.size===0);}
  else{
   decimal(s.bookRevision,maxRevision);ordered(s.candidates,'receiptId',10000);
   for(const c of s.candidates){fields(c,['receiptId','localDate','previousEventId']);date(c.localDate);id(c.previousEventId,true);check(c.localDate>=e.startDate&&c.localDate<=e.endDate&&!conflicts.has(c.receiptId)&&c.previousEventId===(assigned.get(c.receiptId)??null));}
  }
 }
 check(new TextEncoder().encode(JSON.stringify(v)).length<=10000000);return JSON.parse(JSON.stringify(v));
}

/** Display projection uses canonical outer revisions; raw DB row revisions are not client identities. */
export function validateEventHistory(v,ownerId,eventId,beforeRevision=null,limit=50){
 id(ownerId);id(eventId);check(Number.isInteger(limit)&&limit>=1&&limit<=100);
 let previous=beforeRevision===null?maxRevision+1n:decimal(beforeRevision,maxRevision);
 fields(v,['version','ownerId','eventId','rows','nextRevision']);check(v.version===1&&v.ownerId===ownerId&&v.eventId===eventId&&Array.isArray(v.rows)&&v.rows.length<=limit);
 const requests=new Set(),rows=[];
 for(const row of v.rows){
  fields(row,['requestId','revision','createdAt','operation','before','after']);id(row.requestId);check(!requests.has(row.requestId));requests.add(row.requestId);
  const revision=decimal(row.revision,maxRevision);check(revision>0n&&revision<previous);previous=revision;
  check(typeof row.createdAt==='string'&&row.createdAt.length<=40&&/^\d{4}-\d{2}-\d{2}T/.test(row.createdAt)&&Number.isFinite(Date.parse(row.createdAt)));
  const operation=validateEventOperation(row.operation);check(operation.eventId===eventId||(operation.type==='receipts_assign'&&operation.receipts.some(r=>r.previousEventId===eventId)));
  for(const states of [row.before,row.after]){check(Array.isArray(states)&&states.length<=100);for(const state of states)check(state!==null&&typeof state==='object'&&!Array.isArray(state)&&(!Object.hasOwn(state,'owner_id')||state.owner_id===ownerId));}
  rows.push({requestId:row.requestId,revision:row.revision,createdAt:row.createdAt,operation});
 }
 if(v.nextRevision!==null){decimal(v.nextRevision,maxRevision);check(rows.length===limit&&v.nextRevision===rows.at(-1).revision);}
 check(new TextEncoder().encode(JSON.stringify(v)).length<=10000000);return {version:1,ownerId,eventId,rows,nextRevision:v.nextRevision};
}
