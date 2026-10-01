import {createHash} from 'node:crypto';
import {fixture,seal} from './warehouse_printing_authority_v1.mjs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function mappingFixture({rejectOld=true}={}){
 const f=fixture(),m=f.manifest,p=m.parents[0];delete m.fingerprint;delete m.authority.review;
 p.variant_key='gamestop_stamp';p.printed_identity_modifier='gamestop_stamp';m.scope='verified_parent_families';
 const target={candidate_id:f.target.candidate_id,card_print_id:p.id,source:'tcgplayer',external_id:'123456'};
 const before={parent:{...p,number:p.printed_coordinate,tcgplayer_id:null},children:[{id:'44444444-4444-4444-8444-444444444444',card_print_id:p.id,finish_key:'holo',printing_gv_id:p.gv_id+'-HOLO',is_provisional:false}],reviews:[],
  source:{product_id:123456,category_id:3,name:'Fixture GameStop promo',payload_hash:'synthetic-only'},
  discovery:{id:'55555555-5555-4555-8555-555555555555',tcgplayer_id:'123456',raw_import_id:17},raw:{id:17,payload:{synthetic:true}},
  mappings:rejectOld?[{id:9,card_print_id:p.id,source:'tcgplayer',external_id:'123455',active:true,meta:{synthetic:true}}]:[]};
 delete before.parent.printed_coordinate;
 const add=(ref,value)=>{const b=Buffer.from(JSON.stringify(value));f.artifacts.set(ref,b);m.authority.source_artifacts.push({ref,sha256:sha(b),kind:'exact_printing_mapping',url_or_identifier:'synthetic-test-only:'+ref,retrieved_at:'2026-10-01T00:00:00Z'});return sha(b);};
 const sourceHash=add('product',before.source);
 const dependencies={columns:[],footprints:[],triggers:[]};
 m.external_mapping_assertions=[{target,source_snapshot_sha256:hash(before.source),parent_snapshot_sha256:hash(before.parent),source_ref:'product',source_sha256:sourceHash,discovery_snapshot_sha256:hash(before.discovery),raw_snapshot_sha256:hash(before.raw),dependencies_sha256:hash(dependencies)}];
 m.rejected_external_mapping_assertions=rejectOld?[{mapping_id:9,before_sha256:hash(before.mappings[0]),reason_code:'PROVEN_UNSTAMPED_PRODUCT_ON_STAMPED_PARENT',source_ref:'wrong-product',source_sha256:add('wrong-product',{product_id:123455})}]:[];
 const review=Buffer.from(JSON.stringify({status:'verified_scope',master_index_sha256:m.master_index_sha256,game:m.game,language:m.language,set_code:m.set_code,scope:m.scope,reviewer:'synthetic-test-only',reviewed_at:'2026-10-01T00:00:00Z',projection_sha256:hash(m)}));
 f.artifacts.set('review',review);m.authority.review={ref:'review',sha256:sha(review)};
 return seal({version:'REVIEWED_GAMESTOP_MAPPING_V1',purpose:'evidence_binding_not_execution_authorization',manifest:seal(m),artifacts:[...f.artifacts].map(([ref,b])=>({ref,base64:b.toString('base64')})),target,before,dependencies});
}
