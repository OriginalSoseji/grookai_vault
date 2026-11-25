// Prepare only a new empty owned qualification database; never reset a lab.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import pg from 'pg';
import {GENERIC_PLAY_NINE_QUALIFICATION_DATABASE} from '../../backend/warehouse/generic_play_nine_intake_v1.mjs';
const database=process.argv[3]??GENERIC_PLAY_NINE_QUALIFICATION_DATABASE;
assert.ok([GENERIC_PLAY_NINE_QUALIFICATION_DATABASE,'stamped_bulk_proposed_ids_qualification_v1','stamped_bulk_programme_qualification_v1',
  'stamped_bulk_programme_release_qualification_v1'].includes(database));
const out=path.resolve(process.argv[2]??'');assert.ok(process.argv[2]);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const frame=JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/generic_play_nine_intake_v1.json',import.meta.url)));
const actor='00000000-0000-4000-a000-000000000901';
const client=new pg.Client({host:'127.0.0.1',port:56230,user:'postgres',password:'postgres',database,connectionTimeoutMillis:10000,statement_timeout:45000});
const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const report={database,productionWrites:0,sourceDatabaseWrites:0,realAccountsOrSessionsCopied:false,reset:false,pass:false};
try {
  await client.connect();assert.equal((await client.query('select current_database() name')).rows[0].name,database);
  await client.query('begin');
  for(const table of ['games','sets','card_prints','card_print_identity','card_print_identity_aliases',
    'canon_warehouse_candidates','external_discovery_candidates','raw_imports'])
    assert.equal((await client.query(`select count(*)::int n from public.${table}`)).rows[0].n,0,'Owned fixture already populated: '+table);
  assert.equal((await client.query('select count(*)::int n from auth.users')).rows[0].n,0);
  // One UUID-only synthetic local actor satisfies the real warehouse FKs. No
  // email, credential, session or production account is copied or created.
  await client.query('insert into auth.users(id) values($1)',[actor]);
  const insert=async(table,row)=>{
    const columns=(await client.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1 and is_generated='NEVER'",[table])).rows.map(r=>r.column_name);
    const keys=Object.keys(row).filter(k=>columns.includes(k));
    await client.query(`insert into public.${table}(${keys.join(',')}) select ${keys.join(',')} from jsonb_populate_record(null::public.${table},$1::jsonb)`,[JSON.stringify(row)]);
  };
  const parents=[...new Map([...frame.bases,...frame.coordinateParents,...frame.globalNameNumberParents].map(p=>[p.id,p])).values()];
  await insert('games',{id:frame.bases[0].game_id,code:'pokemon',name:'Pokémon',slug:'pokemon'});
  for(const set of frame.sets)await insert('sets',set);
  const extraSets=[...new Set(parents.map(p=>p.set_id))].filter(id=>!frame.sets.some(s=>s.id===id));
  for(const id of extraSets) {
    const p=parents.find(p=>p.set_id===id);
    await client.query('insert into public.sets(id,code,name,game) values($1,$2,$3,$4)',[id,p.set_code,'Synthetic retained parent scope '+p.set_code,'pokemon']);
  }
  for(const parent of parents)await insert('card_prints',parent);
  for(const identity of frame.baseIdentities)await insert('card_print_identity',identity);
  for(const alias of frame.baseAliases)await insert('card_print_identity_aliases',alias);
  for(const source of frame.sourceRows) {
    await client.query("insert into public.raw_imports(id,source,status,payload) values($1,'justtcg','processed',$2)",[source.raw_import_id,source.raw_payload]);
    const {raw_payload,...row}=source;await insert('external_discovery_candidates',row);
  }
  for(const original of frame.intakes) {
    const row={...original,intake_channel:'MANUAL',submission_intent:'MISSING_CARD',notes:'Synthetic retained historical bridge intake',
      founder_approved_by_user_id:actor,founder_approved_at:'2026-11-20T00:00:00Z',promoted_by_user_id:actor,promoted_at:'2026-11-20T00:00:00Z',
      promotion_result_type:'CARD_PRINT_CREATED',reference_hints_payload:{bridge_source:'external_discovery_bridge_v1',source_candidate_id:original.source_candidate_id},
      claimed_identity_payload:{variant_key:'play_pokemon_stamp'}};
    delete row.source_candidate_id;await insert('canon_warehouse_candidates',row);
  }
  await client.query('commit');report.pass=true;report.parents=parents.length;report.retainedIntakes=2;report.syntheticAuthUsers=1;report.additionalSyntheticScopeSets=extraSets;
} catch(error) {
  await client.query('rollback').catch(()=>{});report.error={message:error.message,code:error.code};process.exitCode=1;
} finally {
  await client.end().catch(()=>{});save('result.json',report);console.log(JSON.stringify(report));
}
