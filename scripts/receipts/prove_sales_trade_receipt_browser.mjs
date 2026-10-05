// Synthetic offline receipt proof. No network, customer records or payment actions.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createReceipt,emptyBook} from '../../apps/web/src/lib/receipts/receiptBook.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out=root+'artifacts/receipts';
const {chromium,expect}=createRequire(root+'apps/web/package.json')('@playwright/test');
const browser=await chromium.launch({headless:true}),errors=[],network=[];
const line={description:'Customer <Charizard>',quantity:1,valueMinor:10000,rateBps:8000,creditMinor:8000,cardId:null,printingId:null,condition:null,addToVault:false,printingGvId:null,instanceId:null,gvviId:null};
let failure;
try{
 for(const [label,price,balance] of [['payment','100',2000],['even','80',0],['payout','70',-1000]]){
  const r={...createReceipt({storeName:'Synthetic trade shop',confirmed:true,method:'Cash',customer:{name:'Synthetic customer',email:'',phone:'',wants:'',notes:''},items:[{description:'Purchased card',quantity:'1',price}],note:'',tax:'0'},'9fb3cdb2-93da-4491-a570-7f93c0ab5f19','2026-10-03T12:00:00.000Z'),tradeIn:{version:1,items:[line],totalValueMinor:10000,totalCreditMinor:8000,balanceMinor:balance}};
  const book={...emptyBook(),receipts:[{receipt:r,customerId:null}]},fixture=out+'/trade-'+label+'-backup.json';
  fs.writeFileSync(fixture,JSON.stringify(book));
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1194,height:834}});
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith('file:'))return route.continue();network.push(url);return route.abort();});
  const page=await context.newPage();
  await page.goto(pathToFileURL(out+'/Grookai-Receipt-Desk.html').href);
  await page.getByLabel('Restore receipt backup').setInputFiles(fixture);
  await expect(page.getByText('Backup restored on this device.',{exact:true})).toBeVisible();
  await page.getByLabel('Find a receipt or customer').fill('Charizard');
  await expect(page.locator('[data-open]')).toHaveCount(1);
  await page.locator('[data-open]').click();
  await expect(page.getByRole('heading',{name:'Trade-in breakdown'})).toBeVisible();
  const expected=balance>0?'Payment received: $20.00':balance<0?'Paid to customer: $10.00':'Even trade · no money due';
  await expect(page.locator('pre')).toContainText('$100.00 × 80% = $80.00 credit');
  await expect(page.locator('pre')).toContainText(expected);
  assert.equal(await page.locator('charizard').count(),0);
  await page.screenshot({path:out+'/trade-'+label+'-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:out+'/trade-'+label+'-mobile.png',fullPage:true});
  const backupPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Back up records'}).click();
  const backup=await backupPromise;await backup.saveAs(out+'/trade-'+label+'-roundtrip.json');
  assert.deepEqual(JSON.parse(fs.readFileSync(out+'/trade-'+label+'-roundtrip.json')).receipts[0].receipt.tradeIn,r.tradeIn);
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download receipt',exact:true}).click();
  const download=await downloadPromise;await download.saveAs(out+'/trade-'+label+'-receipt.html');
  const html=fs.readFileSync(out+'/trade-'+label+'-receipt.html','utf8');assert.ok(html.includes(expected));assert.ok(html.includes('&lt;Charizard&gt;'));
  const popupPromise=context.waitForEvent('page');await page.getByRole('button',{name:'Print / save PDF',exact:true}).click();
  const popup=await popupPromise;await expect(popup.locator('body')).toContainText(expected);await popup.close();
  await page.reload();await page.locator('[data-open]').click();await expect(page.locator('pre')).toContainText(expected);
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
}catch(e){failure=e;}finally{await browser.close();}
const proof={status:failure?'failed':'passed',at:new Date().toISOString(),actualBrowser:true,externalNetworkRequests:network.length,realCustomerData:false,checks:['cash balance, even trade and customer payout','full card/value/percentage/credit breakdown','HTML injection escaped','incoming-card search','desktop/mobile no overflow','backup roundtrip preserves snapshot','download, print and reload preserve trade terms'],error:failure?.stack};
fs.writeFileSync(out+'/trade-browser-proof.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));if(failure)process.exitCode=1;
