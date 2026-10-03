import assert from 'node:assert/strict';import fs from 'node:fs';import {randomUUID,createHash} from 'node:crypto';import {createRequire} from 'node:module';
const origin='http://127.0.0.1:58863';
export async function proveCollectrArtLabels({root,status,runDir,user,db,caller}){
 assert.equal(status.API_URL,'http://127.0.0.1:58541');
 const set=randomUUID(),setName='Synthetic art labels '+set;
 await db.query("insert into sets(id,code,name,game) values($1,$2,$3,'pokemon')",[set,'syn-'+set,setName]);
 const source=[],targets=[],ordinary=[];
 for(const [label,rarity,variant]of [['Full Art','Rare Ultra',''],['Secret','Secret Rare',''],['Alternate Art Secret','Rare Rainbow','alt']]){
  const id=randomUUID(),child=randomUUID(),normal=randomUUID(),gv='GV-ART-'+id,index=source.length;
  await db.query("insert into card_prints(id,set_id,set_code,name,number,gv_id,game_id,identity_domain,rarity,variant_key) values($1,$2,$3,$4,$5,$6,(select id from games where code='pokemon'),'pokemon_eng_standard',$7,$8)",[id,set,'syn-'+set,'Synthetic '+index,String(index+1),gv,rarity,variant]);
  await db.query("insert into card_printings(id,card_print_id,finish_key) values($1,$2,'holo'),($3,$2,'normal')",[child,id,normal]);
  source.push({'Product Name':`Synthetic ${index} (${label})`,Category:'Pokemon',Set:setName,'Card Number':String(index+1),Variance:'Holofoil',Grade:'Ungraded','Card Condition':'LP',Quantity:'2','Average Cost Paid':'4.25','Portfolio Name':'Synthetic private',Notes:'Original art label'});
  targets.push({sourceIndices:[index],cardId:id,gvId:gv,cardPrintingId:child});ordinary.push(normal);
 }
 source.push({...source[0],Grade:'PSA 10'},{...source[1],'Product Name':'Synthetic 1 (Full Art)'},{...source[0],'Product Name':'Synthetic 0 (Full Art) (Secret)'});
 const keys=Object.keys(source[0]),csvText=[keys,...source.map(r=>keys.map(k=>r[k]))].map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n');
 const copies=async()=>(await db.query('select * from vault_item_instances where user_id=$1 order by id',[user.id])).rows,before=await copies();
 const send=body=>fetch(origin+'/api/vault/import',{method:'POST',headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json',Origin:origin},body:JSON.stringify({ownerUserId:user.id,...body})});
 const attempt=targets=>({operation:'save',attempt:{version:2,ownerUserId:user.id,requestId:randomUUID(),csvText,targets}});
 const response=await send({operation:'preview',csvText});assert.equal(response.status,200);const p=await response.json();assert.equal(p.readyRows,3);assert.equal(p.readyCopies,6);assert.equal(p.reviewRows,3);assert.deepEqual(p.rows.flatMap(r=>r.selection?[r.selection]:[]),targets);
 for(const target of targets)assert.equal((await send(attempt([{...target,cardPrintingId:ordinary[target.sourceIndices[0]]}]))).status,400);
 for(const index of [3,4,5])assert.equal((await send(attempt([{...targets[index===4?1:0],sourceIndices:[index]}]))).status,400);
 // Preview cannot grant authority after catalog evidence changes.
 await db.query("update card_prints set rarity='Rare' where id=$1",[targets[0].cardId]);
 try{assert.equal((await send(attempt([targets[0]]))).status,400);}finally{await db.query("update card_prints set rarity='Rare Ultra' where id=$1",[targets[0].cardId]);}
 await db.query("update card_prints set variant_key='' where id=$1",[targets[2].cardId]);
 try{assert.equal((await send(attempt([targets[2]]))).status,400);}finally{await db.query("update card_prints set variant_key='alt' where id=$1",[targets[2].cardId]);}
 assert.deepEqual(await copies(),before);
 const require=createRequire(root+'/apps/web/package.json'),{chromium,expect}=require('@playwright/test'),{createServerClient}=require('@supabase/ssr');
 let cookies=[];const auth=createServerClient(status.API_URL,status.ANON_KEY,{cookies:{getAll:()=>cookies,setAll:v=>{cookies=v;}}});assert.equal((await auth.auth.setSession(user.session)).error,null);
 const browser=await chromium.launch();try{
  const context=await browser.newContext({viewport:{width:390,height:844}});await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,url:origin,httpOnly:false,secure:false,sameSite:'Lax'})));
  const page=await context.newPage();await page.goto(origin+'/vault/import');await expect(page.locator('#collectr-csv')).toBeEnabled();await page.locator('#collectr-csv').setInputFiles({name:'art-labels.csv',mimeType:'text/csv',buffer:Buffer.from(csvText)});
  await page.getByText('6 source rows · 3 ready (6 copies) · 3 need review',{exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:runDir+'/art-labels-preview.png',fullPage:true});
  await page.getByRole('button',{name:'Save 6 ready copies and retain review rows',exact:true}).click();await page.getByRole('heading',{name:'Import verified',exact:true}).waitFor();await page.getByText('6 copies added. 3 source rows retained for review.',{exact:true}).waitFor();await page.screenshot({path:runDir+'/art-labels-verified.png',fullPage:true});await context.close();
 }finally{await browser.close();await auth.auth.stopAutoRefresh();}
 const after=await copies(),added=after.filter(c=>targets.some(t=>t.cardId===c.card_print_id));assert.equal(added.length,6);
 for(const target of targets){const group=added.filter(c=>c.card_print_id===target.cardId);assert.equal(group.length,2);for(const c of group){assert.equal(c.card_printing_id,target.cardPrintingId);assert.equal(c.condition_label,'LP');assert.equal(Number(c.acquisition_cost),4.25);assert.equal(c.notes,'Original art label');}}
 assert.deepEqual(after.filter(c=>!targets.some(t=>t.cardId===c.card_print_id)),before);
 const sha=createHash('sha256').update(csvText).digest('hex'),doc=await caller.from('vault_collection_import_documents_v2').select('source_rows').eq('source_sha256',sha).single();assert.equal(doc.error,null);assert.deepEqual(doc.data.source_rows,source);
 const read=await caller.rpc('get_collection_import_copies_v2',{p_source_sha256:sha,p_instance_ids:added.map(c=>c.id)});assert.equal(read.error,null);assert.deepEqual(read.data.map(c=>c.id).sort(),added.map(c=>c.id).sort());
 const repeat=await send(attempt(targets));assert.equal(repeat.status,200);assert.equal((await repeat.json()).importedCards,0);assert.deepEqual(await copies(),after);
 fs.writeFileSync(runDir+'/art-labels-result.json',JSON.stringify({status:'PASS',labels:3,exactCopies:6,originalSourcePreserved:true,staleRarityRejected:true,staleVariantRejected:true,conflictsAndGradesHeld:true,reimportNoDuplicates:true,productionWrites:0},null,2),{flag:'wx'});
}
