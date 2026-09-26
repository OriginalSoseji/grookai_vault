import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{out,root,verified,query}from'./ops.mjs';
assert.equal((await verified()).id,'hrtbjchobencariqclab');
const dir=path.join(root,'.local/integration/vendor-scan-runtime-v26'),read=p=>JSON.parse(fs.readFileSync(p)),accounts=read(path.join(out,'proof-accounts.private.json')),prior=read(path.join(dir,'access-readback.private.json'));
const q=x=>{assert.match(x,/^[a-f0-9-]{36}$/);return "'"+x+"'";},ids=accounts.map(a=>q(a.id)).join(','),active=[accounts[0].id,accounts[2].id].map(q).join(','),invites=[...new Set(prior.map(r=>r.invite_id))].map(q).join(',');
assert.equal(prior.length,3);assert.equal(new Set(prior.map(r=>r.invite_id)).size,2);assert.ok(prior.every(r=>Number(r.non_fixture_members)===0&&!r.revoked));
fs.writeFileSync(path.join(dir,'fixture-renewal-intent.private.json'),JSON.stringify({at:new Date().toISOString(),database:'hrtbjchobencariqclab',scope:'Renew expired synthetic fixture invite/membership expirations for two days; no entitlement, real-vendor, schema or inventory changes',prior,activeFixtureIndices:[0,2],expiredFixtureUnchanged:1},null,2),{flag:'wx'});
await query(`begin;
 do $guard$ begin
 perform 1 from vendor_pilot_invites where id in (${invites}) for update;
 perform 1 from vendor_pilot_members where invite_id in (${invites}) for update;
 if (select count(*) from vendor_pilot_members where user_id in (${ids}) and invite_id in (${invites}))<>3 or exists(select 1 from vendor_pilot_members where invite_id in (${invites}) and user_id not in (${ids})) or exists(select 1 from vendor_pilot_invites i where id in (${invites}) and (revoked or (select count(*) from vendor_pilot_members m where m.invite_id=i.id)<>i.max_members)) then raise exception 'Synthetic fixture scope mismatch'; end if;
 end $guard$;
 update vendor_pilot_invites set expires_at=now()+interval '2 days' where id in (${invites});
 update vendor_pilot_members set expires_at=now()+interval '2 days' where user_id in (${active}) and invite_id in (${invites});
 commit;`);
const after=await query(`begin read only; select m.user_id,m.expires_at as member_expires,i.expires_at as invite_expires,public.vendor_store_capabilities_v1(m.user_id) as capabilities from vendor_pilot_members m join vendor_pilot_invites i on i.id=m.invite_id where m.user_id in (${ids}); rollback;`);
for(const i of[0,2])assert.ok(after.find(r=>r.user_id===accounts[i].id).capabilities.store_app);
assert.equal(after.find(r=>r.user_id===accounts[1].id).member_expires,prior.find(r=>r.user_id===accounts[1].id).member_expires);assert.equal(after.find(r=>r.user_id===accounts[1].id).capabilities.store_app,false);
fs.writeFileSync(path.join(dir,'fixture-renewal-result.private.json'),JSON.stringify({at:new Date().toISOString(),after,passed:true},null,2),{flag:'wx'});console.log(JSON.stringify({renewedSyntheticFixtures:2,expiredFixtureStillBlocked:true,entitlementWrites:0}));
