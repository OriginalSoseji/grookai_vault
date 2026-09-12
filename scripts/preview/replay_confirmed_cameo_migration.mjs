import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url);
const container='supabase_db_ycdxbpibncqcchqiihfz';
const database=`collector_pricing_replay_${Date.now()}`;
const out=`C:/grookai_vault_operator_artifacts/collector_polish/backend_repair_20260912/${database}`;
const exec=(file,args,input)=>execFileSync(file,args,{cwd:root,input,encoding:'utf8',maxBuffer:64*1024*1024,windowsHide:true});
const sql=(db,input)=>exec('docker',['exec','-i',container,'sh','-c','PGPASSWORD="$POSTGRES_PASSWORD" exec psql "$@"','--','-X','-qAt','-v','ON_ERROR_STOP=1','-U','supabase_admin','-d',db],input).trim();
const hash=s=>createHash('sha256').update(s).digest('hex');
assert.equal(process.argv.length,2,'No remote or apply option');
assert.match(exec('docker',['port',container,'5432']),/:54330\b/);
assert.equal(sql('postgres','select count(*) from public.card_prints;'),'326','Only the isolated local fixture DB is allowed');
assert.equal(sql('postgres',`select count(*) from pg_database where datname='${database}';`),'0');
mkdirSync(out,{recursive:true});
const migration=readFileSync(new URL('../../supabase/migrations/20260912050000_confirmed_card_cameo_read_v2.sql',import.meta.url),'utf8');
const existingTests=readFileSync(new URL('./sql/collector_cameo_read_tests_v1.sql',import.meta.url),'utf8');
const tests=existingTests.replace('end $$;\nrollback;',()=>`  update public.catalog_set_release_controls set release_status='public' where set_id=setid;
  insert into public.catalog_game_release_controls(game_code,release_status,release_version)
    values('pokemon','hidden','SYNTHETIC') on conflict(game_code) do update set release_status='hidden';
  if exists(select 1 from public.get_public_card_cameos_v2('GV-PK-MEW-200')) then raise exception 'public_set_overrode_hidden_game'; end if;
end $$;
rollback;`);
assert.notEqual(tests,existingTests,'Additional migration visibility assertion must be installed');
const report={database,productionAccess:false,migrationSha256:hash(migration),testsSha256:hash(tests),passed:false};
writeFileSync(`${out}/run_plan.json`,JSON.stringify(report,null,2));
try {
  sql('postgres',`create database ${database} owner postgres;`);
  const schema=exec('docker',['exec',container,'pg_dump','-U','postgres','-d','postgres','--schema-only','--no-publications','--no-subscriptions','--exclude-extension=pg_cron','--exclude-extension=pg_net','--exclude-schema=cron','--exclude-schema=net','--exclude-extension=pg_graphql','--exclude-schema=graphql','--exclude-schema=graphql_public']);
  sql(database,schema);
  const tables=['games','sets','finish_keys','card_prints','card_printings'];
  sql(database,exec('docker',['exec',container,'pg_dump','-U','postgres','-d','postgres','--data-only','--no-owner','--no-privileges',...tables.flatMap(t=>['-t',`public.${t}`])]));
  sql(database,`set role postgres;\n${migration}`);
  sql(database,`set role postgres;\n${migration}`);
  writeFileSync(`${out}/assertions.txt`,sql(database,tests));
  assert.equal(sql(database,'select count(*) from public.card_cameo_confirmations_v1;'),'0');
  report.passed=true;report.idempotentReplay=true;report.fixtureRowsRemaining=0;
} catch(error) {report.error=error.message;throw error;}
finally {writeFileSync(`${out}/summary.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({out,...report}));}
