import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {createHash,randomBytes} from 'node:crypto';
import {out,target,verified,query,api} from './ops.mjs';
const p=await verified();assert.equal(p.id,'hrtbjchobencariqclab');
const origin='https://grookai-vendor-preview.vercel.app';
const hash=x=>createHash('sha256').update(x).digest('hex');
const q=x=>"'"+String(x).replaceAll("'","''")+"'";
const save=(name,data)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2),{flag:'wx'});
const mode=process.argv[2];
if(mode==='auth'){
 const desired={site_url:origin,uri_allow_list:origin+'/auth/callback',disable_signup:false,external_email_enabled:true,mailer_autoconfirm:true,external_anonymous_users_enabled:false};
 await api(`/v1/projects/${p.id}/config/auth`,{method:'PATCH',body:desired});
 const actual=await api(`/v1/projects/${p.id}/config/auth`);
 for(const [key,value] of Object.entries(desired))assert.equal(actual[key],value,key);
 save('auth-configured.json',{at:new Date().toISOString(),target:p.id,actual:desired,emailOwnershipVerified:false});
 console.log(JSON.stringify({configured:true,target:p.id,signup:true,emailConfirmation:false}));
}else if(mode==='catalog-plan'){
 const dir='C:/grookai_vault_operator_artifacts/collector_polish/hosted_staging_1789182212844';
 const source=fs.readFileSync(path.join(dir,'catalog-snapshot.json')),old=JSON.parse(fs.readFileSync(path.join(dir,'catalog-plan.json')));
 assert.equal(hash(source),old.sha256);const snapshot=JSON.parse(source);
 const games=(await query('select id,code from games;'));
 const columns=await query("select table_name,column_name from information_schema.columns where table_schema='public' and is_generated='NEVER' and identity_generation is null;");
 const statements=[],counts={};
 for(const table of ['sets','card_prints','card_printings']){
  const rows=snapshot[table];counts[table]=rows.length;
  if(table==='card_prints')for(const row of rows){const game=snapshot.games.find(g=>g.id===row.game_id);assert.ok(game);row.game_id=games.find(g=>g.code===game.code).id;}
  const allowed=new Set(columns.filter(c=>c.table_name===table).map(c=>c.column_name)),groups=new Map();
  for(const row of rows){const names=Object.keys(row).filter(n=>allowed.has(n)).sort(),key=names.join(',');if(!groups.has(key))groups.set(key,{names,rows:[]});groups.get(key).rows.push(row);}
  for(const {names,rows:group} of groups.values()){const cols=names.map(n=>'"'+n+'"').join(',');statements.push(`insert into public.${table} (${cols}) select ${cols} from jsonb_populate_recordset(null::public.${table},${q(JSON.stringify(group))}::jsonb);`);}
 }
 const payload="begin;set local statement_timeout='90s';"+statements.join('\n')+'commit;';
 fs.writeFileSync(path.join(out,'catalog.sql'),payload,{flag:'wx'});
 save('catalog-plan.json',{target:p.id,sha256:hash(payload),sourceHash:hash(source),counts,sampleOnly:true,privateUserRows:0,pricingRows:0});
 console.log(JSON.stringify({planned:true,counts}));
}else if(mode==='catalog-apply'){
 assert.ok(!fs.existsSync(path.join(out,'catalog-applied.json')));
 const plan=JSON.parse(fs.readFileSync(path.join(out,'catalog-plan.json'))),payload=fs.readFileSync(path.join(out,'catalog.sql'),'utf8');
 assert.equal(plan.target,target().id);assert.equal(plan.sha256,hash(payload));
 const before=await query('select (select count(*) from sets)::int as sets,(select count(*) from card_prints)::int as cards;');assert.equal(before[0].sets,0);assert.equal(before[0].cards,0);
 await query(payload);
 const counts=await query('select (select count(*) from sets)::int as sets,(select count(*) from card_prints)::int as card_prints,(select count(*) from card_printings)::int as card_printings;');
 assert.deepEqual(counts[0],plan.counts);save('catalog-applied.json',{target:p.id,sha256:plan.sha256,counts});console.log(JSON.stringify({seeded:true,counts}));
}else if(mode==='invite'){
 assert.ok(!fs.existsSync(path.join(out,'review-invite.private.json')));
 const code=randomBytes(32).toString('hex');
 // Retain code before mutation so an uncertain response is recoverable without duplicate grants.
 save('review-invite.private.json',{target:p.id,code,url:origin+'/vendor-preview/start?code='+code});
 const rows=await query(`insert into vendor_pilot_invites(code_hash,expires_at,max_members) values(${q(hash(code))},now()+interval '30 days',5) returning id,expires_at,max_members;`);
 save('review-invite-created.json',{target:p.id,...rows[0]});console.log(JSON.stringify({created:true,slots:5,memberDays:14}));
}else throw Error('Explicit auth/catalog-plan/catalog-apply/invite action required');
