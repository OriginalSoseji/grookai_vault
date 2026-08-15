import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import {
  buildOnePieceSealedImageReviewPacketV1,
  validateOnePieceSealedImageReviewPacketV1,
} from "../../backend/pricing/one_piece_sealed_image_review_packet_v1.mjs";
import { sha256 } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CANDIDATE_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_sealed_candidate_v1", "frozen_plan_v1",
  "candidate_plan.json.gz");
const REVIEW_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_identity_review_v1", "frozen_offline_review_v1");
const AUTHORITY_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_official_authority_v1", "official_english_snapshot_v1");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_image_review_packet_v1", "frozen_review_packet_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = { expectedHeadSha: "", outDir: DEFAULT_OUT };
  for (const arg of argv) {
    if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice("--expected-head-sha=".length).trim();
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice("--out-dir=".length));
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

function jsonlGzip(body) {
  return gunzipSync(body).toString("utf8").trim().split(/\r?\n/)
    .filter(Boolean).map(JSON.parse);
}

function escapedJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function renderOnePieceSealedReviewHtmlV1(packet) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>One Piece Sealed Review</title>
<style>
:root{color-scheme:dark;--bg:#05080d;--panel:#0c1421;--line:#263449;--text:#f7f9fc;--muted:#9caac0;--green:#2dd4a0;--amber:#f4b942;--red:#fb7185;--blue:#66b3ff}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 system-ui,sans-serif}header{position:sticky;top:0;z-index:5;background:#05080df2;border-bottom:1px solid var(--line);padding:14px 20px}.bar,.filters{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.bar{justify-content:space-between}h1{font-size:20px;margin:0;letter-spacing:0}.notice{color:var(--amber);font-weight:700}.filters{margin-top:12px}input,select,textarea,button{background:#111c2c;color:var(--text);border:1px solid #34445c;border-radius:6px;padding:9px}input[type=search]{min-width:280px;flex:1}button{cursor:pointer;font-weight:700}button.primary{background:#08775a;border-color:#18a77e}.stats{color:var(--muted)}main{padding:18px;display:grid;grid-template-columns:repeat(auto-fill,minmax(430px,1fr));gap:14px}.item{border:1px solid var(--line);border-radius:8px;background:var(--panel);overflow:hidden}.item-head{padding:14px;border-bottom:1px solid var(--line)}.item h2{font-size:17px;margin:0 0 4px}.meta,.authority{color:var(--muted);font-size:12px}.images{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line)}figure{margin:0;background:#09101a;min-width:0}figure a{display:block;aspect-ratio:1/1;overflow:hidden}img{width:100%;height:100%;object-fit:contain;background:#fff}figcaption{padding:7px 9px;color:var(--muted);background:var(--panel)}.missing{display:grid;place-items:center;aspect-ratio:1/1;color:var(--muted)}.details{padding:12px 14px;border-top:1px solid var(--line)}dl{display:grid;grid-template-columns:130px 1fr;gap:5px 10px;margin:0}dt{color:var(--muted)}dd{margin:0;overflow-wrap:anywhere}.badge{display:inline-block;border:1px solid #3c506d;border-radius:999px;padding:3px 7px;margin:2px 4px 2px 0;font-size:11px}.review{padding:12px 14px;border-top:1px solid var(--line);display:grid;gap:9px}.checks{display:grid;gap:5px}.checks label{display:flex;gap:7px;align-items:flex-start}.review textarea{width:100%;min-height:65px}.hidden{display:none!important}.ok{border-color:#197f64}.reviewed{box-shadow:inset 3px 0 var(--green)}a{color:var(--blue)}
</style></head><body>
<header><div class="bar"><div><h1>One Piece sealed evidence review</h1><div class="notice">Local review only. No database, Storage, pricing, publication, or app writes.</div></div><button class="primary" id="download">Download decisions JSON</button></div>
<div class="filters"><input id="reviewer" placeholder="Reviewer name"><input type="search" id="search" placeholder="Search product, family, ID"><select id="lane"><option value="">All lanes</option><option>official_supported_visual_review</option><option>ambiguous_official_family_review</option><option>residual_source_only_review</option><option>held_scope_review</option></select><select id="status"><option value="">All statuses</option><option value="unreviewed">Unreviewed</option><option value="reviewed">Reviewed</option></select><span class="stats" id="stats"></span></div></header><main id="grid"></main>
<script>const packet=${escapedJson(packet)};const key='op-sealed-review:'+packet.packet_fingerprint_sha256;const saved=JSON.parse(localStorage.getItem(key)||'{}');const decisions=saved.decisions||{};const reviewer=document.querySelector('#reviewer');reviewer.value=saved.reviewer||'';const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const img=(x,label)=>x?'<figure><a href="'+esc(x)+'" target="_blank" rel="noreferrer"><img loading="lazy" src="'+esc(x)+'" alt="'+esc(label)+'"></a><figcaption>'+esc(label)+'</figcaption></figure>':'<figure><div class="missing">No image evidence</div><figcaption>'+esc(label)+'</figcaption></figure>';function current(i){return decisions[i.review_item_fingerprint_sha256]||structuredClone(i.decision_template)}function persist(){localStorage.setItem(key,JSON.stringify({reviewer:reviewer.value,decisions}))}function render(){const q=document.querySelector('#search').value.toLowerCase(),lane=document.querySelector('#lane').value,status=document.querySelector('#status').value;let shown=0;document.querySelector('#grid').innerHTML=packet.payload.items.map(i=>{const d=current(i),isReviewed=d.decision!=='unreviewed',hay=[i.source_product_id,i.source_product_name,i.source_group_name,i.proposed_family.proposed_canonical_name].join(' ').toLowerCase();if((q&&!hay.includes(q))||(lane&&i.review_lane!==lane)||(status==='reviewed'&&!isReviewed)||(status==='unreviewed'&&isReviewed))return '';shown++;const names=i.official_evidence.official_product_names.map(x=>'<span class=badge>'+esc(x)+'</span>').join('')||'<span class=meta>No unique official family record</span>';return '<article class="item '+(isReviewed?'reviewed':'')+'" data-id="'+esc(i.review_item_fingerprint_sha256)+'"><div class=item-head><h2>'+esc(i.source_product_name)+'</h2><div class=meta>TCGPlayer '+esc(i.source_product_id)+' | '+esc(i.review_lane)+' | '+esc(i.proposed_variant.proposed_package_form)+'</div></div><div class=images>'+img(i.source_image.url,'TCGPlayer source reference')+img(i.official_evidence.reference_image_url,'Bandai official family reference')+'</div><div class=details><dl><dt>Proposed family</dt><dd>'+esc(i.proposed_family.proposed_canonical_name)+'</dd><dt>Proposed variant</dt><dd>'+esc(i.proposed_variant.proposed_canonical_name)+'</dd><dt>Language / wave</dt><dd>'+esc(i.proposed_variant.proposed_language_code)+' / '+esc(i.proposed_variant.proposed_wave||'not observed')+'</dd><dt>Official evidence</dt><dd>'+names+(i.official_evidence.official_url?'<br><a target=_blank rel=noreferrer href="'+esc(i.official_evidence.official_url)+'">Open official product page</a>':'')+'</dd><dt>Release / MSRP</dt><dd>'+esc(i.official_evidence.release_date||'not observed')+' / '+esc(i.official_evidence.msrp_text||'not observed')+'</dd><dt>Blockers</dt><dd>'+i.blockers.map(x=>'<span class=badge>'+esc(x)+'</span>').join('')+'</dd></dl></div><div class=review><select data-field=decision>'+i.allowed_decisions.map(x=>'<option '+(d.decision===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select><div class=checks>'+Object.entries(d.confirmations).map(([k,v])=>'<label><input type=checkbox data-check="'+esc(k)+'" '+(v?'checked':'')+'> '+esc(k.replaceAll('_',' '))+'</label>').join('')+'</div><textarea data-field=evidence_note placeholder="Required evidence note for exact confirmation">'+esc(d.evidence_note||'')+'</textarea></div></article>'}).join('');document.querySelector('#stats').textContent=shown+' shown / '+packet.payload.items.length+' total'}document.addEventListener('error',e=>{if(e.target.tagName==='IMG'){const a=e.target.closest('a');if(a)a.outerHTML='<div class="missing">Image unavailable</div>'}},true);document.addEventListener('change',e=>{const a=e.target.closest('.item');if(!a){persist();return}const i=packet.payload.items.find(x=>x.review_item_fingerprint_sha256===a.dataset.id),d=current(i);if(e.target.dataset.field==='decision')d.decision=e.target.value;if(e.target.dataset.check)d.confirmations[e.target.dataset.check]=e.target.checked;decisions[i.review_item_fingerprint_sha256]=d;persist();render()});document.addEventListener('input',e=>{if(e.target.id==='search'){render();return}const a=e.target.closest('.item');if(a&&e.target.dataset.field==='evidence_note'){const i=packet.payload.items.find(x=>x.review_item_fingerprint_sha256===a.dataset.id),d=current(i);d.evidence_note=e.target.value;decisions[i.review_item_fingerprint_sha256]=d;persist()}else persist()});document.querySelector('#lane').onchange=render;document.querySelector('#status').onchange=render;document.querySelector('#download').onclick=()=>{const rows=packet.payload.items.map(i=>({review_item_fingerprint_sha256:i.review_item_fingerprint_sha256,candidate_id:i.candidate_id,source_product_id:i.source_product_id,...current(i),promotion_authorized:false,database_apply_authority:false}));const invalid=rows.filter(r=>r.decision==='exact_variant_visually_confirmed'&&(!Object.values(r.confirmations).every(Boolean)||!String(r.evidence_note).trim()));if(invalid.length){alert(invalid.length+' exact confirmations need all four checks and an evidence note.');return}const out={version:'ONE_PIECE_SEALED_IMAGE_REVIEW_DECISIONS_V1',packet_fingerprint_sha256:packet.packet_fingerprint_sha256,reviewer:reviewer.value.trim()||null,exported_at:new Date().toISOString(),decisions:rows,promotion_authorized:false,database_apply_authority:false};const blob=new Blob([JSON.stringify(out,null,2)+'\\n'],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='one_piece_sealed_review_decisions_v1.json';a.click();URL.revokeObjectURL(a.href)};render();</script></body></html>`;
}

function report(summary) {
  return `${[
    "# One Piece Sealed Image Review Packet V1",
    "",
    `- Status: \`${summary.status}\``,
    `- Producer commit: \`${summary.repository.commit_sha}\``,
    `- Review items: \`${summary.counts.review_items}\``,
    `- TCGPlayer source image references: \`${summary.counts.source_image_references}\``,
    `- Official reference images: \`${summary.counts.official_reference_images}\``,
    `- Official family support rows: \`${summary.counts.official_family_support}\``,
    `- Default unreviewed rows: \`${summary.counts.default_unreviewed}\``,
    "- Database, Storage, pricing, publication, and app writes: `0`",
    "",
    "## Review Lanes",
    "",
    ...Object.entries(summary.counts.lanes).map(([lane, count]) =>
      `- \`${lane}\`: ${count}`),
    "",
    "## Use",
    "",
    "Open `REVIEW_PACKET.html` in a browser. Decisions persist only in that browser's local storage and export as a non-authoritative JSON file. Exact recommendations require all four evidence confirmations and a written note.",
    "",
    "## Authority Boundary",
    "",
    "The review packet cannot write to Grookai. Exported decisions do not authorize promotion or database apply. They must be validated, fingerprinted, and converted into a separately governed apply plan.",
  ].join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (repository.commit_sha !== args.expectedHeadSha ||
      repository.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      !repository.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean review-packet producer");
  }
  const [candidateBody, reviewBody, authoritySummaryBody, bindingsBody] =
    await Promise.all([
      fs.readFile(CANDIDATE_PATH),
      fs.readFile(path.join(REVIEW_DIR, "review_rows.jsonl.gz")),
      fs.readFile(path.join(AUTHORITY_DIR, "summary.json")),
      fs.readFile(path.join(AUTHORITY_DIR, "candidate_official_bindings.jsonl.gz")),
    ]);
  const packet = buildOnePieceSealedImageReviewPacketV1({
    repository,
    candidatePlan: JSON.parse(gunzipSync(candidateBody)),
    reviewRows: jsonlGzip(reviewBody),
    authoritySummary: JSON.parse(authoritySummaryBody),
    bindings: jsonlGzip(bindingsBody),
  });
  const validation = validateOnePieceSealedImageReviewPacketV1(packet);
  if (!validation.valid) {
    throw new Error(`Review packet invalid: ${validation.findings.join(",")}`);
  }
  const rowsBody = Buffer.from(`${packet.payload.items.map((row) =>
    JSON.stringify(row)).join("\n")}\n`);
  const rowsGzip = gzipSync(rowsBody, { level: 9, mtime: 0 });
  const summary = {
    version: packet.version,
    recorded_at: new Date().toISOString(),
    status: "sealed_image_review_packet_passed_no_writes",
    repository,
    packet_fingerprint_sha256: packet.packet_fingerprint_sha256,
    candidate_plan_fingerprint_sha256:
      packet.candidate_plan_fingerprint_sha256,
    review_plan_fingerprint_sha256: packet.review_plan_fingerprint_sha256,
    official_authority_fingerprint_sha256:
      packet.official_authority_fingerprint_sha256,
    counts: packet.counts,
    findings: validation.findings,
    boundaries: packet.boundaries,
    exact_next_gate: "human image review export validation and no-write reconciliation",
  };
  const artifacts = new Map([
    ["summary.json", Buffer.from(`${JSON.stringify(summary, null, 2)}\n`)],
    ["review_items.jsonl.gz", rowsGzip],
    ["REVIEW_PACKET.html", Buffer.from(renderOnePieceSealedReviewHtmlV1(packet))],
    ["REPORT.md", Buffer.from(report(summary))],
  ]);
  await fs.mkdir(args.outDir, { recursive: true });
  for (const [name, body] of artifacts) {
    await fs.writeFile(path.join(args.outDir, name), body);
  }
  const hashes = {
    hash_algorithm: "sha256",
    producer_commit_sha: repository.commit_sha,
    bound_inputs: [
      [CANDIDATE_PATH, candidateBody],
      [path.join(REVIEW_DIR, "review_rows.jsonl.gz"), reviewBody],
      [path.join(AUTHORITY_DIR, "summary.json"), authoritySummaryBody],
      [path.join(AUTHORITY_DIR, "candidate_official_bindings.jsonl.gz"), bindingsBody],
    ].map(([file, body]) => ({
      path: path.relative(ROOT, file).replaceAll("\\", "/"),
      sha256: sha256(body),
    })),
    artifacts: Object.fromEntries([...artifacts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, body]) => [name, { sha256: sha256(body), bytes: body.length }])),
  };
  await fs.writeFile(path.join(args.outDir, "artifact_hashes.json"),
    `${JSON.stringify(hashes, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
