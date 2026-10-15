import {validateEventRequest,confirmedEventRequest} from './vendorEvents.mjs';
const id=v=>typeof v==='string'&&v.length===36&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
const check=v=>{if(!v)throw Error('Saved event edit changed or needs review. Its request has been retained.');};
const copy=v=>JSON.parse(JSON.stringify(v));
const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const refusals=['PT409','22023','42501'];
export function validateEventJournal(value,ownerId){
 check(id(ownerId));if(value===null)return null;
 check(value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===5&&['version','ownerId','localRevision','pending','rejection'].every(k=>Object.hasOwn(value,k)));
 check(value.version===1&&value.ownerId===ownerId&&id(value.localRevision));
 if(value.pending!==null)validateEventRequest(value.pending);
 check(value.rejection===null||(value.pending!==null&&refusals.includes(value.rejection)));return copy(value);
}
/** Pure transition; the device store must compare and commit inside one transaction. */
export function changeEventJournal(current,{ownerId,expectedLocalRevision,nextLocalRevision,action,request,acknowledgement,code}){
 const old=validateEventJournal(current,ownerId);check(expectedLocalRevision===(old?.localRevision??null)&&id(nextLocalRevision)&&nextLocalRevision!==old?.localRevision);
 const next=old??{version:1,ownerId,localRevision:nextLocalRevision,pending:null,rejection:null};next.localRevision=nextLocalRevision;
 if(action==='stage'){check(next.pending===null);next.pending=validateEventRequest(request);next.rejection=null;}
 else if(action==='acknowledge'||action==='reject'){
  check(next.pending!==null&&stable(validateEventRequest(request))===stable(next.pending));
  if(action==='acknowledge'){confirmedEventRequest(next.pending,acknowledgement,ownerId);next.pending=null;next.rejection=null;}
  else{check(refusals.includes(code));next.rejection=code;}
 }else if(action==='discardRejected'){check(next.pending!==null&&next.rejection!==null);next.pending=null;next.rejection=null;}
 else check(false);
 return validateEventJournal(next,ownerId);
}
