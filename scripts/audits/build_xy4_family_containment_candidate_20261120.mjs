// Prepare a chunked candidate from the previously reviewed containment writer.
// This generator never connects to the database or runs a mutating mode.
import fs from 'node:fs';
let source=fs.readFileSync('backend/catalog/jpn_dp4_family_containment_v1.mjs','utf8');
function once(before,after){const parts=source.split(before);if(parts.length!==2)throw Error(`EXPECTED_ONE_MATCH: ${before.slice(0,100)} (${parts.length-1})`);source=parts[0]+after+parts[1];}
source=source.replaceAll('jpn_dp4_family_containment','jpn_xy4_family_containment').replaceAll('JPN_DP4_FAMILY_CONTAINMENT','JPN_XY4_FAMILY_CONTAINMENT').replaceAll('dp4_family_containment','xy4_family_containment').replaceAll('jpn-dp4','jpn-xy4');
once("export async function runFamilyContainment({mode='inspect',approval=null}={})", "export async function runFamilyContainment({mode='inspect',approval=null,chunk=null}={})");
once("const plan=validateFamilyContainment(read),rows=plan.rows,ids=", "if(!Number.isInteger(chunk)||chunk<0||chunk>6)throw Error('XY4_CHUNK_INVALID');const plan=validateFamilyContainment(read),rows=plan.rows.slice(chunk*10,chunk*10+10),ids=");
once("species:await q(`select to_jsonb(s) row from public.pokemon_species", "evidence:await q(`select to_jsonb(e) row from public.card_print_identity_source_evidence e where e.card_print_id=any($1::uuid[]) order by e.id ${lock?'for share':''}`,[ids]),species:await q(`select to_jsonb(s) row from public.pokemon_species");
once("if(!equal(sort(state.identities),sort(rows.flatMap(r=>r.identities_before)))||!equal(sort(state.links),sort(rows.flatMap(r=>r.links_before))))", "if(!equal(sort(state.identities),sort(rows.flatMap(r=>r.identities_before)))||!equal(sort(state.links),sort(rows.flatMap(r=>r.links_before)))||!equal(sort(state.evidence),sort(rows.flatMap(r=>r.evidence_before))))");
once("run_id:runId,mode,package_fingerprint:PLAN_SHA256,writer_fingerprint:writer,started_at:", "run_id:runId,mode,chunk,package_fingerprint:PLAN_SHA256,writer_fingerprint:writer,started_at:");
once("proof.writer_fingerprint!==writer)", "proof.writer_fingerprint!==writer||proof.chunk!==chunk)");
source=source.replaceAll('receipts(db)','receipts(db,chunk)');
once("payload->>'_kind'='xy4_family_containment_receipt' order by id`,[SOURCE,PLAN_SHA256]", "payload->>'_kind'='xy4_family_containment_receipt' and payload->>'chunk'=$3 order by id`,[SOURCE,PLAN_SHA256,String(chunk)]");
once("p.sources.length!==6", "p.sources.length!==rows.length||p.chunk!==receipt.payload.chunk");
{
  const before="payload->>'package_fingerprint'=$2`,[SOURCE,PLAN_SHA256]";
  if(source.split(before).length!==3)throw Error('EXPECTED_TWO_RAW_SNAPSHOT_CHECKS');
  source=source.replaceAll(before,"payload->>'package_fingerprint'=$2 and payload->>'chunk'=$3`,[SOURCE,PLAN_SHA256,String(chunk)]");
}
once("package_fingerprint:PLAN_SHA256,writer_fingerprint:writer,run_id:runId,rows,sources", "package_fingerprint:PLAN_SHA256,writer_fingerprint:writer,run_id:runId,chunk,rows,sources");
once("package_fingerprint:PLAN_SHA256,writer_fingerprint:writer,run_id:runId,source_snapshot_raw_import_id", "package_fingerprint:PLAN_SHA256,writer_fingerprint:writer,run_id:runId,chunk,source_snapshot_raw_import_id");
source=source.replaceAll('family-rollback-proof-${PLAN_SHA256}-${writer}.json','family-rollback-proof-${PLAN_SHA256}-${writer}-${chunk}.json');
once("approval:args.includes('--approval')?v('--approval'):null}", "approval:args.includes('--approval')?v('--approval'):null,chunk:args.includes('--chunk')?Number(v('--chunk')):null}");
source=source.replaceAll('Six exact official card images, corrected identities and wrong approval preimages verified','Exact official card images, conflicting species links and family approval preimages verified');
source=source.replaceAll('Official DP4 Unown source bytes and family queue preimages','Official XY4 source bytes and family queue preimages').replaceAll('Exact DP4 Unown family approval containment receipt','Exact XY4 family approval containment receipt').replaceAll('Only six wrong family approvals may be superseded','Only frozen conflicting family approvals may be superseded');
source=source.replaceAll("/([0-9a-f]{24})\\\\.[^/]+$", "/([0-9a-f]{24})[^/]*$");
fs.writeFileSync('backend/catalog/jpn_xy4_family_containment_v1.mjs',source,{flag:'wx'});
console.log('Prepared an unexecuted XY4 containment candidate.');
