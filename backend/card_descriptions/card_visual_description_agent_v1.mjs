import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

export const CARD_VISUAL_DESCRIPTION_AGENT_VERSION = "CARD_VISUAL_DESCRIPTION_AGENT_V1";
export const CARD_VISUAL_DESCRIPTION_PROMPT_VERSION = "CARD_VISUAL_DESCRIPTION_PROMPT_V6_VISUAL_LANGUAGE_V1_SUBJECT_REPAIR";
export const CARD_VISUAL_DESCRIPTION_VISUAL_LANGUAGE_VERSION = "CARD_VISUAL_LANGUAGE_V1";
export const CARD_VISUAL_DESCRIPTION_OUTPUT_SCHEMA_VERSION = "CARD_VISUAL_DESCRIPTION_SCHEMA_V1";
export const CARD_VISUAL_DESCRIPTION_DEFAULT_MODEL_VERSION = "fixture-card-visual-description-v1";

export const CARD_VISUAL_DESCRIPTION_REVIEW_STATUSES = Object.freeze([
  "pending",
  "approved",
  "needs_review",
  "rejected",
]);

const DEFAULT_OUT_DIR = path.join(REPO_ROOT, "docs", "audits", "card_visual_descriptions");
const DEFAULT_LIMIT = 25;
const DEFAULT_MIN_WIDTH = 180;
const DEFAULT_MIN_HEIGHT = 240;
const DEFAULT_MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const DEFAULT_IMAGE_DETAIL = "high";
const DEFAULT_MAX_RETRIES = 0;
const DEFAULT_BRANCH_STRATIFIED_CANDIDATE_LIMIT = 5000;
const BRANCH_STRATIFIED_BRANCHES = Object.freeze([
  "pokemon",
  "trainer",
  "stadium",
  "energy",
  "item_tool_supporter",
]);
const CANON_IMAGE_STORAGE_BUCKET = "user-card-images";
const WAREHOUSE_CANON_IMAGE_PREFIXES = [
  "warehouse-derived/self-hosted-images-v1/",
  "warehouse-derived/image-truth-v1/",
];
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const REVIEW_SAMPLE_LIMIT = 25;
const NON_PROBLEM_QUALITY_FLAGS = new Set([
  "clear",
  "clear image",
  "colorful",
  "high",
  "high clarity",
  "high detail",
  "glare prevents determination",
  "visible",
  "visible attributes only",
  "well-defined",
  "well-defined colors",
  "well-defined features",
]);
const GENERIC_OR_NON_VISUAL_TAGS = new Set([
  "card",
  "ex",
  "gx",
  "illustration rare",
  "pokemon",
  "pokemon card",
  "pokemon tcg",
  "pokémon",
  "pokémon card",
  "pokémon tcg",
  "rare",
  "rarity",
  "tcg",
  "trading card game",
  "v",
  "vmax",
  "vstar",
]);
const VISUAL_LANGUAGE_SPECULATIVE_SETTING_PATTERN =
  /\b(cosmic|celestial|magical|enchanted|enchanting|enchantment|dreamlike|dreamy|night sky|portal|mystical|ethereal|twilight|fantasy|fantastical|starry|stars)\b/gi;
const VISUAL_LANGUAGE_INTERPRETIVE_CLAIM_PATTERN =
  /\b(symboli[sz]es|symboli[sz]ing|represents|embodies|evoke|evokes|evoking|evocative|invokes?)\b/gi;
const VISUAL_LANGUAGE_SURFACE_OVERCLAIM_PATTERN =
  /\b(foil (?:texture )?(?:is )?visible|foil treatment is present|visible foil|glossy(?: finish| surface)?|gloss present|layer of gloss|clear gloss finish|clean,\s*reflective finish|reflective finish|metallic finish|smooth silver finish|smooth surface|embossed|texture visible|standard (?:printing treatment|print|surface|printed surface)|card surface appears standard|card surface quality appears clear|(?:without|no) visible textur(?:e|ing)(?: or gloss effects)?|no visible gloss effects|edges?[^.]{0,40}\bwear\b|no significant defects(?: in the print quality)?|print quality|shimmering finish|higher quality print|printing quality appears|printing treatment (?:is consistent|appears to show[^.]*)|appears to show muted colors|without visible errors|imperfections)\b/gi;
const VISUAL_LANGUAGE_OBJECT_MATERIAL_CONFUSION_PATTERN =
  /\b(glossy(?:,\s*|\s+)reflective surface|shiny(?:,\s*|\s+)reflective surface|smooth silver appearance|polished surface|glossy black (?:body|exterior|surface)|shiny surfaces?|glossy bomb|shiny badge|glossy finish|shiny finish|smooth and reflective|reflective dark orb|matte textures?|uniform finish|shiny black surface|metallic badge)\b/gi;
const VISUAL_LANGUAGE_CREATURE_ON_NON_POKEMON_PATTERN =
  /\b(creature|monster|animal-like|beast|living subject)\b/gi;
const VISUAL_LANGUAGE_GENERIC_FRANCHISE_ON_NON_POKEMON_PATTERN =
  /\b(?:pokemon|pokémon)\s+(?:universe|franchise|tcg|trading card game|card)\b/gi;
const VISUAL_LANGUAGE_GENERIC_FILLER_PATTERN =
  /\b(standard trading card|standard card border visible|clear image|print quality appears|printing quality appears|high quality image|well-defined image)\b/gi;
const VISUAL_LANGUAGE_NO_VISIBLE_EXPRESSION_PATTERN =
  /\b(no clearly visible face|face (?:is )?not clearly visible|face details (?:are )?not visible|no visible face|eyes? (?:are )?(?:not visible|not clearly visible|unclear)|facial features? (?:are )?(?:not|not clearly|not explicitly) visible|facial features?[^.]{0,60}\bnot\b[^.]{0,40}\bvisible|facial expression(?:s)? (?:cannot be determined|not visible|unclear)|expression (?:cannot be determined|not visible|unclear))\b/i;
const VISUAL_LANGUAGE_UNSUPPORTED_EMOTION_PATTERN =
  /\b(cheerful|joyful|confident|confidence|angry|sad|friendly|menacing|playful|optimistic|mysterious|enigmatic|elegant|elegance|mystique|personality|demeanor|charm|regal|graceful|gracefully|lively|determination|determined|focused|serious|contemplative|thoughtfulness|introspection|anticipation|enthusiasm|assertive|commanding)\b/gi;
const VISUAL_LANGUAGE_UNSUPPORTED_PERSONALITY_OR_SPECIES_PATTERN =
  /\b(menacing grin|aggressive demeanor|aggressive stance|aggressive expression|aggressive pose|strength and aggression|intimidating presence|characteristic of (?:its|the) species|predatory nature|majestic presence|formidable appearance|intimidating mood|serious and determined|determined expression|calling or directing|confident stance|confident expression|assertive posture|determination or focus|action and determination|exudes? a sense of (?:agility and strength|speed and power|energy and excitement)|speed and power|excitement associated with (?:this )?(?:pokemon|pokémon)|concentration or contemplation|contemplative or calculated demeanor|serious demeanor|introspection and determination|thoughtful expression|contemplative pose|contemplative expression|contemplation|positive emotional tone|inviting tone|warm and inviting tone|reflective and serious|hot,\s*energetic atmosphere|aggressive mood|cheerful mood|playful atmosphere|whimsical(?: touch)?|achievement and honor|intense and dramatic|serene and primitive setting|quiet confidence|emotional charge(?: of the moment)?|connection to history|supportiveness|fits (?:the|this) character'?s theme|hinting at (?:its|the) power|energetic essence)\b/gi;
const VISUAL_LANGUAGE_DRAMATIC_INFERRED_ACTION_PATTERN =
  /\b(impending action|imminent action|imminent detonation|ready to spring(?: into action)?|ready for action|readiness for action(?: or attack)?|readiness to burrow or attack|action and readiness|summoning power(?: or command)?|excitement and tension|urgency and excitement|potential for detonation|spark indicating ignition|explosion or heightened action|explosive atmosphere|about to drill into the ground|something dramatic is about to occur|dramatic (?:event|action|moment) is about to occur|about to occur|final battle (?:is )?suggested by (?:the )?name(?: of the card)?)\b/gi;
const VISUAL_LANGUAGE_METADATA_OR_IDENTITY_PATTERN =
  /\b(?:fire|water|grass|lightning|electric|psychic|fighting|darkness|dark|metal|dragon|colorless|fairy)[-\s]+type\b|\b(?:suggested by the name of the card|name of the card|card name|associated with this (?:pokemon|pokémon)|this (?:pokemon|pokémon)'s design)\b/gi;
const VISUAL_LANGUAGE_INTERPRETIVE_MOOD_PATTERN =
  /\b(mystique|intrigue|tranquil|tranquility|enchantment|awe-inspiring|natural awe|sense of power|sense of discovery|sense of discovery and ancient history)\b/gi;
const VISUAL_LANGUAGE_SEMANTIC_TAG_NONVISUAL_PATTERN =
  /\b(atmosphere|mood|personality|emotion|fantasy|mystical|ethereal|dreamlike|dreamy|magical|enchanted|enchanting|enchantment|twilight|optimistic|serene|tranquil|inviting|mysterious|mystique|intrigue|celebratory|uplifting|theme|whimsical|award)\b/gi;
const VISUAL_LANGUAGE_PURPOSE_OR_LORE_INTERPRETATION_PATTERN =
  /\b(fits (?:the|this) character'?s theme|fitting for a grass energy card|elemental qualities associated with grass|theme of excavation and speed|connection to history|supportiveness|hidden lore|lore|purpose|essence of|energetic essence|thematic meaning|symbolic meaning|significance|abstract representation of [^.]{0,40} energy)\b/gi;
const VISUAL_LANGUAGE_PRIMARY_SUBJECT_ANATOMY_OVERCLAIM_PATTERN =
  /\b(?:gives an impression of|impression of|suggesting|suggests|hinting at)\b[^.]{0,80}\b(?:eyes?|face|facial features?|brow|mouth|limbs?|tail|power|type|nature)\b|\b(?:ethereal eyes|eyes within|furrowed brow area|luminous and reflective)\b/gi;
const VISUAL_LANGUAGE_ABSTRACT_SHAPE_LITERALIZATION_PATTERN =
  /\b(cityscape|urban skyline|buildings|night cityscape|leaf-shaped object|stylized depiction of a creature|specific creatures?|literal environment)\b/gi;
const VISUAL_POLICY_EXPRESSION_UNCERTAIN_CLAIM_PATTERN =
  /\b(confident expression|determined expression|focused expression|thoughtful expression|assertive expression)\b/gi;
const VISUAL_POLICY_TRAINER_PERSONALITY_CLAIM_PATTERN =
  /\b(confident expression|determined expression|focused expression|thoughtful expression|confidence|focused|thoughtful|determined|poise|poised|invoking or directing energy|directing energy|intense action|dramatic atmosphere|urgency)\b/gi;
const VISUAL_POLICY_POKEMON_PERSONALITY_CLAIM_PATTERN =
  /\b(determined stance|intense eye expression|confident expression|determined gaze|fierce expression|aggressive expression|intimidating presence|fierce intensity|intensity and determination)\b/gi;
const VISUAL_POLICY_TYPE_LIKE_VISUAL_CLAIM_PATTERN =
  /\b(electrically charged body|electric(?:al)? (?:energy|power)|electric type|electric-type|ghost type|ghost-type|water energy|grass energy|psychic energy|dark metal energy)\b/gi;
const VISUAL_POLICY_ENERGY_INTERPRETATION_PATTERN =
  /\b(importance|powerful,\s*energetic force|powerful energetic force|unique within the series|fresh and lively atmosphere|mood of vitality and growth|vitality and growth|symbolic meaning|thematic meaning|invokes? a sense of [a-z ]+|abstract representation of [^.]{0,40} energy)\b/gi;
const VISUAL_POLICY_ITEM_ACTION_INTERPRETATION_PATTERN =
  /\b(spark[^.]{0,50}\bindicating\b[^.]{0,50}\baction|indicating a sense of action|explosion or heightened action|explosion of colors|anticipation and excitement|explosive device|potential action|potential detonation)\b/gi;
const VISUAL_POLICY_ITEM_INTERPRETATION_PATTERN =
  /\b(sense of discovery(?: and ancient history)?|significance)\b/gi;
const VISUAL_POLICY_BRANCH_MOOD_REVIEW_PATTERNS = Object.freeze({
  pokemon: /\b(determined|aggressive|intimidating|confident|fierce)\b/gi,
  trainer: /\b(focused|determined|confident|poised|thoughtful|assertive)\b/gi,
  stadium: /\b(mystical|dreamlike|enchanted|awe-inspiring|awe|wonder|intrigue)\b/gi,
  energy: /\b(powerful|growth|vitality|force|serene|calming)\b/gi,
  item_tool_supporter: /\b(anticipatory|urgent|triumphant|celebratory|tense|dramatic)\b/gi,
});
const VISUAL_POLICY_VISIBLE_EXPRESSION_SUPPORT_PATTERN =
  /\b(smile|smiling|wide eyes|furrowed brow|furrowed brows|frown|narrowed eyes|raised eyebrow|raised eyebrows|visible grin|open mouth)\b/i;
const UNAVAILABLE_METADATA_NON_POKEMON_NAME_PATTERN =
  /\b(badge|battle|bell|bomb|fossil|grunt|gwynn|syndicate|tool|item|potion|ticket|map|machine|rod|cape|charm|amulet)\b|(?:バッジ|ベル|ボム|化石|したっぱ|どうぐ|グッズ)/i;
const UNAVAILABLE_METADATA_NON_POKEMON_ARTWORK_PATTERN =
  /\b(human character|visible human|trainer portrait|person|girl|boy|man|woman|object rather than a creature|object scene|item card|tool card|badge|bell|bomb|fossil|star-shaped symbol|star symbol|central star|no distinct (?:pokemon|pokémon) features|no visible (?:pokemon|pokémon)|not a creature)\b/i;

async function loadEnvFilesIfAvailable() {
  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: ".env.local", quiet: true });
    dotenv.config({ path: ".env", quiet: true });
  } catch (error) {
    if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
  }
}

async function createPgClient(clientOptions) {
  const pg = await import("pg");
  const Client = pg.default?.Client ?? pg.Client;
  return new Client(clientOptions);
}

let cachedSupabaseStorageClient = null;

async function createSupabaseStorageClient() {
  if (cachedSupabaseStorageClient) return cachedSupabaseStorageClient;
  const url = normalizeText(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeText(
    process.env.SUPABASE_SECRET_KEY
      ?? process.env.SUPABASE_SERVICE_ROLE_KEY
      ?? process.env.SUPABASE_SERVICE_ROLE,
  );
  if (!url || !key) return null;

  const supabase = await import("@supabase/supabase-js");
  const createClient = supabase.createClient;
  cachedSupabaseStorageClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cachedSupabaseStorageClient;
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return crypto.createHash("sha256").update(input).digest("hex");
}

function nowIso() {
  return new Date().toISOString();
}

function stampFromIso(iso) {
  return iso.replace(/[:.]/g, "-");
}

function asPositiveInt(value, fallback, label) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`[card-visual-description-agent] ${label} must be a positive integer`);
  }
  return parsed;
}

function asNonnegativeInt(value, fallback, label) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`[card-visual-description-agent] ${label} must be a nonnegative integer`);
  }
  return parsed;
}

function asNumber(value, fallback, label) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`[card-visual-description-agent] ${label} must be a nonnegative number`);
  }
  return parsed;
}

function asBoolean(value, fallback, label) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  throw new Error(`[card-visual-description-agent] ${label} must be true or false`);
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function uniqueSorted(values) {
  return [...new Set(values.map(normalizeText).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}

function uniquePreserving(values) {
  const seen = new Set();
  const result = [];
  for (const value of values.map(normalizeText).filter(Boolean)) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function tagKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function visualSubjectNameFromCardName(name) {
  return normalizeText(name)
    .replace(/\s+(ex|gx|v|vmax|vstar)$/i, "")
    .trim();
}

function expectedVisualSubjectsFromCardName(name) {
  const cleaned = normalizeText(name)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\btag\s*team\b/gi, " ")
    .replace(/[-\s]+(?:ex|gx|vmax|vstar|v-union|v)\b/gi, " ")
    .replace(/\b(?:ex|gx|vmax|vstar|v-union|v)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  return uniquePreserving(
    cleaned
      .split(/\s*(?:&|\+|\/|\band\b|,|、)\s*/i)
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter((part) => /[A-Za-z]/.test(part)),
  );
}

function subjectAliases(subject) {
  const key = tagKey(subject);
  const aliases = [key];
  if (key.startsWith("mega ")) aliases.push(key.replace(/^mega\s+/, ""));
  return uniquePreserving(aliases);
}

function textContainsSubject(textKey, subject) {
  const padded = ` ${textKey} `;
  return subjectAliases(subject).some((alias) => alias && padded.includes(` ${alias} `));
}

function promptTypeMetadataValue(value) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function promptTypeKey(value) {
  return tagKey(value);
}

function firstPromptMetadataCandidate(card, field) {
  const candidates = [
    ["exact_trait", card[`exact_${field}`]],
    ["source_trait", card[`source_${field}`]],
    ["same_name_trait", card[`same_name_${field}`]],
    ["direct_card_field", card[field]],
  ];
  for (const [source, rawValue] of candidates) {
    const value = promptTypeMetadataValue(rawValue);
    if (value) return { value, source };
  }
  return { value: "", source: "" };
}

function fallbackPromptTypeMetadata(card) {
  const nameKey = promptTypeKey(card.name);
  if (/^(basic )?(fire|water|grass|lightning|psychic|fighting|darkness|metal|fairy|dragon|colorless|double colorless|rainbow|unit)\s+energy$/.test(nameKey)) {
    return { supertype: "Energy", card_category: "", source: "name_fallback_energy" };
  }
  if (/\b(badge|bell|bomb|fossil|item|tool|rod|ball|machine|potion|switch|vessel|cape|ticket|map|stone|charm|amulet)\b/.test(nameKey) || /(?:バッジ|ベル|ボム|化石|どうぐ|グッズ)/.test(card.name ?? "")) {
    return { supertype: "Trainer", card_category: "Item", source: "name_fallback_item" };
  }
  if (/\b(vitality|research|orders|training|advice|care|invitation|encouragement|determination|performance|hospitality|resolve|guidance|scheme|kindness|exploration|challenge|ambition|backup|conviction|support|battle|grunt|gwynn|syndicate|feelings)\b/.test(nameKey) || /(?:したっぱ|元気|決戦)/.test(card.name ?? "")) {
    return { supertype: "Trainer", card_category: "Supporter", source: "name_fallback_trainer" };
  }
  if (/\b(stadium|garden|forest|city|castle|ruins|cave|library|gym|tower|temple|mountain|island|beach|lake)\b/.test(nameKey)) {
    return { supertype: "Trainer", card_category: "Stadium", source: "name_fallback_stadium" };
  }
  return { supertype: "", card_category: "", source: "" };
}

function resolvePromptBranch({ supertype, card_category: cardCategory, name }) {
  const supertypeKey = promptTypeKey(supertype);
  const categoryKey = promptTypeKey(cardCategory);
  const nameKey = promptTypeKey(name);

  if (
    supertypeKey === "energy" ||
    categoryKey === "energy" ||
    categoryKey === "basic energy" ||
    /^(basic )?(fire|water|grass|lightning|psychic|fighting|darkness|metal|fairy|dragon|colorless|double colorless|rainbow|unit)\s+energy$/.test(nameKey)
  ) {
    return "energy";
  }
  if (categoryKey === "stadium") return "stadium";
  if (supertypeKey === "pokemon") return "pokemon";
  if (supertypeKey === "trainer") {
    if (["item", "tool", "pokemon tool", "technical machine"].includes(categoryKey)) return "item_tool_supporter";
    return "trainer";
  }
  if (["item", "tool", "pokemon tool", "technical machine"].includes(categoryKey)) return "item_tool_supporter";
  if (categoryKey === "supporter") return "trainer";
  return "pokemon";
}

function trainerNameFromCardName(name) {
  const normalized = normalizeText(name);
  const possessiveMatch = normalized.match(/^(.+?)'s\b/i);
  return normalizeText(possessiveMatch?.[1]) || normalized || "unknown";
}

export function resolveCardPromptMetadata(card = {}) {
  const supertypeCandidate = firstPromptMetadataCandidate(card, "supertype");
  const categoryCandidate = firstPromptMetadataCandidate(card, "card_category");
  const fallback = fallbackPromptTypeMetadata(card);
  const supertype = supertypeCandidate.value || fallback.supertype;
  const cardCategory = categoryCandidate.value || fallback.card_category;
  const sources = uniquePreserving([
    supertypeCandidate.source,
    categoryCandidate.source,
    (!supertypeCandidate.value && !categoryCandidate.value) ? fallback.source : "",
  ]);
  const promptBranch = resolvePromptBranch({
    supertype,
    card_category: cardCategory,
    name: card.name,
  });

  return {
    supertype: supertype || "unknown",
    subtype: promptTypeMetadataValue(card.subtype) || "unknown",
    card_category: cardCategory || "unknown",
    pokemon_name: promptBranch === "pokemon" ? visualSubjectNameFromCardName(card.name) || "unknown" : "not_applicable",
    trainer_name: promptBranch === "trainer" ? trainerNameFromCardName(card.name) : "not_applicable",
    prompt_branch: promptBranch,
    card_type_metadata_source: sources.length > 0 ? sources.join("+") : "unavailable",
  };
}

function metadataTagKeysFromCard(card = {}) {
  const values = [
    card.set_name,
    card.set_code,
    card.number,
    card.rarity,
    card.artist,
    card.supertype,
    card.subtype,
    card.card_category,
  ];

  for (const attack of Array.isArray(card.attacks) ? card.attacks : []) {
    if (typeof attack === "string") values.push(attack);
    else if (attack && typeof attack === "object") values.push(attack.name);
  }

  if (Array.isArray(card.attack_names)) values.push(...card.attack_names);

  return new Set(values.map(tagKey).filter(Boolean));
}

export function detectVisualDescriptionReviewFlagsV1(payload, card = {}) {
  return uniqueSorted(detectVisualDescriptionReviewFlagDetailsV1(payload, card).map((detail) => detail.flag));
}

function normalizeFlagDetail(detail) {
  return {
    flag: normalizeText(detail.flag),
    matched_text: normalizeText(detail.matched_text),
    field: normalizeText(detail.field),
  };
}

function uniqueQualityFlagDetails(details) {
  const seen = new Set();
  const result = [];
  for (const rawDetail of details) {
    const detail = normalizeFlagDetail(rawDetail);
    if (!detail.flag || !detail.matched_text || !detail.field) continue;
    const key = `${detail.flag}\u0000${detail.field}\u0000${detail.matched_text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(detail);
  }
  return result;
}

function textFieldsForVisualLanguageReview(payload) {
  const attributes = payload?.visual_attributes ?? {};
  const subjects = attributes.subjects ?? {};
  const environment = attributes.environment ?? {};
  return [
    ["artwork_description", payload?.artwork_description],
    ["card_surface_and_printing_cues", payload?.card_surface_and_printing_cues],
    ["visual_attributes.subjects.primary", normalizeStringArray(subjects.primary).join(" ")],
    ["visual_attributes.subjects.secondary", normalizeStringArray(subjects.secondary).join(" ")],
    ["visual_attributes.environment.setting", normalizeStringArray(environment.setting).join(" ")],
    ["visual_attributes.mood", normalizeStringArray(attributes.mood).join(" ")],
    ["visual_attributes.distinguishing_details", normalizeStringArray(attributes.distinguishing_details).join(" ")],
    ["semantic_tags", normalizeStringArray(payload?.semantic_tags).join(" ")],
  ].map(([field, text]) => ({ field, text: normalizeText(text) })).filter((entry) => entry.text);
}

function regexDetails({ flag, field, text, pattern }) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  return [...text.matchAll(regex)].map((match) => ({
    flag,
    matched_text: match[0],
    field,
  }));
}

function addManualDetail(details, flag, field, matchedText) {
  const matched_text = normalizeText(matchedText);
  if (!matched_text) return;
  details.push({ flag, matched_text, field });
}

function uniquePolicyResults(results) {
  const seen = new Set();
  const unique = [];
  for (const result of results) {
    const key = [
      result.policy_rule,
      result.field,
      normalizeText(result.claim).toLowerCase(),
      result.decision,
      result.quality_flag,
    ].join("\u0000");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(result);
  }
  return unique;
}

function addPolicyResult(results, {
  policyRule,
  field,
  claim,
  supportingEvidence = [],
  decision = "needs_review",
  qualityFlag,
}) {
  const normalizedClaim = normalizeText(claim);
  if (!normalizedClaim) return;
  results.push({
    policy_rule: policyRule,
    field,
    claim: normalizedClaim,
    supporting_evidence: uniqueSorted(supportingEvidence.map((item) => normalizeText(item)).filter(Boolean)),
    decision,
    quality_flag: qualityFlag,
  });
}

function addPolicyRegexResults(results, {
  policyRule,
  field,
  text,
  pattern,
  supportingEvidence = [],
  qualityFlag,
}) {
  for (const detail of regexDetails({ flag: qualityFlag, field, text, pattern })) {
    addPolicyResult(results, {
      policyRule,
      field,
      claim: detail.matched_text,
      supportingEvidence,
      qualityFlag,
    });
  }
}

function visibleExpressionSupportEvidence(payload) {
  const evidence = [];
  for (const { field, text } of textFieldsForVisualLanguageReview(payload)) {
    if (field === "semantic_tags" || field === "visual_attributes.mood" || field === "card_surface_and_printing_cues") {
      continue;
    }
    const regex = new RegExp(VISUAL_POLICY_VISIBLE_EXPRESSION_SUPPORT_PATTERN.source, "gi");
    for (const match of text.matchAll(regex)) {
      evidence.push(`${field}: ${match[0]}`);
    }
  }
  return uniqueSorted(evidence);
}

function supportedTrainerPersonalityDetails(details, expressionSupport) {
  if (expressionSupport.length === 0) return details;
  return details.filter((detail) => {
    const matchedText = normalizeText(detail.matched_text);
    if (!/\b(confident expression|determined expression|focused expression|thoughtful expression|assertive expression|confidence|focused|thoughtful|determined)\b/i.test(matchedText)) {
      return true;
    }
    return false;
  });
}

function policyFieldsFor(payload, allowedFields) {
  return textFieldsForVisualLanguageReview(payload).filter((entry) => allowedFields.includes(entry.field));
}

export function evaluateVisualDescriptionPolicyV1(payload, card = {}) {
  const results = [];
  const fields = textFieldsForVisualLanguageReview(payload);
  const promptMetadata = resolveCardPromptMetadata(card);
  const promptBranch = normalizeText(card.prompt_branch) || promptMetadata.prompt_branch;
  const expressionSupport = visibleExpressionSupportEvidence(payload);

  const surfaceText = fields.find((entry) => entry.field === "card_surface_and_printing_cues")?.text ?? "";
  addPolicyRegexResults(results, {
    policyRule: "surface_claim_requires_physical_evidence",
    field: "card_surface_and_printing_cues",
    text: surfaceText,
    pattern: VISUAL_LANGUAGE_SURFACE_OVERCLAIM_PATTERN,
    qualityFlag: "potential_surface_overclaim",
  });

  const expressionUnclearEvidence = fields.flatMap(({ field, text }) =>
    regexDetails({
      flag: "potential_cross_field_expression_contradiction",
      field,
      text,
      pattern: VISUAL_LANGUAGE_NO_VISIBLE_EXPRESSION_PATTERN,
    }).map((detail) => `${detail.field}: ${detail.matched_text}`),
  );
  for (const note of normalizeStringArray(payload?.visual_attributes?.uncertainty_notes)) {
    for (const detail of regexDetails({
      flag: "potential_cross_field_expression_contradiction",
      field: "visual_attributes.uncertainty_notes",
      text: note,
      pattern: VISUAL_LANGUAGE_NO_VISIBLE_EXPRESSION_PATTERN,
    })) {
      expressionUnclearEvidence.push(`${detail.field}: ${detail.matched_text}`);
    }
  }
  if (expressionUnclearEvidence.length > 0) {
    for (const { field, text } of policyFieldsFor(payload, ["artwork_description", "visual_attributes.mood", "semantic_tags"])) {
      addPolicyRegexResults(results, {
        policyRule: "expression_claim_contradicts_unclear_face",
        field,
        text,
        pattern: VISUAL_POLICY_EXPRESSION_UNCERTAIN_CLAIM_PATTERN,
        supportingEvidence: expressionUnclearEvidence,
        qualityFlag: "potential_cross_field_expression_contradiction",
      });
    }
  }

  if (promptBranch === "pokemon") {
    for (const { field, text } of policyFieldsFor(payload, ["artwork_description", "visual_attributes.mood", "semantic_tags"])) {
      addPolicyRegexResults(results, {
        policyRule: "pokemon_personality_or_expression_requires_review",
        field,
        text,
        pattern: VISUAL_POLICY_POKEMON_PERSONALITY_CLAIM_PATTERN,
        supportingEvidence: expressionSupport,
        qualityFlag: "potential_unsupported_personality_or_species_interpretation",
      });
    }
  }

  if (promptBranch === "trainer") {
    for (const { field, text } of policyFieldsFor(payload, ["artwork_description", "visual_attributes.mood", "semantic_tags"])) {
      for (const detail of regexDetails({
        flag: "potential_unsupported_personality_or_species_interpretation",
        field,
        text,
        pattern: VISUAL_POLICY_TRAINER_PERSONALITY_CLAIM_PATTERN,
      })) {
        const claim = detail.matched_text;
        const alwaysReview = /\b(invoking or directing energy|directing energy|intense action|dramatic atmosphere|urgency)\b/i.test(claim);
        if (alwaysReview || expressionSupport.length === 0) {
          addPolicyResult(results, {
            policyRule: alwaysReview
              ? "trainer_action_or_atmosphere_interpretation_requires_review"
              : "trainer_personality_or_expression_requires_visible_support",
            field,
            claim,
            supportingEvidence: expressionSupport,
            qualityFlag: "potential_unsupported_personality_or_species_interpretation",
          });
        }
      }
    }
  }

  for (const { field, text } of policyFieldsFor(payload, ["artwork_description", "visual_attributes.distinguishing_details", "semantic_tags"])) {
    addPolicyRegexResults(results, {
      policyRule: "type_like_visual_claim_requires_visible_support",
      field,
      text,
      pattern: VISUAL_POLICY_TYPE_LIKE_VISUAL_CLAIM_PATTERN,
      qualityFlag: "potential_canonical_metadata_in_visual_output",
    });
  }

  if (promptBranch === "energy") {
    for (const { field, text } of policyFieldsFor(payload, ["artwork_description", "visual_attributes.mood", "semantic_tags"])) {
      addPolicyRegexResults(results, {
        policyRule: "energy_branch_force_purpose_or_series_claim_requires_review",
        field,
        text,
        pattern: VISUAL_POLICY_ENERGY_INTERPRETATION_PATTERN,
        qualityFlag: "potential_purpose_or_lore_interpretation",
      });
    }
    for (const { field, text } of policyFieldsFor(payload, ["artwork_description", "visual_attributes.environment.setting", "visual_attributes.distinguishing_details", "semantic_tags"])) {
      addPolicyRegexResults(results, {
        policyRule: "energy_abstract_literalization_requires_structured_entity_evidence",
        field,
        text,
        pattern: VISUAL_LANGUAGE_ABSTRACT_SHAPE_LITERALIZATION_PATTERN,
        qualityFlag: "potential_abstract_shape_literalization",
      });
    }
  }

  if (promptBranch === "item_tool_supporter") {
    for (const { field, text } of policyFieldsFor(payload, ["artwork_description", "visual_attributes.mood", "semantic_tags"])) {
      addPolicyRegexResults(results, {
        policyRule: "item_object_action_or_event_interpretation_requires_review",
        field,
        text,
        pattern: VISUAL_POLICY_ITEM_ACTION_INTERPRETATION_PATTERN,
        qualityFlag: "potential_dramatic_inferred_action_language",
      });
      addPolicyRegexResults(results, {
        policyRule: "item_object_purpose_or_interpretation_requires_review",
        field,
        text,
        pattern: VISUAL_POLICY_ITEM_INTERPRETATION_PATTERN,
        qualityFlag: "potential_purpose_or_lore_interpretation",
      });
    }
  }

  const moodText = fields.find((entry) => entry.field === "visual_attributes.mood")?.text ?? "";
  const branchMoodPattern = VISUAL_POLICY_BRANCH_MOOD_REVIEW_PATTERNS[promptBranch];
  if (moodText && branchMoodPattern) {
    const moodQualityFlag = {
      pokemon: "potential_unsupported_personality_or_species_interpretation",
      trainer: "potential_unsupported_personality_or_species_interpretation",
      stadium: "potential_interpretive_mood_language",
      energy: "potential_purpose_or_lore_interpretation",
      item_tool_supporter: "potential_dramatic_inferred_action_language",
    }[promptBranch];
    addPolicyRegexResults(results, {
      policyRule: "branch_mood_vocabulary_requires_review",
      field: "visual_attributes.mood",
      text: moodText,
      pattern: branchMoodPattern,
      qualityFlag: moodQualityFlag,
    });
  }

  return uniquePolicyResults(results);
}

function addSubjectCorrectnessFlagDetails(details, payload, card, promptBranch) {
  if (promptBranch !== "pokemon") return;
  const expectedSubjects = expectedVisualSubjectsFromCardName(card.name);
  if (expectedSubjects.length === 0) return;

  const attributes = payload?.visual_attributes ?? {};
  const subjects = attributes.subjects ?? {};
  const primarySubjects = normalizeStringArray(subjects.primary);
  const secondarySubjects = normalizeStringArray(subjects.secondary);
  const subjectText = [...primarySubjects, ...secondarySubjects].join(" ");
  const subjectTextKey = tagKey(subjectText);
  const combinedSubjectTextKey = tagKey([
    subjectText,
    payload?.artwork_description,
    normalizeStringArray(payload?.semantic_tags).join(" "),
  ].join(" "));

  for (const expected of expectedSubjects) {
    if (!textContainsSubject(subjectTextKey, expected)) {
      addManualDetail(
        details,
        "potential_primary_subject_mismatch",
        "visual_attributes.subjects.primary",
        `missing expected subject: ${expected}`,
      );
    }
  }

  const missingExpectedSubjects = expectedSubjects.filter((subject) => !textContainsSubject(combinedSubjectTextKey, subject));
  const describesSingleMergedSubject = /\b(?:single|one|combined|merged|hybrid|fusion)\b[^.]{0,50}\b(?:creature|subject|figure|pokemon|pokémon|form)\b/i.test(String(payload?.artwork_description ?? ""));
  if (expectedSubjects.length > 1 && (missingExpectedSubjects.length > 0 || describesSingleMergedSubject)) {
    addManualDetail(
      details,
      "potential_subject_count_mismatch",
      "artwork_description",
      describesSingleMergedSubject
        ? "single merged subject language on multi-subject card"
        : `missing expected subjects: ${missingExpectedSubjects.join(", ")}`,
    );
  }

  if (
    expectedSubjects.length === 1
    && /\b(?:two|three|multiple|several)\b[^.]{0,60}\b(?:creatures|pokemon|pokémon|subjects|figures|characters)\b/i.test(String(payload?.artwork_description ?? ""))
  ) {
    addManualDetail(details, "potential_subject_count_mismatch", "artwork_description", "multiple subjects described on single-subject card");
  }

  const expectedKey = tagKey(expectedSubjects.join(" "));
  const combinedText = [
    payload?.artwork_description,
    subjectText,
    normalizeStringArray(payload?.semantic_tags).join(" "),
  ].join(" ");

  if (/\bmew\b/.test(expectedKey)) {
    for (const { field, text } of textFieldsForVisualLanguageReview(payload)) {
      details.push(...regexDetails({
        flag: "potential_canonical_name_visual_conflict",
        field,
        text,
        pattern: /\b(mushroom(?:-like)?|fungi?|plant-like|mushroom creatures?|small mushroom-like creatures?)\b/gi,
      }));
    }
  }

  if (/\bgengar\b/.test(expectedKey)) {
    for (const { field, text } of textFieldsForVisualLanguageReview(payload)) {
      details.push(...regexDetails({
        flag: "potential_canonical_name_visual_conflict",
        field,
        text,
        pattern: /\b(no visible limbs|without limbs|limbs? (?:are )?(?:not visible|not shown)|no arms|no legs)\b/gi,
      }));
    }
  }

  if (expectedSubjects.length > 1 && /\b(hybrid creature|single hybrid|combined creature|merged creature|fusion)\b/i.test(combinedText)) {
    addManualDetail(details, "potential_subject_count_mismatch", "artwork_description", "hybrid creature");
    addManualDetail(details, "potential_canonical_name_visual_conflict", "artwork_description", "hybrid creature");
  }
}

function addMetadataOrIdentityFlagDetails(details, payload, card) {
  const semanticTags = normalizeStringArray(payload?.semantic_tags);
  const metadataKeys = metadataTagKeysFromCard(card);
  const cardNameKey = tagKey(card.name);
  const subjectKey = tagKey(visualSubjectNameFromCardName(card.name));
  const expectedSubjectKeys = expectedVisualSubjectsFromCardName(card.name).map(tagKey).filter(Boolean);

  for (const tag of semanticTags) {
    const key = tagKey(tag);
    if (!key) continue;
    if (key === cardNameKey || metadataKeys.has(key) || (subjectKey && key === subjectKey) || expectedSubjectKeys.includes(key)) {
      addManualDetail(details, "potential_metadata_or_identity_language", "semantic_tags", tag);
      addManualDetail(details, "potential_canonical_metadata_in_visual_output", "semantic_tags", tag);
    }
  }
}

function addCrossFieldExpressionContradictionFlagDetails(details, payload) {
  const fields = textFieldsForVisualLanguageReview(payload);
  const expressionUnclear = fields.some(({ text }) => VISUAL_LANGUAGE_NO_VISIBLE_EXPRESSION_PATTERN.test(text));
  if (!expressionUnclear) return;

  for (const { field, text } of fields.filter((entry) => entry.field !== "card_surface_and_printing_cues")) {
    details.push(...regexDetails({
      flag: "potential_cross_field_expression_contradiction",
      field,
      text,
      pattern: VISUAL_LANGUAGE_UNSUPPORTED_EMOTION_PATTERN,
    }));
    details.push(...regexDetails({
      flag: "potential_cross_field_expression_contradiction",
      field,
      text,
      pattern: VISUAL_LANGUAGE_UNSUPPORTED_PERSONALITY_OR_SPECIES_PATTERN,
    }));
  }
}

function addEnergyAbstractShapeLiteralizationFlagDetails(details, payload, promptBranch) {
  if (promptBranch !== "energy") return;

  for (const { field, text } of textFieldsForVisualLanguageReview(payload).filter((entry) => entry.field !== "card_surface_and_printing_cues")) {
    details.push(...regexDetails({
      flag: "potential_abstract_shape_literalization",
      field,
      text,
      pattern: VISUAL_LANGUAGE_ABSTRACT_SHAPE_LITERALIZATION_PATTERN,
    }));
  }
}

function addPrimarySubjectAnatomyOverclaimFlagDetails(details, payload, promptBranch) {
  if (promptBranch !== "pokemon") return;

  for (const { field, text } of textFieldsForVisualLanguageReview(payload).filter((entry) => entry.field !== "card_surface_and_printing_cues")) {
    details.push(...regexDetails({
      flag: "potential_primary_subject_anatomy_overclaim",
      field,
      text,
      pattern: VISUAL_LANGUAGE_PRIMARY_SUBJECT_ANATOMY_OVERCLAIM_PATTERN,
    }));
  }
}

function addBranchSpecificMoodOverclaimFlagDetails(details, payload, promptBranch) {
  const moodText = normalizeStringArray(payload?.visual_attributes?.mood).join(" ");
  if (!moodText) return;
  if (promptBranch === "trainer" && visibleExpressionSupportEvidence(payload).length > 0) return;

  const moodChecks = {
    pokemon: [
      ["potential_unsupported_personality_or_species_interpretation", /\b(aggressive|intimidating)\b/gi],
    ],
    trainer: [
      ["potential_unsupported_personality_or_species_interpretation", /\b(determined|assertive|confident)\b/gi],
    ],
    stadium: [
      ["potential_interpretive_mood_language", /\b(awe-inspiring|awe|powerful|sense of power)\b/gi],
    ],
    item_tool_supporter: [
      ["potential_dramatic_inferred_action_language", /\b(urgent|urgency|exciting|excitement|tension)\b/gi],
    ],
  };

  for (const [flag, pattern] of moodChecks[promptBranch] ?? []) {
    details.push(...regexDetails({
      flag,
      field: "visual_attributes.mood",
      text: moodText,
      pattern,
    }));
  }
}

export function detectVisualDescriptionReviewFlagDetailsV1(payload, card = {}) {
  const details = [];
  const fields = textFieldsForVisualLanguageReview(payload);
  const combinedText = fields.map((entry) => entry.text).join(" ");
  const lower = combinedText.toLowerCase();
  const cardNameKey = tagKey(card.name);
  const resolvedPromptMetadata = resolveCardPromptMetadata(card);
  const promptBranch = normalizeText(card.prompt_branch) || resolvedPromptMetadata.prompt_branch;
  const cardTypeMetadataSource = normalizeText(card.card_type_metadata_source) || resolvedPromptMetadata.card_type_metadata_source;
  const expressionSupport = promptBranch === "trainer" ? visibleExpressionSupportEvidence(payload) : [];

  addSubjectCorrectnessFlagDetails(details, payload, card, promptBranch);
  addMetadataOrIdentityFlagDetails(details, payload, card);
  addCrossFieldExpressionContradictionFlagDetails(details, payload);
  addEnergyAbstractShapeLiteralizationFlagDetails(details, payload, promptBranch);
  addPrimarySubjectAnatomyOverclaimFlagDetails(details, payload, promptBranch);
  addBranchSpecificMoodOverclaimFlagDetails(details, payload, promptBranch);

  if (
    cardNameKey.includes("chandelure")
    && /\b(hold|holds|holding|held)\b/i.test(lower)
    && /\b(orb|sphere|spherical|round|chandelier|lamp|flame|flames)\b/i.test(lower)
  ) {
    for (const { field, text } of fields) {
      details.push(...regexDetails({
        flag: "potential_body_part_as_separate_held_object",
        field,
        text,
        pattern: /\b(?:hold|holds|holding|held)\b[^.]{0,80}\b(?:orb|sphere|spherical|round|chandelier|lamp|flames?)\b/gi,
      }));
    }
  }

  const uncertaintyText = normalizeStringArray(payload?.visual_attributes?.uncertainty_notes).join(" ").toLowerCase();
  if (
    /\b(cosmic|celestial|outer space|space scene|stars|galaxy|galactic)\b/i.test(lower)
    && !/\b(uncertain|ambiguous|abstract|not clear|not clearly|appears|suggests|star-like)\b/i.test(uncertaintyText)
  ) {
    for (const { field, text } of fields) {
      details.push(...regexDetails({
        flag: "potential_overconfident_ambiguous_setting",
        field,
        text,
        pattern: /\b(cosmic|celestial|outer space|space scene|stars|galaxy|galactic)\b/gi,
      }));
    }
  }

  if (promptBranch === "pokemon" && cardTypeMetadataSource === "unavailable") {
    const nameText = normalizeText(card.name);
    details.push(...regexDetails({
      flag: "potential_unavailable_metadata_prompt_branch_mismatch",
      field: "name",
      text: nameText,
      pattern: UNAVAILABLE_METADATA_NON_POKEMON_NAME_PATTERN,
    }));
    for (const { field, text } of fields) {
      details.push(...regexDetails({
        flag: "potential_unavailable_metadata_prompt_branch_mismatch",
        field,
        text,
        pattern: UNAVAILABLE_METADATA_NON_POKEMON_ARTWORK_PATTERN,
      }));
    }
  }

  for (const { field, text } of fields.filter((entry) => entry.field !== "card_surface_and_printing_cues")) {
    details.push(...regexDetails({
      flag: "potential_speculative_setting_language",
      field,
      text,
      pattern: VISUAL_LANGUAGE_SPECULATIVE_SETTING_PATTERN,
    }));
    details.push(...regexDetails({
      flag: "potential_interpretive_claim",
      field,
      text,
      pattern: VISUAL_LANGUAGE_INTERPRETIVE_CLAIM_PATTERN,
    }));
    details.push(...regexDetails({
      flag: "potential_generic_filler",
      field,
      text,
      pattern: VISUAL_LANGUAGE_GENERIC_FILLER_PATTERN,
    }));
    details.push(...regexDetails({
      flag: "potential_interpretive_mood_language",
      field,
      text,
      pattern: VISUAL_LANGUAGE_INTERPRETIVE_MOOD_PATTERN,
    }));
    const unsupportedPersonalityDetails = regexDetails({
      flag: "potential_unsupported_personality_or_species_interpretation",
      field,
      text,
      pattern: VISUAL_LANGUAGE_UNSUPPORTED_PERSONALITY_OR_SPECIES_PATTERN,
    });
    details.push(...(promptBranch === "trainer"
      ? supportedTrainerPersonalityDetails(unsupportedPersonalityDetails, expressionSupport)
      : unsupportedPersonalityDetails));
    details.push(...regexDetails({
      flag: "potential_dramatic_inferred_action_language",
      field,
      text,
      pattern: VISUAL_LANGUAGE_DRAMATIC_INFERRED_ACTION_PATTERN,
    }));
    details.push(...regexDetails({
      flag: "potential_object_material_or_card_surface_confusion",
      field,
      text,
      pattern: VISUAL_LANGUAGE_OBJECT_MATERIAL_CONFUSION_PATTERN,
    }));
    details.push(...regexDetails({
      flag: "potential_metadata_or_identity_language",
      field,
      text,
      pattern: VISUAL_LANGUAGE_METADATA_OR_IDENTITY_PATTERN,
    }));
    details.push(...regexDetails({
      flag: "potential_canonical_metadata_in_visual_output",
      field,
      text,
      pattern: VISUAL_LANGUAGE_METADATA_OR_IDENTITY_PATTERN,
    }));
    details.push(...regexDetails({
      flag: "potential_visual_material_vs_surface_confusion",
      field,
      text,
      pattern: VISUAL_LANGUAGE_OBJECT_MATERIAL_CONFUSION_PATTERN,
    }));
    details.push(...regexDetails({
      flag: "potential_purpose_or_lore_interpretation",
      field,
      text,
      pattern: VISUAL_LANGUAGE_PURPOSE_OR_LORE_INTERPRETATION_PATTERN,
    }));
  }

  const surfaceText = fields.find((entry) => entry.field === "card_surface_and_printing_cues")?.text ?? "";
  details.push(...regexDetails({
    flag: "potential_surface_overclaim",
    field: "card_surface_and_printing_cues",
    text: surfaceText,
    pattern: VISUAL_LANGUAGE_SURFACE_OVERCLAIM_PATTERN,
  }));
  details.push(...regexDetails({
    flag: "potential_generic_filler",
    field: "card_surface_and_printing_cues",
    text: surfaceText,
    pattern: VISUAL_LANGUAGE_GENERIC_FILLER_PATTERN,
  }));

  if (promptBranch !== "pokemon") {
    for (const { field, text } of fields) {
      details.push(...regexDetails({
        flag: "potential_creature_language_on_non_pokemon_branch",
        field,
        text,
        pattern: VISUAL_LANGUAGE_CREATURE_ON_NON_POKEMON_PATTERN,
      }));
      details.push(...regexDetails({
        flag: "potential_generic_franchise_language_on_non_pokemon_branch",
        field,
        text,
        pattern: VISUAL_LANGUAGE_GENERIC_FRANCHISE_ON_NON_POKEMON_PATTERN,
      }));
    }
  }

  if (VISUAL_LANGUAGE_NO_VISIBLE_EXPRESSION_PATTERN.test(combinedText)) {
    for (const { field, text } of fields.filter((entry) => entry.field !== "card_surface_and_printing_cues")) {
      details.push(...regexDetails({
        flag: "potential_unsupported_emotion_or_personality_claim",
        field,
        text,
        pattern: VISUAL_LANGUAGE_UNSUPPORTED_EMOTION_PATTERN,
      }));
    }
  }

  const semanticTagsText = fields.find((entry) => entry.field === "semantic_tags")?.text ?? "";
  details.push(...regexDetails({
    flag: "potential_semantic_tag_nonvisual_concept",
    field: "semantic_tags",
    text: semanticTagsText,
    pattern: VISUAL_LANGUAGE_SEMANTIC_TAG_NONVISUAL_PATTERN,
  }));

  for (const policyResult of evaluateVisualDescriptionPolicyV1(payload, card)) {
    addManualDetail(details, policyResult.quality_flag, policyResult.field, policyResult.claim);
  }

  return uniqueQualityFlagDetails(details);
}

export function sanitizeSemanticTagsForVisibleArtworkV1(tags, card = {}) {
  const normalizedTags = uniqueSorted(Array.isArray(tags) ? tags : []);
  const metadataKeys = metadataTagKeysFromCard(card);
  const subjectKey = tagKey(visualSubjectNameFromCardName(card.name));
  let usedSubjectTag = false;
  let removedMetadataOrGeneric = false;

  const semantic_tags = [];
  const quality_flag_details = [];
  for (const tag of normalizedTags) {
    const key = tagKey(tag);
    if (!key) continue;

    if (subjectKey && key === subjectKey && !usedSubjectTag) {
      semantic_tags.push(tag);
      usedSubjectTag = true;
      continue;
    }

    if (GENERIC_OR_NON_VISUAL_TAGS.has(key) || metadataKeys.has(key) || key === tagKey(card.name)) {
      removedMetadataOrGeneric = true;
      quality_flag_details.push({
        flag: "semantic_tags_metadata_or_generic_removed",
        matched_text: tag,
        field: "semantic_tags",
      });
      continue;
    }

    semantic_tags.push(tag);
  }

  const quality_flags = [];
  if (removedMetadataOrGeneric) quality_flags.push("semantic_tags_metadata_or_generic_removed");
  if (semantic_tags.length < 3) quality_flags.push("semantic_tags_too_sparse_after_sanitization");

  return {
    semantic_tags: uniqueSorted(semantic_tags),
    quality_flags,
    quality_flag_details: uniqueQualityFlagDetails(quality_flag_details),
  };
}

function parseCommaList(value) {
  return uniqueSorted(String(value ?? "").split(","));
}

function parseOrderedCommaList(value) {
  return uniquePreserving(String(value ?? "").split(","));
}

function defaultBranchTargetsV1(limit) {
  const normalizedLimit = asPositiveInt(limit, DEFAULT_LIMIT, "branch target limit");
  const base = Math.floor(normalizedLimit / BRANCH_STRATIFIED_BRANCHES.length);
  let remainder = normalizedLimit % BRANCH_STRATIFIED_BRANCHES.length;
  const targets = {};
  for (const branch of BRANCH_STRATIFIED_BRANCHES) {
    targets[branch] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
  }
  return targets;
}

function parseBranchTargetsV1(value, limit) {
  const raw = normalizeText(value);
  if (!raw) return defaultBranchTargetsV1(limit);

  const targets = Object.fromEntries(BRANCH_STRATIFIED_BRANCHES.map((branch) => [branch, 0]));
  const allowed = new Set(BRANCH_STRATIFIED_BRANCHES);
  for (const part of parseOrderedCommaList(raw)) {
    const [rawBranch, rawCount, ...extra] = part.split(":");
    const branch = normalizeText(rawBranch);
    if (!branch || rawCount === undefined || extra.length > 0) {
      throw new Error("[card-visual-description-agent] branch targets must use branch:count entries");
    }
    if (!allowed.has(branch)) {
      throw new Error(`[card-visual-description-agent] unsupported branch target: ${branch}`);
    }
    targets[branch] = asNonnegativeInt(rawCount, null, `branch target ${branch}`);
  }
  return targets;
}

function totalBranchTargets(targets) {
  return Object.values(targets ?? {}).reduce((sum, value) => sum + Number(value ?? 0), 0);
}

export function selectBranchStratifiedCardsV1(rows, branchTargets) {
  const selected = [];
  const selectedRows = new Set();
  for (const branch of BRANCH_STRATIFIED_BRANCHES) {
    const target = Number(branchTargets?.[branch] ?? 0);
    if (target < 1) continue;
    let picked = 0;
    for (const row of rows) {
      if (selectedRows.has(row)) continue;
      if (resolveCardPromptMetadata(row).prompt_branch !== branch) continue;
      selectedRows.add(row);
      selected.push(row);
      picked += 1;
      if (picked >= target) break;
    }
  }
  return selected;
}

function roundUsd(value) {
  if (value === null || value === undefined) return null;
  return Number(Number(value).toFixed(8));
}

function divideMetric(value, divisor) {
  if (!divisor) return null;
  return Number((Number(value) / divisor).toFixed(4));
}

function normalizeTextOrUnknown(value) {
  return normalizeText(value) || "unknown";
}

function normalizeStringArray(value) {
  return Array.isArray(value) ? uniqueSorted(value) : [];
}

function isNullishLabel(value) {
  return /^(unknown|none|no issues|n\/a|na|not applicable)$/i.test(normalizeText(value));
}

function normalizeSurfaceCues(value) {
  const text = normalizeText(value);
  if (!text || isNullishLabel(text)) {
    return "No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are visible enough to describe from this scan.";
  }
  if (text.length < 40) {
    return `${text} No reliable additional card-surface, foil, texture, glare, border, or printing-treatment cues are visible enough to describe from this scan.`;
  }
  return text;
}

function normalizeQualityFlags(value) {
  return normalizeStringArray(value).filter((flag) => {
    const normalized = flag.toLowerCase();
    return !isNullishLabel(flag) && !NON_PROBLEM_QUALITY_FLAGS.has(normalized);
  });
}

function normalizeVisualAttributesV1(value) {
  const attributes = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const subjects = attributes.subjects && typeof attributes.subjects === "object" && !Array.isArray(attributes.subjects)
    ? attributes.subjects
    : {};
  const environment = attributes.environment && typeof attributes.environment === "object" && !Array.isArray(attributes.environment)
    ? attributes.environment
    : {};
  const palette = attributes.palette && typeof attributes.palette === "object" && !Array.isArray(attributes.palette)
    ? attributes.palette
    : {};
  const composition = attributes.composition && typeof attributes.composition === "object" && !Array.isArray(attributes.composition)
    ? attributes.composition
    : {};

  return {
    subjects: {
      primary: normalizeStringArray(subjects.primary),
      secondary: normalizeStringArray(subjects.secondary),
    },
    environment: {
      setting: normalizeStringArray(environment.setting),
      time_of_day: normalizeTextOrUnknown(environment.time_of_day),
      weather: normalizeTextOrUnknown(environment.weather),
    },
    palette: {
      dominant: normalizeStringArray(palette.dominant),
      temperature: normalizeTextOrUnknown(palette.temperature),
    },
    lighting: normalizeStringArray(attributes.lighting),
    mood: normalizeStringArray(attributes.mood),
    composition: {
      framing: normalizeTextOrUnknown(composition.framing),
      subject_position: normalizeTextOrUnknown(composition.subject_position),
    },
    style: normalizeStringArray(attributes.style),
    distinguishing_details: normalizeStringArray(attributes.distinguishing_details),
    uncertainty_notes: normalizeStringArray(attributes.uncertainty_notes),
  };
}

export function parseCardVisualDescriptionArgsV1(argv = []) {
  const parsed = {
    mode: "dry_run",
    limit: DEFAULT_LIMIT,
    outDir: DEFAULT_OUT_DIR,
    provider: process.env.CARD_VISUAL_DESCRIPTION_MODEL_PROVIDER || "fixture",
    modelVersion: process.env.CARD_VISUAL_DESCRIPTION_MODEL_VERSION || null,
    promptVersion: CARD_VISUAL_DESCRIPTION_PROMPT_VERSION,
    outputSchemaVersion: CARD_VISUAL_DESCRIPTION_OUTPUT_SCHEMA_VERSION,
    agentVersion: CARD_VISUAL_DESCRIPTION_AGENT_VERSION,
    minWidth: DEFAULT_MIN_WIDTH,
    minHeight: DEFAULT_MIN_HEIGHT,
    maxImageBytes: DEFAULT_MAX_IMAGE_BYTES,
    placeholderHashes: parseCommaList(process.env.CARD_VISUAL_DESCRIPTION_PLACEHOLDER_HASHES),
    imageDetail: normalizeText(process.env.CARD_VISUAL_DESCRIPTION_IMAGE_DETAIL) || DEFAULT_IMAGE_DETAIL,
    maxRetries: asNonnegativeInt(process.env.CARD_VISUAL_DESCRIPTION_OPENAI_MAX_RETRIES, DEFAULT_MAX_RETRIES, "CARD_VISUAL_DESCRIPTION_OPENAI_MAX_RETRIES"),
    maxRunCostUsd: asNumber(process.env.CARD_VISUAL_DESCRIPTION_MAX_RUN_COST_USD ?? process.env.OPENAI_MAX_RUN_COST_USD, null, "CARD_VISUAL_DESCRIPTION_MAX_RUN_COST_USD"),
    maxCards: asNonnegativeInt(process.env.CARD_VISUAL_DESCRIPTION_MAX_CARDS, null, "CARD_VISUAL_DESCRIPTION_MAX_CARDS"),
    openaiInputCostPerMillion: asNumber(process.env.OPENAI_INPUT_COST_PER_MILLION, null, "OPENAI_INPUT_COST_PER_MILLION"),
    openaiOutputCostPerMillion: asNumber(process.env.OPENAI_OUTPUT_COST_PER_MILLION, null, "OPENAI_OUTPUT_COST_PER_MILLION"),
    openaiCachedInputCostPerMillion: asNumber(process.env.OPENAI_CACHED_INPUT_COST_PER_MILLION, null, "OPENAI_CACHED_INPUT_COST_PER_MILLION"),
    openaiImageCostRuleVersion: normalizeText(process.env.OPENAI_IMAGE_COST_RULE_VERSION) || null,
    cardPrintId: normalizeText(process.env.CARD_VISUAL_DESCRIPTION_CARD_PRINT_ID) || null,
    cardPrintIds: parseOrderedCommaList(process.env.CARD_VISUAL_DESCRIPTION_CARD_PRINT_IDS),
    gvId: normalizeText(process.env.CARD_VISUAL_DESCRIPTION_GV_ID) || null,
    branchStratifiedSample: asBoolean(process.env.CARD_VISUAL_DESCRIPTION_BRANCH_STRATIFIED_SAMPLE, false, "CARD_VISUAL_DESCRIPTION_BRANCH_STRATIFIED_SAMPLE"),
    branchTargetsSpec: normalizeText(process.env.CARD_VISUAL_DESCRIPTION_BRANCH_TARGETS),
    branchTargets: null,
    branchCandidateLimit: asPositiveInt(process.env.CARD_VISUAL_DESCRIPTION_BRANCH_CANDIDATE_LIMIT, null, "CARD_VISUAL_DESCRIPTION_BRANCH_CANDIDATE_LIMIT"),
    forceVersion: false,
    allowFixtureApply: false,
  };

  let explicitMode = null;
  for (const arg of argv) {
    if (arg === "--plan") explicitMode = "plan";
    else if (arg === "--dry-run") explicitMode = "dry_run";
    else if (arg === "--apply") explicitMode = "apply";
    else if (arg === "--force-version") parsed.forceVersion = true;
    else if (arg === "--allow-fixture-apply") parsed.allowFixtureApply = true;
    else if (arg.startsWith("--limit=")) parsed.limit = asPositiveInt(arg.slice("--limit=".length), DEFAULT_LIMIT, "--limit");
    else if (arg.startsWith("--out-dir=")) parsed.outDir = path.resolve(arg.slice("--out-dir=".length));
    else if (arg.startsWith("--provider=")) parsed.provider = normalizeText(arg.slice("--provider=".length)).toLowerCase();
    else if (arg.startsWith("--model=")) parsed.modelVersion = normalizeText(arg.slice("--model=".length));
    else if (arg.startsWith("--model-version=")) parsed.modelVersion = normalizeText(arg.slice("--model-version=".length));
    else if (arg.startsWith("--prompt-version=")) parsed.promptVersion = normalizeText(arg.slice("--prompt-version=".length));
    else if (arg.startsWith("--output-schema-version=")) parsed.outputSchemaVersion = normalizeText(arg.slice("--output-schema-version=".length));
    else if (arg.startsWith("--agent-version=")) parsed.agentVersion = normalizeText(arg.slice("--agent-version=".length));
    else if (arg.startsWith("--card-print-id=")) parsed.cardPrintId = normalizeText(arg.slice("--card-print-id=".length)) || null;
    else if (arg.startsWith("--card-print-ids=")) parsed.cardPrintIds = parseOrderedCommaList(arg.slice("--card-print-ids=".length));
    else if (arg.startsWith("--gv-id=")) parsed.gvId = normalizeText(arg.slice("--gv-id=".length)) || null;
    else if (arg === "--branch-stratified-sample") parsed.branchStratifiedSample = true;
    else if (arg.startsWith("--branch-targets=")) parsed.branchTargetsSpec = normalizeText(arg.slice("--branch-targets=".length));
    else if (arg.startsWith("--branch-candidate-limit=")) parsed.branchCandidateLimit = asPositiveInt(arg.slice("--branch-candidate-limit=".length), null, "--branch-candidate-limit");
    else if (arg.startsWith("--min-width=")) parsed.minWidth = asPositiveInt(arg.slice("--min-width=".length), DEFAULT_MIN_WIDTH, "--min-width");
    else if (arg.startsWith("--min-height=")) parsed.minHeight = asPositiveInt(arg.slice("--min-height=".length), DEFAULT_MIN_HEIGHT, "--min-height");
    else if (arg.startsWith("--max-image-bytes=")) parsed.maxImageBytes = asPositiveInt(arg.slice("--max-image-bytes=".length), DEFAULT_MAX_IMAGE_BYTES, "--max-image-bytes");
    else if (arg.startsWith("--placeholder-hashes=")) parsed.placeholderHashes = parseCommaList(arg.slice("--placeholder-hashes=".length));
    else if (arg.startsWith("--image-detail=")) parsed.imageDetail = normalizeText(arg.slice("--image-detail=".length)).toLowerCase();
    else if (arg.startsWith("--max-retries=")) parsed.maxRetries = asNonnegativeInt(arg.slice("--max-retries=".length), DEFAULT_MAX_RETRIES, "--max-retries");
    else if (arg.startsWith("--max-run-cost-usd=")) parsed.maxRunCostUsd = asNumber(arg.slice("--max-run-cost-usd=".length), null, "--max-run-cost-usd");
    else if (arg.startsWith("--max-cards=")) parsed.maxCards = asNonnegativeInt(arg.slice("--max-cards=".length), null, "--max-cards");
    else if (arg.startsWith("--openai-input-cost-per-million=")) parsed.openaiInputCostPerMillion = asNumber(arg.slice("--openai-input-cost-per-million=".length), null, "--openai-input-cost-per-million");
    else if (arg.startsWith("--openai-output-cost-per-million=")) parsed.openaiOutputCostPerMillion = asNumber(arg.slice("--openai-output-cost-per-million=".length), null, "--openai-output-cost-per-million");
    else if (arg.startsWith("--openai-cached-input-cost-per-million=")) parsed.openaiCachedInputCostPerMillion = asNumber(arg.slice("--openai-cached-input-cost-per-million=".length), null, "--openai-cached-input-cost-per-million");
    else if (arg.startsWith("--image-cost-rule-version=")) parsed.openaiImageCostRuleVersion = normalizeText(arg.slice("--image-cost-rule-version=".length)) || null;
    else {
      throw new Error(`[card-visual-description-agent] unknown argument: ${arg}`);
    }
  }

  if (explicitMode) parsed.mode = explicitMode;
  if (!["plan", "dry_run", "apply"].includes(parsed.mode)) {
    throw new Error(`[card-visual-description-agent] unsupported mode: ${parsed.mode}`);
  }
  if (!["fixture", "openai"].includes(parsed.provider)) {
    throw new Error(`[card-visual-description-agent] unsupported provider: ${parsed.provider}`);
  }
  if (!["low", "high", "original", "auto"].includes(parsed.imageDetail)) {
    throw new Error("[card-visual-description-agent] --image-detail must be low, high, original, or auto");
  }
  if (parsed.provider === "fixture" && !parsed.modelVersion) {
    parsed.modelVersion = CARD_VISUAL_DESCRIPTION_DEFAULT_MODEL_VERSION;
  }
  if (parsed.provider === "openai" && !parsed.modelVersion) {
    throw new Error("[card-visual-description-agent] --model or CARD_VISUAL_DESCRIPTION_MODEL_VERSION is required for provider=openai");
  }
  if (parsed.mode === "apply" && parsed.provider === "fixture" && !parsed.allowFixtureApply) {
    throw new Error("[card-visual-description-agent] refusing to apply fixture descriptions without --allow-fixture-apply");
  }
  if (parsed.branchStratifiedSample && (parsed.cardPrintId || parsed.cardPrintIds.length > 0 || parsed.gvId)) {
    throw new Error("[card-visual-description-agent] branch-stratified sampling cannot be combined with explicit card targets");
  }
  parsed.branchTargets = parseBranchTargetsV1(parsed.branchTargetsSpec, parsed.limit);
  if (parsed.branchStratifiedSample && totalBranchTargets(parsed.branchTargets) < 1) {
    throw new Error("[card-visual-description-agent] branch-stratified sampling requires at least one branch target");
  }
  if (parsed.branchStratifiedSample && !parsed.branchCandidateLimit) {
    parsed.branchCandidateLimit = Math.max(parsed.limit * 200, DEFAULT_BRANCH_STRATIFIED_CANDIDATE_LIMIT);
  }

  return parsed;
}

function rowText(row, key) {
  return normalizeText(row[key]);
}

function normalizeLowerOrNull(value) {
  const normalized = normalizeText(value).toLowerCase();
  return normalized || null;
}

function isIdentityCardImageSource(value) {
  return normalizeLowerOrNull(value) === "identity";
}

function normalizeWarehouseCanonImagePath(value) {
  const normalized = normalizeText(value).replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.length > 512 ||
    normalized.includes("..") ||
    !WAREHOUSE_CANON_IMAGE_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  ) {
    return null;
  }
  return normalized;
}

function warehouseCanonImagePathFromPublicStorageUrl(value) {
  const raw = normalizeText(value);
  if (!/^https?:\/\//i.test(raw)) return null;
  try {
    const url = new URL(raw);
    const prefix = `/storage/v1/object/public/${CANON_IMAGE_STORAGE_BUCKET}/`;
    const pathname = decodeURIComponent(url.pathname);
    if (!pathname.startsWith(prefix)) return null;
    return normalizeWarehouseCanonImagePath(pathname.slice(prefix.length));
  } catch {
    return null;
  }
}

function tcgdexHighImageUrl(value) {
  const url = normalizeText(value).replace(/\/+$/, "");
  if (!/^https:\/\/assets\.tcgdex\.net\//i.test(url)) return null;
  if (/\.(?:avif|webp|png|jpe?g)(?:\?.*)?$/i.test(url)) return null;
  if (/\/high$/i.test(url)) return `${url}.webp`;
  return `${url}/high.webp`;
}

function resolveImageCandidates(row) {
  const rawCandidates = [
    ["image_path", rowText(row, "image_path")],
    ["image_url", rowText(row, "image_url")],
    ["representative_image_url", rowText(row, "representative_image_url")],
    ["image_alt_url", rowText(row, "image_alt_url")],
  ].filter(([, value]) => value);

  if (rawCandidates.length === 0) {
    return { ok: false, reason: "missing_image" };
  }

  const candidates = [];
  let unsupportedNonHttp = null;
  const seenUrls = new Set();
  const seenStoragePaths = new Set();
  const canUseCanonicalStorage = isIdentityCardImageSource(row.image_source);
  for (const [field, value] of rawCandidates) {
    const storagePath = canUseCanonicalStorage
      ? (normalizeWarehouseCanonImagePath(value) ?? warehouseCanonImagePathFromPublicStorageUrl(value))
      : null;
    if (storagePath && !seenStoragePaths.has(storagePath)) {
      seenStoragePaths.add(storagePath);
      candidates.push({
        kind: "storage",
        image_source: field,
        image_source_key: value,
        storage_bucket: CANON_IMAGE_STORAGE_BUCKET,
        storage_path: storagePath,
      });
    }

    if (!/^https?:\/\//i.test(value)) {
      if (!storagePath) unsupportedNonHttp ??= { field, value };
      continue;
    }
    for (const url of [value, tcgdexHighImageUrl(value)].filter(Boolean)) {
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
      candidates.push({
        kind: "http",
        image_source: field,
        image_source_key: value,
        url,
      });
    }
  }

  if (candidates.length === 0 && unsupportedNonHttp) {
    return {
      ok: false,
      reason: "unsupported_non_http_image_path",
      image_source: unsupportedNonHttp.field,
      image_source_key: unsupportedNonHttp.value,
    };
  }

  if (candidates.length === 0) return { ok: false, reason: "missing_supported_image_candidate" };

  return { ok: true, candidates };
}

function detectPngDimensions(buffer) {
  if (buffer.length < 24) return null;
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  return {
    mime: "image/png",
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function detectJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf
    ) {
      return {
        mime: "image/jpeg",
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}

function readUint24LE(buffer, offset) {
  return buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16);
}

function detectWebpDimensions(buffer) {
  if (buffer.length < 30) return null;
  if (buffer.subarray(0, 4).toString("ascii") !== "RIFF") return null;
  if (buffer.subarray(8, 12).toString("ascii") !== "WEBP") return null;
  const chunk = buffer.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X" && buffer.length >= 30) {
    return {
      mime: "image/webp",
      width: readUint24LE(buffer, 24) + 1,
      height: readUint24LE(buffer, 27) + 1,
    };
  }
  if (chunk === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return {
      mime: "image/webp",
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  if (chunk === "VP8 " && buffer.length >= 30 && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
    return {
      mime: "image/webp",
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  return { mime: "image/webp", width: null, height: null };
}

function detectImageMetadata(buffer, contentType) {
  const detected = detectPngDimensions(buffer) ?? detectJpegDimensions(buffer) ?? detectWebpDimensions(buffer);
  if (detected) return detected;
  const mime = normalizeText(contentType).split(";")[0].toLowerCase();
  return { mime: mime || "application/octet-stream", width: null, height: null };
}

function formatFetchError(error) {
  const parts = [error.message];
  if (error.cause?.code) parts.push(error.cause.code);
  if (error.cause?.message && error.cause.message !== error.message) parts.push(error.cause.message);
  return parts.filter(Boolean).join(": ");
}

async function fetchHttpImageBytes(candidate, args) {
  let response;
  try {
    response = await fetch(candidate.url, {
      headers: {
        "user-agent": "Grookai-Card-Visual-Description-Agent/1.0",
        accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
      },
    });
  } catch (error) {
    return {
      ok: false,
      reason: "image_fetch_failed",
      error: formatFetchError(error),
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      reason: `image_http_${response.status}`,
      error: response.statusText,
    };
  }
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > args.maxImageBytes) {
    return { ok: false, reason: "image_too_large", contentLength };
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length > args.maxImageBytes) {
    return { ok: false, reason: "image_too_large", contentLength: buffer.length };
  }
  if (buffer.length === 0) {
    return { ok: false, reason: "empty_image" };
  }
  return {
    ok: true,
    buffer,
    contentType: response.headers.get("content-type") ?? "",
  };
}

async function fetchStorageImageBytes(candidate, args) {
  const client = await createSupabaseStorageClient();
  if (!client) {
    return {
      ok: false,
      reason: "image_storage_not_configured",
      error: "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const { data, error } = await client.storage
    .from(candidate.storage_bucket)
    .download(candidate.storage_path);

  if (error || !data) {
    return {
      ok: false,
      reason: "image_storage_download_failed",
      error: error?.message ?? "Storage object unavailable.",
    };
  }

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length > args.maxImageBytes) {
    return { ok: false, reason: "image_too_large", contentLength: buffer.length };
  }
  if (buffer.length === 0) {
    return { ok: false, reason: "empty_image" };
  }

  return {
    ok: true,
    buffer,
    contentType: data.type ?? "",
  };
}

async function fetchImageBytes(candidate, args) {
  if (candidate.kind === "storage") return fetchStorageImageBytes(candidate, args);
  return fetchHttpImageBytes(candidate, args);
}

async function validateImageForModel(row, args) {
  const resolved = resolveImageCandidates(row);
  if (!resolved.ok) {
    return {
      ok: false,
      card_print_id: row.card_print_id,
      reason: resolved.reason,
      image_source: resolved.image_source ?? null,
      image_source_key: resolved.image_source_key ?? null,
    };
  }

  const failures = [];
  for (const candidate of resolved.candidates) {
    const fetched = await fetchImageBytes(candidate, args);
    if (!fetched.ok) {
      failures.push({
        reason: fetched.reason,
        error: fetched.error ?? null,
        image_source: candidate.image_source,
        image_source_key: candidate.image_source_key,
        attempted_url: candidate.url ?? null,
        attempted_storage_bucket: candidate.storage_bucket ?? null,
        attempted_storage_path: candidate.storage_path ?? null,
      });
      continue;
    }

    const hash = sha256(fetched.buffer);
    const metadata = detectImageMetadata(fetched.buffer, fetched.contentType);
    const qualityFlags = [];
    if (!ALLOWED_MIME_TYPES.has(metadata.mime)) qualityFlags.push("unsupported_format");
    if (args.placeholderHashes.includes(hash)) qualityFlags.push("placeholder_image");
    if (metadata.width !== null && metadata.width < args.minWidth) qualityFlags.push("low_resolution");
    if (metadata.height !== null && metadata.height < args.minHeight) qualityFlags.push("low_resolution");
    if (metadata.width === null || metadata.height === null) qualityFlags.push("image_dimensions_unknown");

    if (qualityFlags.some((flag) => ["unsupported_format", "placeholder_image"].includes(flag))) {
      failures.push({
        reason: qualityFlags[0],
        quality_flags: qualityFlags,
        image_source: candidate.image_source,
        image_source_key: candidate.image_source_key,
        attempted_url: candidate.url ?? null,
        attempted_storage_bucket: candidate.storage_bucket ?? null,
        attempted_storage_path: candidate.storage_path ?? null,
        image_sha256: hash,
        image_mime_type: metadata.mime,
        image_width: metadata.width,
        image_height: metadata.height,
      });
      continue;
    }

    return {
      ok: true,
      card_print_id: row.card_print_id,
      image_source: candidate.image_source,
      image_source_key: candidate.image_source_key,
      image_sha256: hash,
      image_mime_type: metadata.mime,
      image_width: metadata.width,
      image_height: metadata.height,
      image_quality_score: qualityFlags.length === 0 ? 0.92 : 0.68,
      quality_flags: qualityFlags,
      buffer: fetched.buffer,
    };
  }

  const lastFailure = failures.at(-1) ?? {};
  return {
    ok: false,
    card_print_id: row.card_print_id,
    reason: lastFailure.reason ?? "image_candidates_exhausted",
    error: lastFailure.error ?? null,
    quality_flags: lastFailure.quality_flags ?? [],
    image_source: lastFailure.image_source ?? null,
    image_source_key: lastFailure.image_source_key ?? null,
    image_sha256: lastFailure.image_sha256 ?? null,
    image_mime_type: lastFailure.image_mime_type ?? null,
    image_width: lastFailure.image_width ?? null,
    image_height: lastFailure.image_height ?? null,
  };
}

export function buildDescriptionVersionKeyV1({ card_print_id, image_sha256, prompt_version, output_schema_version, agent_version, model_version }) {
  return sha256(stableJson({
    card_print_id,
    image_sha256,
    prompt_version,
    output_schema_version,
    agent_version,
    model_version,
  }));
}

export function classifyDescriptionReviewStatusV1({
  quality_flags = [],
  identity_input_confidence,
  description_confidence,
  attribute_confidence,
  image_quality_score,
}) {
  if (
    quality_flags.length > 0 ||
    identity_input_confidence < 0.8 ||
    description_confidence < 0.78 ||
    attribute_confidence < 0.72 ||
    image_quality_score < 0.7
  ) {
    return "needs_review";
  }
  return "pending";
}

function zeroUsage() {
  return {
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    cached_input_tokens: 0,
    reasoning_output_tokens: 0,
  };
}

function normalizeResponseUsage(rawUsage) {
  if (!rawUsage || typeof rawUsage !== "object") return zeroUsage();
  const inputTokens = asNonnegativeInt(rawUsage.input_tokens, 0, "response.usage.input_tokens");
  const outputTokens = asNonnegativeInt(rawUsage.output_tokens, 0, "response.usage.output_tokens");
  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: asNonnegativeInt(rawUsage.total_tokens, inputTokens + outputTokens, "response.usage.total_tokens"),
    cached_input_tokens: asNonnegativeInt(rawUsage.input_tokens_details?.cached_tokens, 0, "response.usage.input_tokens_details.cached_tokens"),
    reasoning_output_tokens: asNonnegativeInt(rawUsage.output_tokens_details?.reasoning_tokens, 0, "response.usage.output_tokens_details.reasoning_tokens"),
  };
}

function buildPricingSnapshot(args, recordedAt) {
  return {
    input_per_million: args.openaiInputCostPerMillion,
    output_per_million: args.openaiOutputCostPerMillion,
    cached_input_per_million: args.openaiCachedInputCostPerMillion,
    image_cost_rule_version: args.openaiImageCostRuleVersion,
    recorded_at: recordedAt,
    source: "cli_or_environment",
    formula: "((input_tokens - cached_input_tokens) * input_per_million + cached_input_tokens * cached_input_per_million + output_tokens * output_per_million) / 1000000; if cached_input_per_million is null, cached input is priced at input_per_million; image costs are assumed to be represented in input_tokens under image_cost_rule_version.",
  };
}

function hasPricingRates(pricingSnapshot) {
  return Number.isFinite(Number(pricingSnapshot?.input_per_million))
    && Number.isFinite(Number(pricingSnapshot?.output_per_million));
}

function assertOpenAiPricingConfigured(args) {
  if (args.provider !== "openai" || args.mode === "plan") return;
  const missing = [];
  if (!Number.isFinite(Number(args.openaiInputCostPerMillion))) missing.push("OPENAI_INPUT_COST_PER_MILLION");
  if (!Number.isFinite(Number(args.openaiOutputCostPerMillion))) missing.push("OPENAI_OUTPUT_COST_PER_MILLION");
  if (missing.length > 0) {
    throw new Error(`[card-visual-description-agent] OpenAI dry-run/apply requires pricing configuration for cost telemetry: ${missing.join(", ")}`);
  }
}

export function estimateUsageCostUsd(usage, pricingSnapshot) {
  if (!hasPricingRates(pricingSnapshot)) return null;
  const normalized = usage ?? zeroUsage();
  const cachedTokens = Math.min(normalized.cached_input_tokens, normalized.input_tokens);
  const uncachedInputTokens = Math.max(normalized.input_tokens - cachedTokens, 0);
  const cachedInputRate = Number.isFinite(Number(pricingSnapshot.cached_input_per_million))
    ? Number(pricingSnapshot.cached_input_per_million)
    : Number(pricingSnapshot.input_per_million);
  const estimated =
    (uncachedInputTokens * Number(pricingSnapshot.input_per_million)
      + cachedTokens * cachedInputRate
      + normalized.output_tokens * Number(pricingSnapshot.output_per_million)) / 1_000_000;
  return roundUsd(estimated);
}

function telemetryForArtifact(telemetry = {}) {
  const usage = telemetry.usage ?? zeroUsage();
  return {
    response_model_version: telemetry.response_model_version ?? null,
    image_detail: telemetry.image_detail ?? null,
    request_count: telemetry.request_count ?? 0,
    retry_count: telemetry.retry_count ?? 0,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    total_tokens: usage.total_tokens,
    cached_input_tokens: usage.cached_input_tokens,
    reasoning_output_tokens: usage.reasoning_output_tokens,
    estimated_cost_usd: telemetry.estimated_cost_usd ?? 0,
  };
}

export function aggregateUsageRows(rows) {
  return rows.reduce((aggregate, row) => {
    aggregate.request_count += Number(row.request_count ?? 0);
    aggregate.retry_count += Number(row.retry_count ?? 0);
    aggregate.input_tokens += Number(row.input_tokens ?? 0);
    aggregate.output_tokens += Number(row.output_tokens ?? 0);
    aggregate.total_tokens += Number(row.total_tokens ?? 0);
    aggregate.cached_input_tokens += Number(row.cached_input_tokens ?? 0);
    aggregate.reasoning_output_tokens += Number(row.reasoning_output_tokens ?? 0);
    aggregate.estimated_cost_usd = roundUsd(Number(aggregate.estimated_cost_usd ?? 0) + Number(row.estimated_cost_usd ?? 0));
    return aggregate;
  }, {
    request_count: 0,
    retry_count: 0,
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    cached_input_tokens: 0,
    reasoning_output_tokens: 0,
    estimated_cost_usd: 0,
  });
}

function averageUsagePerValidatedDescription(aggregate, validatedCount) {
  return {
    request_count: divideMetric(aggregate.request_count, validatedCount),
    retry_count: divideMetric(aggregate.retry_count, validatedCount),
    input_tokens: divideMetric(aggregate.input_tokens, validatedCount),
    output_tokens: divideMetric(aggregate.output_tokens, validatedCount),
    total_tokens: divideMetric(aggregate.total_tokens, validatedCount),
    cached_input_tokens: divideMetric(aggregate.cached_input_tokens, validatedCount),
    reasoning_output_tokens: divideMetric(aggregate.reasoning_output_tokens, validatedCount),
    estimated_cost_usd: roundUsd(validatedCount ? aggregate.estimated_cost_usd / validatedCount : null),
  };
}

function countRowsByPromptBranch(rows) {
  const counts = {};
  for (const row of rows) {
    const branch = normalizeText(row.prompt_branch) || "unknown";
    counts[branch] = (counts[branch] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function qualityFlagCountsByPromptBranch(rows) {
  const counts = {};
  for (const row of rows) {
    const branch = normalizeText(row.prompt_branch) || "unknown";
    counts[branch] ??= {};
    for (const flag of row.quality_flags ?? []) {
      counts[branch][flag] = (counts[branch][flag] ?? 0) + 1;
    }
  }
  return Object.fromEntries(
    Object.entries(counts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([branch, flags]) => [
        branch,
        Object.fromEntries(Object.entries(flags).sort(([left], [right]) => left.localeCompare(right))),
      ]),
  );
}

function policyRuleCounts(rows) {
  const counts = {};
  for (const row of rows) {
    for (const result of row.policy_results ?? []) {
      const rule = normalizeText(result.policy_rule);
      if (!rule) continue;
      counts[rule] = (counts[rule] ?? 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function policyRuleCountsByPromptBranch(rows) {
  const counts = {};
  for (const row of rows) {
    const branch = normalizeText(row.prompt_branch) || "unknown";
    counts[branch] ??= {};
    for (const result of row.policy_results ?? []) {
      const rule = normalizeText(result.policy_rule);
      if (!rule) continue;
      counts[branch][rule] = (counts[branch][rule] ?? 0) + 1;
    }
  }
  return Object.fromEntries(
    Object.entries(counts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([branch, rules]) => [
        branch,
        Object.fromEntries(Object.entries(rules).sort(([left], [right]) => left.localeCompare(right))),
      ]),
  );
}

export function buildCostProjection({ aggregate, validatedCount, totalEligibleCatalogCount }) {
  const perCard = validatedCount ? roundUsd(aggregate.estimated_cost_usd / validatedCount) : null;
  return {
    estimated_cost_per_validated_card_usd: perCard,
    projected_500_cards_usd: perCard === null ? null : roundUsd(perCard * 500),
    projected_1000_cards_usd: perCard === null ? null : roundUsd(perCard * 1000),
    full_eligible_catalog_count: totalEligibleCatalogCount,
    projected_full_eligible_catalog_usd: perCard === null ? null : roundUsd(perCard * totalEligibleCatalogCount),
  };
}

export function evaluateStopBeforeNextCall(args, generatedRows, validationFailures) {
  const attemptedRows = [...generatedRows, ...validationFailures];
  const attemptedCount = attemptedRows.length;
  if (args.maxCards !== null && args.maxCards !== undefined && attemptedCount >= args.maxCards) {
    return {
      stopped_before_next_call: true,
      stop_reason: "max_cards_reached",
      attempted_count: attemptedCount,
      max_cards: args.maxCards,
    };
  }

  if (args.maxRunCostUsd === null || args.maxRunCostUsd === undefined) {
    return { stopped_before_next_call: false };
  }

  const aggregate = aggregateUsageRows(attemptedRows);
  const averageValidatedCost = generatedRows.length > 0
    ? roundUsd(aggregate.estimated_cost_usd / generatedRows.length)
    : null;
  if (aggregate.estimated_cost_usd >= args.maxRunCostUsd) {
    return {
      stopped_before_next_call: true,
      stop_reason: "max_run_cost_reached",
      current_estimated_cost_usd: aggregate.estimated_cost_usd,
      max_run_cost_usd: args.maxRunCostUsd,
    };
  }
  if (averageValidatedCost !== null && roundUsd(aggregate.estimated_cost_usd + averageValidatedCost) > args.maxRunCostUsd) {
    return {
      stopped_before_next_call: true,
      stop_reason: "projected_next_call_cost_exceeds_max_run_cost",
      current_estimated_cost_usd: aggregate.estimated_cost_usd,
      projected_next_call_cost_usd: averageValidatedCost,
      projected_after_next_call_usd: roundUsd(aggregate.estimated_cost_usd + averageValidatedCost),
      max_run_cost_usd: args.maxRunCostUsd,
    };
  }
  return {
    stopped_before_next_call: false,
    current_estimated_cost_usd: aggregate.estimated_cost_usd,
    projected_next_call_cost_usd: averageValidatedCost,
    max_run_cost_usd: args.maxRunCostUsd,
  };
}

export function validateVisualDescriptionPayloadV1(payload) {
  const findings = [];
  const artworkDescription = normalizeText(payload?.artwork_description);
  const cardSurfaceAndPrintingCues = normalizeSurfaceCues(payload?.card_surface_and_printing_cues);
  const visualAttributes = payload?.visual_attributes;
  const normalizedVisualAttributes = normalizeVisualAttributesV1(visualAttributes);
  const semanticTags = Array.isArray(payload?.semantic_tags) ? uniqueSorted(payload.semantic_tags) : [];
  const qualityFlags = normalizeQualityFlags(payload?.quality_flags);
  const descriptionConfidence = Number(payload?.description_confidence);
  const attributeConfidence = Number(payload?.attribute_confidence);

  if (artworkDescription.length < 80) findings.push("artwork_description_too_short");
  if (cardSurfaceAndPrintingCues.length < 40) findings.push("card_surface_and_printing_cues_too_short");
  if (!visualAttributes || typeof visualAttributes !== "object" || Array.isArray(visualAttributes)) {
    findings.push("visual_attributes_not_object");
  }
  if (semanticTags.length < 3) findings.push("semantic_tags_too_sparse");
  if (!Number.isFinite(descriptionConfidence) || descriptionConfidence < 0 || descriptionConfidence > 1) {
    findings.push("description_confidence_invalid");
  }
  if (!Number.isFinite(attributeConfidence) || attributeConfidence < 0 || attributeConfidence > 1) {
    findings.push("attribute_confidence_invalid");
  }

  return {
    ok: findings.length === 0,
    findings,
    normalized: {
      artwork_description: artworkDescription,
      card_surface_and_printing_cues: cardSurfaceAndPrintingCues,
      visual_attributes: normalizedVisualAttributes,
      semantic_tags: semanticTags,
      quality_flags: qualityFlags,
      description_confidence: descriptionConfidence,
      attribute_confidence: attributeConfidence,
    },
  };
}

export function buildEmbeddingInputV1(row) {
  const attributes = row.visual_attributes ?? {};
  const subjects = attributes.subjects ?? {};
  const environment = attributes.environment ?? {};
  const palette = attributes.palette ?? {};
  const mood = Array.isArray(attributes.mood) ? uniqueSorted(attributes.mood) : [];
  const tags = uniqueSorted(row.semantic_tags ?? []);

  return [
    "Artwork:",
    normalizeText(row.artwork_description),
    "",
    "Printing cues:",
    normalizeText(row.card_surface_and_printing_cues),
    "",
    "Subjects:",
    stableJson(subjects),
    "",
    "Setting:",
    stableJson(environment),
    "",
    "Palette:",
    stableJson(palette),
    "",
    "Mood:",
    mood.join(", "),
    "",
    "Tags:",
    tags.join(", "),
  ].join("\n");
}

const PROMPT_BRANCH_LABELS = Object.freeze({
  pokemon: "Branch 1 - Pokemon",
  trainer: "Branch 2 - Trainer",
  stadium: "Branch 3 - Stadium",
  energy: "Branch 4 - Energy",
  item_tool_supporter: "Branch 5 - Item / Tool / Supporter",
});

function promptBranchInstructions(branch) {
  switch (branch) {
    case "trainer":
      return [
        "Resolved branch instructions:",
        "Use Branch 2 - Trainer.",
        "Do NOT describe the trainer as a humanoid creature.",
        "Inside artwork_description, write two labeled prose layers in this order: Trainer: then Artwork:.",
        "Trainer: describe the visible human trainer or human character. Cover apparent age category only when visible, hair, clothing, face location, facial expression, posture, gesture, interaction with visible Pokemon or objects, and emotional tone grounded in visible pose and expression.",
        "Artwork: describe the environment, composition, lighting, movement, foreground, background, visible interactions, palette, mood, atmosphere, framing, and cropping.",
        "If no human trainer can be confidently identified, state that explicitly and describe only the visible scene or objects.",
      ];
    case "stadium":
      return [
        "Resolved branch instructions:",
        "Use Branch 3 - Stadium.",
        "No character section.",
        "Inside artwork_description, write two labeled prose layers in this order: Environment: then Artwork:.",
        "Environment: describe the visible place, foreground, midground, background, architecture, landscape, plants, objects, visual focal points, weather, and lighting.",
        "Artwork: describe composition, perspective, framing, depth, palette, mood, movement, and artwork-specific distinguishing details.",
        "Avoid inventing characters, Pokemon, crowds, activity, stars, magic, or a specific setting unless those details are clearly visible.",
      ];
    case "energy":
      return [
        "Resolved branch instructions:",
        "Use Branch 4 - Energy.",
        "Do NOT invent creatures.",
        "Inside artwork_description, write two labeled prose layers in this order: Symbolic Artwork: then Artwork:.",
        "Symbolic Artwork: describe the visible energy symbol, abstract forms, color fields, gradients, movement, repeated shapes, radiating lines, circular motifs, and lighting.",
        "Artwork: describe composition, framing, palette, mood, visual theme, focal point, and artwork-specific distinguishing details.",
        "Treat Energy cards as symbolic or abstract illustrations unless a concrete subject is visibly present. Use concrete terms such as central symbol, abstract forms, radiating lines, circular motif, soft gradients, and glowing highlights.",
      ];
    case "item_tool_supporter":
      return [
        "Resolved branch instructions:",
        "Use Branch 5 - Item / Tool / Supporter.",
        "Inside artwork_description, write two labeled prose layers in this order: Object/Scene: then Artwork:.",
        "Object/Scene: describe the actual visible object, tool, device, item, prop, or scene. If a Supporter card shows a human trainer, describe the visible person as a trainer rather than a creature.",
        "Artwork: describe environment, composition, lighting, movement, foreground, background, palette, mood, framing, and artwork-specific distinguishing details.",
        "Do not attempt to invent Pokemon unless a Pokemon is clearly visible.",
      ];
    case "pokemon":
    default:
      return [
        "Resolved branch instructions:",
        "Use Branch 1 - Pokemon.",
        "Inside artwork_description, write two labeled prose layers in this order: Character: then Artwork:.",
        "Character: describe the Pokemon as a living character for someone who has never seen this species before. Do not assume the Pokemon name communicates appearance.",
        "Character details must cover the overall creature type, real-world object, animal, plant, or concept resemblance, body structure, face location, eye placement, expression, posture, limbs, wings, tails, flames, and species-defining anatomy when visible.",
        "When visible, explicitly describe where the face, eyes, and defining species features are located. If they cannot be confidently identified, state that explicitly rather than implying they do not exist.",
        "Artwork: describe this specific illustration: pose, movement, composition, framing, cropping, foreground, background, environment, lighting, palette, mood, and atmosphere.",
        "Include artwork-specific distinguishing details that would help distinguish this card art from another artwork of the same Pokemon.",
      ];
  }
}

function buildPrompt(card) {
  const promptMetadata = resolveCardPromptMetadata(card);
  const expectedVisualSubjects = expectedVisualSubjectsFromCardName(card.name);
  const branchLabel = PROMPT_BRANCH_LABELS[promptMetadata.prompt_branch] ?? PROMPT_BRANCH_LABELS.pokemon;
  return [
    "# CARD_VISUAL_DESCRIPTION_PROMPT_V6",
    "## Card-Type Aware Visual Description System",
    `## Visual Language Contract: ${CARD_VISUAL_DESCRIPTION_VISUAL_LANGUAGE_VERSION}`,
    "",
    "Describe the artwork on this exact Pokemon Trading Card Game card for a blind collector.",
    "Use canonical card-type metadata before image interpretation so the description strategy matches the card type.",
    "The canonical metadata is only branch-selection context. Do not treat it as permission to describe details that are not visible.",
    "Do NOT use lore, flavor text, attacks, Pokedex entries, card mechanics, rarity, market data, or set metadata as visual evidence.",
    "Follow Grookai Visual Language V1: describe like a museum curator, accessibility specialist, and collector; do not write like a novelist, reviewer, or marketing writer.",
    "Use the same vocabulary for the same visible forms across cards. Prefer stable terms such as glass body, curved arms, rounded face, radiating lines, soft gradients, abstract forms, scattered light points, glowing highlights, central symbol, foreground, and background.",
    "Be grounded in visible evidence only. Do not invent hidden details.",
    "Inside artwork_description, write plain English prose only. Do not encode nested JSON, markdown, bullet lists, or key-value objects inside the string.",
    "A short label such as \"Character:\", \"Trainer:\", \"Environment:\", \"Symbolic Artwork:\", \"Object/Scene:\", or \"Artwork:\" is acceptable, but the content must remain readable prose.",
    "",
    "Canonical card-type metadata:",
    `- supertype: ${promptMetadata.supertype}`,
    `- subtype: ${promptMetadata.subtype}`,
    `- card_category: ${promptMetadata.card_category}`,
    `- pokemon_name: ${promptMetadata.pokemon_name}`,
    `- trainer_name: ${promptMetadata.trainer_name}`,
    `- expected_visible_subjects_from_name: ${expectedVisualSubjects.length ? expectedVisualSubjects.join(", ") : "unknown"}`,
    `- metadata_source: ${promptMetadata.card_type_metadata_source}`,
    `- resolved_prompt_branch: ${branchLabel}`,
    "",
    "Prompt branches available:",
    "Branch 1 - Pokemon: describe Character, Artwork, and Card Surface.",
    "Branch 2 - Trainer: describe visible human trainer details, then Artwork. Do NOT describe the trainer as a humanoid creature.",
    "Branch 3 - Stadium: describe Environment and Artwork. No character section.",
    "Branch 4 - Energy: describe Symbolic Artwork and Artwork. Do NOT invent creatures.",
    "Branch 5 - Item / Tool / Supporter: describe the actual object or scene, then Artwork.",
    "Use only the resolved prompt branch for this card.",
    "",
    ...promptBranchInstructions(promptMetadata.prompt_branch),
    "",
    "Shared observation rules:",
    "Observation hierarchy: first subject, then structure, pose, composition, environment, lighting, palette, and finally mood. Mood may summarize visible cues only after concrete observations.",
    "If a requested feature is not visible, say it is not visible or cannot be determined. Do not invent tails, wings, hands, facial expressions, Pokemon, objects, characters, weather, or emotions to satisfy the checklist.",
    "If the canonical name contains multiple Pokemon, such as a Tag Team or names separated by &, describe each visible Pokemon as a separate subject. Do not merge them into one hybrid creature unless the artwork literally shows a fused body.",
    "visual_attributes.subjects.primary should include each visible canonical Pokemon subject for multi-subject Pokemon cards. Use secondary for non-primary visible figures or objects.",
    "Do not describe a body part, attached ornament, limb, flame, weapon, accessory, or anatomical feature as a separate held object unless the image clearly shows it being held.",
    "Some Pokemon have object-like anatomy. If the subject resembles a chandelier, lamp, sword, shield, tool, mask, costume, or ornament, describe those forms as part of the subject unless a separate hand, grip, or physical separation is clearly visible.",
    "For Chandelure-family subjects, the round glass body, arms, branches, lamps, and flames are subject anatomy. Do not say it is holding an orb, sphere, chandelier, lamp, or flame.",
    "Do not assign a specific setting, location, weather, time of day, celestial theme, or architectural environment unless the image clearly proves it.",
    "Prefer objective visual observations over artistic interpretation. Describe what is visible, where it appears, and how it is arranged.",
    "Avoid speculative labels such as cosmic, celestial, magical, enchanted, mystical, dreamlike, portal, distant stars, energy, aura, or night sky unless directly visible. Prefer concrete wording such as dark gradients, scattered light points, abstract forms, layered shadows, soft gradients, radiating lines, and glowing highlights.",
    "Do not use the words magical, enchanted, enchanting, mystical, ethereal, dreamlike, stars, starry, dusk, or night for ambiguous backgrounds or light points. Use concrete wording such as scattered light points, white flowers, dark background, soft gradients, circular formation, or glowing highlights.",
    "For this visual-language pass, avoid these exact words in artwork_description, visual_attributes, and semantic_tags unless they name a literal visible object: magical, enchanted, enchanting, mystical, ethereal, dreamlike, dreamy, aura, twilight, fantasy, stars, starry, dusk, and night.",
    "Do not say scattered light points suggest stars, magic, energy, or an aura. Say scattered light points or glowing highlights unless the image clearly shows literal stars or energy effects.",
    "Avoid broad praise or marketing language such as beautiful, cool, epic, amazing, premium, cinematic, or iconic.",
    "Use uncertainty language only when needed for ambiguous backgrounds, reflective effects, glittering marks, or abstract environments.",
    "Include artwork-specific distinguishing details that would help distinguish this card art from another card of the same subject or card type.",
    "Separate the illustration from card frame, foil, border, or printing cues.",
    "For attributes that are not visible or cannot be determined from the scan, write \"unknown\" rather than an empty string.",
    "Do not infer holographic foil, texture, rarity treatment, or surface gloss unless it is directly visible in the image.",
    "For card_surface_and_printing_cues, do not write generic statements such as standard trading card borders. Only report reliable visible surface observations such as silver border visible, foil texture cannot be determined, embossing not visible, glare prevents determination, or printing treatment uncertain. If nothing meaningful can be determined, state that clearly.",
    "Do not say foil texture visible, glossy finish, gloss present, or standard print unless the scan directly proves that physical treatment. Prefer foil texture cannot be determined, printing treatment uncertain, or glare prevents determination.",
    "",
    "Semantic tag rules:",
    "semantic_tags must describe visible artwork only. Exclude set names, attacks, rarity labels, card mechanics, franchise names, and generic identity metadata already present in canonical fields.",
    "semantic_tags should help future semantic search.",
    "Pokemon tag examples: ghostly chandelier, purple flames, ornate, diagonal composition, glass lantern, dark palette, swirling wisps.",
    "Trainer tag examples: trainer portrait, running, laboratory, outdoor, confident expression.",
    "Stadium tag examples: forest, garden, library, castle, ruins, city, cave.",
    "Energy tag examples: psychic symbol, purple gradients, radiating lines, abstract energy, circular motif.",
    "Item / Tool / Supporter tag examples: visible object, handheld device, table scene, glowing tool, indoor setting.",
    "At most one semantic tag may repeat the primary visible subject name; all other tags should describe visible forms, colors, mood, composition, environment, or artwork-specific distinguishing details.",
    "quality_flags must contain only problems requiring review, such as low_resolution, blurred_image, cropped_subject, uncertain_subject, unsupported_format, or visible_text_uncertain. If there is no problem, return an empty array.",
    "Return JSON only using the requested schema.",
    "",
    "Canonical card context:",
    `- card_print_id: ${card.card_print_id}`,
    `- name: ${card.name}`,
    `- set: ${card.set_name || card.set_code || "unknown"}`,
    `- set_code: ${card.set_code || "unknown"}`,
    `- number: ${card.number || "unknown"}`,
    "",
    "The card context is identity context, not permission to describe details that are not visible.",
  ].join("\n");
}

function outputJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "artwork_description",
      "card_surface_and_printing_cues",
      "visual_attributes",
      "semantic_tags",
      "description_confidence",
      "attribute_confidence",
      "quality_flags",
    ],
    properties: {
      artwork_description: { type: "string" },
      card_surface_and_printing_cues: { type: "string" },
      visual_attributes: {
        type: "object",
        additionalProperties: false,
        required: [
          "subjects",
          "environment",
          "palette",
          "lighting",
          "mood",
          "composition",
          "style",
          "distinguishing_details",
          "uncertainty_notes",
        ],
        properties: {
          subjects: {
            type: "object",
            additionalProperties: false,
            required: ["primary", "secondary"],
            properties: {
              primary: { type: "array", items: { type: "string" } },
              secondary: { type: "array", items: { type: "string" } },
            },
          },
          environment: {
            type: "object",
            additionalProperties: false,
            required: ["setting", "time_of_day", "weather"],
            properties: {
              setting: { type: "array", items: { type: "string" } },
              time_of_day: { type: "string" },
              weather: { type: "string" },
            },
          },
          palette: {
            type: "object",
            additionalProperties: false,
            required: ["dominant", "temperature"],
            properties: {
              dominant: { type: "array", items: { type: "string" } },
              temperature: { type: "string" },
            },
          },
          lighting: { type: "array", items: { type: "string" } },
          mood: { type: "array", items: { type: "string" } },
          composition: {
            type: "object",
            additionalProperties: false,
            required: ["framing", "subject_position"],
            properties: {
              framing: { type: "string" },
              subject_position: { type: "string" },
            },
          },
          style: { type: "array", items: { type: "string" } },
          distinguishing_details: { type: "array", items: { type: "string" } },
          uncertainty_notes: { type: "array", items: { type: "string" } },
        },
      },
      semantic_tags: { type: "array", items: { type: "string" } },
      description_confidence: { type: "number", minimum: 0, maximum: 1 },
      attribute_confidence: { type: "number", minimum: 0, maximum: 1 },
      quality_flags: { type: "array", items: { type: "string" } },
    },
  };
}

function fixtureDescription(card) {
  const subject = card.name || "the card subject";
  return {
    artwork_description: [
      `${subject} is the primary subject of the card artwork. This fixture description is intentionally conservative and does not claim specific pose, setting, lighting, palette, or background details because no live vision model was called.`,
      "It exists to validate the agent pipeline, artifact writing, schema validation, review routing, and database write boundaries before production generation is enabled.",
    ].join(" "),
    card_surface_and_printing_cues: "Fixture mode does not inspect foil, border, texture, glare, rarity treatment, or card-frame details.",
    visual_attributes: {
      subjects: {
        primary: [subject],
        secondary: [],
      },
      environment: {
        setting: ["unknown"],
        time_of_day: "unknown",
        weather: "unknown",
      },
      palette: {
        dominant: [],
        temperature: "unknown",
      },
      lighting: ["unknown"],
      mood: ["unknown"],
      composition: {
        framing: "unknown",
        subject_position: "unknown",
      },
      style: ["unknown"],
      distinguishing_details: [],
      uncertainty_notes: ["fixture output; live image description not performed"],
    },
    semantic_tags: uniqueSorted([subject, card.set_code, "fixture", "needs-review"]),
    description_confidence: 0.42,
    attribute_confidence: 0.35,
    quality_flags: ["fixture_generated"],
  };
}

function fixtureTelemetry(args) {
  return {
    response_model_version: args.modelVersion,
    image_detail: args.imageDetail,
    request_count: 0,
    retry_count: 0,
    usage: zeroUsage(),
    estimated_cost_usd: 0,
  };
}

function isRetryableOpenAiStatus(status) {
  return [408, 409, 429, 500, 502, 503, 504].includes(status);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function openAiDescription(card, image, args) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("[card-visual-description-agent] OPENAI_API_KEY is required for provider=openai");
  }

  const body = {
    model: args.modelVersion,
    input: [{
      role: "user",
      content: [
        { type: "input_text", text: buildPrompt(card) },
        {
          type: "input_image",
          image_url: `data:${image.image_mime_type};base64,${image.buffer.toString("base64")}`,
          detail: args.imageDetail,
        },
      ],
    }],
    text: {
      format: {
        type: "json_schema",
        name: "card_visual_description_schema_v1",
        schema: outputJsonSchema(),
        strict: true,
      },
    },
  };

  let requestCount = 0;
  let retryCount = 0;
  for (let attempt = 0; attempt <= args.maxRetries; attempt += 1) {
    requestCount += 1;
    let response;
    let responseText = "";
    try {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      responseText = await response.text();
    } catch (error) {
      if (attempt < args.maxRetries) {
        retryCount += 1;
        await sleep(500 * (attempt + 1));
        continue;
      }
      const transportError = new Error(`[card-visual-description-agent] openai_fetch_failed: ${formatFetchError(error)}`);
      transportError.telemetry = {
        response_model_version: args.modelVersion,
        image_detail: args.imageDetail,
        request_count: requestCount,
        retry_count: retryCount,
        usage: zeroUsage(),
        estimated_cost_usd: 0,
      };
      throw transportError;
    }

    if (!response.ok) {
      if (isRetryableOpenAiStatus(response.status) && attempt < args.maxRetries) {
        retryCount += 1;
        await sleep(500 * (attempt + 1));
        continue;
      }
      const error = new Error(`[card-visual-description-agent] openai_http_${response.status}: ${responseText.slice(0, 500)}`);
      error.telemetry = {
        response_model_version: args.modelVersion,
        image_detail: args.imageDetail,
        request_count: requestCount,
        retry_count: retryCount,
        usage: zeroUsage(),
        estimated_cost_usd: 0,
      };
      throw error;
    }

    const parsed = JSON.parse(responseText);
    const outputText = parsed.output_text
      ?? parsed.output?.flatMap((item) => item.content ?? [])
        .map((content) => content.text ?? "")
        .join("")
      ?? "";
    if (!outputText.trim()) {
      const error = new Error("[card-visual-description-agent] openai_response_missing_output_text");
      error.telemetry = {
        response_model_version: parsed.model ?? args.modelVersion,
        image_detail: args.imageDetail,
        request_count: requestCount,
        retry_count: retryCount,
        usage: normalizeResponseUsage(parsed.usage),
        estimated_cost_usd: estimateUsageCostUsd(normalizeResponseUsage(parsed.usage), args.pricingSnapshot),
      };
      throw error;
    }

    const usage = normalizeResponseUsage(parsed.usage);
    return {
      payload: JSON.parse(outputText),
      telemetry: {
        response_model_version: parsed.model ?? args.modelVersion,
        image_detail: args.imageDetail,
        request_count: requestCount,
        retry_count: retryCount,
        usage,
        estimated_cost_usd: estimateUsageCostUsd(usage, args.pricingSnapshot) ?? 0,
      },
    };
  }

  throw new Error("[card-visual-description-agent] openai_retry_loop_exhausted");
}

async function generateDescription(card, image, args) {
  if (args.provider === "fixture") {
    return {
      payload: fixtureDescription(card),
      telemetry: fixtureTelemetry(args),
    };
  }
  if (args.provider === "openai") return openAiDescription(card, image, args);
  throw new Error(`[card-visual-description-agent] unsupported provider: ${args.provider}`);
}

function buildDescriptionRow(card, image, normalizedPayload, args, telemetry) {
  const promptMetadata = resolveCardPromptMetadata(card);
  const cardForVisualSanitization = {
    ...card,
    supertype: promptMetadata.supertype,
    subtype: promptMetadata.subtype,
    card_category: promptMetadata.card_category,
    prompt_branch: promptMetadata.prompt_branch,
    card_type_metadata_source: promptMetadata.card_type_metadata_source,
  };
  const semanticTagSanitization = sanitizeSemanticTagsForVisibleArtworkV1(normalizedPayload.semantic_tags, cardForVisualSanitization);
  const reviewFlagDetails = detectVisualDescriptionReviewFlagDetailsV1({
    ...normalizedPayload,
    semantic_tags: semanticTagSanitization.semantic_tags,
  }, cardForVisualSanitization);
  const policyResults = evaluateVisualDescriptionPolicyV1({
    ...normalizedPayload,
    semantic_tags: semanticTagSanitization.semantic_tags,
  }, cardForVisualSanitization);
  const reviewFlags = uniqueSorted(reviewFlagDetails.map((detail) => detail.flag));
  const qualityFlags = uniqueSorted([
    ...(image.quality_flags ?? []),
    ...(normalizedPayload.quality_flags ?? []),
    ...semanticTagSanitization.quality_flags,
    ...reviewFlags,
  ]);
  const qualityFlagDetails = uniqueQualityFlagDetails([
    ...(semanticTagSanitization.quality_flag_details ?? []),
    ...reviewFlagDetails,
  ]);
  const row = {
    card_print_id: card.card_print_id,
    image_source: image.image_source,
    image_source_key: image.image_source_key,
    image_sha256: image.image_sha256,
    image_width: image.image_width,
    image_height: image.image_height,
    image_mime_type: image.image_mime_type,
    prompt_version: args.promptVersion,
    output_schema_version: args.outputSchemaVersion,
    agent_version: args.agentVersion,
    model_version: args.modelVersion,
    prompt_branch: promptMetadata.prompt_branch,
    card_type_metadata_source: promptMetadata.card_type_metadata_source,
    card_supertype: promptMetadata.supertype,
    card_subtype: promptMetadata.subtype,
    card_category: promptMetadata.card_category,
    pokemon_name: promptMetadata.pokemon_name,
    trainer_name: promptMetadata.trainer_name,
    ...telemetryForArtifact(telemetry),
    artwork_description: normalizedPayload.artwork_description,
    card_surface_and_printing_cues: normalizedPayload.card_surface_and_printing_cues,
    visual_attributes: normalizedPayload.visual_attributes,
    semantic_tags: semanticTagSanitization.semantic_tags,
    identity_input_confidence: 0.95,
    description_confidence: normalizedPayload.description_confidence,
    attribute_confidence: normalizedPayload.attribute_confidence,
    image_quality_score: image.image_quality_score,
    quality_flags: qualityFlags,
    quality_flag_details: qualityFlagDetails,
    policy_results: policyResults,
  };
  row.review_status = classifyDescriptionReviewStatusV1(row);
  row.description_version_key = buildDescriptionVersionKeyV1(row);
  return row;
}

async function fetchEligibleCards(client, args) {
  const descriptionTableExists = await tableExists(client, "public", "card_print_visual_descriptions");
  if (args.mode === "apply" && !descriptionTableExists) {
    throw new Error("[card-visual-description-agent] apply requires card_print_visual_descriptions migration to be applied");
  }
  const traitTableExists = await tableExists(client, "public", "card_print_traits");

  const columns = await tableColumns(client, "public", "card_prints");
  const textColumn = (name) => columns.has(name) ? `cp.${name}` : "null::text";
  const setJoin = columns.has("set_id")
    ? "left join public.sets s on s.id = cp.set_id"
    : "";
  const setNameExpr = columns.has("set_id") ? "s.name" : "null::text";
  const imageExpressions = ["image_url", "representative_image_url", "image_alt_url", "image_path"]
    .filter((name) => columns.has(name))
    .map((name) => `nullif(btrim(cp.${name}), '')`);
  if (imageExpressions.length === 0) {
    return [];
  }

  const sourceCardPrintIdExpr = columns.has("external_ids")
    ? `(case
         when nullif(cp.external_ids #>> '{grookai,source_card_print_id}', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         then (cp.external_ids #>> '{grookai,source_card_print_id}')::uuid
         else null::uuid
       end)`
    : "null::uuid";
  const traitMetadataSelect = traitTableExists
    ? `nullif(btrim(exact_trait.supertype), '') as exact_supertype,
       nullif(btrim(exact_trait.card_category), '') as exact_card_category,
       nullif(btrim(source_trait.supertype), '') as source_supertype,
       nullif(btrim(source_trait.card_category), '') as source_card_category,
       nullif(btrim(same_name_trait.supertype), '') as same_name_supertype,
       nullif(btrim(same_name_trait.card_category), '') as same_name_card_category`
    : `null::text as exact_supertype,
       null::text as exact_card_category,
       null::text as source_supertype,
       null::text as source_card_category,
       null::text as same_name_supertype,
       null::text as same_name_card_category`;
  const traitMetadataJoin = traitTableExists
    ? `left join lateral (
         select t.supertype, t.card_category
         from public.card_print_traits t
         where t.card_print_id = cp.id
           and (nullif(btrim(t.supertype), '') is not null or nullif(btrim(t.card_category), '') is not null)
         order by
           case when nullif(btrim(t.card_category), '') is not null then 0 else 1 end,
           coalesce(t.confidence, 0) desc,
           t.id desc
         limit 1
       ) exact_trait on true
       left join lateral (
         select t.supertype, t.card_category
         from public.card_print_traits t
         where t.card_print_id = ${sourceCardPrintIdExpr}
           and (nullif(btrim(t.supertype), '') is not null or nullif(btrim(t.card_category), '') is not null)
         order by
           case when nullif(btrim(t.card_category), '') is not null then 0 else 1 end,
           coalesce(t.confidence, 0) desc,
           t.id desc
         limit 1
       ) source_trait on true
       left join lateral (
         select t.supertype, t.card_category
         from public.card_prints sibling
         join public.card_print_traits t on t.card_print_id = sibling.id
         where sibling.id <> cp.id
           and lower(sibling.name) = lower(cp.name)
           and (nullif(btrim(t.supertype), '') is not null or nullif(btrim(t.card_category), '') is not null)
         order by
           case when lower(nullif(btrim(t.card_category), '')) in ('stadium', 'supporter', 'item', 'pokemon tool', 'tool', 'basic', 'stage 1', 'stage 2', 'v', 'vmax', 'vstar') then 0 else 1 end,
           case when nullif(btrim(t.card_category), '') is not null then 0 else 1 end,
           coalesce(t.confidence, 0) desc,
           t.id desc
         limit 1
       ) same_name_trait on true`
    : "";

  const descriptionSelect = descriptionTableExists
    ? "current_desc.id::text as current_description_id, current_desc.review_status as current_review_status"
    : "null::text as current_description_id, null::text as current_review_status";
  const descriptionJoin = descriptionTableExists
    ? `left join lateral (
         select d.id, d.review_status
         from public.card_print_visual_descriptions d
         where d.card_print_id = cp.id
           and d.is_current is true
         order by d.created_at desc, d.id desc
         limit 1
       ) current_desc on true`
    : "";
  const orderExpr = columns.has("created_at")
    ? "cp.created_at desc nulls last, cp.id asc"
    : "cp.id asc";
  const queryLimit = args.branchStratifiedSample ? args.branchCandidateLimit : args.limit;
  const params = [queryLimit];
  const filters = [];
  let nextParam = 2;

  if (descriptionTableExists) {
    filters.push(`($${nextParam}::boolean is true or coalesce(current_desc.review_status, '') <> 'approved')`);
    params.push(args.forceVersion);
    nextParam += 1;
  }

  if (args.cardPrintId) {
    filters.push(`cp.id = $${nextParam}::uuid`);
    params.push(args.cardPrintId);
    nextParam += 1;
  }

  let explicitCardPrintIdsParam = null;
  if (args.cardPrintIds.length > 0) {
    explicitCardPrintIdsParam = nextParam;
    filters.push(`cp.id = any($${nextParam}::uuid[])`);
    params.push(args.cardPrintIds);
    nextParam += 1;
  }

  if (args.gvId) {
    if (!columns.has("gv_id")) return [];
    filters.push(`cp.gv_id = $${nextParam}`);
    params.push(args.gvId);
    nextParam += 1;
  }

  const result = await client.query(
    `select
       cp.id::text as card_print_id,
       count(*) over ()::integer as total_eligible_catalog_count,
       ${textColumn("gv_id")} as gv_id,
       cp.name,
       ${textColumn("set_code")} as set_code,
       ${textColumn("number")} as number,
       ${textColumn("image_url")} as image_url,
       ${textColumn("image_alt_url")} as image_alt_url,
       ${textColumn("representative_image_url")} as representative_image_url,
       ${textColumn("image_path")} as image_path,
       ${textColumn("image_source")} as image_source,
       ${textColumn("image_status")} as image_status,
       ${setNameExpr} as set_name,
       ${traitMetadataSelect},
       ${descriptionSelect}
     from public.card_prints cp
     ${setJoin}
     ${traitMetadataJoin}
     ${descriptionJoin}
     where coalesce(${imageExpressions.join(", ")}) is not null
       ${filters.map((filter) => `and ${filter}`).join("\n       ")}
      order by ${explicitCardPrintIdsParam ? `array_position($${explicitCardPrintIdsParam}::uuid[], cp.id), ` : ""}${orderExpr}
      limit $1`,
    params,
  );
  if (!args.branchStratifiedSample) return result.rows;
  return selectBranchStratifiedCardsV1(result.rows, args.branchTargets);
}

async function tableExists(client, schema, tableName) {
  const result = await client.query(
    `select to_regclass($1) is not null as exists`,
    [`${schema}.${tableName}`],
  );
  return result.rows[0]?.exists === true;
}

async function tableColumns(client, schema, tableName) {
  const result = await client.query(
    `select column_name
     from information_schema.columns
     where table_schema = $1
       and table_name = $2`,
    [schema, tableName],
  );
  return new Set(result.rows.map((row) => row.column_name));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeJsonl(filePath, rows) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  await fs.writeFile(filePath, body ? `${body}\n` : "");
}

async function hashFile(filePath) {
  return sha256(await fs.readFile(filePath));
}

async function writeRunArtifacts({ runDir, runPlan, eligibleCards, generatedRows, validationFailures, skippedImages, summary }) {
  const reviewSample = generatedRows
    .filter((row) => row.review_status === "pending" || row.review_status === "needs_review")
    .slice(0, REVIEW_SAMPLE_LIMIT);

  const files = {
    "run_plan.json": runPlan,
    "eligible_cards.jsonl": eligibleCards,
    "generated_outputs.jsonl": generatedRows,
    "validation_failures.jsonl": validationFailures,
    "skipped_images.jsonl": skippedImages,
    "review_sample.jsonl": reviewSample,
    "summary.json": summary,
  };

  const artifactHashes = {};
  for (const [name, value] of Object.entries(files)) {
    const filePath = path.join(runDir, name);
    if (name.endsWith(".jsonl")) await writeJsonl(filePath, value);
    else await writeJson(filePath, value);
    artifactHashes[name] = await hashFile(filePath);
  }
  return artifactHashes;
}

function compactCardForArtifact(row) {
  const promptMetadata = resolveCardPromptMetadata(row);
  return {
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    set_name: row.set_name,
    number: row.number,
    prompt_branch: promptMetadata.prompt_branch,
    card_type_metadata_source: promptMetadata.card_type_metadata_source,
    supertype: promptMetadata.supertype,
    subtype: promptMetadata.subtype,
    card_category: promptMetadata.card_category,
    pokemon_name: promptMetadata.pokemon_name,
    trainer_name: promptMetadata.trainer_name,
    image_source: row.image_source,
    image_status: row.image_status,
    current_description_id: row.current_description_id,
    current_review_status: row.current_review_status,
  };
}

async function insertApplyRows(client, { runPlan, summary, artifactHashes, runDir, generatedRows, args }) {
  await client.query("begin");
  try {
    const runResult = await client.query(
      `insert into public.card_visual_description_runs (
         run_key,
         mode,
         status,
         requested_limit,
         eligible_count,
         attempted_count,
         validated_count,
         failed_count,
         skipped_count,
         needs_review_count,
         prompt_version,
         output_schema_version,
         agent_version,
         model_version,
         response_model_version,
         response_model_versions,
         request_count,
         retry_count,
         input_tokens,
         output_tokens,
         total_tokens,
         cached_input_tokens,
         reasoning_output_tokens,
         estimated_cost_usd,
         pricing_snapshot,
         max_run_cost_usd,
         max_cards,
         stop_reason,
         artifact_directory,
         artifact_hashes,
         started_at,
         finished_at
       )
       values (
         $1, 'apply', 'running', $2, $3, $4, $5, $6, $7, $8,
         $9, $10, $11, $12,
         $13, $14::text[],
         $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb, $24, $25, $26,
         $27, $28::jsonb, $29, now()
       )
       on conflict (run_key) do update
       set
         status = excluded.status,
         requested_limit = excluded.requested_limit,
         eligible_count = excluded.eligible_count,
         attempted_count = excluded.attempted_count,
         validated_count = excluded.validated_count,
         failed_count = excluded.failed_count,
         skipped_count = excluded.skipped_count,
         needs_review_count = excluded.needs_review_count,
         request_count = excluded.request_count,
         retry_count = excluded.retry_count,
         response_model_version = excluded.response_model_version,
         response_model_versions = excluded.response_model_versions,
         input_tokens = excluded.input_tokens,
         output_tokens = excluded.output_tokens,
         total_tokens = excluded.total_tokens,
         cached_input_tokens = excluded.cached_input_tokens,
         reasoning_output_tokens = excluded.reasoning_output_tokens,
         estimated_cost_usd = excluded.estimated_cost_usd,
         pricing_snapshot = excluded.pricing_snapshot,
         max_run_cost_usd = excluded.max_run_cost_usd,
         max_cards = excluded.max_cards,
         stop_reason = excluded.stop_reason,
         artifact_directory = excluded.artifact_directory,
         artifact_hashes = excluded.artifact_hashes,
         finished_at = excluded.finished_at
       returning id`,
      [
        runPlan.run_key,
        args.limit,
        summary.eligible_count,
        summary.attempted_count,
        summary.validated_count,
        summary.failed_count,
        summary.skipped_count,
        summary.needs_review_count,
        args.promptVersion,
        args.outputSchemaVersion,
        args.agentVersion,
        args.modelVersion,
        summary.response_model_version,
        summary.response_model_versions,
        summary.usage.request_count,
        summary.usage.retry_count,
        summary.usage.input_tokens,
        summary.usage.output_tokens,
        summary.usage.total_tokens,
        summary.usage.cached_input_tokens,
        summary.usage.reasoning_output_tokens,
        summary.estimated_cost_usd,
        JSON.stringify(summary.pricing_snapshot),
        args.maxRunCostUsd,
        args.maxCards,
        summary.ceiling.stop_reason,
        path.relative(REPO_ROOT, runDir).replace(/\\/g, "/"),
        JSON.stringify(artifactHashes),
        runPlan.started_at,
      ],
    );
    const runId = runResult.rows[0].id;

    let insertedCount = 0;
    let applySkippedCount = 0;
    for (const row of generatedRows) {
      const current = await client.query(
        `select id, review_status
         from public.card_print_visual_descriptions
         where card_print_id = $1::uuid
           and is_current is true
         order by created_at desc, id desc
         limit 1
         for update`,
        [row.card_print_id],
      );
      const currentRow = current.rows[0] ?? null;
      if (currentRow?.review_status === "approved" && !args.forceVersion) {
        applySkippedCount += 1;
        continue;
      }

      const duplicate = await client.query(
        `select id
         from public.card_print_visual_descriptions
         where card_print_id = $1::uuid
           and image_sha256 = $2
           and prompt_version = $3
           and output_schema_version = $4
           and agent_version = $5
           and model_version = $6
         limit 1`,
        [row.card_print_id, row.image_sha256, row.prompt_version, row.output_schema_version, row.agent_version, row.model_version],
      );
      if (duplicate.rows.length > 0) {
        applySkippedCount += 1;
        continue;
      }

      const shouldBecomeCurrent = !currentRow || currentRow.review_status !== "approved";
      if (shouldBecomeCurrent && currentRow) {
        await client.query(
          `update public.card_print_visual_descriptions
           set is_current = false
           where id = $1::uuid`,
          [currentRow.id],
        );
      }

      await client.query(
        `insert into public.card_print_visual_descriptions (
           card_print_id,
           run_id,
           image_source,
           image_source_key,
           image_sha256,
           image_width,
           image_height,
           image_mime_type,
           prompt_version,
           output_schema_version,
           agent_version,
           model_version,
           response_model_version,
           image_detail,
           request_count,
           retry_count,
           input_tokens,
           output_tokens,
           total_tokens,
           cached_input_tokens,
           reasoning_output_tokens,
           estimated_cost_usd,
           artwork_description,
           card_surface_and_printing_cues,
           visual_attributes,
           semantic_tags,
           identity_input_confidence,
           description_confidence,
           attribute_confidence,
           image_quality_score,
           review_status,
           quality_flags,
           is_current,
           supersedes_description_id
         )
         values (
           $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
           $21, $22, $23, $24, $25::jsonb, $26::text[], $27, $28,
           $29, $30, $31, $32::text[], $33, $34::uuid
         )`,
        [
          row.card_print_id,
          runId,
          row.image_source,
          row.image_source_key,
          row.image_sha256,
          row.image_width,
          row.image_height,
          row.image_mime_type,
          row.prompt_version,
          row.output_schema_version,
          row.agent_version,
          row.model_version,
          row.response_model_version,
          row.image_detail,
          row.request_count,
          row.retry_count,
          row.input_tokens,
          row.output_tokens,
          row.total_tokens,
          row.cached_input_tokens,
          row.reasoning_output_tokens,
          row.estimated_cost_usd,
          row.artwork_description,
          row.card_surface_and_printing_cues,
          JSON.stringify(row.visual_attributes),
          row.semantic_tags,
          row.identity_input_confidence,
          row.description_confidence,
          row.attribute_confidence,
          row.image_quality_score,
          row.review_status,
          row.quality_flags,
          shouldBecomeCurrent,
          currentRow?.id ?? null,
        ],
      );
      insertedCount += 1;
    }

    await client.query(
      `update public.card_visual_description_runs
       set
         status = 'completed',
         error_summary = $2,
         finished_at = now()
       where id = $1::uuid`,
      [
        runId,
        applySkippedCount > 0 ? `apply_skipped_count=${applySkippedCount}` : null,
      ],
    );
    await client.query("commit");
    return { insertedCount, applySkippedCount };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

function buildSummary({
  args,
  eligibleCards,
  totalEligibleCatalogCount,
  generatedRows,
  validationFailures,
  skippedImages,
  startedAt,
  finishedAt,
  stopBeforeNextCall,
}) {
  const attemptedRows = [...generatedRows, ...validationFailures];
  const usage = aggregateUsageRows(attemptedRows);
  const responseModelVersions = uniqueSorted(attemptedRows.map((row) => row.response_model_version));
  const averageUsage = averageUsagePerValidatedDescription(usage, generatedRows.length);
  const projection = buildCostProjection({
    aggregate: usage,
    validatedCount: generatedRows.length,
    totalEligibleCatalogCount,
  });
  return {
    version: CARD_VISUAL_DESCRIPTION_AGENT_VERSION,
    mode: args.mode,
    provider: args.provider,
    model_version: args.modelVersion,
    response_model_version: responseModelVersions.length === 1 ? responseModelVersions[0] : null,
    response_model_versions: responseModelVersions,
    image_detail: args.imageDetail,
    prompt_version: args.promptVersion,
    output_schema_version: args.outputSchemaVersion,
    sample_strategy: args.branchStratifiedSample ? "branch_stratified" : "default_order",
    branch_targets: args.branchStratifiedSample ? args.branchTargets : null,
    branch_candidate_limit: args.branchStratifiedSample ? args.branchCandidateLimit : null,
    local_tls_certificate_verification_disabled: process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0",
    pricing_snapshot: args.pricingSnapshot,
    started_at: startedAt,
    finished_at: finishedAt,
    eligible_count: eligibleCards.length,
    total_eligible_catalog_count: totalEligibleCatalogCount,
    attempted_count: generatedRows.length + validationFailures.length,
    validated_count: generatedRows.length,
    failed_count: validationFailures.length,
    skipped_count: skippedImages.length,
    needs_review_count: generatedRows.filter((row) => row.review_status === "needs_review").length,
    pending_count: generatedRows.filter((row) => row.review_status === "pending").length,
    branch_counts: countRowsByPromptBranch(generatedRows),
    usage,
    average_usage_per_validated_description: averageUsage,
    estimated_cost_usd: usage.estimated_cost_usd,
    cost_projection: projection,
    ceiling: {
      max_cards: args.maxCards,
      max_run_cost_usd: args.maxRunCostUsd,
      stopped_before_next_call: Boolean(stopBeforeNextCall),
      stop_reason: stopBeforeNextCall?.stop_reason ?? null,
      stop_detail: stopBeforeNextCall,
    },
    quality_flag_counts: Object.fromEntries(
      Object.entries(generatedRows.flatMap((row) => row.quality_flags).reduce((counts, flag) => {
        counts[flag] = (counts[flag] ?? 0) + 1;
        return counts;
      }, {})).sort(([left], [right]) => left.localeCompare(right)),
    ),
    quality_flag_counts_by_branch: qualityFlagCountsByPromptBranch(generatedRows),
    policy_rule_counts: policyRuleCounts(generatedRows),
    policy_rule_counts_by_branch: policyRuleCountsByPromptBranch(generatedRows),
  };
}

export async function runCardVisualDescriptionAgentV1(rawArgs = []) {
  await loadEnvFilesIfAvailable();
  const args = parseCardVisualDescriptionArgsV1(rawArgs);
  assertOpenAiPricingConfigured(args);
  const conn = connectionString();
  if (!conn) {
    throw new Error("[card-visual-description-agent] Missing SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL.");
  }

  const startedAt = nowIso();
  args.pricingSnapshot = buildPricingSnapshot(args, startedAt);
  const runKey = sha256(stableJson({
    version: CARD_VISUAL_DESCRIPTION_AGENT_VERSION,
    started_at: startedAt,
    mode: args.mode,
    limit: args.limit,
    provider: args.provider,
    model_version: args.modelVersion,
    prompt_version: args.promptVersion,
    output_schema_version: args.outputSchemaVersion,
  }));
  const runDir = path.join(args.outDir, `${stampFromIso(startedAt)}_${args.mode}_${runKey.slice(0, 12)}`);
  const runPlan = {
    run_key: runKey,
    mode: args.mode,
    provider: args.provider,
    requested_limit: args.limit,
    max_cards: args.maxCards,
    max_run_cost_usd: args.maxRunCostUsd,
    prompt_version: args.promptVersion,
    output_schema_version: args.outputSchemaVersion,
    sample_strategy: args.branchStratifiedSample ? "branch_stratified" : "default_order",
    branch_targets: args.branchStratifiedSample ? args.branchTargets : null,
    branch_candidate_limit: args.branchStratifiedSample ? args.branchCandidateLimit : null,
    local_tls_certificate_verification_disabled: process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0",
    agent_version: args.agentVersion,
    model_version: args.modelVersion,
    image_detail: args.imageDetail,
    max_retries: args.maxRetries,
    pricing_snapshot: args.pricingSnapshot,
    force_version: args.forceVersion,
    target_card_print_id: args.cardPrintId,
    target_card_print_ids: args.cardPrintIds,
    target_gv_id: args.gvId,
    started_at: startedAt,
    boundary: {
      db_writes: args.mode === "apply",
      model_calls: args.mode !== "plan" && args.provider !== "fixture",
      fixture_generation: args.provider === "fixture",
      embeddings: false,
      card_prints_mutation: false,
    },
  };

  const client = await createPgClient({ connectionString: conn });
  await client.connect();
  try {
    const eligibleCards = await fetchEligibleCards(client, args);
    const totalEligibleCatalogCount = Number(eligibleCards[0]?.total_eligible_catalog_count ?? eligibleCards.length);
    const generatedRows = [];
    const validationFailures = [];
    const skippedImages = [];
    let stopBeforeNextCall = null;

    if (args.mode !== "plan") {
      for (const card of eligibleCards) {
        let image;
        let generationTelemetry = null;
        try {
          image = await validateImageForModel(card, args);
          if (!image.ok) {
            skippedImages.push({
              card_print_id: card.card_print_id,
              gv_id: card.gv_id,
              name: card.name,
              reason: image.reason,
              error: image.error ?? null,
              quality_flags: image.quality_flags ?? [],
              image_source: image.image_source ?? null,
              image_source_key: image.image_source_key ?? null,
            });
            continue;
          }

          const ceiling = evaluateStopBeforeNextCall(args, generatedRows, validationFailures);
          if (ceiling.stopped_before_next_call) {
            stopBeforeNextCall = {
              ...ceiling,
              next_card_print_id: card.card_print_id,
              next_gv_id: card.gv_id,
              next_name: card.name,
            };
            break;
          }

          const generation = await generateDescription(card, image, args);
          generationTelemetry = generation.telemetry;
          const rawPayload = generation.payload;
          const validation = validateVisualDescriptionPayloadV1(rawPayload);
          if (!validation.ok) {
            validationFailures.push({
              card_print_id: card.card_print_id,
              gv_id: card.gv_id,
              name: card.name,
              ...telemetryForArtifact(generationTelemetry),
              findings: validation.findings,
              raw_payload: rawPayload,
            });
            continue;
          }

          const row = buildDescriptionRow(card, image, validation.normalized, args, generationTelemetry);
          generatedRows.push({
            ...row,
            gv_id: card.gv_id,
            name: card.name,
            set_code: card.set_code,
            set_name: card.set_name,
            number: card.number,
            embedding_input_hash_preview: sha256(buildEmbeddingInputV1(row)),
          });
        } catch (error) {
          validationFailures.push({
            card_print_id: card.card_print_id,
            gv_id: card.gv_id,
            name: card.name,
            image_sha256: image?.image_sha256 ?? null,
            ...telemetryForArtifact(error.telemetry ?? generationTelemetry),
            findings: ["generation_exception"],
            error: error.message,
          });
        }
      }
    }

    const finishedAt = nowIso();
    const summary = buildSummary({
      args,
      eligibleCards,
      totalEligibleCatalogCount,
      generatedRows,
      validationFailures,
      skippedImages,
      startedAt,
      finishedAt,
      stopBeforeNextCall,
    });

    const artifactHashes = await writeRunArtifacts({
      runDir,
      runPlan,
      eligibleCards: eligibleCards.map(compactCardForArtifact),
      generatedRows,
      validationFailures,
      skippedImages,
      summary,
    });

    let applyResult = null;
    if (args.mode === "apply") {
      applyResult = await insertApplyRows(client, {
        runPlan,
        summary,
        artifactHashes,
        runDir,
        generatedRows,
        args,
      });
    }

    return {
      run_key: runKey,
      run_dir: runDir,
      summary,
      artifact_hashes: artifactHashes,
      apply_result: applyResult,
    };
  } finally {
    await client.end();
  }
}

export async function main(argv = process.argv.slice(2)) {
  const result = await runCardVisualDescriptionAgentV1(argv);
  console.log(`[card-visual-description-agent] run_key=${result.run_key}`);
  console.log(`[card-visual-description-agent] run_dir=${path.relative(REPO_ROOT, result.run_dir).replace(/\\/g, "/")}`);
  console.log(`[card-visual-description-agent] eligible=${result.summary.eligible_count}`);
  console.log(`[card-visual-description-agent] validated=${result.summary.validated_count}`);
  console.log(`[card-visual-description-agent] skipped=${result.summary.skipped_count}`);
  console.log(`[card-visual-description-agent] failed=${result.summary.failed_count}`);
  if (result.apply_result) {
    console.log(`[card-visual-description-agent] inserted=${result.apply_result.insertedCount}`);
    console.log(`[card-visual-description-agent] apply_skipped=${result.apply_result.applySkippedCount}`);
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
