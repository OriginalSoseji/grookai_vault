import {validatePortfolioSummary} from './portfolioHistory.mjs';
/** Display geometry only. Exact recorded totals remain the authority and tooltip. */
export function portfolioTimeline(points,currency){
 if(!Array.isArray(points)||points.length>20000||!(/^[A-Z]{3}$/).test(currency))throw Error('Invalid history timeline.');
 const sorted=points.map(validatePortfolioSummary).sort((a,b)=>BigInt(a.sequence)<BigInt(b.sequence)?-1:1);
 const ids=new Set();let previous=null;
 for(const point of sorted){if(ids.has(point.snapshotId)||(previous!==null&&(BigInt(previous.sequence)>=BigInt(point.sequence)||previous.capturedAt>point.capturedAt)))throw Error('Invalid history ordering.');ids.add(point.snapshotId);previous=point;}
 const values=sorted.map(point=>point.totals[currency]?.exact??null),present=values.filter(v=>v!==null);
 const scale=Math.max(0,...present.map(v=>v.split('.')[1]?.length??0));
 const integer=v=>{const [whole,fraction='']=v.split('.');return BigInt(whole+fraction.padEnd(scale,'0'));};
 const exactValues=present.map(integer);let min=null,max=null;
 for(const v of exactValues){if(min===null||v<min)min=v;if(max===null||v>max)max=v;}
 const start=sorted.length?Date.parse(sorted[0].capturedAt):0,end=sorted.length?Date.parse(sorted.at(-1).capturedAt):0;
 return sorted.map((point,index)=>({snapshotId:point.snapshotId,capturedAt:point.capturedAt,x:end===start?500:Math.round((Date.parse(point.capturedAt)-start)/(end-start)*1000),
  y:values[index]===null?null:min===max?500:Number((max-integer(values[index]))*1000n/(max-min)),
  label:point.totals[currency]?.display??null,priced:point.coverage.byCurrency[currency]??0,owned:point.coverage.owned}));
}
