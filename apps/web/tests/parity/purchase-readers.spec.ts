import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
const owner='00000000-0000-4000-8000-000000000001';
const vectors=JSON.parse(fs.readFileSync(path.resolve(process.cwd(),'../../test/fixtures/sales_purchase_web_v1.json'),'utf8'));
const purchase=()=>{
 const r=structuredClone(vectors.cases.find((c:{name:string})=>c.name==='exact receipt').args[0]);
 r.createdAt=new Date().toISOString();r.number=`GVB-${r.createdAt.slice(0,10).replaceAll('-','')}-${r.id.slice(0,8).toUpperCase()}`;
 return r;
};
async function fixture(page:Page,{malformed=false}={}){
 const buy=purchase(),stamp=buy.createdAt;
 if(malformed)buy.purchaseMinor++;
 const sale={version:1,id:'22222222-2222-4222-8222-222222222222',number:`GV-${stamp.slice(0,10).replaceAll('-','')}-22222222`,createdAt:stamp,storeName:'Sample shop',customerName:'Sample buyer',method:'Cash',items:[{description:'Sold card',quantity:1,unitMinor:1000,lineMinor:1000}],subtotalMinor:1000,discountMinor:0,taxMinor:0,totalMinor:1000,note:'',sourceDispositionId:null};
 const book={version:1,storeName:'Sample shop',customers:[],receipts:[{receipt:sale,customerId:null},{receipt:buy,customerId:null}]};
 const calls:string[]=[],batches:string[][]=[];
 await page.route('http://127.0.0.1:54321/**',route=>{
  const routePath=new URL(route.request().url()).pathname;
  if(routePath.includes('/rpc/')){
   calls.push(routePath);expect(routePath).toBe('/rest/v1/rpc/vendor_receipt_book_read_v1');
   return route.fulfill({json:{ownerId:owner,revision:1,book}});
  }
  return route.fulfill({json:routePath.endsWith('/user')?{id:owner,aud:'authenticated',email:'fixture@example.test',created_at:stamp}:{}});
 });
 await page.route('**/api/sales/desk?**',route=>{
  expect(route.request().method()).toBe('GET');expect(new URL(route.request().url()).searchParams.get('action')).toBe('book');
  return route.fulfill({json:{ownerId:owner,book}});
 });
 await page.route('**/api/sales/costs?**',route=>{
  expect(route.request().method()).toBe('GET');batches.push(new URL(route.request().url()).searchParams.getAll('id'));
  return route.fulfill({json:{ownerId:owner,snapshots:[]}});
 });
 return {buy,sale,book,calls,batches};
}
for(const width of [384,1440])test(`mixed report separates purchases and preserves sale coverage at ${width}px`,async({page},info)=>{
 const proof=await fixture(page);await page.setViewportSize({width,height:900});await page.goto('/visual-fixtures/vendor-workspace?view=profit');
 await expect(page.getByRole('link',{name:proof.buy.number,exact:true})).toBeVisible();
 const metric=(label:string)=>page.locator('small').filter({hasText:new RegExp(`^${label}$`)}).locator('..');
 await expect(metric('Item sales')).toContainText('$10.00');await expect(metric('Units sold')).toContainText('1');
 await expect(metric('Average sale')).toContainText('$10.00');await expect(metric('Inventory purchases')).toContainText('$6.50');
 await expect(metric('Paid out')).toContainText('$6.50');await expect(page.getByText('0 of 1 item lines covered',{exact:true})).toBeVisible();
 expect(proof.batches).toEqual([[proof.sale.id]]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const axe=await new AxeBuilder({page}).include('[aria-label="Reports"]').analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
 await page.screenshot({path:info.outputPath(`purchase-report-${width}.png`),fullPage:true});
 await page.getByText('Filter dates, receipts or payment method',{exact:true}).click();await page.getByLabel('Find receipt or customer',{exact:true}).fill('GVB-');
 await expect(metric('Item sales')).toContainText('$0.00');await expect(page.getByText('0 of 0 item lines covered',{exact:true})).toBeVisible();
});
for(const width of [384,1440])test(`purchase receipt opens, shares privately and backs up unchanged at ${width}px`,async({page,context},info)=>{
 const proof=await fixture(page);await context.grantPermissions(['clipboard-read','clipboard-write']);await page.setViewportSize({width,height:900});
 await page.goto('/visual-fixtures/vendor-workspace?view=receipts');await page.getByRole('button',{name:new RegExp(proof.buy.number)}).click();
 await expect(page.getByRole('heading',{name:'Purchase receipt',exact:true})).toBeVisible();
 await expect(page.locator('.rd-editor pre')).toContainText('Total paid to seller: $6.50');
 await expect(page.getByRole('heading',{name:'Private purchase note',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Copy receipt text',exact:true}).click();
 const copied=await page.evaluate(()=>navigator.clipboard.readText());expect(copied).toContain('PURCHASE RECEIPT');expect(copied).not.toContain(proof.buy.note);
 await expect(page.getByText('Send directly from Grookai',{exact:true})).toHaveCount(0);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Back up records',exact:true}).click();
 const saved=await download;const file=await saved.path();expect(JSON.parse(fs.readFileSync(file!,'utf8'))).toEqual(proof.book);
 expect(proof.calls.length).toBeGreaterThan(0);expect(new Set(proof.calls)).toEqual(new Set(['/rest/v1/rpc/vendor_receipt_book_read_v1']));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const axe=await new AxeBuilder({page}).include('.rd').analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
 await page.screenshot({path:info.outputPath(`purchase-receipt-${width}.png`),fullPage:true});
});
test('invalid purchase evidence produces a recoverable report error before rendering',async({page})=>{
 await fixture(page,{malformed:true});await page.goto('/visual-fixtures/vendor-workspace?view=reports');
 await expect(page.getByRole('region',{name:'Reports',exact:true}).getByRole('alert')).toContainText('Reports could not refresh');await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:/GVB-/})).toHaveCount(0);
});
