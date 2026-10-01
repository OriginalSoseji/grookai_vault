import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
export const PRICING_ADJUDICATION_VERSION='REVIEWED_MAPPING_PRICING_ADJUDICATION_V1';
export const REJECTED_MAPPING_REASON='PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT';
const ledgers=['market_price_pipeline_candidates','market_price_publication_snapshots','market_price_qualification_decisions'];
const guards=['get_market_pricing_read_model_v1','v_market_price_current_v1','v_market_price_history_v1'];
export function assertMappingPricingAdjudication(bundle,artifacts){
 const binding=bundle.manifest.pricing_dependency_adjudication;assert.ok(binding?.ref&&binding.sha256,'separate_pricing_adjudication_required');
 const bytes=artifacts.get(binding.ref);assert.ok(bytes,'pricing_review_bytes_required');assert.equal(createHash('sha256').update(bytes).digest('hex'),binding.sha256);
 const review=JSON.parse(bytes);assert.equal(review.version,PRICING_ADJUDICATION_VERSION);assert.equal(review.status,'verified_scope');assert.equal(review.card_print_id,bundle.target.card_print_id);
 assert.equal(review.dependencies_sha256,hash(bundle.dependencies));assert.equal(review.immutable_history_retained,true);assert.equal(review.expected_outcome,'unavailable_rejected_price_and_history');
 assert.equal(review.migration_version,'20261001190000');assert.deepEqual(Object.keys(review.reader_hashes).sort(),guards);for(const h of Object.values(review.reader_hashes))assert.match(h,/^[a-f0-9]{64}$/);
 assert.match(review.publication_pointer_sha256,/^[a-f0-9]{64}$/);assert.match(review.evidence_sha256,/^[a-f0-9]{64}$/);assert.ok(review.reviewer&&Number.isFinite(Date.parse(review.reviewed_at)));
 const rejected=bundle.manifest.rejected_external_mapping_assertions;assert.equal(rejected.length,1);assert.equal(rejected[0].reason_code,REJECTED_MAPPING_REASON);assert.deepEqual(review.mapping_ids,[rejected[0].mapping_id]);
 const references=bundle.dependencies.footprints.filter(f=>f.type!=='uuid'&&f.count>0);assert.ok(references.length>0);assert.ok(references.every(f=>ledgers.includes(f.relation)&&f.field==='source_mapping_id'),'unadjudicated_mapping_dependency');
 // The read exclusion follows the immutable mapping ID. Refuse mixed historical
 // ownership: every affected ledger row must belong to this exact parent/child.
 for(const ref of references)for(const field of ['card_print_id','card_printing_id']){const scope=bundle.dependencies.footprints.find(f=>f.relation===ref.relation&&f.field===field&&f.type==='uuid');assert.ok(scope,'missing_pricing_identity_dependency');assert.equal(scope.count,ref.count,'mixed_historical_mapping_identity');assert.equal(scope.digest,ref.digest,'mixed_historical_mapping_identity');}
 assert.deepEqual(review.retained_mapping_references,references);return review;
}
export async function readMappingPricingReaderHashes(db){
 const defs=(await db.query("select c.relname name,pg_get_viewdef(c.oid,true) definition from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('v_market_price_current_v1','v_market_price_history_v1') union all select p.proname,pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_market_pricing_read_model_v1' order by name")).rows;
 assert.deepEqual(defs.map(x=>x.name),guards);return Object.fromEntries(defs.map(x=>[x.name,hash(x.definition)]));
}
export async function assertMappingPricingGuards(db,review){
 assert.equal((await db.query('select count(*)::int n from supabase_migrations.schema_migrations where version=$1',[review.migration_version])).rows[0].n,1,'pricing_guard_migration_not_installed');
 assert.deepEqual(await readMappingPricingReaderHashes(db),review.reader_hashes,'pricing_reader_definition_drift');
 assert.equal(hash((await db.query('select to_jsonb(p) row from market_price_current_publication p order by singleton')).rows.map(x=>x.row)),review.publication_pointer_sha256,'publication_pointer_drift');
}
export async function assertRejectedMappingPriceWithdrawn(db,bundle){
 const children=bundle.before.children.map(c=>c.id);const prices=(await db.query('select * from get_market_pricing_read_model_v1($1::uuid[],$2::uuid[])',[[bundle.target.card_print_id],children])).rows;
 assert.equal(prices.length,children.length+1);assert.ok(prices.every(p=>p.status==='unavailable'&&p.market_close===null&&p.provenance_id===null),'rejected_price_still_available');
 for(const id of children)assert.equal((await db.query('select count(*)::int n from get_market_price_history_v1($1,3650)',[id])).rows[0].n,0,'rejected_price_history_still_available');
 return prices.map(p=>({pricing_scope:p.pricing_scope,card_print_id:p.card_print_id,card_printing_id:p.card_printing_id,status:p.status,market_close:p.market_close,provenance_id:p.provenance_id}));
}
