import {test,expect,type Page,type BrowserContext} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const owner='00000000-0000-4000-8000-000000000001';
const instance='00000000-0000-4000-8000-000000000010';
const url='/visual-fixtures/vendor-workspace?view=cost';
type Cost={amount:string|null;currency:string|null;status:string;minor:string|null};
type Request={ownerId:string;instanceId:string;requestId:string;expectedAmount:string|null;expectedCurrency:string|null;amount:string|null;currency:string|null};
async function fixture(context:BrowserContext,options:{cost?:Cost;archived?:boolean;editable?:boolean;lost?:boolean;uncommitted?:boolean;conflict?:boolean}={}) {
  let cost=options.cost??{amount:'12.00',currency:null,status:'missing_currency',minor:null};
  const calls:Request[]=[];let reject=options.conflict??false;
  const results=new Map<string,unknown>();
  await context.route('http://127.0.0.1:54321/**',route=>route.fulfill({json:new URL(route.request().url()).pathname.endsWith('/user')?{id:owner,aud:'authenticated',email:'cost@example.test',created_at:'2026-10-07T00:00:00Z'}:{}}));
  await context.route('**/api/sales/desk?**',route=>route.fulfill({json:{book:{storeName:'Fixture',customers:[],receipts:[]}}}));
  await context.route('**/api/vault/cost**',async route=>{
    const req=route.request(),params=new URL(req.url()).searchParams;
    if(req.method()==='GET')return route.fulfill({json:params.has('requestId')?{ownerId:owner,result:results.get(params.get('requestId')!)??null}:{ownerId:owner,editEnabled:options.editable!==false,copy:{instanceId:instance,archived:options.archived??false,cost}}});
    const body=req.postDataJSON() as Request;calls.push(body);
    if(reject){reject=false;cost={amount:'21.00',currency:'CAD',status:'known',minor:'2100'};return route.fulfill({status:409,json:{definitive:true,conflict:true,error:'This copy or its cost changed. Review the latest value.'}});}
    if(options.uncommitted && calls.length===1)return route.abort();
    cost=body.amount===null?{amount:null,currency:null,status:'missing_amount',minor:null}:{amount:body.amount,currency:body.currency,status:'known',minor:String(BigInt(body.amount.replace('.','')))};
    const result={ownerId:owner,instanceId:instance,requestId:body.requestId,cost};results.set(body.requestId,result);
    if(options.lost && calls.length===1)return route.abort();
    return route.fulfill({json:{ownerId:owner,result}});
  });
  return {calls,results};
}
async function start(page:Page){await page.goto(url);await expect(page.getByLabel('Cost amount',{exact:true})).toBeEnabled();}
async function save(page:Page,amount:string,currency:string){await page.getByLabel('Cost amount',{exact:true}).fill(amount);await page.getByLabel('Currency',{exact:true}).fill(currency);await page.getByRole('button',{name:'Save cost',exact:true}).click();}

for(const width of [384,1440])test(`private cost fits ${width}px, currency explicit and zero preserved`,async({page,context},info)=>{
  const proof=await fixture(context);await page.setViewportSize({width,height:900});await start(page);
  await expect(page.getByText('Cost currency needed',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Currency',{exact:true})).toHaveValue('');
  await save(page,'0','CAD');await expect(page.getByText('Cost saved.',{exact:true})).toBeVisible();
  expect(proof.calls).toHaveLength(1);expect(proof.calls[0]).toMatchObject({amount:'0.00',currency:'CAD',expectedAmount:'12.00',expectedCurrency:null});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const result=await new AxeBuilder({page}).include('[aria-label="Private cost"]').analyze();
  expect(result.violations.filter(row=>['critical','serious'].includes(row.impact??''))).toEqual([]);
  await page.screenshot({path:info.outputPath(`cost-${width}.png`),fullPage:true});
});
test('a committed save with a lost response recovers after reload without another write',async({page,context})=>{
  const proof=await fixture(context,{lost:true});await start(page);await save(page,'18.40','USD');
  await expect(page.getByRole('button',{name:'Retry same save'})).toBeVisible();await page.reload();
  await expect(page.getByText('Cost saved.',{exact:true})).toBeVisible();expect(proof.calls).toHaveLength(1);
  await expect(page.getByLabel('Cost amount',{exact:true})).toHaveValue('18.40');
});
test('an unconfirmed request retries the exact payload and request ID',async({page,context})=>{
  const proof=await fixture(context,{uncommitted:true});await start(page);await save(page,'25','USD');
  await expect(page.getByRole('button',{name:'Retry same save'})).toBeEnabled();await page.reload();
  await page.getByRole('button',{name:'Retry same save'}).click();await expect(page.getByText('Cost saved.',{exact:true})).toBeVisible();
  expect(proof.calls).toHaveLength(2);expect(proof.calls[1]).toEqual(proof.calls[0]);
});
test('recovery remains available with entry switched off',async({page,context})=>{
  const proof=await fixture(context,{lost:true});await start(page);await save(page,'18.40','USD');
  await expect(page.getByRole('button',{name:'Retry same save'})).toBeEnabled();
  await page.goto(url+'&costEnabled=0');await expect(page.getByRole('region',{name:'Private cost'})).toHaveCount(0);
  await expect.poll(async()=>page.evaluate(()=>new Promise<boolean>((resolve,reject)=>{const open=indexedDB.open('grookai.private-copy-cost.v1',1);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,read=db.transaction('copies').objectStore('copies').get('00000000-0000-4000-8000-000000000001:00000000-0000-4000-8000-000000000010');read.onsuccess=()=>{resolve(read.result.pending===null);db.close();};};}))).toBe(true);
  expect(proof.calls).toHaveLength(1);
});
test('an optimistic conflict preserves the proposal until explicit review',async({page,context})=>{
  const proof=await fixture(context,{conflict:true});await start(page);await save(page,'19','USD');
  await expect(page.getByRole('button',{name:'Save cost',exact:true})).toBeDisabled();
  await expect(page.getByLabel('Cost amount',{exact:true})).toHaveValue('19');
  await page.getByRole('button',{name:'Review latest cost'}).click();
  await expect(page.getByText('CAD 21.00',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Save cost',exact:true}).click();await expect(page.getByText('Cost saved.',{exact:true})).toBeVisible();
  expect(proof.calls[1]).toMatchObject({expectedAmount:'21.00',expectedCurrency:'CAD',amount:'19.00',currency:'USD'});
  expect(proof.calls[1].requestId).not.toBe(proof.calls[0].requestId);
});
test('unknown clears both fields, while an amount without currency cannot save',async({page,context})=>{
  const proof=await fixture(context);await start(page);
  await page.getByRole('button',{name:'Save cost',exact:true}).click();await expect(page.getByText(/Enter both the cost/)).toBeVisible();expect(proof.calls).toHaveLength(0);
  await page.getByRole('button',{name:'Mark cost unknown'}).click();await page.getByRole('button',{name:'Save cost',exact:true}).click();
  await expect(page.getByText('Cost saved.',{exact:true})).toBeVisible();expect(proof.calls[0]).toMatchObject({amount:null,currency:null});
});
test('another editor cannot overwrite a pending request',async({page,context})=>{
  const proof=await fixture(context,{uncommitted:true});await start(page);const other=await context.newPage();await start(other);
  await save(page,'15','USD');await expect(page.getByRole('button',{name:'Retry same save'})).toBeVisible();
  await other.getByLabel('Cost amount',{exact:true}).fill('90');await expect(other.getByText(/changed in another editor/)).toBeVisible();
  await expect(other.getByRole('button',{name:'Save cost',exact:true})).toBeDisabled();expect(proof.calls).toHaveLength(1);
});
test('local drafts survive SPA departure and browser back',async({page,context})=>{
  await fixture(context);await start(page);await page.getByLabel('Cost amount',{exact:true}).fill('45');await page.getByLabel('Currency',{exact:true}).fill('CAD');
  await expect(page.getByRole('button',{name:'Save cost',exact:true})).toBeEnabled();
  await page.getByRole('link',{name:'Fixture Reports',exact:true}).click();await expect(page).toHaveURL(/view=reports/);await expect(page.getByRole('heading',{name:'Reports',exact:true})).toBeVisible();await page.goBack();
  await expect(page.getByLabel('Cost amount',{exact:true})).toHaveValue('45');await expect(page.getByLabel('Currency',{exact:true})).toHaveValue('CAD');
});
test('device storage failure prevents a network write',async({page,context})=>{
  const proof=await fixture(context);await start(page);
  await page.evaluate(()=>{indexedDB.open=()=>{throw Error('Device storage unavailable');};});
  await page.getByLabel('Cost amount',{exact:true}).fill('20');await expect(page.getByText('Device storage unavailable',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Save cost',exact:true})).toBeDisabled();expect(proof.calls).toHaveLength(0);
});
test('archived copies remain read-only',async({page,context})=>{
  const proof=await fixture(context,{archived:true});await page.goto(url);
  await expect(page.getByText(/This copy is archived/)).toBeVisible();await expect(page.getByLabel('Cost amount',{exact:true})).toBeDisabled();expect(proof.calls).toHaveLength(0);
});
test('account change clears private input and closes the editor',async({page,context})=>{
  await fixture(context);await start(page);await page.getByRole('button',{name:'Fixture sign out'}).click();
  await expect(page.getByText(/Cost editor closed because your account changed/)).toBeVisible();await expect(page.getByLabel('Cost amount',{exact:true})).toHaveCount(0);
});
