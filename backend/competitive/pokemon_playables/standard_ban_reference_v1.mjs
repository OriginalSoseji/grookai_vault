import {assert,DAY_MS,digest,normalize,sha256,SHA256,timestamp} from './common.mjs';

export const OFFICIAL_BAN_LIST_URL='https://www.pokemon.com/us/play-pokemon/about/pokemon-tcg-banned-card-list';
const NONE='No cards are currently banned in the Standard format.';
const one=(rows,code)=>{assert(rows.length===1,code);return rows[0];};

// Empty Standard bans require an explicit publisher assertion in a complete,
// bounded Standard section. Missing content and other formats never imply it.
export function createStandardBanReference({capture,anchor},asOf){
  const at=timestamp(asOf);
  assert(capture?.version==='pokemon_public_browser_excerpt:v1'&&capture.capture_kind==='windows_chrome_accessibility_article_excerpt'&&
    capture.is_original_http_response===false&&capture.source_admission==='pending','STANDARD_BAN_BROWSER_CAPTURE_REQUIRED');
  assert(capture.requested_url===OFFICIAL_BAN_LIST_URL&&capture.resolved_url===OFFICIAL_BAN_LIST_URL,'STANDARD_BAN_REFERENCE_URL');
  const raw=capture.excerpt_text;
  assert(typeof raw==='string'&&Buffer.byteLength(raw)<=65536&&SHA256.test(capture.excerpt_sha256)&&sha256(raw)===capture.excerpt_sha256,'STANDARD_BAN_EXCERPT_CHANGED');
  assert(anchor?.capture_hash===digest(capture)&&anchor.review?.status==='pending','STANDARD_BAN_ANCHOR_CHANGED');
  assert(timestamp(capture.observed_at)<=at&&at<timestamp(capture.observed_at)+DAY_MS&&at<timestamp(capture.retain_until),'STANDARD_BAN_REFERENCE_EXPIRED');
  assert(!/Address and search bar|Google Account:|chrome:\/\/|Order Details/u.test(raw),'STANDARD_BAN_NONARTICLE_DATA');
  const headings=[...raw.matchAll(/^(?:[ \t]*\d+ )?text \(heading\) ([^\r\n]+)$/gm)]
    .map(match=>({label:normalize(match[1]),start:match.index,end:match.index+match[0].length}));
  assert(headings.length===4&&headings.map(heading=>heading.label).join('|')==='pokémon tcg banned card list|standard|expanded|unlimited','STANDARD_BAN_FORMAT_BOUNDARIES');
  const standard=raw.slice(headings[1].end,headings[2].start),expanded=raw.slice(headings[2].end,headings[3].start);
  const nodes=[...standard.matchAll(/^[ \t]*\d+ (list item|text) ([^\r\n]*)$/gm)].map(match=>({kind:match[1],value:match[2].trim()})).filter(node=>node.value);
  const listItem=one(nodes.filter(node=>node.kind==='list item'),'STANDARD_BAN_EXPLICIT_ASSERTION_REQUIRED'),text=one(nodes.filter(node=>node.kind==='text'),'STANDARD_BAN_EXPLICIT_ASSERTION_REQUIRED');
  assert(listItem.value===NONE&&text.value===NONE,'STANDARD_BAN_EMPTY_OR_UNSUPPORTED');
  const containers=[...standard.matchAll(/^[ \t]*\d+ list[ \t]*$/gm)];assert(containers.length===1,'STANDARD_BAN_LIST_CONTAINER');
  for(const line of standard.split(/\r?\n/).map(line=>line.trim()).filter(Boolean)){
    const match=/^\d+ (list item|list|text)(?: (.*))?$/.exec(line);
    assert(match&&(match[1]==='list'?!match[2]:!match[2]||match[2]===NONE),'STANDARD_BAN_UNSUPPORTED_SECTION_CONTENT');
  }
  const expandedRows=[...expanded.matchAll(/^[ \t]*\d+ list item ([^\r\n]+)$/gm)];
  assert(expandedRows.length>0,'STANDARD_BAN_EXPANDED_BOUNDARY_CONTENT');
  const result={version:'pokemon_standard_ban_reference:v1',purpose:'browser_reference_facts_pending_review',as_of:asOf,retain_until:capture.retain_until,
    reference_fresh_until:new Date(Math.min(timestamp(capture.retain_until),timestamp(capture.observed_at)+DAY_MS)).toISOString(),
    source:{url:OFFICIAL_BAN_LIST_URL,observed_at:capture.observed_at,capture_hash:digest(capture),excerpt_sha256:capture.excerpt_sha256,
      kind:capture.capture_kind,is_original_http_response:false,authority:'pokemon_official',source_admission:'pending'},
    format:'standard',publisher_statement:NONE,publisher_reports_no_standard_bans:true,standard_banned_cards_candidate:[],
    evidence_span:{start:headings[1].start,end:headings[2].start},expanded_list_rows_observed:expandedRows.length,unlimited_section_present:true,
    publisher_revision_label:null,scope:{ruleset_id:null,region:null,effective_from:null,effective_until:null},review:{status:'pending'},
    ban_axis_outcome:'unknown',legality_approvals:0,legal_records_admitted:0,qualification_attempted:false,
    limitations:['An explicit publisher statement supplies a current reference candidate, not a reviewed card-legality decision.',
      'No historical effective period or region is inferred from an observation or URL locale.',
      'Expanded and Unlimited content does not supply Standard membership or absence.',
      'This browser artifact is not an admitted HTTP document-worker receipt.']};
  return{...result,reference_id:digest(result)};
}
