import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizePortfolioObservationV1 as summary,comparePortfolioObservationsV1 as compare,PORTFOLIO_HISTORY_SCOPE as scope} from '../../backend/vault/portfolio_history_v1.mjs';
import {validatePortfolioRequest,validatePortfolioCapabilities,validatePortfolioSummary,confirmedPortfolioOutcome,validatePortfolioPage,validatePortfolioComparison} from '../../apps/web/src/lib/vault/portfolioHistory.mjs';
import {validatePortfolioJournal,changePortfolioJournal as change} from '../../apps/web/src/lib/vault/portfolioHistoryJournal.mjs';
const id=n=>`00000000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`,ownerId=id(100),request={version:1,requestId:id(101),day:'2026-10-08'};
const point=(later=false)=>({version:1,scope,ownerId,snapshotId:id(later?103:102),sequence:later?'2':'1',capturedAt:later?'2026-10-09T10:00:00.000Z':'2026-10-08T10:00:00.000Z',complete:true,ownedCount:1,copies:[{copyId:id(1),kind:'raw',basisKey:'a'.repeat(64),reference:{amount:later?'1.016':'1.014',currency:'USD',provenanceId:id(2),observedAt:'2026-10-08T09:00:00.000Z',publishedAt:'2026-10-08T09:30:00.000Z'},unpricedReason:null}]});
const captured=()=>({version:1,ownerId,request,status:'captured',pointId:id(102),errorCode:null,recordedAt:'2026-10-08T10:00:00.000Z',summary:summary(point())});
const terminal=(status,errorCode=null)=>({...captured(),status,errorCode,pointId:null,summary:null});
const stage=()=>change(null,{ownerId,expectedLocalRevision:null,nextLocalRevision:id(201),action:'stage',request});
const ack=(journal,outcome)=>change(journal,{ownerId,expectedLocalRevision:journal.localRevision,nextLocalRevision:id(202),action:'acknowledge',request,acknowledgement:outcome});

test('request is exact and copied before caller mutation',()=>{const input={...request},saved=validatePortfolioRequest(input);input.day='2000-01-01';assert.equal(saved.day,request.day);});
for(const value of [null,{}, {...request,ownerId}, {...request,day:'2026-02-30'}, {...request,day:'0000-01-01'}, {...request,day:'2026-1-01'}, {...request,version:2}, {...request,requestId:'other'}]){
 test('invalid capture payload cannot become a different request '+JSON.stringify(value),()=>assert.throws(()=>validatePortfolioRequest(value)));
}
test('capability state preserves disabled recording and the server day',()=>{
 const c={version:1,enabled:false,day:request.day,maximumCopies:20000,cadence:'first_visit_utc_day'};
 assert.deepEqual(validatePortfolioCapabilities(c),c);assert.throws(()=>validatePortfolioCapabilities({...c,maximumCopies:100000}));assert.throws(()=>validatePortfolioCapabilities(null));
});
test('summary projection roundtrips exact strings without client revaluation',()=>{const s=summary(point());assert.deepEqual(validatePortfolioSummary(s),s);assert.equal(s.totals.USD.exact,'1.014');});
for(const [name,mutate]of [
 ['incomplete coverage',v=>v.coverage.owned++],['wrong kind count',v=>v.coverage.byKind.raw.owned++],
 ['unpriced state on priced copies',v=>v.state='unpriced'],['unexplained price count',v=>v.coverage.byCurrency.USD++],
 ['unexplained unpriced reason',v=>v.coverage.byReason.no_qualified_price=1],['extra total currency',v=>v.totals.EUR={exact:'2',display:'2.00'}],
 ['numeric amount',v=>v.totals.USD.exact=1.014],['nonfinite text',v=>v.totals.USD.exact='Infinity'],
 ['zero priced market total',v=>v.totals.USD.exact='0'],['missing display precision',v=>v.totals.USD.display='1.0'],
])test('rejects '+name,()=>{const s=summary(point());mutate(s);assert.throws(()=>validatePortfolioSummary(s));});
test('acknowledgement is bound to owner, request, point and capture day',()=>{
 const a=captured();assert.deepEqual(confirmedPortfolioOutcome(request,a,ownerId),a);
 for(const bad of [{...a,ownerId:id(999)},{...a,request:{...request,requestId:id(999)}},{...a,pointId:id(999)},
  {...a,summary:{...a.summary,capturedAt:'2026-10-09T10:00:00.000Z'}},{...a,internal_error:'database detail'}])assert.throws(()=>confirmedPortfolioOutcome(request,bad,ownerId));
});
test('unknown or missing recovery is not a terminal acknowledgement',()=>{
 for(const value of [null,{}, {...terminal('failed'),errorCode:'unknown_error'}, {...terminal('cancelled'),errorCode:'day_expired'}])assert.throws(()=>ack(stage(),value));
});
for(const outcome of [captured(),{...captured(),status:'reused'},terminal('failed','day_expired'),terminal('failed','pricing_unavailable'),terminal('cancelled')]){
 test('durable terminal '+outcome.status+' '+outcome.errorCode+' clears only the exact pending request',()=>{
  const staged=stage(),next=ack(staged,outcome);assert.equal(next.pending,null);assert.deepEqual(next.lastOutcome,outcome);
  assert.deepEqual(staged.pending,request);assert.equal(staged.lastOutcome,null);
 });
}
test('concurrent local revisions cannot overwrite a pending recording',()=>{
 const staged=stage();assert.throws(()=>change(staged,{ownerId,expectedLocalRevision:null,nextLocalRevision:id(203),action:'stage',request}));
 assert.throws(()=>change(staged,{ownerId,expectedLocalRevision:staged.localRevision,nextLocalRevision:id(203),action:'stage',request:{...request,requestId:id(204)}}));
 assert.throws(()=>change(staged,{ownerId,expectedLocalRevision:staged.localRevision,nextLocalRevision:staged.localRevision,action:'acknowledge',request,acknowledgement:captured()}));
});
test('journal rejects wrong owner, damaged pending and forged terminal evidence',()=>{
 const staged=stage();assert.throws(()=>validatePortfolioJournal(staged,id(500)));
 assert.throws(()=>validatePortfolioJournal({...staged,pending:{}},ownerId));
 assert.throws(()=>validatePortfolioJournal({...staged,lastOutcome:{...captured(),ownerId:id(500)}},ownerId));
 assert.throws(()=>change(staged,{ownerId,expectedLocalRevision:staged.localRevision,nextLocalRevision:id(203),action:'discard'}));
});
test('failed capture day survives process serialization and suppresses accidental daily retries',()=>{
 const saved=ack(stage(),terminal('failed','pricing_unavailable'));const recovered=validatePortfolioJournal(JSON.parse(JSON.stringify(saved)),ownerId);
 assert.equal(recovered.lastOutcome.request.day,request.day);assert.equal(recovered.lastOutcome.status,'failed');assert.equal(recovered.pending,null);
});
test('history page binds owner, order, watermark and exact cursor',()=>{
 const a=summary(point()),b=summary(point(true)),page={version:1,ownerId,watermark:'2',points:[b,a],nextBefore:null};
 assert.deepEqual(validatePortfolioPage(page,ownerId,{limit:2}),page);
 for(const bad of [{...page,ownerId:id(9)},{...page,points:[a,b]},{...page,watermark:'1'},{...page,points:[b,b]},{...page,nextBefore:'2'}])assert.throws(()=>validatePortfolioPage(bad,ownerId,{limit:2}));
 assert.throws(()=>validatePortfolioPage(page,ownerId,{watermark:'1',limit:2}));
});
test('comparison is bound to the selected points and reference meaning',()=>{
 const v=compare(point(),point(true));assert.deepEqual(validatePortfolioComparison(v,id(102),id(103)),v);
 for(const bad of [{...v,isProfit:true},{...v,isCashFlow:true},{...v,meaning:'investment_return'},{...v,counts:{...v.counts,addedCopies:1}},{...v,currencies:{}}])assert.throws(()=>validatePortfolioComparison(bad,id(102),id(103)));
 assert.throws(()=>validatePortfolioComparison(v,id(103),id(102)));
});
