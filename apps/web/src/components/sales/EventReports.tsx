"use client";
import {useCallback,useDeferredValue,useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {createEventService,eventReportReader} from '@/lib/sales/eventSupabase';
import type {EventService,EventAttempt} from '@/lib/sales/eventService.mjs';
import type {EventJournal} from '@/lib/sales/eventJournal.mjs';
import {eventExpenseCategories,eventMoneyInput,eventMoneyText,validateEventOperation,type EventOperation,type EventState,type EventExpense,type EventHistory} from '@/lib/sales/vendorEvents.mjs';
import type {EventReportInput} from '@/lib/sales/eventReportLoader.mjs';
import {eventReport,eventReportCsv} from '@/lib/sales/eventReport.mjs';
import {profitMoney,costGapLabel} from '@/lib/sales/salesProfit.mjs';
import {isPurchaseReceipt} from '@/lib/sales/salesPurchase.mjs';
import {receiptTenders,tenderMethods} from '@/lib/sales/salesPayments.mjs';
import c from './EventReports.module.css';
import s from './SalesDesk.module.css';

type Edit={type:Exclude<EventOperation['type'],'receipts_assign'>;values:Record<string,string>;serverRevision:string;localRevision:string|null};
type Section='Totals'|'Receipts'|'Expenses'|'History';
const labels:Record<EventOperation['type'],string>={event_create:'Create event',event_update:'Edit event details',event_close:'Close event',event_reopen:'Reopen event',expense_create:'Add expense',expense_update:'Amend expense',expense_void:'Void expense',receipts_assign:'Change receipt assignments'};
const historyLabels:Record<EventOperation['type'],string>={event_create:'Event created',event_update:'Event details updated',event_close:'Event closed',event_reopen:'Event reopened',expense_create:'Expense added',expense_update:'Expense amended',expense_void:'Expense voided',receipts_assign:'Receipt assignments changed'};
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function operation(edit:Edit):EventOperation {
 const v=edit.values,type=edit.type;
 if(type==='event_create'||type==='event_update')return validateEventOperation({type,eventId:v.eventId,name:v.name,startDate:v.startDate,endDate:v.endDate,timeZone:v.timeZone,currency:'USD',notes:v.notes});
 if(type==='expense_create'||type==='expense_update'){
  const amountMinor=eventMoneyInput(v.amount);if(amountMinor===null)throw Error('Enter a USD amount with up to two decimal places. Zero is allowed.');
  return validateEventOperation({type,eventId:v.eventId,expenseId:v.expenseId,category:v.category,description:v.description,amountMinor,currency:'USD',incurredOn:v.incurredOn,...(type==='expense_update'?{reason:v.reason}:{})});
 }
 return validateEventOperation({type,eventId:v.eventId,...(type==='expense_void'?{expenseId:v.expenseId}:{}),reason:v.reason});
}
function EventEdit({edit,change,submit,cancel,disabled,busy}:{edit:Edit;change:(key:string,value:string)=>void;submit:(event:FormEvent)=>void;cancel:()=>void;disabled:boolean;busy:boolean}){
 const form=useRef<HTMLFormElement>(null);
 useEffect(()=>{form.current?.querySelector<HTMLElement>('input,select,textarea')?.focus();},[]);
 const metadata=edit.type==='event_create'||edit.type==='event_update',expense=edit.type==='expense_create'||edit.type==='expense_update';
 const field=(key:string,label:string,type='text')=><label>{label}<input type={type} value={edit.values[key]??''} onChange={e=>change(key,e.target.value)} required /></label>;
 return <form ref={form} className={`${c.panel} ${c.form}`} onSubmit={submit} aria-label={labels[edit.type]}>
  <h3>{labels[edit.type]}</h3>
  <fieldset disabled={disabled}>
   {metadata?<div className={c.fields}>{field('name','Event name')}<label>Event time zone<input value={edit.values.timeZone??''} onChange={e=>change('timeZone',e.target.value)} required list="event-time-zones" placeholder="America/Denver"/><small>Dates use this time zone when suggesting receipts.</small></label>{field('startDate','Start date','date')}{field('endDate','End date','date')}<label className={c.wide}>Private notes<textarea rows={3} value={edit.values.notes??''} onChange={e=>change('notes',e.target.value)} /></label></div>:expense?<div className={c.fields}>{field('description','Expense description')}<label>Category<select value={edit.values.category??'booth'} onChange={e=>change('category',e.target.value)}>{eventExpenseCategories.map(category=><option key={category} value={category}>{category.charAt(0).toUpperCase()+category.slice(1)}</option>)}</select></label><label>Amount (USD)<input inputMode="decimal" value={edit.values.amount??''} onChange={e=>change('amount',e.target.value)} required placeholder="0.00"/></label>{field('incurredOn','Incurred on','date')}</div>:<p>{edit.type==='expense_void'?'Void this expense to remove it from totals. Its change history remains available.':edit.type==='event_close'?'A closed event remains available for reports. Reopen it before changing its details, receipts or expenses.':'Reopen this event to correct its details, receipts or expenses.'}</p>}
   {(edit.type==='expense_update'||(!metadata&&!expense))&&field('reason','Reason for this change')}
   <div className={c.actions}><button className={s.primary} type="submit">{labels[edit.type]}</button></div>
  </fieldset>
  <div className={c.actions}><button type="button" disabled={busy} onClick={cancel}>Close editor</button></div>
  <datalist id="event-time-zones">{['America/Denver','America/Los_Angeles','America/Chicago','America/New_York','America/Phoenix','Pacific/Honolulu','Europe/London','Europe/Berlin','Asia/Tokyo','Australia/Sydney','UTC'].map(zone=><option key={zone} value={zone}/>)}</datalist>
 </form>;
}

export default function EventReports({ownerId,allowNewEdits=true}:{ownerId:string;allowNewEdits?:boolean}){
 const service=useRef<EventService|null>(null),reader=useRef<ReturnType<typeof eventReportReader>|null>(null),generation=useRef(0),selectedId=useRef<string|null>(null);
 const [selection,setSelection]=useState<string|null>(null);
 const invalidate=useCallback(()=>{generation.current++;},[]);
 const [state,setState]=useState<EventState|null>(null),[journal,setJournal]=useState<EventJournal|null>(null),[data,setData]=useState<EventReportInput|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[closed,setClosed]=useState(false),[error,setError]=useState(''),[reportError,setReportError]=useState(''),[message,setMessage]=useState('');
 const [edit,setEdit]=useState<Edit|null>(null),[section,setSection]=useState<Section>('Totals'),[query,setQuery]=useState(''),[method,setMethod]=useState(''),[receiptScope,setReceiptScope]=useState('suggested'),[chosen,setChosen]=useState<Set<string>>(new Set()),[receiptLimit,setReceiptLimit]=useState(200);
 const [history,setHistory]=useState<EventHistory|null>(null),[historyLoading,setHistoryLoading]=useState(false),[historyError,setHistoryError]=useState('');
 const deferredQuery=useDeferredValue(query);
 const refresh=useCallback(async(id:string|null=selectedId.current)=>{
  const current=++generation.current,api=service.current,read=reader.current;if(!api||!read)return null;
  selectedId.current=id;setSelection(id);setLoading(true);setError('');setReportError('');setData(null);setChosen(new Set());setReceiptLimit(200);setHistory(null);setHistoryError('');setHistoryLoading(false);
  try{
   const [loaded,saved]=await Promise.allSettled([api.read(id),api.journal()]);api.checkOwner();if(current!==generation.current)return null;
   if(saved.status==='fulfilled')setJournal(saved.value);
   if(loaded.status==='rejected'||saved.status==='rejected')throw Error('Event state or saved request unavailable');
   const next=loaded.value,pending=saved.value;setState(next);
   if(id&&next.receiptAccess){try{const loaded=await read.report(id,next,()=>current===generation.current);api.checkOwner();if(current===generation.current)setData(loaded);}catch{api.checkOwner();if(current===generation.current)setReportError('Receipt or private cost history could not load. Totals are unavailable until this event refreshes.');}}
   return {state:next,journal:pending};
  }catch{if(current===generation.current)setError('Events could not refresh. Saved receipts and event edits are retained.');return null;}
  finally{if(current===generation.current)setLoading(false);}
 },[]);
 useEffect(()=>{
  const api=createEventService(supabase,ownerId);service.current=api;reader.current=eventReportReader(supabase,api);
  const detach=api.onInvalidated(()=>{invalidate();setClosed(true);setState(null);setData(null);setJournal(null);setEdit(null);setHistory(null);});
  void refresh();return ()=>{invalidate();detach();api.dispose();service.current=null;reader.current=null;};
 },[ownerId,refresh,invalidate]);
 const currentEvent=state?.events.find(e=>e.eventId===selection),pending=journal?.pending??null;
 const editable=allowNewEdits&&!!state?.entryEnabled&&!loading&&!busy&&!pending&&!error,openEditable=editable&&currentEvent?.status==='open';
 const computed=useMemo(()=>{if(!data)return {report:null,error:''};try{return {report:eventReport({...data,query:deferredQuery,method}),error:''};}catch{return {report:null,error:'Saved receipt or cost data needs review before event totals can be shown.'};}},[data,deferredQuery,method]);
 const report=computed.report;
 const startEdit=(type:Edit['type'],values:Record<string,string>)=>{if(!state)return;setError('');setMessage('');setEdit({type,values,serverRevision:state.revision,localRevision:journal?.localRevision??null});};
 const newEvent=()=>startEdit('event_create',{eventId:crypto.randomUUID(),name:'',startDate:today(),endDate:today(),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,notes:''});
 const expenseEdit=(expense?:EventExpense)=>{if(!currentEvent)return;startEdit(expense?'expense_update':'expense_create',{eventId:currentEvent.eventId,expenseId:expense?.expenseId??crypto.randomUUID(),category:expense?.category??'booth',description:expense?.description??'',amount:expense?eventMoneyText(expense.amountMinor):'',incurredOn:expense?.incurredOn??currentEvent.startDate,reason:''});};
 const handleAttempt=async(attempt:EventAttempt)=>{
  setJournal(attempt.journal);
  if(attempt.status==='saved'){setEdit(null);setMessage('Event change saved.');const op=attempt.acknowledgement.operation;await refresh(op.type==='event_create'?op.eventId:selectedId.current);}
  else if(attempt.status==='unconfirmed'){setMessage('');setError(attempt.message);}
  else if(attempt.status==='rejected'){setMessage('');setError(attempt.code==='PT409'?'Events changed. Your proposed edit is retained for review.':attempt.code==='42501'?'New event edits are unavailable. Your proposed edit is retained.':'This edit needs review. Your proposed change is retained.');}
 };
 const save=async(op:EventOperation,revision:string,localRevision:string|null)=>{const api=service.current;if(!api)return;setBusy(true);setError('');setMessage('');try{await handleAttempt(await api.begin(op,revision,localRevision));}catch{try{api.checkOwner();setError('The edit could not be safely saved. Refresh to review its saved request before trying again.');setJournal(await api.journal());}catch{/* Account invalidation clears the private view. */}}finally{setBusy(false);}};
 const submit=(event:FormEvent)=>{event.preventDefault();if(!edit)return;try{const op=operation(edit);void save(op,edit.serverRevision,edit.localRevision);}catch(error){setError(error instanceof Error&&error.message.startsWith('Enter a USD')?error.message:'Review the event dates, time zone and required details before saving.');}};
 const recover=async()=>{const api=service.current;if(!api)return;setBusy(true);setError('');try{await handleAttempt(await api.recover());}catch{setError('The saved request could not be checked. Its payload is retained.');}finally{setBusy(false);}};
 const reviewRejected=async()=>{
  const api=service.current,old=journal;if(!api||!old?.pending||!old.rejection)return;setBusy(true);setError('');
  try{const op=old.pending.operation,target=op.type==='event_create'?null:op.type==='receipts_assign'?(op.eventId??op.receipts[0].previousEventId):op.eventId;const loaded=await refresh(target);if(!loaded)throw Error('Refresh required');const cleared=await api.discardRejected(old.localRevision);setJournal(cleared);
   if(op.type==='receipts_assign'){setEdit(null);setSection('Receipts');setReceiptScope('all');setChosen(new Set(op.receipts.map(r=>r.receiptId)));setMessage('Review the current receipt assignments, then apply your selection.');}
   else{const values=Object.fromEntries(Object.entries(op).filter(([key,value])=>key!=='type'&&typeof value==='string')) as Record<string,string>;if(op.type==='expense_create'||op.type==='expense_update')values.amount=eventMoneyText(op.amountMinor);setEdit({type:op.type,values,serverRevision:loaded.state.revision,localRevision:cleared.localRevision});}
  }catch{setError('The proposed edit could not reopen. Refresh and check its saved status.');}finally{setBusy(false);}
 };
 const loadHistory=useCallback(async(cursor:string|null=null)=>{const id=selectedId.current,api=service.current,read=reader.current,current=generation.current;if(!id||!api||!read)return;setHistoryLoading(true);setHistoryError('');try{const page=await read.history(id,cursor);api.checkOwner();if(current!==generation.current||id!==selectedId.current)return;setHistory(previous=>cursor&&previous?{...page,rows:[...previous.rows,...page.rows]}:page);}catch{if(current===generation.current)setHistoryError('Change history could not load. Try again.');}finally{if(current===generation.current)setHistoryLoading(false);}},[]);
 useEffect(()=>{if(section==='History'&&currentEvent&&!history&&!historyLoading&&!historyError&&!loading)void loadHistory();},[section,currentEvent,history,historyLoading,historyError,loading,loadHistory]);
 const assign=async(remove:boolean)=>{
  if(!data||!currentEvent)return;const assigned=new Map(data.state.selected!.assignments.map(a=>[a.receiptId,a.eventId]));
  const receipts=[...chosen].sort().filter(id=>remove?assigned.get(id)===currentEvent.eventId:assigned.get(id)!==currentEvent.eventId).map(receiptId=>({receiptId,previousEventId:assigned.get(receiptId)??null}));
  if(receipts.length===0){setError('Choose receipts whose event assignment will change.');return;}if(receipts.length>100){setError('Choose up to 100 receipts for one change.');return;}
  await save({type:'receipts_assign',eventId:remove?null:currentEvent.eventId,receipts},data.state.revision,journal?.localRevision??null);
 };
 const exportCsv=()=>{if(!report)return;const url=URL.createObjectURL(new Blob([eventReportCsv(report)],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`grookai-${report.event.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,64)||'event'}-${report.event.startDate}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const receiptRows=useMemo(()=>{
  if(!data||!report)return [];const selected=data.state.selected!,assigned=new Map(selected.assignments.map(a=>[a.receiptId,a.eventId])),suggested=new Map(selected.candidates?.map(r=>[r.receiptId,r.localDate]));
  return [...new Map(data.receipts.map(r=>[r.id.toLowerCase(),r])).values()].filter(r=>{const id=r.id.toLowerCase();if(receiptScope==='suggested'&&!suggested.has(id))return false;if(receiptScope==='assigned'&&assigned.get(id)!==selected.eventId)return false;if(method&&r.method!==method&&!receiptTenders(r).some(t=>t.method===method))return false;return [r.number,r.customerName,...r.items.map(i=>i.description),...(!isPurchaseReceipt(r)?r.tradeIn?.items??[]:[]).map(i=>i.description)].join(' ').toLowerCase().includes(deferredQuery.trim().toLowerCase());}).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)||a.id.localeCompare(b.id)).slice(0,receiptLimit).map(r=>({receipt:r,eventId:assigned.get(r.id.toLowerCase())??null,localDate:suggested.get(r.id.toLowerCase())}));
 },[data,report,receiptScope,method,deferredQuery,receiptLimit]);
 if(closed)return <div className={c.panel}><h2>Events closed</h2><p>Your account changed. Reopen Reports to continue.</p></div>;
 return <div className={c.root} aria-label="Event reports">
  <div className={c.bar}><label>Event<select aria-label="Choose event" value={selection??''} disabled={busy||!!edit} onChange={e=>{setQuery('');setMethod('');setSection('Totals');void refresh(e.target.value||null);}}><option value="">Choose an event</option>{state?.events.map(e=><option key={e.eventId} value={e.eventId}>{e.name}{e.status==='closed'?' · Closed':''}</option>)}</select></label><div className={c.actions}><button className={s.primary} disabled={!editable||!!edit} onClick={newEvent}>Create event</button><button disabled={loading||busy} onClick={()=>void refresh()}>Refresh events</button></div></div>
  {message&&<p role="status" className={c.muted}>{message}</p>}{error&&<p role="alert" className={c.error}>{error}</p>}
  {pending&&<aside className={c.notice} aria-label="Saved event request"><strong>{journal?.rejection?'An event edit needs review':'An event save needs checking'}</strong><p>{labels[pending.operation.type]}. The exact request is saved on this device. Check its result before starting another edit.</p><div className={c.actions}><button disabled={busy} onClick={()=>void recover()}>Check saved result</button>{journal?.rejection&&<button disabled={busy||loading} onClick={()=>void reviewRejected()}>Review proposed edit</button>}</div></aside>}
  {edit&&<EventEdit key={`${edit.type}:${edit.values.eventId}:${edit.values.expenseId??''}`} edit={edit} change={(key,value)=>setEdit(old=>old?{...old,values:{...old.values,[key]:value}}:null)} submit={submit} cancel={()=>{if(!busy)setEdit(null);}} disabled={busy||!!pending||!allowNewEdits||!state?.entryEnabled} busy={busy}/>}
  {loading&&<p role="status">Loading event history…</p>}
  {!loading&&state&&(!allowNewEdits||!state.entryEnabled)&&<p className={c.muted}>New event edits are currently unavailable. Saved events and request recovery remain accessible.</p>}
  {!currentEvent&&!loading&&<div className={`${c.panel} ${c.empty}`}><h2>{state?.events.length?'Choose an event':'Close out your next show'}</h2><p>Connect saved receipts, record operating expenses and review the costs behind your results.</p></div>}
  {currentEvent&&<>
   <div className={c.bar}><div><div className={c.heading}><h2>{currentEvent.name}</h2><span className={c.pill}>{currentEvent.status==='closed'?'Closed':'Open'}</span></div><p className={c.muted}>{currentEvent.startDate} – {currentEvent.endDate} · {currentEvent.timeZone}</p></div><div className={c.actions}><button disabled={!openEditable||!!edit} onClick={()=>startEdit('event_update',{eventId:currentEvent.eventId,name:currentEvent.name,startDate:currentEvent.startDate,endDate:currentEvent.endDate,timeZone:currentEvent.timeZone,notes:currentEvent.notes})}>Edit details</button><button disabled={!editable||!!edit} onClick={()=>startEdit(currentEvent.status==='closed'?'event_reopen':'event_close',{eventId:currentEvent.eventId,reason:''})}>{currentEvent.status==='closed'?'Reopen event':'Close event'}</button></div></div>
   <div className={c.tabs} role="group" aria-label="Event sections">{(['Totals','Receipts','Expenses','History'] as Section[]).map(name=><button key={name} aria-pressed={section===name} onClick={()=>setSection(name)}>{name}</button>)}</div>
   {(section==='Totals'||section==='Receipts')&&<details key={section} open={section==='Receipts'} className={c.filterPanel}><summary>{report?.receiptsFiltered?'Receipt filters · Active':'Filter receipts'}</summary><div className={c.filters}><label>Search event receipts<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setReceiptLimit(200);}} placeholder="Receipt, customer or item"/></label><label>Receipt payment filter<select value={method} onChange={e=>{setMethod(e.target.value);setReceiptLimit(200);}}><option value="">All methods</option>{tenderMethods.map(m=><option key={m}>{m}</option>)}</select></label></div></details>}
   {(reportError||computed.error)&&<p role="alert" className={c.error}>{reportError||computed.error}</p>}
   {!state?.receiptAccess&&<p className={c.muted}>Receipt access is currently unavailable. Saved assignments, expenses and change history remain private and available.</p>}
   {section==='Totals'&&report&&<div className={c.section}>
    <div className={c.profit}><h3>Known-cost event subtotal</h3><strong>{report.knownCostEventSubtotalMinor===null?'Unavailable':profitMoney(report.knownCostEventSubtotalMinor)}</strong><span className={c.pill}>{report.profit.knownLines===report.profit.totalLines&&report.profit.totalLines>0?'All selected sale lines covered':'Partial cost coverage'}</span><p>{report.profit.knownLines} of {report.profit.totalLines} sale lines have qualified historical cost. {profitMoney(report.profit.unknownSalesMinor)} in item sales remains uncovered.</p><p>{report.profit.knownProfitMinor===null?'No qualified sales profit is available.':`${profitMoney(report.profit.knownProfitMinor)} known gross profit minus ${profitMoney(report.operatingExpenseMinor)} in all active event expenses.`}</p>{report.profit.reasons.length>0&&<details><summary>Why costs are incomplete</summary><ul>{report.profit.reasons.map(reason=><li key={reason.reason}>{costGapLabel(reason.reason)}: {profitMoney(reason.salesMinor)} ({reason.lines} sale lines)</li>)}</ul></details>}</div>
    {report.receiptsFiltered&&<p className={c.muted}>Receipt filters are active. All active event expenses remain included in the subtotal and CSV.</p>}
    <dl className={c.metrics}>{[['Item sales',report.salesMinor],['Money received',report.receivedMinor],['Money paid out',report.paidMinor],['Inventory purchases',report.inventoryPurchaseMinor],['Trade credit given',report.tradeCreditMinor],['Operating expenses',report.operatingExpenseMinor],['Tax recorded',report.taxMinor],['Cash tendered (known)',report.knownCashTenderedMinor],['Cash change (known)',report.knownCashChangeMinor]].map(([label,minor])=><div className={c.metric} key={label}><dt>{label}</dt><dd>{profitMoney(minor)}</dd></div>)}</dl>
    <p className={c.muted}>{report.transactions} displayed receipts of {report.assignedReceipts} assigned. {report.unknownCashTenderReceipts>0?`${report.unknownCashTenderReceipts} older cash receipts do not record tender or change.`:''}</p>
    <div className={c.actions}><button onClick={exportCsv} disabled={loading||deferredQuery!==query}>Export this event CSV</button></div><p className={c.muted}>Based on recorded receipts, historical costs and event expenses. Refunds, online orders and processor settlements are outside this report.</p>
   </div>}
   {section==='Receipts'&&<div className={c.section}><p className={c.muted}>Dates suggest receipts. Only saved assignments count toward this event.</p><label>Show receipts<select value={receiptScope} onChange={e=>{setReceiptScope(e.target.value);setChosen(new Set());setReceiptLimit(200);}}><option value="suggested">Suggested by event dates</option><option value="assigned">Assigned to this event</option><option value="all">All saved receipts</option></select></label><div className={c.actions}><button disabled={!openEditable||chosen.size===0||!!edit} onClick={()=>void assign(false)}>Add selected to event</button><button disabled={!openEditable||chosen.size===0||!!edit} onClick={()=>void assign(true)}>Remove selected from event</button><small>{chosen.size} selected · Up to 100 per change</small></div>
    <ul className={c.list}>{receiptRows.map(({receipt:r,eventId:assigned,localDate})=><li key={r.id}><label className={c.check}><input type="checkbox" aria-label={`Select receipt ${r.number}`} checked={chosen.has(r.id.toLowerCase())} disabled={!openEditable||!!edit||(!chosen.has(r.id.toLowerCase())&&chosen.size>=100)} onChange={e=>{const checked=e.target.checked;setChosen(old=>{const next=new Set(old);if(checked)next.add(r.id.toLowerCase());else next.delete(r.id.toLowerCase());return next;});}}/><span><strong>{r.number}</strong><small>{r.customerName||r.items[0]?.description} · {localDate?`${localDate} event date`:`${new Date(r.createdAt).toISOString().slice(0,10)} UTC`}</small><small>{assigned?`Assigned to ${state?.events.find(e=>e.eventId===assigned)?.name??'an event'}`:'Unassigned'}</small></span></label><span className={c.amount}>{profitMoney(String(isPurchaseReceipt(r)?r.purchaseMinor:r.totalMinor))}<small>{isPurchaseReceipt(r)?'purchase':r.tradeIn?'sale before trade credit':'sale incl. tax'}</small></span></li>)}</ul>{receiptRows.length===receiptLimit&&receiptLimit<10000&&<button onClick={()=>setReceiptLimit(n=>n+200)}>Show more matching receipts</button>}{!loading&&receiptRows.length===0&&<p className={c.empty}>No receipts in this view. Try all saved receipts or adjust your search.</p>}
   </div>}
   {section==='Expenses'&&<div className={c.section}><div className={c.bar}><p className={c.muted}>Record booth, travel and other operating expenses. Inventory purchases and trade payouts stay in receipts.</p><button disabled={!openEditable||!!edit} onClick={()=>expenseEdit()}>Add expense</button></div><ul className={c.list}>{(state?.selected?.eventId===selection?state.selected.expenses:[]).map(expense=><li key={expense.expenseId}><div><strong>{expense.description}{expense.voided?' · Voided':''}</strong><small>{expense.category} · {expense.incurredOn}</small>{expense.lastReason&&<small>{expense.lastReason}</small>}</div><span className={c.amount}>{profitMoney(expense.amountMinor)}</span>{!expense.voided&&<div className={c.actions}><button disabled={!openEditable||!!edit} onClick={()=>expenseEdit(expense)} aria-label={`Amend ${expense.description}`}>Amend</button><button disabled={!openEditable||!!edit} onClick={()=>startEdit('expense_void',{eventId:expense.eventId,expenseId:expense.expenseId,reason:''})} aria-label={`Void ${expense.description}`}>Void</button></div>}</li>)}</ul>{state?.selected?.expenses.length===0&&<p className={c.empty}>No event expenses recorded.</p>}</div>}
   {section==='History'&&<div className={c.section}>{historyLoading&&<p role="status">Loading changes…</p>}{historyError&&<p role="alert">{historyError} <button onClick={()=>void loadHistory(history?.nextRevision??null)}>Try again</button></p>}<ol className={c.history}>{history?.rows.map(row=><li key={row.requestId}><strong>{historyLabels[row.operation.type]}</strong><small>{new Date(row.createdAt).toLocaleString()}</small>{'name' in row.operation&&<p>{row.operation.name} · {row.operation.startDate} – {row.operation.endDate} · {row.operation.timeZone}</p>}{'description' in row.operation&&<p>{row.operation.description} · {profitMoney(row.operation.amountMinor)}</p>}{'reason' in row.operation&&<p className={c.reason}>{row.operation.reason}</p>}{row.operation.type==='receipts_assign'&&<p>{row.operation.receipts.length} receipt assignments changed.</p>}</li>)}</ol>{history?.nextRevision&&<button disabled={historyLoading} onClick={()=>void loadHistory(history.nextRevision)}>Load earlier changes</button>}</div>}
  </>}
 </div>;
}
