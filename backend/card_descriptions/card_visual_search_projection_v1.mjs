import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CARD_VISUAL_CORPUS_EXPECTED_BRANCH, sha256JsonV1 } from "./card_visual_corpus_v1_inventory.mjs";
import { CARD_VISUAL_ARTWORK_GROUPING_VERSION } from "./card_visual_artwork_grouping_v1.mjs";

export const CARD_VISUAL_SEARCH_PROJECTION_VERSION = "CARD_VISUAL_SEARCH_PROJECTION_V1_5";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_GROUPING_DIR = "docs/audits/card_visual_artwork_grouping_v1_1/2026-07-21T16-45-14-932Z_grouping_424dbd1f2469";
const DEFAULT_ELIGIBILITY_DIR = "docs/audits/card_visual_search_eligibility_v1_4/2026-07-21T16-32-41-129Z_eligibility_a206881f5a0b";
const DEFAULT_OUTPUT_ROOT = "docs/audits/card_visual_search_projection_v1_5";
const DOCUMENT_TYPES = Object.freeze(["subject", "scene", "style_composition"]);
const KNOWN_GUARDS = new Set([
  "module_completeness",
  "counts",
  "environment_setting",
  "weather_time",
  "pose_action_state",
  "anatomy",
  "subject_semantics",
  "metadata_terms",
  "material_surface",
  "print_markers",
  "expression_personality_mood",
  "card_ui_terms",
  "image_or_text_visibility",
  "search_term_fallback",
]);

const SUBJECT_PATTERN = /\b(?:scene subject|depicted subject|character representation|creature anatomy|human appearance|physical feature|body region|subject|anatomy|creature|human|person|trainer|clothing|garment|accessory|hair|face|facial|eyes?|mouth|body|pose|orientation|gesture|limbs?|appendage|wings?|tail|horns?|claws?)\b/u;
const STYLE_PATTERN = /\b(?:composition|colors?|palette|lighting|shadows?|highlights?|contrast|camera|framing|crop|cropping|depth|motifs?|style|motion cues?)\b/u;
const SCENE_PATTERN = /\b(?:environment|setting|terrain|sky|ground|plants?|trees?|architecture|buildings?|structures?|water|weather|foreground|midground|background|interior|outdoor|indoor|room)\b/u;
const UI_TAXONOMY_PATTERN = /\b(?:card ui|print marker|surface and scan|scan cue|card border|copyright|legal text|collector number|illustrator(?: credit| text)?|artist (?:credit|text)|creator text|hp(?: text| type symbol)?|card (?:name|type|subtype|supertype|category|stage|number|set|text|energy|hp|effect|abilities|evolves from)(?: text| symbol| icon| marker| info)?|attack(?: name| damage| cost| description| effect| power| title| value| energy requirement)?(?: text| symbol| icons?)?|move(?: name| damage| description)? text|ability(?: name| title| header| description| effect| label)?(?: text| box| area| indicator)?|poke[- ]?(?:body|power)(?: text)?|retreat(?: cost| text)?|weakness|resistance|rarity(?: mark| symbol)?|rare (?:mark|symbol)|set (?:symbol|mark|icon|number|code|info)|stage (?:text|marker|label|symbol|indicator|icon)|evol(?:ution|ves? from|ve from)(?: info)?(?: text| marker| symbol| icon)?|regulation mark|promo stamp|edition marker|watermark|printer logo|brand logo|trainer gallery text|deck icon|energy (?:cost |type )?symbols?|type (?:symbol|icon|indicator|mark|label|text)|bottom (?:line|flavor) text|flavor text|pokedex data|height weight text|language text|printed text|print text|small print text|rule(?:s)?(?: text| box)?|basic (?:label|marker|text)|trainer (?:icon|symbol|text)|item (?:subtype|text))\b/u;
const UI_GENERIC_TAXONOMIES = new Set(["text", "text block", "text box", "text line", "text section", "text area"]);
const UI_TERM_FALLBACK_PATTERN = /\b(?:hp\s*\d+|\d+\s*hp|ill(?:us|ustrator)\.?\s|collector (?:no\.?|number)|weakness|resistance|retreat cost|evolves? from|attack (?:name|damage|cost|description|text)|ability (?:name|text)|copyright|rarity (?:mark|symbol)|set (?:symbol|code|number)|promo stamp|ht:\s*\d|wt:\s*\d|card (?:user interface|ui|interface|frame|border|header|text)|trading card frame|printed on (?:the )?card|poke[- ]?body|(?:energy|type|stage|rarity|set|regulation) (?:symbol|icon|mark))\b/u;
const UI_OBSERVATION_ID_PATTERN = /^(?:obs_)?(?:card_?ui|ui)(?:_|$)/u;
const UI_OVERLAY_TEXT_PATTERN = /\b(?:text|wording|letters?)\b.*\b(?:overlay|across (?:the )?(?:foreground|artwork|image)|floating)\b|\b(?:overlay|floating)\b.*\b(?:text|wording|letters?)\b/u;
const UI_CARD_LOGO_PATTERN = /\b(?:pokemon league|pok[eé]mon league|fusion strike|single strike|rapid strike|wb kids) logo\b/u;
const ARTWORK_TEXT_OR_LOGO_HOST_PATTERN = /\b(?:sign|poster|book|paper|screen|game board|building|wall|shirt|jacket|cloak|garment|clothing|banner)\b/u;
const WEATHER_TIME_PATTERN = /weather|rain|snow|storm|lightning storm|sunset|sunrise|daytime|night|dawn|dusk|cloudy|fog|mist/u;
const POSE_PATTERN = /pose|orientation|action|state|standing|sitting|sleeping|flying|floating|running|leaping|walking|crouching/u;
const ANATOMY_PATTERN = /anatomy|physical[_ ]?feature|body[_ ]?region|limb|appendage|wing|tail|horn|claw|eye|mouth|teeth|fang/u;
const EXPRESSION_PATTERN = /expression|personality|mood|happy|angry|annoyed|sad|confident|majestic|fierce|smirk|smiling|scared/u;
const MATERIAL_PATTERN = /material|surface|finish|texture|gloss|reflective|metal|plastic|wood|stone|foil|emboss/u;
const VISIBILITY_PATTERN = /visibility|readab|low resolution|low-resolution|crop|glare|scan quality|cannot determine|not visible/u;

function repoPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value);
}

function posixRelative(value) {
  return path.relative(REPO_ROOT, value).replace(/\\/g, "/");
}

function parseFlag(argv, name) {
  const prefix = `--${name}=`;
  const entry = argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

export function parseVisualSearchProjectionArgsV1(argv = []) {
  return {
    groupingDir: parseFlag(argv, "grouping-dir") ?? DEFAULT_GROUPING_DIR,
    eligibilityDir: parseFlag(argv, "eligibility-dir") ?? DEFAULT_ELIGIBILITY_DIR,
    outputRoot: parseFlag(argv, "output-root") ?? DEFAULT_OUTPUT_ROOT,
    outputDir: parseFlag(argv, "output-dir"),
    concurrency: Number.parseInt(parseFlag(argv, "concurrency") ?? "32", 10),
  };
}

export function isLockedEligibilityReportV1(report) {
  return report?.reconciled === true && report?.version === "CARD_VISUAL_SEARCH_ELIGIBILITY_V1_4";
}

function nowIso() {
  return new Date().toISOString();
}

function safeTimestamp(value = nowIso()) {
  return value.replace(/[:.]/g, "-");
}

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function uniqueSorted(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ""))].sort();
}

function normalizeTerm(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\u2018\u2019\u02bc\uff07]/gu, "'")
    .replace(/[_\s]+/gu, " ")
    .trim();
}

function valueText(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join(", ");
  return Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${key}: ${valueText(entry)}`)
    .filter((entry) => !entry.endsWith(": "))
    .join("; ");
}

function sourceId(sourceType, candidate, fallbackPayload) {
  const explicit = candidate?.observation_id
    ?? candidate?.fact_id
    ?? candidate?.semantic_fact_id
    ?? candidate?.count_id
    ?? candidate?.relationship_id
    ?? null;
  return explicit ?? `${sourceType}_${sha256JsonV1(fallbackPayload).slice(0, 20)}`;
}

function documentTypeForKinds(kinds) {
  const text = normalizeTerm(kinds.join(" "));
  if (SUBJECT_PATTERN.test(text)) return "subject";
  if (STYLE_PATTERN.test(text)) return "style_composition";
  return "scene";
}

function documentTypeForEntry(entry, routingContext = {}) {
  const module = normalizeTerm(entry.module);
  const category = normalizeTerm(entry.category);
  const field = normalizeTerm(entry.field_path);
  const combined = `${module} ${category} ${field} ${normalizeTerm(entry.observation_kinds.join(" "))}`;
  if (entry.source_type === "subject_role") return "subject";
  if (SUBJECT_PATTERN.test(combined)) return "subject";
  if (SCENE_PATTERN.test(combined)) return "scene";
  if (entry.supporting_observation_ids.some((id) => routingContext.subjectObservationIds?.has(id))) return "subject";
  if (STYLE_PATTERN.test(combined)) return "style_composition";
  if (entry.supporting_observation_ids.some((id) => routingContext.styleObservationIds?.has(id))) return "style_composition";
  if (entry.source_type === "count" || entry.source_type === "relationship") return "scene";
  return documentTypeForKinds(entry.observation_kinds);
}

function entryFrom({ sourceType, sourceId: explicitSourceId, term, module = null, fieldPath = null, category = null, subjectRole = null, observationIds, observationById, routingContext, confidence = null, evidenceStrength = null, details = {} }) {
  const normalized = normalizeTerm(term);
  const ids = uniqueSorted(observationIds ?? []);
  const kinds = uniqueSorted(ids.map((id) => observationById.get(id)?.kind));
  const supportingCardUiObservationIds = ids.filter((id) => isCardUiObservationRecordV1(observationById.get(id)));
  const entry = {
    source_type: sourceType,
    source_id: explicitSourceId ?? sourceId(sourceType, null, { term: normalized, module, fieldPath, category, ids }),
    term: String(term ?? "").trim(),
    normalized_term: normalized,
    module,
    field_path: fieldPath,
    category,
    subject_role: subjectRole,
    supporting_observation_ids: ids,
    observation_kinds: kinds,
    confidence: Number.isFinite(confidence) ? confidence : null,
    evidence_strength: evidenceStrength ?? null,
    details,
  };
  if (supportingCardUiObservationIds.length) entry.supporting_card_ui_observation_ids = supportingCardUiObservationIds;
  entry.document_type = documentTypeForEntry(entry, routingContext);
  entry.entry_hash = sha256JsonV1(entry);
  return entry;
}

function subjectRoleByObservation(graph) {
  const roles = new Map();
  for (const row of graph.subjects ?? []) roles.set(row.observation_id, "scene_subject");
  for (const row of graph.depicted_subjects ?? []) roles.set(row.observation_id, "depicted_subject");
  for (const row of graph.character_representations ?? []) roles.set(row.observation_id, "character_representation");
  return roles;
}

function observationRoutingContext(graph) {
  const subjectObservationIds = new Set(subjectRoleByObservation(graph).keys());
  const styleObservationIds = new Set();
  for (const fact of graph.typed_facts ?? []) {
    const classification = normalizeTerm(`${fact.module} ${fact.field_path}`);
    const target = SUBJECT_PATTERN.test(classification)
      ? subjectObservationIds
      : STYLE_PATTERN.test(classification)
        ? styleObservationIds
        : null;
    for (const id of target ? fact.supporting_observation_ids ?? [] : []) target.add(id);
  }
  for (const semantic of graph.semantic_visual_facts ?? []) {
    if (!semantic.subject_observation_id) continue;
    subjectObservationIds.add(semantic.subject_observation_id);
    for (const id of semantic.supporting_observation_ids ?? []) subjectObservationIds.add(id);
  }
  return { subjectObservationIds, styleObservationIds };
}

function buildEvidenceEntries(graph) {
  const observations = graph.observations ?? [];
  const observationById = new Map(observations.map((row) => [row.observation_id, row]));
  const roleByObservation = subjectRoleByObservation(graph);
  const routingContext = observationRoutingContext(graph);
  const entries = [];

  for (const observation of observations) {
    entries.push(entryFrom({
      sourceType: "observation",
      sourceId: observation.observation_id,
      term: observation.label || observation.normalized_label,
      module: observation.kind,
      category: observation.kind,
      subjectRole: roleByObservation.get(observation.observation_id) ?? null,
      observationIds: [observation.observation_id],
      observationById,
      routingContext,
      confidence: observation.confidence,
      evidenceStrength: observation.evidence_strength,
      details: {
        normalized_label: observation.normalized_label ?? null,
        scene_layer: observation.scene_layer ?? null,
        frame_position: observation.frame_position ?? null,
        visibility: observation.visibility ?? null,
        salience: observation.salience ?? null,
      },
    }));
  }

  for (const fact of graph.typed_facts ?? []) {
    const term = [fact.claim, valueText(fact.value)].filter(Boolean).join(": ");
    entries.push(entryFrom({
      sourceType: "typed_fact",
      sourceId: fact.fact_id,
      term,
      module: fact.module,
      fieldPath: fact.field_path,
      observationIds: fact.supporting_observation_ids,
      observationById,
      routingContext,
      confidence: fact.confidence,
      evidenceStrength: fact.evidence_strength,
      details: { claim: fact.claim ?? null, value: fact.value ?? null },
    }));
  }

  const addRoleEntries = (rows, role, identityKey) => {
    for (const row of rows ?? []) {
      const identity = row[identityKey] ?? row.identity ?? "unidentified subject";
      const qualifiers = role === "depicted_subject"
        ? [row.surface_type, row.host_surface]
        : role === "character_representation"
          ? [row.representation_form, row.host_object]
          : [];
      entries.push(entryFrom({
        sourceType: "subject_role",
        sourceId: sourceId("subject_role", row, { role, identity, observation_id: row.observation_id }),
        term: [role, identity, ...qualifiers].filter(Boolean).join(": "),
        module: role,
        category: "subject_role",
        subjectRole: role,
        observationIds: [row.observation_id],
        observationById,
        routingContext,
        confidence: row.identity_confidence ?? row.confidence,
        evidenceStrength: null,
        details: { identity, qualifiers: qualifiers.filter(Boolean) },
      }));
    }
  };
  addRoleEntries(graph.subjects, "scene_subject", "identity");
  addRoleEntries(graph.depicted_subjects, "depicted_subject", "represented_identity");
  addRoleEntries(graph.character_representations, "character_representation", "represented_identity");

  for (const count of graph.counts ?? []) {
    const quantity = count.count_type === "exact"
      ? count.exact_count
      : [count.estimated_min, count.estimated_max].filter((value) => Number.isFinite(value)).join("-") || count.count_type;
    entries.push(entryFrom({
      sourceType: "count",
      sourceId: count.count_id,
      term: `${count.normalized_label} count ${count.count_type}: ${quantity}`,
      module: "counts",
      category: "count",
      observationIds: count.supporting_observation_ids,
      observationById,
      routingContext,
      confidence: count.confidence,
      details: { count_type: count.count_type, exact_count: count.exact_count ?? null, estimated_min: count.estimated_min ?? null, estimated_max: count.estimated_max ?? null },
    }));
  }

  for (const relationship of graph.relationships ?? []) {
    const term = relationship.relationship
      ?? relationship.type
      ?? relationship.relation
      ?? valueText(relationship);
    const observationIds = relationship.supporting_observation_ids
      ?? [relationship.subject_observation_id, relationship.object_observation_id, relationship.source_observation_id, relationship.target_observation_id];
    entries.push(entryFrom({
      sourceType: "relationship",
      sourceId: sourceId("relationship", relationship, relationship),
      term,
      module: "relationships",
      category: "relationship",
      observationIds,
      observationById,
      routingContext,
      confidence: relationship.confidence,
      details: relationship,
    }));
  }

  for (const semantic of graph.semantic_visual_facts ?? []) {
    entries.push(entryFrom({
      sourceType: "semantic_fact",
      sourceId: semantic.semantic_fact_id,
      term: semantic.label,
      module: "semantic_visual_facts",
      category: semantic.category,
      subjectRole: semantic.subject_observation_id ? roleByObservation.get(semantic.subject_observation_id) ?? null : null,
      observationIds: semantic.supporting_observation_ids,
      observationById,
      routingContext,
      confidence: semantic.confidence,
      details: { uncertainty: semantic.uncertainty ?? null },
    }));
  }

  for (const searchTerm of graph.fact_grounded_search_terms ?? []) {
    entries.push(entryFrom({
      sourceType: "search_term",
      term: searchTerm.term,
      module: "fact_grounded_search_terms",
      category: "search_term",
      observationIds: searchTerm.supporting_observation_ids,
      observationById,
      routingContext,
      confidence: searchTerm.confidence,
      details: {},
    }));
  }

  for (const concept of graph.canonical_visual_concepts?.concepts ?? []) {
    entries.push(entryFrom({
      sourceType: "canonical_concept",
      term: concept.concept,
      module: "canonical_visual_concepts",
      category: "canonical_concept",
      observationIds: concept.source_observation_ids,
      observationById,
      routingContext,
      confidence: concept.confidence,
      details: { derivation: concept.derivation ?? null },
    }));
  }

  return { entries, observationById };
}

function guardContext(group, decisions) {
  const limitedModules = new Set(decisions.flatMap((row) => (row.module_limitations ?? []).map((entry) => normalizeTerm(entry.module))));
  const flaggedPhrasesByGuard = new Map();
  for (const decision of decisions) {
    for (const evidence of decision.flagged_evidence ?? []) {
      const guard = evidence.guard_key;
      const phrase = normalizeTerm(evidence.matched_text);
      if (!guard || !phrase) continue;
      const phrases = flaggedPhrasesByGuard.get(guard) ?? [];
      phrases.push(phrase);
      flaggedPhrasesByGuard.set(guard, uniqueSorted(phrases));
    }
  }
  return {
    guards: new Set(group.projection_guard_keys ?? []),
    limitedModules,
    flaggedPhrasesByGuard,
  };
}

function entryText(entry) {
  return normalizeTerm([entry.module, entry.field_path, entry.category, entry.term, entry.observation_kinds.join(" ")].filter(Boolean).join(" "));
}

function cardUiTaxonomyText(entry) {
  return normalizeTerm(`${entry.module} ${entry.field_path} ${entry.category} ${entry.observation_kinds.join(" ")}`);
}

function cardUiTermFallback(entry) {
  const term = normalizeTerm(entry.term);
  const context = normalizeTerm(`${entry.module} ${entry.field_path} ${entry.category} ${entry.term}`);
  if (UI_TERM_FALLBACK_PATTERN.test(term)) return true;
  if (UI_OVERLAY_TEXT_PATTERN.test(term) && !ARTWORK_TEXT_OR_LOGO_HOST_PATTERN.test(context)) return true;
  if (UI_CARD_LOGO_PATTERN.test(term) && !ARTWORK_TEXT_OR_LOGO_HOST_PATTERN.test(context)) return true;
  return false;
}

function isCardUiObservationRecordV1(observation) {
  if (!observation) return false;
  const entry = {
    module: observation.kind,
    field_path: null,
    category: observation.kind,
    observation_kinds: [observation.kind],
    supporting_observation_ids: [observation.observation_id],
    supporting_card_ui_observation_ids: [],
    term: observation.label || observation.normalized_label,
  };
  return isCardUiProjectionEntryV1(entry);
}

export function isCardUiProjectionEntryV1(entry) {
  const observationIds = entry.supporting_observation_ids ?? [];
  if (entry.supporting_card_ui_observation_ids?.length) return true;
  if (observationIds.some((id) => UI_OBSERVATION_ID_PATTERN.test(String(id).toLocaleLowerCase("en-US")))) return true;
  const taxonomies = [entry.module, entry.field_path, entry.category, ...(entry.observation_kinds ?? [])].map(normalizeTerm);
  if (taxonomies.some((value) => UI_GENERIC_TAXONOMIES.has(value))) return true;
  if (UI_TAXONOMY_PATTERN.test(cardUiTaxonomyText(entry))) return true;
  return cardUiTermFallback(entry);
}

function actualMaterialClaim(entry) {
  const text = entryText(entry);
  if (!MATERIAL_PATTERN.test(text)) return false;
  if (/like|looking|appearance|illustrated|drawn|highlight/u.test(text)) return false;
  return /objects?[_ ]?and[_ ]?props|surface|material/u.test(normalizeTerm(`${entry.module} ${entry.field_path}`));
}

function globallyBlocked(entry, observationById) {
  if (!entry.term || !entry.normalized_term) return "empty_projection_term";
  if (entry.supporting_observation_ids.length === 0) return "missing_observation_support";
  if (entry.supporting_observation_ids.some((id) => !observationById.has(id))) return "missing_observation_reference";
  if (isCardUiProjectionEntryV1(entry)) return "card_ui_or_print_marker_observation";
  if (/\b(stoner|stoned|high|under the influence|intoxicated|drugged|smoked out)\b/u.test(entry.normalized_term)) return "query_alias_not_visual_fact";
  if (actualMaterialClaim(entry)) return "actual_material_claim_without_appearance_qualification";
  return null;
}

function flaggedPhraseMatch(entry, phrases) {
  const term = entry.normalized_term;
  return (phrases ?? []).some((phrase) => {
    if (phrase.length < 3) return false;
    return term.includes(phrase) || phrase === term;
  });
}

function guardClassesForEntry(entry, context) {
  const classes = [];
  const text = entryText(entry);
  const module = normalizeTerm(entry.module);
  const category = normalizeTerm(entry.category);
  const field = normalizeTerm(entry.field_path);
  const sourceType = entry.source_type;

  if (context.limitedModules.has(module)) classes.push("module_completeness");
  if (sourceType === "count" || module === "counts" || category === "count" || /\bcount\b/u.test(field)) classes.push("counts");
  if (module === "environment" || /environment|setting|scene[_ ]?type/u.test(`${module} ${category} ${field} ${entry.observation_kinds.join(" ")}`)) classes.push("environment_setting");
  if (WEATHER_TIME_PATTERN.test(text)) classes.push("weather_time");
  if (POSE_PATTERN.test(`${module} ${category} ${field}`) || (sourceType === "semantic_fact" && POSE_PATTERN.test(entry.normalized_term))) classes.push("pose_action_state");
  if (module === "creature anatomy" || ANATOMY_PATTERN.test(`${module} ${field}`)) classes.push("anatomy");
  if (sourceType === "subject_role" || module === "subjects" || /scene[_ ]?subject|depicted[_ ]?subject|character[_ ]?representation/u.test(`${module} ${category}`)) classes.push("subject_semantics");
  if (flaggedPhraseMatch(entry, context.flaggedPhrasesByGuard.get("metadata_terms"))) classes.push("metadata_terms");
  if (MATERIAL_PATTERN.test(text)) classes.push("material_surface");
  if (isCardUiProjectionEntryV1(entry)) classes.push("print_markers", "card_ui_terms");
  if (EXPRESSION_PATTERN.test(`${category} ${field} ${entry.normalized_term}`)) classes.push("expression_personality_mood");
  if (VISIBILITY_PATTERN.test(`${module} ${field} ${category} ${entry.normalized_term}`)
      || entry.evidence_strength === "weak"
      || (Number.isFinite(entry.confidence) && entry.confidence < 0.7)) classes.push("image_or_text_visibility");
  if (sourceType === "search_term") classes.push("search_term_fallback");
  return uniqueSorted(classes);
}

function exclusionRow(group, entry, reasons, guards) {
  const row = {
    projection_version: CARD_VISUAL_SEARCH_PROJECTION_VERSION,
    artwork_group_id: group.artwork_group_id,
    source_type: entry.source_type,
    source_id: entry.source_id,
    source_entry_hash: entry.entry_hash,
    term: entry.term,
    document_type: entry.document_type,
    exclusion_reasons: uniqueSorted(reasons),
    applied_guards: uniqueSorted(guards),
    supporting_observation_ids: entry.supporting_observation_ids,
  };
  row.exclusion_hash = sha256JsonV1(row);
  return row;
}

function documentText(entries) {
  return entries.map((entry) => {
    const fields = [
      entry.source_type,
      entry.module || "unclassified",
      entry.field_path || "-",
      entry.subject_role || "-",
      entry.term,
      `observations=${entry.supporting_observation_ids.join(",")}`,
    ];
    return fields.join(" | ");
  }).join("\n");
}

function evidenceSummary(entries) {
  const confidence = entries.map((row) => row.confidence).filter(Number.isFinite);
  return {
    entry_count: entries.length,
    confidence_count: confidence.length,
    confidence_min: confidence.length ? Math.min(...confidence) : null,
    confidence_max: confidence.length ? Math.max(...confidence) : null,
    confidence_average: confidence.length ? confidence.reduce((sum, value) => sum + value, 0) / confidence.length : null,
    evidence_strengths: Object.fromEntries(uniqueSorted(entries.map((row) => row.evidence_strength)).map((strength) => [strength, entries.filter((row) => row.evidence_strength === strength).length])),
  };
}

function buildDocument(group, membership, generatedRow, documentType, entries, exclusions) {
  const sortedEntries = [...entries].sort((left, right) =>
    left.normalized_term.localeCompare(right.normalized_term)
    || left.source_type.localeCompare(right.source_type)
    || left.source_id.localeCompare(right.source_id));
  const documentId = `cvsd_${sha256JsonV1({ projection_version: CARD_VISUAL_SEARCH_PROJECTION_VERSION, artwork_group_id: group.artwork_group_id, document_type: documentType }).slice(0, 24)}`;
  const payload = {
    projection_version: CARD_VISUAL_SEARCH_PROJECTION_VERSION,
    search_document_id: documentId,
    artwork_group_id: group.artwork_group_id,
    artwork_group_hash: group.artwork_group_hash,
    representative_card_print_id: group.representative_card_print_id,
    document_type: documentType,
    projection_status: sortedEntries.length ? "complete" : "empty",
    canonical_context: {
      name: generatedRow.name ?? group.name_snapshot,
      gv_id: generatedRow.gv_id ?? membership.gv_id,
      prompt_branch: group.prompt_branch,
      authority: "canonical_snapshot_not_visual_evidence",
    },
    eligibility_tier: group.eligibility_tier,
    rank_adjustment_key: group.eligibility_tier === "A" ? "tier_a" : "tier_b",
    projection_guard_keys: group.projection_guard_keys,
    document_text: documentText(sortedEntries),
    normalized_lexical_terms: uniqueSorted(sortedEntries.map((row) => row.normalized_term)),
    structured_concepts: sortedEntries.map((row) => ({
      source_type: row.source_type,
      source_id: row.source_id,
      term: row.normalized_term,
      module: row.module,
      field_path: row.field_path,
      category: row.category,
      subject_role: row.subject_role,
      supporting_observation_ids: row.supporting_observation_ids,
      confidence: row.confidence,
      evidence_strength: row.evidence_strength,
    })),
    subject_role_keys: uniqueSorted(sortedEntries.map((row) => row.subject_role)),
    observation_ids: uniqueSorted(sortedEntries.flatMap((row) => row.supporting_observation_ids)),
    typed_fact_ids: uniqueSorted(sortedEntries.filter((row) => row.source_type === "typed_fact").map((row) => row.source_id)),
    semantic_fact_ids: uniqueSorted(sortedEntries.filter((row) => row.source_type === "semantic_fact").map((row) => row.source_id)),
    source_entry_hashes: sortedEntries.map((row) => row.entry_hash),
    exclusion_hashes: exclusions.filter((row) => row.document_type === documentType).map((row) => row.exclusion_hash).sort(),
    evidence_confidence_summary: evidenceSummary(sortedEntries),
    source_fact_graph_sha256: membership.source_fact_graph_sha256,
    source_generated_row_sha256: membership.source_generated_row_sha256,
  };
  payload.document_hash = sha256JsonV1(payload);
  return { document: payload, evidenceEntries: sortedEntries };
}

export function projectArtworkGraphV1({ group, membership, decisions, generatedRow }) {
  const graph = generatedRow?.visual_attributes?.fact_graph;
  if (!graph || typeof graph !== "object") throw new Error("generated row is missing Fact Graph V2");
  const { entries, observationById } = buildEvidenceEntries(graph);
  const context = guardContext(group, decisions);
  const unknownGuards = [...context.guards].filter((guard) => !KNOWN_GUARDS.has(guard)).sort();
  if (unknownGuards.length) throw new Error(`unknown projection guards: ${unknownGuards.join(",")}`);

  const accepted = [];
  const exclusions = [];
  for (const entry of entries) {
    const globalReason = globallyBlocked(entry, observationById);
    const matchingGuards = guardClassesForEntry(entry, context).filter((guard) => context.guards.has(guard));
    if (globalReason || matchingGuards.length) {
      exclusions.push(exclusionRow(group, entry, globalReason ? [globalReason] : [], matchingGuards));
    } else {
      accepted.push(entry);
    }
  }

  const documents = [];
  const evidence = [];
  for (const documentType of DOCUMENT_TYPES) {
    const built = buildDocument(group, membership, generatedRow, documentType, accepted.filter((row) => row.document_type === documentType), exclusions);
    documents.push(built.document);
    evidence.push(...built.evidenceEntries.map((entry) => ({
      projection_version: CARD_VISUAL_SEARCH_PROJECTION_VERSION,
      search_document_id: built.document.search_document_id,
      artwork_group_id: group.artwork_group_id,
      ...entry,
    })));
  }

  const artwork = {
    projection_version: CARD_VISUAL_SEARCH_PROJECTION_VERSION,
    artwork_group_id: group.artwork_group_id,
    artwork_group_hash: group.artwork_group_hash,
    representative_card_print_id: group.representative_card_print_id,
    source_description_id: generatedRow.description_id ?? null,
    source_fact_graph_sha256: membership.source_fact_graph_sha256,
    source_generated_row_sha256: membership.source_generated_row_sha256,
    source_image_sha256: membership.source_image_sha256,
    image_confidence: membership.image_confidence,
    eligibility_tier: group.eligibility_tier,
    review_status: generatedRow.review_status,
    included_projection_types: [...DOCUMENT_TYPES],
    projection_guard_keys: [...group.projection_guard_keys],
    prompt_branch: group.prompt_branch,
    document_ids: documents.map((row) => row.search_document_id),
    exclusion_count: exclusions.length,
  };
  artwork.artwork_projection_hash = sha256JsonV1(artwork);
  return { artwork, documents, evidence, exclusions };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text.split(/\r?\n/u).filter((line) => line.trim()).map((line) => JSON.parse(line));
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
  return { commit_sha: git(["rev-parse", "HEAD"]), branch: git(["branch", "--show-current"]), tracked_status_short: git(["status", "--short", "--untracked-files=no"]) };
}

async function mapPool(items, concurrency, mapper) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function verifyHashManifest(directory, manifest) {
  const mismatches = [];
  for (const [file, expected] of Object.entries(manifest.files ?? {})) {
    const actual = sha256Buffer(await fs.readFile(path.join(directory, file)));
    if (actual !== expected) mismatches.push({ file, expected, actual });
  }
  return mismatches;
}

function sourceRowFromArtifact(artifact, cardPrintId) {
  if (Array.isArray(artifact.records)) {
    return artifact.records.find((row) => row.card_print_id === cardPrintId)?.generated_row ?? null;
  }
  if (artifact.generated_row?.card_print_id === cardPrintId) return artifact.generated_row;
  if (artifact.card_print_id === cardPrintId && artifact.visual_attributes?.fact_graph) return artifact;
  return null;
}

function countBy(rows, selector) {
  const counts = {};
  for (const row of rows) {
    const key = selector(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

function printingRow(membership, inventory) {
  const row = {
    projection_version: CARD_VISUAL_SEARCH_PROJECTION_VERSION,
    artwork_group_id: membership.artwork_group_id,
    card_print_id: membership.card_print_id,
    gv_id: membership.gv_id,
    name: membership.name,
    set_code: inventory.set_code ?? null,
    number: inventory.number ?? null,
    artwork_fact_source: membership.artwork_fact_source,
    variant_image_status: membership.variant_image_status,
    print_marker_evidence_status: membership.print_marker_evidence_status,
    image_confidence: membership.image_confidence,
    grouping_authority: membership.grouping_authority,
    grouping_evidence: membership.grouping_evidence,
    source_image_sha256: membership.source_image_sha256,
    source_fact_graph_sha256: membership.source_fact_graph_sha256,
    source_eligibility_decision_sha256: membership.source_eligibility_decision_sha256,
    canonical_snapshot_hash: sha256JsonV1({
      card_print_id: membership.card_print_id,
      gv_id: membership.gv_id,
      name: membership.name,
      set_code: inventory.set_code ?? null,
      number: inventory.number ?? null,
    }),
  };
  row.printing_projection_hash = sha256JsonV1(row);
  return row;
}

function reconcileProjection({ groups, memberships, artworks, printings, documents, evidence, exclusions, failures, inputHashMismatches }) {
  const findings = [];
  if (inputHashMismatches.length) findings.push(`input_hash_mismatches:${inputHashMismatches.length}`);
  if (artworks.length + failures.length !== groups.length) findings.push("artwork_source_accounting_mismatch");
  if (printings.length !== memberships.length) findings.push("printing_membership_count_mismatch");
  if (documents.length !== artworks.length * DOCUMENT_TYPES.length) findings.push("document_count_mismatch");

  const duplicateArtworkIds = duplicates(artworks.map((row) => row.artwork_group_id));
  const duplicatePrintingIds = duplicates(printings.map((row) => row.card_print_id));
  const duplicateDocumentIds = duplicates(documents.map((row) => row.search_document_id));
  if (duplicateArtworkIds.length) findings.push(`duplicate_artwork_ids:${duplicateArtworkIds.length}`);
  if (duplicatePrintingIds.length) findings.push(`duplicate_printing_ids:${duplicatePrintingIds.length}`);
  if (duplicateDocumentIds.length) findings.push(`duplicate_document_ids:${duplicateDocumentIds.length}`);

  const documentById = new Map(documents.map((row) => [row.search_document_id, row]));
  for (const document of documents) {
    const { document_hash: recorded, ...payload } = document;
    if (recorded !== sha256JsonV1(payload)) findings.push(`document_hash_mismatch:${document.search_document_id}`);
  }
  for (const artwork of artworks) {
    const { artwork_projection_hash: recorded, ...payload } = artwork;
    if (recorded !== sha256JsonV1(payload)) findings.push(`artwork_hash_mismatch:${artwork.artwork_group_id}`);
  }
  for (const printing of printings) {
    const { printing_projection_hash: recorded, ...payload } = printing;
    if (recorded !== sha256JsonV1(payload)) findings.push(`printing_hash_mismatch:${printing.card_print_id}`);
  }
  for (const exclusion of exclusions) {
    const { exclusion_hash: recorded, ...payload } = exclusion;
    if (recorded !== sha256JsonV1(payload)) findings.push(`exclusion_hash_mismatch:${exclusion.artwork_group_id}:${exclusion.source_id}`);
  }
  for (const entry of evidence) {
    if (!documentById.has(entry.search_document_id)) findings.push(`evidence_missing_document:${entry.search_document_id}`);
    if (!entry.supporting_observation_ids?.length) findings.push(`evidence_missing_observation:${entry.search_document_id}:${entry.source_id}`);
    if (isCardUiProjectionEntryV1(entry)) {
      findings.push(`card_ui_evidence_projected:${entry.search_document_id}:${entry.source_id}`);
    }
  }
  if (groups.some((row) => row.eligibility_tier === "C" || row.prompt_branch === "energy")) findings.push("ineligible_group_projected");
  if (failures.length) findings.push(`projection_failures:${failures.length}`);

  return {
    reconciled: findings.length === 0,
    findings: uniqueSorted(findings),
    counts: {
      planned_artwork_groups: groups.length,
      projected_artworks: artworks.length,
      projection_failures: failures.length,
      locked_memberships: memberships.length,
      projected_printings: printings.length,
      documents: documents.length,
      evidence_entries: evidence.length,
      exclusions: exclusions.length,
      duplicate_artwork_ids: duplicateArtworkIds.length,
      duplicate_printing_ids: duplicatePrintingIds.length,
      duplicate_document_ids: duplicateDocumentIds.length,
      input_hash_mismatches: inputHashMismatches.length,
    },
    distributions: {
      artworks_by_tier: countBy(artworks, (row) => row.eligibility_tier),
      artworks_by_branch: countBy(artworks, (row) => row.prompt_branch),
      documents_by_type: countBy(documents, (row) => row.document_type),
      documents_by_status: countBy(documents, (row) => row.projection_status),
      evidence_by_source_type: countBy(evidence, (row) => row.source_type),
      exclusions_by_reason: countBy(exclusions.flatMap((row) => row.exclusion_reasons.map((reason) => ({ reason }))), (row) => row.reason),
      exclusions_by_guard: countBy(exclusions.flatMap((row) => row.applied_guards.map((guard) => ({ guard }))), (row) => row.guard),
    },
  };
}

function markdownReport(report) {
  const counts = report.reconciliation.counts;
  return `# Card Visual Search Projection V1.5\n\nGenerated: ${report.created_at}\n\n## Result\n\n- Reconciled: \`${report.reconciliation.reconciled}\`\n- Producing commit: \`${report.run_plan.commit_sha}\`\n- Planned artwork groups: \`${counts.planned_artwork_groups}\`\n- Projected artworks: \`${counts.projected_artworks}\`\n- Projected printings: \`${counts.projected_printings}\`\n- Documents: \`${counts.documents}\`\n- Evidence entries: \`${counts.evidence_entries}\`\n- Guard/global exclusions: \`${counts.exclusions}\`\n- Projection failures: \`${counts.projection_failures}\`\n- Input hash mismatches: \`${counts.input_hash_mismatches}\`\n- Findings: \`${report.reconciliation.findings.length}\`\n\n## Boundaries\n\nDocuments were built mechanically from existing evidence. No provider calls, database connections or writes, approvals, embeddings, index writes, or public reads occurred.\n\n## Exact Next Gate\n\nRun the fixed offline lexical and structured evaluation suite. Do not generate embeddings or write a migration until evaluation passes.\n`;
}

async function hashManifest(outputDir, files) {
  const entries = {};
  for (const file of files) entries[file] = sha256Buffer(await fs.readFile(path.join(outputDir, file)));
  return { artifact_kind: "card_visual_search_projection_v1_5_hash_manifest", hash_algorithm: "sha256", generated_at: nowIso(), directory: posixRelative(outputDir), file_count: files.length, files: entries };
}

export async function runVisualSearchProjectionV1(args = parseVisualSearchProjectionArgsV1([])) {
  const git = currentGitState();
  if (git.branch !== CARD_VISUAL_CORPUS_EXPECTED_BRANCH) throw new Error(`expected branch ${CARD_VISUAL_CORPUS_EXPECTED_BRANCH}, found ${git.branch}`);
  if (git.tracked_status_short) throw new Error(`tracked working tree must be clean: ${git.tracked_status_short}`);
  if (!Number.isInteger(args.concurrency) || args.concurrency < 1 || args.concurrency > 128) throw new Error("concurrency must be an integer from 1 through 128");

  const groupingDir = repoPath(args.groupingDir);
  const eligibilityDir = repoPath(args.eligibilityDir);
  const groupingPaths = {
    report: path.join(groupingDir, "ARTWORK_GROUPING_RECONCILIATION.json"),
    groups: path.join(groupingDir, "artwork_groups.jsonl"),
    memberships: path.join(groupingDir, "artwork_group_memberships.jsonl"),
    conflicts: path.join(groupingDir, "artwork_group_conflicts.jsonl"),
    hashes: path.join(groupingDir, "artifact_hashes.json"),
  };
  const eligibilityPaths = {
    report: path.join(eligibilityDir, "ELIGIBILITY_RECONCILIATION.json"),
    decisions: path.join(eligibilityDir, "eligibility_decisions.jsonl"),
  };
  const [groupingReport, groups, memberships, conflicts, groupingHashes, eligibilityReport, decisions] = await Promise.all([
    readJson(groupingPaths.report),
    readJsonl(groupingPaths.groups),
    readJsonl(groupingPaths.memberships),
    readJsonl(groupingPaths.conflicts),
    readJson(groupingPaths.hashes),
    readJson(eligibilityPaths.report),
    readJsonl(eligibilityPaths.decisions),
  ]);
  if (!groupingReport.reconciliation?.reconciled || groupingReport.version !== CARD_VISUAL_ARTWORK_GROUPING_VERSION) throw new Error("grouping input is not the reconciled locked version");
  if (conflicts.length) throw new Error(`grouping input contains ${conflicts.length} conflicts`);
  if (!isLockedEligibilityReportV1(eligibilityReport)) throw new Error("eligibility input is not reconciled V1.4");
  const inventoryDir = repoPath(eligibilityReport.run_plan.inventory_dir);
  const inventoryPath = path.join(inventoryDir, "corpus_inventory.jsonl");
  const inventoryRows = await readJsonl(inventoryPath);

  const inputHashMismatches = await verifyHashManifest(groupingDir, groupingHashes);
  const inputHashes = {
    grouping_report: sha256Buffer(await fs.readFile(groupingPaths.report)),
    artwork_groups: sha256Buffer(await fs.readFile(groupingPaths.groups)),
    artwork_group_memberships: sha256Buffer(await fs.readFile(groupingPaths.memberships)),
    eligibility_report: sha256Buffer(await fs.readFile(eligibilityPaths.report)),
    eligibility_decisions: sha256Buffer(await fs.readFile(eligibilityPaths.decisions)),
    corpus_inventory: sha256Buffer(await fs.readFile(inventoryPath)),
  };
  const runKey = sha256JsonV1({
    version: CARD_VISUAL_SEARCH_PROJECTION_VERSION,
    commit_sha: git.commit_sha,
    grouping_run_key: groupingReport.run_plan.run_key,
    eligibility_run_key: eligibilityReport.run_plan.run_key,
    input_hashes: inputHashes,
  });
  const outputDir = args.outputDir ? repoPath(args.outputDir) : path.join(repoPath(args.outputRoot), `${safeTimestamp()}_projection_${runKey.slice(0, 12)}`);
  const runPlan = {
    version: CARD_VISUAL_SEARCH_PROJECTION_VERSION,
    created_at: nowIso(),
    run_key: runKey,
    commit_sha: git.commit_sha,
    branch: git.branch,
    tracked_worktree_clean: true,
    grouping_dir: posixRelative(groupingDir),
    grouping_run_key: groupingReport.run_plan.run_key,
    grouping_commit_sha: groupingReport.run_plan.commit_sha,
    eligibility_dir: posixRelative(eligibilityDir),
    eligibility_run_key: eligibilityReport.run_plan.run_key,
    inventory_dir: posixRelative(inventoryDir),
    planned_artwork_groups: groups.length,
    planned_memberships: memberships.length,
    planned_document_types: [...DOCUMENT_TYPES],
    planned_documents: groups.length * DOCUMENT_TYPES.length,
    concurrency: args.concurrency,
    input_hashes_sha256: inputHashes,
    boundaries: { provider_calls: false, database_connection: false, database_writes: false, approvals: false, embeddings: false, artifact_projection_build: true, database_index_writes: false, public_reads: false },
  };
  await writeJson(path.join(outputDir, "run_plan.json"), runPlan);

  const inventoryById = new Map(inventoryRows.map((row) => [row.card_print_id, row]));
  const decisionById = new Map(decisions.map((row) => [row.card_print_id, row]));
  const membershipsByGroup = new Map();
  for (const membership of memberships) {
    const rows = membershipsByGroup.get(membership.artwork_group_id) ?? [];
    rows.push(membership);
    membershipsByGroup.set(membership.artwork_group_id, rows);
  }

  const sourceBuckets = new Map();
  const planningFailures = [];
  for (const group of groups) {
    const groupMemberships = membershipsByGroup.get(group.artwork_group_id) ?? [];
    const membership = groupMemberships.find((row) => row.card_print_id === group.representative_card_print_id);
    const inventory = membership ? inventoryById.get(membership.card_print_id) : null;
    const groupDecisions = groupMemberships.map((row) => decisionById.get(row.card_print_id)).filter(Boolean);
    if (!membership || !inventory || !inventory.source_artifact_path || groupDecisions.length !== groupMemberships.length) {
      planningFailures.push({
        projection_version: CARD_VISUAL_SEARCH_PROJECTION_VERSION,
        artwork_group_id: group.artwork_group_id,
        representative_card_print_id: group.representative_card_print_id,
        stage: "source_planning",
        error: "missing membership, inventory, source artifact, or eligibility decision",
      });
      continue;
    }
    const bucket = sourceBuckets.get(inventory.source_artifact_path) ?? [];
    bucket.push({ group, membership, inventory, decisions: groupDecisions });
    sourceBuckets.set(inventory.source_artifact_path, bucket);
  }

  const bucketResults = await mapPool([...sourceBuckets.entries()], args.concurrency, async ([artifactPath, requests]) => {
    const absolutePath = repoPath(artifactPath);
    try {
      const buffer = await fs.readFile(absolutePath);
      const actualArtifactHash = sha256Buffer(buffer);
      const expectedHashes = uniqueSorted(requests.map((row) => row.inventory.source_artifact_sha256));
      if (expectedHashes.length !== 1 || actualArtifactHash !== expectedHashes[0]) {
        throw new Error(`source artifact hash mismatch: expected=${expectedHashes.join(",")} actual=${actualArtifactHash}`);
      }
      const artifact = JSON.parse(buffer.toString("utf8"));
      return requests.map((request) => {
        try {
          const generatedRow = sourceRowFromArtifact(artifact, request.membership.card_print_id);
          if (!generatedRow) throw new Error("generated row not found in source artifact");
          if (sha256JsonV1(generatedRow) !== request.membership.source_generated_row_sha256) throw new Error("generated row hash mismatch");
          if (sha256JsonV1(generatedRow.visual_attributes?.fact_graph) !== request.membership.source_fact_graph_sha256) throw new Error("fact graph hash mismatch");
          if (generatedRow.image_sha256 !== request.membership.source_image_sha256) throw new Error("source image hash mismatch");
          const projected = projectArtworkGraphV1({ ...request, generatedRow });
          projected.artwork.source_description_id = request.inventory.description_id ?? projected.artwork.source_description_id;
          const { artwork_projection_hash: _oldHash, ...artworkPayload } = projected.artwork;
          projected.artwork.artwork_projection_hash = sha256JsonV1(artworkPayload);
          return { ok: true, ...projected };
        } catch (error) {
          return { ok: false, failure: { projection_version: CARD_VISUAL_SEARCH_PROJECTION_VERSION, artwork_group_id: request.group.artwork_group_id, representative_card_print_id: request.group.representative_card_print_id, source_artifact_path: artifactPath, stage: "source_verification_or_projection", error: error.message } };
        }
      });
    } catch (error) {
      return requests.map((request) => ({ ok: false, failure: { projection_version: CARD_VISUAL_SEARCH_PROJECTION_VERSION, artwork_group_id: request.group.artwork_group_id, representative_card_print_id: request.group.representative_card_print_id, source_artifact_path: artifactPath, stage: "source_artifact_read", error: error.message } }));
    }
  });

  const results = bucketResults.flat();
  const successes = results.filter((row) => row.ok);
  const failures = [...planningFailures, ...results.filter((row) => !row.ok).map((row) => row.failure)];
  const artworks = successes.map((row) => row.artwork).sort((left, right) => left.artwork_group_id.localeCompare(right.artwork_group_id));
  const documents = successes.flatMap((row) => row.documents).sort((left, right) => left.search_document_id.localeCompare(right.search_document_id));
  const evidence = successes.flatMap((row) => row.evidence).sort((left, right) => left.search_document_id.localeCompare(right.search_document_id) || left.normalized_term.localeCompare(right.normalized_term) || left.source_id.localeCompare(right.source_id));
  const exclusions = successes.flatMap((row) => row.exclusions).sort((left, right) => left.artwork_group_id.localeCompare(right.artwork_group_id) || left.source_id.localeCompare(right.source_id));
  failures.sort((left, right) => left.artwork_group_id.localeCompare(right.artwork_group_id));
  const printings = memberships.map((membership) => printingRow(membership, inventoryById.get(membership.card_print_id))).sort((left, right) => left.card_print_id.localeCompare(right.card_print_id));
  const reconciliation = reconcileProjection({ groups, memberships, artworks, printings, documents, evidence, exclusions, failures, inputHashMismatches });
  const report = { version: CARD_VISUAL_SEARCH_PROJECTION_VERSION, created_at: nowIso(), run_plan: runPlan, reconciliation };

  const files = [
    "run_plan.json",
    "visual_search_artworks.jsonl",
    "visual_search_printings.jsonl",
    "visual_search_documents.jsonl",
    "visual_search_concept_evidence.jsonl",
    "visual_search_projection_exclusions.jsonl",
    "visual_search_projection_failures.jsonl",
    "PROJECTION_RECONCILIATION.json",
    "PROJECTION_RECONCILIATION.md",
  ];
  await writeJsonl(path.join(outputDir, "visual_search_artworks.jsonl"), artworks);
  await writeJsonl(path.join(outputDir, "visual_search_printings.jsonl"), printings);
  await writeJsonl(path.join(outputDir, "visual_search_documents.jsonl"), documents);
  await writeJsonl(path.join(outputDir, "visual_search_concept_evidence.jsonl"), evidence);
  await writeJsonl(path.join(outputDir, "visual_search_projection_exclusions.jsonl"), exclusions);
  await writeJsonl(path.join(outputDir, "visual_search_projection_failures.jsonl"), failures);
  await writeJson(path.join(outputDir, "PROJECTION_RECONCILIATION.json"), report);
  await fs.writeFile(path.join(outputDir, "PROJECTION_RECONCILIATION.md"), markdownReport(report));
  await writeJson(path.join(outputDir, "artifact_hashes.json"), await hashManifest(outputDir, files));
  return { outputDir, report };
}

export async function main(argv = process.argv.slice(2)) {
  const result = await runVisualSearchProjectionV1(parseVisualSearchProjectionArgsV1(argv));
  const counts = result.report.reconciliation.counts;
  console.log(`[card-visual-search-projection] output_dir=${posixRelative(result.outputDir)}`);
  console.log(`[card-visual-search-projection] projected_artworks=${counts.projected_artworks}`);
  console.log(`[card-visual-search-projection] documents=${counts.documents}`);
  console.log(`[card-visual-search-projection] evidence_entries=${counts.evidence_entries}`);
  console.log(`[card-visual-search-projection] exclusions=${counts.exclusions}`);
  console.log(`[card-visual-search-projection] failures=${counts.projection_failures}`);
  console.log(`[card-visual-search-projection] reconciled=${result.report.reconciliation.reconciled}`);
  if (!result.report.reconciliation.reconciled) process.exitCode = 1;
}
