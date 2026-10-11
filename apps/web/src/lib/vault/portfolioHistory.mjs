// Validate private server projections. Never price current holdings in this client.
const check=v=>{if(!v)throw Error('Collection history could not be verified. Keep any pending recording request.');};
export const portfolioId=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
export const portfolioFields=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const clone=v=>JSON.parse(JSON.stringify(v));
export function portfolioSequence(v,zero=false){return typeof v==='string'&&(zero?/^(0|[1-9][0-9]{0,18})$/:/^[1-9][0-9]{0,18}$/).test(v)&&BigInt(v)<=9223372036854775807n;}
function day(v){check(typeof v==='string'&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v)&&!v.startsWith('0000'));const d=new Date(v+'T00:00:00.000Z');check(Number.isFinite(+d)&&d.toISOString().slice(0,10)===v);}
function stamp(v){check(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v));const d=new Date(v);check(Number.isFinite(+d)&&d.toISOString()===v);day(v.slice(0,10));}
const count=v=>Number.isInteger(v)&&v>=0&&v<=20000;
const exact=(v,signed=false)=>typeof v==='string'&&v.length<=1032&&(signed?/^-?(0|[1-9][0-9]*)(\.[0-9]*[1-9])?$/:/^(0|[1-9][0-9]*)(\.[0-9]*[1-9])?$/).test(v)&&v!=='-0';
const display=(v,signed=false)=>typeof v==='string'&&v.length<=1035&&(signed?/^-?(0|[1-9][0-9]*)\.[0-9]{2}$/:/^(0|[1-9][0-9]*)\.[0-9]{2}$/).test(v)&&v!=='-0.00';
const keysEqual=(a,b)=>Object.keys(a).sort().join('|')===Object.keys(b).sort().join('|');
export function validatePortfolioRequest(v){
 check(portfolioFields(v,['version','requestId','day'])&&v.version===1&&portfolioId(v.requestId));day(v.day);return clone(v);
}
export function samePortfolioRequest(a,b){const x=validatePortfolioRequest(a),y=validatePortfolioRequest(b);return x.version===y.version&&x.requestId===y.requestId&&x.day===y.day;}
export function validatePortfolioCapabilities(v){
 check(portfolioFields(v,['version','enabled','day','maximumCopies','cadence'])&&v.version===1&&typeof v.enabled==='boolean'&&v.maximumCopies===20000&&v.cadence==='first_visit_utc_day');day(v.day);return clone(v);
}
export function validatePortfolioSummary(v){
 check(portfolioFields(v,['snapshotId','sequence','capturedAt','state','coverage','totals'])&&portfolioId(v.snapshotId)&&portfolioSequence(v.sequence));stamp(v.capturedAt);
 const c=v.coverage;check(portfolioFields(c,['owned','priced','unpriced','byKind','byReason','byCurrency'])&&count(c.owned)&&count(c.priced)&&count(c.unpriced)&&c.priced+c.unpriced===c.owned);
 check(portfolioFields(c.byKind,['raw','slab','sealed']));let owned=0,priced=0,unpriced=0;
 for(const k of Object.values(c.byKind)){check(portfolioFields(k,['owned','priced','unpriced'])&&count(k.owned)&&count(k.priced)&&count(k.unpriced)&&k.priced+k.unpriced===k.owned);owned+=k.owned;priced+=k.priced;unpriced+=k.unpriced;}
 check(owned===c.owned&&priced===c.priced&&unpriced===c.unpriced&&c.byKind.slab.priced===0);
 const reasons=['no_qualified_price','unsupported_slab','ineligible_seal_state','ineligible_package_condition','identity_unresolved','unsupported_currency','invalid_reference'];
 check(object(c.byReason)&&Object.entries(c.byReason).every(([k,n])=>reasons.includes(k)&&count(n)&&n>0)&&Object.values(c.byReason).reduce((a,b)=>a+b,0)===c.unpriced);
 check(object(c.byCurrency)&&Object.entries(c.byCurrency).every(([k,n])=>/^[A-Z]{3}$/.test(k)&&count(n)&&n>0)&&Object.values(c.byCurrency).reduce((a,b)=>a+b,0)===c.priced);
 check(v.state===(c.owned===0?'empty':c.priced===0?'unpriced':c.priced===c.owned?'priced':'partially_priced'));
 check(object(v.totals)&&keysEqual(v.totals,c.byCurrency));
 for(const t of Object.values(v.totals))check(portfolioFields(t,['exact','display'])&&exact(t.exact)&&t.exact!=='0'&&display(t.display));
 return clone(v);
}
export function confirmedPortfolioOutcome(request,v,ownerId){
 check(portfolioId(ownerId)&&portfolioFields(v,['version','ownerId','request','status','pointId','errorCode','recordedAt','summary'])&&v.version===1&&v.ownerId===ownerId&&samePortfolioRequest(request,v.request));stamp(v.recordedAt);
 if(['captured','reused'].includes(v.status)){
  check(portfolioId(v.pointId)&&v.errorCode===null);validatePortfolioSummary(v.summary);check(v.summary.snapshotId===v.pointId&&v.summary.capturedAt.slice(0,10)===request.day);
 }else{
  check(v.pointId===null&&v.summary===null);
  if(v.status==='cancelled')check(v.errorCode===null);
  else check(v.status==='failed'&&['day_expired','capacity_reached','too_many_copies','observation_too_large','pricing_unavailable','invalid_reference','clock_changed','capture_failed'].includes(v.errorCode));
 }
 return clone(v);
}
export function validatePortfolioPage(v,ownerId,{before=null,watermark=null,limit=30}={}){
 check(portfolioId(ownerId)&&portfolioFields(v,['version','ownerId','watermark','points','nextBefore'])&&v.version===1&&v.ownerId===ownerId&&portfolioSequence(v.watermark,true));
 check(watermark===null||v.watermark===watermark);check(before===null||portfolioSequence(before));
 check(Array.isArray(v.points)&&v.points.length<=limit&&Number.isInteger(limit)&&limit>=1&&limit<=100);
 let prior=before===null?null:BigInt(before),priorTime=null;const ids=new Set();
 for(const raw of v.points){const p=validatePortfolioSummary(raw);check(BigInt(p.sequence)<=BigInt(v.watermark)&&(prior===null||BigInt(p.sequence)<prior)&&!ids.has(p.snapshotId));
  check(priorTime===null||p.capturedAt<=priorTime);prior=BigInt(p.sequence);priorTime=p.capturedAt;ids.add(p.snapshotId);}
 check(v.nextBefore===null||(v.points.length===limit&&v.nextBefore===v.points.at(-1).sequence));return clone(v);
}
const deltaKeys=['marketMovement','addedCopies','removedCopies','newPriceCoverage','lostPriceCoverage','basisChanges'];
export function validatePortfolioComparison(v,beforeId,afterId){
 check(portfolioFields(v,['version','scope','before','after','counts','currencies','meaning','isProfit','isCashFlow'])&&v.version===1&&v.scope==='all_active_owned_copies'&&v.meaning==='reference_value_change'&&v.isProfit===false&&v.isCashFlow===false);
 validatePortfolioSummary(v.before);validatePortfolioSummary(v.after);
 check(v.before.snapshotId===beforeId&&v.after.snapshotId===afterId&&beforeId!==afterId&&BigInt(v.before.sequence)<BigInt(v.after.sequence)&&v.before.capturedAt<=v.after.capturedAt);
 const c=v.counts;check(portfolioFields(c,['addedCopies','removedCopies','basisChangedCopies','newlyPricedCopies','lostPricedCopies','comparablePricedCopies','unchangedUnpricedCopies'])&&Object.values(c).every(count));
 check(v.after.coverage.owned===v.before.coverage.owned+c.addedCopies-c.removedCopies);
 check(c.basisChangedCopies+c.newlyPricedCopies+c.lostPricedCopies+c.comparablePricedCopies+c.unchangedUnpricedCopies===v.before.coverage.owned-c.removedCopies);
 check(object(v.currencies)&&keysEqual(v.currencies,{...v.before.totals,...v.after.totals}));
 for(const [currency,d] of Object.entries(v.currencies)){
  check(portfolioFields(d,['before','after','difference','components','display'])&&exact(d.before)&&exact(d.after)&&exact(d.difference,true));
  check(d.before===(v.before.totals[currency]?.exact??'0')&&d.after===(v.after.totals[currency]?.exact??'0'));
  check(portfolioFields(d.components,deltaKeys)&&Object.values(d.components).every(x=>exact(x,true)));
  check(portfolioFields(d.display,['scale','before','after','difference','components','roundingAdjustment'])&&d.display.scale===2&&display(d.display.before)&&display(d.display.after)&&display(d.display.difference,true)&&display(d.display.roundingAdjustment,true));
  check(d.display.before===(v.before.totals[currency]?.display??'0.00')&&d.display.after===(v.after.totals[currency]?.display??'0.00'));
  check(portfolioFields(d.display.components,deltaKeys)&&Object.values(d.display.components).every(x=>display(x,true)));
 }
 return clone(v);
}
