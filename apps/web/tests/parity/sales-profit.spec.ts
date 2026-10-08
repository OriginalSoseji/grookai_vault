import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const owner='00000000-0000-4000-8000-000000000001',copy='22222222-2222-4222-8222-222222222222';
const stamp=new Date().toISOString(),id=(i:number)=>`11111111-1111-4111-8111-${String(i).padStart(12,'0')}`;
const receipt=(i:number)=>({id:id(i),number:'GV-PROFIT-'+i,createdAt:stamp,customerName:'Sample collector '+i,method:'Cash',items:[{description:'Sample card '+i,quantity:1,unitMinor:2000}],subtotalMinor:2000,discountMinor:0,taxMinor:100,totalMinor:2100});
const snapshot=(i:number)=>({version:1,receiptId:id(i),soldAt:stamp,salesCurrency:'USD',lines:[{index:0,instanceId:copy,quantity:1,salesMinor:'2000',status:'known',cost:{amount:'12.00',currency:'USD',minor:'1200',status:'known'}}]});
async function fixture(page:Page,options:{count?:number;fail?:boolean;secondFail?:boolean;hold?:boolean;badBookOwner?:boolean;badCostOwner?:boolean}={}){
 const count=options.count??2,calls:string[]=[],batches:string[][]=[];let release=()=>{};
 const held=new Promise<void>(resolve=>{release=resolve;});
 await page.route('http://127.0.0.1:54321/**',route=>route.fulfill({json:new URL(route.request().url()).pathname.endsWith('/user')?{id:owner,aud:'authenticated',email:'profit@example.test',created_at:stamp}:{}}));
 await page.route('**/api/sales/desk?**',route=>{
  calls.push(route.request().method());const params=new URL(route.request().url()).searchParams;
  expect(params.get('action')).toBe('book');expect(params.get('owner')).toBe(owner);
  return route.fulfill({json:{ownerId:options.badBookOwner?copy:owner,book:{storeName:'Fixture',customers:[],receipts:Array.from({length:count},(_,i)=>({receipt:receipt(i+1)}))}}});
 });
 await page.route('**/api/sales/costs?**',async route=>{
  calls.push(route.request().method());const params=new URL(route.request().url()).searchParams,ids=params.getAll('id');batches.push(ids);expect(params.get('owner')).toBe(owner);
  if(options.hold)await held;
  if(options.fail || options.secondFail && batches.length===2)return route.fulfill({status:503,json:{error:'Unavailable'}});
  return route.fulfill({json:{ownerId:options.badCostOwner?copy:owner,snapshots:ids.filter(value=>count>2 || value===id(1)).map(value=>snapshot(Number(value.slice(-12))))}});
 });
 return {calls,batches,release};
}
const panel=(page:Page)=>page.getByRole('region',{name:'Private profit and cost coverage'});
for(const width of [384,1440])test(`private covered profit reconciles and fits ${width}px`,async({page},info)=>{
 const proof=await fixture(page);await page.setViewportSize({width,height:900});await page.goto('/visual-fixtures/vendor-workspace?view=profit');
 const region=panel(page);await expect(region.getByText('$8.00',{exact:true})).toBeVisible();await expect(region.getByText('1 of 2 item lines covered',{exact:true})).toBeVisible();
 await region.getByText('Why some sales are excluded',{exact:true}).click();await expect(region.getByText('No cost recorded at sale',{exact:true})).toBeVisible();
 expect(proof.calls.every(method=>method==='GET')).toBe(true);expect(proof.batches).toHaveLength(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const axe=await new AxeBuilder({page}).include('[aria-label="Reports"]').analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
 await page.screenshot({path:info.outputPath(`profit-${width}.png`),fullPage:true});
});
test('failed cost history does not become missing cost or zero profit',async({page})=>{
 await fixture(page,{fail:true});await page.goto('/visual-fixtures/vendor-workspace?view=profit');
 await expect(panel(page).getByRole('alert')).toContainText('Private cost history could not load');await expect(panel(page).getByText('Profit on covered items',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('link',{name:'GV-PROFIT-1',exact:true})).toBeVisible();
});
test('the same receipt filters apply to cost coverage',async({page})=>{
 await fixture(page);await page.goto('/visual-fixtures/vendor-workspace?view=profit');await expect(panel(page).getByText('$8.00',{exact:true})).toBeVisible();
 await page.getByText('Filter dates, receipts or payment method',{exact:true}).click();await page.getByLabel('Find receipt or customer',{exact:true}).fill('Sample collector 2');
 await expect(panel(page).getByText('0 of 1 item lines covered',{exact:true})).toBeVisible();await expect(panel(page).getByText('Unavailable',{exact:true})).toBeVisible();
 await page.getByLabel('Find receipt or customer',{exact:true}).fill('no match');await expect(panel(page).getByText('No recorded item sales in this selection.',{exact:true})).toBeVisible();
 await page.getByLabel('Find receipt or customer',{exact:true}).fill('');await page.getByLabel('Payment method',{exact:true}).selectOption('Split payment');await expect(panel(page).getByText('0 of 0 item lines covered',{exact:true})).toBeVisible();
 await page.getByLabel('Payment method',{exact:true}).selectOption('');await expect(panel(page).getByText('1 of 2 item lines covered',{exact:true})).toBeVisible();
 await page.getByLabel('From',{exact:true}).fill('2060-01-01');await page.getByLabel('Through',{exact:true}).fill('2060-01-02');await expect(panel(page).getByText('0 of 0 item lines covered',{exact:true})).toBeVisible();
});
test('a later failed batch cannot produce partial profit',async({page})=>{
 const proof=await fixture(page,{count:101,secondFail:true});await page.goto('/visual-fixtures/vendor-workspace?view=profit');await expect(panel(page).getByRole('alert')).toBeVisible();
 expect(proof.batches.map(batch=>batch.length)).toEqual([100,1]);expect(new Set(proof.batches.flat()).size).toBe(101);await expect(panel(page).getByText('Profit on covered items',{exact:true})).toHaveCount(0);
});
test('an account change hides a late cost response',async({page})=>{
 const proof=await fixture(page,{hold:true});await page.goto('/visual-fixtures/vendor-workspace?view=profit');await expect(panel(page).getByText('Loading recorded costs…',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Fixture sign out'}).click();proof.release();await expect(page.getByRole('heading',{name:'Reports closed',exact:true})).toBeVisible();await expect(panel(page)).toHaveCount(0);await expect(page.getByText('$8.00',{exact:true})).toHaveCount(0);
});
test('a receipt book for another owner is rejected before rendering',async({page})=>{
 const proof=await fixture(page,{badBookOwner:true});await page.goto('/visual-fixtures/vendor-workspace?view=profit');await expect(page.getByRole('region',{name:'Reports',exact:true}).getByRole('alert')).toContainText('Reports could not refresh');
 await expect(page.getByText('Sample collector 1',{exact:true})).toHaveCount(0);expect(proof.batches).toHaveLength(0);
});
test('a cost result for another owner never supplies profit',async({page})=>{
 await fixture(page,{badCostOwner:true});await page.goto('/visual-fixtures/vendor-workspace?view=profit');await expect(panel(page).getByRole('alert')).toBeVisible();await expect(panel(page).getByText('$8.00',{exact:true})).toHaveCount(0);
});
