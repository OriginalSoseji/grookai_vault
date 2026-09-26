import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {spawn,execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
import {credential,verifiedClient,dir,accountId,safeError} from '../stripe/vendor_stripe_test_account_v1.mjs';
import {createVendorBillingRepository} from '../../apps/web/src/lib/billing/vendorBillingRepository.ts';
import {createVendorBillingService} from '../../apps/web/src/lib/billing/vendorBillingService.ts';
import {createVendorBillingHandlers} from '../../apps/web/src/lib/billing/vendorBillingHandlers.ts';
const stripe=await verifiedClient(),packages=JSON.parse(fs.readFileSync(path.join(dir,'packages.json'))),lab=JSON.parse(fs.readFileSync(path.join(dir,'billing-db-fixture.json')));
assert.equal(process.argv.length,2);assert.equal(lab.completed,undefined,'Do not restart a completed webhook proof');
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),{createClient}=require('@supabase/supabase-js');
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir','C:/gv_store_billing_20260919/.local/integration/vendor-order-notifications-v2','--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));assert.equal(cfg.API_URL,'http://127.0.0.1:24021');
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const config={scope:{accountId,livemode:false},catalog:packages.catalog,siteOrigin:'http://127.0.0.1:24440',secretKey:'',webhookSecret:''};
const repo=createVendorBillingRepository(admin),service=createVendorBillingService({repo,stripe,config,checkoutEnabled:false});
const handlers=createVendorBillingHandlers({authenticate:async()=>null,origin:()=>config.siteOrigin,runtime:()=>({stripe,config,service,status:async()=>{throw new Error('Not exposed');},portal:async()=>{throw new Error('Not exposed');}})});
const events=[];let pendingOutput='',child,stopping=false;const timers=new Set();
function persist(){fs.writeFileSync(path.join(dir,'webhook-db-receipt.json'),JSON.stringify({at:new Date().toISOString(),accountId,mode:'test',owner:lab.ownerId,events,productionWrites:0},null,2));}
const receiver=http.createServer(async(req,res)=>{try{
 assert.equal(req.headers.host,'127.0.0.1:24441');assert.equal(req.method,'POST');assert.equal(req.url,'/billing');
 let raw='';for await(const part of req){raw+=part;assert.ok(Buffer.byteLength(raw)<=262144);}assert.ok(config.webhookSecret);
 const signature=req.headers['stripe-signature'],event=stripe.webhooks.constructEvent(raw,signature,config.webhookSecret);assert.equal(event.livemode,false);
 const object=event.data.object;assert.equal(object.customer,lab.customerId,'Only this synthetic fixture may reach the DB proof');
 const entry={id:event.id,type:event.type,apiVersion:event.api_version,signed:true,payloadSha256:createHash('sha256').update(raw).digest('hex'),statuses:[]};events.push(entry);
 const dispatch=async()=>{const response=await handlers.webhook(new Request(config.siteOrigin+'/api/vendor-billing/webhook',{method:'POST',headers:{'stripe-signature':signature},body:raw}));entry.statuses.push(response.status);persist();return response;};
 const first=await dispatch();res.statusCode=first.status;res.end(await first.text());
 if(first.status===200){const duplicate=await dispatch();assert.equal(duplicate.status,200);}
 else{let attempts=0;const retry=async()=>{if(stopping)return;const response=await dispatch();if(response.status===503&&++attempts<8){const timer=setTimeout(()=>{timers.delete(timer);void retry();},2000);timers.add(timer);}};
  const timer=setTimeout(()=>{timers.delete(timer);void retry();},2000);timers.add(timer);}
 console.log(JSON.stringify({received:event.type,status:first.status}));
 }catch(error){if(!res.headersSent){res.statusCode=400;res.end('rejected');}console.log(JSON.stringify({webhookRejected:safeError(error)}));}});
const landing=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end('<!doctype html><title>Grookai local billing proof</title><h1>Stripe sandbox return</h1><p>Verified webhook and database enrollment are being checked. This return page grants no access.</p>');});
await new Promise((r,j)=>{receiver.once('error',j);receiver.listen(24441,'127.0.0.1',r);});await new Promise((r,j)=>{landing.once('error',j);landing.listen(24440,'127.0.0.1',r);});
const env={};for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC'])if(process.env[key])env[key]=process.env[key];env.STRIPE_API_KEY=credential();
child=spawn(path.join(dir,'stripe-cli-1.51.1/stripe.exe'),['listen','--skip-update','--latest','--events','checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed','--forward-to','http://127.0.0.1:24441/billing','--config',path.join(dir,'cli-db-config.toml')],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});delete env.STRIPE_API_KEY;
function consume(chunk){pendingOutput+=chunk.toString();const found=pendingOutput.match(/whsec_[A-Za-z0-9]+/);if(found&&!config.webhookSecret){config.webhookSecret=found[0];console.log('Actual Stripe -> isolated DB webhook listener ready.');}pendingOutput=pendingOutput.slice(-4096);}
child.stdout.on('data',consume);child.stderr.on('data',consume);child.once('exit',code=>{console.log(JSON.stringify({listenerExited:code}));receiver.close();landing.close();});
const stop=()=>{stopping=true;for(const timer of timers)clearTimeout(timer);child.kill();receiver.closeAllConnections();receiver.close();landing.closeAllConnections();landing.close();};process.on('SIGINT',stop);process.on('SIGTERM',stop);
