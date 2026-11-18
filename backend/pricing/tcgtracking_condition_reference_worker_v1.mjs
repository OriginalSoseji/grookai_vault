import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import '../env.mjs';
import { createBackendClient } from '../supabase_backend_client.mjs';
import { VERSION, SOURCE, STAGED_STATUS, CONDITIONS, hash, resolveTargets, normalizeGroup } from './tcgtracking_condition_reference_v1.mjs';
import {projectScopedUpstream} from './tcgtracking_condition_reference_projection_v1.mjs';
import {conditionReferenceDatabaseConfigV1} from './condition_reference_database_config_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const MODES=['--prepare','--fetch','--replay','--apply','--verify'];
const mode = args.find(arg => MODES.includes(arg));
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const out = path.resolve(value('out') || path.join(ROOT, 'artifacts/tcgtracking_condition_reference_v1', new Date().toISOString().replace(/[:.]/g, '-')));
const PROJECT = 'ycdxbpibncqcchqiihfz';
const planHashes = new WeakMap();
function planHash(plan) { if (!planHashes.has(plan)) planHashes.set(plan,hash(plan)); return planHashes.get(plan); }
async function executingWorkerHash(){return hash({worker:hash(await fs.readFile(fileURLToPath(import.meta.url))),projection:hash(await fs.readFile(path.join(ROOT,'backend/pricing/tcgtracking_condition_reference_projection_v1.mjs'))),database_config:hash(await fs.readFile(path.join(ROOT,'backend/pricing/condition_reference_database_config_v1.mjs')))});}
const writeJson = async (name, data) => { const target = path.join(out, name); await fs.writeFile(`${target}.tmp`, JSON.stringify(data, null, 2) + '\n'); await fs.rename(`${target}.tmp`, target); };
const readJson = async name => JSON.parse(await fs.readFile(path.join(out, name), 'utf8'));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function database() {
  if (new URL(process.env.SUPABASE_URL).hostname !== `${PROJECT}.supabase.co` || !(await fs.readFile(path.join(ROOT, 'supabase/config.toml'), 'utf8')).includes(PROJECT)) throw new Error('ENVIRONMENT_MISMATCH');
  const route=new URL(process.env.SUPABASE_DB_URL);
  if(route.hostname!==`db.${PROJECT}.supabase.co` && !(route.hostname.endsWith('.supabase.com')&&decodeURIComponent(route.username).endsWith(`.${PROJECT}`)))throw new Error('DIRECT_DATABASE_PROJECT_MISMATCH');
  const client = new pg.Client(conditionReferenceDatabaseConfigV1(process.env.SUPABASE_DB_URL,{ca:process.env.SUPABASE_DB_CA_CERT?.trim()||undefined,insecureTlsEnvironment:process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0',applicationName:'grookai_tcgtracking_condition_reference_v1'}));
  await client.connect(); return client;
}
async function sanity(c) {
  const counts = (await c.query('select (select count(*) from public.card_prints)::int as card_prints,(select count(*) from public.sets)::int as sets,(select count(*) from public.card_print_traits)::int as card_print_traits')).rows[0];
  if (counts.card_prints < 40000 || counts.sets < 150 || counts.card_print_traits < 5000) throw new Error('ENVIRONMENT_MISMATCH_COUNTS');
  return counts;
}

async function prepare() {
  const c = await database();
  try {
    await c.query('begin isolation level repeatable read read only');
    const counts = await sanity(c);
    await c.query("set local enable_nestloop=off");
    await c.query("set local work_mem='64MB'");
    const result = await c.query(`
      with source_links as materialized (
        select 'exact_printing'::text as mapping_lane,m.source as mapping_source,m.id::text as mapping_id,
          case when m.external_id ~ '^[0-9]+:(normal|foil|holo|reverse)$' then split_part(m.external_id,':',1)::bigint
               when m.source='tcgplayer' and m.external_id ~ '^[0-9]+$' then m.external_id::bigint end as product_id,
          m.card_printing_id,
          case when m.source='tcgplayer_market' then split_part(m.external_id,':',2)
               when lower(m.meta->>'source_subtype')='holofoil' then 'holo'
               when lower(m.meta->>'source_subtype')='reverse holofoil' then 'reverse'
               else lower(m.meta->>'source_subtype') end as source_finish
        from public.external_printing_mappings m
        where m.active and m.source in ('tcgplayer_market','tcgplayer')
        union all
        select 'verified_parent_finish',m.source,m.id::text,
          case when m.external_id ~ '^[0-9]+$' then m.external_id::bigint end,
          printing.id,printing.finish_key
        from public.external_mappings m
        join public.card_prints parent on parent.id=m.card_print_id and parent.identity_domain='pokemon_eng_standard'
        join public.card_printings printing on printing.card_print_id=parent.id and not printing.is_provisional
        where m.active and m.source='tcgplayer'
          and exists (select 1 from public.card_printing_truth_reviews review where review.card_printing_id=printing.id and review.active and review.review_status='verified' and review.public_visibility='visible')
      )
      select links.mapping_lane,links.mapping_source,links.mapping_id,p.product_id,p.category_id,p.group_id,
        parent.id as card_print_id,parent.gv_id,parent.name,parent.number,parent.identity_domain,
        printing.id as card_printing_id,printing.printing_gv_id,printing.finish_key
      from source_links links
      join public.tcgcsv_source_products p on p.product_id=links.product_id and p.source_active
      join public.card_printings printing on printing.id=links.card_printing_id and printing.finish_key=links.source_finish and not printing.is_provisional
      join public.card_prints parent on parent.id=printing.card_print_id
      where not exists (select 1 from public.card_printing_truth_reviews review where review.card_printing_id=printing.id and review.active and review.public_visibility in ('hidden_pending_review','hidden_unsupported'))
      `);
    const resolved = resolveTargets(result.rows);
    const groupFilter = value('groups')?.split(',');
    const selectedTargets = resolved.targets.filter(target => !groupFilter || groupFilter.includes(`${target.category_id}:${target.group_id}`));
    await c.query('rollback');
    const available = new Set();
    for (const category of [...new Set(selectedTargets.map(row=>row.category_id))]) {
      const url=`https://openapi.tcgtracking.com/v1/${category}/sets`;
      const response=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{Accept:'application/json','User-Agent':'GrookaiVault-ConditionReference/1.0'}});
      if(!response.ok)throw new Error(`PROVIDER_SET_CATALOG_HTTP_${response.status}`);
      const raw=Buffer.from(await response.arrayBuffer());const catalog=JSON.parse(raw);
      if(catalog.category_id!==category||!Array.isArray(catalog.sets))throw new Error('PROVIDER_CATEGORY_CATALOG_MISMATCH');
      await fs.writeFile(path.join(out,`provider_sets_${category}.json`),raw);
      for(const set of catalog.sets)if(Number.isInteger(set.id)&&set.sku_count>0)available.add(`${category}:${set.id}`);
      await sleep(500);
    }
    const providerHolds=selectedTargets.filter(row=>!available.has(`${row.category_id}:${row.group_id}`)).map(row=>({...row,reason:'provider_set_or_skus_unavailable'}));
    const targets=selectedTargets.filter(row=>available.has(`${row.category_id}:${row.group_id}`));
    const groups = [...new Map(targets.map(row => [`${row.category_id}:${row.group_id}`, { category_id: row.category_id, group_id: row.group_id }])).values()];
    if (!groups.length) throw new Error('NO_EXACT_MAPPED_TARGETS');
    const plan = { version: VERSION, prepared_at: new Date().toISOString(), project_ref: PROJECT, mode: 'private_reference_staging_only', counts, groups, targets, withheld: [...resolved.withheld,...providerHolds], executed_source_hashes: { policy:hash(await fs.readFile(path.join(ROOT,'backend/pricing/tcgtracking_condition_reference_v1.mjs'))),worker:hash(await fs.readFile(fileURLToPath(import.meta.url))) }, capabilities: { raw_imports_only: true, canonical_writes: false, mapping_writes: false, published_price_writes: false, app_visible: false } };
    await writeJson('plan.json', plan); await writeJson('plan_hash.json', { sha256: planHash(plan) });
    console.log(JSON.stringify({ phase: 'prepared', out, plan_hash: planHash(plan), group_count: groups.length, exact_target_count: targets.length, mapping_holds: plan.withheld.length }));
  } finally { await c.end(); }
}

async function loadPlan() {
  const plan = await readJson('plan.json');
  if (plan.version !== VERSION || plan.project_ref !== PROJECT || planHash(plan) !== (await readJson('plan_hash.json')).sha256) throw new Error('PLAN_HASH_OR_VERSION_MISMATCH');
  return plan;
}

async function fetchGroups(plan) {
  await fs.mkdir(path.join(out, 'groups'), { recursive: true });
  const receipts = [];
  const maxGroups = Number(value('max-groups') || plan.groups.length);
  if (!Number.isSafeInteger(maxGroups) || maxGroups <= 0 || maxGroups > plan.groups.length) throw new Error('INVALID_GROUP_BOUND');
  const groups = plan.groups.slice(0, maxGroups);
  for (let index = 0; index < groups.length; index++) {
    const group = groups[index];
    const key = `${group.category_id}_${group.group_id}`;
    let receipt;
    try {
      receipt = await readJson(`groups/${key}.receipt.json`);
      if (receipt.plan_hash !== planHash(plan) || hash(await fs.readFile(path.join(out, `groups/${key}.raw.json`))) !== receipt.raw_sha256) throw new Error('CACHED_SOURCE_HASH_MISMATCH');
      if (hash(await readJson(`groups/${key}.normalized.json`)) !== receipt.normalized_sha256) throw new Error('CACHED_NORMALIZATION_HASH_MISMATCH');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const url = `https://openapi.tcgtracking.com/v1/${group.category_id}/sets/${group.group_id}/skus`;
      let response;
      let lastError;
      for (let attempt = 0; attempt < 3; attempt++) {
        await sleep(attempt ? 2000 * attempt : 500);
        try {
          response = await fetch(url, { signal: AbortSignal.timeout(45000), headers: { Accept: 'application/json', 'User-Agent': 'GrookaiVault-ConditionReference/1.0' } });
          if (response.ok || (response.status !== 429 && response.status < 500)) break;
          await response.arrayBuffer();
        } catch (error) { lastError = error; }
      }
      if (!response?.ok) {
        receipt = { ...group, plan_hash: planHash(plan), source_url: url, status: 'failed', error: response ? `HTTP_${response.status}` : lastError?.message, fetched_at: new Date().toISOString() };
        await writeJson(`groups/${key}.failure.json`, receipt);
        receipts.push(receipt); continue;
      }
      const raw = Buffer.from(await response.arrayBuffer());
      if (raw.length > 48 * 1024 * 1024) throw new Error('SOURCE_GROUP_EXCEEDS_48MIB_BOUND');
      const fetchedAt = new Date().toISOString();
      const upstream = JSON.parse(raw);
      const normalized = normalizeGroup({ response: upstream, categoryId: group.category_id, groupId: group.group_id, targets: plan.targets.filter(row => row.category_id === group.category_id && row.group_id === group.group_id), fetchedAt });
      await fs.writeFile(path.join(out, `groups/${key}.raw.json`), raw);
      await writeJson(`groups/${key}.normalized.json`, normalized);
      receipt = { ...group, plan_hash: planHash(plan), source_url: url, status: 'fetched', http_status: response.status, fetched_at: fetchedAt, provider_updated_at: upstream.updated, raw_sha256: hash(raw), normalized_sha256: hash(normalized), raw_bytes: raw.length, etag: response.headers.get('etag'), source_fresh: normalized.source_fresh, target_count: normalized.target_count, priced_count: normalized.priced_count, coverage: normalized.coverage, withheld: normalized.withheld };
      await writeJson(`groups/${key}.receipt.json`, receipt);
    }
    receipts.push(receipt);
    await writeJson('receipts.json', { version: VERSION, plan_hash: planHash(plan), completed: receipts.length, planned_groups: plan.groups.length, receipts });
    if ((index + 1) % 10 === 0 || index === groups.length - 1) console.log(JSON.stringify({ phase: 'fetching', completed: index + 1, selected_groups: groups.length, candidate_prices: receipts.reduce((sum, row) => sum + (row.priced_count || 0), 0) }));
  }
  await writeJson('receipts.json', { version: VERSION, plan_hash: planHash(plan), completed: receipts.length, planned_groups: plan.groups.length, receipts });
  const summary = { phase: 'fetched', out, plan_hash: planHash(plan), receipts_hash: hash(await readJson('receipts.json')), successful_groups: receipts.filter(row => row.status === 'fetched').length, failed_groups: receipts.filter(row => row.status !== 'fetched').length, candidate_prices: receipts.reduce((sum, row) => sum + (row.priced_count || 0), 0), coverage: Object.fromEntries(CONDITIONS.map(condition => [condition, receipts.reduce((sum, row) => sum + (row.coverage?.[condition] || 0), 0)])), full_plan_fetched: receipts.length === plan.groups.length && receipts.every(row => row.status === 'fetched') };
  await writeJson('summary.json', summary); console.log(JSON.stringify(summary));
}

async function apply(plan) {
  if (process.env.GROOKAI_PREFLIGHT_ACK !== '1') throw new Error('GROOKAI_PREFLIGHT_ACK_REQUIRED');
  const executedWorkerHash=await executingWorkerHash();
  if(value('expected-worker-hash')!==executedWorkerHash || hash(await fs.readFile(path.join(ROOT,'backend/pricing/tcgtracking_condition_reference_v1.mjs')))!==plan.executed_source_hashes.policy)throw new Error('EXECUTED_SOURCE_HASH_MISMATCH');
  const receiptPack = await readJson('receipts.json');
  if (value('expected-plan-hash') !== planHash(plan) || value('expected-receipts-hash') !== hash(receiptPack) || receiptPack.plan_hash !== planHash(plan)) throw new Error('EXPLICIT_APPLY_HASH_MISMATCH');
  if (receiptPack.receipts.length !== plan.groups.length || receiptPack.receipts.some(row => row.status !== 'fetched')) throw new Error('INCOMPLETE_FROZEN_PLAN');
  const db = await database();
  if(process.env.GV_USER_ACCESS_TOKEN) { await db.end();throw new Error('USER_TOKEN_NOT_ALLOWED_FOR_SERVICE_IMPORT'); }
  const shared = createBackendClient();
  const applied = [];
  try {
    const gotLock = (await db.query("select pg_try_advisory_lock(hashtext('tcgtracking_condition_reference_v1')) as locked")).rows[0].locked;
    if (!gotLock) throw new Error('REFERENCE_IMPORT_ALREADY_RUNNING');
    await sanity(db);
    const triggers = (await db.query("select tgname from pg_trigger where tgrelid='public.raw_imports'::regclass and not tgisinternal")).rows;
    if (triggers.length) throw new Error('RAW_INGRESS_TRIGGER_CHANGED_REAUDIT_REQUIRED');
    const rls=(await db.query("select c.relrowsecurity,coalesce(bool_and(p.polroles=array[(select oid from pg_roles where rolname='service_role')]),false) as service_only from pg_class c left join pg_policy p on p.polrelid=c.oid where c.oid='public.raw_imports'::regclass group by c.relrowsecurity")).rows[0];
    if(!rls?.relrowsecurity||!rls.service_only)throw new Error('RAW_INGRESS_PRIVACY_BOUNDARY_CHANGED');
    for (const receipt of receiptPack.receipts) {
      const key = `${receipt.category_id}_${receipt.group_id}`;
      const raw = await fs.readFile(path.join(out, `groups/${key}.raw.json`));
      const normalized = await readJson(`groups/${key}.normalized.json`);
      if (hash(raw) !== receipt.raw_sha256 || hash(normalized) !== receipt.normalized_sha256) throw new Error('ARTIFACT_HASH_MISMATCH');
      const age = Date.now() - Date.parse(receipt.provider_updated_at);
      if ((!Number.isFinite(age) || age < -300000 || age > 36 * 3600000) && normalized.rows.length) throw new Error(`SOURCE_STALE_AT_APPLY_${key}`);
      // Recompute against the frozen scope to prevent an edited derived file from being applied.
      const replay = normalizeGroup({ response: JSON.parse(raw), targets: plan.targets.filter(row => row.category_id === receipt.category_id && row.group_id === receipt.group_id), categoryId: receipt.category_id, groupId: receipt.group_id, fetchedAt: receipt.fetched_at });
      if (hash(replay) !== hash(normalized)) throw new Error('NORMALIZATION_REPLAY_MISMATCH');
      await db.query('begin');
      try {
        const ids = [...new Set(normalized.rows.map(row => row.card_printing_id))];
        const current = ids.length ? (await db.query('select p.id,p.card_print_id,p.finish_key from public.card_printings p where p.id=any($1::uuid[]) and not p.is_provisional and not exists(select 1 from public.card_printing_truth_reviews r where r.card_printing_id=p.id and r.active and r.public_visibility in (\'hidden_pending_review\',\'hidden_unsupported\'))', [ids])).rows : [];
        const byId = new Map(current.map(row => [row.id, row]));
        if (normalized.rows.some(row => byId.get(row.card_printing_id)?.card_print_id !== row.card_print_id || byId.get(row.card_printing_id)?.finish_key !== row.finish_key)) throw new Error('CANONICAL_PRINTING_CHANGED');
        const exactIds=[...new Set(normalized.rows.filter(row=>row.mapping_lane==='exact_printing').map(row=>row.mapping_id))];
        const parentIds=[...new Set(normalized.rows.filter(row=>row.mapping_lane==='verified_parent_finish').map(row=>row.mapping_id))];
        const exactMappings=exactIds.length?(await db.query('select id::text,source,external_id,card_printing_id from public.external_printing_mappings where active and id=any($1::uuid[])',[exactIds])).rows:[];
        const parentMappings=parentIds.length?(await db.query('select id::text,source,external_id,card_print_id from public.external_mappings where active and id=any($1::bigint[])',[parentIds])).rows:[];
        const exactMap=new Map(exactMappings.map(row=>[row.id,row]));const parentMap=new Map(parentMappings.map(row=>[row.id,row]));
        for(const row of normalized.rows){
          const mapping=row.mapping_lane==='exact_printing'?exactMap.get(row.mapping_id):parentMap.get(row.mapping_id);
          if(!mapping||mapping.source!==row.mapping_source||Number(mapping.external_id.split(':')[0])!==row.product_id||(row.mapping_lane==='exact_printing'?mapping.card_printing_id!==row.card_printing_id:mapping.card_print_id!==row.card_print_id))throw new Error('EXACT_MAPPING_CHANGED');
        }
        const acquisitionKey = hash({ version: VERSION, category_id: receipt.category_id, group_id: receipt.group_id, raw_sha256: receipt.raw_sha256, normalized_sha256: receipt.normalized_sha256 });
        const note = `${VERSION}:${receipt.category_id}:${receipt.group_id}:${acquisitionKey}`;
        const existing = (await db.query('select id from public.raw_imports where status=$1 and source=$2 and notes=$3', [STAGED_STATUS, SOURCE, note])).rows;
        if (existing.length > 1) throw new Error('DUPLICATE_RAW_ACQUISITION_KEY');
        let id = existing[0]?.id;
        if (!id) {
          const payload = { _kind: 'condition_price_reference_group_v1', _external_id: `${receipt.category_id}:${receipt.group_id}`, version: VERSION, acquisition_key: acquisitionKey, plan_hash: planHash(plan), receipt, provider: 'tcgtracking', upstream: projectScopedUpstream(JSON.parse(raw),plan.targets.filter(row=>row.category_id===receipt.category_id&&row.group_id===receipt.group_id)), normalized, pricing_lane: 'reference', app_visible: false, can_publish_price_directly: false };
          id = (await db.query('insert into public.raw_imports(source,status,payload,notes) values($1,$2,$3::jsonb,$4) returning id', [SOURCE, STAGED_STATUS, JSON.stringify(payload), note])).rows[0].id;
        }
        await db.query('commit');
        // Independent shared-client readback; DB writes remain limited to raw_imports.
        const readback = await shared.from('raw_imports').select('id,source,status,notes').eq('id', id).single().abortSignal(AbortSignal.timeout(20000));
        if (readback.error || readback.data?.notes !== note || readback.data?.status !== STAGED_STATUS) throw new Error('RAW_INGRESS_READBACK_FAILED');
        applied.push({ ...receipt, raw_import_id: id, inserted: !existing.length, acquisition_key: acquisitionKey });
        await writeJson('apply.json', { version: VERSION, applied_at: new Date().toISOString(), plan_hash: planHash(plan), receipts_hash: hash(receiptPack), executed_worker_hash:executedWorkerHash, groups: applied, app_visible: false });
      } catch (error) { await db.query('rollback').catch(() => {}); throw error; }
    }
    console.log(JSON.stringify({ phase: 'staged', group_count: applied.length, inserted_groups: applied.filter(row => row.inserted).length, app_visible: false, candidate_prices: applied.reduce((sum, row) => sum + row.priced_count, 0) }));
  } finally { await db.end(); }
}

async function replay(plan) {
  const pack=await readJson('receipts.json');
  if(pack.plan_hash!==planHash(plan))throw new Error('REPLAY_PLAN_MISMATCH');
  let checked=0;let prices=0;
  for(const receipt of pack.receipts){
    if(receipt.status!=='fetched')continue;
    const key=`${receipt.category_id}_${receipt.group_id}`;
    const raw=await fs.readFile(path.join(out,`groups/${key}.raw.json`));
    const normalized=await readJson(`groups/${key}.normalized.json`);
    const actual=normalizeGroup({response:JSON.parse(raw),targets:plan.targets.filter(row=>row.category_id===receipt.category_id&&row.group_id===receipt.group_id),categoryId:receipt.category_id,groupId:receipt.group_id,fetchedAt:receipt.fetched_at});
    if(hash(raw)!==receipt.raw_sha256||hash(normalized)!==receipt.normalized_sha256||hash(actual)!==hash(normalized))throw new Error(`REPLAY_HASH_MISMATCH_${key}`);
    checked++;prices+=actual.priced_count;
  }
  const report={version:VERSION,verified_at:new Date().toISOString(),status:'offline_replay_passed',plan_hash:planHash(plan),receipts_hash:hash(pack),worker_hash:await executingWorkerHash(),policy_hash:hash(await fs.readFile(path.join(ROOT,'backend/pricing/tcgtracking_condition_reference_v1.mjs'))),groups:checked,prices,full_plan:checked===plan.groups.length};
  await writeJson('replay.json',report);console.log(JSON.stringify(report));
}

async function verify(plan) {
  const c = await database();
  try {
    await c.query('begin read only');
    const applied = await readJson('apply.json');
    const ids = applied.groups.map(row => row.raw_import_id);
    const actual = (await c.query('select id,source,status,payload->>\'acquisition_key\' as acquisition_key,jsonb_array_length(payload->\'normalized\'->\'rows\') as price_count,payload->>\'app_visible\' as app_visible from public.raw_imports where id=any($1::bigint[])',[ids])).rows;
    const byId = new Map(actual.map(row => [String(row.id), row]));
    if (applied.plan_hash !== planHash(plan) || actual.length !== ids.length || applied.groups.some(group => {const row=byId.get(String(group.raw_import_id));return !row || row.source !== SOURCE || row.status !== STAGED_STATUS || row.acquisition_key !== group.acquisition_key || row.price_count !== group.priced_count || row.app_visible !== 'false';})) throw new Error('INDEPENDENT_DB_VERIFICATION_FAILED');
    await c.query('rollback');
    const report = { version: VERSION, verified_at: new Date().toISOString(), status: 'private_reference_staging_verified', groups: actual.length, prices: actual.reduce((sum,row) => sum+row.price_count,0), app_visible: false, canonical_writes: false, price_publication_changed: false };
    await writeJson('verification.json',report);console.log(JSON.stringify(report));
  } finally { await c.end(); }
}

await fs.mkdir(out, { recursive: true });
try {
  if (args.filter(arg => MODES.includes(arg)).length !== 1) throw new Error('SELECT_ONE_EXPLICIT_MODE');
  if (mode === '--prepare') await prepare();
  else { const plan=await loadPlan();if(mode==='--fetch')await fetchGroups(plan);else if(mode==='--replay')await replay(plan);else if(mode==='--apply')await apply(plan);else await verify(plan); }
} catch (error) {
  await writeJson(`failure_${Date.now()}.json`,{ version:VERSION,mode,failed_at:new Date().toISOString(),error_code:'CONDITION_REFERENCE_FAILED',error_detail:String(error.stack??error) });
  console.error(`[condition-reference] ${error.message}`);process.exitCode=1;
}
