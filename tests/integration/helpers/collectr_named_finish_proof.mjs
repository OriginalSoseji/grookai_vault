import assert from 'node:assert/strict';import fs from 'node:fs';import {randomUUID,createHash} from 'node:crypto';import {createRequire} from 'node:module';
const origin='http://127.0.0.1:58863';
export async function proveCollectrNamedFinishes({root,status,runDir,user,db,caller}){
 assert.equal(status.API_URL,'http://127.0.0.1:58541');
 // The retained 410 lab predates these catalog vocabulary rows. Seed only
 // absent synthetic fixture vocabulary; never overwrite existing definitions.
 const vocabularyBefore=(await db.query('select * from finish_keys order by key')).rows;
 for(const [key,label]of [['cracked_ice','Cracked Ice Holo'],['pokeball','Poke Ball Pattern'],['masterball','Master Ball Pattern']]){
  await db.query('insert into finish_keys(key,label,sort_order,is_active,meta) values($1,$2,100,true,$3::jsonb) on conflict(key) do nothing',[key,label,JSON.stringify({fixture:'collectr_named_finishes_20261002',productionAuthority:false})]);
  assert.equal((await db.query('select is_active from finish_keys where key=$1',[key])).rows[0].is_active,true);
 }
 const vocabularyAfter=(await db.query('select * from finish_keys order by key')).rows;
 assert.deepEqual(vocabularyAfter.filter(r=>vocabularyBefore.some(b=>b.key===r.key)),vocabularyBefore);
 fs.writeFileSync(runDir+'/named-finish-fixture-vocabulary.json',JSON.stringify({before:vocabularyBefore,after:vocabularyAfter,productionWrites:0},null,2),{flag:'wx'});
 const set=randomUUID(),setName='Synthetic named finishes '+set;
 await db.query('insert into sets(id,code,name,game) values($1,$2,$3,\'pokemon\')',[set,'syn-'+set,setName]);
 const source=[],targets=[],ordinary=[];
 for(const [finish,label]of [['cosmos','Cosmos Holo'],['cracked_ice','Cracked Ice Holo'],['pokeball','Poke Ball Pattern'],['masterball','Master Ball Pattern']]){
  const id=randomUUID(),child=randomUUID(),holo=randomUUID(),gv='GV-NAMED-'+id,index=source.length;
  await db.query("insert into card_prints(id,set_id,set_code,name,number,gv_id,game_id,identity_domain) values($1,$2,$3,$4,$5,$6,(select id from games where code='pokemon'),'pokemon_eng_standard')",[id,set,'syn-'+set,'Synthetic '+finish,String(index+1),gv]);
  await db.query("insert into card_printings(id,card_print_id,finish_key) values($1,$2,$3),($4,$2,'holo'),($5,$2,'normal')",[child,id,finish,holo,randomUUID()]);
  source.push({'Product Name':`Synthetic ${finish} (${label})`,Category:'Pokemon',Set:setName,'Card Number':String(index+1),Variance:index%2?'':'Holofoil',Grade:'Ungraded','Card Condition':'LP',Quantity:'2','Average Cost Paid':'4.25','Portfolio Name':'Synthetic private',Notes:'Original named finish'});
  targets.push({sourceIndices:[index],cardId:id,gvId:gv,cardPrintingId:child});ordinary.push(holo);
 }
 source.push({...source[0],Grade:'PSA 10'}, {...source[0],Variance:'Reverse Holofoil'}, {...source[0],'Product Name':'Synthetic cosmos (Reverse Cosmos Holo)'});
 const keys=Object.keys(source[0]),csvText=[keys,...source.map(r=>keys.map(k=>r[k]))].map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n');
 const copies=async()=>(await db.query('select * from vault_item_instances where user_id=$1 order by id',[user.id])).rows;
 const before=await copies();
 const send=body=>fetch(origin+'/api/vault/import',{method:'POST',headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json',Origin:origin},body:JSON.stringify({ownerUserId:user.id,...body})});
 const previewResponse=await send({operation:'preview',csvText});assert.equal(previewResponse.status,200);const preview=await previewResponse.json();
 assert.equal(preview.readyRows,4);assert.equal(preview.readyCopies,8);assert.equal(preview.reviewRows,3);assert.deepEqual(preview.rows.flatMap(r=>r.selection?[r.selection]:[]),targets);
 for(const target of targets){const response=await send({operation:'save',attempt:{version:2,ownerUserId:user.id,requestId:randomUUID(),csvText,targets:[{...target,cardPrintingId:ordinary[target.sourceIndices[0]]}]}});assert.equal(response.status,400);}
 for(const index of [4,5,6]){const response=await send({operation:'save',attempt:{version:2,ownerUserId:user.id,requestId:randomUUID(),csvText,targets:[{...targets[0],sourceIndices:[index]}]}});assert.equal(response.status,400);}
 assert.deepEqual(await copies(),before);
 const require=createRequire(root+'/apps/web/package.json'),{chromium,expect}=require('@playwright/test'),{createServerClient}=require('@supabase/ssr');
 let cookies=[];const auth=createServerClient(status.API_URL,status.ANON_KEY,{cookies:{getAll:()=>cookies,setAll:v=>{cookies=v;}}});assert.equal((await auth.auth.setSession(user.session)).error,null);
 const browser=await chromium.launch();try{
  const context=await browser.newContext({viewport:{width:390,height:844}});await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,url:origin,httpOnly:false,secure:false,sameSite:'Lax'})));
  const page=await context.newPage();await page.goto(origin+'/vault/import');await expect(page.locator('#collectr-csv')).toBeEnabled();await page.locator('#collectr-csv').setInputFiles({name:'named-finishes.csv',mimeType:'text/csv',buffer:Buffer.from(csvText)});
  await page.getByText('7 source rows · 4 ready (8 copies) · 3 need review',{exact:true}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:runDir+'/named-finishes-preview.png',fullPage:true});
  await page.getByRole('button',{name:'Save 8 ready copies and retain review rows',exact:true}).click();await page.getByRole('heading',{name:'Import verified',exact:true}).waitFor();await page.getByText('8 copies added. 3 source rows retained for review.',{exact:true}).waitFor();
  await page.screenshot({path:runDir+'/named-finishes-verified.png',fullPage:true});await context.close();
 }finally{await browser.close();await auth.auth.stopAutoRefresh();}
 const after=await copies(),added=after.filter(c=>targets.some(t=>t.cardId===c.card_print_id));assert.equal(added.length,8);
 for(const target of targets){const group=added.filter(c=>c.card_print_id===target.cardId);assert.equal(group.length,2);for(const c of group){assert.equal(c.card_printing_id,target.cardPrintingId);assert.equal(c.condition_label,'LP');assert.equal(Number(c.acquisition_cost),4.25);assert.equal(c.notes,'Original named finish');}}
 assert.deepEqual(after.filter(c=>!targets.some(t=>t.cardId===c.card_print_id)),before);
 const sha=createHash('sha256').update(csvText).digest('hex'),doc=await caller.from('vault_collection_import_documents_v2').select('source_rows').eq('source_sha256',sha).single();assert.equal(doc.error,null);assert.deepEqual(doc.data.source_rows,source);
 const read=await caller.rpc('get_collection_import_copies_v2',{p_source_sha256:sha,p_instance_ids:added.map(c=>c.id)});assert.equal(read.error,null);assert.deepEqual(read.data.map(c=>c.id).sort(),added.map(c=>c.id).sort());
 const repeat=await send({operation:'save',attempt:{version:2,ownerUserId:user.id,requestId:randomUUID(),csvText,targets}});assert.equal(repeat.status,200);assert.equal((await repeat.json()).importedCards,0);assert.deepEqual(await copies(),after);
 fs.writeFileSync(runDir+'/named-finishes-result.json',JSON.stringify({status:'PASS',finishes:4,exactCopies:8,originalSourcePreserved:true,ordinaryHoloRejected:true,conflictsAndGradesHeld:true,reimportNoDuplicates:true,productionWrites:0},null,2),{flag:'wx'});
}
