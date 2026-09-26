// Explicit existing-account sandbox tooling. Never imported by application/runtime
// builds or offline proof runners. Real Stripe test credential stays DPAPI-encrypted.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';import {createRequire} from 'node:module';
import {STRIPE_BILLING_API_VERSION} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const dir=path.join(root,'.local/integration/stripe-account-20260922');
export const accountId='acct_1UIUSYEXmSPisC0R';
const require=createRequire(path.join(root,'apps/web/package.json')),Stripe=require('stripe');
export function credential(){
 assert.equal(process.platform,'win32','Use the existing Windows DPAPI credential');
 const ciphertext=fs.readFileSync(path.join(dir,'stripe-test-key.dpapi'),'utf8');assert.ok(/^[a-f0-9]+$/i.test(ciphertext),'Invalid encrypted credential');
 const secret=execFileSync('pwsh.exe',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop'; $secure=ConvertTo-SecureString ([Console]::In.ReadToEnd()); [Console]::Write([System.Net.NetworkCredential]::new('', $secure).Password)"],{input:ciphertext,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});
 assert.ok(/^sk_test_[A-Za-z0-9]+$/.test(secret),'Only a test credential is allowed');return secret;
}
export async function verifiedClient(){
 const stripe=new Stripe(credential(),{apiVersion:STRIPE_BILLING_API_VERSION,telemetry:false,maxNetworkRetries:0,timeout:10000});
 assert.equal((await stripe.accounts.retrieve(null)).id,accountId);assert.equal((await stripe.balance.retrieve()).livemode,false);return stripe;
}
export function safeError(error){return {type:error?.type??error?.name??'Error',code:typeof error?.code==='string'&&/^[a-z_]+$/.test(error.code)?error.code:null,
 message:'Sandbox proof failed; inspect the failed stage without logging credentials or provider payloads'};}
