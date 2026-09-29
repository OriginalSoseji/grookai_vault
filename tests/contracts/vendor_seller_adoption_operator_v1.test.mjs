import test from 'node:test';
import assert from 'node:assert/strict';
import { createSellerAdoptionOperator, adoptionPlanHash } from '../../scripts/stripe/seller_adoption_operator_v1.mjs';
const ownerId='11111111-1111-4111-8111-111111111111',storeId='22222222-2222-4222-8222-222222222222';
function fixture(){
 let now=1800000000,writes=0,reads=0,released=true,revoked=false;
 const current={owner:{id:ownerId,email:'vendor@example.invalid',emailConfirmed:true},storeId,eligible:true,hasBinding:false,hasGrant:false};
 const account={id:'acct_seller',object:'account',email:current.owner.email,created:now-1000,metadata:{},
  controller:{type:'application',is_controller:true,fees:{payer:'account'},losses:{payments:'stripe'},requirement_collection:'stripe',stripe_dashboard:{type:'full'}}};
 const stripe={accounts:{async retrieve(id){reads++;return id?account:{object:'account',id:'acct_platform'}}},
  balance:{async retrieve(){reads++;return {object:'balance',livemode:true}}}};
 const repo={async inspect(){return current},async assertReleased(){assert.ok(released,'Release unverified')},
  async issue(plan,evidence){writes++;assert.equal(evidence.grantId,plan.grant.id);return {id:plan.grant.id,approval_sha256:plan.sha256,enabled:!revoked}}};
 const context={projectRef:'synthetic',migrationSha256:'a'.repeat(64),scope:{accountId:'acct_platform',livemode:true},repo,stripe,clock:()=>now};
 const operator=createSellerAdoptionOperator(context),target={ownerId,storeId,connectedAccountId:'acct_seller'};
 return {operator,current,account,repo,context,target,get writes(){return writes},get reads(){return reads},
  advance(seconds){now+=seconds},release(value){released=value},revoke(){revoked=true}};
}
test('planning performs provider GETs but never writes and omits raw identity data',async()=>{
 const f=fixture(),plan=await f.operator.plan(f.target);assert.equal(f.reads,4);assert.equal(f.writes,0);
 assert.ok(!JSON.stringify(plan).includes(f.current.owner.email));assert.equal(plan.expiresAt-plan.createdAt,1800);
 const result=await f.operator.apply(plan,plan.sha256);assert.equal(f.reads,8);assert.equal(f.writes,1);
 assert.equal(result.bindingCreated,false);assert.equal(result.providerWrites,0);
});
for(const [name,change] of [
 ['project',p=>p.projectRef='foreign'],['migration',p=>p.migrationSha256='b'.repeat(64)],
 ['owner',p=>p.grant.ownerId=storeId],['seller',p=>p.grant.connectedAccountId='acct_foreign'],
 ['mode',p=>p.grant.livemode=false],['duration',p=>p.grant.expiresAt++],
 ['extra field',p=>p.enabled=true],['missing field',p=>delete p.providerEvidenceSha256],
])test('tampering rejects '+name+' before external apply work',async()=>{
 const f=fixture(),p=await f.operator.plan(f.target);change(p);await assert.rejects(f.operator.apply(p,p.sha256));assert.equal(f.writes,0);assert.equal(f.reads,4);
});
for(const [name,change] of [
 ['expired plan',f=>f.advance(1800)],['unconfirmed email',f=>f.current.owner.emailConfirmed=false],
 ['changed owner email',f=>f.current.owner.email='changed@example.invalid'],['foreign store',f=>f.current.storeId=ownerId],
 ['lost package or hold',f=>f.current.eligible=false],['existing binding',f=>f.current.hasBinding=true],
 ['release unavailable',f=>f.release(false)],['provider no longer controlled',f=>f.account.controller.is_controller=false],
 ['provider metadata assigned',f=>f.account.metadata.grookai_seller_binding='already'],
])test('fresh apply rejects '+name,async()=>{const f=fixture(),p=await f.operator.plan(f.target);change(f);await assert.rejects(f.operator.apply(p,p.sha256));assert.equal(f.writes,0);});
test('requires the independently approved hash, not only plan self-check',async()=>{const f=fixture(),p=await f.operator.plan(f.target);await assert.rejects(f.operator.apply(p,'b'.repeat(64)));assert.equal(f.writes,0);});
test('a correctly rehashed plan cannot cross configured project or migration',async()=>{
 for(const field of ['projectRef','migrationSha256']){const f=fixture(),p=await f.operator.plan(f.target);p[field]=field==='projectRef'?'other':'b'.repeat(64);const {sha256,...body}=p;p.sha256=adoptionPlanHash(body);await assert.rejects(f.operator.apply(p,p.sha256));assert.equal(f.writes,0);}
});
test('database revocation is never reported as re-enabled success',async()=>{const f=fixture(),p=await f.operator.plan(f.target);f.revoke();await assert.rejects(f.operator.apply(p,p.sha256),/revoked/);});
test('lost-response retry preserves the approved grant ID and hash',async()=>{const f=fixture(),p=await f.operator.plan(f.target);const a=await f.operator.apply(p,p.sha256);f.current.hasGrant=true;const b=await f.operator.apply(p,p.sha256);assert.deepEqual(a,b);});
test('planning refuses accounts already reserved or approved',async()=>{for(const flag of ['hasBinding','hasGrant']){const f=fixture();f.current[flag]=true;await assert.rejects(f.operator.plan(f.target));assert.equal(f.reads,0);assert.equal(f.writes,0);}});

test('a replacement plan binds the specific expired approval into its reviewed hash',async()=>{
 const f=fixture();f.current.replaceableGrantId='33333333-3333-4333-8333-333333333333';
 const p=await f.operator.plan(f.target);assert.equal(p.replacesGrantId,f.current.replaceableGrantId);
 await f.operator.apply(p,p.sha256);assert.equal(f.writes,1);
 p.replacesGrantId='44444444-4444-4444-8444-444444444444';
 await assert.rejects(f.operator.apply(p,p.sha256),/Plan changed/);assert.equal(f.writes,1);
});

test('replacement eligibility cannot override a revoked or live approval',async()=>{
 const f=fixture();f.current.hasGrant=true;f.current.replaceableGrantId='33333333-3333-4333-8333-333333333333';
 await assert.rejects(f.operator.plan(f.target),/Existing seller approval/);assert.equal(f.reads,0);
});
