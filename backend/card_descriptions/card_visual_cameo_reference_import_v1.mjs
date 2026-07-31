import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CARD_VISUAL_CAMEO_REFERENCE_IMPORT_VERSION =
  "CARD_VISUAL_CAMEO_REFERENCE_IMPORT_V1";
export const CARD_VISUAL_CAMEO_REFERENCE_AUTHORITY =
  "external_curated_reference";
export const CARD_VISUAL_CAMEO_REFERENCE_SOURCE =
  "rotomamiti_cameo_database";
export const CARD_VISUAL_CAMEO_SPREADSHEET_ID =
  "18nIkOgqQrHZTz0TrH_gL1e1nL1RcHiCmPF5finAjToY";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_OUTPUT_ROOT =
  "C:/grookai_visual_search_releases/card_visual_search_corpus_release_v1_1_20260721/_analysis/card_visual_cameo_reference_import_v1";
const DEFAULT_MASTER_INDEX =
  "docs/audits/english_master_index_completion_v1/english_master_index_master_admissible_export_v1.json";
const DEFAULT_GROOKAI_AUDIT =
  "docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_grookai_audit_v1.json";
const DEFAULT_VISUAL_CORPUS =
  "C:/grookai_visual_search_releases/card_visual_search_corpus_release_v1_1_20260721/docs/audits/card_visual_corpus_v1/2026-07-21T15-51-01-795Z_inventory_3f72560c3b04/corpus_valid_candidates.jsonl";
const DEFAULT_EXISTING_SEED =
  "docs/audits/cameo_search_v1/cameo_search_v1_phase6_seed_apply_20260520.json";
const DEFAULT_EXISTING_REFRESH =
  "docs/audits/cameo_search_v1/cameo_search_v1_rotomamiti_refresh_delta_20260618.json";
const DEFAULT_EXISTING_CHARIZARD =
  "docs/audits/cameo_search_v1/cameo_search_v1_charizard_gap_fix_20260520.json";
const NON_ENGLISH_LIGHT_BLUE = "FFCFE2F3";

export const CARD_VISUAL_CAMEO_TABS = Object.freeze([
  { title: "Gen 1", sheet_id: 0, expected_rows: 1255 },
  { title: "Gen 2", sheet_id: 2112540589, expected_rows: 399 },
  { title: "Gen 3", sheet_id: 1642805847, expected_rows: 442 },
  { title: "Gen 4", sheet_id: 623394955, expected_rows: 393 },
  { title: "Gen 5", sheet_id: 907311085, expected_rows: 298 },
  { title: "Gen 6", sheet_id: 1750206679, expected_rows: 172 },
  { title: "Gen 7", sheet_id: 2096460131, expected_rows: 138 },
  { title: "Gen 8", sheet_id: 692781906, expected_rows: 186 },
  { title: "Gen 9", sheet_id: 1784063283, expected_rows: 157 },
  { title: "Trainers", sheet_id: 36967854, expected_rows: 590 },
]);

const DISPLAY_MODE_RULES = Object.freeze([
  { term: "plush", patterns: [/\bplush(?:ie)?\b/iu, /\bstuffed (?:toy|animal)\b/iu] },
  { term: "pillow", patterns: [/\bpillow\b/iu, /\bcushion\b/iu] },
  { term: "statue", patterns: [/\bstatue\b/iu, /\bsculpture\b/iu, /\bfigurine\b/iu] },
  { term: "toy", patterns: [/\btoy\b/iu, /\bdoll\b/iu] },
  { term: "costume", patterns: [/\bcostume\b/iu, /\bdisguise\b/iu] },
  { term: "silhouette", patterns: [/\bsilhouette\b/iu, /\bshadow\b/iu] },
  { term: "picture", patterns: [/\bpicture\b/iu, /\bphoto(?:graph)?\b/iu, /\bportrait\b/iu] },
  { term: "poster", patterns: [/\bposter\b/iu] },
  { term: "screen", patterns: [/\bscreen\b/iu, /\btelevision\b/iu, /\btv\b/iu] },
  { term: "painting", patterns: [/\bpainting\b/iu, /\bdrawing\b/iu, /\billustration\b/iu] },
  { term: "food", patterns: [/\bfood\b/iu, /\bsweets?\b/iu, /\bcookie\b/iu, /\bcake\b/iu, /\bcandy\b/iu, /\bice cream\b/iu] },
  { term: "logo", patterns: [/\blogo\b/iu, /\bemblem\b/iu] },
  { term: "sign", patterns: [/\bsign\b/iu, /\blabel\b/iu] },
  { term: "mask", patterns: [/\bmask\b/iu] },
  { term: "clothing", patterns: [/\bshirt\b/iu, /\bhat\b/iu, /\bclothing\b/iu, /\bapparel\b/iu] },
  { term: "accessory", patterns: [/\bpin\b/iu, /\bearring\b/iu, /\bbackpack\b/iu, /\bballoon\b/iu] },
  { term: "card", patterns: [/\bcard\b/iu] },
]);

function clean(value) {
  return String(value ?? "").replace(/\u00a0/g, " ").trim();
}

function repoPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value);
}

function nowIso() {
  return new Date().toISOString();
}

function safeTimestamp(value) {
  return value.replace(/[:.]/g, "-");
}

function parseFlag(argv, name) {
  const prefix = `--${name}=`;
  const value = argv.find((entry) => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

export function parseCameoImportArgsV1(argv = []) {
  return {
    outputRoot: parseFlag(argv, "output-root") ?? DEFAULT_OUTPUT_ROOT,
    outputDir: parseFlag(argv, "output-dir"),
    masterIndex: parseFlag(argv, "master-index") ?? DEFAULT_MASTER_INDEX,
    grookaiAudit: parseFlag(argv, "grookai-audit") ?? DEFAULT_GROOKAI_AUDIT,
    visualCorpus: parseFlag(argv, "visual-corpus") ?? DEFAULT_VISUAL_CORPUS,
    existingSeed: parseFlag(argv, "existing-seed") ?? DEFAULT_EXISTING_SEED,
    existingRefresh:
      parseFlag(argv, "existing-refresh") ?? DEFAULT_EXISTING_REFRESH,
    existingCharizard:
      parseFlag(argv, "existing-charizard") ?? DEFAULT_EXISTING_CHARIZARD,
    sourceXlsx: parseFlag(argv, "source-xlsx"),
  };
}

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(",")}}`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Json(value) {
  return sha256(stableJson(value));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeJsonl(filePath, rows) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    filePath,
    rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""),
  );
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function gitValue(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

function currentGitState() {
  return {
    commit_sha: gitValue(["rev-parse", "HEAD"]),
    branch: gitValue(["branch", "--show-current"]),
    tracked_status_short: gitValue([
      "status",
      "--short",
      "--untracked-files=no",
    ]),
  };
}

export function parseCsvV1(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/u, ""));
    rows.push(row);
  }
  return rows;
}

function xmlDecode(value) {
  return String(value ?? "")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&#39;/gu, "'")
    .replace(/&amp;/gu, "&");
}

function parseXmlAttributes(source) {
  const attributes = {};
  for (const match of source.matchAll(/([\w:]+)="([^"]*)"/gu)) {
    attributes[match[1]] = xmlDecode(match[2]);
  }
  return attributes;
}

function zipEntryText(xlsxPath, entry) {
  return execFileSync("tar", ["-xOf", xlsxPath, entry], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

export function parseXlsxStylesV1(stylesXml) {
  const fontsBlock = stylesXml.match(/<fonts\b[^>]*>([\s\S]*?)<\/fonts>/u)?.[1] ?? "";
  const fillsBlock = stylesXml.match(/<fills\b[^>]*>([\s\S]*?)<\/fills>/u)?.[1] ?? "";
  const xfsBlock = stylesXml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/u)?.[1] ?? "";
  const fonts = [...fontsBlock.matchAll(/<font\b[^>]*?(?:\/>|>([\s\S]*?)<\/font>)/gu)].map(
    (match) => ({ italic: /<i(?:\s[^>]*)?\/?>/u.test(match[1] ?? "") }),
  );
  const fills = [...fillsBlock.matchAll(/<fill\b[^>]*?(?:\/>|>([\s\S]*?)<\/fill>)/gu)].map(
    (match) => {
      const foreground = (match[1] ?? "").match(/<fgColor\b([^>]*)\/?>/u);
      return foreground ? clean(parseXmlAttributes(foreground[1]).rgb).toUpperCase() || null : null;
    },
  );
  const cellStyles = [...xfsBlock.matchAll(/<xf\b([^>]*?)(?:\/>|>[\s\S]*?<\/xf>)/gu)].map(
    (match) => {
      const attributes = parseXmlAttributes(match[1]);
      const fontId = Number.parseInt(attributes.fontId ?? "0", 10);
      const fillId = Number.parseInt(attributes.fillId ?? "0", 10);
      return {
        font_id: fontId,
        fill_id: fillId,
        italic: Boolean(fonts[fontId]?.italic),
        fill_rgb: fills[fillId] ?? null,
      };
    },
  );
  return { fonts, fills, cellStyles };
}

function columnIndex(reference) {
  const letters = reference.match(/^[A-Z]+/u)?.[0] ?? "";
  let result = 0;
  for (const letter of letters) result = result * 26 + letter.charCodeAt(0) - 64;
  return result;
}

function expandMergedRange(reference) {
  const [start, end = start] = reference.split(":");
  const startRow = Number.parseInt(start.match(/\d+$/u)?.[0] ?? "0", 10);
  const endRow = Number.parseInt(end.match(/\d+$/u)?.[0] ?? "0", 10);
  const startColumn = columnIndex(start);
  const endColumn = columnIndex(end);
  return { reference, startRow, endRow, startColumn, endColumn };
}

export function parseXlsxSheetFormattingV1(sheetXml, styleCatalog) {
  const cells = new Map();
  for (const match of sheetXml.matchAll(
    /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/gu,
  )) {
    const attributes = parseXmlAttributes(match[1]);
    const reference = attributes.r;
    if (!reference) continue;
    const styleIndex = Number.parseInt(attributes.s ?? "0", 10);
    cells.set(reference, {
      style_index: styleIndex,
      ...(styleCatalog.cellStyles[styleIndex] ?? {
        font_id: 0,
        fill_id: 0,
        italic: false,
        fill_rgb: null,
      }),
    });
  }
  const mergedRanges = [
    ...sheetXml.matchAll(/<mergeCell\b[^>]*ref="([^"]+)"[^>]*\/?>/gu),
  ].map((match) => expandMergedRange(match[1]));
  return { cells, mergedRanges };
}

function mergedCardNameRangeForRow(formatting, rowNumber) {
  return (
    formatting.mergedRanges.find(
      (range) =>
        range.startColumn === 3 &&
        range.endColumn === 3 &&
        rowNumber >= range.startRow &&
        rowNumber <= range.endRow,
    ) ?? null
  );
}

function rowFormatEvidence(formatting, rowNumber) {
  const cells = [];
  for (const column of ["A", "B", "C", "D", "E", "F"]) {
    const style = formatting.cells.get(`${column}${rowNumber}`);
    if (style) cells.push({ column, ...style });
  }
  const cardNameStyle = formatting.cells.get(`C${rowNumber}`) ?? null;
  const fillRgbs = [...new Set(cells.map((cell) => cell.fill_rgb).filter(Boolean))];
  const mergedCardNameRange = mergedCardNameRangeForRow(formatting, rowNumber);
  return {
    edge_case_italic: Boolean(cardNameStyle?.italic),
    non_english_light_blue: fillRgbs.includes(NON_ENGLISH_LIGHT_BLUE),
    card_name_cell_style: cardNameStyle,
    row_fill_rgbs: fillRgbs,
    merged_card_name_range: mergedCardNameRange?.reference ?? null,
  };
}

export function deriveDisplayModesV1(notes) {
  const value = clean(notes);
  if (!value) return [];
  return DISPLAY_MODE_RULES.filter((rule) =>
    rule.patterns.some((pattern) => pattern.test(value)),
  ).map((rule) => rule.term);
}

function subjectKindCandidate(displayModes) {
  if (displayModes.some((mode) => ["picture", "poster", "screen", "painting", "card"].includes(mode))) {
    return "depicted_subject_candidate";
  }
  if (
    displayModes.some((mode) =>
      ["plush", "pillow", "statue", "toy", "costume", "food", "logo", "sign", "mask", "clothing", "accessory"].includes(mode),
    )
  ) {
    return "character_representation_candidate";
  }
  return "subject_kind_unresolved";
}

export function normalizeIdentityTextV1(value) {
  return clean(value)
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’‘`]/gu, "'")
    .replace(/[♀]/gu, " female ")
    .replace(/[♂]/gu, " male ")
    .replace(/&/gu, " and ")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, " ");
}

export function normalizeCardNumberV1(value) {
  const normalized = clean(value)
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/gu, "")
    .toUpperCase();
  if (!normalized) return "";
  return normalized.replace(/^0+(?=\d)/u, "");
}

function cardKey(setName, cardName, cardNumber) {
  return [
    normalizeIdentityTextV1(setName),
    normalizeIdentityTextV1(cardName),
    normalizeCardNumberV1(cardNumber),
  ].join("|");
}

function cameoLogicalKey(row) {
  return [
    normalizeIdentityTextV1(
      row.cameo_identity_kind ?? row.cameo_subject_type,
    ),
    normalizeIdentityTextV1(
      row.cameo_identity ?? row.cameo_subject_name,
    ),
    normalizeIdentityTextV1(row.card_name ?? row.card_name_raw),
    normalizeIdentityTextV1(row.set_name ?? row.set_name_raw),
    normalizeCardNumberV1(row.card_number ?? row.number_raw),
  ].join("|");
}

export function normalizeCameoRowsV1({
  tab,
  csvText,
  formatting,
  sourceSha256,
}) {
  const rows = parseCsvV1(csvText);
  const header = rows[0]?.map(clean) ?? [];
  const trainerTab = tab.title === "Trainers";
  const expectedHeader = trainerTab
    ? ["", "Cameo Trainer", "Card name", "Set", "#", "Notes"]
    : ["Ndex", "Cameo Pokémon", "Card name", "Set", "#", "Notes"];
  if (expectedHeader.some((value, index) => header[index] !== value)) {
    throw new Error(`${tab.title} has an unexpected header: ${header.join("|")}`);
  }
  const normalized = [];
  let activeNdex = "";
  let activeCameo = "";
  let activeMergedCardName = "";
  let activeMergedRange = null;
  for (let index = 1; index < rows.length; index += 1) {
    const sourceRow = index + 1;
    const columns = [...rows[index], "", "", "", "", "", ""].slice(0, 6).map(clean);
    if (!columns.some(Boolean)) continue;
    const [ndex, cameo, rawCardName, setName, cardNumber, notes] = columns;
    if (ndex) activeNdex = ndex;
    if (cameo) activeCameo = cameo;
    const formatEvidence = rowFormatEvidence(formatting, sourceRow);
    if (formatEvidence.merged_card_name_range !== activeMergedRange) {
      activeMergedRange = formatEvidence.merged_card_name_range;
      activeMergedCardName = rawCardName;
    } else if (rawCardName) {
      activeMergedCardName = rawCardName;
    }
    const cardName = rawCardName || (activeMergedRange ? activeMergedCardName : "");
    if (!activeCameo || !cardName || !setName) continue;
    const displayModes = deriveDisplayModesV1(notes);
    const sourceRecordCore = {
      source_tab: tab.title,
      source_sheet_id: tab.sheet_id,
      source_row: sourceRow,
      pokedex_index: activeNdex || null,
      cameo_identity_kind: trainerTab ? "trainer" : "pokemon",
      cameo_identity: activeCameo,
      card_name: cardName,
      set_name: setName,
      card_number: cardNumber || null,
      notes: notes || null,
    };
    normalized.push({
      import_version: CARD_VISUAL_CAMEO_REFERENCE_IMPORT_VERSION,
      authority: CARD_VISUAL_CAMEO_REFERENCE_AUTHORITY,
      source: CARD_VISUAL_CAMEO_REFERENCE_SOURCE,
      source_record_id: `cvr_${sha256Json({
        ...sourceRecordCore,
        source_sha256: sourceSha256,
      }).slice(0, 20)}`,
      ...sourceRecordCore,
      formatting_evidence: formatEvidence,
      edge_case_italic: formatEvidence.edge_case_italic,
      non_english_light_blue: formatEvidence.non_english_light_blue,
      same_artwork_group: formatEvidence.merged_card_name_range,
      display_mode_terms: displayModes,
      subject_kind_candidate: subjectKindCandidate(displayModes),
      normalized_identity: {
        cameo_identity: normalizeIdentityTextV1(activeCameo),
        card_name: normalizeIdentityTextV1(cardName),
        set_name: normalizeIdentityTextV1(setName),
        card_number: normalizeCardNumberV1(cardNumber),
      },
      evidence_boundary: {
        proves_card_cameo_association: true,
        proves_display_mode_only_when_notes_explicit: displayModes.length > 0,
        proves_pixel_location: false,
        proves_fact_graph_observation: false,
        authorizes_fact_graph_mutation: false,
      },
    });
  }
  return normalized;
}

export function buildCanonicalIndexV1(masterIndex, grookaiAudit) {
  const cards = Array.isArray(masterIndex?.cards) ? masterIndex.cards : [];
  const auditRows = Array.isArray(grookaiAudit?.rows) ? grookaiAudit.rows : [];
  const setNamesByKey = new Map();
  for (const card of cards) {
    const setKey = normalizeIdentityTextV1(card.set_key);
    const setName = clean(card.set_name);
    if (setKey && setName && !setNamesByKey.has(setKey)) setNamesByKey.set(setKey, setName);
  }
  const candidatesByKey = new Map();
  for (const row of auditRows) {
    const cardPrintId = clean(row.grookai_card_print_id);
    const setKey = normalizeIdentityTextV1(row.set_key ?? row.set_code);
    const setName = setNamesByKey.get(setKey);
    const cardName = clean(row.index_card_name ?? row.grookai_card_name);
    const cardNumber = clean(row.card_number);
    if (!cardPrintId || !setName || !cardName || !cardNumber) continue;
    const key = cardKey(setName, cardName, cardNumber);
    const candidates = candidatesByKey.get(key) ?? new Map();
    if (!candidates.has(cardPrintId)) {
      candidates.set(cardPrintId, {
        card_print_id: cardPrintId,
        set_key: clean(row.set_key),
        set_code: clean(row.set_code),
        set_name: setName,
        card_name: cardName,
        card_number: cardNumber,
        grookai_finish_keys: [],
      });
    }
    const candidate = candidates.get(cardPrintId);
    const finish = clean(row.finish_key);
    if (finish && !candidate.grookai_finish_keys.includes(finish)) {
      candidate.grookai_finish_keys.push(finish);
      candidate.grookai_finish_keys.sort();
    }
    candidatesByKey.set(key, candidates);
  }
  return candidatesByKey;
}

function addCandidate(index, key, candidate) {
  const candidates = index.get(key) ?? new Map();
  const candidateKey = clean(candidate.card_print_id) || clean(candidate.gv_id);
  if (!candidateKey) return;
  if (!candidates.has(candidateKey)) {
    candidates.set(candidateKey, candidate);
  }
  index.set(key, candidates);
}

export function buildExistingApprovedCameoIndexV1(
  seedApply,
  refreshDelta,
  charizardGap,
  visualCorpusRows = [],
) {
  const rows = [
    ...(Array.isArray(seedApply?.seed_payload) ? seedApply.seed_payload : []),
    ...(Array.isArray(refreshDelta?.candidates?.logical_new_insert_candidates)
      ? refreshDelta.candidates.logical_new_insert_candidates
      : []),
  ];
  const charizard = charizardGap?.db_write;
  if (charizard?.performed && charizard?.target && charizard?.cameo) {
    const visualMatch = visualCorpusRows.find(
      (row) => clean(row.gv_id) === clean(charizard.target.gv_id),
    );
    rows.push({
      cameo_subject_type: "pokemon",
      cameo_subject_name: charizard.cameo.cameo_subject_name,
      card_name_raw: charizard.target.name,
      set_name_raw: "SV Promos",
      number_raw: charizard.target.number,
      card_print_id:
        charizard.target.card_print_id ?? visualMatch?.card_print_id,
      approved_card_print_id:
        charizard.target.card_print_id ?? visualMatch?.card_print_id,
      approved_gv_id: charizard.target.gv_id,
      source_row_hash: charizard.source_row_hash,
    });
  }
  const index = new Map();
  for (const row of rows) {
    const cardPrintId = clean(
      row.card_print_id ?? row.approved_card_print_id,
    );
    const gvId = clean(row.approved_gv_id);
    if (!cardPrintId && !gvId) continue;
    const key = cameoLogicalKey(row);
    addCandidate(index, key, {
      card_print_id: cardPrintId,
      gv_id: gvId || null,
      set_name: clean(row.set_name_raw),
      card_name: clean(row.card_name_raw),
      card_number: clean(row.number_raw),
      prior_source_row_hash: clean(row.source_row_hash) || null,
      prior_authority: "existing_approved_card_print_cameo_artifact",
    });
  }
  return index;
}

export function buildVisualCorpusCanonicalIndexV1(
  cameoRows,
  visualCorpusRows,
  minimumAliasEvidence = 2,
) {
  const visualByNameNumber = new Map();
  for (const row of visualCorpusRows) {
    const key = [
      normalizeIdentityTextV1(row.name),
      normalizeCardNumberV1(row.number),
    ].join("|");
    const candidates = visualByNameNumber.get(key) ?? [];
    candidates.push(row);
    visualByNameNumber.set(key, candidates);
  }
  const votes = new Map();
  for (const row of cameoRows) {
    if (!row.card_name || !row.card_number || !row.set_name) continue;
    const nameNumberKey = [
      normalizeIdentityTextV1(row.card_name),
      normalizeCardNumberV1(row.card_number),
    ].join("|");
    const candidates = visualByNameNumber.get(nameNumberKey) ?? [];
    const setCodes = [...new Set(candidates.map((candidate) => clean(candidate.set_code)).filter(Boolean))];
    if (setCodes.length !== 1) continue;
    const sourceSet = normalizeIdentityTextV1(row.set_name);
    const setCode = setCodes[0];
    const byCode = votes.get(sourceSet) ?? new Map();
    const evidence = byCode.get(setCode) ?? new Set();
    for (const candidate of candidates) evidence.add(clean(candidate.card_print_id));
    byCode.set(setCode, evidence);
    votes.set(sourceSet, byCode);
  }
  const acceptedAliases = new Map();
  const aliasEvidence = [];
  for (const [sourceSet, byCode] of votes.entries()) {
    const qualifying = [...byCode.entries()].filter(
      ([, evidence]) => evidence.size >= minimumAliasEvidence,
    );
    if (qualifying.length !== 1) continue;
    const [setCode, evidence] = qualifying[0];
    acceptedAliases.set(sourceSet, setCode);
    aliasEvidence.push({
      normalized_source_set_name: sourceSet,
      set_code: setCode,
      distinct_card_evidence: evidence.size,
      derivation: "unique_name_number_agreement_across_visual_corpus_v1",
    });
  }
  const index = new Map();
  for (const row of cameoRows) {
    const sourceSet = normalizeIdentityTextV1(row.set_name);
    const setCode = acceptedAliases.get(sourceSet);
    if (!setCode) continue;
    const nameNumberKey = [
      normalizeIdentityTextV1(row.card_name),
      normalizeCardNumberV1(row.card_number),
    ].join("|");
    for (const candidate of visualByNameNumber.get(nameNumberKey) ?? []) {
      if (clean(candidate.set_code) !== setCode) continue;
      addCandidate(index, cardKey(row.set_name, row.card_name, row.card_number), {
        card_print_id: clean(candidate.card_print_id),
        gv_id: clean(candidate.gv_id) || null,
        set_code: setCode,
        set_name: row.set_name,
        card_name: clean(candidate.name),
        card_number: clean(candidate.number),
        prior_authority: "immutable_paid_visual_corpus_inventory",
      });
    }
  }
  return {
    canonicalIndex: index,
    aliasEvidence: aliasEvidence.sort((a, b) =>
      a.normalized_source_set_name.localeCompare(b.normalized_source_set_name),
    ),
  };
}

export function mergeCanonicalIndexesV1(...indexes) {
  const merged = new Map();
  for (const index of indexes) {
    for (const [key, candidates] of index.entries()) {
      for (const candidate of candidates.values()) {
        addCandidate(merged, key, candidate);
      }
    }
  }
  return merged;
}

export function reconcileCameoRowsV1(
  rows,
  canonicalIndex,
  existingApprovedIndex = new Map(),
) {
  const exact = [];
  const ambiguous = [];
  const unmatched = [];
  for (const row of rows) {
    const existingCandidates = [
      ...(existingApprovedIndex.get(cameoLogicalKey(row))?.values() ?? []),
    ];
    const key = cardKey(row.set_name, row.card_name, row.card_number);
    const candidates = [...(canonicalIndex.get(key)?.values() ?? [])];
    const result = {
      ...row,
      reconciliation_key: key,
    };
    if (existingCandidates.length === 1) {
      exact.push({
        ...result,
        reconciliation_status: "existing_approved_cameo_match",
        reconciliation_policy: "existing_approved_cameo_logical_key_v1",
        canonical_match: existingCandidates[0],
      });
    } else if (existingCandidates.length > 1) {
      ambiguous.push({
        ...result,
        reconciliation_status: "ambiguous_existing_approved_cameo_match",
        reconciliation_policy: "existing_approved_cameo_logical_key_v1",
        canonical_candidates: existingCandidates,
      });
    } else if (candidates.length === 1) {
      exact.push({
        ...result,
        reconciliation_status: "exact_canonical_match",
        reconciliation_policy: "exact_normalized_set_name_card_name_card_number_v1",
        canonical_match: candidates[0],
      });
    } else if (candidates.length > 1) {
      ambiguous.push({
        ...result,
        reconciliation_status: "ambiguous_multiple_canonical_prints",
        reconciliation_policy: "exact_normalized_set_name_card_name_card_number_v1",
        canonical_candidates: candidates,
      });
    } else {
      unmatched.push({
        ...result,
        reconciliation_status: "unmatched",
        reconciliation_policy: "exact_normalized_set_name_card_name_card_number_v1",
        canonical_candidates: [],
      });
    }
  }
  return { exact, ambiguous, unmatched };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

async function download(url, filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  let buffer;
  let transport = "node_fetch";
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "GrookaiVault-CameoReferenceImport/1.0 (+https://grookaivault.com)",
      },
    });
    if (!response.ok) throw new Error(`download failed ${response.status}: ${url}`);
    buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(filePath, buffer);
  } catch (error) {
    if (process.platform !== "win32") throw error;
    transport = "powershell_invoke_web_request_fallback";
    execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri $env:CAMEO_DOWNLOAD_URL -OutFile $env:CAMEO_DOWNLOAD_TARGET -Headers @{'User-Agent'='GrookaiVault-CameoReferenceImport/1.0 (+https://grookaivault.com)'}",
      ],
      {
        env: {
          ...process.env,
          CAMEO_DOWNLOAD_URL: url,
          CAMEO_DOWNLOAD_TARGET: filePath,
        },
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    buffer = await fs.readFile(filePath);
  }
  return {
    path: filePath,
    byte_length: buffer.length,
    sha256: sha256(buffer),
    transport,
  };
}

function reportMarkdown(summary, slurpuffRows) {
  const slurpuffLines = slurpuffRows.length
    ? slurpuffRows
        .map(
          (row) =>
            `- ${row.cameo_identity}: ${row.card_name} / ${row.set_name} / ${row.card_number ?? "blank"}; notes=${row.notes ?? "blank"}; match=${row.reconciliation_status}`,
        )
        .join("\n")
    : "- No Slurpuff Ascended Heroes 94 rows were found.";
  return `# Cameo Reference Reconciliation V1

## Boundary

This is an offline reference import and exact canonical reconciliation. It performs no OpenAI calls, database writes, approvals, embeddings, search activation, or Fact Graph mutation.

The spreadsheet proves a curator-recorded association between a cameo identity and a card. It proves a display mode only when the row's Notes cell says so. It does not prove pixel location or authorize inventing observations.

## Results

- Source rows: ${summary.source_rows}
- Reconciled rows: ${summary.exact_matches}
- Existing approved cameo matches: ${summary.existing_approved_matches}
- New exact canonical candidates: ${summary.new_exact_canonical_candidates}
- Ambiguous canonical matches: ${summary.ambiguous_matches}
- Unmatched rows: ${summary.unmatched_rows}
- Exact matches overlapping the paid visual corpus: ${summary.visual_corpus_overlap_rows}
- Italic edge-case rows: ${summary.italic_edge_case_rows}
- Light-blue non-English rows: ${summary.non_english_rows}
- Same-artwork merged rows: ${summary.same_artwork_rows}
- Provider cost: $0
- Database writes: 0

## Slurpuff ASC 094 Proof

${slurpuffLines}

The held cookie is not assigned a Pokémon identity by this import. The spreadsheet rows establish Pikachu and Snorlax cameo associations for the card; they do not identify which individual cookie is being held.

## Trust Rules

- Exact automatic reconciliation requires normalized set name, card name, and card number.
- Multiple canonical targets remain ambiguous.
- Unmatched records remain coverage gaps.
- Blank Notes never imply a representation form.
- Existing paid Fact Graph artifacts remain immutable.
- Search remains unchanged until a separate reviewed merge policy is approved.
`;
}

async function artifactHashes(outputDir, names) {
  const rows = [];
  for (const name of names) {
    const filePath = path.join(outputDir, name);
    const buffer = await fs.readFile(filePath);
    rows.push({ path: name.replace(/\\/gu, "/"), byte_length: buffer.length, sha256: sha256(buffer) });
  }
  return rows;
}

export async function runCameoReferenceImportV1(argv = process.argv.slice(2)) {
  const args = parseCameoImportArgsV1(argv);
  const startedAt = nowIso();
  const git = currentGitState();
  const outputDir = args.outputDir
    ? repoPath(args.outputDir)
    : path.resolve(args.outputRoot, `${safeTimestamp(startedAt)}_import_${git.commit_sha.slice(0, 12)}`);
  await fs.mkdir(outputDir, { recursive: true });

  const runPlan = {
    import_version: CARD_VISUAL_CAMEO_REFERENCE_IMPORT_VERSION,
    created_at: startedAt,
    git,
    source: {
      spreadsheet_id: CARD_VISUAL_CAMEO_SPREADSHEET_ID,
      title: "RotomAmiti's Cameo Pokémon Card Database",
      url: `https://docs.google.com/spreadsheets/d/${CARD_VISUAL_CAMEO_SPREADSHEET_ID}/htmlview`,
      tabs: CARD_VISUAL_CAMEO_TABS,
    },
    canonical_sources: {
      master_index: args.masterIndex,
      grookai_audit: args.grookaiAudit,
      visual_corpus: args.visualCorpus,
      existing_seed: args.existingSeed,
      existing_refresh: args.existingRefresh,
      existing_charizard: args.existingCharizard,
    },
    boundaries: {
      provider_calls: 0,
      database_reads: 0,
      database_writes: 0,
      approvals: 0,
      embeddings: 0,
      fact_graph_mutations: 0,
      search_activation: false,
    },
  };
  await writeJson(path.join(outputDir, "run_plan.json"), runPlan);

  const rawDir = path.join(outputDir, "raw");
  let workbookArtifact;
  const workbookPath = path.join(rawDir, "rotomamiti_cameo_database.xlsx");
  if (args.sourceXlsx) {
    const sourcePath = repoPath(args.sourceXlsx);
    const buffer = await fs.readFile(sourcePath);
    await fs.mkdir(rawDir, { recursive: true });
    await fs.writeFile(workbookPath, buffer);
    workbookArtifact = {
      path: workbookPath,
      byte_length: buffer.length,
      sha256: sha256(buffer),
      acquisition: "provided_local_snapshot",
    };
  } else {
    workbookArtifact = {
      ...(await download(
        `https://docs.google.com/spreadsheets/d/${CARD_VISUAL_CAMEO_SPREADSHEET_ID}/export?format=xlsx`,
        workbookPath,
      )),
      acquisition: "public_google_sheets_xlsx_export",
    };
  }

  const styles = parseXlsxStylesV1(zipEntryText(workbookPath, "xl/styles.xml"));
  const sourceManifest = {
    import_version: CARD_VISUAL_CAMEO_REFERENCE_IMPORT_VERSION,
    workbook: {
      ...workbookArtifact,
      path: path.relative(outputDir, workbookPath).replace(/\\/gu, "/"),
    },
    tabs: [],
  };
  const allRows = [];
  for (let index = 0; index < CARD_VISUAL_CAMEO_TABS.length; index += 1) {
    const tab = CARD_VISUAL_CAMEO_TABS[index];
    const csvPath = path.join(rawDir, `${tab.title.replace(/\s+/gu, "_").toLowerCase()}.csv`);
    const csvArtifact = await download(
      `https://docs.google.com/spreadsheets/d/${CARD_VISUAL_CAMEO_SPREADSHEET_ID}/export?format=csv&gid=${tab.sheet_id}`,
      csvPath,
    );
    const csvText = await fs.readFile(csvPath, "utf8");
    const formatting = parseXlsxSheetFormattingV1(
      zipEntryText(workbookPath, `xl/worksheets/sheet${index + 2}.xml`),
      styles,
    );
    const rows = normalizeCameoRowsV1({
      tab,
      csvText,
      formatting,
      sourceSha256: csvArtifact.sha256,
    });
    allRows.push(...rows);
    sourceManifest.tabs.push({
      ...tab,
      csv_path: path.relative(outputDir, csvPath).replace(/\\/gu, "/"),
      csv_byte_length: csvArtifact.byte_length,
      csv_sha256: csvArtifact.sha256,
      parsed_records: rows.length,
      formatting: {
        source: `raw/rotomamiti_cameo_database.xlsx#xl/worksheets/sheet${index + 2}.xml`,
        decoded_cell_styles: formatting.cells.size,
        merged_ranges: formatting.mergedRanges.length,
      },
    });
  }
  await writeJson(path.join(outputDir, "source_manifest.json"), sourceManifest);
  await writeJsonl(path.join(outputDir, "cameo_reference_rows.jsonl"), allRows);

  const [
    masterIndex,
    grookaiAudit,
    visualCorpus,
    existingSeed,
    existingRefresh,
    existingCharizard,
  ] = await Promise.all([
    readJson(repoPath(args.masterIndex)),
    readJson(repoPath(args.grookaiAudit)),
    readJsonl(repoPath(args.visualCorpus)),
    readJson(repoPath(args.existingSeed)),
    readJson(repoPath(args.existingRefresh)),
    readJson(repoPath(args.existingCharizard)),
  ]);
  const masterCanonicalIndex = buildCanonicalIndexV1(masterIndex, grookaiAudit);
  const visualCanonical = buildVisualCorpusCanonicalIndexV1(
    allRows,
    visualCorpus,
  );
  const canonicalIndex = mergeCanonicalIndexesV1(
    masterCanonicalIndex,
    visualCanonical.canonicalIndex,
  );
  const existingApprovedIndex = buildExistingApprovedCameoIndexV1(
    existingSeed,
    existingRefresh,
    existingCharizard,
    visualCorpus,
  );
  const reconciliation = reconcileCameoRowsV1(
    allRows,
    canonicalIndex,
    existingApprovedIndex,
  );
  const currentLogicalKeys = new Set(allRows.map(cameoLogicalKey));
  const existingApprovedMissingFromCurrent = [];
  for (const [logicalKey, candidates] of existingApprovedIndex.entries()) {
    if (currentLogicalKeys.has(logicalKey)) continue;
    for (const candidate of candidates.values()) {
      existingApprovedMissingFromCurrent.push({
        logical_key: logicalKey,
        canonical_match: candidate,
        preservation_policy: "preserve_existing_until_separate_review",
      });
    }
  }
  await writeJson(
    path.join(outputDir, "existing_approved_missing_from_current.json"),
    existingApprovedMissingFromCurrent,
  );
  await writeJson(
    path.join(outputDir, "visual_corpus_set_alias_evidence.json"),
    visualCanonical.aliasEvidence,
  );
  const visualCorpusIds = new Set(visualCorpus.map((row) => clean(row.card_print_id)));
  const overlap = reconciliation.exact.filter((row) =>
    visualCorpusIds.has(row.canonical_match.card_print_id),
  );
  await writeJsonl(path.join(outputDir, "canonical_matches.jsonl"), reconciliation.exact);
  await writeJsonl(path.join(outputDir, "ambiguous_matches.jsonl"), reconciliation.ambiguous);
  await writeJsonl(path.join(outputDir, "unmatched_rows.jsonl"), reconciliation.unmatched);
  await writeJsonl(path.join(outputDir, "visual_corpus_overlap.jsonl"), overlap);

  const allReconciled = [
    ...reconciliation.exact,
    ...reconciliation.ambiguous,
    ...reconciliation.unmatched,
  ];
  const slurpuffRows = allReconciled.filter(
    (row) =>
      normalizeIdentityTextV1(row.card_name) === "slurpuff" &&
      normalizeIdentityTextV1(row.set_name) === "ascended heroes" &&
      normalizeCardNumberV1(row.card_number) === "94",
  );
  const slurpuffIdentities = new Set(
    slurpuffRows.map((row) => normalizeIdentityTextV1(row.cameo_identity)),
  );
  const assertions = {
    slurpuff_asc_094_has_pikachu: slurpuffIdentities.has("pikachu"),
    slurpuff_asc_094_has_snorlax: slurpuffIdentities.has("snorlax"),
    slurpuff_asc_094_preserves_all_source_rows: slurpuffRows.length >= 2,
    held_cookie_identity_not_asserted: slurpuffRows.every(
      (row) => !/\bheld\b/iu.test(clean(row.notes)),
    ),
  };
  if (Object.values(assertions).some((value) => value !== true)) {
    throw new Error(`Slurpuff ASC 094 proof failed: ${JSON.stringify(assertions)}`);
  }

  const summary = {
    import_version: CARD_VISUAL_CAMEO_REFERENCE_IMPORT_VERSION,
    started_at: startedAt,
    completed_at: nowIso(),
    frozen_commit_sha: git.commit_sha,
    frozen_branch: git.branch,
    source_rows: allRows.length,
    exact_matches: reconciliation.exact.length,
    existing_approved_matches: reconciliation.exact.filter(
      (row) => row.reconciliation_status === "existing_approved_cameo_match",
    ).length,
    existing_approved_artifact_rows: [...existingApprovedIndex.values()].reduce(
      (total, candidates) => total + candidates.size,
      0,
    ),
    existing_approved_missing_from_current:
      existingApprovedMissingFromCurrent.length,
    new_exact_canonical_candidates: reconciliation.exact.filter(
      (row) => row.reconciliation_status === "exact_canonical_match",
    ).length,
    ambiguous_matches: reconciliation.ambiguous.length,
    unmatched_rows: reconciliation.unmatched.length,
    visual_corpus_overlap_rows: overlap.length,
    italic_edge_case_rows: allRows.filter((row) => row.edge_case_italic).length,
    non_english_rows: allRows.filter((row) => row.non_english_light_blue).length,
    same_artwork_rows: allRows.filter((row) => row.same_artwork_group).length,
    by_tab: Object.fromEntries(
      CARD_VISUAL_CAMEO_TABS.map((tab) => [
        tab.title,
        allRows.filter((row) => row.source_tab === tab.title).length,
      ]),
    ),
    slurpuff_asc_094: {
      assertions,
      rows: slurpuffRows.map((row) => ({
        cameo_identity: row.cameo_identity,
        notes: row.notes,
        reconciliation_status: row.reconciliation_status,
        canonical_match: row.canonical_match ?? null,
      })),
    },
    boundaries: runPlan.boundaries,
    pass:
      allRows.length ===
        reconciliation.exact.length +
          reconciliation.ambiguous.length +
          reconciliation.unmatched.length &&
      Object.values(assertions).every(Boolean),
  };
  await writeJson(path.join(outputDir, "summary.json"), summary);
  await writeText(
    path.join(outputDir, "CAMEO_REFERENCE_RECONCILIATION.md"),
    reportMarkdown(summary, slurpuffRows),
  );

  const hashedNames = [
    sourceManifest.workbook.path,
    ...sourceManifest.tabs.map((tab) => tab.csv_path),
    "run_plan.json",
    "source_manifest.json",
    "cameo_reference_rows.jsonl",
    "canonical_matches.jsonl",
    "ambiguous_matches.jsonl",
    "unmatched_rows.jsonl",
    "visual_corpus_overlap.jsonl",
    "visual_corpus_set_alias_evidence.json",
    "existing_approved_missing_from_current.json",
    "summary.json",
    "CAMEO_REFERENCE_RECONCILIATION.md",
  ];
  await writeJson(
    path.join(outputDir, "artifact_hashes.json"),
    await artifactHashes(outputDir, hashedNames),
  );
  return { outputDir, summary };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  runCameoReferenceImportV1()
    .then(({ outputDir, summary }) => {
      process.stdout.write(
        `${JSON.stringify({ output_dir: outputDir, summary }, null, 2)}\n`,
      );
    })
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
