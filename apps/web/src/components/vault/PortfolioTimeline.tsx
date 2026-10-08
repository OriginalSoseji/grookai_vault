"use client";
import {useState} from 'react';
import type {PortfolioSummary} from '@/lib/vault/portfolioHistory.mjs';
import {portfolioTimeline} from '@/lib/vault/portfolioHistoryTimeline.mjs';
export function PortfolioTimeline({points}:{points:PortfolioSummary[]}){
 const [selected,setSelected]=useState('');
 const currencies=[...new Set(points.flatMap(p=>Object.keys(p.totals)))].sort();
 const currency=currencies.includes(selected)?selected:currencies[0];
 if(points.length<2||!currency)return null;
 const data=portfolioTimeline(points,currency),priced=data.filter(p=>p.y!==null).sort((a,b)=>a.y!-b.y!);
 return <figure className="mt-5 rounded-xl border p-4" aria-label="Recorded reference value timeline">
  <div className="flex flex-wrap items-center justify-between gap-2"><figcaption className="font-medium">Recorded reference value</figcaption><label className="text-sm">Currency <select aria-label="Timeline currency" className="min-h-11 rounded-lg border bg-transparent px-2" value={currency} onChange={e=>setSelected(e.target.value)}>{currencies.map(c=><option key={c}>{c}</option>)}</select></label></div>
  <p className="mt-2 [overflow-wrap:anywhere] text-xs text-slate-500">Observed range: {currency} {priced.at(-1)!.label} – {priced[0].label}</p>
  <svg viewBox="0 0 1040 240" preserveAspectRatio="none" role="img" aria-label={`${currency}, ${priced.length} priced observations. Exact values and coverage are listed below.`} className="mt-3 h-44 w-full overflow-visible">
   <path d="M20 10V210H1020" fill="none" stroke="currentColor" opacity="0.4" vectorEffect="non-scaling-stroke"/>
   {data.map(p=>p.y===null?<path key={p.snapshotId} d={`M${20+p.x-4} 222l8 8m-8 0l8-8`} stroke="currentColor" opacity="0.7" vectorEffect="non-scaling-stroke"><title>{p.capturedAt}: no {currency} priced copies</title></path>:<circle key={p.snapshotId} cx={20+p.x} cy={20+p.y*.18} r="1" stroke="currentColor" strokeWidth="4" vectorEffect="non-scaling-stroke" fill="currentColor" className="text-sky-600 dark:text-sky-400"><title>{p.capturedAt}: {currency} {p.label}; {p.priced} of {p.owned} copies priced in {currency}</title></circle>)}
  </svg>
  <div className="flex justify-between gap-4 text-xs text-slate-500"><span>{new Date(data[0].capturedAt).toLocaleDateString()}</span><span>{new Date(data.at(-1)!.capturedAt).toLocaleDateString()}</span></div>
  <p className="mt-3 text-xs text-slate-500">Dots are saved observations, spaced by capture time. No visit, no point. × means no price coverage. Copy coverage is listed below.</p>
 </figure>;
}
