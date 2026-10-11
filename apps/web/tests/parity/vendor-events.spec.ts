import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import vectors from '../../../../test/fixtures/event_report_v1.json';
import type {EventReportInput} from '../../src/lib/sales/eventReportLoader.mjs';
import type {EventRequest,EventAcknowledgement,EventExpense,VendorEvent} from '../../src/lib/sales/vendorEvents.mjs';

const owner='00000000-0000-4000-8000-000000000001';
const stamp='2026-10-08T14:00:00.000Z';
async function fixture(page:Page){
 const sample=structuredClone(vectors.cases[0].args) as EventReportInput;
 sample.ownerId=owner;sample.state.ownerId=owner;
 const state=sample.state,eventId=sample.eventId;
 const book={storeName:'Event store',customers:[],receipts:sample.receipts.map(receipt=>({receipt}))};
 const acknowledgements=new Map<string,EventAcknowledgement>();
 const requests:EventRequest[]=[];
 const flags={costFailure:false,dropAfterCommit:false,refuseStale:false};
 await page.route('**/api/sales/**',route=>route.fulfill({json:{ownerId:owner,book,snapshots:sample.snapshots}}));
 await page.route('http://127.0.0.1:54321/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/user'))return route.fulfill({json:{id:owner,aud:'authenticated',email:'events@example.test',created_at:stamp}});
  if(!path.includes('/rpc/'))return route.fulfill({json:{}});
  const params=route.request().postDataJSON();
  if(path.endsWith('vendor_event_read_v1'))return route.fulfill({json:{...state,selected:params.p_event_id?(params.p_event_id===eventId?state.selected:{...state.selected,eventId:params.p_event_id,expenses:[],candidates:[]}):null}});
  if(path.endsWith('vendor_receipt_book_read_v1'))return route.fulfill({json:{revision:1,book}});
  if(path.endsWith('vendor_sale_cost_read_v1'))return flags.costFailure?route.fulfill({status:503,json:{message:'Synthetic unavailable'}}):route.fulfill({json:{ownerId:owner,snapshots:sample.snapshots.filter(s=>params.p_request_ids.includes(s.receiptId))}});
  if(path.endsWith('vendor_event_history_read_v1'))return route.fulfill({json:{version:1,ownerId:owner,eventId:params.p_event_id,rows:[...acknowledgements.values()].reverse().map(a=>({requestId:a.requestId,revision:a.revision,createdAt:stamp,operation:a.operation,before:[],after:[]})),nextRevision:null}});
  if(path.endsWith('vendor_event_request_read_v1'))return route.fulfill({json:acknowledgements.get(params.p_request_id)??null});
  if(path.endsWith('vendor_event_mutate_v1')){
   const request=params.p_request as EventRequest;requests.push(request);
   if(flags.refuseStale){flags.refuseStale=false;return route.fulfill({status:409,json:{code:'PT409',message:'Synthetic competing edit'}});}
   const op=request.operation,revision=String(BigInt(state.revision)+1n);
   const ack:EventAcknowledgement={version:1,ownerId:owner,requestId:request.requestId,previousRevision:request.expectedRevision,revision,operation:op};
   acknowledgements.set(request.requestId,ack);state.revision=revision;
   if(op.type==='event_create'){const event={...op,revision,status:'open',stateReason:'',createdAt:stamp,updatedAt:stamp} as VendorEvent;delete (event as unknown as Record<string,unknown>).type;state.events.push(event);state.events.sort((a,b)=>a.eventId.localeCompare(b.eventId));}
   if(op.type==='event_update'){const event=state.events.find(e=>e.eventId===op.eventId)!;Object.assign(event,{name:op.name,startDate:op.startDate,endDate:op.endDate,timeZone:op.timeZone,notes:op.notes,revision,updatedAt:stamp});}
   if(op.type==='expense_create')state.selected!.expenses.push({...op,revision,voided:false,lastReason:'',createdAt:stamp,updatedAt:stamp} as EventExpense);
   if(op.type==='expense_create'){const expense=state.selected!.expenses.at(-1)!;delete (expense as unknown as Record<string,unknown>).type;state.selected!.expenses.sort((a,b)=>a.expenseId.localeCompare(b.expenseId));}
   if(op.type==='expense_update'){const expense=state.selected!.expenses.find(e=>e.expenseId===op.expenseId)!;Object.assign(expense,{category:op.category,description:op.description,amountMinor:op.amountMinor,incurredOn:op.incurredOn,lastReason:op.reason,revision,updatedAt:stamp});}
   if(op.type==='expense_void')Object.assign(state.selected!.expenses.find(e=>e.expenseId===op.expenseId)!,{voided:true,lastReason:op.reason,revision,updatedAt:stamp});
   if(op.type==='event_close'||op.type==='event_reopen')Object.assign(state.events.find(e=>e.eventId===op.eventId)!,{status:op.type==='event_close'?'closed':'open',stateReason:op.reason,revision,updatedAt:stamp});
   if(op.type==='receipts_assign')for(const r of op.receipts){const assignment=state.selected!.assignments.find(a=>a.receiptId===r.receiptId);if(assignment)Object.assign(assignment,{eventId:op.eventId,revision});}
   if(flags.dropAfterCommit){flags.dropAfterCommit=false;return route.abort('connectionfailed');}
   return route.fulfill({json:ack});
  }
  throw Error(`Unexpected local RPC: ${path}`);
 });
 const open=async()=>{await page.goto('/visual-fixtures/vendor-workspace?view=events');await page.getByRole('button',{name:'Events',exact:true}).click();await page.getByLabel('Choose event').selectOption(eventId);await expect(page.getByRole('heading',{name:'Known-cost event subtotal'})).toBeVisible();};
 return {sample,state,eventId,requests,flags,open};
}

for(const width of [320,390,768,1440])test(`event closeout is readable at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:900});const f=await fixture(page);await f.open();
 const profit=page.getByRole('heading',{name:'Known-cost event subtotal'}).locator('..');
 await expect(profit).toContainText('$30.00');await expect(profit).toContainText('$50.00 in item sales remains uncovered');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath(`event-totals-${width}.png`),fullPage:true});
 if(width===390){const result=await new AxeBuilder({page}).include('[data-vendor-workspace-fixture]').analyze();expect(result.violations.filter(v=>['critical','serious'].includes(v.impact??''))).toEqual([]);}
 expect(f.requests).toHaveLength(0);
});

test('expense amendment accepts known zero and preserves a visible reason in history',async({page})=>{
 const f=await fixture(page);await f.open();await page.getByRole('button',{name:'Expenses',exact:true}).click();await page.getByLabel('Amend Booth fee').click();
 const form=page.getByRole('form',{name:'Amend expense'});await form.getByLabel('Amount (USD)').fill('0.00');await form.getByLabel('Reason for this change').fill('Organizer waived the booth fee');await form.getByRole('button',{name:'Amend expense',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Event change saved'})).toBeVisible();await page.getByRole('button',{name:'Totals',exact:true}).click();await expect(page.getByRole('heading',{name:'Known-cost event subtotal'}).locator('..')).toContainText('$40.00');
 await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.getByText('Organizer waived the booth fee')).toBeVisible();expect(f.requests[0].operation).toMatchObject({type:'expense_update',amountMinor:'0'});
});

test('dropped acknowledgement survives reload and recovers while new entry is off',async({page})=>{
 const f=await fixture(page);await f.open();f.flags.dropAfterCommit=true;await page.getByRole('button',{name:'Close event',exact:true}).click();const form=page.getByRole('form',{name:'Close event'});await form.getByLabel('Reason for this change').fill('Show complete');await form.getByRole('button',{name:'Close event',exact:true}).click();
 await expect(page.getByLabel('Saved event request')).toBeVisible();expect(f.requests).toHaveLength(1);f.state.entryEnabled=false;
 await page.reload();await page.getByRole('button',{name:'Events',exact:true}).click();await expect(page.getByLabel('Saved event request')).toBeVisible();await page.getByRole('button',{name:'Check saved result'}).click();await expect(page.getByLabel('Saved event request')).toHaveCount(0);expect(f.requests).toHaveLength(1);await expect(page.getByRole('button',{name:'Create event',exact:true})).toBeDisabled();
});

test('failed private cost read refuses totals without implying missing cost',async({page})=>{
 const f=await fixture(page);await f.open();f.flags.costFailure=true;await page.getByRole('button',{name:'Refresh events'}).click();await expect(page.getByRole('alert').filter({hasText:'Totals are unavailable'})).toBeVisible();await expect(page.getByRole('heading',{name:'Known-cost event subtotal'})).toHaveCount(0);await page.getByRole('button',{name:'Expenses',exact:true}).click();await expect(page.getByText('Booth fee',{exact:true})).toBeVisible();
});

test('receipt filters retain all event expenses and exported scope',async({page})=>{
 const f=await fixture(page);await f.open();await page.getByText('Filter receipts',{exact:true}).click();await page.getByLabel('Search event receipts').fill('Card 1');await expect(page.getByText('Receipt filters are active.',{exact:false})).toBeVisible();await expect(page.getByRole('heading',{name:'Known-cost event subtotal'}).locator('..')).toContainText('$30.00');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export this event CSV'}).click();const file=await download;const stream=await file.createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(Buffer.from(chunk));const csv=Buffer.concat(chunks).toString();expect(csv).toContain('Card 1');expect(csv).not.toContain('Card 2');expect(csv).toContain('Booth fee');
});

test('stale expense edit stays recoverable until explicit review',async({page})=>{
 const f=await fixture(page);await f.open();f.flags.refuseStale=true;await page.getByRole('button',{name:'Expenses',exact:true}).click();await page.getByLabel('Amend Booth fee').click();const form=page.getByRole('form',{name:'Amend expense'});await form.getByLabel('Amount (USD)').fill('12.34');await form.getByLabel('Reason for this change').fill('Receipt correction');await form.getByRole('button',{name:'Amend expense',exact:true}).click();await expect(page.getByRole('button',{name:'Review proposed edit'})).toBeVisible();await page.getByRole('button',{name:'Review proposed edit'}).click();await expect(form.getByLabel('Amount (USD)')).toHaveValue('12.34');await expect(form.getByLabel('Reason for this change')).toHaveValue('Receipt correction');expect(f.requests).toHaveLength(1);
});

test('account closure removes private events and drafts from view',async({page})=>{
 const f=await fixture(page);await f.open();await page.getByRole('button',{name:'Edit details'}).click();await page.getByRole('button',{name:'Fixture sign out'}).click();await expect(page.getByRole('heading',{name:'Reports closed'})).toBeVisible();await expect(page.getByLabel('Event name')).toHaveCount(0);await expect(page.getByText('Card show',{exact:true})).toHaveCount(0);
});

test('UI rollback keeps a saved request recoverable without enabling new edits',async({page})=>{
 const f=await fixture(page);await f.open();f.flags.dropAfterCommit=true;await page.getByRole('button',{name:'Close event',exact:true}).click();const form=page.getByRole('form',{name:'Close event'});await form.getByLabel('Reason for this change').fill('Show complete');await form.getByRole('button',{name:'Close event',exact:true}).click();await expect(page.getByLabel('Saved event request')).toBeVisible();
 await page.goto('/visual-fixtures/vendor-workspace?view=events&eventsEnabled=0');await page.getByRole('button',{name:'Saved event edit',exact:true}).click();await page.getByRole('button',{name:'Check saved result'}).click();await expect(page.getByLabel('Saved event request')).toHaveCount(0);await expect(page.getByRole('button',{name:'Create event',exact:true})).toBeDisabled();expect(f.requests).toHaveLength(1);
});

test('new event metadata and later date edits do not assign receipts',async({page})=>{
 const f=await fixture(page);await f.open();const membership=structuredClone(f.state.selected!.assignments);await page.getByRole('button',{name:'Create event',exact:true}).click();const form=page.getByRole('form',{name:'Create event'});await form.getByLabel('Event name').fill('Denver weekend');await form.getByLabel('Event time zone').fill('America/Denver');await form.getByLabel('Start date').fill('2026-10-10');await form.getByLabel('End date').fill('2026-10-11');await form.getByRole('button',{name:'Create event',exact:true}).click();await expect(page.getByRole('heading',{name:'Denver weekend'})).toBeVisible();expect(f.state.selected!.assignments).toEqual(membership);await page.getByRole('button',{name:'Edit details'}).click();const edit=page.getByRole('form',{name:'Edit event details'});await edit.getByLabel('End date').fill('2026-10-12');await edit.getByRole('button',{name:'Edit event details',exact:true}).click();await expect(page.getByText('2026-10-10 – 2026-10-12 · America/Denver')).toBeVisible();expect(f.state.selected!.assignments).toEqual(membership);
});

test('explicit receipt removal preserves original receipts and updates membership',async({page})=>{
 const f=await fixture(page);await f.open();const receipts=structuredClone(f.sample.receipts);await page.getByRole('button',{name:'Receipts',exact:true}).click();await page.getByLabel('Show receipts').selectOption('assigned');await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:'Remove selected from event'}).click();await expect(page.getByRole('status').filter({hasText:'Event change saved'})).toBeVisible();expect(f.requests[0].operation).toMatchObject({type:'receipts_assign',eventId:null});expect(f.sample.receipts).toEqual(receipts);expect(f.state.selected!.assignments.filter(r=>r.eventId===null)).toHaveLength(1);
});
