import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const owner='00000000-0000-4000-8000-000000000001';
const id=(i:number)=>`22222222-2222-4222-8222-${String(i).padStart(12,'0')}`;
const region=(page:Page)=>page.getByRole('region',{name:'Private cost review',exact:true});
const url='/visual-fixtures/vendor-workspace?view=cost-review&review=cost';
async function fixture(page:Page,options:{count?:number;secondFail?:boolean;hold?:boolean;wrongOwner?:boolean}={}) {
 const count=options.count??6,batches:string[][]=[];let fail=false,release=()=>{};
 const held=new Promise<void>(resolve=>{release=resolve;});
 await page.route('http://127.0.0.1:54321/**',route=>route.fulfill({json:new URL(route.request().url()).pathname.endsWith('/user')?{id:owner,aud:'authenticated',email:'cost-review@example.test',created_at:'2026-10-07T00:00:00Z'}:{}}));
 await page.route('**/api/sales/desk?**',route=>route.fulfill({json:{owner,cards:Array.from({length:count},(_,i)=>({instanceId:id(i),gvviId:`GVVI-REVIEW-${i}`,name:`Sample copy ${i}`,set_code:'SAMPLE',number:String(i),condition:'NM',printing:'Normal',askingAmount:null,askingCurrency:null})),next:null}}));
 await page.route('**/api/vault/cost-review?**',async route=>{
  expect(route.request().method()).toBe('GET');const params=new URL(route.request().url()).searchParams;
  expect(params.get('owner')).toBe(owner);const ids=params.get('ids')!.split(',');batches.push(ids);
  if(options.hold)await held;
  if(fail || options.secondFail && batches.length===2)return route.fulfill({status:503,json:{error:'Unavailable'}});
  return route.fulfill({json:{ownerId:options.wrongOwner?id(99):owner,editEnabled:true,copies:ids.map(instanceId=>{
   const i=Number(instanceId.slice(-12));const [status,amount,currency,minor]=[
    ['missing_amount',null,null,null],['missing_currency','12.00',null,null],['known','0','USD','0'],
    ['known','3','CAD','300'],['invalid_amount','0.001','USD',null],['known','8','USD','800'],
   ][i%6];return {instanceId,archived:false,cost:{status,amount,currency,minor}};
  })}});
 });
 return {batches,release,setFail:(value:boolean)=>{fail=value;}};
}
for(const width of [384,768,1440])test(`private cost review fits ${width}px with explicit coverage`,async({page},info)=>{
 const proof=await fixture(page);await page.setViewportSize({width,height:900});await page.goto(url);
 await expect(region(page).getByText('3 of 6 included copies have a recorded cost and currency.',{exact:true})).toBeVisible();
 await expect(region(page).getByRole('link',{name:/^Review cost/})).toHaveCount(3);
 await region(page).getByLabel('Cost state').selectOption('known');
 await expect(region(page).getByText('USD 0.00',{exact:true})).toBeVisible();await expect(region(page).getByText('CAD 3.00',{exact:true})).toBeVisible();
 expect(proof.batches.map(b=>b.length)).toEqual([6]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const axe=await new AxeBuilder({page}).include('[aria-label="Private cost review"]').analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
 await region(page).screenshot({path:info.outputPath(`cost-review-${width}.png`)});
});
test('missing currency shows original amount and links to existing editor with return context',async({page})=>{
 await fixture(page);await page.goto(url+'&q=Pikachu&game=pokemon&price=unpriced');
 await region(page).getByLabel('Cost state').selectOption('missingCurrency');
 await expect(region(page).getByText('Recorded amount: 12.00')).toBeVisible();
 const href=new URL((await region(page).getByRole('link',{name:/^Review cost/}).getAttribute('href'))!,'http://fixture.invalid');
 expect(href.pathname).toBe('/vault/gvvi/GVVI-REVIEW-1');expect(href.hash).toBe('#private-cost');expect(href.searchParams.get('inventoryQuery')).toBe('Pikachu');expect(href.searchParams.get('inventoryCostReview')).toBe('1');expect(href.searchParams.get('inventoryPrice')).toBe('unpriced');
});
test('failed refresh clears old coverage and retry restores it',async({page})=>{
 const proof=await fixture(page);await page.goto(url);await expect(region(page).getByText(/^3 of 6/)).toBeVisible();
 proof.setFail(true);await region(page).getByRole('button',{name:'Refresh costs'}).click();await expect(region(page).getByRole('alert')).toBeVisible();await expect(region(page).getByText(/^3 of 6/)).toHaveCount(0);
 proof.setFail(false);await region(page).getByRole('button',{name:'Try again'}).click();await expect(region(page).getByText(/^3 of 6/)).toBeVisible();
});
test('later batch failure cannot produce partial coverage',async({page})=>{
 const proof=await fixture(page,{count:101,secondFail:true});await page.goto(url);await expect(region(page).getByRole('alert')).toBeVisible();expect(proof.batches.map(b=>b.length)).toEqual([100,1]);await expect(region(page).getByRole('link',{name:/^Review cost/})).toHaveCount(0);
});
test('account closure discards late private reads',async({page})=>{
 const proof=await fixture(page,{hold:true});await page.goto(url);await expect(region(page).getByText('Loading private costs…')).toBeVisible();await page.getByRole('button',{name:'Fixture sign out'}).click();proof.release();await expect(page.getByRole('heading',{name:'Inventory closed'})).toBeVisible();await expect(region(page)).toHaveCount(0);
});
test('wrong owner never supplies coverage',async({page})=>{
 await fixture(page,{wrongOwner:true});await page.goto(url);await expect(region(page).getByRole('alert')).toBeVisible();await expect(region(page).getByRole('link',{name:/^Review cost/})).toHaveCount(0);
});
test('entry off performs no private cost reads',async({page})=>{
 const proof=await fixture(page);await page.goto(url+'&costEnabled=0');await expect(page.getByRole('link',{name:/^Edit copy/})).toHaveCount(6);await expect(region(page)).toHaveCount(0);expect(proof.batches).toHaveLength(0);
});
test('local search changes queue without changing coverage or fetching again',async({page})=>{
 const proof=await fixture(page);await page.goto(url);await region(page).getByLabel('Find an included copy').fill('GVVI-REVIEW-1');await expect(region(page).getByRole('link',{name:/^Review cost/})).toHaveCount(1);await expect(region(page).getByText(/^3 of 6/)).toBeVisible();expect(proof.batches).toHaveLength(1);
});
test('review replaces duplicate inventory rows and closing it restores the same search',async({page})=>{
 await fixture(page);await page.goto(url+'&q=Pikachu&price=unpriced');
 await expect(region(page).getByText(/^3 of 6/)).toBeVisible();await expect(page.getByRole('link',{name:/^Edit copy/})).toHaveCount(0);
 await page.getByRole('link',{name:'Hide cost review',exact:true}).click();
 await expect(region(page)).toHaveCount(0);await expect(page.getByRole('link',{name:/^Edit copy/})).toHaveCount(6);
 expect(new URL(page.url()).searchParams.get('q')).toBe('Pikachu');expect(new URL(page.url()).searchParams.get('price')).toBe('unpriced');
 await page.getByRole('link',{name:'Review costs for shown copies',exact:true}).click();await expect(region(page).getByText(/^3 of 6/)).toBeVisible();
});
