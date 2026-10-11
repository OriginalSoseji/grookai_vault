import {portfolioId,portfolioFields,validatePortfolioRequest,confirmedPortfolioOutcome,samePortfolioRequest} from './portfolioHistory.mjs';
const check=v=>{if(!v)throw Error('Saved collection recording changed. Its request has been retained.');};
export function validatePortfolioJournal(v,ownerId){
 check(portfolioId(ownerId));if(v===null)return null;
 check(portfolioFields(v,['version','ownerId','localRevision','pending','lastOutcome'])&&v.version===1&&v.ownerId===ownerId&&portfolioId(v.localRevision));
 if(v.pending!==null)validatePortfolioRequest(v.pending);
 if(v.lastOutcome!==null)confirmedPortfolioOutcome(v.lastOutcome.request,v.lastOutcome,ownerId);
 return JSON.parse(JSON.stringify(v));
}
export function changePortfolioJournal(current,{ownerId,expectedLocalRevision,nextLocalRevision,action,request,acknowledgement}){
 const old=validatePortfolioJournal(current,ownerId);check(expectedLocalRevision===(old?.localRevision??null)&&portfolioId(nextLocalRevision)&&nextLocalRevision!==old?.localRevision);
 const next=old??{version:1,ownerId,localRevision:nextLocalRevision,pending:null,lastOutcome:null};next.localRevision=nextLocalRevision;
 if(action==='stage'){check(next.pending===null);next.pending=validatePortfolioRequest(request);}
 else if(action==='acknowledge'){
  check(next.pending!==null&&samePortfolioRequest(request,next.pending));next.lastOutcome=confirmedPortfolioOutcome(next.pending,acknowledgement,ownerId);next.pending=null;
 }else check(false);
 return validatePortfolioJournal(next,ownerId);
}
