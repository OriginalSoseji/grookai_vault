"use client";
import {useEffect,useState} from "react";
import type {BinderSummary} from "@/lib/binders/types";
import {BinderSummaryCard} from "./BinderSummaryPresentation";
import ProductState from "@/components/layout/ProductState";

type Group={title:string;items:BinderSummary[];empty:string};
type Sort="recent"|"name"|"completion";
const names:Record<Sort,string>={recent:"Recently updated",name:"Name A–Z",completion:"Closest to completion"};
export default function BinderLibraryClient({groups,hasMore}:{groups:Group[];hasMore:boolean}){
  const [query,setQuery]=useState("");
  const [scope,setScope]=useState("all");
  const [sort,setSort]=useState<Sort>("recent");
  useEffect(()=>{try{const value=localStorage.getItem('grookai-binder-sort-v1');if(value&&value in names)setSort(value as Sort);}catch{}},[]);
  const terms=query.toLowerCase().trim().split(/\s+/);
  const filtering=query.trim()!==""||scope!=="all";
  const loaded=groups.flatMap(g=>g.items).length;
  const visible=groups.map(group=>({...group,items:group.items.filter(b=>
    (scope==='all'||(scope==='mine'?b.role==='owner':b.role!=='owner'))&&terms.every(t=>`${b.title} ${b.description??''}`.toLowerCase().includes(t))
  ).sort((a,b)=>{
    if(sort==='name')return a.title.toLocaleLowerCase().localeCompare(b.title.toLocaleLowerCase());
    if(sort==='recent'){const left=Date.parse(a.updatedAt??''),right=Date.parse(b.updatedAt??'');return Number.isFinite(left)?Number.isFinite(right)?right-left:-1:Number.isFinite(right)?1:0;}
    if(a.totalSlots<=0)return b.totalSlots<=0?0:1;if(b.totalSlots<=0)return -1;
    return Math.min(b.totalSlots,Math.max(0,b.completedSlots))/b.totalSlots-Math.min(a.totalSlots,Math.max(0,a.completedSlots))/a.totalSlots;
  })}));
  const count=visible.reduce((sum,g)=>sum+g.items.length,0);
  return <section className="space-y-5" aria-label="Your Binder library">
    <label>Search your Binders<input type="search" className="gv-binder-input mt-1 block w-full" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <div className="flex flex-wrap gap-[9px]" role="group" aria-label="Binder membership filter">{[['all','All'],['mine','Mine'],['shared','Shared']].map(([value,label])=><button type="button" key={value} className="gv-secondary-button" aria-pressed={scope===value} onClick={()=>setScope(value)}>{label}</button>)}</div>
    <label>Sort Binders <select className="gv-binder-input" value={sort} onChange={e=>{const value=e.target.value as Sort;setSort(value);try{localStorage.setItem('grookai-binder-sort-v1',value);}catch{}}}>{Object.entries(names).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <p className="text-sm" role="status">{count} {count===1?'Binder':'Binders'} shown{hasMore?` in ${loaded} loaded. Load more to include others.`:''}</p>
    {count===0&&filtering?<div><p>No matching Binders</p><button type="button" className="gv-secondary-button" onClick={()=>{setQuery('');setScope('all');}}>Clear filters</button></div>:null}
    {visible.filter(group=>!filtering||group.items.length).map(group=><section key={group.title} className="space-y-2"><h2 className="gv-section-title">{group.title}</h2>{group.items.length?<div className="grid gap-[9px] sm:grid-cols-2">{group.items.map(binder=><BinderSummaryCard key={binder.publicId} binder={binder}/>)}</div>:<ProductState compact title={group.title} description={group.empty}/>}</section>)}
  </section>;
}
