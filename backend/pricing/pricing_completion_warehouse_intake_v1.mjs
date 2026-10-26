/** Pure intake of the fixed V3 warehouse export. No I/O, environment or execution. */
import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';

export const WAREHOUSE_COLLECTOR_SHA256_V1 = '5c3ea3be2a549fc664863f141698d43c0676cc1c81cbc6c675382608fb23b7bb';
export const WAREHOUSE_SQL_SHA256_V1 = 'f14167204580dee9615a0cde87a29c52d1d555df409114c4525b9863b8b64c7a';
export const WAREHOUSE_SCOPE_V1 = 'All TCGCSV warehouse products with category_id=3, including inactive/stale/unquoted/unselected products; indexed historical observation presence/latest date only, current-source/current-decision observation rows, recognized active/inactive parent mappings. Historical observation counts are unknown/null and historical latest-per-identity rows are not exported. Products are not classified as cards; no promotion, apply, Master completeness or queue closure.';
const SHA = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const CA = '700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7';
const DAY = 86400000;
const LIMITS = { products:200000, groups:10000, observations:500000, decisions:500000, mappings:500000, product_status:200000 };
const STAT = ['current_observation_count','current_positive_quote_count','current_decision_count','current_published_count','mapping_count','active_mapping_count','active_tcgplayer_mapping_count','mapping_group_mismatch_count'];
const PREDICATES = {
  inactive_products:s=>s.inactive_product, stale_products:s=>s.stale_product_metadata,
  products_without_any_observations:s=>!s.has_historical_observations,
  products_without_current_observations:s=>s.current_observation_count===0,
  products_without_current_positive_quotes:s=>s.current_positive_quote_count===0,
  products_not_selected_in_current_run:s=>s.current_decision_count===0,
  products_without_active_tcgplayer_mapping:s=>s.active_tcgplayer_mapping_count===0,
  products_without_any_parent_mapping:s=>s.mapping_count===0,
  products_with_inactive_mappings_only:s=>s.mapping_count>0&&s.active_mapping_count===0,
  products_with_mapping_group_mismatch:s=>s.mapping_group_mismatch_count>0,
  products_with_missing_group:s=>s.missing_group,
  products_with_group_category_mismatch:s=>s.group_category_mismatch,
};
function need(ok,code) { if(!ok) throw new Error(`pricing_warehouse_intake:${code}`); }
function fields(v,ks,code) { need(v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length===ks.length&&ks.every(k=>Object.hasOwn(v,k)),code); }
function integer(v,min=0) { return Number.isSafeInteger(v)&&v>=min; }
function text(v,max=1000) { return typeof v==='string'&&v.length>0&&v.length<=max&&v===v.trim(); }
function hash(v) { return createHash('sha256').update(v).digest('hex'); }
function canonical(v) {
  if(v===null||typeof v!=='object') return JSON.stringify(v);
  if(Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  return `{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
}
function same(a,b) { return canonical(a)===canonical(b); }
function date(v) { need(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'date_invalid'); return v; }
function instant(v) {
  need(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(v),'timestamp_invalid');
  let s=v.replace(' ','T').replace(/(?:Z|\+00:00)$/,'').replace(/\.(\d+)$/,(_,f)=>'.'+f.padEnd(3,'0').slice(0,3));
  s+=(s.includes('.')?'':'.000')+'Z';const n=Date.parse(s);
  need(Number.isFinite(n)&&new Date(n).toISOString()===s,'timestamp_invalid');return n;
}
// Validate duplicate keys and nesting before JSON.parse; otherwise duplicate keys
// disappear and the Node validator would be weaker than the fixed collector.
function parseStrict(bytes) {
  const s=new TextDecoder('utf-8',{fatal:true}).decode(bytes);let i=0;
  const ws=()=>{while(i<s.length&&/[\x20\t\r\n]/.test(s[i]))i++;};
  function string() { const start=i++;while(i<s.length){const c=s[i++];if(c==='"')return JSON.parse(s.slice(start,i));if(c==='\\')i++;}throw new Error('unterminated'); }
  function value(depth) {
    need(depth<=64,'json_depth');ws();
    if(s[i]==='{'){i++;ws();const keys=new Set();if(s[i]==='}'){i++;return;}while(true){need(s[i]==='"','json_key');const k=string();need(!keys.has(k),'duplicate_json_key');keys.add(k);ws();need(s[i++]===':','json_colon');value(depth+1);ws();const c=s[i++];if(c==='}')return;need(c===',','json_comma');ws();}}
    if(s[i]==='['){i++;ws();if(s[i]===']'){i++;return;}while(true){value(depth+1);ws();const c=s[i++];if(c===']')return;need(c===',','json_comma');}}
    if(s[i]==='"'){string();return;}
    const start=i;while(i<s.length&&!/[\x20\t\r\n,\]}]/.test(s[i]))i++;need(i>start,'json_value');const v=JSON.parse(s.slice(start,i));need(typeof v!=='number'||Number.isFinite(v),'nonfinite_number');
  }
  value(0);ws();need(i===s.length,'json_trailing');return JSON.parse(s);
}
function keyed(rows,key,numeric=false) { const m=new Map();for(const r of rows){need(r&&typeof r==='object'&&!Array.isArray(r),'row_object');const id=r[key];need(numeric?integer(id,1):typeof id==='string'&&UUID.test(id),'row_identity');need(!m.has(id),'duplicate_identity');m.set(id,r);}return m; }
function omit(v,keys) { return Object.fromEntries(Object.entries(v).filter(([k])=>!keys.includes(k))); }
function digestList(rows) { return hash(canonical(rows.map(canonical).sort())); }

export function normalizePricingCompletionWarehouseIntakeV1({readbackBytes,expectedReadbackSha256,expectedSqlSha256,expectedCollectorSha256,now,maxCaptureAgeMs=DAY}={}) {
  need(Buffer.isBuffer(readbackBytes)||readbackBytes instanceof Uint8Array,'original_bytes_required');
  need(readbackBytes.byteLength>0&&readbackBytes.byteLength<=256*1024*1024,'byte_bound');
  need(typeof expectedReadbackSha256==='string'&&SHA.test(expectedReadbackSha256)&&hash(readbackBytes)===expectedReadbackSha256,'capture_hash_mismatch');
  need(expectedSqlSha256===WAREHOUSE_SQL_SHA256_V1&&expectedCollectorSha256===WAREHOUSE_COLLECTOR_SHA256_V1,'reviewed_producer_pins_required');
  need(integer(now)&&integer(maxCaptureAgeMs,1)&&maxCaptureAgeMs<=DAY,'clock_required');
  const e=parseStrict(readbackBytes);
  fields(e,['version','projectRef','verifiedTls','readOnly','rollbackAcknowledged','capturedAt','sqlSha256','caSha256','sourceRunId','publicationSetId','scope','masterCoverage','databaseWrites','records'],'envelope_fields');
  need(e.version==='FIXED_OPERATOR_POKEMON_WAREHOUSE_EXPORT_V3'&&e.projectRef==='ycdxbpibncqcchqiihfz'&&e.caSha256===CA&&e.sqlSha256===expectedSqlSha256,'envelope_provenance');
  need(e.verifiedTls===true&&e.readOnly===true&&e.rollbackAcknowledged===true&&e.databaseWrites===0,'transport_claims');
  need(e.scope===WAREHOUSE_SCOPE_V1&&e.masterCoverage==='unknown','scope');
  const captured=instant(e.capturedAt);need(captured<=now&&now-captured<=maxCaptureAgeMs,'capture_stale_or_future');
  need(Array.isArray(e.records)&&same(e.records.map(r=>r?.kind),['environment','publication_before','warehouse','publication_after','transaction_end']),'record_sequence');
  const [env,before,warehouse,after,end]=e.records;
  fields(env,['kind','read_only','isolation','database','captured_at','server_version','cards','sets','traits','migrations'],'environment_fields');
  need(env.read_only==='on'&&env.isolation==='repeatable read'&&env.database==='postgres'&&text(env.server_version,200),'transaction_guard');
  for(const [k,min] of Object.entries({cards:40000,sets:150,traits:5000,migrations:444}))need(integer(env[k],min),'maturity');
  const transaction=instant(env.captured_at);need(transaction<=captured&&captured-transaction<=305000&&now-transaction<=maxCaptureAgeMs,'transaction_clock');
  for(const r of [before,after]){fields(r,['kind','rows'],'pointer_record');need(Array.isArray(r.rows)&&r.rows.length===1,'pointer_singleton');}
  need(same(before.rows,after.rows),'pointer_changed');const p=before.rows[0];
  fields(p,['run_id','publication_set_id','source_sync_run_id','run_mode','state','reconciliation_state','publication_state','completed_at','source_finished_at','observed_on','source_status','sync_mode','source_failed_count'],'pointer_fields');
  need(['run_id','publication_set_id','source_sync_run_id'].every(k=>typeof p[k]==='string'&&UUID.test(p[k]))&&e.sourceRunId===p.run_id&&e.publicationSetId===p.publication_set_id,'pointer_binding');
  need(p.run_mode==='production'&&['published','verified'].includes(p.state)&&p.reconciliation_state==='reconciled'&&p.publication_state==='published'&&p.source_status==='completed'&&p.sync_mode==='current_full_sync'&&p.source_failed_count===0,'pointer_readiness');
  const finished=instant(p.source_finished_at),completed=instant(p.completed_at);need(finished<=completed&&completed<=transaction&&now-finished<=DAY,'source_freshness');date(p.observed_on);
  fields(end,['kind','status','read_only_after','isolation_after'],'terminal_fields');need(end.status==='ROLLBACK'&&end.read_only_after==='on'&&end.isolation_after==='read committed','rollback_terminal');
  fields(warehouse,['kind','data'],'warehouse_fields');const d=warehouse.data,c=d?.counts;
  fields(d,[...Object.keys(LIMITS),'counts','historical_observation_count_status'],'data_fields');need(d.historical_observation_count_status==='not_collected','unknown_history_required');
  fields(c,[...Object.keys(LIMITS),'current_observations','historical_observations',...Object.keys(PREDICATES),'decisions_missing_observation','decisions_observation_product_mismatch'],'count_fields');
  need(c.historical_observations===null&&Object.entries(c).every(([k,v])=>k==='historical_observations'||integer(v)),'count_types');
  for(const [k,max]of Object.entries(LIMITS))need(Array.isArray(d[k])&&d[k].length===c[k]&&c[k]<=max,'array_count_bound');
  need(c.products>0&&c.products===c.product_status,'product_census');
  const products=keyed(d.products,'product_id',true),groups=keyed(d.groups,'group_id',true),obs=keyed(d.observations,'id'),dec=keyed(d.decisions,'id'),maps=keyed(d.mappings,'id',true),statuses=keyed(d.product_status,'product_id',true);
  need([...products.keys()].every(id=>statuses.has(id)),'status_population');
  const stats=new Map([...products.keys()].map(id=>[id,Object.fromEntries(STAT.map(k=>[k,0]))]));
  const related=new Map([...products.keys()].map(id=>[id,{observations:[],decisions:[],mappings:[]} ]));
  for(const row of products.values()){
    fields(row,['product_id','category_id','group_id','name','clean_name','source_url','extended_data','payload_hash','source_modified_on','first_seen_at','last_seen_at','last_seen_run_id','source_active','source_missing_since','catalog_metadata_status'],'product_fields');
    need(row.category_id===3&&typeof row.source_active==='boolean'&&(row.group_id===null||integer(row.group_id,1))&&(row.last_seen_run_id===null||UUID.test(row.last_seen_run_id))&&typeof row.payload_hash==='string'&&SHA.test(row.payload_hash)&&['current','missing_from_latest_source','historical_price_only'].includes(row.catalog_metadata_status),'product_scope');
    need((row.name===null||typeof row.name==='string')&&(row.clean_name===null||typeof row.clean_name==='string')&&(row.source_url===null||typeof row.source_url==='string')&&Array.isArray(row.extended_data)&&Buffer.byteLength(canonical(row))<=128*1024,'product_shape_bound');
  }
  const groupIds=new Set(d.products.map(r=>r.group_id));
  for(const g of groups.values()){fields(g,['group_id','category_id','name','abbreviation','payload_hash','last_seen_at','last_seen_run_id','source_active','source_missing_since','catalog_metadata_status'],'group_fields');need(g.category_id===3||groupIds.has(g.group_id),'group_scope');}
  const decisionObs=new Set(d.decisions.map(r=>r.source_observation_id));
  for(const o of obs.values()){
    fields(o,['id','product_id','category_id','group_id','subtype_name','currency','source_price_row_identity','observed_on','market_price','payload_hash','source_artifact_id','first_seen_run_id','last_seen_run_id','first_observed_at','last_observed_at','is_current_source','is_current_decision_evidence','in_product_universe'],'observation_fields');
    need(integer(o.product_id,1)&&['is_current_source','is_current_decision_evidence','in_product_universe'].every(k=>typeof o[k]==='boolean'),'observation_types');
    need(o.in_product_universe===products.has(o.product_id)&&o.is_current_decision_evidence===decisionObs.has(o.id)&&o.is_current_source===(o.in_product_universe&&o.last_seen_run_id===p.source_sync_run_id&&o.observed_on===p.observed_on),'observation_flags');
    need((o.is_current_source||o.is_current_decision_evidence)&&text(o.source_price_row_identity)&&text(o.subtype_name)&&text(o.currency,10),'observation_scope');date(o.observed_on);
    if(o.in_product_universe)related.get(o.product_id).observations.push(o);
    if(o.is_current_source){const s=stats.get(o.product_id);s.current_observation_count++;if(typeof o.market_price==='number'&&Number.isFinite(o.market_price)&&o.market_price>0)s.current_positive_quote_count++;}
  }
  for(const row of dec.values()){
    fields(row,['id','run_id','source_sync_run_id','source_observation_id','source_product_id','source_subtype_name','source_price_row_identity','source_row_hash','source_artifact_hash','currency','market_price','decision','eligible','publication_lane','reason_codes','card_print_id','card_printing_id','product_scope_result'],'decision_fields');
    need(row.run_id===p.run_id&&products.has(row.source_product_id)&&['publish','exclude','quarantine','delay','suppress_stale'].includes(row.decision)&&typeof row.eligible==='boolean'&&Array.isArray(row.reason_codes)&&row.reason_codes.length<=100&&row.reason_codes.every(v=>text(v,200)),'decision_scope');
    const s=stats.get(row.source_product_id);s.current_decision_count++;if(row.decision==='publish')s.current_published_count++;related.get(row.source_product_id).decisions.push(row);
  }
  for(const m of maps.values()){
    fields(m,['product_id','id','source','external_id','card_print_id','active','synced_at','embedded_group_id','group_mismatch'],'mapping_fields');
    need(products.has(m.product_id)&&typeof m.active==='boolean'&&typeof m.group_mismatch==='boolean'&&typeof m.card_print_id==='string'&&UUID.test(m.card_print_id),'mapping_scope');
    if(m.source==='tcgplayer')need(m.external_id===String(m.product_id)&&m.embedded_group_id===null&&m.group_mismatch===false,'mapping_identity');
    else{need(m.source==='tcgcsv'&&typeof m.external_id==='string'&&/^tcgcsv:[0-9]+:[0-9]+$/.test(m.external_id),'mapping_identity');const a=m.external_id.split(':');need(a[2]===String(m.product_id)&&a[1]===m.embedded_group_id&&m.group_mismatch===(a[1]!==String(products.get(m.product_id).group_id)),'mapping_group');}
    const s=stats.get(m.product_id);s.mapping_count++;s.active_mapping_count+=Number(m.active);s.active_tcgplayer_mapping_count+=Number(m.active&&m.source==='tcgplayer');s.mapping_group_mismatch_count+=Number(m.group_mismatch);related.get(m.product_id).mappings.push(m);
  }
  for(const [id,s]of statuses){fields(s,['product_id','historical_observation_count','has_historical_observations','latest_observed_on',...STAT,'inactive_product','stale_product_metadata','missing_group','group_category_mismatch'],'status_fields');
    need(products.has(id)&&s.historical_observation_count===null&&typeof s.has_historical_observations==='boolean'&&STAT.every(k=>integer(s[k])&&s[k]===stats.get(id)[k]),'status_counts');
    need(s.has_historical_observations===(s.latest_observed_on!==null)&&(s.current_observation_count===0||s.has_historical_observations),'history_consistency');if(s.latest_observed_on!==null)date(s.latest_observed_on);
    const row=products.get(id),flags={inactive_product:!row.source_active,stale_product_metadata:row.catalog_metadata_status!=='current'||row.last_seen_run_id!==p.source_sync_run_id,missing_group:!groups.has(row.group_id),group_category_mismatch:groups.has(row.group_id)&&groups.get(row.group_id).category_id!==3};
    need(Object.entries(flags).every(([k,v])=>s[k]===v),'status_flags');
    for(const o of related.get(id).observations)need(s.has_historical_observations&&s.latest_observed_on>=o.observed_on,'exported_history_lower_bound');
  }
  for(const [k,predicate]of Object.entries(PREDICATES))need(c[k]===d.product_status.filter(predicate).length,'summary_counts');
  need(c.current_observations===d.product_status.reduce((n,s)=>n+s.current_observation_count,0),'observation_counts');
  need(c.decisions_missing_observation===d.decisions.filter(r=>!obs.has(r.source_observation_id)).length&&c.decisions_observation_product_mismatch===d.decisions.filter(r=>obs.has(r.source_observation_id)&&obs.get(r.source_observation_id).product_id!==r.source_product_id).length,'decision_evidence_counts');

  const inventory=[],observations=[],issueCounts={};
  for(const [id,row]of products){
    const s=statuses.get(id),r=related.get(id),issues=[];
    for(const [k,predicate]of Object.entries(PREDICATES))if(predicate(s))issues.push(k);
    if(!text(row.name))issues.push('missing_product_name');
    if(r.decisions.length===0||r.decisions.some(v=>!text(v.product_scope_result)))issues.push('classification_unverified');
    if(r.decisions.some(v=>v.product_scope_result==='unsupported_product_kind'||v.reason_codes.includes('unsupported_product_kind')))issues.push('unsupported_product_kind');
    if(r.decisions.some(v=>v.decision!=='publish'))issues.push('current_decision_unpublished');
    const decisionSourceSyncMismatch=r.decisions.some(v=>v.source_sync_run_id!==p.source_sync_run_id);
    if(decisionSourceSyncMismatch)issues.push('decision_source_sync_mismatch');
    for(const v of r.decisions){if(!obs.has(v.source_observation_id))issues.push('decision_missing_observation');else if(obs.get(v.source_observation_id).product_id!==id)issues.push('decision_observation_product_mismatch');}
    const unique=[...new Set(issues)].sort(),identity={kind:'warehouse_product',provider:'tcgcsv',category:'3',productId:String(id)};
    const semanticProduct={...omit(row,['source_modified_on','first_seen_at','last_seen_at','last_seen_run_id','source_missing_since','extended_data']),extendedDataDigest:hash(canonical(row.extended_data))};
    const group=groups.get(row.group_id),semanticGroup=group?omit(group,['last_seen_at','last_seen_run_id','source_missing_since']):null;
    const evidence={product:semanticProduct,group:semanticGroup,status:omit(s,['latest_observed_on']),issues:unique,
      observationDigest:digestList(r.observations.map(v=>omit(v,['id','source_artifact_id','first_seen_run_id','last_seen_run_id','first_observed_at','last_observed_at','observed_on','payload_hash']))),
      decisionDigest:digestList(r.decisions.map(v=>omit(v,['id','run_id','source_sync_run_id','source_observation_id','source_row_hash','source_artifact_hash']))),
      mappingDigest:digestList(r.mappings.map(v=>omit(v,['synced_at']))),
      decisionReasons:[...new Set(r.decisions.flatMap(v=>v.reason_codes))].sort(),
      productScopeResults:[...new Set(r.decisions.map(v=>v.product_scope_result).filter(v=>typeof v==='string'))].sort(),
      decisionSourceSyncMismatch,
      classificationAuthority:'captured_pipeline_decisions_only',ownershipVerified:false,retailerIdentityVerified:false,historicalObservationCount:null};
    const semanticDigest=hash(canonical(evidence));
    const sourceLinks={productId:id,groupId:row.group_id,observationIds:r.observations.map(v=>v.id).sort(),decisionIds:r.decisions.map(v=>v.id).sort(),mappingIds:r.mappings.map(v=>v.id).sort((a,b)=>a-b)};
    inventory.push({identity,semanticDigest,issues:unique,name:row.name,sourceUrl:row.source_url});
    if(unique.length){for(const issue of unique)issueCounts[issue]=(issueCounts[issue]??0)+1;observations.push({identity,issues:unique,evidence,semanticDigest,sourceLinks,owner:'pokemon_warehouse_discovery',nextAction:'Review exact product classification, source quote and parent relationships against retained evidence; do not create cards or close work from absence.'});}
  }
  inventory.sort((a,b)=>Number(a.identity.productId)-Number(b.identity.productId));observations.sort((a,b)=>Number(a.identity.productId)-Number(b.identity.productId));
  return {version:'PRICING_COMPLETION_WAREHOUSE_INTAKE_V1',inventory,observations,
    coverage:{warehouseProducts:{status:'complete',category:'3',products:c.products,observedAt:e.capturedAt,evidenceRef:`sha256:${expectedReadbackSha256}`},master:'unknown',historicalCounts:'unknown_not_collected',cardClassification:'not_proven_for_all_products',absenceClosureAllowed:false},
    summary:{products:c.products,issueEntities:observations.length,withoutDetectedIssues:c.products-observations.length,issueCounts,sourceCounts:c,completionAllowed:false},
    receipt:{captureSha256:expectedReadbackSha256,collectorSha256:expectedCollectorSha256,sqlSha256:expectedSqlSha256,capturedAt:e.capturedAt,transactionAt:env.captured_at,sourceFinishedAt:p.source_finished_at,sourceRunId:p.run_id,sourceSyncRunId:p.source_sync_run_id,publicationSetId:p.publication_set_id,validatedAt:new Date(now).toISOString(),operatorRollbackAcknowledgedClaim:true,replayPerformedDatabaseAccess:false,inventoryDigest:hash(canonical(inventory)),legacyWorkerInputCompatible:false}};
}
