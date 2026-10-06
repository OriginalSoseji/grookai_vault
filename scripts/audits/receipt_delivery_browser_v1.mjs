// Actual receipt-desk DOM proof, loopback modules and synthetic delivery responses only.
import fs from 'node:fs';import http from 'node:http';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {randomUUID,createHash} from 'node:crypto';
import {createReceipt,emptyBook,saveSale} from '../../apps/web/src/lib/receipts/receiptBook.mjs';
const root=process.cwd().replaceAll('\\','/');assert.equal(root,'C:/gv_receipt_delivery_20261005');
const require=createRequire(root+'/apps/web/package.json'),{chromium}=require('@playwright/test');
const out='C:/grookai_vault_operator_artifacts/receipt_delivery_20261005/browser-'+Date.now();fs.mkdirSync(out);
const customer={name:'Synthetic buyer',email:'buyer@fixture.invalid',phone:'+15555550123',wants:'Private wish list',notes:'Private CRM note'};
const receipt=createReceipt({storeName:'Grookai Market',confirmed:true,method:'Cash',customer,items:[{description:'Pikachu · Near Mint',quantity:'1',price:'42'}],discount:'0',tax:'0',note:''},randomUUID(),'2026-10-05T12:00:00.000Z');
const book=saveSale(emptyBook(),receipt,customer,randomUUID());
const files=['receiptDesk.mjs','receiptBook.mjs','tradeReceipt.mjs','receiptDelivery.mjs','receiptDesk.css'];
const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/modules/receiptDesk.css"><style>body{margin:0;background:#101c17;color:#eef5ef;font:16px system-ui}</style></head><body><main id="desk"></main><script type="module">
import {mountReceiptDesk} from '/modules/receiptDesk.mjs';
const book=${JSON.stringify(book)};window.proof={requests:[],sends:0};let sent=false,status='accepted';
mountReceiptDesk(document.querySelector('#desk'),{cloud:{book,save:async()=>{throw Error('Not a sale-write test');}},delivery:async(body,id)=>{
 if(!body&&!id)return {capabilities:{email:true,sms:true}};
 if(body){window.proof.requests.push(body);await new Promise(r=>setTimeout(r,100));if(body.refreshReceiptId)status='delivered';else if(!sent){sent=true;window.proof.sends++;}}
 return {deliveries:sent?[{id:'synthetic-delivery',receiptId:${JSON.stringify(receipt.id)},channel:'email',destination:'buyer@fixture.invalid',status}]:[]};
}});</script></body></html>`;
const server=http.createServer((req,res)=>{
 const name=req.url?.startsWith('/modules/')?req.url.slice(9):null;
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 if(!files.includes(name)){res.statusCode=404;res.end();return;}
 res.setHeader('Content-Type',name.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(root+'/apps/web/src/lib/receipts/'+name));
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(65410,'127.0.0.1',resolve);});
const browser=await chromium.launch({headless:true});const errors=[];
try {
 for(const width of [1280,390]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin==='http://127.0.0.1:65410'?route.continue():route.abort());
  await page.goto('http://127.0.0.1:65410');
  await page.getByRole('button',{name:/Synthetic buyer/}).click();
  const send=page.getByRole('button',{name:'Send email receipt',exact:true});await send.waitFor();
  await send.click();await page.getByRole('alert').filter({hasText:'Confirm that the customer requested'}).waitFor();
  assert.equal(await page.evaluate(()=>window.proof.sends),0);
  await page.locator('[data-receipt-consent]').check();
  await send.evaluate(b=>{b.click();b.click();});
  await page.getByText('Accepted by sending service · delivery not yet confirmed',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.proof.sends),1);
  await send.click();assert.equal(await page.evaluate(()=>window.proof.sends),1);
  const ids=await page.evaluate(()=>window.proof.requests.filter(r=>r.requestId).map(r=>r.requestId));assert.equal(new Set(ids).size,1);
  await page.getByRole('button',{name:'Check delivery status',exact:true}).click();await page.getByText('Delivered',{exact:true}).waitFor();
  await page.locator('[name=sendEmail]').fill('other@fixture.invalid');assert.equal(await page.locator('[data-receipt-consent]').isChecked(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('[data-direct-delivery]').screenshot({path:out+'/delivery-'+width+'.png'});
  await page.screenshot({path:out+'/desk-'+width+'.png',fullPage:true});await page.close();
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/receipt.json',JSON.stringify({at:new Date().toISOString(),status:'passed',viewports:[1280,390],realDOM:true,providerMocked:true,productionRequests:0,checks:['explicit consent','double-click exclusion','stable retry ID','accepted versus delivered','recipient-change reconfirmation','no horizontal overflow'],sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(root+'/apps/web/src/lib/receipts/'+f)).digest('hex')]))},null,2));
 console.log(JSON.stringify({status:'passed',out}));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
