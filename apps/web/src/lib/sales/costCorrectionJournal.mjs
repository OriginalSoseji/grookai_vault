import {validateSaleCostCorrectionRequest,confirmedSaleCostCorrection,sameCostEvidence} from './saleCostCorrections.mjs';
const id=v=>typeof v==='string'&&v.length===36&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
const check=v=>{if(!v)throw Error('Saved cost correction changed or needs review. Its request has been retained.');};
export function validateCostCorrectionJournal(value,ownerId){
 check(id(ownerId));if(value===null)return null;
 check(value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===4&&['version','ownerId','localRevision','pending'].every(k=>Object.hasOwn(value,k)));
 check(value.version===1&&value.ownerId===ownerId&&id(value.localRevision));
 if(value.pending!==null)validateSaleCostCorrectionRequest(value.pending);return JSON.parse(JSON.stringify(value));
}
/** An error or missing read never authorizes discarding an uncertain request. */
export function changeCostCorrectionJournal(current,{ownerId,expectedLocalRevision,nextLocalRevision,action,request,acknowledgement}){
 const old=validateCostCorrectionJournal(current,ownerId);check(expectedLocalRevision===(old?.localRevision??null)&&id(nextLocalRevision)&&nextLocalRevision!==old?.localRevision);
 const next=old??{version:1,ownerId,localRevision:nextLocalRevision,pending:null};next.localRevision=nextLocalRevision;
 if(action==='stage'){check(next.pending===null);next.pending=validateSaleCostCorrectionRequest(request);}
 else if(action==='acknowledge'){
  check(next.pending!==null&&sameCostEvidence(validateSaleCostCorrectionRequest(request),next.pending));
  confirmedSaleCostCorrection(next.pending,acknowledgement,ownerId);next.pending=null;
 }else check(false);
 return validateCostCorrectionJournal(next,ownerId);
}
