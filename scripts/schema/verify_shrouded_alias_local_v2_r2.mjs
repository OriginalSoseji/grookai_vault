// Read-only local schema/security and HTTP comparison. No production connection.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { gunzipSync, gzipSync } from 'node:zlib';
import { reconcileKnownTableColumnOrderV1 } from 'file:///C:/grookai_shrouded_alias_20261118/scripts/schema/column_order_reconciliation_v1.mjs';
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && /^--attempt=[a-z0-9-]{1,32}$/.test(process.argv[2])));
const root = 'C:/grookai_shrouded_alias_20261118';
const payload = root;
const artifacts = 'C:/grookai_vault_operator_artifacts/shrouded_alias_discovery_20261118';
const prior='C:/grookai_vault_operator_artifacts/latios_alias_discovery_20261118';
const out = artifacts + '/local-qualification-v2-r2' + (process.argv[2] ? '-' + process.argv[2].slice(10) : '');
assert.equal(fs.existsSync(out), false, 'Consumed proof output');
fs.mkdirSync(out);
const read = file => JSON.parse((fs.existsSync(file) ? fs.readFileSync(file) : gunzipSync(fs.readFileSync(file + '.gz'))).toString('utf8'));
const sha = x => createHash('sha256').update(x).digest('hex');
const save = (name, value) => { const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n'); const privateSnapshot = name.endsWith('.private.json'); fs.writeFileSync(out + '/' + name + (privateSnapshot ? '.gz' : ''), privateSnapshot ? gzipSync(bytes) : bytes, { flag: 'wx' }); };
const report = { version: 'SHROUDED_ALIAS_LOCAL_QUALIFICATION_V2', status: 'started', startedAt: new Date().toISOString(), stage: 'validate', productionWrites: 0, localDatabaseWrites: 0, productionApplyAvailable: false };
try {
    const binding = read(payload + '/scripts/schema/shrouded_alias_candidate_v2.json');
    for (const [file, pin] of Object.entries(binding.candidates))
        assert.equal(sha(fs.readFileSync(payload + '/supabase/migrations/' + file)), pin);
    const freshProject = 'shrouded-fresh-511-20261118', retainedProject = 'latios-fresh-509-20261118';
    const catalogSQL = fs.readFileSync(root + '/scripts/schema/reviewed_intake_public_catalog_v1.sql', 'utf8');
    const securitySQL = fs.readFileSync(root + '/scripts/schema/vendor_pricing_security_snapshot_v1.sql', 'utf8');
    function local(project, name) {
        const lab = (project===freshProject?artifacts+'/fresh-511':'C:/grookai_vault_operator_artifacts/latios_alias_discovery_20261118/fresh-509');
        assert.equal(fs.existsSync(lab + '/supabase/.temp/project-ref'), false);
        const info = JSON.parse(execFileSync('docker', ['inspect', 'supabase_db_' + project], { encoding: 'utf8' }))[0];
        assert.equal(info.State.Running, true);
        assert.deepEqual(Object.keys(info.NetworkSettings.Networks), [project]);
        assert.equal(JSON.parse(execFileSync('docker', ['network', 'inspect', project], { encoding: 'utf8' }))[0].Internal, true);
        const query = input => JSON.parse(execFileSync('docker', ['exec', '-i', 'supabase_db_' + project, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input, encoding: 'utf8', timeout: 120000, maxBuffer: 64000000, windowsHide: true }).trim());
        assert.match(catalogSQL, /^begin\b[^;]*\bread only;/i);
        assert.match(securitySQL, /^begin\b[^;]*\bread only;/i);
        const result = { catalog: query(catalogSQL), security: query(securitySQL) };
        save(name + '-catalog.private.json', result.catalog);
        save(name + '-security.private.json', result.security);
        assert.equal(result.catalog.LEDGER.length, 511);assert.deepEqual(result.catalog.LEDGER.map(x=>x.version),Object.keys({...binding.history,...binding.candidates}).sort().map(x=>x.match(/^\d+/)[0]));
        assert.equal(result.security.privateExecutable, 0);
        return result;
    }
    report.stage = 'capture_replay_and_retained';
    const fresh = local(freshProject, 'fresh'), retained = local(retainedProject, 'retained');
    assert.deepEqual(fresh.security, retained.security, 'Fresh/retained security mismatch');
    const priorCatalog = read(prior + '/local-qualification-v5/fresh-catalog.private.json');
    const priorSecurity = read(prior + '/local-qualification-v5/fresh-security.private.json');
    const functionNames = ['get_public_catalog_sets_v2','get_search_set_catalog_v1','resolve_catalog_discovery_set_code_v1','search_print_identity_v1'];
    const helpers = ['get_shrouded_fable_discovery_exclusions_v1','get_shrouded_fable_discovery_projection_v1'];
    const viewNames = ['v_card_printings_discovery_v1','v_card_prints_discovery_v1','v_card_search','v_grookai_dex_card_prints_v1'];const familyView='v_card_prints_set_family_discovery_v1';
    const key = row => [row.kind, row.schema, row.name, row.owner].join('|');
    const before = new Map(priorSecurity.objects.map(row => [key(row), row]));
    const changed = [];
    const added = [],addedViews=[],implicitViewTypes=[];const familyTemplate=structuredClone(priorSecurity.objects.find(x=>x.kind==='relation'&&x.schema==='public'&&x.name==='v_card_prints_discovery_v1'));assert.ok(familyTemplate);familyTemplate.name=familyView;
    for (const row of fresh.security.objects) {
        const old = before.get(key(row));
        if (!old) {
            if(row.kind==='type'){assert.ok([familyView,'_'+familyView].includes(row.name));const oldName=row.name.startsWith('_')?'_v_card_prints_discovery_v1':'v_card_prints_discovery_v1';const template=structuredClone(priorSecurity.objects.find(x=>x.kind==='type'&&x.schema==='public'&&x.name===oldName));assert.ok(template);template.name=row.name;assert.deepEqual(row,template);implicitViewTypes.push(row.name);continue;}if(row.kind==='relation'){assert.deepEqual(row,familyTemplate);addedViews.push(row.name);continue;}
            assert.equal(row.kind, 'function');
            assert.equal(row.schema, 'public');
            assert.ok(helpers.includes(row.name.split('(')[0]));
            assert.equal(row.owner, 'postgres');
            assert.equal(row.facts.definer, true);
            assert.deepEqual(row.acl, ['anon=X/postgres', 'authenticated=X/postgres', 'postgres=X/postgres', 'service_role=X/postgres']);
            added.push(row.name.split('(')[0]);
            continue;
        }
        before.delete(key(row));
        if (JSON.stringify(old) !== JSON.stringify(row)) {
            assert.equal(row.kind, 'function');
            assert.equal(row.schema, 'public');
            assert.ok(functionNames.includes(row.name.split('(')[0]));
            const a = structuredClone(old), b = structuredClone(row);
            delete a.facts.definition;
            delete b.facts.definition;
            assert.deepEqual(a, b);
            changed.push(row.name.split('(')[0]);
        }
    }
    assert.equal(before.size, 0, 'An existing security object disappeared');
    assert.deepEqual(added.sort(), [...helpers].sort());assert.deepEqual(addedViews,[familyView]);assert.deepEqual(implicitViewTypes.sort(),['_'+familyView,familyView].sort());
    assert.deepEqual(changed.sort(), [...functionNames].sort());
    const views = catalog => new Map(catalog.ALL_RELATIONS_QUERY.filter(x => x.schema === 'public' && x.relationtype === 'v').map(x => [x.name, x.definition]));
    const oldViews = views(priorCatalog), newViews = views(fresh.catalog);
    assert.deepEqual([...oldViews.keys(),familyView].sort(), [...newViews.keys()].sort());
    const changedViews = [...oldViews].filter(([name, definition]) => newViews.get(name) !== definition).map(([name]) => name);
    assert.deepEqual(changedViews.sort(), [...viewNames].sort());
    report.stage = 'compare_complete_schemas';
    const require = createRequire('C:/gv_intake_recovery_20261027/package.json');
    for (const name of ['schemainspect', 'migra', 'client'])
        assert.equal(require('@pgkit/' + name + '/package.json').version, '0.6.1');
    const { PostgreSQL } = require('@pgkit/schemainspect'), { Migration } = require('@pgkit/migra');
    const queries = Object.fromEntries(Object.entries(new PostgreSQL({}, '17.6')).filter(([key]) => key.endsWith('_QUERY')));
    async function inspect(snapshot, schema) {
        const map = new Map(Object.entries(queries).map(([key, value]) => [value, snapshot[key]]));
        const model = await PostgreSQL.create({ oneFirst: async () => snapshot.server_version, any: async (q) => { assert.equal(q.values.length, 0); assert.ok(map.has(q.sql)); return map.get(q.sql); } });
        model.one_schema(schema);
        for (const key of ['types', 'domains', 'materialized_views', 'composite_types'])
            model[key] = Object.fromEntries(Object.entries(model[key]).filter(([, value]) => value.schema === schema));
        return model;
    }
    const allowed = new Set([...helpers, ...functionNames, ...viewNames,familyView]);
    const deltas = [];
    for (const schema of ['public', 'grookai_square', 'grookai_inventory', 'grookai_vendor_pricing']) {
        const a = await inspect(fresh.catalog, schema), b = await inspect(retained.catalog, schema);
        const equality = await Migration.create(a, b, { schema });
        equality.set_safety(false);
        equality.add_all_changes(true);
        fs.writeFileSync(out + '/fresh-retained-' + schema + '-NEVER-EXECUTE.sql', equality.sql, { flag: 'wx' });
        assert.equal(equality.sql.trim(), '');
        const baseline = await inspect(priorCatalog, schema), candidate = await inspect(fresh.catalog, schema);
        if (schema === 'public')
            reconcileKnownTableColumnOrderV1(baseline, candidate);
        const diff = await Migration.create(baseline, candidate, { schema });
        diff.set_safety(false);
        diff.add_all_changes(true);
        fs.writeFileSync(out + '/baseline-' + schema + '-NEVER-EXECUTE.sql', diff.sql, { flag: 'wx' });
        if (schema !== 'public')
            assert.equal(diff.sql.trim(), '');
        for (const statement of diff.statements) {
            if (statement.trim() === 'set check_function_bodies = off;')
                continue; // Diagnostic engine prologue; never executed.
            const object = statement.match(/(?:function|view|table)\s+(?:"public"|public)\.(?:"([a-z0-9_]+)"|([a-z0-9_]+))/i);
            const objectName = object?.[1] ?? object?.[2];
            const index=false;
            assert.ok(index || objectName && allowed.has(objectName), 'Unexpected schema delta: ' + statement.slice(0, 140));
            deltas.push({ object: objectName, operation: statement.trim().split('\n')[0].slice(0, 140) });
        }
    }

    report.stage='anonymous_postgrest_smoke';
    const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',artifacts+'/fresh-511','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore'],windowsHide:true}));
    assert.equal(cfg.API_URL,'http://127.0.0.1:54641');
    const sdk=createRequire(root+'/backend/package.json')('@supabase/supabase-js');const client=sdk.createClient(cfg.API_URL,cfg.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});

    const apiCases=[];async function rpc(name,args){const t=Date.now(),r=await client.rpc(name,args),ms=Date.now()-t;assert.ifError(r.error);assert.ok(ms<3000,'Local API exceeds unchanged3s budget: '+name);apiCases.push({name,ms,rows:Array.isArray(r.data)?r.data.length:undefined});return r.data;}
    const catalog=await rpc('get_public_catalog_sets_v2',{p_game_code:'pokemon'});assert.deepEqual(catalog.filter(r=>['sv06.5','sv6pt5','tk-ex-latio','tk1b','2021swsh','mcd21','swsh10.5','pgo','sv04.5','sv4pt5','sv08.5','sv8pt5'].includes(r.code)).map(r=>({code:r.code,count:Number(r.card_count)})).sort((a,b)=>a.code.localeCompare(b.code)),[{code:'mcd21',count:25},{code:'pgo',count:90},{code:'sv4pt5',count:248},{code:'sv6pt5',count:113},{code:'sv8pt5',count:194},{code:'tk1b',count:10}]);
    const route=await rpc('resolve_visible_set_references_v1',{code_in:'sv06.5',game_code_in:'pokemon'});assert.deepEqual(route.map(r=>r.code),['sv6pt5']);
    const browse=await rpc('search_game_card_prints_v5',{game_code_in:'pokemon',set_code_in:'sv06.5',limit_in:512,offset_in:0});assert.equal(browse.length,113);assert.ok(browse.every(r=>r.set_code==='sv6pt5'));assert.equal(browse.filter(r=>r.gv_id==='GV-PK-SV06-5-002-PRIZE-PACK-STAMP').length,1);
    for(const args of [{q:'sv06.5',object_type_in:'parent_print',limit_in:512},{q:null,set_code_in:'sv6pt5',object_type_in:'parent_print',limit_in:512},{q:null,set_code_in:'sv06.5',object_type_in:'child_printing',limit_in:512}]){const rows=await rpc('search_print_identity_v1',args);assert.equal(rows.length,args.object_type_in==='child_printing'?167:113);}
    const legacy=await client.from('card_prints').select('id',{count:'exact',head:true}).eq('set_code','sv06.5');assert.ifError(legacy.error);assert.equal(legacy.count,100);
    const projected=await client.from('v_card_prints_set_family_discovery_v1').select('gv_id,set_code,variant_key').eq('gv_id','GV-PK-SV06-5-002-PRIZE-PACK-STAMP');assert.ifError(projected.error);assert.deepEqual(projected.data,[{gv_id:'GV-PK-SV06-5-002-PRIZE-PACK-STAMP',set_code:'sv6pt5',variant_key:'prize_pack_stamp'}]);
    for(const proofFile of ['fresh-511/shrouded-test-proof-v2.json','retained-509/shrouded-test-proof-v2.json']){const proof=read(artifacts+'/'+proofFile);assert.equal(proof.pass,true);assert.equal(proof.allThreeReaderRolesSelectOnly,true);assert.equal(proof.protectedStateUnchanged,true);}
    Object.assign(report,{status:'passed',stage:'complete',candidates:binding.candidates,migrations:511,freshRetainedSchemaEqual:true,privateSchemaUnchanged:true,existingSecurityUnchanged:true,changedFunctions:changed,newHelpers:added,changedViews,newViews:addedViews,selectOnlyNewView:true,implicitViewTypes,diagnosticDeltaStatements:deltas,apiCases,anonymousHttp:{sets:1,cards:113,printings:167,legacyDirectReads:100,prismaticParents:194,paldeanParents:248,pokemonGoParents:90,mcdonaldsParents:25,latiosParents:10}});

}catch(error){report.status='failed';report.error=error.message;process.exitCode=1;}finally{report.finishedAt=new Date().toISOString();save('qualification.json',report);console.log(JSON.stringify(report));}
