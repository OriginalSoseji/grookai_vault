import {assert,DAY_MS,digest,normalize,sha256,SHA256,timestamp} from './common.mjs';

export const ROTATION_2026_URL='https://www.pokemon.com/us/news/2026-pokemon-tcg-standard-format-rotation-announcement';
const LEGACY='https://www.pokemon.com/us/pokemon-news/2026-pokemon-tcg-standard-format-rotation-announcement';
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
function dateLabel(value){
  const match=/^([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(value),month=match&&MONTHS.indexOf(match[1]);
  assert(match&&month>=0,'ROTATION_ANNOUNCEMENT_DATE');
  const result=`${match[3]}-${String(month+1).padStart(2,'0')}-${match[2].padStart(2,'0')}`;timestamp(`${result}T00:00:00.000Z`);return result;
}
const one=(rows,code)=>{assert(rows.length===1,code);return rows[0];};

// Browser accessibility excerpts are a distinct source artifact, not an HTTP
// response. This parser proposes source facts only and never supplies reviews.
export function createRotationAnnouncementCandidate({capture,anchor},asOf){
  const at=timestamp(asOf);
  assert(capture?.version==='pokemon_public_browser_excerpt:v1'&&capture.capture_kind==='windows_chrome_accessibility_article_excerpt'&&
    capture.is_original_http_response===false&&capture.source_admission==='pending','ROTATION_ANNOUNCEMENT_BROWSER_CAPTURE_REQUIRED');
  assert(capture.resolved_url===ROTATION_2026_URL&&[LEGACY,ROTATION_2026_URL].includes(capture.requested_url),'ROTATION_ANNOUNCEMENT_URL');
  assert(typeof capture.excerpt_text==='string'&&Buffer.byteLength(capture.excerpt_text)<=65536&&SHA256.test(capture.excerpt_sha256)&&
    sha256(capture.excerpt_text)===capture.excerpt_sha256,'ROTATION_ANNOUNCEMENT_EXCERPT_CHANGED');
  assert(anchor?.capture_hash===digest(capture)&&anchor.review?.status==='pending','ROTATION_ANNOUNCEMENT_ANCHOR_CHANGED');
  assert(timestamp(capture.observed_at)<=at&&at<timestamp(capture.observed_at)+DAY_MS&&at<timestamp(capture.retain_until),'ROTATION_ANNOUNCEMENT_EXPIRED');
  assert(!/Address and search bar|Google Account:|chrome:\/\/|Order Details/u.test(capture.excerpt_text),'ROTATION_ANNOUNCEMENT_NONARTICLE_DATA');
  const nodes=[...capture.excerpt_text.matchAll(/^(?:[ \t]*\d+ )?text(?: \((?:heading|time)\))? ([^\r\n]*)$/gm)]
    .map(match=>({text:match[1].normalize('NFKC').replace(/\s+/g,' ').trim(),raw_start:match.index,raw_end:match.index+match[0].length}));
  assert(nodes.length>0&&nodes.length<=200,'ROTATION_ANNOUNCEMENT_TEXT_NODES');
  one(nodes.filter(node=>normalize(node.text)==='2026 pokémon tcg standard format rotation announcement'),'ROTATION_ANNOUNCEMENT_HEADING');
  const timing=one(nodes.filter(node=>node.text.startsWith('For in-person Play! Pokémon events,')),'ROTATION_ANNOUNCEMENT_PAPER_TIMING');
  const times=/^For in-person Play! Pokémon events, the Standard format rotation will go into effect on ([A-Za-z]+ \d{1,2}, \d{4})\. For digital play on Pokémon TCG Live, the Standard format rotation will go into effect on ([A-Za-z]+ \d{1,2}, \d{4})\./u.exec(timing.text);
  assert(times,'ROTATION_ANNOUNCEMENT_PLATFORM_DATES');const paper=dateLabel(times[1]),live=dateLabel(times[2]);
  assert(paper.startsWith('2026-')&&live.startsWith('2026-')&&paper>live,'ROTATION_ANNOUNCEMENT_PLATFORM_ORDER');
  const markNode=one(nodes.filter(node=>node.text.startsWith('Cards with the ')),'ROTATION_ANNOUNCEMENT_MARKS');
  const marks=/^Cards with the "([A-Z])" regulation mark will no longer be legal for play in the 2026 Standard format\. Cards with "([A-Z])," "([A-Z])," and "([A-Z])" regulation marks will be legal to use \(as will any future regulation marks that may be released\)\./u
    .exec(markNode.text.replace(/[“”]/gu,'"'));
  assert(marks&&new Set(marks.slice(1)).size===4,'ROTATION_ANNOUNCEMENT_MARKS');
  const reprints=one(nodes.filter(node=>node.text.startsWith('Older versions of cards that don’t have a regulation mark can still be used if the card is currently legal for play.')),'ROTATION_ANNOUNCEMENT_REPRINT_CAVEAT');
  const publication=one(nodes.filter(node=>/^Jan(?:uary)? \d{1,2}, 2026$/u.test(node.text)),'ROTATION_ANNOUNCEMENT_PUBLICATION_DATE');
  const result={version:'pokemon_rotation_announcement_candidate:v1',purpose:'browser_reference_facts_pending_review',as_of:asOf,retain_until:capture.retain_until,
    reference_fresh_until:new Date(Math.min(timestamp(capture.retain_until),timestamp(capture.observed_at)+DAY_MS)).toISOString(),
    source:{url:capture.resolved_url,requested_url:capture.requested_url,observed_at:capture.observed_at,capture_hash:digest(capture),excerpt_sha256:capture.excerpt_sha256,
      kind:capture.capture_kind,is_original_http_response:false,authority:'pokemon_official',source_admission:'pending'},
    publisher_date_label:publication.text,paper_effective_date_label:paper,tcg_live_effective_date_label:live,
    enumerated_standard_mark_candidates:marks.slice(2).sort(),removed_mark_candidate:marks[1],future_marks_not_enumerated:true,
    older_printings_require_separate_reprint_review:true,removed_mark_is_not_exact_print_denial:true,
    evidence_spans:{timing:{start:timing.raw_start,end:timing.raw_end},marks:{start:markNode.raw_start,end:markNode.raw_end},reprint_caveat:{start:reprints.raw_start,end:reprints.raw_end}},
    scope:{ruleset_id:null,region:null,effective_from:null,effective_until:null,date_to_instant_policy:null},review:{status:'pending'},
    rotation_axis_outcome:'unknown',ban_status:'unknown',ruleset_approvals:0,legal_records_admitted:0,qualification_attempted:false,
    limitations:['Published dates are date labels, not inferred UTC effective instants or event times.',
      'The /us/ locale does not establish a regional tournament binding.',
      'A browser excerpt is not a captured HTTP response or admitted document-worker input.',
      'Marks, future marks and older-version caveats do not establish exact-print legality.']};
  return{...result,candidate_id:digest(result)};
}
