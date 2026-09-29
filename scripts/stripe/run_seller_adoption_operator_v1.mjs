// Fixed founder-seller scope. Default planning is read-only. Production issuance
// requires a reviewed hash plus the actual qualified/deployed release receipts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createSellerAdoptionOperator } from './seller_adoption_operator_v1.mjs';
import { STRIPE_BILLING_API_VERSION } from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';

const [mode, filename, approvedHash] = process.argv.slice(2);
assert.ok((mode==='plan' && process.argv.length===3) ||
  (mode==='apply' && process.argv.length===5 && /^seller-approval-\d+\.private\.json$/.test(filename) && /^[a-f0-9]{64}$/.test(approvedHash)),
  'Usage: plan | apply <seller-approval-TIMESTAMP.private.json> <reviewed-sha256>');
const root=fileURLToPath(new URL('../../',import.meta.url));
const external='C:/grookai_vault_operator_artifacts/storefront_production_20260926';
const out=path.join(external,'seller-approval');
const migration='20260928213000_vendor_seller_adoption_v1.sql';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const migrationSha256=hash(fs.readFileSync(path.join(root,'supabase/migrations',migration)));
const target=JSON.parse(fs.readFileSync(path.join(external,'LIVE_SELLER_TARGET.private.json'),'utf8'));
for(const id of [target.ownerId,target.storeId]) assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
const scope={accountId:'acct_1UIUSYEXmSPisC0R',livemode:true}, connectedAccountId='acct_1UKfcYI49eSoal6p';
const {query,ref}=await import('file:///C:/gv_store_production_20260926/scripts/release/storefront_production_live_common_v1.mjs');
assert.equal(ref,'ycdxbpibncqcchqiihfz');
const read=sql=>query(`begin transaction read only; ${sql}; commit;`);
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();
const repo={
 async inspect(ownerId,storeId){
  assert.equal(ownerId,target.ownerId);assert.equal(storeId,target.storeId);
  const rows=await read(`select u.id,u.email,u.email_confirmed_at is not null as confirmed,s.id as store,
    exists(select 1 from public.vendor_seller_accounts where owner_id=u.id) as has_binding,
    coalesce((public.vendor_store_capabilities_v1(u.id)->>'store_app')::boolean,false)
     and exists(select 1 from public.vendor_store_rollout where app_enabled)
     and not exists(select 1 from public.vendor_account_financial_holds where owner_id=u.id) as eligible,
    to_regclass('public.vendor_seller_adoption_grants') is not null as grant_table
    from auth.users u join public.vendor_stores s on s.owner_id=u.id where u.id='${ownerId}'::uuid and s.id='${storeId}'::uuid`);
  assert.equal(rows.length,1,'Owner/store unavailable');const row=rows[0];
  const hasGrant=row.grant_table ? (await read(`select exists(select 1 from public.vendor_seller_adoption_grants where owner_id='${ownerId}'::uuid) as present`))[0].present : false;
  return {owner:{id:row.id,email:row.email,emailConfirmed:row.confirmed},storeId:row.store,eligible:row.eligible,hasBinding:row.has_binding,hasGrant};
 },
 async assertReleased(expected){
  assert.equal(expected,migrationSha256);
  assert.equal(git('status','--porcelain'),'','Issuance requires clean released source');
  const release=JSON.parse(fs.readFileSync(path.join(out,'release.private.json'),'utf8'));
  assert.equal(release.status,'passed');assert.equal(release.projectRef,ref);
  assert.equal(release.commit,git('rev-parse','HEAD'));assert.equal(release.migrationSha256,expected);
  const replayDir=path.join(root,'.local/integration/seller-adoption-v1/replay-409');
  const replayBytes=fs.readFileSync(path.join(replayDir,'receipt.json'));
  assert.equal(hash(replayBytes),release.fullReplayReceiptSha256);
  const replay=JSON.parse(replayBytes);assert.equal(replay.status,'passed');assert.equal(replay.fullReplay,true);
  assert.equal(replay.noOpPush,true);assert.equal(replay.migrations,409);
  const sources=Object.fromEntries(fs.readdirSync(path.join(root,'supabase/migrations')).filter(n=>n.endsWith('.sql')).sort()
    .map(n=>[n,hash(fs.readFileSync(path.join(root,'supabase/migrations',n)))]));
  assert.deepEqual(replay.sourceHashes,sources);
  assert.match(release.httpProofDirectory,/^http-proof-\d+$/);
  const httpBytes=fs.readFileSync(path.join(root,'.local/integration/seller-adoption-v1',release.httpProofDirectory,'receipt.json'));
  assert.equal(hash(httpBytes),release.authHttpReceiptSha256);
  const http=JSON.parse(httpBytes);assert.equal(http.status,'passed');assert.equal(http.realAuth,true);
  assert.equal(http.migrationSha256,expected);assert.equal(http.project,replay.project);
  assert.deepEqual(http.sourceHashes,sources);assert.equal(http.commit,release.commit);assert.equal(http.sourceDirty,false);
  const upgradeBytes=fs.readFileSync(path.join(root,'.local/integration/seller-adoption-v1/upgrade-proof/receipt.json'));
  assert.equal(hash(upgradeBytes),release.upgradeReceiptSha256);
  const upgrade=JSON.parse(upgradeBytes);assert.equal(upgrade.status,'passed');
  assert.equal(upgrade.fromMigrations,408);assert.equal(upgrade.toMigrations,409);
  assert.equal(upgrade.schemaParity,true);assert.equal(upgrade.retainedDataProof,true);
  assert.deepEqual(upgrade.sourceHashes,sources);
  // Verify the deployed alias instead of accepting a local release claim alone.
  const token=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'),'utf8')).token;
  const response=await fetch('https://api.vercel.com/v4/aliases/grookaivault.com?teamId=team_EFKFYSau9Gf8wEaix8zXgQZG',
    {headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,200);assert.equal((await response.json()).deploymentId,release.deploymentId);
  // Current production schema/security must equal the qualified full replay.
  const {snapshotSql,compareSnapshots}=await import('file:///C:/gv_store_billing_20260919/scripts/schema/vendor_billing_schema_v1.mjs');
  const remote=(await query(snapshotSql))[0].receipt,local=JSON.parse(fs.readFileSync(path.join(replayDir,'replayed.private.json')));
  assert.equal(remote.read_only,'on');assert.deepEqual(remote.LEDGER,local.LEDGER);
  assert.ok(remote.sanity.cards>=40000 && remote.sanity.sets>=150 && remote.sanity.traits>=5000);
  const audit=path.join(out,'apply-audit-'+Date.now());fs.mkdirSync(audit,{recursive:true});
  await compareSnapshots(remote,local,{reconcile:true,output:audit});
 },
 async issue(plan,evidence){
  assert.equal(plan.grant.ownerId,target.ownerId);assert.equal(plan.grant.storeId,target.storeId);
  assert.equal(plan.grant.connectedAccountId,connectedAccountId);
  const literal=value=>"'"+JSON.stringify(value).replaceAll("'","''")+"'::jsonb";
  // Only this transaction can write, and only via the governed service RPC.
  const rows=await query(`begin; set local role service_role;
    select public.vendor_seller_issue_adoption_v1(${literal(plan)},${literal(evidence)}) as result; commit;`);
  return rows[0].result;
 },
};
// No secret in argv, environment, logs, source, or plan artifacts.
const cipher=fs.readFileSync(path.join(external,'seller-verification-key/stripe-live-verification.dpapi'),'utf8');
const decrypted=spawnSync('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-Command',
 '$ErrorActionPreference="Stop"; $s=ConvertTo-SecureString -String ([Console]::In.ReadToEnd()); $p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try {[Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($p))} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)}'],
 {input:cipher,encoding:'utf8',windowsHide:true,timeout:15000});
assert.equal(decrypted.status,0,'Encrypted Stripe credential unavailable');assert.match(decrypted.stdout,/^rk_live_[A-Za-z0-9]+$/);
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),Stripe=require('stripe');
const stripe=new Stripe(decrypted.stdout,{apiVersion:STRIPE_BILLING_API_VERSION,telemetry:false,maxNetworkRetries:0,timeout:10000});decrypted.stdout='';
const operator=createSellerAdoptionOperator({projectRef:ref,migrationSha256,scope,stripe,repo});
fs.mkdirSync(out,{recursive:true});
try{
 if(mode==='plan'){
  const plan=await operator.plan({ownerId:target.ownerId,storeId:target.storeId,connectedAccountId});
  const name=`seller-approval-${Date.now()}.private.json`;
  fs.writeFileSync(path.join(out,name),JSON.stringify(plan,null,2),{flag:'wx'});
  console.log(JSON.stringify({status:'planned',file:name,sha256:plan.sha256,expiresAt:plan.expiresAt,productionWrites:0}));
 }else{
  const plan=JSON.parse(fs.readFileSync(path.join(out,filename),'utf8'));
  assert.equal(plan.grant?.connectedAccountId,connectedAccountId);assert.equal(plan.grant?.ownerId,target.ownerId);assert.equal(plan.grant?.storeId,target.storeId);
  const result=await operator.apply(plan,approvedHash);
  fs.writeFileSync(path.join(out,`issued-${Date.now()}.private.json`),JSON.stringify(result,null,2),{flag:'wx'});
  console.log(JSON.stringify(result));
 }
}catch{console.error('Seller approval stopped; no successful issuance receipt. Inspect qualified release and current account evidence before retrying.');process.exitCode=1;}
