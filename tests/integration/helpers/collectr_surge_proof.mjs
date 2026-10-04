import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';

export async function proveCollectrSurge({status,runDir,user,db,caller,scopeVisibleSets}) {
 assert.equal(status.API_URL,'http://127.0.0.1:58541');
 const origin='http://127.0.0.1:58863',set=randomUUID(),code='syn-'+set,setName='Synthetic surge '+set;
 await db.query("insert into sets(id,code,name,game) values($1,$2,$3,'mtg')",[set,code,setName]);
 await db.query("insert into catalog_set_release_controls(set_id,release_status,release_version,evidence) values($1,'public','COLLECTR_SURGE_LOCAL_FIXTURE_V1','{\"synthetic\":true}')",[set]);
 scopeVisibleSets.push(set);
 const targets=[],source=[],evidence=[];
 for(const layout of ['normal','transform']) {
  const index=source.length,id=randomUUID(),child=randomUUID(),other=randomUUID(),identity=randomUUID(),print=randomUUID(),gv='GV-SURGE-'+id;
  const name=layout==='normal'?'Synthetic Mage':'Synthetic Knight // Synthetic Spirit',number=String(index+1);
  const payload={name,language:'en',layout,collector_number:number,set_code:code,scryfall_print_id:print,border_color:'borderless',frame_effects:[],promo_types:['surgefoil'],finishes:['foil']};
  await db.query("insert into card_prints(id,set_id,set_code,name,number,gv_id,game_id,identity_domain,variant_key) values($1,$2,$3,$4,$5,$6,(select id from games where code='mtg'),'mtg_eng_paper_print',$7)",[id,set,code,name,number,gv,'scryfall:'+print]);
  await db.query("insert into card_print_identity(id,card_print_id,identity_domain,set_code_identity,printed_number,normalized_printed_name,source_name_raw,identity_payload,identity_key_version,identity_key_hash,is_active) values($1,$2,'mtg_eng_paper_print',$3,$4,$5,$6,$7,'MTG_ENG_PAPER_PRINT_IDENTITY_V1',$8,true)",[identity,id,code,number,name.toLowerCase(),name,payload,createHash('sha256').update(JSON.stringify(payload)).digest('hex')]);
  await db.query("insert into card_printings(id,card_print_id,finish_key) values($1,$2,'foil'),($3,$2,'normal')",[child,id,other]);
  source.push({'Product Name':name.split(' // ')[0]+' (Borderless) (Surge Foil)',Category:'MTG',Set:setName,'Card Number':number,Variance:'Foil',Grade:'Ungraded','Card Condition':'LP',Quantity:'2','Average Cost Paid':'7.50',Notes:'Keep Surge Foil source'});
  targets.push({sourceIndices:[index],cardId:id,gvId:gv,cardPrintingId:child});evidence.push({identity,payload,other});
 }
 source.push({...source[0],Variance:'Normal'},{...source[0],Variance:''},{...source[0],Grade:'PSA 10'},{...source[0],'Product Name':'Synthetic Mage (Borderless) (Textured Foil)'});
 const keys=Object.keys(source[0]),csvText=[keys,...source.map(r=>keys.map(k=>r[k]))].map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n');
 const send=body=>fetch(origin+'/api/vault/import',{method:'POST',headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json',Origin:origin},body:JSON.stringify({ownerUserId:user.id,...body})});
 const save=chosen=>({operation:'save',attempt:{version:2,ownerUserId:user.id,requestId:randomUUID(),csvText,targets:chosen}});
 const copies=async()=>(await db.query('select * from vault_item_instances where user_id=$1 order by id',[user.id])).rows;
 const before=await copies(),preview=await send({operation:'preview',csvText});assert.equal(preview.status,200);
 const p=await preview.json();assert.equal(p.readyRows,2);assert.equal(p.readyCopies,4);assert.equal(p.reviewRows,4);assert.deepEqual(p.rows.flatMap(r=>r.selection?[r.selection]:[]),targets);
 for(let index=2;index<source.length;index++)assert.equal((await send(save([{...targets[0],sourceIndices:[index]}]))).status,400);
 assert.equal((await send(save([{...targets[0],cardPrintingId:evidence[0].other}]))).status,400);
 for(const patch of [{promo_types:[]},{finishes:['foil','nonfoil']}]){
  await db.query('update card_print_identity set identity_payload=$1 where id=$2',[{...evidence[0].payload,...patch},evidence[0].identity]);
  try{assert.equal((await send(save([targets[0]]))).status,400)}finally{await db.query('update card_print_identity set identity_payload=$1 where id=$2',[evidence[0].payload,evidence[0].identity])}
 }
 assert.deepEqual(await copies(),before);
 const attempt=save(targets),response=await send(attempt);assert.equal(response.status,200);assert.equal((await response.json()).importedCards,4);
 const after=await copies(),added=after.filter(c=>targets.some(t=>t.cardId===c.card_print_id));assert.equal(added.length,4);
 for(const target of targets)for(const c of added.filter(c=>c.card_print_id===target.cardId)){assert.equal(c.card_printing_id,target.cardPrintingId);assert.equal(c.condition_label,'LP');assert.equal(Number(c.acquisition_cost),7.5);assert.equal(c.notes,'Keep Surge Foil source');assert.equal(c.is_graded,false)}
 assert.deepEqual(after.filter(c=>!targets.some(t=>t.cardId===c.card_print_id)),before);
 const sha=createHash('sha256').update(csvText).digest('hex'),doc=await caller.from('vault_collection_import_documents_v2').select('source_rows').eq('source_sha256',sha).single();assert.equal(doc.error,null);assert.deepEqual(doc.data.source_rows,source);
 const read=await caller.rpc('get_collection_import_copies_v2',{p_source_sha256:sha,p_instance_ids:added.map(c=>c.id)});assert.equal(read.error,null);assert.deepEqual(read.data.map(c=>c.id).sort(),added.map(c=>c.id).sort());
 assert.equal((await send(attempt)).status,200);assert.deepEqual(await copies(),after);
 const repeat=await send(save(targets));assert.equal(repeat.status,200);assert.equal((await repeat.json()).importedCards,0);assert.deepEqual(await copies(),after);
 fs.writeFileSync(runDir+'/surge-result.json',JSON.stringify({status:'PASS',exactCopies:4,originalSourcePreserved:true,staleTreatmentAndFinishEvidenceRejected:true,conflictingFinishesAndGradesHeld:true,retryNoDuplicates:true,productionWrites:0},null,2),{flag:'wx'});
}
