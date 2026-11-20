// Exact source admission for a frozen 62-row XY4 family-review containment.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
export const PLAN_SHA256='6cf22a949a8ef140227801d3317356507766f6d858a9d162b8d9a1d7c6654538';
export const sha256=(b)=>crypto.createHash('sha256').update(b).digest('hex');
export function validateFamilyContainment(read){
  const bytes=read('family-plan.json');assert.equal(sha256(bytes),PLAN_SHA256);
  const plan=JSON.parse(bytes);assert.equal(plan.version,'XY4_FAMILY_CONTAINMENT_PREFLIGHT_V1');assert.equal(plan.project_ref,'ycdxbpibncqcchqiihfz');assert.equal(plan.rows.length,62);
  const seen=new Set(),prefixes=new Set(),queueIds=new Set();
  for(const r of plan.rows){
    const p=r.parent_before,s=r.source,e=r.expected,q=r.target_queue_before;
    assert.ok(p&&!seen.has(p.id)&&!queueIds.has(q.id)&&!prefixes.has(s.image_sha256.slice(0,24)));seen.add(p.id);queueIds.add(q.id);prefixes.add(s.image_sha256.slice(0,24));
    assert.equal(p.set_code,'jpn-xy4');assert.equal(p.identity_domain,'pokemon_jpn');assert.equal(p.image_status,'exact');assert.equal(p.image_path,s.current.image_path);assert.equal(p.printed_set_abbrev,'XY4');
    assert.equal(r.identities_before.filter(i=>i.is_active).length,1);assert.deepEqual(r.identities_before.find(i=>i.is_active),r.identity_before);
    assert.equal(r.identity_before.printed_number,p.number);assert.ok(r.identity_before.identity_payload.normalized_family_name_candidates.includes(e.wrong_family));
    assert.equal(r.links_before.filter(l=>l.active&&l.role==='primary').length,1);assert.equal(r.links_before.find(l=>l.active&&l.role==='primary').species_id,r.species_before.id);
    assert.notEqual(Number(r.species_before.national_dex_number),Number(e.official_dex));
    assert.equal(r.queues_before.filter(x=>x.active&&x.review_status==='approved_for_family_link_promotion'&&x.family_link_promotion_allowed).length,1);
    assert.deepEqual(r.queues_before.find(x=>x.id===q.id),q);assert.equal(q.card_print_id,p.id);assert.equal(q.card_print_identity_id,r.identity_before.id);
    assert.equal(q.normalized_family_candidate,e.wrong_family);assert.equal(q.review_status,'approved_for_family_link_promotion');assert.equal(q.family_link_promotion_allowed,true);assert.equal(q.active,true);
    const page=read(`official-captures/${s.official_id}.html`),image=read(`official-captures/${s.official_id}.jpg`),html=page.toString('utf8');
    assert.equal(sha256(page),s.official_page_sha256);assert.equal(sha256(image),s.image_sha256);
    assert.equal(new URL(s.official_page).hostname,'www.pokemon-card.com');assert.equal(new URL(s.official_image).hostname,'www.pokemon-card.com');
    const heading=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g,'').trim(),dex=html.match(/<h4>\s*No\.(\d+)\s*[^<]*<\/h4>/i)?.[1];
    const number=html.match(/alt="XY4"\s*\/>\s*&nbsp;(\d+)&nbsp;\/&nbsp;(\d+)&nbsp;/i);
    const imageUrl=html.match(/<img\b[^>]*\bsrc="([^"]*\/card_images\/large\/XY4\/[^"?]+)"[^>]*>/i)?.[1];
    assert.equal(heading,p.name);assert.equal(Number(dex),Number(e.official_dex));assert.equal(number?.[1],e.official_printed_number);assert.equal(Number(number?.[2]),88);
    assert.equal(new URL(imageUrl,s.official_page).href,s.official_image);
  }
  return plan;
}
export function supersededQueue(r){return {...r.target_queue_before,review_status:'superseded',family_link_promotion_allowed:false};}
