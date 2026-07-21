import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { CARD_VISUAL_CORPUS_EXPECTED_BRANCH, sha256JsonV1 } from "./card_visual_corpus_v1_inventory.mjs";

export const CARD_VISUAL_SEARCH_JUDGMENT_PACKET_VERSION = "CARD_VISUAL_SEARCH_JUDGMENT_PACKET_V1";
export const CARD_VISUAL_SEARCH_GOLD_JUDGMENT_VERSION = "CARD_VISUAL_SEARCH_JUDGMENTS_V1_CALIBRATION_DRAFT";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_BOOTSTRAP_DIR = "docs/audits/card_visual_search_evaluation_bootstrap_v1/2026-07-21T17-51-47-805Z_bootstrap_4548a65b9be3";
const DEFAULT_CORPUS_INVENTORY = "docs/audits/card_visual_corpus_v1/2026-07-21T15-51-01-795Z_inventory_3f72560c3b04/corpus_valid_candidates.jsonl";
const DEFAULT_OUTPUT_ROOT = "docs/audits/card_visual_search_judgment_packet_v1";
const IMAGE_PATH_PREFIXES = ["warehouse-derived/self-hosted-images-v1/", "warehouse-derived/image-truth-v1/"];

function repoPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value);
}

function posixRelative(value) {
  return path.relative(REPO_ROOT, value).replace(/\\/gu, "/");
}

function parseFlag(argv, name) {
  const prefix = `--${name}=`;
  const entry = argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

export function parseCardVisualSearchJudgmentPacketArgsV1(argv = []) {
  return {
    bootstrapDir: parseFlag(argv, "bootstrap-dir") ?? DEFAULT_BOOTSTRAP_DIR,
    corpusInventory: parseFlag(argv, "corpus-inventory") ?? DEFAULT_CORPUS_INVENTORY,
    outputRoot: parseFlag(argv, "output-root") ?? DEFAULT_OUTPUT_ROOT,
    outputDir: parseFlag(argv, "output-dir"),
    resultLimit: Number.parseInt(parseFlag(argv, "result-limit") ?? "10", 10),
  };
}

function nowIso() {
  return new Date().toISOString();
}

function safeTimestamp(value = nowIso()) {
  return value.replace(/[:.]/gu, "-");
}

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const rows = [];
  const stream = readline.createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of stream) if (line.trim()) rows.push(JSON.parse(line));
  return rows;
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeJsonl(filePath, rows) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""));
}

function currentGitState() {
  const git = (args) => execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  return {
    commit_sha: git(["rev-parse", "HEAD"]),
    branch: git(["branch", "--show-current"]),
    tracked_status_short: git(["status", "--short", "--untracked-files=no"]),
  };
}

export function grookaiImageUrlV1(imageSourceKey) {
  const normalized = String(imageSourceKey ?? "").trim().replace(/^\/+/, "");
  if (!IMAGE_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return null;
  return `https://grookaivault.com/api/canon/image?path=${encodeURIComponent(normalized)}`;
}

function sourceRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.generated_outputs)) return payload.generated_outputs;
  return [payload];
}

function sourceRecordId(record) {
  return record?.card_print_id ?? record?.card?.card_print_id ?? record?.generated_row?.card_print_id ?? null;
}

function imageMetadata(record) {
  const generated = record?.generated_row ?? record;
  const imageSourceKey = generated?.image_source_key ?? generated?.image_storage_path ?? record?.image_source_key ?? null;
  return {
    image_source_key: imageSourceKey,
    image_url: grookaiImageUrlV1(imageSourceKey),
    image_sha256: generated?.image_sha256 ?? record?.image_sha256 ?? null,
    image_width: generated?.image_width ?? null,
    image_height: generated?.image_height ?? null,
    image_mime_type: generated?.image_mime_type ?? null,
  };
}

async function loadImageMetadata(requiredCardIds, corpusInventoryPath) {
  const inventoryRows = await readJsonl(corpusInventoryPath);
  const sourceByCard = new Map(inventoryRows.map((row) => [row.card_print_id, row.source_artifact_path]));
  const idsBySource = new Map();
  const missingInventoryIds = [];
  for (const cardId of requiredCardIds) {
    const source = sourceByCard.get(cardId);
    if (!source) {
      missingInventoryIds.push(cardId);
      continue;
    }
    if (!idsBySource.has(source)) idsBySource.set(source, new Set());
    idsBySource.get(source).add(cardId);
  }

  const result = new Map();
  const unreadableSources = [];
  for (const [source, ids] of idsBySource) {
    try {
      const payload = await readJson(repoPath(source));
      for (const record of sourceRecords(payload)) {
        const cardId = sourceRecordId(record);
        if (cardId && ids.has(cardId)) result.set(cardId, imageMetadata(record));
      }
    } catch (error) {
      unreadableSources.push({ source_artifact_path: source, error: error.message });
    }
  }
  return {
    image_by_card_id: result,
    missing_inventory_ids: missingInventoryIds.sort(),
    missing_image_ids: [...requiredCardIds].filter((cardId) => !result.get(cardId)?.image_url).sort(),
    unreadable_sources: unreadableSources,
  };
}

function evidenceSummary(result) {
  return result.matched_evidence.map((entry) => ({
    query_concept: entry.query_concept,
    term: entry.term,
    document_type: entry.document_type,
    source_type: entry.source_type,
    subject_role: entry.subject_role,
    supporting_observation_ids: entry.supporting_observation_ids,
  }));
}

export function buildCalibrationJudgmentRowsV1(querySuite, rankedOutputs, imageByCardId, { resultLimit = 10, artworkByGroupId = new Map() } = {}) {
  const queries = new Map(querySuite.filter((query) => query.split === "calibration").map((query) => [query.query_id, query]));
  if (queries.size !== 200) throw new Error(`expected 200 calibration queries, found ${queries.size}`);
  if (querySuite.some((query) => query.split === "holdout" && query.bootstrap_candidate_judgment)) throw new Error("holdout expectation leaked into public query suite");
  if (rankedOutputs.length !== 200) throw new Error(`expected 200 ranked outputs, found ${rankedOutputs.length}`);

  return rankedOutputs.map((ranked) => {
    const query = queries.get(ranked.query_id);
    if (!query) throw new Error(`ranked output missing calibration query ${ranked.query_id}`);
    const expectedGroupId = query.bootstrap_candidate_judgment?.expected_artwork_group_id ?? null;
    const expectedResult = ranked.results.find((result) => result.artwork_group_id === expectedGroupId) ?? null;
    const sourcePrinting = expectedResult?.matching_printings?.[0] ?? null;
    const sourceArtwork = artworkByGroupId.get(expectedGroupId) ?? null;
    const sourceCardPrintId = expectedResult?.representative_card_print_id ?? sourceArtwork?.representative_card_print_id ?? null;
    const topResults = ranked.results.slice(0, resultLimit).map((result, index) => {
      const printing = result.matching_printings[0];
      return {
        rank: index + 1,
        artwork_group_id: result.artwork_group_id,
        representative_card_print_id: result.representative_card_print_id,
        gv_id: printing?.gv_id ?? null,
        name: result.representative_name,
        set_code: printing?.set_code ?? null,
        number: printing?.number ?? null,
        prompt_branch: result.prompt_branch,
        eligibility_tier: result.eligibility_tier,
        score: result.score,
        score_components: result.score_components,
        printing_count: result.matching_printings.length,
        image: imageByCardId.get(result.representative_card_print_id) ?? null,
        evidence: evidenceSummary(result),
        judgment: null,
        exclusion_reason: null,
        notes: null,
      };
    });
    const sourceAlreadyRanked = topResults.some((result) => result.artwork_group_id === expectedGroupId);
    return {
      packet_version: CARD_VISUAL_SEARCH_JUDGMENT_PACKET_VERSION,
      judgment_set_version: CARD_VISUAL_SEARCH_GOLD_JUDGMENT_VERSION,
      query_id: query.query_id,
      family: query.family,
      query_text: query.query_text,
      intent: query.intent,
      required_evidence_categories: query.required_evidence_categories,
      valid_zero_candidate: query.valid_zero_result,
      result_count: ranked.total_matches,
      top_results: topResults,
      source_candidate: expectedGroupId ? {
        artwork_group_id: expectedGroupId,
        present_in_top_results: sourceAlreadyRanked,
        rank: ranked.bootstrap_evaluation.rank || null,
        representative_card_print_id: sourceCardPrintId,
        gv_id: sourcePrinting?.gv_id ?? sourceArtwork?.gv_id ?? null,
        name: expectedResult?.representative_name ?? sourceArtwork?.name ?? null,
        set_code: sourcePrinting?.set_code ?? sourceArtwork?.set_code ?? null,
        number: sourcePrinting?.number ?? sourceArtwork?.number ?? null,
        image: sourceCardPrintId ? imageByCardId.get(sourceCardPrintId) ?? null : null,
        authority: "source_derived_candidate_not_human_gold",
        judgment: null,
        notes: null,
      } : null,
      review: {
        reviewer_key: null,
        query_decision: null,
        failure_labels: [],
        notes: null,
        completed_at: null,
      },
    };
  });
}

function escapeScriptJson(value) {
  return JSON.stringify(value).replace(/</gu, "\\u003c").replace(/\u2028/gu, "\\u2028").replace(/\u2029/gu, "\\u2029");
}

export function renderCalibrationDashboardV1(packet) {
  const data = escapeScriptJson(packet);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Grookai Visual Search Calibration</title>
<style>
:root{color-scheme:light;--ink:#171a1d;--muted:#657078;--line:#d8dddf;--paper:#f7f8f6;--panel:#fff;--green:#176b4d;--amber:#9b5d00;--red:#a83333;--blue:#245d82}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:0}header{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid var(--line);padding:12px 18px}.bar{display:grid;grid-template-columns:minmax(220px,1fr) auto auto;gap:12px;align-items:center;max-width:1500px;margin:auto}h1{font-size:18px;margin:0}.meta{color:var(--muted);font-size:12px}.controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}button,input,select,textarea{font:inherit;letter-spacing:0}button{min-height:34px;border:1px solid #aeb7bb;background:#fff;border-radius:5px;padding:6px 10px;cursor:pointer}button:hover{border-color:var(--green)}button.primary{background:var(--green);border-color:var(--green);color:#fff}input,select,textarea{border:1px solid #b9c1c5;border-radius:4px;background:#fff;padding:7px}main{max-width:1500px;margin:0 auto;padding:18px}.query-head{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:start;margin-bottom:16px}.query-head h2{font-size:24px;margin:0 0 5px}.chips{display:flex;gap:6px;flex-wrap:wrap}.chip{border:1px solid var(--line);background:#eef1ef;border-radius:4px;padding:3px 7px;font-size:12px}.results{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}.result{background:var(--panel);border:1px solid var(--line);border-radius:6px;overflow:hidden}.result.expected{border-color:var(--amber);box-shadow:inset 0 0 0 1px var(--amber)}.image{aspect-ratio:3/4;background:#e7eae8;display:flex;align-items:center;justify-content:center;overflow:hidden}.image img{width:100%;height:100%;object-fit:contain}.image span{color:var(--muted);padding:16px;text-align:center}.content{padding:10px}.rank{font-weight:700;color:var(--blue)}h3{font-size:15px;margin:4px 0}.small{font-size:12px;color:var(--muted)}.evidence{margin:8px 0;padding:7px;background:#f0f3f1;border-left:3px solid var(--green);font-size:12px;min-height:48px}.judgment{display:grid;gap:7px}.judgment textarea{width:100%;min-height:52px;resize:vertical}.source{margin-top:16px;padding:12px;border:1px dashed var(--amber);background:#fffaf0}.review{margin-top:16px;padding-top:14px;border-top:1px solid var(--line);display:grid;grid-template-columns:180px 220px 1fr auto;gap:10px;align-items:start}.review textarea{min-height:70px;width:100%}.empty{padding:36px;border:1px solid var(--line);background:#fff;text-align:center;color:var(--muted)}@media(max-width:800px){.bar,.query-head,.review{grid-template-columns:1fr}.controls{justify-content:flex-start}.query-head h2{font-size:20px}}
</style>
</head>
<body>
<header><div class="bar"><div><h1>Grookai Visual Search Calibration</h1><div class="meta" id="progress"></div></div><div class="controls"><button id="prev">Prev</button><button id="next">Next</button><select id="filter"><option value="all">All queries</option><option value="incomplete">Incomplete</option><option value="complete">Complete</option><option value="failures">With failures</option></select></div><div class="controls"><input id="reviewer" placeholder="Reviewer key"><button class="primary" id="export">Export JSONL</button></div></div></header>
<main id="app"></main>
<script>
const packet=${data};
const labels=["","highly_relevant","relevant","acceptable_alternate","not_relevant","must_exclude"];
const failureLabels=["correct_result_missing","incorrect_result_included","correct_artwork_wrong_printing_expansion","correct_cue_wrong_subject_role","unsupported_inference","alias_overreach","count_mismatch","representation_depicted_subject_confusion","scene_subject_representation_confusion","duplicate_artwork_crowding","canonical_filter_violation","evidence_explanation_mismatch","valid_zero_result","latency_budget_failure","index_coverage_gap"];
const storageKey="grookai-visual-search-calibration:"+packet.run_key;
let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey)||"{}")}catch{}
let index=0;
const reviewer=document.getElementById("reviewer");reviewer.value=saved.reviewer_key||"";
reviewer.addEventListener("input",()=>{saved.reviewer_key=reviewer.value;persist()});
function stateFor(q){return saved[q.query_id]||(saved[q.query_id]={review:{query_decision:"",failure_labels:[],notes:"",completed_at:null},results:{},source:{judgment:"",notes:""}})}
function persist(){localStorage.setItem(storageKey,JSON.stringify(saved));updateProgress()}
function filtered(){const mode=document.getElementById("filter").value;return packet.queries.filter(q=>{const s=stateFor(q);if(mode==="incomplete")return !s.review.completed_at;if(mode==="complete")return !!s.review.completed_at;if(mode==="failures")return s.review.failure_labels.length>0;return true})}
function h(value){return String(value??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]))}
function options(value){return labels.map(x=>'<option value="'+h(x)+'" '+(x===value?'selected':'')+'>'+h(x||'Select judgment')+'</option>').join('')}
function imageHtml(item){const image=item?.image?.image_url;return image?'<img src="'+h(image)+'" alt="'+h(item.name||item.gv_id||'Card')+'" loading="lazy">':'<span>Image unavailable<br>'+h(item?.gv_id||'')+'</span>'}
function resultHtml(q,item,isSource=false){const s=stateFor(q);const key=isSource?'source':item.artwork_group_id;const j=isSource?s.source:(s.results[key]||(s.results[key]={judgment:'',exclusion_reason:'',notes:''}));const evidence=isSource?'Source-derived candidate; human judgment required.':item.evidence.map(e=>e.query_concept+': '+e.term).join(' | ');return '<article class="result '+(isSource||item.artwork_group_id===q.source_candidate?.artwork_group_id?'expected':'')+'"><div class="image">'+imageHtml(item)+'</div><div class="content"><div class="rank">'+(isSource?'Source candidate':'Rank '+item.rank)+'</div><h3>'+h(item.name||item.gv_id||item.artwork_group_id)+'</h3><div class="small">'+h((item.gv_id||'')+' '+(item.set_code||'')+' '+(item.number||'')+(item.eligibility_tier?' | Tier '+item.eligibility_tier:''))+'</div><div class="evidence">'+h(evidence||'No matched evidence')+'</div><div class="judgment"><select data-kind="'+(isSource?'source':'result')+'" data-key="'+h(key)+'">'+options(j.judgment)+'</select><textarea data-note="'+(isSource?'source':'result')+'" data-key="'+h(key)+'" placeholder="Evidence note">'+h(j.notes||'')+'</textarea></div></div></article>'}
function render(){const rows=filtered();if(index>=rows.length)index=Math.max(0,rows.length-1);const q=rows[index];if(!q){document.getElementById('app').innerHTML='<div class="empty">No queries in this view.</div>';updateProgress();return}const s=stateFor(q);const chips=[q.query_id,q.family,q.valid_zero_candidate?'zero-result candidate':q.result_count+' corpus matches'].map(x=>'<span class="chip">'+h(x)+'</span>').join('');const resultCards=q.top_results.map(r=>resultHtml(q,r)).join('')||'<div class="empty">No ranked results.</div>';const source=q.source_candidate&&!q.source_candidate.present_in_top_results?'<section class="source"><h3>Source candidate outside top 10</h3><div class="results">'+resultHtml(q,q.source_candidate,true)+'</div></section>':'';const failChecks=failureLabels.map(f=>'<label><input type="checkbox" data-failure="'+h(f)+'" '+(s.review.failure_labels.includes(f)?'checked':'')+'> '+h(f)+'</label>').join('');document.getElementById('app').innerHTML='<section class="query-head"><div><h2>'+h(q.query_text)+'</h2><div class="chips">'+chips+'</div></div><div class="small">Concepts: '+h((q.intent.visual_concepts||[]).join(', ')||'none')+'<br>Roles: '+h((q.intent.subject_roles||[]).join(', ')||'none')+'</div></section><section class="results">'+resultCards+'</section>'+source+'<section class="review"><select id="queryDecision"><option value="">Query decision</option><option value="results_judged" '+(s.review.query_decision==='results_judged'?'selected':'')+'>Results judged</option><option value="valid_zero_result" '+(s.review.query_decision==='valid_zero_result'?'selected':'')+'>Valid zero result</option><option value="query_invalid" '+(s.review.query_decision==='query_invalid'?'selected':'')+'>Query invalid</option></select><details><summary>Failure labels ('+s.review.failure_labels.length+')</summary>'+failChecks+'</details><textarea id="queryNotes" placeholder="Query-level notes">'+h(s.review.notes||'')+'</textarea><button class="primary" id="complete">'+(s.review.completed_at?'Reopen':'Complete')+'</button></section>';bind(q,s);updateProgress()}
function bind(q,s){document.querySelectorAll('select[data-kind="result"]').forEach(el=>el.onchange=()=>{const x=s.results[el.dataset.key]||(s.results[el.dataset.key]={});x.judgment=el.value;persist()});document.querySelectorAll('textarea[data-note="result"]').forEach(el=>el.oninput=()=>{const x=s.results[el.dataset.key]||(s.results[el.dataset.key]={});x.notes=el.value;persist()});document.querySelectorAll('[data-kind="source"]').forEach(el=>el.onchange=()=>{s.source.judgment=el.value;persist()});document.querySelectorAll('[data-note="source"]').forEach(el=>el.oninput=()=>{s.source.notes=el.value;persist()});document.querySelectorAll('[data-failure]').forEach(el=>el.onchange=()=>{s.review.failure_labels=[...document.querySelectorAll('[data-failure]:checked')].map(x=>x.dataset.failure);persist()});document.getElementById("queryDecision").onchange=e=>{s.review.query_decision=e.target.value;persist()};document.getElementById("queryNotes").oninput=e=>{s.review.notes=e.target.value;persist()};document.getElementById("complete").onclick=()=>{s.review.completed_at=s.review.completed_at?null:new Date().toISOString();persist();if(s.review.completed_at){index=Math.min(index+1,filtered().length-1)}render()}}
function updateProgress(){const done=packet.queries.filter(q=>stateFor(q).review.completed_at).length;const rows=filtered();document.getElementById("progress").textContent=done+'/'+packet.queries.length+' complete | '+rows.length+' in view | '+(index+1)+'/'+Math.max(rows.length,1)}
document.getElementById("prev").onclick=()=>{index=Math.max(0,index-1);render()};document.getElementById("next").onclick=()=>{index=Math.min(filtered().length-1,index+1);render()};document.getElementById("filter").onchange=()=>{index=0;render()};document.getElementById("export").onclick=()=>{const rows=packet.queries.map(q=>{const s=stateFor(q);return {judgment_set_version:packet.judgment_set_version,packet_version:packet.packet_version,query_id:q.query_id,reviewer_key:reviewer.value||null,source_commit_sha:packet.commit_sha,source_run_key:packet.run_key,query_decision:s.review.query_decision||null,failure_labels:s.review.failure_labels,notes:s.review.notes||null,completed_at:s.review.completed_at,top_result_judgments:q.top_results.map(r=>({artwork_group_id:r.artwork_group_id,rank:r.rank,judgment:s.results[r.artwork_group_id]?.judgment||null,notes:s.results[r.artwork_group_id]?.notes||null})),source_candidate_judgment:q.source_candidate&&!q.source_candidate.present_in_top_results?{artwork_group_id:q.source_candidate.artwork_group_id,judgment:s.source.judgment||null,notes:s.source.notes||null}:null}});const blob=new Blob([rows.map(x=>JSON.stringify(x)).join("\\n")+"\\n"],{type:"application/x-ndjson"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download='CARD_VISUAL_SEARCH_JUDGMENTS_V1_'+(reviewer.value||'reviewer')+'.jsonl';a.click();URL.revokeObjectURL(a.href)};
render();
</script>
</body>
</html>`;
}

async function hashManifest(outputDir, files) {
  const entries = {};
  for (const file of files) entries[file] = sha256Buffer(await fs.readFile(path.join(outputDir, file)));
  return { artifact_kind: "card_visual_search_judgment_packet_v1_hash_manifest", hash_algorithm: "sha256", generated_at: nowIso(), directory: posixRelative(outputDir), file_count: files.length, files: entries };
}

export async function runCardVisualSearchJudgmentPacketV1(args = parseCardVisualSearchJudgmentPacketArgsV1([])) {
  const git = currentGitState();
  if (git.branch !== CARD_VISUAL_CORPUS_EXPECTED_BRANCH) throw new Error(`expected branch ${CARD_VISUAL_CORPUS_EXPECTED_BRANCH}, found ${git.branch}`);
  if (git.tracked_status_short) throw new Error(`tracked working tree must be clean: ${git.tracked_status_short}`);
  if (!Number.isInteger(args.resultLimit) || args.resultLimit !== 10) throw new Error("V1 judgment packet result-limit must equal 10");
  const bootstrapDir = repoPath(args.bootstrapDir);
  const corpusInventoryPath = repoPath(args.corpusInventory);
  const report = await readJson(path.join(bootstrapDir, "BOOTSTRAP_EVALUATION_REPORT.json"));
  if (report.reconciliation?.reconciled !== true || report.query_suite?.holdout_executed !== false) throw new Error("bootstrap input must be reconciled with holdout unexecuted");
  const querySuite = await readJsonl(path.join(bootstrapDir, "query_suite.jsonl"));
  const rankedOutputs = await readJsonl(path.join(bootstrapDir, "ranked_outputs.jsonl"));
  const projectionDir = repoPath(report.run_plan.projection_dir);
  const [artworks, printings] = await Promise.all([
    readJsonl(path.join(projectionDir, "visual_search_artworks.jsonl")),
    readJsonl(path.join(projectionDir, "visual_search_printings.jsonl")),
  ]);
  const printingById = new Map(printings.map((printing) => [printing.card_print_id, printing]));
  const artworkByGroupId = new Map(artworks.map((artwork) => {
    const printing = printingById.get(artwork.representative_card_print_id);
    return [artwork.artwork_group_id, {
      representative_card_print_id: artwork.representative_card_print_id,
      gv_id: printing?.gv_id ?? null,
      name: printing?.name ?? null,
      set_code: printing?.set_code ?? null,
      number: printing?.number ?? null,
    }];
  }));
  const requiredCardIds = new Set();
  for (const ranked of rankedOutputs) for (const result of ranked.results.slice(0, args.resultLimit)) requiredCardIds.add(result.representative_card_print_id);
  for (const query of querySuite.filter((row) => row.split === "calibration")) {
    const expectedGroupId = query.bootstrap_candidate_judgment?.expected_artwork_group_id;
    const sourceCardPrintId = artworkByGroupId.get(expectedGroupId)?.representative_card_print_id;
    if (sourceCardPrintId) requiredCardIds.add(sourceCardPrintId);
  }
  const imageMetadataResult = await loadImageMetadata(requiredCardIds, corpusInventoryPath);
  const queries = buildCalibrationJudgmentRowsV1(querySuite, rankedOutputs, imageMetadataResult.image_by_card_id, { resultLimit: args.resultLimit, artworkByGroupId });
  const runKey = sha256JsonV1({ version: CARD_VISUAL_SEARCH_JUDGMENT_PACKET_VERSION, commit_sha: git.commit_sha, bootstrap_run_key: report.run_plan.run_key, query_suite_hash: sha256Buffer(await fs.readFile(path.join(bootstrapDir, "query_suite.jsonl"))), ranked_outputs_hash: sha256Buffer(await fs.readFile(path.join(bootstrapDir, "ranked_outputs.jsonl"))), result_limit: args.resultLimit });
  const outputDir = args.outputDir ? repoPath(args.outputDir) : path.join(repoPath(args.outputRoot), `${safeTimestamp()}_packet_${runKey.slice(0, 12)}`);
  const packet = {
    packet_version: CARD_VISUAL_SEARCH_JUDGMENT_PACKET_VERSION,
    judgment_set_version: CARD_VISUAL_SEARCH_GOLD_JUDGMENT_VERSION,
    created_at: nowIso(),
    run_key: runKey,
    commit_sha: git.commit_sha,
    branch: git.branch,
    source_bootstrap_dir: posixRelative(bootstrapDir),
    source_bootstrap_run_key: report.run_plan.run_key,
    calibration_query_count: queries.length,
    holdout_query_count: 0,
    result_limit: args.resultLimit,
    image_resolution: {
      required_card_ids: requiredCardIds.size,
      resolved_images: requiredCardIds.size - imageMetadataResult.missing_image_ids.length,
      missing_image_ids: imageMetadataResult.missing_image_ids,
      missing_inventory_ids: imageMetadataResult.missing_inventory_ids,
      unreadable_sources: imageMetadataResult.unreadable_sources,
      remote_images_fetched_during_build: false,
    },
    boundaries: { provider_calls: false, database_connection: false, database_writes: false, approvals: false, embeddings: false, persistent_index_writes: false, holdout_exposed: false, public_reads: false },
    queries,
  };
  const templateRows = queries.map((query) => ({ judgment_set_version: CARD_VISUAL_SEARCH_GOLD_JUDGMENT_VERSION, query_id: query.query_id, reviewer_key: null, query_decision: null, failure_labels: [], notes: null, completed_at: null, top_result_judgments: query.top_results.map((result) => ({ artwork_group_id: result.artwork_group_id, rank: result.rank, judgment: null, notes: null })), source_candidate_judgment: query.source_candidate && !query.source_candidate.present_in_top_results ? { artwork_group_id: query.source_candidate.artwork_group_id, judgment: null, notes: null } : null }));
  const files = ["run_plan.json", "calibration_review_packet.json", "calibration_judgment_template.jsonl", "CALIBRATION_REVIEW_DASHBOARD.html", "JUDGMENT_PACKET_REPORT.json"];
  await writeJson(path.join(outputDir, "run_plan.json"), { packet_version: CARD_VISUAL_SEARCH_JUDGMENT_PACKET_VERSION, created_at: packet.created_at, run_key: runKey, commit_sha: git.commit_sha, branch: git.branch, source_bootstrap_dir: packet.source_bootstrap_dir, source_bootstrap_run_key: packet.source_bootstrap_run_key, result_limit: args.resultLimit, boundaries: packet.boundaries });
  await writeJson(path.join(outputDir, "calibration_review_packet.json"), packet);
  await writeJsonl(path.join(outputDir, "calibration_judgment_template.jsonl"), templateRows);
  await fs.writeFile(path.join(outputDir, "CALIBRATION_REVIEW_DASHBOARD.html"), renderCalibrationDashboardV1(packet));
  await writeJson(path.join(outputDir, "JUDGMENT_PACKET_REPORT.json"), { packet_version: CARD_VISUAL_SEARCH_JUDGMENT_PACKET_VERSION, created_at: packet.created_at, run_key: runKey, reconciled: queries.length === 200 && imageMetadataResult.missing_image_ids.length === 0 && imageMetadataResult.unreadable_sources.length === 0, calibration_queries: queries.length, holdout_queries: 0, top_result_slots: queries.reduce((sum, query) => sum + query.top_results.length, 0), image_resolution: packet.image_resolution, official_gold_status: "awaiting_human_judgments" });
  await writeJson(path.join(outputDir, "artifact_hashes.json"), await hashManifest(outputDir, files));
  return { outputDir, packet };
}

export async function main(argv = process.argv.slice(2)) {
  const result = await runCardVisualSearchJudgmentPacketV1(parseCardVisualSearchJudgmentPacketArgsV1(argv));
  console.log(`[card-visual-search-judgment-packet] output_dir=${posixRelative(result.outputDir)}`);
  console.log(`[card-visual-search-judgment-packet] calibration_queries=${result.packet.calibration_query_count}`);
  console.log(`[card-visual-search-judgment-packet] holdout_queries=${result.packet.holdout_query_count}`);
  console.log(`[card-visual-search-judgment-packet] missing_images=${result.packet.image_resolution.missing_image_ids.length}`);
}
