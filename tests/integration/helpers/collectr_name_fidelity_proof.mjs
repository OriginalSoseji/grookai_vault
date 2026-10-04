import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';

export async function proveCollectrNameFidelity({status,runDir,user,db,caller}) {
  assert.equal(status.API_URL,'http://127.0.0.1:58541');
  const origin='http://127.0.0.1:58863',set=randomUUID(),setName='Synthetic name fidelity '+set;
  await db.query("insert into sets(id,code,name,game) values($1,$2,$3,'pokemon')",[set,'syn-'+set,setName]);
  const source=[],targets=[],wrongFinishes=[];
  const names=[['Poke Widget','Poké Widget'],['Nidoran M','Nidoran ♂'],["______'s Pikachu","_____'s Pikachu"],['Synthetic EX (Delta Species)','Synthetic-EX δ'],["Synthetic's Widget",'Synthetic’s Widget']];
  for(const [name,catalogName] of names) {
    const index=source.length,id=randomUUID(),child=randomUUID(),other=randomUUID(),gv='GV-NAME-'+id;
    await db.query("insert into card_prints(id,set_id,set_code,name,number,gv_id,game_id,identity_domain,printed_identity_modifier) values($1,$2,$3,$4,$5,$6,(select id from games where code='pokemon'),'pokemon_eng_standard',$7)",[id,set,'syn-'+set,catalogName,String(index+1),gv,index===3?'delta_species':null]);
    await db.query("insert into card_printings(id,card_print_id,finish_key) values($1,$2,'holo'),($3,$2,'normal')",[child,id,other]);
    source.push({'Product Name':name,Category:'Pokemon',Set:setName,'Card Number':String(index+1),Variance:'Holofoil',Grade:'Ungraded','Card Condition':'LP',Quantity:'2','Average Cost Paid':'4.25','Portfolio Name':'Synthetic private',Notes:'Keep original spelling'});
    targets.push({sourceIndices:[index],cardId:id,gvId:gv,cardPrintingId:child});wrongFinishes.push(other);
  }
  source.push({...source[1],'Product Name':'Nidoran F'},{...source[3],'Product Name':'Synthetic EX'},{...source[0],Grade:'PSA 10'});
  const keys=Object.keys(source[0]),csvText=[keys,...source.map(r=>keys.map(k=>r[k]))].map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n');
  const send=body=>fetch(origin+'/api/vault/import',{method:'POST',headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json',Origin:origin},body:JSON.stringify({ownerUserId:user.id,...body})});
  const save=chosen=>({operation:'save',attempt:{version:2,ownerUserId:user.id,requestId:randomUUID(),csvText,targets:chosen}});
  const copies=async()=>(await db.query('select * from vault_item_instances where user_id=$1 order by id',[user.id])).rows;
  const before=await copies(),preview=await send({operation:'preview',csvText});assert.equal(preview.status,200);
  const p=await preview.json();assert.equal(p.readyRows,5);assert.equal(p.readyCopies,10);assert.equal(p.reviewRows,3);assert.deepEqual(p.rows.flatMap(r=>r.selection?[r.selection]:[]),targets);
  for(let i=0;i<targets.length;i++) assert.equal((await send(save([{...targets[i],cardPrintingId:wrongFinishes[i]}]))).status,400);
  for(const [index,target] of [[5,1],[6,3],[7,0]]) assert.equal((await send(save([{...targets[target],sourceIndices:[index]}]))).status,400);
  await db.query('update card_prints set printed_identity_modifier=null where id=$1',[targets[3].cardId]);
  try {assert.equal((await send(save([targets[3]]))).status,400);} finally {await db.query("update card_prints set printed_identity_modifier='delta_species' where id=$1",[targets[3].cardId]);}
  assert.deepEqual(await copies(),before);
  const attempt=save(targets),response=await send(attempt);assert.equal(response.status,200);assert.equal((await response.json()).importedCards,10);
  const after=await copies(),added=after.filter(c=>targets.some(t=>t.cardId===c.card_print_id));assert.equal(added.length,10);
  for(const target of targets) {
    const group=added.filter(c=>c.card_print_id===target.cardId);assert.equal(group.length,2);
    for(const c of group){assert.equal(c.card_printing_id,target.cardPrintingId);assert.equal(c.condition_label,'LP');assert.equal(Number(c.acquisition_cost),4.25);assert.equal(c.notes,'Keep original spelling');assert.equal(c.is_graded,false);}
  }
  assert.deepEqual(after.filter(c=>!targets.some(t=>t.cardId===c.card_print_id)),before);
  const sha=createHash('sha256').update(csvText).digest('hex'),doc=await caller.from('vault_collection_import_documents_v2').select('source_rows').eq('source_sha256',sha).single();assert.equal(doc.error,null);assert.deepEqual(doc.data.source_rows,source);
  const read=await caller.rpc('get_collection_import_copies_v2',{p_source_sha256:sha,p_instance_ids:added.map(c=>c.id)});assert.equal(read.error,null);assert.deepEqual(read.data.map(c=>c.id).sort(),added.map(c=>c.id).sort());
  assert.equal((await send(attempt)).status,200);assert.deepEqual(await copies(),after);
  const repeat=await send(save(targets));assert.equal(repeat.status,200);assert.equal((await repeat.json()).importedCards,0);assert.deepEqual(await copies(),after);
  fs.writeFileSync(runDir+'/name-fidelity-result.json',JSON.stringify({status:'PASS',exactCopies:10,originalSourcePreserved:true,staleDeltaEvidenceRejected:true,genderAndGradesHeld:true,retryNoDuplicates:true,productionWrites:0},null,2),{flag:'wx'});
}
