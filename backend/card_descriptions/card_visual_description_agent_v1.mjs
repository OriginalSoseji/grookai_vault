import crypto from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const execFile = promisify(execFileCallback);

export const CARD_VISUAL_DESCRIPTION_AGENT_VERSION = "CARD_VISUAL_DESCRIPTION_AGENT_V1";
export const CARD_VISUAL_DESCRIPTION_PROMPT_VERSION = "CARD_VISUAL_FACT_EXTRACTION_PROMPT_V2";
export const CARD_VISUAL_DESCRIPTION_VISUAL_LANGUAGE_VERSION = "CARD_VISUAL_LANGUAGE_V1";
export const CARD_VISUAL_DESCRIPTION_OUTPUT_SCHEMA_VERSION = "CARD_VISUAL_FACT_GRAPH_SCHEMA_V2";
export const CARD_VISUAL_DESCRIPTION_DEFAULT_MODEL_VERSION = "fixture-card-visual-description-v2";
export const CARD_VISUAL_DESCRIPTION_AUTO_APPROVAL_READINESS_VERSION = "CARD_VISUAL_DESCRIPTION_AUTO_APPROVAL_READINESS_V1";
export const CARD_VISUAL_FACT_GRAPH_SCHEMA_VERSION_V1 = "CARD_VISUAL_FACT_GRAPH_SCHEMA_V1";
export const CARD_VISUAL_FACT_GRAPH_SCHEMA_VERSION = "CARD_VISUAL_FACT_GRAPH_SCHEMA_V2";
export const CARD_VISUAL_CONTROLLED_VOCABULARY_VERSION = "CARD_VISUAL_CONTROLLED_VOCABULARY_V1";
export const CARD_VISUAL_SEARCH_ALIAS_VERSION = "CARD_VISUAL_SEARCH_ALIAS_V1";

export const CARD_VISUAL_DESCRIPTION_REVIEW_STATUSES = Object.freeze([
  "pending",
  "approved",
  "needs_review",
  "rejected",
]);

const DEFAULT_OUT_DIR = path.join(REPO_ROOT, "docs", "audits", "card_visual_descriptions");
const DEFAULT_V2_STRESS_OUT_DIR = path.join(REPO_ROOT, "docs", "audits", "card_visual_fact_graph_v2_stress_dry_run");
const DEFAULT_LIMIT = 25;
const DEFAULT_MIN_WIDTH = 180;
const DEFAULT_MIN_HEIGHT = 240;
const DEFAULT_MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const DEFAULT_IMAGE_DETAIL = "high";
const DEFAULT_MAX_RETRIES = 0;
const DEFAULT_OPENAI_REQUEST_TIMEOUT_MS = 180_000;
const DEFAULT_CONCURRENCY = 1;
const DEFAULT_HARVEST_MAX_VALIDATION_FAILURE_RATE = 0.15;
const DEFAULT_BRANCH_STRATIFIED_CANDIDATE_LIMIT = 5000;
const DEFAULT_HIGH_VALUE_CANDIDATE_LIMIT = 5000;
const HIGH_VALUE_SELECTION_VERSION = "CARD_VISUAL_HIGH_VALUE_SELECTION_V1";
const HIGH_VALUE_PRICE_VIEW = "v_grookai_value_v1_1";
const HIGH_VALUE_PRICE_COLUMNS = Object.freeze([
  "grookai_value_usd",
  "estimated_value_usd",
  "market_value_usd",
  "value_usd",
  "effective_price_usd",
  "best_price_usd",
  "price_usd",
  "reference_median",
  "market",
  "nm_median",
]);
const PROMPT_BRANCHES = Object.freeze([
  "pokemon",
  "trainer",
  "stadium",
  "energy",
  "item_tool_supporter",
]);
const DEFERRED_VISUAL_FACT_PROMPT_BRANCHES = new Set(["energy"]);
const BRANCH_STRATIFIED_BRANCHES = Object.freeze(
  PROMPT_BRANCHES.filter((branch) => !DEFERRED_VISUAL_FACT_PROMPT_BRANCHES.has(branch)),
);
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
const SEARCH_TERM_STOP_WORDS = new Set([
  "and",
  "are",
  "card",
  "figure",
  "from",
  "has",
  "illustration",
  "scene",
  "style",
  "the",
  "with",
]);
const SEMANTIC_VISUAL_FACT_EVIDENCE_FIELDS = Object.freeze([
  "mouth",
  "eyes",
  "eyebrows",
  "facial_features",
  "body_language",
  "body_position",
  "motion_state",
  "environment",
  "objects",
  "relationships",
  "other",
]);
const SEMANTIC_VISUAL_FACT_CATEGORIES = new Set([
  "expression",
  "state",
  "action",
  "environment",
  "weather",
  "time_of_day",
  "scene_type",
  "count_semantic",
  "cameo",
  "motif",
]);
const SEMANTIC_VISUAL_FACT_HAPPY_LABEL_PATTERN = /\b(?:happy|smiling|smile|cheerful|joyful)\b/i;
const SEMANTIC_VISUAL_FACT_ANGRY_OR_ANNOYED_LABEL_PATTERN = /\b(?:angry|annoyed|irritated|scowling|scowl|frowning|aggressive(?:\s+expression)?|fierce(?:\s+expression)?)\b/i;
const SEMANTIC_VISUAL_FACT_SCARED_OR_SURPRISED_LABEL_PATTERN = /\b(?:scared|surprised|startled|wide[-\s]?eyed|crying|tears?)\b/i;
const SEMANTIC_VISUAL_FACT_CONCERNED_LABEL_PATTERN = /\b(?:concerned|worried|uneasy)(?:\s+(?:expression|face))?\b/i;
const SEMANTIC_VISUAL_FACT_SMIRKING_LABEL_PATTERN = /\b(?:smirk|smirking)\b/i;
const SEMANTIC_VISUAL_FACT_FOCUSED_OR_DETERMINED_LABEL_PATTERN = /\b(?:focused|determined|serious|concentrated|intent|intense)(?:\s+expression)?\b/i;
const SEMANTIC_VISUAL_FACT_ALERT_LABEL_PATTERN = /\balert(?:\s+expression)?\b/i;
const SEMANTIC_VISUAL_FACT_AWAKE_LABEL_PATTERN = /\bawake\b/i;
const SEMANTIC_VISUAL_FACT_OBJECTIVE_FACIAL_FEATURE_LABEL_PATTERN =
  /\b(?:sharp teeth|visible teeth|teeth visible|bared teeth|fangs?|visible fangs?|jagged mouth(?: shape)?|jittery (?:line(?: shaped)? )?mouth|line(?:[-\s]?shaped)? mouth|mouth (?:shape|line|slightly open|partly closed|partially closed|closed|open)|wide open mouth|open mouth|open jaw|jaw open|closed mouth|visible tongue|tongue visible|tongue out|tongue_out|smiling mouth|upturned mouth|downturned mouth|closed beak|beak closed|red lips(?: visible)?|pink cheeks?|narrowed eyes?|slanted eyes?|furrowed eyebrows?|helmeted head|helmet[-\s]?covered face|curled antennae|blushing cheeks?|blush cheeks?|red blush cheeks?|orange blush(?: marks?)?(?: on cheeks)?|blush marks?(?: on cheeks)?|cheek marks?)\b/i;
const SEMANTIC_VISUAL_FACT_SNARLING_LABEL_PATTERN = /\bsnarl(?:ing)?\b/i;
const SEMANTIC_VISUAL_FACT_UPRIGHT_LABEL_PATTERN = /\bupright\b/i;
const SEMANTIC_VISUAL_FACT_SLEEPING_LABEL_PATTERN = /\b(?:sleeping|asleep|sleepy|resting)\b/i;
const SEMANTIC_VISUAL_FACT_FOREST_LABEL_PATTERN = /\b(?:forest|woodland|woods|tree-filled)\b/i;
const SEMANTIC_VISUAL_FACT_RAIN_LABEL_PATTERN = /\b(?:rain|rainy|rainfall|wet weather)\b/i;
const SEMANTIC_VISUAL_FACT_GHOSTLY_ENVIRONMENT_LABEL_PATTERN = /\b(?:ghostly|haunted|spooky|halloween|spectral|ghost(?:[-\s]?type)?)\b/i;
const SEMANTIC_VISUAL_FACT_NIGHT_LABEL_PATTERN = /\b(?:night|nighttime|dark sky|dusk|twilight)\b/i;
const SEMANTIC_VISUAL_FACT_CITYSCAPE_LABEL_PATTERN =
  /\b(?:cityscape|skyline|urban(?:\s+scene|\s+background)?|city\s+background)\b/i;
const SEMANTIC_VISUAL_FACT_DAYTIME_LABEL_PATTERN = /\b(?:day|daytime|daylight|sunny|sunlit)\b/i;
const SEMANTIC_VISUAL_FACT_ROARING_LABEL_PATTERN = /\broaring\b/i;
const SEMANTIC_VISUAL_FACT_ATTACKING_LABEL_PATTERN = /\b(?:attack|attacking|striking|hit|hitting)\b/i;
const SEMANTIC_VISUAL_FACT_ACTION_LABEL_PATTERN = /\b(?:floating|flying|running|walking|standing|sitting|lying down|leaping|jumping|eating|fighting|holding|reaching|hiding|peeking|posing|pointing|looking at|arms raised|raised arms|raising (?:hands?|fists?)|adjusting (?:eyeglasses|glasses)|surfing|spinning|climbing|hanging|mid[-\s]?stride|lunging|accelerating|extended claws?|claws? extended|clenched fists?|hands on hips|clasp(?:ed|ing) hands?)\b/i;
const SEMANTIC_VISUAL_FACT_ALLOWED_LABEL_PATTERN =
  /\b(?:happy|smiling|smile|smirk|smirking|winking|wink|angry|annoyed|irritated|surprised|scared|crying|tears?|calm|neutral|sleeping|asleep|sleepy|resting|floating|flying|running|walking|standing|upright|sitting|lying down|leaping|jumping|eating|fighting|holding|reaching|hiding|peeking|posing|pointing|looking at|arms raised|raised arms|raising (?:hands?|fists?)|adjusting (?:eyeglasses|glasses)|surfing|spinning|climbing|hanging|mid[-\s]?stride|lunging|accelerating|forest|woodland|woods|trees?|coniferous trees?|traffic cones?|rainy|rain|stormy|snowy|night|nighttime|sunset|daylight|indoors?|outdoors?|stadium|swimming pool|beach|water|reflective water|underwater|tropical island|sky|clouds?|blue sky(?: with clouds)?|sun(?: near horizon)?|sunlight beams?|food scene|birthday celebration|cozy interior|abstract background|natural landscape|desert|desert setting|garden|backyard|roadside|icy environment|volcano eruption|greenery|golden abstract background|gold highlights?|ghostly|haunted|spooky|halloween|spectral|cameo|depicted|plush|pillow|statue|toy|logo|poster|screen|card|portrait sketch|small creature|bird|fox|squirrel|bell|dark bell|bomb|pok[eé]ball|poke ball|fuse|emblem|symbol|sun emblem|ten trees?|tree group|multiple figures?|figure group|repeated shapes?|circular motif|spiral motif|radial lines?|light(?:ing)? streaks?|lightning bolt motifs?|angular motifs?|geometric motifs?|background pattern|stylized background pattern|star shapes?|star(?:-like)? sparkles?|sparkling light effect|sparkles?|shattered crystals?|crystals?)\b/i;
const SEMANTIC_VISUAL_FACT_EVIDENCE_ONLY_LABEL_PATTERN =
  /\b(?:eyes?|eyes? (?:not clearly visible|not visible|unclear|open|closed|visible)|(?:open|closed|visible|narrowed|sharp) eyes?|(?:yellow|blue|red|green|black|white|brown|purple|orange|gold(?:en)?|pink|gray|grey|amber)\s+eyes?|neutral eyebrows?|natural eyebrows?|eyebrows? (?:neutral|natural|visible)|face visible|face side profile visible|side profile visible|neutral face(?: position)?|face (?:not clearly visible|not visible|unclear|mostly obscured)|mouth (?:not clearly visible|not visible|unclear|open|smiling|visible|neutral|closed)|(?:neutral|closed|visible|open) mouth|neutral(?:\s+or\s+slightly\s+concerned)? expression(?:\s+(?:female|male|side profile|male side profile|female side profile))?)\b/i;
const SEMANTIC_VISUAL_FACT_DROP_LABEL_PATTERN =
  /\b(?:ready for attack|ready to attack|preparing to attack|about to attack|female human character|male human character|human character|human trainer|visible trainer|dark fantasy style pokemon|fantasy style pokemon|fantasy [a-z ]*pok[eé]mon|dark style pokemon|pokemon style|pok[eé]mon style|^pok[eé]mon$|unknown expression|not visible face details|no visible face details|cannot determine expression|cannot_determine_expression|stance|pose)\b/i;
const SEMANTIC_VISUAL_FACT_OBJECT_ONLY_CAMEO_LABEL_PATTERN =
  /\b(?:bomb|bell|badge|pok[eé]ball|poke ball|promo stamp|stamp|fuse|tool|item|object)\b/i;
const SEMANTIC_VISUAL_FACT_UNSUPPORTED_LABEL_PATTERN =
  /\b(?:lost|protecting|guarding|searching for|waiting for|trying to|wants to|symboli[sz](?:e|es|ing)|represents?|embod(?:y|ies|ying)|heroic|evil|loyal|brave|hope|destiny|purpose|lore|story|narrative|backstory)\b/i;
const FACT_GRAPH_SEARCH_TERM_SURFACE_OR_PRINT_PATTERN =
  /\b(?:foil|gold foil|silver foil|holo(?:graphic)?|card surface|surface texture|texture visible|embossed|glossy finish|glossy surface|print finish|printing treatment)\b/i;
const FACT_GRAPH_SEARCH_TERM_CARD_UI_OR_MECHANICS_PATTERN =
  /\b(?:hp\s*\d*|attack(?: name| text| cost)?|weakness|resistance|retreat(?: cost)?|collector number|rarity|set symbol|copyright|illustrator|promo stamp|regulation mark|card name|energy symbol|type symbol|(?:fire|water|grass|lightning|electric|psychic|fighting|darkness|dark|metal|dragon|colorless|fairy)\s+energy symbol)\b/i;
const SUBSTANCE_STATE_ALIAS_KEYS = new Set([
  "high",
  "stoner",
  "stoned",
  "under the influence",
  "intoxicated",
  "drugged",
  "smoked out",
  "smoke out",
  "looks high",
  "appears high",
  "seems high",
]);
const SUBSTANCE_STATE_ALIAS_PHRASE_PATTERN =
  /\b(?:stoner|stoned|under the influence|intoxicated|drugged|smoked out|smoke out|looks high|appears high|seems high|is high)\b/i;
const SUBSTANCE_SEARCH_STANDALONE_HIGH_NEGATIVE_PATTERN =
  /\bhigh\s+(?:pressure|contrast|salience|quality|resolution|detail|value|altitude|angle|light|lights|highlight|highlights)\b/i;
const SUBSTANCE_CUE_EYE_PATTERN =
  /\b(?:red eyes|red-eyed|bloodshot(?:-looking)? eyes?|half[-\s]?closed eyes?|half[-\s]?lidded eyes?|heavy[-\s]?lidded eyes?|drooping eyelids?|droopy eyelids?)\b/i;
const SUBSTANCE_CUE_SMOKE_OR_HAZE_PATTERN =
  /\b(?:smoke|smoky|smoke plume|smoke cloud|visible vapor|visible vapour|vapor|vapour|haze|hazy)\b/i;
const SUBSTANCE_CUE_EXPLICIT_OBJECT_PATTERN =
  /\b(?:pipe[-\s]?like object|pipe-shaped object|cigarette[-\s]?like object|cigar[-\s]?like object|smoking object|smoking pipe|cigarette|cigar|smoke near (?:the )?mouth|vapor near (?:the )?mouth|vapour near (?:the )?mouth)\b/i;
const ALTERED_STATE_VISUAL_CUE_CONCEPT = "altered-state visual cue evidence";
const SEMANTIC_VISUAL_FACT_HAPPY_SUPPORT_PATTERN =
  /\b(?:smile|smiling|upturned mouth|open cheerful mouth|mouth open|open mouth(?:\s+(?:with|and))?\s+visible tongue|raised cheeks|closed crescent eyes|bright eyes|relaxed eyes|arms raised|playful pose)\b/i;
const SEMANTIC_VISUAL_FACT_HAPPY_CONTRADICTION_PATTERN =
  /\b(?:frown|frowning|downturned mouth|crying|tears|grimace|angry|scowling|no visible mouth|mouth not visible|face not visible|cannot_determine)\b/i;
const SEMANTIC_VISUAL_FACT_ANGRY_OR_ANNOYED_SUPPORT_PATTERN =
  /\b(?:narrowed eyes?|sharp eyes?|slanted eyes?|squinting eyes?|furrowed brow|furrowed eyebrows?|lowered eyebrows?|angled brow|angled eyebrows?|downward[-\s]angled eyebrows?|frown|frowning|downturned mouth|grimace|scowl|scowling|bared teeth|clenched teeth|visible teeth|teeth visible|open mouth with teeth|open mouth showing teeth)\b/i;
const SEMANTIC_VISUAL_FACT_ANGRY_OR_ANNOYED_CONTRADICTION_PATTERN =
  /\b(?:neutral eyebrows?|natural eyebrows?|relaxed eyes?|smile|smiling|upturned mouth|mouth not visible|face not visible|cannot_determine)\b/i;
const SEMANTIC_VISUAL_FACT_SCARED_OR_SURPRISED_SUPPORT_PATTERN =
  /\b(?:wide eyes?|wide[-\s]open eyes?|raised eyebrows?|open mouth|gasp|tears?|crying|startled posture|recoiling|flinching)\b/i;
const SEMANTIC_VISUAL_FACT_CONCERNED_SUPPORT_PATTERN =
  /\b(?:downturned mouth|frown(?:ing)?|furrowed brow|furrowed eyebrows?|raised eyebrows?|wide eyes?|wide[-\s]open eyes?|worried eyes?|tears?|sweat drops?|grimace|hands? (?:near|to) face|recoiling|flinching)\b/i;
const SEMANTIC_VISUAL_FACT_CONCERNED_CONTRADICTION_PATTERN =
  /\b(?:smile|smiling|upturned mouth|relaxed eyes|neutral eyebrows?|mouth not visible|face not visible|cannot_determine)\b/i;
const SEMANTIC_VISUAL_FACT_SMIRKING_SUPPORT_PATTERN =
  /\b(?:smirk|smirking|one[-\s]?sided smile|asymmetrical smile|crooked smile|mouth corner raised|raised mouth corner|upturned mouth corner|slight smile|curved mouth)\b/i;
const SEMANTIC_VISUAL_FACT_FOCUSED_OR_DETERMINED_SUPPORT_PATTERN =
  /\b(?:sharp eyes?|focused eyes?|narrowed eyes?|slanted eyes?|squinting eyes?|furrowed brow|furrowed eyebrows?|angled brow|angled eyebrows?|angular eyebrows?|\bangular\b|firm mouth|straight mouth|set mouth|clenched teeth|bared teeth|clenched fists?|forward lean)\b/i;
const SEMANTIC_VISUAL_FACT_FOCUSED_OR_DETERMINED_CONTRADICTION_PATTERN =
  /\b(?:face not visible|mouth not visible|eyes not visible|facial features not visible|cannot_determine|relaxed eyes)\b/i;
const SEMANTIC_VISUAL_FACT_ALERT_SUPPORT_PATTERN =
  /\b(?:wide eyes?|open eyes?|raised eyebrows?|upright posture|upright orientation|head raised|raised head|ears? (?:upright|raised|perked)|perked ears?|attentive gaze|looking forward|forward-facing eyes?)\b/i;
const SEMANTIC_VISUAL_FACT_ALERT_CONTRADICTION_PATTERN =
  /\b(?:eyes closed|sleeping|asleep|face not visible|eyes not visible|cannot_determine|relaxed eyes)\b/i;
const SEMANTIC_VISUAL_FACT_AWAKE_SUPPORT_PATTERN =
  /\b(?:open eyes?|visible eyes?|round eyes?|pupils?|wide eyes?|alert|upright posture|looking forward|forward-facing eyes?)\b/i;
const SEMANTIC_VISUAL_FACT_AWAKE_CONTRADICTION_PATTERN =
  /\b(?:eyes closed|closed eyes|sleeping|asleep|sleep posture|face not visible|eyes not visible|cannot_determine)\b/i;
const SEMANTIC_VISUAL_FACT_OBJECTIVE_FACIAL_FEATURE_SUPPORT_PATTERN =
  /\b(?:sharp teeth|visible sharp teeth|teeth visible|visible teeth|bared teeth|clenched teeth|fangs?|visible fangs?|jagged mouth(?: shape)?|mouth jagged|jagged|jittery (?:line(?: shaped)? )?mouth|jittery line|line(?:[-\s]?shaped)? mouth|mouth line|mouth (?:slightly open|partly closed|partially closed|closed|open)|wide open mouth|open mouth|mouth open|open jaw|jaw open|closed mouth|visible tongue|tongue visible|tongue_out|tongue visible|smiling mouth|upturned mouth|downturned mouth|closed beak|beak closed|red lips|pink cheeks?|helmet-covered face|helmeted head|curled antennae|narrowed eyes?|slanted eyes?|furrowed eyebrows?|blushing cheeks?|blush cheeks?|red blush cheeks?|orange blush(?: marks?)?(?: on cheeks)?|blush marks?(?: on cheeks)?|cheek marks?)\b/i;
const SEMANTIC_VISUAL_FACT_SNARLING_SUPPORT_PATTERN =
  /\b(?:wide open mouth|open mouth|mouth open|bared teeth|visible teeth|teeth visible|sharp teeth|fangs?|visible fangs?)\b/i;
const SEMANTIC_VISUAL_FACT_UPRIGHT_SUPPORT_PATTERN =
  /\b(?:upright|vertical|standing|raised body|body raised|torso upright|upright posture|upright stance|upright orientation|diagonal upright|body position)\b/i;
const SEMANTIC_VISUAL_FACT_SLEEPING_SUPPORT_PATTERN =
  /\b(?:eyes closed|closed eyes|asleep|sleeping|lying down|reclining|curled up|resting|still body|sleep posture)\b/i;
const SEMANTIC_VISUAL_FACT_SLEEPING_CONTRADICTION_PATTERN =
  /\b(?:eyes open|running|leaping|jumping|fighting|active attack|wide open eyes)\b/i;
const SEMANTIC_VISUAL_FACT_FOREST_SUPPORT_PATTERN =
  /\b(?:trees?|tree trunks?|forest|woodland|woods|foliage|canopy|leaves|leafy|branches?|dense plants?|wooded terrain)\b/i;
const SEMANTIC_VISUAL_FACT_RAIN_SUPPORT_PATTERN =
  /\b(?:raindrops?|rain streaks?|rainfall|wet ground|puddles?|umbrella|storm clouds?)\b/i;
const SEMANTIC_VISUAL_FACT_GHOSTLY_ENVIRONMENT_SUPPORT_PATTERN =
  /\b(?:ghost(?:ly)?(?:[-\s]type)?|ghost flames?|purple ghost flames?|spectral|wisps?|spirit|haunted|smoke|smoky|shadow|shadows|fog|mist|tombstones?|graves?|haunted house|bats?|pumpkins?|jack[-\s]?o[-\s]?lanterns?|candles?|skulls?|cobwebs?)\b/i;
const SEMANTIC_VISUAL_FACT_NIGHT_SUPPORT_PATTERN =
  /\b(?:night|nighttime|dark sky|black sky|very dark sky|moonlit|moon|dusk|twilight|stars?|stormy night sky)\b/i;
const SEMANTIC_VISUAL_FACT_CITYSCAPE_SUPPORT_PATTERN =
  /\b(?:buildings?|illuminated windows?|windows?|signage|streets?|alleys?|alleyways?|skyline|city lights?|urban|architecture|towers?|skyscrapers?)\b/i;
const SEMANTIC_VISUAL_FACT_DAYTIME_SUPPORT_PATTERN =
  /\b(?:day|daytime|daylight|sunlit|sunny|sun|bright sky|blue sky|visible sun|sun in (?:the )?(?:upper|top|sky))\b/i;
const SEMANTIC_VISUAL_FACT_ROARING_SUPPORT_PATTERN =
  /\b(?:open mouth|wide open mouth|mouth open|visible fangs?|teeth|bared teeth|tongue visible|head raised|raised head)\b/i;
const SEMANTIC_VISUAL_FACT_ROARING_CONTRADICTION_PATTERN =
  /\b(?:mouth closed|closed mouth|mouth not visible|face not visible|cannot_determine)\b/i;
const SEMANTIC_VISUAL_FACT_ATTACKING_SUPPORT_PATTERN =
  /\b(?:impact|hit|hitting|strike|striking|opponent|target|contact|claw swipe|punch|kick|bite|tackle|energy blast|beam|projectile|explosion|colliding|charging at)\b/i;
const SEMANTIC_VISUAL_FACT_COUNT_SEMANTIC_LABEL_PATTERN =
  /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+|multiple|group)\b/i;
const SEMANTIC_VISUAL_FACT_COUNT_SEMANTIC_SUPPORT_PATTERN =
  /\b(?:trees?|palms?|plants?|objects?|symbols?|shapes?|bolts?|stars?|figures?|creatures?|subjects?|buildings?|flames?|items?|lines?|bands?|cones?|barricades?)\b/i;
const CONTROLLED_VOCABULARY_REMOVED_STYLE_TERMS =
  /\b(?:anime style|comic style drawing|comic style|fantasy art|fantasy|magical|mystical|mystic|enchanted|enchanting|dreamlike|ethereal|cheerful|joyful)\b/gi;
const CONTROLLED_VOCABULARY_REMOVED_VISUAL_DESIGN_TERMS =
  /\b(?:holographic foil|holographic|gold foil texture|gold foil|silver foil|foil texture|foil)\b/gi;
const CONTROLLED_VOCABULARY_POSE_RULES = Object.freeze([
  ["sleeping", /\b(?:sleeping|asleep|lying asleep)\b/i],
  ["standing", /\b(?:standing|upright stance|standing pose)\b/i],
  ["sitting", /\b(?:sitting|seated)\b/i],
  ["lying down", /\b(?:lying down|reclining)\b/i],
  ["leaping", /\b(?:leaping|jumping|mid-leap|mid leap)\b/i],
  ["floating", /\b(?:floating|hovering|suspended)\b/i],
  ["flying", /\b(?:flying|in flight)\b/i],
  ["running", /\b(?:running|sprinting)\b/i],
  ["walking", /\bwalking\b/i],
  ["crouching", /\b(?:crouching|crouched)\b/i],
  ["kneeling", /\b(?:kneeling|kneels)\b/i],
  ["reaching", /\b(?:reaching|arm extended|arms extended|forelimbs extended)\b/i],
  ["holding", /\bholding\b/i],
]);
const CONTROLLED_VOCABULARY_CONCEPT_RULES = Object.freeze([
  ["aurora-like light bands", /\baurora(?:-like)?\b|\blight bands?\b/i],
  ["lightning", /\blightning\b|\belectricity\b|\belectricity\s+effects?\b|\belectric(?:al)?\s+(?:arc|bolt|aura|effect|spark|streak|energy)\b/i],
  ["flame", /\bflames?\b|\bfire\b/i],
  ["smoke", /\bsmoky\b|\bsmoke\b|\bmist\b|\bfog\b/i],
  ["vapor or haze", /\b(?:visible )?(?:vapor|vapour)\b|\bhaze\b|\bhazy\b/i],
  ["light streaks", /\blight(?:ing)? streaks?\b|\b(?:pink|white|blue|yellow|green|orange|red|purple)\s+and\s+(?:pink|white|blue|yellow|green|orange|red|purple)\s+streaks?\b/i],
  ["spark", /\bsparks?\b/i],
  ["sparkle", /\bsparkles?\b|\bstar-like sparkles?\b|\bstar sparkles?\b/i],
  ["explosion", /\bexplos(?:ion|ive)\b|\bimpact effect\b/i],
  ["bomb", /\bbombs?\b/i],
  ["red eyes", /\bred eyes\b|\bred-eyed\b|\bbloodshot(?:-looking)? eyes?\b/i],
  ["half-closed eyes", /\bhalf[-\s]?(?:closed|lidded) eyes?\b|\bheavy[-\s]?lidded eyes?\b/i],
  ["drooping eyelids", /\bdroop(?:ing|y) eyelids?\b/i],
  ["smoking object visual cue", /\b(?:pipe[-\s]?like object|pipe-shaped object|cigarette[-\s]?like object|cigar[-\s]?like object|smoking object|smoking pipe|cigarette|cigar)\b/i],
  ["smoke near mouth", /\b(?:smoke|vapor|vapour)(?: plume| cloud)? near (?:the )?mouth\b/i],
  ["glowing highlights", /\bglow(?:ing)?\b|\bbright highlights?\b|\bluminous\b/i],
  ["gold highlights", /\bgold(?:en)?\s+(?:highlight|highlights|palette|radial|ornate|monochrome)\b|\bgold highlights?\b/i],
  ["radial lines", /\bradial\b|\bradiating lines?\b/i],
  ["circular motif", /\bcircular\b|\bround(?:ed)?\b|\borb\b|\bcircle\b/i],
  ["spiral motif", /\bspiral\b|\bswirling\b|\bswirl\b/i],
  ["diagonal composition", /\bdiagonal\b/i],
  ["centered composition", /\bcentered\b|\bcentral\b/i],
  ["close crop", /\bclose crop\b|\btight(?:ly)? framed\b|\btight vertical crop\b/i],
  ["forest", /\bforest\b|\bwoodland\b/i],
  ["tree", /\btrees?\b/i],
  ["building", /\bbuildings?\b|\barchitecture\b|\bstructure\b/i],
  ["bridge", /\bbridges?\b/i],
  ["stairs", /\bstairs?|steps?\b/i],
  ["fence", /\bfences?\b/i],
  ["sun", /\bsun\b/i],
  ["sun emblem", /\bsun emblem\b/i],
  ["emblem", /\bemblems?\b|\bsymbols?\b/i],
  ["sky", /\bsky\b/i],
  ["cloud", /\bclouds?\b|\bcloudy\b/i],
  ["water", /\bwater\b|\briver\b|\blake\b|\bocean\b|\bsea\b/i],
  ["rain", /\brain\b|\brainfall\b/i],
  ["snow", /\bsnow\b/i],
  ["terrain", /\bterrain\b|\bground\b|\bgrass\b|\bpath\b|\brock\b|\bmountain\b/i],
  ["flower", /\bflowers?\b/i],
  ["plant", /\bplants?|leafy\b/i],
  ["table", /\btables?\b/i],
  ["window", /\bwindows?\b/i],
  ["hat", /\bhat\b|\bcap\b|\bheadwear\b/i],
  ["gloves", /\bgloves?\b/i],
  ["cape", /\bcapes?\b|\bcloak\b/i],
  ["mask", /\bmasks?\b/i],
  ["armor", /\barmor\b|\barmour\b/i],
  ["long hair", /\blong hair\b|\bflowing hair\b/i],
  ["short hair", /\bshort hair\b/i],
  ["exposed shoulders", /\bexposed shoulders?\b|\bbare shoulders?\b/i],
  ["exposed midriff", /\bexposed midriff\b|\bbare midriff\b/i],
  ["low-cut neckline", /\blow[- ]cut neckline\b/i],
  ["sleeveless clothing", /\bsleeveless\b/i],
  ["metal-like appearance", /\bmetallic-looking\b|\bmetal-like\b|\bmetallic\b/i],
  ["glass-like appearance", /\bglass-like\b|\bglasslike\b/i],
  ["reflective-looking surface", /\breflective-looking\b|\breflective highlights?\b|\bshiny\b/i],
]);
const VISUAL_LANGUAGE_SPECULATIVE_SETTING_PATTERN =
  /\b(cosmic|celestial|magical|enchanted|enchanting|enchantment|dreamlike|dreamy|night sky|portal|mystical|ethereal|twilight|fantasy|fantastical|starry|stars)\b/gi;
const VISUAL_LANGUAGE_INTERPRETIVE_CLAIM_PATTERN =
  /\b(symboli[sz]es|symboli[sz]ing|represents|embodies|evoke|evokes|evoking|evocative|invokes?)\b/gi;
const VISUAL_LANGUAGE_SURFACE_OVERCLAIM_PATTERN =
  /\b(foil (?:texture )?(?:is )?visible|foil treatment is present|visible foil|glossy(?: finish| surface)?|gloss present|layer of gloss|clear gloss finish|clean,\s*reflective finish|reflective finish|metallic finish|smooth silver finish|smooth surface|embossed|texture visible|standard (?:printing treatment|print|surface|printed surface)|card surface appears standard|card surface quality appears clear|(?:without|no) visible textur(?:e|ing)(?: or gloss effects)?|no visible gloss effects|edges?[^.]{0,40}\bwear\b|no significant defects(?: in the print quality)?|print quality|shimmering finish|higher quality print|printing quality appears|printing treatment (?:is consistent|appears to show[^.]*)|appears to show muted colors|without visible errors|imperfections)\b/gi;
const VISUAL_LANGUAGE_BORDER_COLOR_CLAIM_PATTERN =
  /\b(?:(silver|gold|yellow|black|white|gray|grey|red|blue|green|purple|brown|orange|bronze|tan)(?:\/(?:gold|yellow))?\s+(?:card\s+)?border|(?:card\s+)?border(?:\s+(?:is|appears|looks|seems|visible|colored|coloured|shows|has))?\s+(silver|gold|yellow|black|white|gray|grey|red|blue|green|purple|brown|orange|bronze|tan)(?:\/(?:gold|yellow))?)\b/gi;
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
  /\b(cheerful|joyful|confident|confidence|angry|sad|friendly|menacing|playful|optimistic|mysterious|enigmatic|elegant|elegance|mystique|personality|demeanor|charm|regal|graceful|gracefully|lively|determination|determined|focused|serious|contemplative|thoughtfulness|introspection|anticipation|enthusiasm|assertive|commanding|sexy|attractive|beautiful|seductive|voluptuous|fierce|majestic)\b/gi;
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
const VISUAL_LANGUAGE_STORY_OR_LORE_PATTERN =
  /\b(lost in|searching for|looking for|protecting|guarding|waiting for|trying to|wants to|decides to|journey|quest|backstory|story of|tells a story|narrative|lore|purpose|symbolic meaning|represents|symbolizes|embodies)\b/gi;
const FACT_GRAPH_NON_LIVING_SUBJECT_LABEL_PATTERN =
  /\b(?:sky|cloud|background|space|gradient|color|palette|line|shape|pattern|symbol|energy|flame|fire|smoke|spark|lightning|bolt|storm|rain|snow|water|wave|tree|forest|plant|flower|grass|rock|stone|mountain|ground|terrain|building|stadium|road|path|moon|sun|star|reflection|shadow|highlight|glare|bomb|bell|badge|orb|object|prop|decoration|effect)\b/i;
const FACT_GRAPH_SCENE_SUBJECT_OBSERVATION_KIND_PATTERN =
  /\b(?:scene_subject|subject|person|human|trainer|pokemon|pokémon|creature|character|entity|living_entity)\b/i;
const FACT_GRAPH_UNSUPPORTED_MATERIAL_PATTERN =
  /\b(?:metal|plastic|glass|wood|stone|rubber|fabric|paper|ceramic|steel|iron|gold|silver)\b(?![-\s]*(?:like|looking|colored|coloured|appearance|tone|highlight|edge|shine|surface|finish))/i;
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
const VISUAL_POLICY_BLOCKING_DECISION = "needs_review";
const MIN_DETERMINISTIC_BORDER_COLOR_CONFIDENCE = 0.92;
const FACT_GRAPH_COVERAGE_REVIEW_STATUSES = new Set([
  "none_visible",
  "not_applicable",
  "cannot_determine_due_to_low_resolution",
  "cannot_determine_due_to_crop",
  "cannot_determine_due_to_glare",
  "uncertain",
  "observed",
]);
const FACT_GRAPH_MODULE_NAMES = Object.freeze([
  "subjects",
  "human_appearance",
  "creature_anatomy",
  "clothing",
  "objects_and_props",
  "environment",
  "composition",
  "color_and_light",
  "visual_effects",
  "card_ui_and_print_markers",
  "counts",
  "relationships",
  "surface_and_scan_cues",
  "uncertainty_and_abstentions",
  "fact_grounded_search_terms",
]);
const FACT_GRAPH_MODULE_ALIASES = Object.freeze({
  count: "counts",
  search_terms: "fact_grounded_search_terms",
  fact_search_terms: "fact_grounded_search_terms",
  semantic_search_terms: "fact_grounded_search_terms",
  relationship: "relationships",
  surface_scan_cues: "surface_and_scan_cues",
  surface_cues: "surface_and_scan_cues",
  scan_cues: "surface_and_scan_cues",
  uncertainty: "uncertainty_and_abstentions",
  abstentions: "uncertainty_and_abstentions",
  visual_design: "composition",
});
const FACT_GRAPH_MODULE_COVERAGE_KEY_BY_MODULE = Object.freeze({
  subjects: "subjects_review",
  counts: "counts_review",
  environment: "environment_review",
  objects_and_props: "objects_and_props_review",
  relationships: "relationships_review",
  surface_and_scan_cues: "surface_and_scan_cues_review",
});
const CARD_UI_AND_PRINT_MARKERS_MODULE = "card_ui_and_print_markers";
const CARD_UI_PRINT_MARKER_OBSERVATION_KIND_PATTERN =
  /\b(?:card_ui_text|card_ui_symbol|print_marker|promo_stamp|copyright_text|collector_number|rarity_mark|set_symbol|regulation_mark|illustrator_text|bottom_line_text|logo|error_marker|edition_marker|card_name_text|hp_text|attack_label|ability_label)\b/i;
const CARD_UI_PRINT_MARKER_FIELDS = Object.freeze([
  "name_text_observation_ids",
  "hp_text_observation_ids",
  "collector_number_observation_ids",
  "set_symbol_observation_ids",
  "rarity_mark_observation_ids",
  "copyright_line_observation_ids",
  "bottom_line_text_observation_ids",
  "promo_stamp_observation_ids",
  "logo_observation_ids",
  "energy_symbol_observation_ids",
  "regulation_mark_observation_ids",
  "illustrator_text_observation_ids",
  "error_marker_observation_ids",
  "other_print_marker_observation_ids",
]);
const CARD_UI_PROHIBITED_ARTWORK_MODULES = new Set([
  "human_appearance",
  "creature_anatomy",
  "clothing",
  "objects_and_props",
  "environment",
  "composition",
  "color_and_light",
  "visual_effects",
]);
const FACT_GRAPH_MODULE_REVIEW_STATUSES = new Set([
  "complete",
  "likely_complete",
  "partial_due_to_crop",
  "partial_due_to_low_resolution",
  "partial_due_to_occlusion",
  "partial_due_to_glare",
  "none_visible",
  "not_applicable",
  "uncertain",
]);
const FACT_GRAPH_MODULE_OMISSION_RISK_VALUES = new Set(["none", "low", "medium", "high", "unknown"]);
const FACT_GRAPH_MODULE_EVIDENCE_QUALITY_VALUES = new Set(["high", "medium", "low", "mixed", "not_applicable", "unknown"]);
const FACT_GRAPH_COUNT_TYPES = new Set([
  "exact",
  "estimated_range",
  "many",
  "uncountable_due_to_crop",
  "uncountable_due_to_density",
  "not_visible",
]);
const FACT_GRAPH_MIN_OBSERVATION_COUNT_BY_BRANCH = Object.freeze({
  pokemon: 10,
  trainer: 10,
  stadium: 8,
  energy: 7,
  item_tool_supporter: 8,
});
const FACT_GRAPH_V1_DRY_RUN_EXCLUDED_CARD_PRINT_IDS = new Set([
  "2412563a-c73d-5970-a389-f4c1dc35d8c6",
  "0f0ed2c4-7e73-4079-b870-e9a89a3bb4f0",
  "00c2e4db-c4fb-4d8a-aa86-72f355fa8873",
  "45bba21a-4eb5-5217-b13c-5e4bce8ac761",
]);
const FACT_GRAPH_V2_STRESS_ROLES = Object.freeze([
  {
    role: "dense_pokemon_artwork",
    prompt_branch: "pokemon",
    reason: "Dense Pokemon artwork stress: complex creature anatomy, body components, effects, and difficult background.",
  },
  {
    role: "trainer_person_artwork",
    prompt_branch: "trainer",
    reason: "Trainer/person stress: human appearance, clothing, hair, body regions, accessories, gesture, and background.",
  },
  {
    role: "environment_heavy_stadium",
    prompt_branch: "stadium",
    reason: "Environment-heavy Stadium stress: trees, buildings, sky, weather cues when visible, terrain, and counts.",
  },
  {
    role: "object_heavy_item",
    prompt_branch: "item_tool_supporter",
    reason: "Object-heavy Item stress: object parts, colors, shape, material appearance only, and visual effects.",
  },
]);
const FACT_GRAPH_COVERAGE_KEYS = [
  "subjects_review",
  "depicted_subjects_review",
  "character_representations_review",
  "counts_review",
  "scene_layers_review",
  "environment_review",
  "objects_and_props_review",
  "relationships_review",
  "visual_design_review",
  "surface_and_scan_cues_review",
];
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

async function gitOutput(args) {
  try {
    const { stdout } = await execFile("git", args, { cwd: REPO_ROOT });
    return normalizeText(stdout);
  } catch {
    return null;
  }
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

function collapseRepeatedAdjacentWords(value) {
  const words = normalizeText(value).split(/\s+/).filter(Boolean);
  const collapsed = [];
  for (const word of words) {
    if (collapsed.length > 0 && collapsed.at(-1).toLowerCase() === word.toLowerCase()) continue;
    collapsed.push(word);
  }
  return collapsed.join(" ");
}

function normalizeControlledVocabularyFreeText(value) {
  let text = normalizeText(value);
  if (!text) return text;
  text = text.replace(/_/g, " ");
  text = text.replace(/\bhuman trainer visible\b/gi, "human trainer");
  text = text.replace(/\bhuman trainer\b/gi, "human trainer");
  text = text.replace(/\bnight sky\b/gi, "dark sky");
  text = text.replace(/\b(daytime|daylight) sky\b/gi, "bright sky");
  text = text.replace(/\bwater scene\b/gi, "water body");
  text = text.replace(/\bdynamic leaping pose\b/gi, "leaping");
  text = text.replace(/\bleaping pose\b/gi, "leaping");
  text = text.replace(/\b(?:sad or neutral|neutral or sad|neutral\/sad|sad\/neutral)\s+expression\b/gi, "neutral facial evidence");
  text = text.replace(/\b(?:sad or neutral|neutral or sad|neutral\/sad|sad\/neutral)\b/gi, "neutral");
  text = text.replace(/\b(?:cannot determine expression|neutral expression|serious expression)\b/gi, "");
  text = text.replace(CONTROLLED_VOCABULARY_REMOVED_STYLE_TERMS, "").replace(/\s+/g, " ");
  text = text.replace(/\b(determined|confident|fierce|majestic|serious|aggressive|focused|clever|thoughtful|assertive|dynamic|sad|angry|surprised|happy|friendly|cheerful|joyful)\b\s*/gi, "");
  text = collapseRepeatedAdjacentWords(text);
  text = text.replace(/\s+([,.;:])/g, "$1").replace(/^[,.;:\s]+|[,.;:\s]+$/g, "");
  return normalizeText(text);
}

function normalizeObjectiveVisualText(value) {
  return normalizeControlledVocabularyFreeText(value);
}

function normalizeNonSemanticFacialEvidenceText(value) {
  let text = normalizeObjectiveVisualText(value);
  if (!text) return text;
  text = text.replace(/\b(?:angry|annoyed|irritated|aggressive|happy|cheerful|joyful|scared|surprised|sad|friendly|playful|menacing|content(?:ed)?)\s+(expression|face|eyes?|mouth|eyebrows?)\b/gi, "$1");
  text = text.replace(/\b(?:angry|annoyed|irritated|aggressive|happy|cheerful|joyful|scared|surprised|sad|friendly|playful|menacing|content(?:ed)?)\b/gi, "");
  text = text.replace(/\bexpression\b/gi, "facial evidence");
  text = text.replace(/\b(?:appearing|appears|looks?|seems?)\b/gi, "");
  text = text.replace(/\b(?:or|and|with)\s*(?:or|and|with)?\b/gi, " ");
  text = collapseRepeatedAdjacentWords(text);
  text = text.replace(/\s+([,.;:])/g, "$1").replace(/^[,.;:\s]+|[,.;:\s]+$/g, "");
  return normalizeText(text);
}

function hasFacialEvidenceContext(value) {
  return /\b(?:facial|expression|eyes?|mouth|eyebrows?|brows?|face|teeth|fangs?|tongue|smile|smiling|frown|frowning|scowl|scowling|happy|cheerful|joyful|angry|annoyed|irritated|scared|surprised|sad|friendly|playful|menacing|content(?:ed)?)\b/i
    .test(normalizeText(value).replace(/_/g, " "));
}

function normalizeNonSemanticVisualEvidenceText(value) {
  const text = normalizeText(value);
  if (!text) return text;
  return hasFacialEvidenceContext(text)
    ? normalizeNonSemanticFacialEvidenceText(text)
    : normalizeObjectiveVisualText(text);
}

function normalizeRawObservationLabelText(value) {
  let text = normalizeText(value);
  if (!text) return text;
  text = text.replace(/\b(?:sad or neutral|neutral or sad|neutral\/sad|sad\/neutral)\s+expression\b/gi, "neutral facial evidence");
  text = text.replace(/\b(?:sad or neutral|neutral or sad|neutral\/sad|sad\/neutral)\b/gi, "neutral");
  text = text.replace(/\s+([,.;:])/g, "$1").replace(/^[,.;:\s]+|[,.;:\s]+$/g, "");
  return normalizeText(text);
}

function normalizeVisualDesignText(value) {
  let text = normalizeObjectiveVisualText(value);
  if (!text) return text;
  text = text.replace(CONTROLLED_VOCABULARY_REMOVED_VISUAL_DESIGN_TERMS, "").replace(/\s+/g, " ");
  text = text.replace(/\s+([,.;:])/g, "$1").replace(/^[,.;:\s]+|[,.;:\s]+$/g, "");
  return normalizeText(text);
}

function controlledPoseTermsFromText(value) {
  const text = normalizeControlledVocabularyFreeText(value);
  if (!text) return [];
  const terms = [];
  for (const [term, pattern] of CONTROLLED_VOCABULARY_POSE_RULES) {
    if (pattern.test(text)) terms.push(term);
  }
  return uniquePreserving(terms);
}

function normalizePoseTermArray(value) {
  const terms = [];
  for (const raw of normalizeStringArray(value)) {
    const controlled = controlledPoseTermsFromText(raw);
    if (controlled.length > 0) terms.push(...controlled);
    else terms.push(normalizeControlledVocabularyFreeText(raw));
  }
  return uniquePreserving(terms);
}

function normalizeOrientationTerm(value) {
  const text = normalizeControlledVocabularyFreeText(value).toLowerCase();
  if (!text) return "";
  const hasForward = /\b(front(?:-facing)?|forward|toward viewer|facing viewer)\b/.test(text);
  const hasLeft = /\bleft\b/.test(text);
  const hasRight = /\bright\b/.test(text);
  const hasUp = /\b(upward|up|above|diagonal upward)\b/.test(text);
  const hasDown = /\b(downward|down|below|diagonal downward)\b/.test(text);
  if (hasForward && hasRight) return "forward-right";
  if (hasForward && hasLeft) return "forward-left";
  if (hasUp && hasRight) return "upward-right";
  if (hasUp && hasLeft) return "upward-left";
  if (hasDown && hasRight) return "downward-right";
  if (hasDown && hasLeft) return "downward-left";
  if (hasForward) return "forward";
  if (hasRight) return "right";
  if (hasLeft) return "left";
  if (hasUp) return "upward";
  if (hasDown) return "downward";
  return normalizeControlledVocabularyFreeText(value);
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

function escapeRegExp(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function isSubstanceStateAliasText(value) {
  const text = normalizeText(value);
  const key = tagKey(text);
  if (!key) return false;
  if (SUBSTANCE_STATE_ALIAS_KEYS.has(key)) return true;
  const candidateText = text.replace(
    new RegExp(SUBSTANCE_SEARCH_STANDALONE_HIGH_NEGATIVE_PATTERN.source, "gi"),
    " ",
  );
  return SUBSTANCE_STATE_ALIAS_PHRASE_PATTERN.test(candidateText);
}

function hasStandaloneSubstanceHighAlias(value) {
  const text = normalizeText(value);
  const candidateText = text.replace(
    new RegExp(SUBSTANCE_SEARCH_STANDALONE_HIGH_NEGATIVE_PATTERN.source, "gi"),
    " ",
  );
  return /\bhigh\b/i.test(candidateText);
}

function isSubstanceStateAliasLabel(value) {
  const text = normalizeText(value);
  if (isSubstanceStateAliasText(text)) return true;
  return hasStandaloneSubstanceHighAlias(text);
}

function isSubstanceSearchAliasQuery(value) {
  const text = normalizeText(value);
  const key = tagKey(text);
  if (!key) return false;
  if (isSubstanceStateAliasText(text)) return true;
  return hasStandaloneSubstanceHighAlias(text);
}

function matchedSubstanceSearchAliases(value) {
  const text = normalizeText(value);
  const key = tagKey(text);
  const aliases = [];
  for (const alias of SUBSTANCE_STATE_ALIAS_KEYS) {
    if (key === alias || key.includes(alias)) aliases.push(alias);
  }
  if (hasStandaloneSubstanceHighAlias(text)) aliases.push("high");
  return uniquePreserving(aliases);
}

export function mapVisualSearchAliasQueryV1(query) {
  const matchedAliases = matchedSubstanceSearchAliases(query);
  if (matchedAliases.length < 1 || !isSubstanceSearchAliasQuery(query)) {
    return {
      alias_schema_version: CARD_VISUAL_SEARCH_ALIAS_VERSION,
      original_query: normalizeText(query),
      matched_aliases: [],
      query_mode: "literal_visual_terms",
      canonical_visual_concepts: [],
      evidence_concepts_any_of: [],
      explanation: "",
    };
  }

  return {
    alias_schema_version: CARD_VISUAL_SEARCH_ALIAS_VERSION,
    original_query: normalizeText(query),
    matched_aliases: matchedAliases,
    query_mode: "alias_only",
    canonical_visual_concepts: [ALTERED_STATE_VISUAL_CUE_CONCEPT],
    evidence_concepts_any_of: [
      "smoke",
      "vapor or haze",
      "red eyes",
      "half-closed eyes",
      "drooping eyelids",
      "smoking object visual cue",
      "smoke near mouth",
    ],
    explanation: "Maps colloquial substance-state wording to visible cue evidence only; it does not assert that a subject is under the influence.",
  };
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

function flattenFactGraphText(value) {
  const parts = [];
  const visit = (node) => {
    if (node === null || node === undefined) return;
    if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
      parts.push(String(node));
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (typeof node === "object") {
      for (const item of Object.values(node)) visit(item);
    }
  };
  visit(value);
  return normalizeText(parts.join(" "));
}

function isCardUiPrintMarkerObservation(observation) {
  const kind = normalizeText(observation?.kind);
  if (CARD_UI_PRINT_MARKER_OBSERVATION_KIND_PATTERN.test(kind)) return true;
  const id = normalizeText(observation?.observation_id);
  if (/^obs_(?:ui|card_ui|print_marker|copyright|promo|logo|collector|rarity|regulation|illustrator|bottom_line|hp_text|name_text)_/i.test(id)) {
    return true;
  }
  return false;
}

function cardUiObservationIdSet(factGraph) {
  return new Set([
    ...(factGraph?.observations ?? [])
      .filter(isCardUiPrintMarkerObservation)
      .map((observation) => normalizeText(observation.observation_id))
      .filter(Boolean),
    ...cardUiModuleObservationIds(factGraph?.modules?.[CARD_UI_AND_PRINT_MARKERS_MODULE]),
  ]);
}

function factGraphForArtworkLanguageReview(factGraph) {
  if (!factGraph || typeof factGraph !== "object" || Array.isArray(factGraph)) return factGraph;
  const uiObservationIds = cardUiObservationIdSet(factGraph);
  const referencesUiObservation = (ids) => normalizeObservationReferenceArray(ids).some((id) => uiObservationIds.has(id));
  const modules = normalizeObject(factGraph.modules);
  const filteredModules = { ...modules };
  delete filteredModules[CARD_UI_AND_PRINT_MARKERS_MODULE];
  return {
    ...factGraph,
    observations: (factGraph.observations ?? []).filter((observation) => !uiObservationIds.has(normalizeText(observation.observation_id))),
    typed_facts: (factGraph.typed_facts ?? []).filter((fact) =>
      normalizeText(fact.module) !== CARD_UI_AND_PRINT_MARKERS_MODULE
      && !referencesUiObservation(fact.supporting_observation_ids)),
    modules: filteredModules,
    module_reviews: (factGraph.module_reviews ?? []).filter((review) => normalizeText(review.module) !== CARD_UI_AND_PRINT_MARKERS_MODULE),
  };
}

function factGraphForAcceptedLanguageReview(factGraph) {
  if (!factGraph || typeof factGraph !== "object" || Array.isArray(factGraph)) return factGraph;
  return {
    ...factGraph,
    observations: (factGraph.observations ?? []).map((observation) => ({
      ...observation,
      label: observation.normalized_label,
    })),
  };
}

function textFieldsForVisualLanguageReview(payload) {
  const attributes = payload?.visual_attributes ?? {};
  const subjects = attributes.subjects ?? {};
  const environment = attributes.environment ?? {};
  const artworkFactGraph = factGraphForAcceptedLanguageReview(factGraphForArtworkLanguageReview(attributes.fact_graph));
  return [
    ["artwork_description", payload?.artwork_description],
    ["card_surface_and_printing_cues", payload?.card_surface_and_printing_cues],
    ["visual_attributes.subjects.primary", normalizeStringArray(subjects.primary).join(" ")],
    ["visual_attributes.subjects.secondary", normalizeStringArray(subjects.secondary).join(" ")],
    ["visual_attributes.environment.setting", normalizeStringArray(environment.setting).join(" ")],
    ["visual_attributes.mood", normalizeStringArray(attributes.mood).join(" ")],
    ["visual_attributes.distinguishing_details", normalizeStringArray(attributes.distinguishing_details).join(" ")],
    ["visual_attributes.fact_graph", flattenFactGraphText(artworkFactGraph)],
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

function normalizeBorderColorName(value) {
  const text = normalizeText(value).toLowerCase().replace(/grey/g, "gray");
  if (!text) return null;
  if (/\byellow\s*\/\s*gold\b|\bgold\s*\/\s*yellow\b|\byellow-gold\b|\bgolden\b/.test(text)) return "yellow_gold";
  if (text === "yellow" || text === "gold") return text;
  if ([
    "silver",
    "black",
    "white",
    "gray",
    "red",
    "blue",
    "green",
    "purple",
    "brown",
    "orange",
    "bronze",
    "tan",
  ].includes(text)) return text;
  return null;
}

function colorsFromBorderClaim(claim) {
  const colors = [];
  const regex = /\b(silver|gold|yellow|black|white|gray|grey|red|blue|green|purple|brown|orange|bronze|tan|yellow\s*\/\s*gold|gold\s*\/\s*yellow|yellow-gold|golden)\b/gi;
  for (const match of String(claim ?? "").matchAll(regex)) {
    const color = normalizeBorderColorName(match[0]);
    if (color) colors.push(color);
  }
  return uniqueSorted(colors);
}

function normalizeBorderColorEvidence(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = normalizeText(value.source);
  const color = normalizeBorderColorName(value.color ?? value.normalized_color);
  const confidence = Number(value.confidence);
  if (!source || !color || !Number.isFinite(confidence)) return null;
  return {
    source,
    color,
    confidence,
    status: normalizeText(value.status || "supported"),
  };
}

function borderColorEvidenceFor(card = {}) {
  return normalizeBorderColorEvidence(
    card.border_color_evidence
      ?? card.card_border_evidence
      ?? card.visual_evidence?.border_color
      ?? null,
  );
}

function borderColorEvidenceSupportsClaim(card, claim) {
  const evidence = borderColorEvidenceFor(card);
  if (!evidence) return false;
  if (!/^deterministic_/i.test(evidence.source)) return false;
  if (evidence.confidence < MIN_DETERMINISTIC_BORDER_COLOR_CONFIDENCE) return false;
  if (/ambiguous|uncertain|cropped|glare|obscured|mixed|low_resolution/i.test(evidence.status)) return false;
  const claimColors = colorsFromBorderClaim(claim);
  if (claimColors.length === 0) return false;
  if (claimColors.includes(evidence.color)) return true;
  if (evidence.color === "yellow_gold" && (claimColors.includes("yellow") || claimColors.includes("gold"))) return true;
  if ((evidence.color === "yellow" || evidence.color === "gold") && claimColors.includes("yellow_gold")) return true;
  return false;
}

function addBorderColorPolicyResults(results, surfaceText, card = {}) {
  for (const detail of regexDetails({
    flag: "potential_border_color_certainty_issue",
    field: "card_surface_and_printing_cues",
    text: surfaceText,
    pattern: VISUAL_LANGUAGE_BORDER_COLOR_CLAIM_PATTERN,
  })) {
    if (borderColorEvidenceSupportsClaim(card, detail.matched_text)) continue;
    addPolicyResult(results, {
      policyRule: "border_color_claim_requires_deterministic_visual_evidence",
      field: detail.field,
      claim: detail.matched_text,
      supportingEvidence: borderColorEvidenceFor(card)
        ? [stableJson(borderColorEvidenceFor(card))]
        : [],
      qualityFlag: "potential_border_color_certainty_issue",
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
  addBorderColorPolicyResults(results, surfaceText, card);

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
  const factGraph = attributes.fact_graph ?? {};
  const factGraphSceneSubjects = normalizeObjectArray(factGraph.subjects)
    .filter((subject) => subject.subject_kind === "scene_subject")
    .map((subject) => subject.identity)
    .filter(Boolean);
  const factGraphReferencedSubjects = [
    ...factGraphSceneSubjects,
    ...normalizeObjectArray(factGraph.depicted_subjects).map((subject) => subject.represented_identity),
    ...normalizeObjectArray(factGraph.character_representations).map((subject) => subject.represented_identity),
  ].filter(Boolean);
  const primarySubjects = uniquePreserving([...normalizeStringArray(subjects.primary), ...factGraphSceneSubjects]);
  const secondarySubjects = uniquePreserving([...normalizeStringArray(subjects.secondary), ...factGraphReferencedSubjects]);
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
        factGraphSceneSubjects.length > 0 ? "visual_attributes.fact_graph.subjects" : "visual_attributes.subjects.primary",
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

function addFactGraphSubjectKindFlagDetails(details, payload) {
  const factGraph = payload?.visual_attributes?.fact_graph;
  if (!factGraph || typeof factGraph !== "object") return;

  const observations = normalizeObjectArray(factGraph.observations);
  const subjects = normalizeObjectArray(factGraph.subjects);
  const subjectObservationIds = new Set(subjects.map((subject) => normalizeText(subject.observation_id)).filter(Boolean));
  const observationById = new Map(observations.map((observation) => [normalizeText(observation.observation_id), observation]));

  for (const observation of observations) {
    const observationId = normalizeText(observation.observation_id);
    const kind = normalizeText(observation.kind);
    const label = normalizeText([observation.label, observation.normalized_label].filter(Boolean).join(" "));
    if (kind === "scene_subject" && observationId && !subjectObservationIds.has(observationId)) {
      addManualDetail(
        details,
        "potential_subject_kind_classification_confusion",
        "visual_attributes.fact_graph.observations",
        `${observationId}: ${label || "scene_subject observation without subject row"}`,
      );
    }
    if (kind === "scene_subject" && FACT_GRAPH_NON_LIVING_SUBJECT_LABEL_PATTERN.test(label)) {
      addManualDetail(
        details,
        "potential_subject_kind_classification_confusion",
        "visual_attributes.fact_graph.observations",
        `${observationId}: ${label}`,
      );
    }
  }

  for (const subject of subjects) {
    const observationId = normalizeText(subject.observation_id);
    const observation = observationById.get(observationId) ?? {};
    const observationKind = normalizeText(observation.kind);
    const subjectText = normalizeText([
      subject.identity,
      subject.label,
      observation.label,
      observation.normalized_label,
      observationKind,
    ].filter(Boolean).join(" "));

    if (observationKind && !FACT_GRAPH_SCENE_SUBJECT_OBSERVATION_KIND_PATTERN.test(observationKind)) {
      addManualDetail(
        details,
        "potential_subject_kind_classification_confusion",
        "visual_attributes.fact_graph.subjects",
        `${observationId}: observation kind ${observationKind}`,
      );
    }
    if (FACT_GRAPH_NON_LIVING_SUBJECT_LABEL_PATTERN.test(subjectText)) {
      addManualDetail(
        details,
        "potential_subject_kind_classification_confusion",
        "visual_attributes.fact_graph.subjects",
        `${observationId}: ${subjectText}`,
      );
    }
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

function addFactGraphModuleReviewFlagDetails(details, payload) {
  const factGraph = payload?.visual_attributes?.fact_graph;
  if (!factGraph || typeof factGraph !== "object") return;
  const knownFactIds = typedFactIdSet(factGraph);

  for (const moduleName of FACT_GRAPH_MODULE_NAMES) {
    for (const factId of normalizeFactIdArray(factGraph.modules?.[moduleName]?.fact_ids)) {
      if (!knownFactIds.has(factId)) {
        addManualDetail(
          details,
          "potential_module_fact_reference_missing",
          `visual_attributes.fact_graph.modules.${moduleName}.fact_ids`,
          factId,
        );
      }
    }
  }

  for (const review of normalizeModuleReviews(factGraph.module_reviews)) {
    const module = normalizeText(review.module);
    const status = normalizeText(review.review_status);
    const omissionRisk = normalizeText(review.omission_risk);
    const evidenceQuality = normalizeText(review.evidence_quality);
    if (moduleHasEntries(factGraph.modules?.[module]) && ["none_visible", "not_applicable"].includes(status)) {
      addManualDetail(
        details,
        "potential_module_review_conflicts_with_entries",
        "visual_attributes.fact_graph.module_reviews",
        `${module}: status=${status || "missing"}`,
      );
    }
    if (!moduleHasEntries(factGraph.modules?.[module]) && ["complete", "likely_complete"].includes(status)) {
      addManualDetail(
        details,
        "potential_empty_module_marked_complete",
        "visual_attributes.fact_graph.module_reviews",
        `${module}: status=${status || "missing"}`,
      );
    }
    if (
      status.startsWith("partial_")
      || status === "uncertain"
      || ["medium", "high", "unknown"].includes(omissionRisk)
      || ["low", "mixed", "unknown"].includes(evidenceQuality)
    ) {
      addManualDetail(
        details,
        "potential_module_incomplete_or_low_evidence",
        "visual_attributes.fact_graph.module_reviews",
        `${module}: status=${status || "missing"}, omission_risk=${omissionRisk || "missing"}, evidence_quality=${evidenceQuality || "missing"}`,
      );
    }
  }
}

function addFactGraphSupportAndMetadataFlagDetails(details, payload, card = {}, promptBranch = "") {
  const factGraph = payload?.visual_attributes?.fact_graph;
  if (!factGraph || typeof factGraph !== "object") return;

  const knownIds = observationIdSet(factGraph);
  const uiObservationIds = cardUiObservationIdSet(factGraph);
  const environment = factGraph.environment ?? {};
  const weatherText = flattenFactGraphText([environment.setting, environment.sky, environment.terrain]);
  if (/\b(storm|stormy|lightning|thunderstorm|rain|snow|wind|hail|fog)\b/i.test(weatherText) && !hasFactGraphClaimValue(environment.weather)) {
    details.push({
      flag: "potential_weather_field_alignment_missing",
      field: "visual_attributes.fact_graph.environment",
      matched_text: "weather-like setting or sky text without environment.weather",
      policy_rule: "weather_like_environment_terms_should_be_field_aligned",
    });
  }
  const visualDesign = factGraph.visual_design ?? {};
  const designClaimFields = [
    "palette",
    "lighting",
    "shadows",
    "highlights",
    "composition",
    "camera_angle",
    "framing",
    "cropping",
    "depth",
    "motion_cues",
    "motifs",
    "repeated_shapes",
    "style_cues",
  ];
  const designHasClaims = designClaimFields.some((field) => hasFactGraphClaimValue(visualDesign[field]));
  if (designHasClaims && !hasSupportedObservationReferences(visualDesign.supporting_observation_ids, knownIds)) {
    details.push({
      flag: "potential_unsupported_visual_design_claim",
      field: "visual_attributes.fact_graph.visual_design",
      matched_text: "visual_design claims without supporting_observation_ids",
      policy_rule: "fact_graph_visual_design_claims_require_observation_support",
    });
  }

  const cardNameKey = tagKey(card.name);
  for (const term of factGraph.fact_grounded_search_terms ?? []) {
    const termText = normalizeText(term.term);
    const termKey = tagKey(termText);
    const supportIds = normalizeObservationReferenceArray(term.supporting_observation_ids);
    if (GENERIC_OR_NON_VISUAL_TAGS.has(termKey) || NON_PROBLEM_QUALITY_FLAGS.has(termKey)) {
      details.push({
        flag: "potential_generic_or_nonvisual_search_term",
        field: "visual_attributes.fact_graph.fact_grounded_search_terms.term",
        matched_text: termText,
        policy_rule: "fact_grounded_search_terms_must_be_specific_visible_concepts",
      });
    }
    if (supportIds.length > 0 && supportIds.every((id) => uiObservationIds.has(id))) {
      details.push({
        flag: "potential_card_ui_text_in_artwork_search_terms",
        field: "visual_attributes.fact_graph.fact_grounded_search_terms.term",
        matched_text: termText,
        policy_rule: "card_ui_terms_stay_in_print_marker_module_not_artwork_search_terms",
      });
    }
    if (promptBranch !== "pokemon" && cardNameKey && termKey === cardNameKey) {
      details.push({
        flag: "potential_canonical_metadata_in_fact_grounded_search_terms",
        field: "visual_attributes.fact_graph.fact_grounded_search_terms.term",
        matched_text: termText,
        policy_rule: "fact_grounded_search_terms_must_be_visual_not_card_identity",
      });
    }
    if (promptBranch === "energy" && /\b(?:fire|water|grass|lightning|electric|psychic|fighting|darkness|dark|metal|dragon|colorless|fairy)\s+energy\b/i.test(termText)) {
      details.push({
        flag: "potential_canonical_metadata_in_fact_grounded_search_terms",
        field: "visual_attributes.fact_graph.fact_grounded_search_terms.term",
        matched_text: termText,
        policy_rule: "energy_search_terms_must_describe_visible_symbol_not_energy_identity",
      });
    }
  }

  for (const subject of factGraph.subjects ?? []) {
    const poseText = flattenFactGraphText([subject.pose, subject.action_state]);
    if (!/\bstanding\b/i.test(poseText)) continue;
    const supportText = flattenFactGraphText([
      factGraph.relationships,
      factGraph.observations,
      factGraph.environment,
    ]);
    if (!/\b(standing on|feet|foot|legs?|ground|floor|surface|terrain)\b/i.test(supportText)) {
      details.push({
        flag: "potential_pose_or_action_without_visible_support",
        field: "visual_attributes.fact_graph.subjects.pose",
        matched_text: `${subject.observation_id || subject.identity || "unknown"}: ${poseText}`,
        policy_rule: "standing_pose_requires_visible_ground_or_body_support",
      });
    }
  }

  const countIds = new Set((factGraph.counts ?? []).map((count) => normalizeText(count.count_id)).filter(Boolean));
  for (const object of factGraph.objects_and_props ?? []) {
    const observationId = normalizeText(object.observation_id);
    const observation = (factGraph.observations ?? []).find((entry) => normalizeText(entry.observation_id) === observationId);
    const visibilityText = normalizeText([object.visibility, observation?.visibility].filter(Boolean).join(" "));
    const visible = /\b(visible|fully_visible|partially_visible)\b/i.test(visibilityText) && !/\bnot_visible\b/i.test(visibilityText);
    const reference = normalizeText(object.count_reference);
    const hasCountReference = reference && !["none", "not_applicable", "not applicable"].includes(reference);
    if ((reference === "not_visible" && visible) || (hasCountReference && !countIds.has(reference) && reference !== "not_visible")) {
      details.push({
        flag: "potential_count_reference_inconsistent",
        field: "visual_attributes.fact_graph.objects_and_props.count_reference",
        matched_text: `${observationId || object.normalized_label || "unknown"}: ${reference || "missing"}`,
        policy_rule: "object_count_reference_must_match_visible_count",
      });
    }
    const highSalience = normalizeText(observation?.salience) === "high";
    if (visible && highSalience && !hasCountReference) {
      details.push({
        flag: "potential_salient_object_missing_count_reference",
        field: "visual_attributes.fact_graph.objects_and_props.count_reference",
        matched_text: `${observationId || object.normalized_label || "unknown"}: missing count_reference`,
        policy_rule: "salient_visible_objects_should_reference_counts",
      });
    }
    const materialText = normalizeStringArray(object.material_appearance).join(" ");
    if (FACT_GRAPH_UNSUPPORTED_MATERIAL_PATTERN.test(materialText)) {
      details.push({
        flag: "potential_actual_material_claim_without_visual_evidence",
        field: "visual_attributes.fact_graph.objects_and_props.material_appearance",
        matched_text: materialText,
        policy_rule: "material_fields_describe_appearance_only",
      });
    }
  }

  for (const cue of factGraph.surface_and_scan_cues ?? []) {
    const observationId = normalizeText(cue.observation_id);
    if (observationId && !knownIds.has(observationId)) {
      details.push({
        flag: "potential_surface_cue_without_observation_support",
        field: "visual_attributes.fact_graph.surface_and_scan_cues.observation_id",
        matched_text: observationId,
        policy_rule: "surface_and_scan_cues_require_valid_observation_support",
      });
    }
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
  addFactGraphSubjectKindFlagDetails(details, payload);
  addMetadataOrIdentityFlagDetails(details, payload, card);
  addCrossFieldExpressionContradictionFlagDetails(details, payload);
  addEnergyAbstractShapeLiteralizationFlagDetails(details, payload, promptBranch);
  addPrimarySubjectAnatomyOverclaimFlagDetails(details, payload, promptBranch);
  addBranchSpecificMoodOverclaimFlagDetails(details, payload, promptBranch);
  addFactGraphModuleReviewFlagDetails(details, payload);
  addFactGraphSupportAndMetadataFlagDetails(details, payload, card, promptBranch);

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

    if (GENERIC_OR_NON_VISUAL_TAGS.has(key) || metadataKeys.has(key) || key === tagKey(card.name) || isSubstanceStateAliasLabel(tag)) {
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
  if (semantic_tags.length < 1) quality_flags.push("semantic_tags_missing_after_sanitization");

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

function parsePromptBranchListV1(value) {
  const allowed = new Set(PROMPT_BRANCHES);
  const branches = [];
  const seen = new Set();
  for (const rawBranch of parseOrderedCommaList(value)) {
    const branch = normalizeText(rawBranch).toLowerCase();
    if (!branch) continue;
    if (!allowed.has(branch)) {
      throw new Error(`[card-visual-description-agent] unsupported excluded branch: ${branch}`);
    }
    if (seen.has(branch)) continue;
    branches.push(branch);
    seen.add(branch);
  }
  return branches;
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

function v2StressCandidateScore(row, role) {
  const name = normalizeText(row.name);
  let score = 0;
  if (!FACT_GRAPH_V1_DRY_RUN_EXCLUDED_CARD_PRINT_IDS.has(normalizeText(row.card_print_id))) score += 1000;
  if (role.prompt_branch === "pokemon" && /\b(mega|tag team|ex|vmax|vstar|gx)\b/i.test(name)) score += 80;
  if (role.prompt_branch === "trainer" && /\b(cynthia|misty|brock|erika|giovanni|gladion|lillie|trainer|professor|grunt|admin|boss|gym leader)\b/i.test(name)) score += 80;
  if (role.prompt_branch === "stadium" && /\b(city|gym|forest|stadium|storm|tower|cave|mountain|lake|park|field|arena)\b/i.test(name)) score += 80;
  if (role.prompt_branch === "energy" && /\b(energy)\b/i.test(name)) score += 80;
  if (role.prompt_branch === "item_tool_supporter" && /\b(machine|device|tool|gear|bomb|bell|badge|fossil|rod|ball|capsule|blower|scope|camera|map|ticket|switch|receiver|transceiver)\b/i.test(name)) score += 80;
  if (normalizeText(row.image_source) === "identity" || normalizeText(row.image_status) === "exact") score += 20;
  if (row.gv_id) score += 5;
  return score;
}

export function selectV2StressSampleCardsV1(rows) {
  const selected = [];
  const usedIds = new Set();
  for (const role of FACT_GRAPH_V2_STRESS_ROLES) {
    const candidates = rows
      .filter((row) => !usedIds.has(normalizeText(row.card_print_id)))
      .filter((row) => !FACT_GRAPH_V1_DRY_RUN_EXCLUDED_CARD_PRINT_IDS.has(normalizeText(row.card_print_id)))
      .filter((row) => resolveCardPromptMetadata(row).prompt_branch === role.prompt_branch)
      .map((row, index) => ({ row, index, score: v2StressCandidateScore(row, role) }))
      .sort((left, right) => right.score - left.score || left.index - right.index);
    const picked = candidates[0]?.row;
    if (!picked) {
      throw new Error(`[card-visual-description-agent] unable to select V2 stress role: ${role.role}`);
    }
    picked.v2_stress_role = role.role;
    picked.v2_stress_reason = role.reason;
    picked.v2_stress_selection_score = candidates[0].score;
    picked.excluded_prior_fact_graph_v1_cards = true;
    selected.push(picked);
    usedIds.add(normalizeText(picked.card_print_id));
  }
  return selected;
}

function highValueArtworkKeyV1(row) {
  return normalizeText(row.source_card_print_id)
    || normalizeText(row.image_sha256)
    || normalizeText(row.representative_image_url)
    || normalizeText(row.image_url)
    || normalizeText(row.image_alt_url)
    || normalizeText(row.image_path)
    || normalizeText(row.card_print_id);
}

function numericOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function highValueFallbackSignalsV1(row) {
  const signals = [];
  const name = normalizeText(row.name);
  const rarity = normalizeText(row.rarity);
  const setCode = normalizeText(row.set_code);
  const variantKey = normalizeText(row.variant_key);
  const text = `${name} ${rarity} ${variantKey}`;

  const addSignal = (signal, points) => signals.push({ signal, points });
  if (/\b(?:special illustration rare|illustration rare|art rare|sar|sir|alt(?:ernate)? art)\b/i.test(text)) addSignal("illustration_or_special_illustration_signal", 600);
  if (/\b(?:secret|hyper|rainbow|ultra rare|gold|shiny)\b/i.test(text)) addSignal("premium_rarity_signal", 300);
  if (/\b(?:promo|prerelease|winner|staff|championship|trophy)\b/i.test(text)) addSignal("promo_or_event_signal", 300);
  if (/\b(?:ex|gx|vmax|vstar|tag team|mega)\b/i.test(name)) addSignal("popular_mechanic_name_signal", 180);
  if (/\b(?:trainer|cynthia|misty|brock|erika|giovanni|lillie|marnie|iono|acerola|rosa|gladion)\b/i.test(name)) addSignal("trainer_or_named_character_signal", 160);
  if (/\b(?:base|jungle|fossil|rocket|gym|neo|ecard|e-card|ex)\b/i.test(setCode)) addSignal("vintage_or_early_set_signal", 160);
  if (normalizeText(row.current_description_id)) addSignal("existing_current_description_penalty", -500);
  if (normalizeText(row.image_source) === "identity" || normalizeText(row.image_status) === "exact") addSignal("strong_image_source_signal", 40);
  if (normalizeText(row.gv_id)) addSignal("canonical_gv_id_present", 20);
  return signals;
}

function highValueSelectionScoreV1(row) {
  const metric = numericOrNull(row.high_value_metric_usd);
  const signals = highValueFallbackSignalsV1(row);
  const fallbackScore = signals.reduce((sum, item) => sum + item.points, 0);
  const valueScore = metric === null ? 0 : 1_000_000 + Math.min(Math.round(metric * 100), 900_000);
  return valueScore + fallbackScore;
}

export function selectHighValueSampleCardsV1(rows, options = {}) {
  const target = Math.max(0, Number(options.maxCards ?? options.limit ?? DEFAULT_LIMIT));
  const excludedBranches = new Set([
    ...DEFERRED_VISUAL_FACT_PROMPT_BRANCHES,
    ...(Array.isArray(options.excludeBranches) ? options.excludeBranches : []),
  ]);
  const ranked = (Array.isArray(rows) ? rows : [])
    .filter((row) => !excludedBranches.has(resolveCardPromptMetadata(row).prompt_branch))
    .map((row, index) => ({
      row,
      index,
      branch: resolveCardPromptMetadata(row).prompt_branch,
      artworkKey: highValueArtworkKeyV1(row),
      score: highValueSelectionScoreV1(row),
      signals: highValueFallbackSignalsV1(row),
      metric: numericOrNull(row.high_value_metric_usd),
    }))
    .sort((left, right) =>
      right.score - left.score
      || (right.metric ?? -1) - (left.metric ?? -1)
      || normalizeText(left.row.gv_id).localeCompare(normalizeText(right.row.gv_id))
      || left.index - right.index,
    );

  const selected = [];
  const usedArtworkKeys = new Set();
  const usedIds = new Set();
  for (const candidate of ranked) {
    const id = normalizeText(candidate.row.card_print_id);
    if (!id || usedIds.has(id)) continue;
    if (candidate.artworkKey && usedArtworkKeys.has(candidate.artworkKey)) continue;
    selected.push({
      ...candidate.row,
      high_value_rank: selected.length + 1,
      high_value_selection_score: candidate.score,
      high_value_metric_usd: candidate.metric,
      high_value_metric_source: normalizeText(candidate.row.high_value_metric_source) || null,
      high_value_artwork_key: candidate.artworkKey || null,
      high_value_selection_signals: candidate.signals,
      high_value_selection_reason: candidate.metric === null
        ? "fallback_metadata_score"
        : "value_view_metric_score",
    });
    usedIds.add(id);
    if (candidate.artworkKey) usedArtworkKeys.add(candidate.artworkKey);
    if (selected.length >= target) break;
  }

  if (selected.length < target) {
    for (const candidate of ranked) {
      const id = normalizeText(candidate.row.card_print_id);
      if (!id || usedIds.has(id)) continue;
      selected.push({
        ...candidate.row,
        high_value_rank: selected.length + 1,
        high_value_selection_score: candidate.score,
        high_value_metric_usd: candidate.metric,
        high_value_metric_source: normalizeText(candidate.row.high_value_metric_source) || null,
        high_value_artwork_key: candidate.artworkKey || null,
        high_value_selection_signals: [
          ...candidate.signals,
          { signal: "shared_artwork_duplicate_allowed_to_fill_target", points: 0 },
        ],
        high_value_selection_reason: candidate.metric === null
          ? "fallback_metadata_score_shared_artwork_fill"
          : "value_view_metric_score_shared_artwork_fill",
      });
      usedIds.add(id);
      if (selected.length >= target) break;
    }
  }
  return selected;
}

export function filterActiveVisualFactExtractionCardsV1(rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    !DEFERRED_VISUAL_FACT_PROMPT_BRANCHES.has(resolveCardPromptMetadata(row).prompt_branch),
  );
}

function filterExcludedPromptBranchesV1(rows, branches) {
  const excluded = new Set(Array.isArray(branches) ? branches : []);
  if (excluded.size < 1) return rows;
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    !excluded.has(resolveCardPromptMetadata(row).prompt_branch),
  );
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

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeObjectArray(value) {
  return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry)) : [];
}

function normalizeNumberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function normalizeObservationReferenceArray(value) {
  return normalizeStringArray(value);
}

function normalizeFactIdArray(value) {
  return normalizeStringArray(value);
}

function normalizeFactGraphObservations(value) {
  return normalizeObjectArray(value).map((entry) => {
    const observation = {
      observation_id: normalizeText(entry.observation_id),
      kind: normalizeText(entry.kind),
      label: normalizeRawObservationLabelText(entry.label),
      normalized_label: normalizeText(entry.normalized_label || entry.label),
      scene_layer: normalizeText(entry.scene_layer),
      frame_position: normalizeText(entry.frame_position),
      visibility: normalizeText(entry.visibility),
      salience: normalizeText(entry.salience),
      confidence: normalizeConfidence(entry.confidence),
      evidence_strength: normalizeText(entry.evidence_strength),
    };
    const normalizedLabelContext = normalizeText([
      observation.kind,
      observation.normalized_label,
      observation.label,
    ].filter(Boolean).join(" ")).replace(/_/g, " ");
    const labelNormalizer = /\b(?:facial|expression|eyes?|mouth|eyebrows?|face)\b/i.test(normalizedLabelContext)
      ? normalizeNonSemanticFacialEvidenceText
      : normalizeObjectiveVisualText;
    return {
      ...observation,
      normalized_label: isCardUiPrintMarkerObservation(observation)
        ? observation.normalized_label
        : labelNormalizer(observation.normalized_label),
    };
  }).filter((observation) => {
    if (observation.label || observation.normalized_label) return true;
    return !(
      /\b(?:not_visible|not visible|not_applicable|cannot_determine|cannot determine)\b/i.test(normalizeText([
        observation.visibility,
        observation.evidence_strength,
        observation.frame_position,
      ].join(" ")))
    );
  });
}

function normalizeTypedFacts(value) {
  return normalizeObjectArray(value).map((entry) => {
    const module = normalizeFactGraphModuleName(entry.module);
    const fieldPath = normalizeText(entry.field_path) || (module ? `${module}.unspecified` : "");
    const typedFactContext = [module, fieldPath, entry.claim, entry.value].map(normalizeText).join(" ").replace(/_/g, " ");
    const textNormalizer = /\b(?:facial|expression|eyes?|mouth|eyebrows?|face)\b/i.test(typedFactContext)
      ? normalizeNonSemanticFacialEvidenceText
      : normalizeObjectiveVisualText;
    return {
      fact_id: normalizeText(entry.fact_id),
      module,
      field_path: fieldPath,
      claim: textNormalizer(entry.claim),
      value: textNormalizer(entry.value),
      supporting_observation_ids: normalizeObservationReferenceArray(entry.supporting_observation_ids),
      confidence: normalizeConfidence(entry.confidence),
      evidence_strength: normalizeText(entry.evidence_strength),
    };
  });
}

function isAbsentPlaceholderTypedFact(fact) {
  const module = normalizeText(fact?.module);
  const text = tagKey([
    fact?.field_path,
    fact?.claim,
    fact?.value,
    fact?.evidence_strength,
  ].map(normalizeText).filter(Boolean).join(" "));
  const supportIds = normalizeObservationReferenceArray(fact?.supporting_observation_ids);
  if (supportIds.length > 0 || !module || !text) return false;
  if (!["human_appearance", "creature_anatomy", "clothing", "objects_and_props", "surface_and_scan_cues"].includes(module)) {
    return false;
  }
  return /\b(?:none|not applicable|not visible|no visible|false|absent|not observed|cannot determine)\b/i.test(text);
}

function repairObservationReferenceIdToKnown(id, knownIds) {
  const normalized = normalizeText(id);
  if (!normalized || knownIds.has(normalized)) return normalized;
  const candidates = [
    normalized.replace(/^obs_clothes_/, "obs_clothing_"),
    normalized.replace(/^obs_clothing_/, "obs_clothes_"),
    normalized.replace(/_color_(\d+)$/, "_$1"),
    normalized.replace(/_colour_(\d+)$/, "_$1"),
  ].filter((candidate) => candidate && candidate !== normalized);
  return candidates.find((candidate) => knownIds.has(candidate)) ?? normalized;
}

function repairObservationReferencesToKnown(ids, knownIds) {
  const repaired = uniquePreserving(normalizeObservationReferenceArray(ids)
    .map((id) => repairObservationReferenceIdToKnown(id, knownIds))
    .filter(Boolean));
  const known = repaired.filter((id) => knownIds.has(id));
  return known.length > 0 ? known : repaired;
}

function relationshipSupportObservationIdsByRelationshipId(relationships = []) {
  return new Map(normalizeObjectArray(relationships)
    .map((relationship) => [
      normalizeText(relationship.relationship_id),
      uniquePreserving([
        normalizeText(relationship.source_observation_id),
        normalizeText(relationship.target_observation_id),
      ].filter(Boolean)),
    ])
    .filter(([relationshipId, supportIds]) => relationshipId && supportIds.length > 0));
}

function expandFactGraphSupportReferenceIds(ids, maps = []) {
  return uniquePreserving(normalizeObservationReferenceArray(ids)
    .flatMap((reference) => {
      for (const map of maps) {
        const replacement = map?.get?.(reference);
        if (replacement?.length > 0) return replacement;
      }
      return [reference];
    }));
}

function repairModuleObservationReferencesToKnown(value, knownIds) {
  if (!knownIds) return value;
  if (Array.isArray(value)) return value.map((entry) => repairModuleObservationReferencesToKnown(entry, knownIds));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => {
    if (
      key === "observation_ids"
      || key === "supporting_observation_ids"
      || key.endsWith("_observation_ids")
    ) {
      return [key, repairObservationReferencesToKnown(child, knownIds)];
    }
    return [key, repairModuleObservationReferencesToKnown(child, knownIds)];
  }));
}

function normalizeTypedFactsWithCardUiMirrorRepair(value, rawGraph, observations) {
  const knownObservationIds = new Set((observations ?? [])
    .map((observation) => normalizeText(observation.observation_id))
    .filter(Boolean));
  const rawCardUiObservationIds = cardUiModuleObservationIds(rawGraph?.modules?.[CARD_UI_AND_PRINT_MARKERS_MODULE]);
  const typedFacts = normalizeTypedFacts(value)
    .map((fact) => ({
      ...fact,
      supporting_observation_ids: repairObservationReferencesToKnown(fact.supporting_observation_ids, knownObservationIds),
    }))
    .filter((fact) => !isAbsentPlaceholderTypedFact(fact))
    .filter((fact) =>
      normalizeText(fact.module) !== CARD_UI_AND_PRINT_MARKERS_MODULE
      || normalizeObservationReferenceArray(fact.supporting_observation_ids).length > 0);
  const uiObservationIds = new Set(observations
    .filter(isCardUiPrintMarkerObservation)
    .map((observation) => normalizeText(observation.observation_id))
    .filter(Boolean));
  const rawCardUiFactIds = new Set(normalizeFactIdArray(rawGraph?.modules?.[CARD_UI_AND_PRINT_MARKERS_MODULE]?.fact_ids));
  return typedFacts.map((fact) => {
    const factId = normalizeText(fact.fact_id);
    const factSupportIds = normalizeObservationReferenceArray(fact.supporting_observation_ids);
    const supportsUiObservation = factSupportIds.some((id) => uiObservationIds.has(id));
    const supportsRawCardUiModuleObservation = factSupportIds.some((id) => rawCardUiObservationIds.has(id));
    const selfIdentifiedCardUiFact = rawCardUiFactIds.has(factId) || /^fact_card_ui/i.test(factId);
    if (
      (supportsUiObservation || supportsRawCardUiModuleObservation || selfIdentifiedCardUiFact)
      && CARD_UI_PROHIBITED_ARTWORK_MODULES.has(normalizeText(fact.module))
    ) {
      return { ...fact, module: CARD_UI_AND_PRINT_MARKERS_MODULE };
    }
    return fact;
  });
}

function normalizeFacialEvidence(value) {
  const evidence = normalizeObject(value);
  return {
    eyes: normalizeNonSemanticFacialEvidenceText(evidence.eyes),
    mouth: normalizeNonSemanticFacialEvidenceText(evidence.mouth),
    eyebrows: normalizeNonSemanticFacialEvidenceText(evidence.eyebrows),
    face_position: normalizeObjectiveVisualText(evidence.face_position),
    other_visible_evidence: normalizeStringArray(evidence.other_visible_evidence).map(normalizeNonSemanticFacialEvidenceText),
  };
}

function normalizeFactGraphSubjects(value) {
  return normalizeObjectArray(value).map((entry) => ({
    observation_id: normalizeText(entry.observation_id),
    subject_kind: normalizeText(entry.subject_kind),
    identity: normalizeText(entry.identity),
    identity_confidence: normalizeConfidence(entry.identity_confidence),
    anatomy: normalizeStringArray(entry.anatomy).map(normalizeNonSemanticVisualEvidenceText).filter(Boolean),
    physical_features: normalizeStringArray(entry.physical_features).map(normalizeNonSemanticVisualEvidenceText).filter(Boolean),
    pose: normalizePoseTermArray(entry.pose),
    orientation: normalizeOrientationTerm(entry.orientation),
    action_state: normalizeStringArray(entry.action_state).map(normalizeNonSemanticVisualEvidenceText).filter(Boolean),
    facial_evidence: normalizeFacialEvidence(entry.facial_evidence),
    clothing_or_accessories: normalizeStringArray(entry.clothing_or_accessories).map(normalizeNonSemanticVisualEvidenceText).filter(Boolean),
    colors: normalizeStringArray(entry.colors),
    visibility: normalizeText(entry.visibility),
  }));
}

function normalizeDepictedSubjects(value) {
  return normalizeObjectArray(value).map((entry) => ({
    observation_id: normalizeText(entry.observation_id),
    subject_kind: normalizeText(entry.subject_kind),
    represented_identity: normalizeText(entry.represented_identity),
    identity_confidence: normalizeConfidence(entry.identity_confidence),
    host_surface: normalizeText(entry.host_surface),
    surface_type: normalizeText(entry.surface_type),
    visibility: normalizeText(entry.visibility),
    confidence: normalizeConfidence(entry.confidence),
  }));
}

function normalizeCharacterRepresentations(value) {
  return normalizeObjectArray(value).map((entry) => ({
    observation_id: normalizeText(entry.observation_id),
    subject_kind: normalizeText(entry.subject_kind),
    represented_identity: normalizeText(entry.represented_identity),
    identity_confidence: normalizeConfidence(entry.identity_confidence),
    host_object: normalizeText(entry.host_object),
    representation_form: normalizeText(entry.representation_form),
    visibility: normalizeText(entry.visibility),
    confidence: normalizeConfidence(entry.confidence),
  }));
}

function normalizeFactGraphCounts(value) {
  return normalizeObjectArray(value).map((entry) => {
    const rawCountType = normalizeText(entry.count_type);
    const rawExactCount = asNonnegativeInt(entry.exact_count, 0, "fact_graph.counts.exact_count");
    const rawEstimatedMin = asNonnegativeInt(entry.estimated_min, 0, "fact_graph.counts.estimated_min");
    const rawEstimatedMax = asNonnegativeInt(entry.estimated_max, 0, "fact_graph.counts.estimated_max");
    const countType = rawCountType === "many" && rawExactCount > 0
      ? "exact"
      : rawCountType === "many" && rawEstimatedMin > 0 && rawEstimatedMax >= rawEstimatedMin && rawEstimatedMin !== rawEstimatedMax
        ? "estimated_range"
        : rawCountType;
    return {
      count_id: normalizeText(entry.count_id),
      normalized_label: normalizeText(entry.normalized_label),
      count_type: countType,
      exact_count: countType === "exact"
        ? rawExactCount || (rawEstimatedMin === rawEstimatedMax ? rawEstimatedMin : 0)
        : countType === "estimated_range"
          ? 0
          : rawExactCount,
      estimated_min: countType === "estimated_range"
        ? rawEstimatedMin
        : countType === "exact"
          ? 0
          : rawEstimatedMin,
      estimated_max: countType === "estimated_range"
        ? rawEstimatedMax
        : countType === "exact"
          ? 0
          : rawEstimatedMax,
      abstention_reason: normalizeText(entry.abstention_reason),
      supporting_observation_ids: normalizeObservationReferenceArray(entry.supporting_observation_ids),
      scene_layer: normalizeText(entry.scene_layer),
      confidence: normalizeConfidence(entry.confidence),
    };
  });
}

function normalizeFactGraphSceneLayers(value, knownObservationIds = null) {
  const layers = normalizeObject(value);
  const knownIds = knownObservationIds instanceof Set ? knownObservationIds : null;
  const normalizeLayer = (ids) => knownIds
    ? repairObservationReferencesToKnown(ids, knownIds)
    : normalizeObservationReferenceArray(ids);
  return {
    foreground: normalizeLayer(layers.foreground),
    midground: normalizeLayer(layers.midground),
    background: normalizeLayer(layers.background),
  };
}

function normalizeFactGraphEnvironment(value) {
  const environment = normalizeObject(value);
  return {
    setting: normalizeStringArray(environment.setting).map(normalizeObjectiveVisualText).filter(Boolean),
    indoor_outdoor: normalizeText(environment.indoor_outdoor),
    sky: normalizeStringArray(environment.sky).map(normalizeObjectiveVisualText).filter(Boolean),
    ground: normalizeStringArray(environment.ground).map(normalizeObjectiveVisualText).filter(Boolean),
    terrain: normalizeStringArray(environment.terrain).map(normalizeObjectiveVisualText).filter(Boolean),
    plants: normalizeStringArray(environment.plants).map(normalizeObjectiveVisualText).filter(Boolean),
    architecture: normalizeStringArray(environment.architecture).map(normalizeObjectiveVisualText).filter(Boolean),
    water: normalizeStringArray(environment.water).map(normalizeObjectiveVisualText).filter(Boolean),
    weather: normalizeStringArray(environment.weather).map(normalizeObjectiveVisualText).filter(Boolean),
    time_of_day_cues: normalizeStringArray(environment.time_of_day_cues).map(normalizeObjectiveVisualText).filter(Boolean),
    supporting_observation_ids: normalizeObservationReferenceArray(environment.supporting_observation_ids),
  };
}

function factGraphEnvironmentClaimValues(environment) {
  return [
    ...normalizeStringArray(environment.setting),
    normalizeText(environment.indoor_outdoor),
    ...normalizeStringArray(environment.sky),
    ...normalizeStringArray(environment.ground),
    ...normalizeStringArray(environment.terrain),
    ...normalizeStringArray(environment.plants),
    ...normalizeStringArray(environment.architecture),
    ...normalizeStringArray(environment.water),
    ...normalizeStringArray(environment.weather),
    ...normalizeStringArray(environment.time_of_day_cues),
  ].filter(Boolean);
}

function clearUnsupportedFactGraphEnvironmentClaims(environment) {
  return {
    setting: [],
    indoor_outdoor: "",
    sky: [],
    ground: [],
    terrain: [],
    plants: [],
    architecture: [],
    water: [],
    weather: [],
    time_of_day_cues: [],
    supporting_observation_ids: environment.supporting_observation_ids ?? [],
  };
}

function derivedEnvironmentTimeOfDayCues(environment) {
  const text = flattenFactGraphText([environment.setting, environment.sky, environment.time_of_day_cues]);
  const cues = [];
  if (/\b(?:night|nighttime|dark sky|black sky|starry sky)\b/i.test(text)) cues.push("night");
  if (/\b(?:dusk|twilight)\b/i.test(text)) cues.push("dusk");
  if (/\bdawn\b/i.test(text)) cues.push("dawn");
  if (/\bsunrise\b/i.test(text)) cues.push("sunrise");
  if (/\bsunset\b/i.test(text)) cues.push("sunset");
  if (/\b(?:daytime|daylight|sunny|sunlit|blue sky|bright sky)\b/i.test(text)) cues.push("daytime");
  return uniquePreserving(cues);
}

function derivedEnvironmentWeatherClaims(environment) {
  const text = flattenFactGraphText([environment.setting, environment.sky, environment.terrain, environment.weather]);
  const claims = [];
  if (/\bthunderstorm\b/i.test(text)) claims.push("thunderstorm");
  if (/\b(?:rain|rainy|rainfall)\b/i.test(text)) claims.push("rain");
  if (/\b(?:snow|snowy|snowfall)\b/i.test(text)) claims.push("snow");
  if (/\bwind(?:y)?\b/i.test(text)) claims.push("wind");
  if (/\bhail\b/i.test(text)) claims.push("hail");
  if (/\bfog(?:gy)?\b/i.test(text)) claims.push("fog");
  return uniquePreserving(claims);
}

function normalizeEnvironmentAlignmentFields(environment) {
  if (!hasFactGraphClaimValue(environment.supporting_observation_ids)) return environment;
  return {
    ...environment,
    weather: uniquePreserving([
      ...normalizeStringArray(environment.weather),
      ...derivedEnvironmentWeatherClaims(environment),
    ]),
    time_of_day_cues: uniquePreserving([
      ...normalizeStringArray(environment.time_of_day_cues),
      ...derivedEnvironmentTimeOfDayCues(environment),
    ]),
  };
}

function supportingObservationIdsForEnvironmentClaim(claim, observations) {
  const directSupportIds = supportingObservationIdsForSearchTerm(claim, observations ?? [], []);
  if (directSupportIds.length > 0) return directSupportIds;

  const claimText = normalizeText(claim);
  const supportPattern = SEMANTIC_VISUAL_FACT_FOREST_LABEL_PATTERN.test(claimText)
    ? SEMANTIC_VISUAL_FACT_FOREST_SUPPORT_PATTERN
    : SEMANTIC_VISUAL_FACT_RAIN_LABEL_PATTERN.test(claimText)
      ? SEMANTIC_VISUAL_FACT_RAIN_SUPPORT_PATTERN
      : SEMANTIC_VISUAL_FACT_GHOSTLY_ENVIRONMENT_LABEL_PATTERN.test(claimText)
        ? SEMANTIC_VISUAL_FACT_GHOSTLY_ENVIRONMENT_SUPPORT_PATTERN
        : SEMANTIC_VISUAL_FACT_NIGHT_LABEL_PATTERN.test(claimText)
          ? SEMANTIC_VISUAL_FACT_NIGHT_SUPPORT_PATTERN
          : null;
  if (!supportPattern) return [];

  return uniquePreserving((observations ?? [])
    .filter((observation) => !isCardUiPrintMarkerObservation(observation))
    .filter((observation) => supportPattern.test(observationSearchText(observation)))
    .map((observation) => normalizeText(observation.observation_id))
    .filter(Boolean)
    .slice(0, 3));
}

function normalizeFactGraphEnvironmentWithObservationSupport(value, observations) {
  const environment = normalizeFactGraphEnvironment(value);
  const knownIds = new Set((observations ?? [])
    .map((observation) => normalizeText(observation.observation_id))
    .filter(Boolean));
  environment.supporting_observation_ids = environment.supporting_observation_ids.filter((id) => knownIds.has(id));

  const claimValues = factGraphEnvironmentClaimValues(environment);
  if (claimValues.length < 1) return environment;
  if (environment.supporting_observation_ids.length > 0) return normalizeEnvironmentAlignmentFields(environment);

  const inferredSupportIds = uniquePreserving(claimValues.flatMap((claim) =>
    supportingObservationIdsForEnvironmentClaim(claim, observations ?? []))).filter((id) => knownIds.has(id));
  if (inferredSupportIds.length > 0) {
    return normalizeEnvironmentAlignmentFields({
      ...environment,
      supporting_observation_ids: inferredSupportIds,
    });
  }

  return clearUnsupportedFactGraphEnvironmentClaims(environment);
}

function normalizeObjectsAndProps(value) {
  return normalizeObjectArray(value).map((entry) => ({
    observation_id: normalizeText(entry.observation_id),
    label: normalizeText(entry.label),
    normalized_label: normalizeObjectiveVisualText(entry.normalized_label || entry.label),
    object_type: normalizeObjectiveVisualText(entry.object_type),
    colors: normalizeStringArray(entry.colors).map(normalizeObjectiveVisualText).filter(Boolean),
    material_appearance: normalizeStringArray(entry.material_appearance).map(normalizeMaterialAppearanceText),
    location: normalizeText(entry.location),
    count_reference: normalizeText(entry.count_reference),
    confidence: normalizeConfidence(entry.confidence),
  }));
}

function countSupportObservationIdsByCountId(counts) {
  return new Map((counts ?? [])
    .map((count) => [
      normalizeText(count.count_id),
      normalizeObservationReferenceArray(count.supporting_observation_ids),
    ])
    .filter(([countId, supportIds]) => countId && supportIds.length > 0));
}

function observationRepairSearchTextForObject(object) {
  return [
    object.label,
    object.normalized_label,
    object.object_type,
    object.location,
  ].map(normalizeText).filter(Boolean).join(" ");
}

function normalizeObjectsAndPropsWithObservationRepair(value, observations, counts) {
  const objects = normalizeObjectsAndProps(value);
  const knownIds = new Set((observations ?? [])
    .map((observation) => normalizeText(observation.observation_id))
    .filter(Boolean));
  const uiObservationIds = new Set((observations ?? [])
    .filter(isCardUiPrintMarkerObservation)
    .map((observation) => normalizeText(observation.observation_id))
    .filter(Boolean));
  const countSupportById = countSupportObservationIdsByCountId(counts);
  const replacementMap = new Map();

  const repairedObjects = objects.filter((object) => !uiObservationIds.has(normalizeText(object.observation_id))).map((object) => {
    const originalId = normalizeText(object.observation_id);
    if (!originalId || knownIds.has(originalId)) return object;

    const countSupportIds = countSupportById.get(normalizeText(object.count_reference)) ?? [];
    const inferredSupportIds = countSupportIds.length > 0
      ? countSupportIds
      : supportingObservationIdsForSearchTerm(observationRepairSearchTextForObject(object), observations ?? [], []);
    const replacementId = inferredSupportIds.find((id) => knownIds.has(id));
    if (!replacementId) return object;
    replacementMap.set(originalId, replacementId);
    return {
      ...object,
      observation_id: replacementId,
    };
  });

  return {
    objects: repairedObjects,
    replacementMap,
  };
}

function replaceObservationReferenceIds(value, replacementMap) {
  return normalizeObservationReferenceArray(value).map((id) => replacementMap.get(id) ?? id);
}

function repairObjectModuleObservationReferences(modules, replacementMap) {
  if (!(replacementMap instanceof Map) || replacementMap.size < 1) return modules;
  return {
    ...modules,
    objects_and_props: {
      ...modules.objects_and_props,
      object_observation_ids: replaceObservationReferenceIds(
        modules.objects_and_props?.object_observation_ids,
        replacementMap,
      ),
    },
  };
}

function normalizeMaterialAppearanceText(value) {
  let text = normalizeText(value);
  if (!text) return text;
  text = text.replace(/\bmetal\b/gi, "metal-like appearance");
  text = text.replace(/\bplastic\b/gi, "plastic-like appearance");
  text = text.replace(/\bglass\b/gi, "glass-like appearance");
  text = text.replace(/\bwood(?:en)?\b/gi, "wood-like appearance");
  text = text.replace(/\bstone\b/gi, "stone-like appearance");
  text = text.replace(/\brubber\b/gi, "rubber-like appearance");
  text = text.replace(/\bfabric\b/gi, "fabric-like appearance");
  text = text.replace(/\bpaper\b/gi, "paper-like appearance");
  text = text.replace(/\bceramic\b/gi, "ceramic-like appearance");
  text = text.replace(/\bsteel\b/gi, "steel-like appearance");
  text = text.replace(/\biron\b/gi, "iron-like appearance");
  text = text.replace(/\bgold\b/gi, "gold-colored appearance");
  text = text.replace(/\bsilver\b/gi, "silver-colored appearance");
  text = text.replace(/\bshiny\b/gi, "reflective-looking");
  return normalizeText(text);
}

function normalizeRelationships(value) {
  return normalizeObjectArray(value).map((entry) => ({
    relationship_id: normalizeText(entry.relationship_id),
    source_observation_id: normalizeText(entry.source_observation_id),
    target_observation_id: normalizeText(entry.target_observation_id),
    relationship: normalizeText(entry.relationship),
    evidence_strength: normalizeText(entry.evidence_strength),
  }));
}

function normalizeVisualDesign(value) {
  const design = normalizeObject(value);
  return {
    palette: normalizeStringArray(design.palette).map(normalizeVisualDesignText).filter(Boolean),
    lighting: normalizeStringArray(design.lighting).map(normalizeVisualDesignText).filter(Boolean),
    shadows: normalizeStringArray(design.shadows).map(normalizeVisualDesignText).filter(Boolean),
    highlights: normalizeStringArray(design.highlights).map(normalizeVisualDesignText).filter(Boolean),
    composition: normalizeStringArray(design.composition).map(normalizeVisualDesignText).filter(Boolean),
    camera_angle: normalizeVisualDesignText(design.camera_angle),
    framing: normalizeVisualDesignText(design.framing),
    cropping: normalizeStringArray(design.cropping).map(normalizeVisualDesignText).filter(Boolean),
    depth: normalizeVisualDesignText(design.depth),
    motion_cues: normalizeStringArray(design.motion_cues).map(normalizeVisualDesignText).filter(Boolean),
    motifs: normalizeStringArray(design.motifs).map(normalizeVisualDesignText).filter(Boolean),
    repeated_shapes: normalizeStringArray(design.repeated_shapes).map(normalizeVisualDesignText).filter(Boolean),
    style_cues: normalizeStringArray(design.style_cues).map(normalizeVisualDesignText).filter(Boolean),
    supporting_observation_ids: normalizeObservationReferenceArray(design.supporting_observation_ids),
  };
}

function normalizeSurfaceAndScanCues(value) {
  return normalizeObjectArray(value).map((entry) => ({
    observation_id: normalizeText(entry.observation_id),
    cue_type: normalizeText(entry.cue_type),
    cue: normalizeText(entry.cue),
    abstention: normalizeText(entry.abstention),
    confidence: normalizeConfidence(entry.confidence),
  }));
}

function normalizeCoverageReviews(value) {
  const reviews = normalizeObject(value);
  return Object.fromEntries(FACT_GRAPH_COVERAGE_KEYS.map((key) => [key, normalizeText(reviews[key])]));
}

function normalizeUncertaintyAndAbstentions(value) {
  return normalizeObjectArray(value).map((entry) => ({
    field: normalizeText(entry.field),
    reason: normalizeText(entry.reason),
    affected_observation_ids: normalizeObservationReferenceArray(entry.affected_observation_ids),
  }));
}

function normalizeUncertaintyAndAbstentionsWithKnownObservations(value, knownObservationIds) {
  return normalizeUncertaintyAndAbstentions(value).map((entry) => ({
    ...entry,
    affected_observation_ids: entry.affected_observation_ids.filter((id) => knownObservationIds.has(id)),
  }));
}

function normalizeSemanticVisualFactEvidence(value) {
  const evidence = normalizeObject(value);
  return Object.fromEntries(SEMANTIC_VISUAL_FACT_EVIDENCE_FIELDS.map((field) => [
    field,
    normalizeStringArray(evidence[field])
      .map(["mouth", "eyes", "eyebrows", "facial_features"].includes(field)
        ? normalizeNonSemanticFacialEvidenceText
        : normalizeObjectiveVisualText)
      .filter(Boolean),
  ]));
}

function isEvidenceOnlySemanticVisualFactLabel(value) {
  const label = normalizeText(value);
  return Boolean(label && SEMANTIC_VISUAL_FACT_EVIDENCE_ONLY_LABEL_PATTERN.test(label));
}

function normalizeSemanticVisualFactLabelText(value) {
  let label = normalizeText(value);
  if (/\bcannot(?:[-_\s]?determine|_determine)(?:\b|_)/i.test(label) || /\b(?:unknown expression|not visible face details|no visible face details)\b/i.test(label)) {
    return "cannot_determine";
  }
  if (/\b(?:fantasy|magical|mystical|enchanted|dreamlike|ethereal)\s+(?:environment|scene|setting|background)\b/i.test(label)) {
    return "environment";
  }
  label = label
    .replace(/\bgold(?:en)?\s+foil(?:\s+texture)?\b/gi, "gold highlights")
    .replace(/\bsilver\s+foil(?:\s+texture)?\b/gi, "silver highlights")
    .replace(/\bfoil(?:\s+texture)?\b/gi, "reflective-looking highlights");
  if (isEvidenceOnlySemanticVisualFactLabel(label)) {
    return label;
  }
  if (
    label
    && (
      SEMANTIC_VISUAL_FACT_HAPPY_LABEL_PATTERN.test(label)
      || SEMANTIC_VISUAL_FACT_ANGRY_OR_ANNOYED_LABEL_PATTERN.test(label)
      || SEMANTIC_VISUAL_FACT_SCARED_OR_SURPRISED_LABEL_PATTERN.test(label)
      || SEMANTIC_VISUAL_FACT_CONCERNED_LABEL_PATTERN.test(label)
      || SEMANTIC_VISUAL_FACT_SMIRKING_LABEL_PATTERN.test(label)
      || SEMANTIC_VISUAL_FACT_FOCUSED_OR_DETERMINED_LABEL_PATTERN.test(label)
      || SEMANTIC_VISUAL_FACT_ALERT_LABEL_PATTERN.test(label)
      || SEMANTIC_VISUAL_FACT_UPRIGHT_LABEL_PATTERN.test(label)
    )
  ) {
    return label;
  }
  return normalizeObjectiveVisualText(label);
}

function semanticVisualFactSupportObservationText(fact, observations = []) {
  const supportIds = new Set(normalizeObservationReferenceArray(fact?.supporting_observation_ids));
  if (supportIds.size < 1) return "";
  return flattenFactGraphText((observations ?? [])
    .filter((observation) => supportIds.has(normalizeText(observation.observation_id)))
    .map((observation) => [
      observation.kind,
      observation.label,
      observation.normalized_label,
      observation.visibility,
      observation.evidence_strength,
    ]));
}

function semanticVisualFactEvidenceTextWithoutCircularClaims(fact, observations = [], circularPattern = null) {
  let text = flattenFactGraphText([
    Object.values(normalizeSemanticVisualFactEvidence(fact?.evidence)),
    semanticVisualFactSupportObservationText(fact, observations),
  ]);
  if (circularPattern) text = text.replace(circularPattern, " ");
  return normalizeText(text);
}

function semanticVisualFactHasEvidenceBackedSupport(fact, supportPattern, options = {}) {
  const supportText = semanticVisualFactEvidenceTextWithoutCircularClaims(
    fact,
    options.observations ?? [],
    options.circularPattern ?? null,
  );
  return Boolean(supportText && supportPattern.test(supportText));
}

function isUnsupportedEvidenceBackedSemanticVisualFact(fact, options = {}) {
  const label = normalizeText(fact?.label);
  if (!label) return false;

  if (SEMANTIC_VISUAL_FACT_HAPPY_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_HAPPY_SUPPORT_PATTERN, {
      ...options,
      circularPattern: /\bhappy expression\b/gi,
    }) || SEMANTIC_VISUAL_FACT_HAPPY_CONTRADICTION_PATTERN.test(semanticVisualFactEvidenceTextWithoutCircularClaims(fact, options.observations));
  }
  if (SEMANTIC_VISUAL_FACT_ANGRY_OR_ANNOYED_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_ANGRY_OR_ANNOYED_SUPPORT_PATTERN, {
      ...options,
      circularPattern: /\b(?:angry|annoyed|irritated|scowling|frowning|aggressive|fierce)(?:\s+expression)?\b/gi,
    }) || SEMANTIC_VISUAL_FACT_ANGRY_OR_ANNOYED_CONTRADICTION_PATTERN.test(semanticVisualFactEvidenceTextWithoutCircularClaims(fact, options.observations));
  }
  if (SEMANTIC_VISUAL_FACT_SCARED_OR_SURPRISED_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_SCARED_OR_SURPRISED_SUPPORT_PATTERN, {
      ...options,
      circularPattern: /\b(?:scared|surprised|startled) expression\b/gi,
    });
  }
  if (SEMANTIC_VISUAL_FACT_CONCERNED_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_CONCERNED_SUPPORT_PATTERN, {
      ...options,
      circularPattern: /\b(?:concerned|worried|uneasy)(?:\s+(?:expression|face))?\b/gi,
    }) || SEMANTIC_VISUAL_FACT_CONCERNED_CONTRADICTION_PATTERN.test(semanticVisualFactEvidenceTextWithoutCircularClaims(fact, options.observations));
  }
  if (SEMANTIC_VISUAL_FACT_SMIRKING_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_SMIRKING_SUPPORT_PATTERN, {
      ...options,
      circularPattern: /\bsmirking expression\b|\bsmirk(?:ing)?\s+expression\b/gi,
    }) || SEMANTIC_VISUAL_FACT_HAPPY_CONTRADICTION_PATTERN.test(semanticVisualFactEvidenceTextWithoutCircularClaims(fact, options.observations));
  }
  if (SEMANTIC_VISUAL_FACT_FOCUSED_OR_DETERMINED_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_FOCUSED_OR_DETERMINED_SUPPORT_PATTERN, {
      ...options,
      circularPattern: /\b(?:focused|determined|serious|concentrated|intent|intense)(?:\s+expression)?\b/gi,
    }) || SEMANTIC_VISUAL_FACT_FOCUSED_OR_DETERMINED_CONTRADICTION_PATTERN.test(semanticVisualFactEvidenceTextWithoutCircularClaims(fact, options.observations));
  }
  if (SEMANTIC_VISUAL_FACT_ALERT_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_ALERT_SUPPORT_PATTERN, {
      ...options,
      circularPattern: /\balert(?:\s+expression)?\b/gi,
    }) || SEMANTIC_VISUAL_FACT_ALERT_CONTRADICTION_PATTERN.test(semanticVisualFactEvidenceTextWithoutCircularClaims(fact, options.observations));
  }
  if (SEMANTIC_VISUAL_FACT_AWAKE_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_AWAKE_SUPPORT_PATTERN, {
      ...options,
      circularPattern: /\bawake\b/gi,
    }) || SEMANTIC_VISUAL_FACT_AWAKE_CONTRADICTION_PATTERN.test(semanticVisualFactEvidenceTextWithoutCircularClaims(fact, options.observations));
  }
  if (SEMANTIC_VISUAL_FACT_SNARLING_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_SNARLING_SUPPORT_PATTERN, {
      ...options,
      circularPattern: /\bsnarl(?:ing)?\b/gi,
    }) || SEMANTIC_VISUAL_FACT_ROARING_CONTRADICTION_PATTERN.test(semanticVisualFactEvidenceTextWithoutCircularClaims(fact, options.observations));
  }
  if (SEMANTIC_VISUAL_FACT_OBJECTIVE_FACIAL_FEATURE_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_OBJECTIVE_FACIAL_FEATURE_SUPPORT_PATTERN, options);
  }
  if (SEMANTIC_VISUAL_FACT_UPRIGHT_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_UPRIGHT_SUPPORT_PATTERN, options);
  }
  if (SEMANTIC_VISUAL_FACT_SLEEPING_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_SLEEPING_SUPPORT_PATTERN, options)
      || SEMANTIC_VISUAL_FACT_SLEEPING_CONTRADICTION_PATTERN.test(semanticVisualFactEvidenceTextWithoutCircularClaims(fact, options.observations));
  }
  if (SEMANTIC_VISUAL_FACT_FOREST_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_FOREST_SUPPORT_PATTERN, options);
  }
  if (SEMANTIC_VISUAL_FACT_RAIN_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_RAIN_SUPPORT_PATTERN, options);
  }
  if (SEMANTIC_VISUAL_FACT_GHOSTLY_ENVIRONMENT_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_GHOSTLY_ENVIRONMENT_SUPPORT_PATTERN, {
      ...options,
      circularPattern: /\b(?:ghostly|haunted|spooky|halloween|spectral) (?:environment|scene|setting|theme)\b/gi,
    });
  }
  if (SEMANTIC_VISUAL_FACT_NIGHT_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_NIGHT_SUPPORT_PATTERN, options);
  }
  if (SEMANTIC_VISUAL_FACT_CITYSCAPE_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_CITYSCAPE_SUPPORT_PATTERN, {
      ...options,
      circularPattern: /\b(?:cityscape|skyline|urban(?:\s+scene|\s+background)?|city\s+background)\b/gi,
    });
  }
  if (SEMANTIC_VISUAL_FACT_DAYTIME_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_DAYTIME_SUPPORT_PATTERN, options);
  }
  if (SEMANTIC_VISUAL_FACT_ROARING_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_ROARING_SUPPORT_PATTERN, {
      ...options,
      circularPattern: /\broaring\b/gi,
    }) || SEMANTIC_VISUAL_FACT_ROARING_CONTRADICTION_PATTERN.test(semanticVisualFactEvidenceTextWithoutCircularClaims(fact, options.observations));
  }
  if (normalizeText(fact?.category) === "count_semantic" && SEMANTIC_VISUAL_FACT_COUNT_SEMANTIC_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_COUNT_SEMANTIC_SUPPORT_PATTERN, options);
  }
  if (SEMANTIC_VISUAL_FACT_ATTACKING_LABEL_PATTERN.test(label)) {
    return !semanticVisualFactHasEvidenceBackedSupport(fact, SEMANTIC_VISUAL_FACT_ATTACKING_SUPPORT_PATTERN, {
      ...options,
      circularPattern: /\b(?:dynamic\s+)?(?:attacking|attack|striking|hitting)\s+(?:pose|stance|action|motion)\b/gi,
    });
  }
  return false;
}

function isObjectOnlyMisclassifiedCameoSemanticVisualFact(fact, options = {}) {
  const category = normalizeText(fact?.category);
  if (category !== "cameo") return false;
  const label = normalizeSemanticVisualFactLabelText(fact?.label);
  if (!label || !SEMANTIC_VISUAL_FACT_OBJECT_ONLY_CAMEO_LABEL_PATTERN.test(label)) return false;
  const evidenceText = semanticVisualFactEvidenceTextWithoutCircularClaims(fact, options.observations ?? []);
  if (/\b(?:cameo|depicted|plush|pillow|statue|toy|logo|poster|screen|card|sticker|ice cream|character representation)\b/i.test(evidenceText)) {
    return false;
  }
  return SEMANTIC_VISUAL_FACT_OBJECT_ONLY_CAMEO_LABEL_PATTERN.test(flattenFactGraphText([label, evidenceText]));
}

function isCardUiOnlyCameoSemanticVisualFact(fact, options = {}) {
  const category = normalizeText(fact?.category);
  if (category !== "cameo") return false;
  const supportIds = normalizeObservationReferenceArray(fact?.supporting_observation_ids);
  const observationsById = new Map(normalizeObjectArray(options.observations)
    .map((observation) => [normalizeText(observation.observation_id), observation])
    .filter(([id]) => id));
  if (supportIds.length > 0 && supportIds.every((id) => isCardUiPrintMarkerObservation(observationsById.get(id)))) return true;
  return FACT_GRAPH_SEARCH_TERM_CARD_UI_OR_MECHANICS_PATTERN.test(flattenFactGraphText([
    fact?.label,
    semanticVisualFactEvidenceTextWithoutCircularClaims(fact, options.observations ?? []),
  ]));
}

function subjectIdentityOnlyKeys(value) {
  const key = tagKey(normalizeText(value).replace(/δ/gi, " delta "));
  if (!key || isGenericSubjectIdentityKey(key)) return [];
  const stripped = key
    .replace(/\b(?:ex|gx|v|vmax|vstar|lv|level|legend|delta|star|shiny|radiant|mega|m)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return uniquePreserving([key, stripped].filter(Boolean));
}

function stripCountAndIdentitySuffixes(value) {
  return tagKey(normalizeText(value).replace(/δ/gi, " delta "))
    .replace(/^(?:single|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+/, "")
    .replace(/\b(?:ex|gx|v|vmax|vstar|lv|level|legend|delta|star|shiny|radiant)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSubjectIdentityOnlySemanticVisualFact(fact, options = {}) {
  const labelKey = tagKey(fact?.label);
  if (!labelKey) return false;
  const subjectIdentityKeys = new Set(normalizeStringArray(options.subjectIdentities).flatMap(subjectIdentityOnlyKeys).filter(Boolean));
  if (subjectIdentityKeys.has(labelKey)) return true;
  if (/^mega\s+/.test(labelKey) && subjectIdentityKeys.has(labelKey.replace(/^mega\s+/, ""))) return true;
  if (subjectIdentityKeys.has(stripCountAndIdentitySuffixes(labelKey))) return true;
  return false;
}

function shouldDropSemanticVisualFactLabel(value) {
  const label = normalizeText(value);
  return Boolean(
    label
    && (
      SEMANTIC_VISUAL_FACT_EVIDENCE_ONLY_LABEL_PATTERN.test(label)
      || SEMANTIC_VISUAL_FACT_DROP_LABEL_PATTERN.test(label)
      || /^(?:mouth|eyes?|eyebrows?|face|facial evidence|expression|environment|scene|background)$\b/i.test(label)
      || /^(?:pokemon|pok[eé]mon)\s+scene$/i.test(label)
      || /\bcannot[-_\s]?determine\b/i.test(label)
      || /\bcontent(?:ed)?\s+(?:mouth|expression|face)\b/i.test(label)
      || isSubstanceStateAliasLabel(label)
    )
  );
}

function shouldDropSemanticVisualFact(fact, options = {}) {
  return shouldDropSemanticVisualFactLabel(fact?.label)
    || isSubjectIdentityOnlySemanticVisualFact(fact, options)
    || isObjectOnlyMisclassifiedCameoSemanticVisualFact(fact, options)
    || isCardUiOnlyCameoSemanticVisualFact(fact, options)
    || isUnsupportedEvidenceBackedSemanticVisualFact(fact, options);
}

function normalizeSemanticVisualFacts(value, options = {}) {
  const countSupportById = countSupportObservationIdsByCountId(options.counts ?? []);
  const relationshipSupportById = relationshipSupportObservationIdsByRelationshipId(options.relationships ?? []);
  const knownObservationIds = new Set((options.observations ?? [])
    .map((observation) => normalizeText(observation.observation_id))
    .filter(Boolean));
  return normalizeObjectArray(value).map((entry) => ({
    semantic_fact_id: normalizeText(entry.semantic_fact_id),
    category: normalizeText(entry.category),
    label: normalizeSemanticVisualFactLabelText(entry.label),
    subject_observation_id: normalizeText(entry.subject_observation_id),
    supporting_observation_ids: knownObservationIds.size > 0
      ? repairObservationReferencesToKnown(
        expandFactGraphSupportReferenceIds(entry.supporting_observation_ids, [
          countSupportById,
          relationshipSupportById,
        ]),
        knownObservationIds,
      )
      : expandFactGraphSupportReferenceIds(entry.supporting_observation_ids, [
        countSupportById,
        relationshipSupportById,
      ]),
    evidence: normalizeSemanticVisualFactEvidence(entry.evidence),
    confidence: normalizeConfidence(entry.confidence),
    uncertainty: normalizeText(entry.uncertainty),
  })).filter((entry) => entry.label && !shouldDropSemanticVisualFact(entry, options));
}

function searchTermTokens(value) {
  return tagKey(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !SEARCH_TERM_STOP_WORDS.has(token));
}

function isUsefulSearchTermCandidate(value) {
  const key = tagKey(value);
  if (!key) return false;
  if (GENERIC_OR_NON_VISUAL_TAGS.has(key) || NON_PROBLEM_QUALITY_FLAGS.has(key)) return false;
  if (isDisallowedArtworkSearchTerm(value)) return false;
  return searchTermTokens(key).length > 0;
}

function isGenericDerivedObservationTerm(value) {
  return /^(?:clothing|hair|pose|facial expression|face|human face|object|accessory|background|environment|body)$/i.test(normalizeText(value));
}

function normalizeSearchTermText(value) {
  const raw = normalizeText(value).replace(/_/g, " ");
  const shouldPreserveSemanticIntent =
    SEMANTIC_VISUAL_FACT_HAPPY_LABEL_PATTERN.test(raw)
    || SEMANTIC_VISUAL_FACT_ANGRY_OR_ANNOYED_LABEL_PATTERN.test(raw)
    || SEMANTIC_VISUAL_FACT_SCARED_OR_SURPRISED_LABEL_PATTERN.test(raw)
    || SEMANTIC_VISUAL_FACT_CONCERNED_LABEL_PATTERN.test(raw)
    || SEMANTIC_VISUAL_FACT_SMIRKING_LABEL_PATTERN.test(raw)
    || /\b(?:cameo|depicted|plush|pillow|statue|toy|figure|figurine|magnet|logo|icon|sticker|ice cream|shapes?|shaped|character representation)\b/i.test(raw);
  const normalized = shouldPreserveSemanticIntent ? raw : normalizeObjectiveVisualText(raw);
  return normalized
    .replace(/\bpok[eé]mon\s+detective\s+pikachu\s+logo\b/gi, "detective pikachu logo")
    .replace(/\bshiny\b/gi, "reflective-looking")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericSubjectIdentityKey(value) {
  return /^(?:unknown|visible scene subject|scene subject|subject|character|creature|pokemon|pokémon|human|person|trainer|human trainer|visible trainer)$/i.test(normalizeText(value));
}

function shouldPreserveExactIdentityInSearchTerm(value) {
  return /\b(?:happy|smiling|sleeping|asleep|cameo|depicted|poster|screen|plush|pillow|statue|toy|figure|figurine|magnet|logo|icon|sticker|ice cream|shapes?|shaped|character representation)\b/i.test(normalizeText(value));
}

function stripRedundantSubjectIdentityFromSearchTerm(value, subjectIdentityKeys = new Set()) {
  let term = normalizeSearchTermText(value);
  if (!term || subjectIdentityKeys.size < 1) return term;
  if (shouldPreserveExactIdentityInSearchTerm(term)) return term;
  for (const identityKey of [...subjectIdentityKeys].sort((left, right) => right.length - left.length)) {
    if (!identityKey || isGenericSubjectIdentityKey(identityKey)) continue;
    const identityPattern = new RegExp(`\\b${identityKey.split(/\s+/).map(escapeRegExp).join("\\s+")}\\b`, "gi");
    term = term.replace(identityPattern, " ");
  }
  term = term
    .replace(/\s+/g, " ")
    .replace(/^(?:and|with|of|in|on|at|for|the)\s+/i, "")
    .replace(/\s+(?:and|with|of|in|on|at|for|the)$/i, "")
    .trim();
  return normalizeSearchTermText(term);
}

function staleSubjectObservationLabelKeys(subjects = [], observations = []) {
  const observationById = new Map(normalizeObjectArray(observations)
    .map((observation) => [normalizeText(observation.observation_id), observation])
    .filter(([id]) => id));
  const staleKeys = new Set();
  for (const subject of normalizeObjectArray(subjects)) {
    const subjectIdentityKey = tagKey(subject.identity);
    const observation = observationById.get(normalizeText(subject.observation_id));
    if (!subjectIdentityKey || !observation) continue;
    for (const value of [observation.label, observation.normalized_label]) {
      const key = tagKey(value);
      if (!key || key === subjectIdentityKey || isGenericSubjectIdentityKey(key)) continue;
      staleKeys.add(key);
    }
  }
  return staleKeys;
}

function isDisallowedArtworkSearchTerm(value) {
  const term = normalizeText(value);
  const key = tagKey(term);
  return Boolean(
    term
    && (
      GENERIC_OR_NON_VISUAL_TAGS.has(key)
      || FACT_GRAPH_SEARCH_TERM_SURFACE_OR_PRINT_PATTERN.test(term)
      || FACT_GRAPH_SEARCH_TERM_CARD_UI_OR_MECHANICS_PATTERN.test(term)
      || /\b(?:fire|water|grass|lightning|electric|psychic|fighting|darkness|dark|metal|dragon|colorless|fairy)[-\s]+type(?:\s+(?:pokemon|pok[eé]mon|symbol))?\b/i.test(term)
      || /\b[a-z][a-z0-9'-]*[-\s]+like\s+pok[eé]mon\b/i.test(term)
      || /\b(?:watercolor|anime|comic|fantasy|art)\s+style\b/i.test(term)
      || isSubstanceStateAliasLabel(term)
    )
  );
}

function observationSearchText(observation) {
  return [
    observation.label,
    observation.normalized_label,
    observation.kind,
  ].map(normalizeText).filter(Boolean).join(" ");
}

function supportingObservationIdsForSearchTerm(term, observations, typedFacts) {
  const tokens = searchTermTokens(term);
  if (tokens.length < 1) return [];
  const termKey = tagKey(term);
  const scored = [];
  for (const observation of observations.filter((entry) => !isCardUiPrintMarkerObservation(entry))) {
    const id = normalizeText(observation.observation_id);
    if (!id) continue;
    const text = observationSearchText(observation);
    const observationKey = tagKey(text);
    const observationTokens = new Set(searchTermTokens(text));
    const overlap = tokens.filter((token) => observationTokens.has(token)).length;
    const directMatch = Boolean(termKey && observationKey && (observationKey.includes(termKey) || termKey.includes(observationKey)));
    if (directMatch || overlap >= Math.min(tokens.length, 2)) {
      scored.push({
        id,
        score: (directMatch ? 10 : 0) + overlap + (normalizeText(observation.salience) === "high" ? 2 : 0),
      });
    }
  }
  if (scored.length > 0) {
    return uniquePreserving(scored
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map((entry) => entry.id));
  }

  for (const fact of typedFacts ?? []) {
    const factText = [fact.claim, fact.value, fact.field_path].map(normalizeText).filter(Boolean).join(" ");
    const factTokens = new Set(searchTermTokens(factText));
    const overlap = tokens.filter((token) => factTokens.has(token)).length;
    if (overlap >= Math.min(tokens.length, 2)) {
      return normalizeObservationReferenceArray(fact.supporting_observation_ids).slice(0, 3);
    }
  }
  return [];
}

function derivedSearchTermsFromObservations(observations) {
  const derivableSalience = /\b(?:high|medium|salient|moderate|primary|prominent|secondary|background|foreground|detail|clothing|accessory|environment|subject)\b/i;
  const derivableKindOrLabel = /\b(?:object|prop|item|tool|bag|strap|buckle|symbol|emblem|effect|sparkle|star|burst|background|environment|terrain|building|tree|plant|water|sky|cloud|creature|subject|body|wing|tail|horn|claw|mouth|eye|hair|clothing|accessory)\b/i;
  return observations
    .filter((observation) => !isCardUiPrintMarkerObservation(observation))
    .filter((observation) =>
      derivableSalience.test(normalizeText(observation.salience).replace(/_/g, " "))
      || derivableKindOrLabel.test(normalizeText([
        observation.kind,
        observation.normalized_label,
        observation.label,
      ].filter(Boolean).join(" ")).replace(/_/g, " ")))
    .map((observation) => ({
      term: isGenericDerivedObservationTerm(observation.normalized_label)
        ? normalizeText(observation.label)
        : (normalizeText(observation.normalized_label) || normalizeText(observation.label)),
      supporting_observation_ids: [normalizeText(observation.observation_id)].filter(Boolean),
    }))
    .filter((entry) => isUsefulSearchTermCandidate(entry.term) && entry.supporting_observation_ids.length > 0)
    .slice(0, 8);
}

function normalizeFactGroundedSearchTerms(value, counts = [], options = {}) {
  const subjectIdentityKeys = new Set(normalizeStringArray(options.subjectIdentities)
    .map(tagKey)
    .filter((key) => key && !isGenericSubjectIdentityKey(key)));
  const staleSubjectLabelKeys = staleSubjectObservationLabelKeys(options.subjects, options.observations);
  const uiObservationIds = new Set([
    ...(options.observations ?? [])
      .filter(isCardUiPrintMarkerObservation)
      .map((observation) => normalizeText(observation.observation_id))
      .filter(Boolean),
    ...normalizeObservationReferenceArray(options.cardUiObservationIds),
  ]);
  const countSupportById = new Map(
    normalizeObjectArray(counts)
      .map((count) => [normalizeText(count.count_id), normalizeObservationReferenceArray(count.supporting_observation_ids)])
      .filter(([countId, support]) => countId && support.length > 0),
  );
  const relationshipSupportById = relationshipSupportObservationIdsByRelationshipId(options.relationships ?? []);
  const normalized = normalizeObjectArray(value).map((entry) => {
    const rawTerm = normalizeSearchTermText(entry.term);
    return {
      raw_term: rawTerm,
      term: stripRedundantSubjectIdentityFromSearchTerm(rawTerm, subjectIdentityKeys),
      supporting_observation_ids: expandFactGraphSupportReferenceIds(entry.supporting_observation_ids, [
        countSupportById,
        relationshipSupportById,
      ]),
    };
  }).filter((entry) =>
    entry.term
    && !isDisallowedArtworkSearchTerm(entry.raw_term)
    && !isDisallowedArtworkSearchTerm(entry.term)
    && !subjectIdentityKeys.has(tagKey(entry.term))
    && !staleSubjectLabelKeys.has(tagKey(entry.term))
    && !(tagKey(entry.term) === "pikachu" && !subjectIdentityKeys.has("pikachu"))
    && !(entry.supporting_observation_ids.length > 0 && entry.supporting_observation_ids.every((id) => uiObservationIds.has(id))),
  ).map(({ raw_term, ...entry }) => entry);

  const seenTerms = new Set(normalized.map((entry) => tagKey(entry.term)).filter(Boolean));
  for (const term of normalizeStringArray(options.moduleTerms)) {
    const key = tagKey(term);
    if (!key || seenTerms.has(key)) continue;
    const supportingIds = supportingObservationIdsForSearchTerm(term, options.observations ?? [], options.typedFacts ?? []);
    if (supportingIds.length < 1) continue;
    const normalizedTerm = stripRedundantSubjectIdentityFromSearchTerm(term, subjectIdentityKeys);
    const normalizedKey = tagKey(normalizedTerm);
    if (!normalizedTerm || !isUsefulSearchTermCandidate(normalizedTerm) || isDisallowedArtworkSearchTerm(normalizedTerm) || subjectIdentityKeys.has(normalizedKey) || staleSubjectLabelKeys.has(normalizedKey) || seenTerms.has(normalizedKey)) continue;
    normalized.push({ term: normalizedTerm, supporting_observation_ids: supportingIds });
    seenTerms.add(normalizedKey);
  }

  if (normalized.length < 1) {
    for (const entry of derivedSearchTermsFromObservations(options.observations ?? [])) {
      const normalizedTerm = stripRedundantSubjectIdentityFromSearchTerm(entry.term, subjectIdentityKeys);
      const key = tagKey(normalizedTerm);
      if (!key || !isUsefulSearchTermCandidate(normalizedTerm) || isDisallowedArtworkSearchTerm(normalizedTerm) || subjectIdentityKeys.has(key) || staleSubjectLabelKeys.has(key) || seenTerms.has(key)) continue;
      normalized.push({ ...entry, term: normalizedTerm });
      seenTerms.add(key);
    }
  }

  return normalized.filter((entry) =>
    entry.term
    && !isDisallowedArtworkSearchTerm(entry.term)
    && !subjectIdentityKeys.has(tagKey(entry.term))
    && !staleSubjectLabelKeys.has(tagKey(entry.term))
    && !(entry.supporting_observation_ids.length > 0 && entry.supporting_observation_ids.every((id) => uiObservationIds.has(id))),
  );
}

function conceptNamesFromText(value) {
  const text = normalizeControlledVocabularyFreeText(value);
  if (!text) return [];
  const concepts = [];
  for (const [concept, pattern] of CONTROLLED_VOCABULARY_CONCEPT_RULES) {
    if (pattern.test(text)) concepts.push(concept);
  }
  for (const pose of controlledPoseTermsFromText(text)) concepts.push(pose);
  const orientation = normalizeOrientationTerm(text);
  if (orientation && orientation !== text) concepts.push(`${orientation} orientation`);
  return uniquePreserving(concepts);
}

function addCanonicalVisualConcept(candidates, concept, sourceObservationIds, confidence = 0.99) {
  const rawConcept = normalizeText(concept);
  const normalizedConcept =
    SEMANTIC_VISUAL_FACT_HAPPY_LABEL_PATTERN.test(rawConcept)
    || SEMANTIC_VISUAL_FACT_ANGRY_OR_ANNOYED_LABEL_PATTERN.test(rawConcept)
    || SEMANTIC_VISUAL_FACT_SCARED_OR_SURPRISED_LABEL_PATTERN.test(rawConcept)
    || SEMANTIC_VISUAL_FACT_CONCERNED_LABEL_PATTERN.test(rawConcept)
    || SEMANTIC_VISUAL_FACT_SMIRKING_LABEL_PATTERN.test(rawConcept)
    || SEMANTIC_VISUAL_FACT_ALERT_LABEL_PATTERN.test(rawConcept)
      ? tagKey(rawConcept)
      : normalizeControlledVocabularyFreeText(rawConcept);
  const ids = uniquePreserving(sourceObservationIds);
  if (!normalizedConcept || ids.length < 1) return;
  const key = normalizedConcept;
  const existing = candidates.get(key);
  if (existing) {
    existing.source_observation_ids = uniqueSorted([...existing.source_observation_ids, ...ids]);
    existing.confidence = Math.max(existing.confidence, normalizeConfidence(confidence));
    return;
  }
  candidates.set(key, {
    concept: normalizedConcept,
    source_observation_ids: uniqueSorted(ids),
    derivation: "deterministic_rule",
    confidence: normalizeConfidence(confidence),
  });
}

function observationConceptEvidenceText(observation) {
  return [
    observation.normalized_label,
    observation.kind,
  ].map(normalizeText).filter(Boolean).join(" ");
}

function observationSupportsConcept(observation, concept) {
  const normalizedConcept = normalizeControlledVocabularyFreeText(concept);
  const evidenceText = observationConceptEvidenceText(observation);
  const fullObservationText = observationSearchText(observation);
  if (!normalizedConcept || !evidenceText) return false;
  if (normalizedConcept === "water") {
    return /\b(?:water body|water feature|water_feature|lake|river|ocean|sea|pond)\b/i.test(evidenceText);
  }
  if (normalizedConcept === "tree") {
    return /\b(?:trees?|tree group|plant|plant_group|forest|woodland|woods)\b/i.test(evidenceText);
  }
  if (normalizedConcept === "building") {
    return /\b(?:buildings?|architecture|structure|stadium|roof)\b/i.test(evidenceText);
  }
  if (normalizedConcept === "sky") {
    return /\bsky\b/i.test(evidenceText);
  }
  if (normalizedConcept === "cloud") {
    return /\bclouds?\b/i.test(evidenceText);
  }
  if (["red eyes", "half-closed eyes", "drooping eyelids"].includes(normalizedConcept)) {
    return SUBSTANCE_CUE_EYE_PATTERN.test(fullObservationText);
  }
  if (normalizedConcept === "vapor or haze") {
    return /\b(?:visible )?(?:vapor|vapour)\b|\bhaze\b|\bhazy\b/i.test(fullObservationText);
  }
  if (normalizedConcept === "smoking object visual cue" || normalizedConcept === "smoke near mouth") {
    return SUBSTANCE_CUE_EXPLICIT_OBJECT_PATTERN.test(fullObservationText);
  }
  return conceptNamesFromText(evidenceText).includes(normalizedConcept);
}

function addCanonicalVisualConceptForClaim(candidates, concept, sourceObservationIds, observationsById, confidence = 0.99) {
  const knownSupport = uniquePreserving(sourceObservationIds).filter((id) => observationsById.has(id));
  if (knownSupport.length < 1) return;
  const matchingSupport = knownSupport.filter((id) => observationSupportsConcept(observationsById.get(id), concept));
  if (["building", "cloud", "sky", "tree", "water"].includes(normalizeControlledVocabularyFreeText(concept)) && matchingSupport.length < 1) return;
  addCanonicalVisualConcept(candidates, concept, matchingSupport.length > 0 ? matchingSupport : knownSupport.slice(0, 3), confidence);
}

function visualDesignConceptClaimTexts(visualDesign) {
  return [
    ...normalizeStringArray(visualDesign?.composition),
    ...normalizeStringArray(visualDesign?.framing),
    ...normalizeStringArray(visualDesign?.cropping),
    ...normalizeStringArray(visualDesign?.motifs),
    ...normalizeStringArray(visualDesign?.repeated_shapes),
    ...normalizeStringArray(visualDesign?.lighting),
    ...normalizeStringArray(visualDesign?.highlights),
    ...normalizeStringArray(visualDesign?.palette),
    normalizeText(visualDesign?.camera_angle),
    normalizeText(visualDesign?.depth),
  ].map(normalizeVisualDesignText).filter(Boolean);
}

function observationIdsMatchingVisualCue(observations, pattern) {
  return uniquePreserving((observations ?? [])
    .filter((observation) => pattern.test(observationSearchText(observation)))
    .map((observation) => normalizeText(observation.observation_id))
    .filter(Boolean));
}

function deriveAlteredStateVisualCueConcept(candidates, observations) {
  const eyeCueIds = observationIdsMatchingVisualCue(observations, SUBSTANCE_CUE_EYE_PATTERN);
  const smokeOrHazeIds = observationIdsMatchingVisualCue(observations, SUBSTANCE_CUE_SMOKE_OR_HAZE_PATTERN);
  const explicitObjectIds = observationIdsMatchingVisualCue(observations, SUBSTANCE_CUE_EXPLICIT_OBJECT_PATTERN);
  const supportIds = uniquePreserving([
    ...explicitObjectIds,
    ...(eyeCueIds.length > 0 && smokeOrHazeIds.length > 0 ? [...eyeCueIds, ...smokeOrHazeIds] : []),
  ]);
  if (supportIds.length < 1) return;
  addCanonicalVisualConcept(candidates, ALTERED_STATE_VISUAL_CUE_CONCEPT, supportIds.slice(0, 6), 0.86);
}

function deriveCanonicalVisualConceptLayerV1(factGraph) {
  const candidates = new Map();
  const knownIds = observationIdSet(factGraph);
  const observations = (factGraph?.observations ?? []).filter((entry) => !isCardUiPrintMarkerObservation(entry));
  const observationsById = new Map(observations.map((observation) => [
    normalizeText(observation.observation_id),
    observation,
  ]).filter(([id]) => knownIds.has(id)));

  for (const observation of observations) {
    const observationId = normalizeText(observation.observation_id);
    if (!knownIds.has(observationId)) continue;
    const text = [observation.normalized_label, observation.kind, observation.label].map(normalizeText).filter(Boolean).join(" ");
    for (const concept of conceptNamesFromText(text)) {
      if (!observationSupportsConcept(observation, concept)) continue;
      addCanonicalVisualConcept(candidates, concept, [observationId], observation.confidence);
    }
  }

  for (const subject of factGraph?.subjects ?? []) {
    const subjectId = normalizeText(subject.observation_id);
    if (!knownIds.has(subjectId)) continue;
    for (const pose of normalizePoseTermArray(subject.pose)) {
      addCanonicalVisualConcept(candidates, pose, [subjectId], subject.identity_confidence);
    }
    const orientation = normalizeOrientationTerm(subject.orientation);
    if (orientation) addCanonicalVisualConcept(candidates, `${orientation} orientation`, [subjectId], subject.identity_confidence);
  }

  for (const row of factGraph?.modules?.creature_anatomy?.pose_orientation ?? []) {
    const support = normalizeObservationReferenceArray(row.supporting_observation_ids).filter((id) => knownIds.has(id));
    for (const pose of normalizePoseTermArray(row.pose)) addCanonicalVisualConcept(candidates, pose, support, row.confidence);
    const orientation = normalizeOrientationTerm(row.orientation);
    if (orientation) addCanonicalVisualConcept(candidates, `${orientation} orientation`, support, row.confidence);
  }

  const designSupport = normalizeObservationReferenceArray(factGraph?.visual_design?.supporting_observation_ids)
    .filter((id) => knownIds.has(id));
  if (designSupport.length > 0) {
    for (const claimText of visualDesignConceptClaimTexts(factGraph?.visual_design)) {
      const claimSupport = supportingObservationIdsForSearchTerm(claimText, observations, factGraph?.typed_facts ?? [])
        .filter((id) => designSupport.includes(id));
      if (claimSupport.length < 1) continue;
      for (const concept of conceptNamesFromText(claimText)) {
        addCanonicalVisualConceptForClaim(candidates, concept, claimSupport, observationsById, 0.92);
      }
    }
  }

  for (const fact of factGraph?.semantic_visual_facts ?? []) {
    const support = normalizeObservationReferenceArray(fact.supporting_observation_ids).filter((id) => knownIds.has(id));
    if (support.length < 1) continue;
    const label = normalizeText(fact.label);
    if (!label || /\bcannot_determine\b/i.test(label)) continue;
    addCanonicalVisualConcept(candidates, label, support.slice(0, 6), fact.confidence || 0.9);
  }

  deriveAlteredStateVisualCueConcept(candidates, observations);

  return {
    concept_schema_version: CARD_VISUAL_CONTROLLED_VOCABULARY_VERSION,
    concepts: [...candidates.values()]
      .sort((left, right) => left.concept.localeCompare(right.concept)),
  };
}

function normalizeModuleFactIds(value) {
  const module = normalizeObject(value);
  return {
    fact_ids: normalizeFactIdArray(module.fact_ids),
  };
}

function normalizeCountsModule(value) {
  const module = normalizeObject(value);
  const rawFactIds = normalizeFactIdArray(module.fact_ids);
  const misplacedCountIds = rawFactIds.filter((id) => /^count_/i.test(id));
  return {
    fact_ids: rawFactIds.filter((id) => !/^count_/i.test(id)),
    count_ids: uniquePreserving([
      ...normalizeStringArray(module.count_ids),
      ...misplacedCountIds,
    ]),
  };
}

function normalizeFactGraphModuleName(value) {
  const module = normalizeText(value);
  if (!module) return "";
  return FACT_GRAPH_MODULE_ALIASES[module] ?? module;
}

function normalizeCardUiAndPrintMarkersModule(value) {
  const module = normalizeObject(value);
  return {
    ...normalizeModuleFactIds(module),
    ...Object.fromEntries(CARD_UI_PRINT_MARKER_FIELDS.map((field) => [
      field,
      normalizeObservationReferenceArray(module[field]),
    ])),
  };
}

function filterCardUiAndPrintMarkersModuleToKnownObservations(module, knownIds) {
  const normalized = normalizeCardUiAndPrintMarkersModule(module);
  return {
    ...normalized,
    ...Object.fromEntries(CARD_UI_PRINT_MARKER_FIELDS.map((field) => [
      field,
      normalizeObservationReferenceArray(normalized[field]).filter((id) => knownIds.has(id)),
    ])),
  };
}

function reconcileCardUiModuleFactIdsWithTypedFacts(modules, typedFacts, observations) {
  const uiObservationIds = new Set([
    ...(observations ?? [])
      .filter(isCardUiPrintMarkerObservation)
      .map((observation) => normalizeText(observation.observation_id))
      .filter(Boolean),
    ...cardUiModuleObservationIds(modules?.[CARD_UI_AND_PRINT_MARKERS_MODULE]),
  ]);
  if (uiObservationIds.size < 1) return modules;
  const cardUiModule = normalizeObject(modules?.[CARD_UI_AND_PRINT_MARKERS_MODULE]);
  const existingFactIds = normalizeFactIdArray(cardUiModule.fact_ids);
  const typedCardUiFactIds = (typedFacts ?? [])
    .filter((fact) => normalizeText(fact.module) === CARD_UI_AND_PRINT_MARKERS_MODULE)
    .filter((fact) => normalizeObservationReferenceArray(fact.supporting_observation_ids).some((id) => uiObservationIds.has(id)))
    .map((fact) => normalizeText(fact.fact_id))
    .filter(Boolean);
  if (typedCardUiFactIds.length < 1) return modules;
  return {
    ...modules,
    [CARD_UI_AND_PRINT_MARKERS_MODULE]: {
      ...cardUiModule,
      fact_ids: uniquePreserving([...existingFactIds, ...typedCardUiFactIds]),
    },
  };
}

function filterModuleFactIdsToTypedFacts(modules, typedFacts) {
  const factModuleById = new Map((typedFacts ?? [])
    .map((fact) => [normalizeText(fact.fact_id), normalizeText(fact.module)])
    .filter(([factId]) => factId));
  if (factModuleById.size < 1) return modules;
  const next = { ...modules };
  for (const moduleName of FACT_GRAPH_MODULE_NAMES) {
    const module = normalizeObject(next[moduleName]);
    if (!Array.isArray(module.fact_ids)) continue;
    next[moduleName] = {
      ...module,
      fact_ids: normalizeFactIdArray(module.fact_ids).filter((id) => factModuleById.get(id) === moduleName),
    };
  }
  return next;
}

function filterCardUiMirrorLeaksFromArtworkModules(modules, rawGraph, observations) {
  const uiObservationIds = new Set([
    ...observations
      .filter(isCardUiPrintMarkerObservation)
      .map((observation) => normalizeText(observation.observation_id))
      .filter(Boolean),
    ...cardUiModuleObservationIds(modules?.[CARD_UI_AND_PRINT_MARKERS_MODULE]),
  ]);
  const rawCardUiFactIds = new Set(normalizeFactIdArray(rawGraph?.modules?.[CARD_UI_AND_PRINT_MARKERS_MODULE]?.fact_ids));
  if (uiObservationIds.size < 1) return modules;
  const next = { ...modules };
  for (const moduleName of CARD_UI_PROHIBITED_ARTWORK_MODULES) {
    const module = normalizeObject(next[moduleName]);
    if (!Object.keys(module).length) continue;
    const cleaned = {
      ...module,
      fact_ids: normalizeFactIdArray(module.fact_ids).filter((id) => !rawCardUiFactIds.has(id) && !/^fact_card_ui/i.test(id)),
    };
    for (const field of ["observation_ids", "object_observation_ids"]) {
      if (Array.isArray(cleaned[field])) {
        cleaned[field] = normalizeObservationReferenceArray(cleaned[field]).filter((id) => !uiObservationIds.has(id));
      }
    }
    next[moduleName] = cleaned;
  }
  return next;
}

function normalizeVisibleBodyRegions(value) {
  return normalizeObjectArray(value).map((entry) => ({
    subject_observation_id: normalizeText(entry.subject_observation_id),
    region: normalizeObjectiveVisualText(entry.region),
    visibility: normalizeText(entry.visibility),
    details: normalizeStringArray(entry.details).map(normalizeNonSemanticVisualEvidenceText).filter(Boolean),
    supporting_observation_ids: normalizeObservationReferenceArray(entry.supporting_observation_ids),
    confidence: normalizeConfidence(entry.confidence),
  }));
}

function normalizeHumanFacialEvidenceRows(value) {
  return normalizeObjectArray(value).map((entry) => ({
    subject_observation_id: normalizeText(entry.subject_observation_id),
    face_position: normalizeObjectiveVisualText(entry.face_position),
    eyes: normalizeNonSemanticFacialEvidenceText(entry.eyes),
    mouth: normalizeNonSemanticFacialEvidenceText(entry.mouth),
    eyebrows: normalizeNonSemanticFacialEvidenceText(entry.eyebrows),
    other_visible_evidence: normalizeStringArray(entry.other_visible_evidence).map(normalizeNonSemanticFacialEvidenceText).filter(Boolean),
    supporting_observation_ids: normalizeObservationReferenceArray(entry.supporting_observation_ids),
    confidence: normalizeConfidence(entry.confidence),
  }));
}

function normalizeAppearanceRows(value) {
  return normalizeObjectArray(value).map((entry) => ({
    subject_observation_id: normalizeText(entry.subject_observation_id),
    label: normalizeNonSemanticVisualEvidenceText(entry.label),
    details: normalizeStringArray(entry.details).map(normalizeNonSemanticVisualEvidenceText).filter(Boolean),
    supporting_observation_ids: normalizeObservationReferenceArray(entry.supporting_observation_ids),
    confidence: normalizeConfidence(entry.confidence),
  }));
}

function normalizeClothingGarments(value) {
  return normalizeObjectArray(value).map((entry) => ({
    subject_observation_id: normalizeText(entry.subject_observation_id),
    body_area: normalizeObjectiveVisualText(entry.body_area),
    garment: normalizeObjectiveVisualText(entry.garment),
    neckline_type: normalizeObjectiveVisualText(entry.neckline_type),
    sleeve_type: normalizeObjectiveVisualText(entry.sleeve_type),
    colors: normalizeStringArray(entry.colors).map(normalizeObjectiveVisualText).filter(Boolean),
    visible_details: normalizeStringArray(entry.visible_details).map(normalizeObjectiveVisualText).filter(Boolean),
    supporting_observation_ids: normalizeObservationReferenceArray(entry.supporting_observation_ids),
    confidence: normalizeConfidence(entry.confidence),
  }));
}

function normalizeCreatureAnatomyRows(value) {
  return normalizeObjectArray(value).map((entry) => ({
    subject_observation_id: normalizeText(entry.subject_observation_id),
    region: normalizeObjectiveVisualText(entry.region),
    feature: normalizeNonSemanticVisualEvidenceText(entry.feature),
    visibility: normalizeText(entry.visibility),
    colors: normalizeStringArray(entry.colors).map(normalizeObjectiveVisualText).filter(Boolean),
    details: normalizeStringArray(entry.details).map(normalizeNonSemanticVisualEvidenceText).filter(Boolean),
    supporting_observation_ids: normalizeObservationReferenceArray(entry.supporting_observation_ids),
    confidence: normalizeConfidence(entry.confidence),
  }));
}

function normalizePoseOrientationRows(value) {
  return normalizeObjectArray(value).map((entry) => ({
    subject_observation_id: normalizeText(entry.subject_observation_id),
    pose: normalizePoseTermArray(entry.pose),
    orientation: normalizeOrientationTerm(entry.orientation),
    action_state: normalizeStringArray(entry.action_state).map(normalizeNonSemanticVisualEvidenceText).filter(Boolean),
    supporting_observation_ids: normalizeObservationReferenceArray(entry.supporting_observation_ids),
    confidence: normalizeConfidence(entry.confidence),
  }));
}

function normalizeFactGraphModules(value, knownObservationIds = null) {
  const modules = normalizeObject(value);
  const knownIds = knownObservationIds instanceof Set ? knownObservationIds : null;
  const cardUiModule = knownIds
    ? filterCardUiAndPrintMarkersModuleToKnownObservations(modules.card_ui_and_print_markers, knownIds)
    : normalizeCardUiAndPrintMarkersModule(modules.card_ui_and_print_markers);
  const normalizedModules = {
    subjects: {
      ...normalizeModuleFactIds(modules.subjects),
      scene_subject_observation_ids: normalizeObservationReferenceArray(modules.subjects?.scene_subject_observation_ids),
      depicted_subject_observation_ids: normalizeObservationReferenceArray(modules.subjects?.depicted_subject_observation_ids),
      character_representation_observation_ids: normalizeObservationReferenceArray(modules.subjects?.character_representation_observation_ids),
    },
    human_appearance: {
      ...normalizeModuleFactIds(modules.human_appearance),
      visible_body_regions: normalizeVisibleBodyRegions(modules.human_appearance?.visible_body_regions),
      facial_evidence: normalizeHumanFacialEvidenceRows(modules.human_appearance?.facial_evidence),
      hair: normalizeAppearanceRows(modules.human_appearance?.hair),
      gestures: normalizeAppearanceRows(modules.human_appearance?.gestures),
      accessories: normalizeAppearanceRows(modules.human_appearance?.accessories),
    },
    creature_anatomy: {
      ...normalizeModuleFactIds(modules.creature_anatomy),
      body_regions: normalizeCreatureAnatomyRows(modules.creature_anatomy?.body_regions),
      physical_features: normalizeCreatureAnatomyRows(modules.creature_anatomy?.physical_features),
      pose_orientation: normalizePoseOrientationRows(modules.creature_anatomy?.pose_orientation),
      effects: normalizeAppearanceRows(modules.creature_anatomy?.effects),
    },
    clothing: {
      ...normalizeModuleFactIds(modules.clothing),
      garments: normalizeClothingGarments(modules.clothing?.garments),
      accessories: normalizeAppearanceRows(modules.clothing?.accessories),
    },
    objects_and_props: {
      ...normalizeModuleFactIds(modules.objects_and_props),
      object_observation_ids: normalizeObservationReferenceArray(modules.objects_and_props?.object_observation_ids),
    },
    environment: {
      ...normalizeModuleFactIds(modules.environment),
      observation_ids: normalizeObservationReferenceArray(modules.environment?.observation_ids),
    },
    composition: {
      ...normalizeModuleFactIds(modules.composition),
      observation_ids: normalizeObservationReferenceArray(modules.composition?.observation_ids),
    },
    color_and_light: {
      ...normalizeModuleFactIds(modules.color_and_light),
      observation_ids: normalizeObservationReferenceArray(modules.color_and_light?.observation_ids),
    },
    visual_effects: {
      ...normalizeModuleFactIds(modules.visual_effects),
      observation_ids: normalizeObservationReferenceArray(modules.visual_effects?.observation_ids),
    },
    card_ui_and_print_markers: cardUiModule,
    counts: {
      ...normalizeCountsModule(modules.counts),
    },
    relationships: {
      ...normalizeModuleFactIds(modules.relationships),
      relationship_ids: normalizeStringArray(modules.relationships?.relationship_ids),
    },
    surface_and_scan_cues: {
      ...normalizeModuleFactIds(modules.surface_and_scan_cues),
      observation_ids: normalizeObservationReferenceArray(modules.surface_and_scan_cues?.observation_ids),
    },
    uncertainty_and_abstentions: {
      ...normalizeModuleFactIds(modules.uncertainty_and_abstentions),
      fields: normalizeStringArray(modules.uncertainty_and_abstentions?.fields),
    },
    fact_grounded_search_terms: {
      ...normalizeModuleFactIds(modules.fact_grounded_search_terms),
      terms: normalizeStringArray(modules.fact_grounded_search_terms?.terms),
    },
  };
  return knownIds ? repairModuleObservationReferencesToKnown(normalizedModules, knownIds) : normalizedModules;
}

function normalizeModuleReviews(value, knownObservationIds = null) {
  return normalizeObjectArray(value).map((entry) => ({
    module: normalizeFactGraphModuleName(entry.module),
    review_status: normalizeText(entry.review_status),
    omission_risk: normalizeText(entry.omission_risk),
    evidence_quality: normalizeText(entry.evidence_quality),
    abstentions: normalizeObjectArray(entry.abstentions).map((abstention) => ({
      field_path: normalizeText(abstention.field_path),
      reason: normalizeText(abstention.reason),
      affected_observation_ids: normalizeObservationReferenceArray(abstention.affected_observation_ids)
        .filter((id) => !knownObservationIds || knownObservationIds.has(id)),
    })),
  }));
}

function factGraphModuleContentIsPresent(moduleName, modules) {
  return moduleHasEntries(normalizeObject(modules?.[moduleName]));
}

function derivedModuleReviewStatus(moduleName, modules, coverageReviews) {
  const coverageKey = FACT_GRAPH_MODULE_COVERAGE_KEY_BY_MODULE[moduleName];
  const coverageStatus = normalizeText(coverageReviews?.[coverageKey]);
  const hasContent = factGraphModuleContentIsPresent(moduleName, modules);
  if (hasContent) {
    return {
      module: moduleName,
      review_status: "uncertain",
      omission_risk: "unknown",
      evidence_quality: "unknown",
      abstentions: [{
        field_path: moduleName,
        reason: "module review was omitted by the model; content exists but completeness cannot be determined deterministically",
        affected_observation_ids: [],
      }],
    };
  }
  if (coverageStatus === "none_visible" || coverageStatus === "not_applicable") {
    return {
      module: moduleName,
      review_status: coverageStatus,
      omission_risk: "none",
      evidence_quality: coverageStatus === "none_visible" ? "high" : "not_applicable",
      abstentions: [],
    };
  }
  if (coverageStatus && coverageStatus !== "observed") {
    return {
      module: moduleName,
      review_status: "uncertain",
      omission_risk: "unknown",
      evidence_quality: "unknown",
      abstentions: [{
        field_path: moduleName,
        reason: `coverage review is ${coverageStatus}, but the module review was omitted by the model`,
        affected_observation_ids: [],
      }],
    };
  }
  return {
    module: moduleName,
    review_status: "uncertain",
    omission_risk: "unknown",
    evidence_quality: "unknown",
    abstentions: [{
      field_path: moduleName,
      reason: "module review was omitted by the model and no explicit coverage status can prove completeness",
      affected_observation_ids: [],
    }],
  };
}

function addDerivedMissingModuleReviews(reviews, modules, coverageReviews = {}) {
  const reviewsByModule = new Map(reviews.map((review) => [normalizeFactGraphModuleName(review.module), review]));
  const next = [...reviews];
  for (const moduleName of FACT_GRAPH_MODULE_NAMES) {
    if (reviewsByModule.has(moduleName)) continue;
    next.push(derivedModuleReviewStatus(moduleName, modules, coverageReviews));
  }
  return next;
}

function cardUiModuleObservationIds(module) {
  const normalized = normalizeCardUiAndPrintMarkersModule(module);
  return new Set(CARD_UI_PRINT_MARKER_FIELDS
    .flatMap((field) => normalizeObservationReferenceArray(normalized[field]))
    .filter(Boolean));
}

function isUnreadableOrWeakCardUiObservation(observation) {
  const text = normalizeText([
    observation?.label,
    observation?.normalized_label,
    observation?.visibility,
    observation?.evidence_strength,
  ].filter(Boolean).join(" "));
  return /\b(unreadable|illegible|too small|cannot_determine|low_resolution|blurred|glare|weak)\b/i.test(text);
}

function normalizeModuleReviewsWithDerivedCardUiAbstentions(value, knownObservationIds, observations, modules, coverageReviews = {}) {
  const reviews = addDerivedMissingModuleReviews(
    normalizeModuleReviews(value, knownObservationIds),
    modules,
    coverageReviews,
  );
  const uiIds = new Set([
    ...cardUiModuleObservationIds(modules?.[CARD_UI_AND_PRINT_MARKERS_MODULE]),
    ...observations
      .filter(isCardUiPrintMarkerObservation)
      .map((observation) => normalizeText(observation.observation_id))
      .filter(Boolean),
  ]);
  const unreadableIds = observations
    .filter((observation) => uiIds.has(normalizeText(observation.observation_id)) && isUnreadableOrWeakCardUiObservation(observation))
    .map((observation) => normalizeText(observation.observation_id))
    .filter(Boolean);
  if (unreadableIds.length < 1) return reviews;

  return reviews.map((review) => {
    if (normalizeText(review.module) !== CARD_UI_AND_PRINT_MARKERS_MODULE) return review;
    const existingIds = new Set((review.abstentions ?? []).flatMap((entry) => entry.affected_observation_ids ?? []));
    const missingIds = unreadableIds.filter((id) => !existingIds.has(id));
    if (missingIds.length < 1) return review;
    return {
      ...review,
      review_status: review.review_status === "complete" ? "likely_complete" : review.review_status,
      evidence_quality: review.evidence_quality === "high" ? "mixed" : review.evidence_quality,
      abstentions: [
        ...(review.abstentions ?? []),
        ...missingIds.map((id) => ({
          field_path: `${CARD_UI_AND_PRINT_MARKERS_MODULE}.unreadable_or_weak_text`,
          reason: "card UI text is explicitly marked unreadable, weak, or cannot be determined in the observation",
          affected_observation_ids: [id],
        })),
      ],
    };
  });
}

function applySubjectIdentityFallbacks(subjects, observations) {
  const observationLabelById = new Map(observations.map((observation) => [
    normalizeText(observation.observation_id),
    normalizeText(observation.label) || normalizeText(observation.normalized_label),
  ]));
  return subjects.map((subject) => {
    if (normalizeText(subject.identity)) return subject;
    const fallbackIdentity = observationLabelById.get(normalizeText(subject.observation_id)) || "visible scene subject";
    return {
      ...subject,
      identity: fallbackIdentity,
      identity_confidence: subject.identity_confidence || 0.5,
    };
  });
}

function normalizeFactGraphV1(value) {
  const graph = normalizeObject(value);
  const counts = normalizeFactGraphCounts(graph.counts);
  const observations = normalizeFactGraphObservations(graph.observations);
  const knownObservationIds = new Set(observations.map((observation) => normalizeText(observation.observation_id)).filter(Boolean));
  const relationships = normalizeRelationships(graph.relationships)
    .filter((relationship) =>
      knownObservationIds.has(normalizeText(relationship.source_observation_id))
      && knownObservationIds.has(normalizeText(relationship.target_observation_id)));
  const typedFacts = normalizeTypedFactsWithCardUiMirrorRepair(graph.typed_facts, graph, observations);
  const subjects = applySubjectIdentityFallbacks(normalizeFactGraphSubjects(graph.subjects), observations);
  const depictedSubjects = normalizeDepictedSubjects(graph.depicted_subjects);
  const characterRepresentations = normalizeCharacterRepresentations(graph.character_representations);
  const subjectIdentities = [
    ...subjects.map((subject) => subject.identity),
    ...depictedSubjects.map((subject) => subject.represented_identity),
    ...characterRepresentations.map((subject) => subject.represented_identity),
  ];
  const semanticVisualFacts = normalizeSemanticVisualFacts(graph.semantic_visual_facts, {
    observations,
    subjectIdentities,
    counts,
    relationships,
  });
  const { objects: objectsAndProps, replacementMap: objectObservationReplacementMap } =
    normalizeObjectsAndPropsWithObservationRepair(graph.objects_and_props, observations, counts);
  const rawCardUiObservationIds = cardUiModuleObservationIds(graph.modules?.[CARD_UI_AND_PRINT_MARKERS_MODULE]);
  const searchTerms = normalizeFactGroundedSearchTerms(graph.fact_grounded_search_terms, counts, {
    observations,
    typedFacts,
    moduleTerms: graph.modules?.fact_grounded_search_terms?.terms,
    cardUiObservationIds: rawCardUiObservationIds,
    subjectIdentities,
    subjects,
    relationships,
  });
  let modules = filterCardUiMirrorLeaksFromArtworkModules(
    repairObjectModuleObservationReferences(
      normalizeFactGraphModules(graph.modules, knownObservationIds),
      objectObservationReplacementMap,
    ),
    graph,
    observations,
  );
  modules = reconcileCardUiModuleFactIdsWithTypedFacts(modules, typedFacts, observations);
  modules = filterModuleFactIdsToTypedFacts(modules, typedFacts);
  modules.fact_grounded_search_terms.terms = searchTerms.map((entry) => entry.term);
  const cardUiIdsForArtworkFiltering = new Set([
    ...rawCardUiObservationIds,
    ...cardUiModuleObservationIds(modules[CARD_UI_AND_PRINT_MARKERS_MODULE]),
    ...observations
      .filter(isCardUiPrintMarkerObservation)
      .map((observation) => normalizeText(observation.observation_id))
      .filter(Boolean),
  ]);
  const artworkObjectsAndProps = objectsAndProps.filter((object) =>
    !cardUiIdsForArtworkFiltering.has(normalizeText(object.observation_id)));
  const moduleReviews = normalizeModuleReviewsWithDerivedCardUiAbstentions(
    graph.module_reviews,
    knownObservationIds,
    observations,
    modules,
    normalizeCoverageReviews(graph.coverage_reviews),
  );
  const visualDesign = normalizeVisualDesign(graph.visual_design);
  visualDesign.supporting_observation_ids = visualDesign.supporting_observation_ids.filter((id) => knownObservationIds.has(id));
  const normalizedGraph = {
    observations,
    typed_facts: typedFacts,
    subjects,
    depicted_subjects: depictedSubjects,
    character_representations: characterRepresentations,
    counts,
    scene_layers: normalizeFactGraphSceneLayers(graph.scene_layers, knownObservationIds),
    environment: normalizeFactGraphEnvironmentWithObservationSupport(graph.environment, observations),
    objects_and_props: artworkObjectsAndProps,
    relationships,
    visual_design: visualDesign,
    surface_and_scan_cues: normalizeSurfaceAndScanCues(graph.surface_and_scan_cues),
    coverage_reviews: normalizeCoverageReviews(graph.coverage_reviews),
    modules,
    module_reviews: moduleReviews,
    semantic_visual_facts: semanticVisualFacts,
    uncertainty_and_abstentions: normalizeUncertaintyAndAbstentionsWithKnownObservations(graph.uncertainty_and_abstentions, knownObservationIds),
    fact_grounded_search_terms: searchTerms,
  };
  return {
    ...normalizedGraph,
    canonical_visual_concepts: deriveCanonicalVisualConceptLayerV1(normalizedGraph),
  };
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
    fact_schema_version: normalizeText(attributes.fact_schema_version),
    fact_graph: normalizeFactGraphV1(attributes.fact_graph),
  };
}

export function parseCardVisualDescriptionArgsV1(argv = []) {
  let maxRetriesConfigured = normalizeText(process.env.CARD_VISUAL_DESCRIPTION_OPENAI_MAX_RETRIES) !== "";
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
    openaiRequestTimeoutMs: asPositiveInt(process.env.CARD_VISUAL_DESCRIPTION_OPENAI_REQUEST_TIMEOUT_MS, DEFAULT_OPENAI_REQUEST_TIMEOUT_MS, "CARD_VISUAL_DESCRIPTION_OPENAI_REQUEST_TIMEOUT_MS"),
    concurrency: asPositiveInt(process.env.CARD_VISUAL_DESCRIPTION_CONCURRENCY, DEFAULT_CONCURRENCY, "CARD_VISUAL_DESCRIPTION_CONCURRENCY"),
    maxRunCostUsd: asNumber(process.env.CARD_VISUAL_DESCRIPTION_MAX_RUN_COST_USD ?? process.env.OPENAI_MAX_RUN_COST_USD, null, "CARD_VISUAL_DESCRIPTION_MAX_RUN_COST_USD"),
    maxCards: asNonnegativeInt(process.env.CARD_VISUAL_DESCRIPTION_MAX_CARDS, null, "CARD_VISUAL_DESCRIPTION_MAX_CARDS"),
    harvestMaxValidationFailureRate: asNumber(
      process.env.CARD_VISUAL_DESCRIPTION_HARVEST_MAX_VALIDATION_FAILURE_RATE,
      DEFAULT_HARVEST_MAX_VALIDATION_FAILURE_RATE,
      "CARD_VISUAL_DESCRIPTION_HARVEST_MAX_VALIDATION_FAILURE_RATE",
    ),
    harvestMaxValidationFailures: asNonnegativeInt(
      process.env.CARD_VISUAL_DESCRIPTION_HARVEST_MAX_VALIDATION_FAILURES,
      null,
      "CARD_VISUAL_DESCRIPTION_HARVEST_MAX_VALIDATION_FAILURES",
    ),
    openaiInputCostPerMillion: asNumber(process.env.OPENAI_INPUT_COST_PER_MILLION, null, "OPENAI_INPUT_COST_PER_MILLION"),
    openaiOutputCostPerMillion: asNumber(process.env.OPENAI_OUTPUT_COST_PER_MILLION, null, "OPENAI_OUTPUT_COST_PER_MILLION"),
    openaiCachedInputCostPerMillion: asNumber(process.env.OPENAI_CACHED_INPUT_COST_PER_MILLION, null, "OPENAI_CACHED_INPUT_COST_PER_MILLION"),
    openaiImageCostRuleVersion: normalizeText(process.env.OPENAI_IMAGE_COST_RULE_VERSION) || null,
    cardPrintId: normalizeText(process.env.CARD_VISUAL_DESCRIPTION_CARD_PRINT_ID) || null,
    cardPrintIds: parseOrderedCommaList(process.env.CARD_VISUAL_DESCRIPTION_CARD_PRINT_IDS),
    gvId: normalizeText(process.env.CARD_VISUAL_DESCRIPTION_GV_ID) || null,
    branchStratifiedSample: asBoolean(process.env.CARD_VISUAL_DESCRIPTION_BRANCH_STRATIFIED_SAMPLE, false, "CARD_VISUAL_DESCRIPTION_BRANCH_STRATIFIED_SAMPLE"),
    v2StressSample: asBoolean(process.env.CARD_VISUAL_DESCRIPTION_V2_STRESS_SAMPLE, false, "CARD_VISUAL_DESCRIPTION_V2_STRESS_SAMPLE"),
    highValueSample: asBoolean(process.env.CARD_VISUAL_DESCRIPTION_HIGH_VALUE_SAMPLE, false, "CARD_VISUAL_DESCRIPTION_HIGH_VALUE_SAMPLE"),
    excludeBranches: parsePromptBranchListV1(process.env.CARD_VISUAL_DESCRIPTION_EXCLUDE_BRANCHES),
    branchTargetsSpec: normalizeText(process.env.CARD_VISUAL_DESCRIPTION_BRANCH_TARGETS),
    branchTargets: null,
    branchCandidateLimit: asPositiveInt(process.env.CARD_VISUAL_DESCRIPTION_BRANCH_CANDIDATE_LIMIT, null, "CARD_VISUAL_DESCRIPTION_BRANCH_CANDIDATE_LIMIT"),
    forceVersion: false,
    allowFixtureApply: false,
    outDirExplicit: false,
    resumeRunDir: normalizeText(process.env.CARD_VISUAL_DESCRIPTION_RESUME_RUN_DIR)
      ? path.resolve(process.env.CARD_VISUAL_DESCRIPTION_RESUME_RUN_DIR)
      : null,
  };

  let explicitMode = null;
  for (const arg of argv) {
    if (arg === "--plan") explicitMode = "plan";
    else if (arg === "--dry-run") explicitMode = "dry_run";
    else if (arg === "--harvest") explicitMode = "harvest";
    else if (arg === "--apply") explicitMode = "apply";
    else if (arg === "--force-version") parsed.forceVersion = true;
    else if (arg === "--allow-fixture-apply") parsed.allowFixtureApply = true;
    else if (arg.startsWith("--limit=")) parsed.limit = asPositiveInt(arg.slice("--limit=".length), DEFAULT_LIMIT, "--limit");
    else if (arg.startsWith("--out-dir=")) {
      parsed.outDir = path.resolve(arg.slice("--out-dir=".length));
      parsed.outDirExplicit = true;
    }
    else if (arg.startsWith("--resume-run-dir=")) parsed.resumeRunDir = path.resolve(arg.slice("--resume-run-dir=".length));
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
    else if (arg === "--v2-stress-sample") parsed.v2StressSample = true;
    else if (arg === "--high-value-sample") parsed.highValueSample = true;
    else if (arg.startsWith("--exclude-branches=")) parsed.excludeBranches = parsePromptBranchListV1(arg.slice("--exclude-branches=".length));
    else if (arg.startsWith("--branch-targets=")) parsed.branchTargetsSpec = normalizeText(arg.slice("--branch-targets=".length));
    else if (arg.startsWith("--branch-candidate-limit=")) parsed.branchCandidateLimit = asPositiveInt(arg.slice("--branch-candidate-limit=".length), null, "--branch-candidate-limit");
    else if (arg.startsWith("--min-width=")) parsed.minWidth = asPositiveInt(arg.slice("--min-width=".length), DEFAULT_MIN_WIDTH, "--min-width");
    else if (arg.startsWith("--min-height=")) parsed.minHeight = asPositiveInt(arg.slice("--min-height=".length), DEFAULT_MIN_HEIGHT, "--min-height");
    else if (arg.startsWith("--max-image-bytes=")) parsed.maxImageBytes = asPositiveInt(arg.slice("--max-image-bytes=".length), DEFAULT_MAX_IMAGE_BYTES, "--max-image-bytes");
    else if (arg.startsWith("--placeholder-hashes=")) parsed.placeholderHashes = parseCommaList(arg.slice("--placeholder-hashes=".length));
    else if (arg.startsWith("--image-detail=")) parsed.imageDetail = normalizeText(arg.slice("--image-detail=".length)).toLowerCase();
    else if (arg.startsWith("--max-retries=")) {
      parsed.maxRetries = asNonnegativeInt(arg.slice("--max-retries=".length), DEFAULT_MAX_RETRIES, "--max-retries");
      maxRetriesConfigured = true;
    }
    else if (arg.startsWith("--openai-request-timeout-ms=")) parsed.openaiRequestTimeoutMs = asPositiveInt(arg.slice("--openai-request-timeout-ms=".length), DEFAULT_OPENAI_REQUEST_TIMEOUT_MS, "--openai-request-timeout-ms");
    else if (arg.startsWith("--concurrency=")) parsed.concurrency = asPositiveInt(arg.slice("--concurrency=".length), DEFAULT_CONCURRENCY, "--concurrency");
    else if (arg.startsWith("--max-run-cost-usd=")) parsed.maxRunCostUsd = asNumber(arg.slice("--max-run-cost-usd=".length), null, "--max-run-cost-usd");
    else if (arg.startsWith("--max-cards=")) parsed.maxCards = asNonnegativeInt(arg.slice("--max-cards=".length), null, "--max-cards");
    else if (arg.startsWith("--harvest-max-validation-failure-rate=")) {
      parsed.harvestMaxValidationFailureRate = asNumber(
        arg.slice("--harvest-max-validation-failure-rate=".length),
        DEFAULT_HARVEST_MAX_VALIDATION_FAILURE_RATE,
        "--harvest-max-validation-failure-rate",
      );
    }
    else if (arg.startsWith("--harvest-max-validation-failures=")) {
      parsed.harvestMaxValidationFailures = asNonnegativeInt(
        arg.slice("--harvest-max-validation-failures=".length),
        null,
        "--harvest-max-validation-failures",
      );
    }
    else if (arg.startsWith("--openai-input-cost-per-million=")) parsed.openaiInputCostPerMillion = asNumber(arg.slice("--openai-input-cost-per-million=".length), null, "--openai-input-cost-per-million");
    else if (arg.startsWith("--openai-output-cost-per-million=")) parsed.openaiOutputCostPerMillion = asNumber(arg.slice("--openai-output-cost-per-million=".length), null, "--openai-output-cost-per-million");
    else if (arg.startsWith("--openai-cached-input-cost-per-million=")) parsed.openaiCachedInputCostPerMillion = asNumber(arg.slice("--openai-cached-input-cost-per-million=".length), null, "--openai-cached-input-cost-per-million");
    else if (arg.startsWith("--image-cost-rule-version=")) parsed.openaiImageCostRuleVersion = normalizeText(arg.slice("--image-cost-rule-version=".length)) || null;
    else {
      throw new Error(`[card-visual-description-agent] unknown argument: ${arg}`);
    }
  }

  if (explicitMode) parsed.mode = explicitMode;
  if (!["plan", "dry_run", "harvest", "apply"].includes(parsed.mode)) {
    throw new Error(`[card-visual-description-agent] unsupported mode: ${parsed.mode}`);
  }
  if (
    parsed.harvestMaxValidationFailureRate !== null
    && parsed.harvestMaxValidationFailureRate !== undefined
    && (parsed.harvestMaxValidationFailureRate < 0 || parsed.harvestMaxValidationFailureRate > 1)
  ) {
    throw new Error("[card-visual-description-agent] harvest validation failure rate must be between 0 and 1");
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
  if (parsed.resumeRunDir && !["dry_run", "harvest"].includes(parsed.mode)) {
    throw new Error("[card-visual-description-agent] --resume-run-dir is supported only for dry_run or harvest mode");
  }
  if (parsed.branchStratifiedSample && (parsed.cardPrintId || parsed.cardPrintIds.length > 0 || parsed.gvId)) {
    throw new Error("[card-visual-description-agent] branch-stratified sampling cannot be combined with explicit card targets");
  }
  if (parsed.v2StressSample && (parsed.cardPrintId || parsed.cardPrintIds.length > 0 || parsed.gvId || parsed.branchStratifiedSample)) {
    throw new Error("[card-visual-description-agent] v2 stress sampling cannot be combined with explicit card targets or branch-stratified sampling");
  }
  if (parsed.highValueSample && (parsed.cardPrintId || parsed.cardPrintIds.length > 0 || parsed.gvId || parsed.branchStratifiedSample || parsed.v2StressSample)) {
    throw new Error("[card-visual-description-agent] high-value sampling cannot be combined with explicit card targets, branch-stratified sampling, or v2 stress sampling");
  }
  if (parsed.v2StressSample) {
    const stressSampleSize = FACT_GRAPH_V2_STRESS_ROLES.length;
    parsed.limit = stressSampleSize;
    parsed.maxCards = parsed.maxCards === null || parsed.maxCards === undefined
      ? stressSampleSize
      : Math.min(parsed.maxCards, stressSampleSize);
    if (!parsed.outDirExplicit) parsed.outDir = DEFAULT_V2_STRESS_OUT_DIR;
    if (!parsed.branchCandidateLimit) parsed.branchCandidateLimit = DEFAULT_BRANCH_STRATIFIED_CANDIDATE_LIMIT;
  }
  if (parsed.highValueSample && !parsed.branchCandidateLimit) {
    parsed.branchCandidateLimit = Math.max((parsed.maxCards ?? parsed.limit) * 100, DEFAULT_HIGH_VALUE_CANDIDATE_LIMIT);
  }
  parsed.branchTargets = parseBranchTargetsV1(parsed.branchTargetsSpec, parsed.limit);
  if (parsed.branchStratifiedSample && totalBranchTargets(parsed.branchTargets) < 1) {
    throw new Error("[card-visual-description-agent] branch-stratified sampling requires at least one branch target");
  }
  if (parsed.branchStratifiedSample && !parsed.branchCandidateLimit) {
    parsed.branchCandidateLimit = Math.max(parsed.limit * 200, DEFAULT_BRANCH_STRATIFIED_CANDIDATE_LIMIT);
  }
  if (
    parsed.provider === "openai"
    && parsed.concurrency > 1
    && !maxRetriesConfigured
    && parsed.maxRetries === DEFAULT_MAX_RETRIES
  ) {
    parsed.maxRetries = 1;
  }

  return parsed;
}

export function cardVisualSelectionQueryLimitV1(args = {}) {
  const explicitIdCount = normalizeStringArray(args.cardPrintIds).length;
  const requestedLimit = asPositiveInt(args.limit, DEFAULT_LIMIT, "limit");
  if (explicitIdCount > 0) return Math.max(requestedLimit, explicitIdCount);
  if (args.cardPrintId || args.gvId) return Math.max(requestedLimit, 1);
  if (args.branchStratifiedSample || args.v2StressSample || args.highValueSample) {
    return args.branchCandidateLimit || requestedLimit;
  }
  return requestedLimit;
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

function cardContextFromVisualDescriptionRow(row = {}) {
  return {
    name: row.name,
    set_name: row.set_name,
    set_code: row.set_code,
    number: row.number,
    supertype: row.card_supertype ?? row.supertype,
    subtype: row.card_subtype ?? row.subtype,
    card_category: row.card_category,
    prompt_branch: row.prompt_branch ?? row.branch,
    card_type_metadata_source: row.card_type_metadata_source,
    pokemon_name: row.pokemon_name,
    trainer_name: row.trainer_name,
    border_color_evidence: row.border_color_evidence,
    card_border_evidence: row.card_border_evidence,
    visual_evidence: row.visual_evidence,
  };
}

function addAutoApprovalBlocker(blockers, blocker, {
  condition,
  evidence = [],
  severity = "blocking",
} = {}) {
  blockers.push({
    blocker,
    condition: normalizeText(condition) || blocker,
    severity,
    evidence: uniqueSorted(evidence.map((item) => normalizeText(item)).filter(Boolean)),
  });
}

function addAutoApprovalCondition(conditions, condition, passed, evidence = []) {
  conditions.push({
    condition,
    passed: Boolean(passed),
    evidence: uniqueSorted(evidence.map((item) => normalizeText(item)).filter(Boolean)),
  });
}

function blockingPolicyResults(policyResults) {
  return (Array.isArray(policyResults) ? policyResults : [])
    .filter((result) => normalizeText(result.decision || VISUAL_POLICY_BLOCKING_DECISION) === VISUAL_POLICY_BLOCKING_DECISION);
}

function normalizedQualityFlagsForAutoApproval(row, freshFlags) {
  return uniqueSorted([
    ...normalizeQualityFlags(row?.quality_flags),
    ...(Array.isArray(freshFlags) ? freshFlags : []),
  ]);
}

function promptBranchForRow(row) {
  return normalizeText(row?.prompt_branch ?? row?.branch);
}

export function evaluateAutoApprovalReadinessV1(row, options = {}) {
  const validation = validateVisualDescriptionPayloadV1(row);
  const normalizedPayload = validation.normalized;
  const cardContext = {
    ...cardContextFromVisualDescriptionRow(row),
    ...(options.card_context ?? {}),
  };
  const freshFlagDetails = detectVisualDescriptionReviewFlagDetailsV1(normalizedPayload, cardContext);
  const freshFlags = uniqueSorted(freshFlagDetails.map((detail) => detail.flag));
  const policyResults = evaluateVisualDescriptionPolicyV1(normalizedPayload, cardContext);
  const policyBlockers = blockingPolicyResults(policyResults);
  const qualityFlags = normalizedQualityFlagsForAutoApproval(row, freshFlags);
  const blockers = [];
  const conditions = [];

  addAutoApprovalCondition(conditions, "schema_validation", validation.ok, validation.findings);
  if (!validation.ok) {
    addAutoApprovalBlocker(blockers, "schema_validation_failed", {
      condition: "schema_validation",
      evidence: validation.findings,
    });
  }

  const versionFields = [
    row?.card_print_id,
    row?.image_sha256,
    row?.prompt_version,
    row?.output_schema_version,
    row?.agent_version,
    row?.model_version,
  ].map(normalizeText);
  const canRebuildFingerprint = versionFields.every(Boolean);
  const expectedVersionKey = canRebuildFingerprint
    ? buildDescriptionVersionKeyV1({
      card_print_id: row.card_print_id,
      image_sha256: row.image_sha256,
      prompt_version: row.prompt_version,
      output_schema_version: row.output_schema_version,
      agent_version: row.agent_version,
      model_version: row.model_version,
    })
    : null;
  const fingerprintMatches = Boolean(
    expectedVersionKey
      && normalizeText(row?.description_version_key)
      && expectedVersionKey === normalizeText(row.description_version_key),
  );
  addAutoApprovalCondition(conditions, "canonical_fingerprint_reconciliation", fingerprintMatches, [
    expectedVersionKey ? `expected=${expectedVersionKey}` : "missing version tuple fields",
    row?.description_version_key ? `actual=${row.description_version_key}` : "missing description_version_key",
  ]);
  if (!fingerprintMatches) {
    addAutoApprovalBlocker(blockers, canRebuildFingerprint
      ? "canonical_fingerprint_mismatch"
      : "canonical_fingerprint_reconciliation_unavailable", {
      condition: "canonical_fingerprint_reconciliation",
      evidence: [
        expectedVersionKey ? `expected=${expectedVersionKey}` : "missing version tuple fields",
        row?.description_version_key ? `actual=${row.description_version_key}` : "missing description_version_key",
      ],
    });
  }

  const imageReconciles = Boolean(normalizeText(row?.image_sha256) && normalizeText(row?.image_source_key ?? row?.image_storage_path));
  addAutoApprovalCondition(conditions, "image_hash_and_version_reconciliation", imageReconciles, [
    row?.image_sha256 ? `image_sha256=${row.image_sha256}` : "missing image_sha256",
    row?.image_source_key || row?.image_storage_path ? `image_source_key=${row.image_source_key ?? row.image_storage_path}` : "missing image_source_key",
  ]);
  if (!imageReconciles) {
    addAutoApprovalBlocker(blockers, "image_hash_or_source_reconciliation_missing", {
      condition: "image_hash_and_version_reconciliation",
      evidence: [
        row?.image_sha256 ? `image_sha256=${row.image_sha256}` : "missing image_sha256",
        row?.image_source_key || row?.image_storage_path ? `image_source_key=${row.image_source_key ?? row.image_storage_path}` : "missing image_source_key",
      ],
    });
  }

  addAutoApprovalCondition(conditions, "no_blocking_policy_result", policyBlockers.length === 0, policyBlockers.map((result) => `${result.policy_rule}: ${result.claim}`));
  if (policyBlockers.length > 0) {
    addAutoApprovalBlocker(blockers, "blocking_policy_result_present", {
      condition: "no_blocking_policy_result",
      evidence: policyBlockers.map((result) => `${result.policy_rule}: ${result.claim}`),
    });
  }

  const flagsByCondition = {
    no_unsupported_subject_identity_claim: [
      "potential_primary_subject_mismatch",
      "potential_canonical_name_visual_conflict",
      "potential_metadata_or_identity_language",
      "potential_canonical_metadata_in_visual_output",
      "semantic_tags_metadata_or_generic_removed",
    ],
    no_anatomy_contradiction: [
      "potential_body_part_as_separate_held_object",
      "potential_primary_subject_anatomy_overclaim",
      "potential_cross_field_expression_contradiction",
    ],
    no_unsupported_subject_count_claim: ["potential_subject_count_mismatch"],
    no_speculative_environment_literalization: [
      "potential_overconfident_ambiguous_setting",
      "potential_speculative_setting_language",
      "potential_abstract_shape_literalization",
    ],
    no_metadata_leakage_into_visual_observations_or_tags: [
      "potential_metadata_or_identity_language",
      "potential_canonical_metadata_in_visual_output",
      "semantic_tags_metadata_or_generic_removed",
    ],
    no_physical_card_surface_overclaim: [
      "potential_surface_overclaim",
      "potential_visual_material_vs_surface_confusion",
      "potential_object_material_or_card_surface_confusion",
      "potential_generic_filler",
    ],
    no_unresolved_border_color_certainty_issue: ["potential_border_color_certainty_issue"],
    no_unsupported_personality_emotion_purpose_lore_or_event_claim: [
      "potential_unsupported_emotion_or_personality_claim",
      "potential_unsupported_personality_or_species_interpretation",
      "potential_purpose_or_lore_interpretation",
      "potential_dramatic_inferred_action_language",
      "potential_interpretive_claim",
      "potential_interpretive_mood_language",
    ],
    semantic_tags_remain_visually_grounded: [
      "potential_semantic_tag_nonvisual_concept",
      "semantic_tags_missing_after_sanitization",
      "semantic_tags_metadata_or_generic_removed",
    ],
    branch_specific_requirements_pass: [
      "potential_creature_language_on_non_pokemon_branch",
      "potential_generic_franchise_language_on_non_pokemon_branch",
      "potential_unavailable_metadata_prompt_branch_mismatch",
    ],
  };

  for (const [condition, conditionFlags] of Object.entries(flagsByCondition)) {
    const hits = qualityFlags.filter((flag) => conditionFlags.includes(flag));
    addAutoApprovalCondition(conditions, condition, hits.length === 0, hits);
    if (hits.length > 0) {
      addAutoApprovalBlocker(blockers, condition, {
        condition,
        evidence: hits,
      });
    }
  }

  const branchKnown = BRANCH_STRATIFIED_BRANCHES.includes(promptBranchForRow(row));
  addAutoApprovalCondition(conditions, "branch_is_supported", branchKnown, [promptBranchForRow(row) || "missing prompt_branch"]);
  if (!branchKnown) {
    addAutoApprovalBlocker(blockers, "unsupported_or_missing_prompt_branch", {
      condition: "branch_is_supported",
      evidence: [promptBranchForRow(row) || "missing prompt_branch"],
    });
  }

  const factGraph = normalizedPayload.visual_attributes?.fact_graph ?? {};
  const outputComplete = validation.ok
    && (factGraph.observations ?? []).length >= 3
    && (factGraph.fact_grounded_search_terms ?? []).length >= 1
    && FACT_GRAPH_COVERAGE_KEYS.every((key) => FACT_GRAPH_COVERAGE_REVIEW_STATUSES.has(reviewStatusForCoverage(factGraph, key)));
  addAutoApprovalCondition(conditions, "output_complete_enough_to_distinguish_artwork", outputComplete, [
    `observations=${(factGraph.observations ?? []).length}`,
    `fact_grounded_search_terms=${(factGraph.fact_grounded_search_terms ?? []).length}`,
    `coverage_reviews=${FACT_GRAPH_COVERAGE_KEYS.filter((key) => FACT_GRAPH_COVERAGE_REVIEW_STATUSES.has(reviewStatusForCoverage(factGraph, key))).length}`,
  ]);
  if (!outputComplete) {
    addAutoApprovalBlocker(blockers, "output_not_complete_enough_to_distinguish_artwork", {
      condition: "output_complete_enough_to_distinguish_artwork",
      evidence: [
        `observations=${(factGraph.observations ?? []).length}`,
        `fact_grounded_search_terms=${(factGraph.fact_grounded_search_terms ?? []).length}`,
        `coverage_reviews=${FACT_GRAPH_COVERAGE_KEYS.filter((key) => FACT_GRAPH_COVERAGE_REVIEW_STATUSES.has(reviewStatusForCoverage(factGraph, key))).length}`,
      ],
    });
  }

  const blockerKeys = uniqueSorted(blockers.map((blocker) => blocker.blocker));
  const autoApprovalEligible = blockerKeys.length === 0;
  const activationStatus = normalizeText(options.activation_status) || "inactive_calibration_required";
  return {
    readiness_version: CARD_VISUAL_DESCRIPTION_AUTO_APPROVAL_READINESS_VERSION,
    auto_approval_eligible: autoApprovalEligible,
    approval_confidence_tier: autoApprovalEligible ? "eligible_candidate" : "human_review_required",
    activation_status: activationStatus,
    auto_approval_blockers: blockers,
    blocker_keys: blockerKeys,
    evaluated_conditions: conditions,
    fresh_quality_flags: qualityFlags,
    fresh_quality_flag_details: uniqueQualityFlagDetails(freshFlagDetails),
    fresh_policy_results: policyResults,
  };
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

function addUsageValues(left, right) {
  return {
    input_tokens: Number(left?.input_tokens ?? 0) + Number(right?.input_tokens ?? 0),
    output_tokens: Number(left?.output_tokens ?? 0) + Number(right?.output_tokens ?? 0),
    total_tokens: Number(left?.total_tokens ?? 0) + Number(right?.total_tokens ?? 0),
    cached_input_tokens: Number(left?.cached_input_tokens ?? 0) + Number(right?.cached_input_tokens ?? 0),
    reasoning_output_tokens: Number(left?.reasoning_output_tokens ?? 0) + Number(right?.reasoning_output_tokens ?? 0),
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

function hasPositiveConfiguredPricingRate(value) {
  return value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value)) && Number(value) > 0;
}

function hasNonnegativeConfiguredPricingRate(value) {
  return value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
}

function hasPricingRates(pricingSnapshot) {
  return hasPositiveConfiguredPricingRate(pricingSnapshot?.input_per_million)
    && hasPositiveConfiguredPricingRate(pricingSnapshot?.output_per_million);
}

export function assertOpenAiPricingConfigured(args) {
  if (args.provider !== "openai" || args.mode === "plan") return;
  const missing = [];
  if (!hasPositiveConfiguredPricingRate(args.openaiInputCostPerMillion)) missing.push("OPENAI_INPUT_COST_PER_MILLION");
  if (!hasPositiveConfiguredPricingRate(args.openaiOutputCostPerMillion)) missing.push("OPENAI_OUTPUT_COST_PER_MILLION");
  if (
    args.openaiCachedInputCostPerMillion !== null
    && args.openaiCachedInputCostPerMillion !== undefined
    && args.openaiCachedInputCostPerMillion !== ""
    && !hasNonnegativeConfiguredPricingRate(args.openaiCachedInputCostPerMillion)
  ) missing.push("OPENAI_CACHED_INPUT_COST_PER_MILLION");
  if (missing.length > 0) {
    throw new Error(`[card-visual-description-agent] OpenAI dry-run/apply requires positive pricing configuration for cost telemetry: ${missing.join(", ")}`);
  }
}

export function estimateUsageCostUsd(usage, pricingSnapshot) {
  if (!hasPricingRates(pricingSnapshot)) return null;
  const normalized = usage ?? zeroUsage();
  const cachedTokens = Math.min(normalized.cached_input_tokens, normalized.input_tokens);
  const uncachedInputTokens = Math.max(normalized.input_tokens - cachedTokens, 0);
  const cachedInputRate = hasNonnegativeConfiguredPricingRate(pricingSnapshot.cached_input_per_million)
    ? Number(pricingSnapshot.cached_input_per_million)
    : Number(pricingSnapshot.input_per_million);
  const estimated =
    (uncachedInputTokens * Number(pricingSnapshot.input_per_million)
      + cachedTokens * cachedInputRate
      + normalized.output_tokens * Number(pricingSnapshot.output_per_million)) / 1_000_000;
  return roundUsd(estimated);
}

function telemetryForArtifact(telemetry = {}) {
  const safeTelemetry = telemetry ?? {};
  const usage = safeTelemetry.usage ?? zeroUsage();
  return {
    response_model_version: safeTelemetry.response_model_version ?? null,
    image_detail: safeTelemetry.image_detail ?? null,
    request_count: safeTelemetry.request_count ?? 0,
    retry_count: safeTelemetry.retry_count ?? 0,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    total_tokens: usage.total_tokens,
    cached_input_tokens: usage.cached_input_tokens,
    reasoning_output_tokens: usage.reasoning_output_tokens,
    estimated_cost_usd: safeTelemetry.estimated_cost_usd ?? 0,
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

  if (Number(args.concurrency ?? DEFAULT_CONCURRENCY) > 1) {
    const severeProviderFailures = validationFailures.filter((row) =>
      /\b(?:openai_http_429|rate.?limit|quota|overloaded|too many requests)\b/i.test(`${row.error ?? ""} ${(row.findings ?? []).join(" ")}`),
    );
    if (severeProviderFailures.length >= Math.max(2, Math.ceil(Number(args.concurrency) / 2))) {
      return {
        stopped_before_next_call: true,
        stop_reason: "severe_provider_failure_pattern",
        provider_failure_count: severeProviderFailures.length,
        concurrency: args.concurrency,
      };
    }

    const aggregateForRetry = aggregateUsageRows(attemptedRows);
    if (
      aggregateForRetry.request_count >= Number(args.concurrency)
      && aggregateForRetry.retry_count >= Math.max(3, Number(args.concurrency))
      && aggregateForRetry.retry_count / Math.max(aggregateForRetry.request_count, 1) >= 0.5
    ) {
      return {
        stopped_before_next_call: true,
        stop_reason: "severe_retry_pattern",
        request_count: aggregateForRetry.request_count,
        retry_count: aggregateForRetry.retry_count,
        concurrency: args.concurrency,
      };
    }
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

function observationIdSet(factGraph) {
  return new Set((factGraph?.observations ?? []).map((observation) => normalizeText(observation.observation_id)).filter(Boolean));
}

function typedFactIdSet(factGraph) {
  return new Set((factGraph?.typed_facts ?? []).map((fact) => normalizeText(fact.fact_id)).filter(Boolean));
}

function addMissingObservationFindings(findings, ids, knownIds, findingPrefix) {
  for (const id of ids.map(normalizeText).filter(Boolean)) {
    if (!knownIds.has(id)) findings.push(`${findingPrefix}:${id}`);
  }
}

function addMissingFactFindings(findings, ids, knownFactIds, findingPrefix) {
  for (const id of ids.map(normalizeText).filter(Boolean)) {
    if (!knownFactIds.has(id)) findings.push(`${findingPrefix}:${id}`);
  }
}

function reviewStatusForCoverage(factGraph, key) {
  return normalizeText(factGraph?.coverage_reviews?.[key]);
}

function moduleReviewByName(factGraph) {
  const reviews = new Map();
  for (const review of factGraph?.module_reviews ?? []) {
    const module = normalizeText(review.module);
    if (!module) continue;
    reviews.set(module, review);
  }
  return reviews;
}

function moduleHasEntries(module) {
  if (!module || typeof module !== "object" || Array.isArray(module)) return false;
  const visit = (value, key = "") => {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.entries(value).some(([childKey, childValue]) => visit(childValue, childKey));
    if (key === "omission_risk" || key === "evidence_quality" || key === "review_status") return false;
    return Boolean(normalizeText(value));
  };
  return visit(module);
}

function addModuleObservationReferenceFindings(findings, value, knownIds, pathPrefix = "fact_graph.modules") {
  const visit = (node, pathParts) => {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, [...pathParts, String(index)]));
      return;
    }
    if (typeof node !== "object") return;

    for (const [key, child] of Object.entries(node)) {
      const pathText = [...pathParts, key].join(".");
      if (
        key === "supporting_observation_ids"
        || key === "affected_observation_ids"
        || key.endsWith("_observation_ids")
      ) {
        addMissingObservationFindings(findings, normalizeObservationReferenceArray(child), knownIds, `fact_graph_module_observation_missing:${pathText}`);
        continue;
      }
      if (key === "observation_id" || key.endsWith("_observation_id")) {
        addMissingObservationFindings(findings, [child], knownIds, `fact_graph_module_observation_missing:${pathText}`);
        continue;
      }
      visit(child, [...pathParts, key]);
    }
  };
  visit(value, [pathPrefix]);
}

function collectModuleObservationReferences(value) {
  const references = [];
  const visit = (node) => {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (typeof node !== "object") return;
    for (const [key, child] of Object.entries(node)) {
      if (
        key === "supporting_observation_ids"
        || key === "affected_observation_ids"
        || key.endsWith("_observation_ids")
      ) {
        references.push(...normalizeObservationReferenceArray(child));
        continue;
      }
      if (key === "observation_id" || key.endsWith("_observation_id")) {
        const id = normalizeText(child);
        if (id) references.push(id);
        continue;
      }
      visit(child);
    }
  };
  visit(value);
  return uniquePreserving(references);
}

function sectionCoveredOrObserved(factGraph, key, rows) {
  if (Array.isArray(rows) && rows.length > 0) return true;
  return FACT_GRAPH_COVERAGE_REVIEW_STATUSES.has(reviewStatusForCoverage(factGraph, key));
}

function factGraphSearchTerms(factGraph) {
  return uniqueSorted((factGraph?.fact_grounded_search_terms ?? []).map((entry) => entry.term));
}

function factGraphSurfaceDigest(factGraph) {
  const cues = (factGraph?.surface_and_scan_cues ?? [])
    .map((entry) => [entry.cue, entry.abstention].map(normalizeText).filter(Boolean).join("; "))
    .filter(Boolean);
  if (cues.length > 0) return cues.join(" ");
  const review = reviewStatusForCoverage(factGraph, "surface_and_scan_cues_review");
  if (review && review !== "observed") {
    return `No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are asserted; surface review status: ${review}.`;
  }
  return "No reliable card-surface, foil, texture, glare, border, or printing-treatment cues are visible enough to describe from this scan.";
}

export function buildFactGraphCompatibilityDigestV1(factGraph) {
  const observations = factGraph?.observations ?? [];
  const subjects = factGraph?.subjects ?? [];
  const depictedSubjects = factGraph?.depicted_subjects ?? [];
  const representations = factGraph?.character_representations ?? [];
  const counts = factGraph?.counts ?? [];
  const highSalience = observations
    .filter((observation) => !isCardUiPrintMarkerObservation(observation))
    .filter((observation) => ["high", "medium"].includes(normalizeText(observation.salience).toLowerCase()))
    .slice(0, 8)
    .map((observation) => observation.normalized_label || observation.label)
    .filter(Boolean);
  const countParts = counts.slice(0, 6).map((count) => {
    if (count.count_type === "exact") return `${count.normalized_label}: ${count.exact_count}`;
    if (count.count_type === "estimated_range") return `${count.normalized_label}: ${count.estimated_min}-${count.estimated_max}`;
    return `${count.normalized_label}: ${count.count_type}`;
  }).filter((value) => !value.startsWith(":"));
  const primary = subjects.map((subject) => subject.identity).filter(Boolean).slice(0, 5);
  const depicted = depictedSubjects.map((subject) => subject.represented_identity).filter(Boolean).slice(0, 4);
  const represented = representations.map((subject) =>
    [subject.represented_identity, subject.representation_form || subject.host_object].filter(Boolean).join(" as "),
  ).filter(Boolean).slice(0, 4);
  const semanticFacts = (factGraph?.semantic_visual_facts ?? [])
    .map((fact) => normalizeText(fact.label))
    .filter(Boolean)
    .slice(0, 6);
  const parts = [
    primary.length ? `Scene subjects: ${primary.join(", ")}.` : "",
    depicted.length ? `Depicted subjects: ${depicted.join(", ")}.` : "",
    represented.length ? `Character representations: ${represented.join(", ")}.` : "",
    highSalience.length ? `Visible observations: ${highSalience.join(", ")}.` : "",
    semanticFacts.length ? `Semantic facts: ${semanticFacts.join(", ")}.` : "",
    countParts.length ? `Counts: ${countParts.join(", ")}.` : "",
  ].filter(Boolean);
  return parts.length
    ? `Fact digest. ${parts.join(" ")}`
    : "Fact digest. No confident visible fact observations were extracted.";
}

function factGraphContainsInterpretedExpression(factGraph) {
  const directExpression = flattenFactGraphText([
    (factGraph?.subjects ?? []).map((subject) => subject.expression ?? subject.interpreted_expression),
    factGraph?.interpreted_expression,
  ]);
  if (directExpression) return true;
  const facialText = flattenFactGraphText((factGraph?.subjects ?? []).map((subject) => subject.facial_evidence));
  return /\b(angry|happy|confident|sad|joyful|cheerful|determined|focused|menacing|playful|friendly|serious|thoughtful|assertive)\b/i.test(facialText);
}

function hasFactGraphClaimValue(value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.some((item) => hasFactGraphClaimValue(item));
  if (typeof value === "object") return Object.values(value).some((item) => hasFactGraphClaimValue(item));
  const text = normalizeText(value).toLowerCase();
  return Boolean(text && !["unknown", "none", "not_visible", "not applicable", "not_applicable", "cannot_determine"].includes(text));
}

function hasSupportedObservationReferences(ids, knownIds) {
  const references = normalizeObservationReferenceArray(ids);
  return references.length > 0 && references.every((id) => knownIds.has(id));
}

function validateFactGraphGroundedFieldsV1(factGraph, knownIds) {
  const findings = [];
  const environment = factGraph.environment ?? {};
  const environmentClaimFields = [
    "setting",
    "indoor_outdoor",
    "sky",
    "ground",
    "terrain",
    "plants",
    "architecture",
    "water",
    "weather",
    "time_of_day_cues",
  ];

  const environmentHasClaims = environmentClaimFields.some((field) => hasFactGraphClaimValue(environment[field]));
  if (environmentHasClaims && !hasSupportedObservationReferences(environment.supporting_observation_ids, knownIds)) {
    findings.push("fact_graph_environment_claim_without_support");
  }

  const weatherText = flattenFactGraphText([environment.setting, environment.sky, environment.terrain]);
  if (/\b(thunderstorm|rain|snow|wind|hail|fog)\b/i.test(weatherText) && !hasFactGraphClaimValue(environment.weather)) {
    findings.push("fact_graph_weather_claim_without_weather_field");
  }

  const timeText = flattenFactGraphText([environment.setting, environment.sky]);
  if (/\b(night|daytime|daylight|sunset|sunrise|dusk|dawn)\b/i.test(timeText) && !hasFactGraphClaimValue(environment.time_of_day_cues)) {
    findings.push("fact_graph_time_claim_without_time_field");
  }

  return findings;
}

function validateFactGraphTypedFactsV2(factGraph, knownIds) {
  const findings = [];
  const typedFacts = factGraph.typed_facts ?? [];
  const factIds = typedFactIdSet(factGraph);
  if (!Array.isArray(typedFacts)) return ["fact_graph_typed_facts_not_array"];
  if (typedFacts.length < 1) findings.push("fact_graph_typed_facts_missing");
  if (factIds.size !== typedFacts.length) findings.push("fact_graph_typed_fact_ids_missing_or_not_unique");

  for (const fact of typedFacts) {
    const factId = normalizeText(fact.fact_id) || "unknown";
    if (!fact.fact_id) findings.push("fact_graph_typed_fact_missing_id");
    if (!FACT_GRAPH_MODULE_NAMES.includes(normalizeText(fact.module))) {
      findings.push(`fact_graph_typed_fact_module_invalid:${factId}`);
    }
    if (!fact.field_path) findings.push(`fact_graph_typed_fact_field_path_missing:${factId}`);
    if (!fact.claim) findings.push(`fact_graph_typed_fact_claim_missing:${factId}`);
    if (fact.supporting_observation_ids.length < 1) {
      findings.push(`fact_graph_typed_fact_without_supporting_observation:${factId}`);
    }
    addMissingObservationFindings(findings, fact.supporting_observation_ids, knownIds, "fact_graph_typed_fact_observation_missing");
  }
  return findings;
}

function validateFactGraphModulesV2(factGraph, knownIds) {
  const findings = [];
  const modules = factGraph.modules ?? {};
  const knownModuleNames = new Set(FACT_GRAPH_MODULE_NAMES);

  if (!modules || typeof modules !== "object" || Array.isArray(modules)) {
    findings.push("fact_graph_modules_not_object");
    return findings;
  }

  for (const moduleName of FACT_GRAPH_MODULE_NAMES) {
    if (!Object.hasOwn(modules, moduleName)) {
      findings.push(`fact_graph_module_missing:${moduleName}`);
      continue;
    }
  }
  for (const moduleName of Object.keys(modules)) {
    if (!knownModuleNames.has(moduleName)) findings.push(`fact_graph_module_unknown:${moduleName}`);
  }
  addModuleObservationReferenceFindings(findings, modules, knownIds);

  const uiObservationIds = cardUiObservationIdSet(factGraph);
  const uiModuleFactIds = new Set(normalizeFactIdArray(modules?.[CARD_UI_AND_PRINT_MARKERS_MODULE]?.fact_ids));
  for (const fact of factGraph.typed_facts ?? []) {
    const factId = normalizeText(fact.fact_id);
    const moduleName = normalizeText(fact.module);
    const supportsUiObservation = normalizeObservationReferenceArray(fact.supporting_observation_ids)
      .some((id) => uiObservationIds.has(id));
    if (moduleName === CARD_UI_AND_PRINT_MARKERS_MODULE && factId && !uiModuleFactIds.has(factId)) {
      findings.push(`fact_graph_card_ui_fact_missing_from_module:${factId}`);
    }
    if (supportsUiObservation && CARD_UI_PROHIBITED_ARTWORK_MODULES.has(moduleName)) {
      findings.push(`fact_graph_card_ui_observation_in_artwork_module:${moduleName}:${factId || "unknown"}`);
    }
  }

  for (const moduleName of CARD_UI_PROHIBITED_ARTWORK_MODULES) {
    const referencedUiIds = collectModuleObservationReferences(modules?.[moduleName])
      .filter((id) => uiObservationIds.has(id));
    for (const id of referencedUiIds) {
      findings.push(`fact_graph_card_ui_observation_in_artwork_module:${moduleName}:${id}`);
    }
  }

  for (const object of factGraph.objects_and_props ?? []) {
    const observationId = normalizeText(object.observation_id);
    if (uiObservationIds.has(observationId)) {
      findings.push(`fact_graph_card_ui_observation_in_artwork_module:objects_and_props:${observationId}`);
    }
  }

  const uiReview = moduleReviewByName(factGraph).get(CARD_UI_AND_PRINT_MARKERS_MODULE);
  const unreadableUiObservations = (factGraph.observations ?? []).filter((observation) => {
    const id = normalizeText(observation.observation_id);
    if (!uiObservationIds.has(id)) return false;
    const text = normalizeText([
      observation.label,
      observation.normalized_label,
      observation.visibility,
      observation.evidence_strength,
    ].filter(Boolean).join(" "));
    return /\b(unreadable|illegible|too small|cannot_determine|low_resolution|blurred|glare)\b/i.test(text);
  });
  if (unreadableUiObservations.length > 0) {
    const hasUiAbstention = (uiReview?.abstentions ?? []).some((entry) =>
      (
        normalizeText(entry.field_path).startsWith(CARD_UI_AND_PRINT_MARKERS_MODULE)
        || CARD_UI_PRINT_MARKER_FIELDS.some((field) => normalizeText(entry.field_path).includes(field.replace(/_observation_ids$/, "").replace(/_ids$/, "")))
      )
      && normalizeText(entry.reason));
    if (!hasUiAbstention) {
      for (const observation of unreadableUiObservations) {
        findings.push(`fact_graph_unreadable_card_ui_missing_abstention:${observation.observation_id || "unknown"}`);
      }
    }
  }
  return findings;
}

function validateFactGraphModuleReviewsV2(factGraph) {
  const findings = [];
  const knownIds = observationIdSet(factGraph);
  const reviews = factGraph.module_reviews ?? [];
  if (!Array.isArray(reviews)) return ["fact_graph_module_reviews_not_array"];

  const reviewsByModule = moduleReviewByName(factGraph);
  if (reviewsByModule.size !== reviews.length) findings.push("fact_graph_module_reviews_missing_or_not_unique");

  for (const moduleName of FACT_GRAPH_MODULE_NAMES) {
    const review = reviewsByModule.get(moduleName);
    if (!review) {
      findings.push(`fact_graph_module_review_missing:${moduleName}`);
      continue;
    }
    if (!FACT_GRAPH_MODULE_REVIEW_STATUSES.has(review.review_status)) {
      findings.push(`fact_graph_module_review_status_invalid:${moduleName}`);
    }
    if (!FACT_GRAPH_MODULE_OMISSION_RISK_VALUES.has(review.omission_risk)) {
      findings.push(`fact_graph_module_omission_risk_invalid:${moduleName}`);
    }
    if (!FACT_GRAPH_MODULE_EVIDENCE_QUALITY_VALUES.has(review.evidence_quality)) {
      findings.push(`fact_graph_module_evidence_quality_invalid:${moduleName}`);
    }
  }

  for (const review of reviews) {
    const module = normalizeText(review.module);
    if (module && !FACT_GRAPH_MODULE_NAMES.includes(module)) {
      findings.push(`fact_graph_module_review_unknown:${module}`);
    }
    for (const abstention of review.abstentions ?? []) {
      if (!abstention.field_path) findings.push(`fact_graph_module_review_abstention_field_missing:${module || "unknown"}`);
      if (!abstention.reason) findings.push(`fact_graph_module_review_abstention_reason_missing:${module || "unknown"}`);
      addMissingObservationFindings(
        findings,
        abstention.affected_observation_ids ?? [],
        knownIds,
        `fact_graph_module_review_abstention_observation_missing:${module || "unknown"}`,
      );
    }
  }
  return findings;
}

function validateFactGraphCountConsistencyV1(factGraph) {
  const findings = [];
  const counts = factGraph.counts ?? [];

  for (const count of counts) {
    if (count.count_type === "exact" && (count.estimated_min > 0 || count.estimated_max > 0) && (count.estimated_min !== count.exact_count || count.estimated_max !== count.exact_count)) {
      findings.push(`fact_graph_exact_count_range_conflict:${count.count_id || "unknown"}`);
    }
    if (count.count_type === "estimated_range" && count.exact_count > 0) {
      findings.push(`fact_graph_estimated_count_has_exact_count:${count.count_id || "unknown"}`);
    }
    if (count.count_type === "many") {
      if (count.exact_count > 0) findings.push(`fact_graph_many_count_has_exact_count:${count.count_id || "unknown"}`);
      if (count.estimated_min > 0 && count.estimated_max > 0 && count.estimated_min === count.estimated_max) {
        findings.push(`fact_graph_many_count_has_exact_range:${count.count_id || "unknown"}`);
      }
    }
    if (count.count_type === "not_visible") {
      if (count.exact_count > 0 || count.estimated_min > 0 || count.estimated_max > 0) {
        findings.push(`fact_graph_not_visible_count_has_values:${count.count_id || "unknown"}`);
      }
      if (!count.abstention_reason) findings.push(`fact_graph_count_abstention_reason_missing:${count.count_id || "unknown"}`);
    }
  }

  return findings;
}

function validateCanonicalVisualConceptsV1(factGraph, knownIds) {
  const findings = [];
  const layer = factGraph?.canonical_visual_concepts;
  if (!layer || typeof layer !== "object" || Array.isArray(layer)) {
    findings.push("fact_graph_canonical_visual_concepts_missing");
    return findings;
  }
  if (normalizeText(layer.concept_schema_version) !== CARD_VISUAL_CONTROLLED_VOCABULARY_VERSION) {
    findings.push("fact_graph_canonical_visual_concept_schema_version_invalid");
  }
  if (!Array.isArray(layer.concepts)) {
    findings.push("fact_graph_canonical_visual_concepts_not_array");
    return findings;
  }
  for (const concept of layer.concepts) {
    const name = normalizeText(concept.concept) || "unknown";
    if (!normalizeText(concept.concept)) findings.push("fact_graph_canonical_visual_concept_missing_name");
    if (normalizeText(concept.derivation) !== "deterministic_rule") {
      findings.push(`fact_graph_canonical_visual_concept_derivation_invalid:${name}`);
    }
    const sourceIds = normalizeObservationReferenceArray(concept.source_observation_ids);
    if (sourceIds.length < 1) findings.push(`fact_graph_canonical_visual_concept_without_source:${name}`);
    addMissingObservationFindings(findings, sourceIds, knownIds, "fact_graph_canonical_visual_concept_observation_missing");
  }
  return findings;
}

function semanticVisualFactEvidenceText(fact) {
  return flattenFactGraphText(Object.values(normalizeSemanticVisualFactEvidence(fact?.evidence)));
}

function semanticVisualFactLabelHasDirectEvidenceSupportV1(label, evidenceText) {
  const normalizedLabel = normalizeSemanticVisualFactLabelText(label);
  const normalizedEvidence = normalizeControlledVocabularyFreeText(evidenceText);
  if (!normalizedLabel || !normalizedEvidence) return false;
  if (/\b(?:pokemon|pok[eé]mon|fantasy|style|lore|story|represents?|symboli[sz]|personality|presence|majestic|predatory|vibe|feeling|theme of)\b/i.test(normalizedLabel)) return false;
  const labelTokens = searchTermTokens(normalizedLabel).filter((token) =>
    !["near", "inside", "outside", "visible", "around", "through", "theme", "environment", "background", "scene", "state", "action", "pose", "expression"].includes(token));
  if (labelTokens.length < 1) return false;
  const evidenceTokens = new Set(searchTermTokens(normalizedEvidence));
  const overlap = labelTokens.filter((token) => evidenceTokens.has(token)).length;
  if (labelTokens.length === 1) return overlap === 1;
  return overlap >= Math.min(labelTokens.length, 2) && overlap / labelTokens.length >= 0.5;
}

function semanticVisualFactHasSupport(fact, pattern, factGraph = null, options = {}) {
  return semanticVisualFactHasEvidenceBackedSupport(fact, pattern, {
    ...options,
    observations: factGraph?.observations ?? options.observations ?? [],
  });
}

function factGraphHasSemanticLabel(factGraph, pattern) {
  return (factGraph?.semantic_visual_facts ?? []).some((fact) => pattern.test(normalizeText(fact.label)));
}

function factGraphHasSubjectIdentity(factGraph, identityPattern) {
  const rows = [
    ...(factGraph?.subjects ?? []).map((subject) => subject.identity),
    ...(factGraph?.depicted_subjects ?? []).map((subject) => subject.represented_identity),
    ...(factGraph?.character_representations ?? []).map((subject) => subject.represented_identity),
  ];
  return rows.some((identity) => identityPattern.test(normalizeText(identity)));
}

function factGraphSearchTermHasSubjectAndSemanticLabel(factGraph, term, subjectPattern, semanticPattern) {
  return subjectPattern.test(normalizeText(term))
    && semanticPattern.test(normalizeText(term))
    && factGraphHasSubjectIdentity(factGraph, subjectPattern)
    && factGraphHasSemanticLabel(factGraph, semanticPattern);
}

function factGraphSearchTermHasCharacterRepresentationEvidence(factGraph, entry, identityPattern, formPattern) {
  const term = normalizeText(entry?.term);
  if (!identityPattern.test(term) || !formPattern.test(term)) return false;
  if ((factGraph.character_representations ?? []).some((representation) =>
    identityPattern.test(normalizeText(representation.represented_identity))
    && formPattern.test(normalizeText([representation.host_object, representation.representation_form].join(" "))))) {
    return true;
  }
  return factGraphSearchTermHasEvidenceSupport(factGraph, entry, new RegExp(
    `(?=.*${identityPattern.source})(?=.*${formPattern.source})`,
    "i",
  ));
}

function factGraphSearchTermHasCameoEvidence(factGraph, entry) {
  const term = normalizeText(entry?.term);
  if (!/\bcameo\b/i.test(term)) return false;
  if ((factGraph.depicted_subjects ?? []).length > 0 || (factGraph.character_representations ?? []).length > 0) return true;
  const termSupportIds = new Set(normalizeObservationReferenceArray(entry?.supporting_observation_ids));
  if (termSupportIds.size < 1) return false;
  const supportedSceneSubject = (factGraph.observations ?? []).some((observation) => {
    const id = normalizeText(observation.observation_id);
    if (!termSupportIds.has(id)) return false;
    const text = normalizeText([
      observation.kind,
      observation.label,
      observation.normalized_label,
    ].filter(Boolean).join(" "));
    return /\bscene_subject\b/i.test(text) && searchTermTokens(term.replace(/\bcameo\b/gi, " "))
      .some((token) => searchTermTokens(text).includes(token));
  });
  if (supportedSceneSubject) return true;
  return (factGraph.semantic_visual_facts ?? []).some((fact) => {
    if (normalizeText(fact.category) !== "cameo") return false;
    const factSupport = normalizeObservationReferenceArray(fact.supporting_observation_ids);
    return factSupport.some((id) => termSupportIds.has(id)) && normalizeText(fact.label);
  });
}

function factGraphHasExactCount(factGraph, labelPattern, exactCount) {
  return (factGraph?.counts ?? []).some((count) =>
    count.count_type === "exact"
    && count.exact_count === exactCount
    && labelPattern.test(normalizeText(count.normalized_label)));
}

const COUNT_WORD_VALUES = new Map([
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10],
]);

function countValueFromText(value) {
  const text = normalizeText(value);
  const digit = text.match(/\b(\d+)\b/);
  if (digit) return Number(digit[1]);
  for (const [word, count] of COUNT_WORD_VALUES) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) return count;
  }
  return null;
}

function factGraphHasMatchingCountSemantic(factGraph, fact, label) {
  const semanticSupportIds = new Set(normalizeObservationReferenceArray(fact?.supporting_observation_ids));
  const expectedCount = countValueFromText(label);
  if (semanticSupportIds.size < 1 || expectedCount === null) return false;
  return (factGraph?.counts ?? []).some((count) => {
    if (normalizeText(count.count_type) !== "exact" || count.exact_count !== expectedCount) return false;
    const countSupportIds = normalizeObservationReferenceArray(count.supporting_observation_ids);
    if (!countSupportIds.some((id) => semanticSupportIds.has(id))) return false;
    const countLabelTokens = searchTermTokens(count.normalized_label);
    const semanticText = tagKey([label, flattenFactGraphText(Object.values(normalizeSemanticVisualFactEvidence(fact?.evidence)))].join(" "));
    return countLabelTokens.length < 1 || countLabelTokens.some((token) => semanticText.includes(token));
  });
}

function factGraphSearchTermEvidenceText(factGraph, entry) {
  const supportIds = new Set(normalizeObservationReferenceArray(entry?.supporting_observation_ids));
  if (supportIds.size < 1) return "";
  const supportedObservations = (factGraph?.observations ?? [])
    .filter((observation) => supportIds.has(normalizeText(observation.observation_id)));
  const supportedFacts = (factGraph?.typed_facts ?? [])
    .filter((fact) => normalizeObservationReferenceArray(fact.supporting_observation_ids).some((id) => supportIds.has(id)));
  const supportedHumanFacialEvidence = normalizeObjectArray(factGraph?.modules?.human_appearance?.facial_evidence)
    .filter((evidence) => normalizeObservationReferenceArray(evidence.supporting_observation_ids).some((id) => supportIds.has(id)));
  return flattenFactGraphText([
    supportedObservations,
    supportedFacts.map((fact) => [fact.claim, fact.value, fact.field_path]),
    supportedHumanFacialEvidence,
  ]);
}

function factGraphSearchTermHasEvidenceSupport(factGraph, entry, supportPattern, circularPattern = null) {
  let evidenceText = factGraphSearchTermEvidenceText(factGraph, entry);
  if (circularPattern) evidenceText = evidenceText.replace(circularPattern, " ");
  return Boolean(normalizeText(evidenceText) && supportPattern.test(evidenceText));
}

function isAllowedSemanticVisualFactLabelV1(fact, observations = []) {
  const label = normalizeSemanticVisualFactLabelText(fact?.label);
  const category = normalizeText(fact?.category);
  const evidenceText = semanticVisualFactEvidenceText(fact);
  const supportedEvidenceText = semanticVisualFactEvidenceTextWithoutCircularClaims(fact, observations);
  const evidenceForSupport = supportedEvidenceText || evidenceText;
  if (!label) return false;
  if (category === "expression" && (
    SEMANTIC_VISUAL_FACT_HAPPY_LABEL_PATTERN.test(label)
    || SEMANTIC_VISUAL_FACT_ANGRY_OR_ANNOYED_LABEL_PATTERN.test(label)
    || SEMANTIC_VISUAL_FACT_SCARED_OR_SURPRISED_LABEL_PATTERN.test(label)
    || SEMANTIC_VISUAL_FACT_CONCERNED_LABEL_PATTERN.test(label)
    || SEMANTIC_VISUAL_FACT_SMIRKING_LABEL_PATTERN.test(label)
    || SEMANTIC_VISUAL_FACT_FOCUSED_OR_DETERMINED_LABEL_PATTERN.test(label)
  )) return true;
  if ((category === "expression" || category === "state") && SEMANTIC_VISUAL_FACT_ALERT_LABEL_PATTERN.test(label)) return true;
  if ((category === "expression" || category === "state") && SEMANTIC_VISUAL_FACT_AWAKE_LABEL_PATTERN.test(label)) return true;
  if (category === "expression" && SEMANTIC_VISUAL_FACT_SNARLING_LABEL_PATTERN.test(label)) return true;
  if (
    ["action", "expression", "state"].includes(category)
    && SEMANTIC_VISUAL_FACT_OBJECTIVE_FACIAL_FEATURE_LABEL_PATTERN.test(label)
    && SEMANTIC_VISUAL_FACT_OBJECTIVE_FACIAL_FEATURE_SUPPORT_PATTERN.test(evidenceForSupport)
  ) return true;
  if ((category === "action" || category === "state") && SEMANTIC_VISUAL_FACT_UPRIGHT_LABEL_PATTERN.test(label)) return true;
  if (category === "time_of_day" && SEMANTIC_VISUAL_FACT_NIGHT_LABEL_PATTERN.test(label)) return true;
  if (
    (category === "time_of_day" || category === "environment")
    && SEMANTIC_VISUAL_FACT_DAYTIME_LABEL_PATTERN.test(label)
    && SEMANTIC_VISUAL_FACT_DAYTIME_SUPPORT_PATTERN.test(evidenceForSupport)
  ) return true;
  if (
    category === "environment"
    && SEMANTIC_VISUAL_FACT_CITYSCAPE_LABEL_PATTERN.test(label)
    && SEMANTIC_VISUAL_FACT_CITYSCAPE_SUPPORT_PATTERN.test(evidenceForSupport.replace(
      /\b(?:cityscape|skyline|urban(?:\s+scene|\s+background)?|city\s+background)\b/gi,
      " ",
    ))
  ) return true;
  if ((category === "action" || category === "state" || category === "expression") && SEMANTIC_VISUAL_FACT_ROARING_LABEL_PATTERN.test(label)) return true;
  if (category === "expression" && /\blick(?:ing)?\b/i.test(label) && /\b(?:tongue|licking|lick|mouth)\b/i.test(evidenceForSupport)) return true;
  if (category === "action" && SEMANTIC_VISUAL_FACT_ATTACKING_LABEL_PATTERN.test(label)) return true;
  if (category === "count_semantic" && SEMANTIC_VISUAL_FACT_COUNT_SEMANTIC_LABEL_PATTERN.test(label)) return true;
  if (/\bgold(?:en)?\s+(?:foil|highlights?)\b/i.test(normalizeText(fact?.label)) || /\bgold highlights?\b/i.test(label)) return true;
  if (SEMANTIC_VISUAL_FACT_ALLOWED_LABEL_PATTERN.test(label)) return true;
  if (conceptNamesFromText(label).length > 0) return true;
  if (
    ["action", "state", "expression", "environment", "motif", "scene_type", "time_of_day", "weather", "cameo", "count_semantic"].includes(category)
    && semanticVisualFactLabelHasDirectEvidenceSupportV1(label, evidenceForSupport)
  ) return true;

  if (category === "scene_type") {
    if (/\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)?\s*(?:headed|heads?|serpent|serpentine)\b/i.test(label)) {
      return /\b(?:heads?|headed|serpent|serpentine|multiple heads?)\b/i.test(evidenceForSupport);
    }
    if (/\borchard\b/i.test(label)) {
      return /\b(?:apple|fruit|tree|trees|red apples?)\b/i.test(evidenceForSupport);
    }
    if (/\btown\b/i.test(label)) {
      return /\b(?:buildings?|architecture|arched?|doorways?|street|lamp|potted plants?|white buildings?)\b/i.test(evidenceForSupport);
    }
    return /\b(?:scene|background|pattern|abstract|stylized|design|gradient|swirl|swirling|burst|theme|garden|volcano|landscape|cityscape|underwater|island|cave|town|orchard)\b/i.test(label)
      && semanticVisualFactLabelHasDirectEvidenceSupportV1(label, evidenceForSupport);
  }

  if (category === "action") {
    if (/\blick(?:ing)?\b/i.test(label)) {
      return /\b(?:tongue|licking|lick|mouth)\b/i.test(evidenceForSupport);
    }
    if (/\bexhal(?:e|ing|ation)|\bbreath\b/i.test(label)) {
      return /\b(?:open mouth|mouth|breath|mist|vapor|vapour|exhalation)\b/i.test(evidenceForSupport);
    }
    if (/\briding\b.*\bhorse\b|\brider\b/i.test(label)) {
      return /\b(?:rider|horse|reins|sitting|mounted|on horse)\b/i.test(evidenceForSupport);
    }
    return /\bpointing\b|\bclasp(?:ed|ing) hands?\b|\b(?:(?:left|right|both)\s+)?(?:arm|hand|fist|leg|knee|forearm|finger|claw)s?\b.*\b(?:extended|raised|forward|back|backward|open|bent|stretched|out|reaching|clasped)\b|\b(?:fist forward|leaning forward|bent knees?|open hand|extended hand|extended claws?|open gesture|hands clasped)\b/i.test(label)
      && normalizeText(evidenceForSupport);
  }

  if (category === "state") {
    if (/\bexhal(?:e|ing|ation)|\bbreath\b/i.test(label)) {
      return /\b(?:open mouth|mouth|breath|mist|vapor|vapour|exhalation)\b/i.test(evidenceForSupport);
    }
    if (/\briding\b.*\bhorse\b|\brider\b/i.test(label)) {
      return /\b(?:rider|horse|reins|sitting|mounted|on horse)\b/i.test(evidenceForSupport);
    }
  }

  if (category === "environment") {
    return /\b(?:plants?|leafy|leaves|greenery|grassy|field|table|window|background|storm|aurora|light bands?|traffic cones?|sky|clouds?|water|underwater|island|tropical|desert|cacti|roadside|road|backyard|garden|trees?|buildings?|bridge|stairs?|steps?|fences?|terrain|landscape|natural landscape|mountains?|ground|path|room|interior|outdoor|indoor|sun|sunlight|light beams?|horizon|corridors?|hallways?|walls?|brick|bricks?|arches?|arched|lamps?|lanterns?|icy|ice|snow|volcanic|volcano(?:es)?|lava|eruption|erupting|cave|underground|crystals?|shards?|energy effects?|electric(?:al)? energy effects?|electric arcs?|electricity|aura|visual effects?|ghostly|haunted|spooky|halloween|spectral|ghost(?:[-\s]?type)?)\b/i.test(label)
      && normalizeText(evidenceForSupport);
  }

  if (category === "motif") {
    if (/\bninja\b/i.test(label)) {
      return /\b(?:shuriken|throwing star|kunai|mask|scarf|leaping|stealth)\b/i.test(evidenceForSupport);
    }
    return /\b(?:motif|patterns?|zigzag|meteor(?:\s+shower|\s+trails?)?|trails?|autumn colors?|flaming mane|mane|repeated shapes?|radial|spiral|swirl|circular|geometric|angular|emblems?|symbols?|duplicate figures?|additional figures?|two duplicate|two additional|mirrored figures?|reflections?|copies|bomb|fuse|bell|badge|light(?:ing)? streaks?|streaks?|burst|star(?:-like)? sparkles?|sparkles?|star shapes?|cream color)\b/i.test(label)
      && normalizeText(evidenceForSupport);
  }

  if (category === "cameo") {
    return /\b(?:cameo|depicted|plush|pillow|statue|toy|logo|poster|screen|card|sticker|ice cream|character representation|portrait|sketch|small|creature|bird|fox|squirrel|pok[eé]mon)\b/i.test(label)
      && normalizeText(evidenceForSupport);
  }

  return false;
}

function factGraphHasForestEvidence(factGraph) {
  return factGraphHasSemanticLabel(factGraph, SEMANTIC_VISUAL_FACT_FOREST_LABEL_PATTERN)
    || SEMANTIC_VISUAL_FACT_FOREST_SUPPORT_PATTERN.test(flattenFactGraphText([
      factGraph?.environment?.setting,
      factGraph?.environment?.plants,
      factGraph?.observations,
    ]));
}

function validateSemanticVisualFactsV1(factGraph, knownIds) {
  const findings = [];
  const semanticFacts = factGraph.semantic_visual_facts ?? [];
  if (!Array.isArray(semanticFacts)) return ["fact_graph_semantic_visual_facts_not_array"];
  const ids = new Set();

  for (const fact of semanticFacts) {
    const factId = normalizeText(fact.semantic_fact_id) || "unknown";
    const label = normalizeText(fact.label);
    const category = normalizeText(fact.category);
    const supportIds = normalizeObservationReferenceArray(fact.supporting_observation_ids);
    const evidenceText = semanticVisualFactEvidenceTextWithoutCircularClaims(fact, factGraph.observations ?? []);

    if (!normalizeText(fact.semantic_fact_id)) findings.push("fact_graph_semantic_fact_missing_id");
    if (ids.has(factId)) findings.push(`fact_graph_semantic_fact_duplicate_id:${factId}`);
    ids.add(factId);
    if (!category || !SEMANTIC_VISUAL_FACT_CATEGORIES.has(category)) {
      findings.push(`fact_graph_semantic_fact_category_invalid:${factId}`);
    }
    if (!label) findings.push(`fact_graph_semantic_fact_label_missing:${factId}`);
    if (label && !isAllowedSemanticVisualFactLabelV1(fact, factGraph.observations ?? [])) {
      findings.push(`fact_graph_semantic_fact_label_not_supported_v1:${factId}`);
    }
    if (SEMANTIC_VISUAL_FACT_UNSUPPORTED_LABEL_PATTERN.test(flattenFactGraphText([label, evidenceText]))) {
      findings.push(`fact_graph_semantic_fact_story_or_lore_not_allowed:${factId}`);
    }
    if (supportIds.length < 1) {
      findings.push(`fact_graph_semantic_fact_without_supporting_observation:${factId}`);
    }
    addMissingObservationFindings(findings, supportIds, knownIds, "fact_graph_semantic_fact_observation_missing");
    if (fact.subject_observation_id && !knownIds.has(normalizeText(fact.subject_observation_id))) {
      findings.push(`fact_graph_semantic_fact_subject_observation_missing:${factId}`);
    }
    if (!evidenceText) {
      findings.push(`fact_graph_semantic_fact_without_evidence:${factId}`);
    }

    if (SEMANTIC_VISUAL_FACT_HAPPY_LABEL_PATTERN.test(label)) {
      if (!semanticVisualFactHasSupport(fact, SEMANTIC_VISUAL_FACT_HAPPY_SUPPORT_PATTERN, factGraph, {
        circularPattern: /\bhappy expression\b/gi,
      })) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:happy_without_visible_smile_evidence`);
      }
      if (SEMANTIC_VISUAL_FACT_HAPPY_CONTRADICTION_PATTERN.test(evidenceText)) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:happy_conflicts_with_evidence`);
      }
    }
    if (SEMANTIC_VISUAL_FACT_ANGRY_OR_ANNOYED_LABEL_PATTERN.test(label)) {
      if (!semanticVisualFactHasSupport(fact, SEMANTIC_VISUAL_FACT_ANGRY_OR_ANNOYED_SUPPORT_PATTERN, factGraph, {
        circularPattern: /\b(?:angry|annoyed|irritated|scowling|frowning|aggressive|fierce)(?:\s+expression)?\b/gi,
      })) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:expression_without_visible_facial_evidence`);
      }
      if (SEMANTIC_VISUAL_FACT_ANGRY_OR_ANNOYED_CONTRADICTION_PATTERN.test(evidenceText)) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:expression_conflicts_with_evidence`);
      }
    }
    if (SEMANTIC_VISUAL_FACT_SCARED_OR_SURPRISED_LABEL_PATTERN.test(label) && !semanticVisualFactHasSupport(fact, SEMANTIC_VISUAL_FACT_SCARED_OR_SURPRISED_SUPPORT_PATTERN, factGraph, {
      circularPattern: /\b(?:scared|surprised|startled) expression\b/gi,
    })) {
      findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:expression_without_visible_facial_evidence`);
    }
    if (SEMANTIC_VISUAL_FACT_CONCERNED_LABEL_PATTERN.test(label)) {
      if (!semanticVisualFactHasSupport(fact, SEMANTIC_VISUAL_FACT_CONCERNED_SUPPORT_PATTERN, factGraph, {
        circularPattern: /\b(?:concerned|worried|uneasy)(?:\s+(?:expression|face))?\b/gi,
      })) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:expression_without_visible_facial_evidence`);
      }
      if (SEMANTIC_VISUAL_FACT_CONCERNED_CONTRADICTION_PATTERN.test(evidenceText)) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:expression_conflicts_with_evidence`);
      }
    }
    if (SEMANTIC_VISUAL_FACT_SMIRKING_LABEL_PATTERN.test(label)) {
      if (!semanticVisualFactHasSupport(fact, SEMANTIC_VISUAL_FACT_SMIRKING_SUPPORT_PATTERN, factGraph, {
        circularPattern: /\bsmirking expression\b|\bsmirk(?:ing)?\s+expression\b/gi,
      })) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:expression_without_visible_facial_evidence`);
      }
      if (SEMANTIC_VISUAL_FACT_HAPPY_CONTRADICTION_PATTERN.test(evidenceText)) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:expression_conflicts_with_evidence`);
      }
    }
    if (SEMANTIC_VISUAL_FACT_FOCUSED_OR_DETERMINED_LABEL_PATTERN.test(label)) {
      if (!semanticVisualFactHasSupport(fact, SEMANTIC_VISUAL_FACT_FOCUSED_OR_DETERMINED_SUPPORT_PATTERN, factGraph, {
        circularPattern: /\b(?:focused|determined|serious|concentrated|intent|intense)(?:\s+expression)?\b/gi,
      })) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:expression_without_visible_facial_evidence`);
      }
      if (SEMANTIC_VISUAL_FACT_FOCUSED_OR_DETERMINED_CONTRADICTION_PATTERN.test(evidenceText)) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:expression_conflicts_with_evidence`);
      }
    }
    if (SEMANTIC_VISUAL_FACT_ALERT_LABEL_PATTERN.test(label)) {
      if (!semanticVisualFactHasSupport(fact, SEMANTIC_VISUAL_FACT_ALERT_SUPPORT_PATTERN, factGraph, {
        circularPattern: /\balert(?:\s+expression)?\b/gi,
      })) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:alert_without_visible_attention_evidence`);
      }
      if (SEMANTIC_VISUAL_FACT_ALERT_CONTRADICTION_PATTERN.test(evidenceText)) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:alert_conflicts_with_evidence`);
      }
    }
    if (SEMANTIC_VISUAL_FACT_AWAKE_LABEL_PATTERN.test(label)) {
      if (!semanticVisualFactHasSupport(fact, SEMANTIC_VISUAL_FACT_AWAKE_SUPPORT_PATTERN, factGraph, {
        circularPattern: /\bawake\b/gi,
      })) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:awake_without_visible_eye_or_attention_evidence`);
      }
      if (SEMANTIC_VISUAL_FACT_AWAKE_CONTRADICTION_PATTERN.test(evidenceText)) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:awake_conflicts_with_evidence`);
      }
    }
    if (SEMANTIC_VISUAL_FACT_UPRIGHT_LABEL_PATTERN.test(label) && !semanticVisualFactHasSupport(fact, SEMANTIC_VISUAL_FACT_UPRIGHT_SUPPORT_PATTERN, factGraph)) {
      findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:state_without_visible_pose_evidence`);
    }
    if (SEMANTIC_VISUAL_FACT_SLEEPING_LABEL_PATTERN.test(label)) {
      if (!semanticVisualFactHasSupport(fact, SEMANTIC_VISUAL_FACT_SLEEPING_SUPPORT_PATTERN, factGraph)) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:sleeping_without_sleep_evidence`);
      }
      if (SEMANTIC_VISUAL_FACT_SLEEPING_CONTRADICTION_PATTERN.test(evidenceText)) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:sleeping_conflicts_with_evidence`);
      }
    }
    if (SEMANTIC_VISUAL_FACT_FOREST_LABEL_PATTERN.test(label) && !semanticVisualFactHasSupport(fact, SEMANTIC_VISUAL_FACT_FOREST_SUPPORT_PATTERN, factGraph)) {
      findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:forest_without_tree_evidence`);
    }
    if (SEMANTIC_VISUAL_FACT_RAIN_LABEL_PATTERN.test(label) && !semanticVisualFactHasSupport(fact, SEMANTIC_VISUAL_FACT_RAIN_SUPPORT_PATTERN, factGraph)) {
      findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:rain_without_weather_evidence`);
    }
    if (SEMANTIC_VISUAL_FACT_GHOSTLY_ENVIRONMENT_LABEL_PATTERN.test(label) && !semanticVisualFactHasSupport(fact, SEMANTIC_VISUAL_FACT_GHOSTLY_ENVIRONMENT_SUPPORT_PATTERN, factGraph, {
      circularPattern: /\b(?:ghostly|haunted|spooky|halloween|spectral) (?:environment|scene|setting|theme)\b/gi,
    })) {
      findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:ghostly_without_visible_environment_evidence`);
    }
    if (SEMANTIC_VISUAL_FACT_NIGHT_LABEL_PATTERN.test(label) && !semanticVisualFactHasSupport(fact, SEMANTIC_VISUAL_FACT_NIGHT_SUPPORT_PATTERN, factGraph)) {
      findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:night_without_visible_time_evidence`);
    }
    if (SEMANTIC_VISUAL_FACT_CITYSCAPE_LABEL_PATTERN.test(label) && !semanticVisualFactHasSupport(fact, SEMANTIC_VISUAL_FACT_CITYSCAPE_SUPPORT_PATTERN, factGraph, {
      circularPattern: /\b(?:cityscape|skyline|urban(?:\s+scene|\s+background)?|city\s+background)\b/gi,
    })) {
      findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:cityscape_without_visible_building_evidence`);
    }
    if (SEMANTIC_VISUAL_FACT_ROARING_LABEL_PATTERN.test(label)) {
      if (!semanticVisualFactHasSupport(fact, SEMANTIC_VISUAL_FACT_ROARING_SUPPORT_PATTERN, factGraph, {
        circularPattern: /\broaring\b/gi,
      })) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:roaring_without_visible_open_mouth_evidence`);
      }
      if (SEMANTIC_VISUAL_FACT_ROARING_CONTRADICTION_PATTERN.test(evidenceText)) {
        findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:roaring_conflicts_with_evidence`);
      }
    }
    if (
      category === "count_semantic"
      && !(
        (SEMANTIC_VISUAL_FACT_COUNT_SEMANTIC_LABEL_PATTERN.test(label) && SEMANTIC_VISUAL_FACT_COUNT_SEMANTIC_SUPPORT_PATTERN.test(evidenceText))
        || factGraphHasMatchingCountSemantic(factGraph, fact, label)
      )
    ) {
      findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:count_semantic_without_counted_visual_evidence`);
    }
    if (SEMANTIC_VISUAL_FACT_ACTION_LABEL_PATTERN.test(label) && !evidenceText) {
      findings.push(`fact_graph_semantic_fact_evidence_contradiction:${factId}:action_without_pose_evidence`);
    }
  }

  return findings;
}

function validateFactGraphSearchTermComponentsV1(factGraph) {
  const findings = [];
  for (const entry of factGraph.fact_grounded_search_terms ?? []) {
    const term = normalizeText(entry.term);
    const key = tagKey(term);
    if (!term) continue;
    if (SEMANTIC_VISUAL_FACT_UNSUPPORTED_LABEL_PATTERN.test(term)) {
      findings.push(`fact_graph_search_term_story_or_lore_not_allowed:${term}`);
    }
    if (FACT_GRAPH_SEARCH_TERM_SURFACE_OR_PRINT_PATTERN.test(term)) {
      findings.push(`fact_graph_search_term_surface_or_print_treatment_not_allowed:${term}`);
    }
    if (FACT_GRAPH_SEARCH_TERM_CARD_UI_OR_MECHANICS_PATTERN.test(term)) {
      findings.push(`fact_graph_search_term_card_ui_or_mechanics_not_allowed:${term}`);
    }
    if (
      /\b(?:happy|smiling|smile|cheerful|joyful)\b/i.test(term)
      && !factGraphHasSemanticLabel(factGraph, SEMANTIC_VISUAL_FACT_HAPPY_LABEL_PATTERN)
      && !factGraphSearchTermHasSubjectAndSemanticLabel(factGraph, term, /\bpikachu\b/i, SEMANTIC_VISUAL_FACT_HAPPY_LABEL_PATTERN)
      && !factGraphSearchTermHasEvidenceSupport(factGraph, entry, SEMANTIC_VISUAL_FACT_HAPPY_SUPPORT_PATTERN, /\bhappy expression\b/gi)
    ) {
      findings.push(`fact_graph_search_term_without_matching_fact_components:${term}`);
    }
    if (
      /\bsleeping|asleep|sleepy\b/i.test(term)
      && !factGraphHasSemanticLabel(factGraph, SEMANTIC_VISUAL_FACT_SLEEPING_LABEL_PATTERN)
      && !factGraphSearchTermHasEvidenceSupport(factGraph, entry, SEMANTIC_VISUAL_FACT_SLEEPING_SUPPORT_PATTERN)
    ) {
      findings.push(`fact_graph_search_term_without_matching_fact_components:${term}`);
    }
    if (/\bforest|woodland|woods\b/i.test(term) && !factGraphHasForestEvidence(factGraph)) {
      findings.push(`fact_graph_search_term_without_matching_fact_components:${term}`);
    }
    if (/\b(?:ten|10)\s+trees?\b/i.test(term) && !factGraphHasExactCount(factGraph, /\btrees?\b/i, 10)) {
      findings.push(`fact_graph_search_term_without_matching_fact_components:${term}`);
    }
    const hasPikachuRepresentationEvidence = factGraphSearchTermHasCharacterRepresentationEvidence(
      factGraph,
      entry,
      /\bpikachu\b/i,
      /\b(?:pillow|plush|statue|toy|figure|figurine|magnet|ice cream|logo|icon|shapes?|shaped|cookie cutter)\b/i,
    );
    if (/\bpikachu\b/i.test(term) && !factGraphHasSubjectIdentity(factGraph, /\bpikachu\b/i) && !hasPikachuRepresentationEvidence) {
      findings.push(`fact_graph_search_term_without_matching_fact_components:${term}`);
    }
    if (/\bcameo\b/i.test(term) && !factGraphSearchTermHasCameoEvidence(factGraph, entry)) {
      findings.push(`fact_graph_search_term_without_matching_fact_components:${term}`);
    }
    if (/\bpikachu\b/i.test(term) && /\b(?:pillow|plush|statue|toy|figure|figurine|magnet|ice cream|logo|icon|shapes?|shaped|cookie cutter)\b/i.test(term)) {
      if (!hasPikachuRepresentationEvidence) findings.push(`fact_graph_search_term_without_matching_fact_components:${term}`);
    }
    if (key === "pokemon" || key === "pokémon") {
      findings.push(`fact_graph_search_term_without_matching_fact_components:${term}`);
    }
  }
  return findings;
}

function validateLooseSemanticLabelsV1(factGraph) {
  const modules = normalizeObject(factGraph.modules);
  const reviewGraph = {
    ...factGraph,
    modules: {
      ...modules,
      fact_grounded_search_terms: {
        ...normalizeObject(modules.fact_grounded_search_terms),
        terms: [],
      },
    },
    semantic_visual_facts: [],
    fact_grounded_search_terms: [],
    canonical_visual_concepts: { concept_schema_version: CARD_VISUAL_CONTROLLED_VOCABULARY_VERSION, concepts: [] },
  };
  const text = flattenFactGraphText(factGraphForAcceptedLanguageReview(factGraphForArtworkLanguageReview(reviewGraph)));
  return (
    /\b(happy|cheerful|joyful|angry|surprised|scared|crying|sad|friendly|playful expression|angry expression|happy expression)\b/i.test(text)
    || isSubstanceStateAliasText(text)
  )
    ? ["fact_graph_loose_semantic_label_outside_semantic_visual_facts"]
    : [];
}

function validateFactGraphOntologyV1(factGraph, card = {}) {
  const findings = [];
  const promptBranch = normalizeText(card.prompt_branch) || resolveCardPromptMetadata(card).prompt_branch;
  const cardNameKey = tagKey(card.name);
  const observationTextById = new Map((factGraph.observations ?? []).map((observation) => [
    normalizeText(observation.observation_id),
    normalizeText([observation.label, observation.normalized_label, observation.kind].filter(Boolean).join(" ")),
  ]));

  if (["stadium", "energy"].includes(promptBranch) && (factGraph.subjects ?? []).length > 0) {
    findings.push(`fact_graph_subjects_not_expected_for_branch:${promptBranch}`);
  }

  for (const subject of factGraph.subjects ?? []) {
    const subjectText = normalizeText([
      subject.identity,
      subject.anatomy,
      subject.physical_features,
    ].filter(Boolean).join(" "));
    if (cardNameKey && tagKey(subject.identity) === cardNameKey && promptBranch !== "pokemon" && promptBranch !== "trainer") {
      findings.push(`fact_graph_card_title_as_subject:${subject.observation_id || subject.identity || "unknown"}`);
    }
    if (FACT_GRAPH_NON_LIVING_SUBJECT_LABEL_PATTERN.test(subjectText) && promptBranch !== "pokemon" && promptBranch !== "trainer") {
      findings.push(`fact_graph_nonliving_subject_identity:${subject.observation_id || subject.identity || "unknown"}`);
    }

  }

  const flattened = flattenFactGraphText(factGraph);
  if (/\bchandelure\b/i.test(normalizeText(card.name)) && /\b(?:hold|holds|holding|held by)\b[^.]{0,80}\b(?:orb|sphere|flame|lamp|chandelier)\b/i.test(flattened)) {
    findings.push("fact_graph_body_component_as_prop:chandelure");
  }

  return findings;
}

function validateFactGraphDensityV1(factGraph, card = {}) {
  const findings = [];
  const hasCardContext = Boolean(card && typeof card === "object" && (
    card.name || card.prompt_branch || card.supertype || card.subtype || card.card_category
  ));
  if (!hasCardContext) return findings;

  const promptBranch = normalizeText(card.prompt_branch) || resolveCardPromptMetadata(card).prompt_branch;
  const minimum = FACT_GRAPH_MIN_OBSERVATION_COUNT_BY_BRANCH[promptBranch];
  const observationCount = (factGraph.observations ?? []).length;
  if (minimum && observationCount < minimum) {
    findings.push(`fact_graph_observation_density_too_low:${promptBranch}:${observationCount}<${minimum}`);
  }

  return findings;
}

function validateFactGraphV1(factGraph) {
  const findings = [];
  if (!factGraph || typeof factGraph !== "object" || Array.isArray(factGraph)) {
    return ["fact_graph_not_object"];
  }

  const observations = factGraph.observations ?? [];
  if (!Array.isArray(observations) || observations.length < 1) findings.push("fact_graph_observations_missing");
  const knownIds = observationIdSet(factGraph);
  if (knownIds.size !== observations.length) findings.push("fact_graph_observation_ids_missing_or_not_unique");
  for (const observation of observations) {
    if (!observation.observation_id) findings.push("fact_graph_observation_missing_id");
    if (!observation.label && !observation.normalized_label) findings.push(`fact_graph_observation_missing_label:${observation.observation_id || "unknown"}`);
  }
  findings.push(...validateFactGraphTypedFactsV2(factGraph, knownIds));
  findings.push(...validateFactGraphModulesV2(factGraph, knownIds));
  findings.push(...validateFactGraphModuleReviewsV2(factGraph));
  findings.push(...validateCanonicalVisualConceptsV1(factGraph, knownIds));
  findings.push(...validateSemanticVisualFactsV1(factGraph, knownIds));
  findings.push(...validateFactGraphSearchTermComponentsV1(factGraph));
  findings.push(...validateLooseSemanticLabelsV1(factGraph));

  const referenceChecks = [
    ["subjects", "fact_graph_subject_observation_missing", factGraph.subjects ?? [], (entry) => [entry.observation_id]],
    ["depicted_subjects", "fact_graph_depicted_subject_observation_missing", factGraph.depicted_subjects ?? [], (entry) => [entry.observation_id]],
    ["character_representations", "fact_graph_character_representation_observation_missing", factGraph.character_representations ?? [], (entry) => [entry.observation_id]],
    ["objects_and_props", "fact_graph_object_observation_missing", factGraph.objects_and_props ?? [], (entry) => [entry.observation_id]],
    ["relationships", "fact_graph_relationship_observation_missing", factGraph.relationships ?? [], (entry) => [entry.source_observation_id, entry.target_observation_id]],
    ["semantic_visual_facts", "fact_graph_semantic_fact_observation_missing", factGraph.semantic_visual_facts ?? [], (entry) => entry.supporting_observation_ids ?? []],
    ["fact_grounded_search_terms", "fact_graph_search_term_observation_missing", factGraph.fact_grounded_search_terms ?? [], (entry) => entry.supporting_observation_ids ?? []],
  ];
  for (const [, finding, rows, getIds] of referenceChecks) {
    if (!Array.isArray(rows)) {
      findings.push(`${finding}:section_not_array`);
      continue;
    }
    for (const row of rows) addMissingObservationFindings(findings, getIds(row), knownIds, finding);
  }

  for (const subject of factGraph.subjects ?? []) {
    if (subject.subject_kind !== "scene_subject") findings.push(`fact_graph_subject_kind_invalid:${subject.observation_id || subject.identity || "unknown"}`);
    if (!subject.identity) findings.push(`fact_graph_subject_identity_missing:${subject.observation_id || "unknown"}`);
  }
  for (const subject of factGraph.depicted_subjects ?? []) {
    if (subject.subject_kind !== "depicted_subject") findings.push(`fact_graph_depicted_subject_kind_invalid:${subject.observation_id || subject.represented_identity || "unknown"}`);
    if (!subject.host_surface || !subject.surface_type) findings.push(`fact_graph_depicted_subject_host_missing:${subject.observation_id || "unknown"}`);
  }
  for (const subject of factGraph.character_representations ?? []) {
    if (subject.subject_kind !== "character_representation") findings.push(`fact_graph_character_representation_kind_invalid:${subject.observation_id || subject.represented_identity || "unknown"}`);
    if (!subject.host_object || !subject.representation_form) findings.push(`fact_graph_character_representation_host_missing:${subject.observation_id || "unknown"}`);
  }

  for (const count of factGraph.counts ?? []) {
    if (!count.count_id) findings.push("fact_graph_count_missing_id");
    if (!count.normalized_label) findings.push(`fact_graph_count_missing_label:${count.count_id || "unknown"}`);
    if (!FACT_GRAPH_COUNT_TYPES.has(count.count_type)) findings.push(`fact_graph_count_type_invalid:${count.count_id || "unknown"}`);
    if (count.supporting_observation_ids.length < 1) findings.push(`fact_graph_count_without_supporting_observation:${count.count_id || "unknown"}`);
    addMissingObservationFindings(findings, count.supporting_observation_ids, knownIds, "fact_graph_count_observation_missing");
    if (count.count_type === "exact" && count.exact_count < 1) findings.push(`fact_graph_exact_count_missing:${count.count_id || "unknown"}`);
    if (count.count_type === "estimated_range" && (count.estimated_min < 1 || count.estimated_max < count.estimated_min)) {
      findings.push(`fact_graph_estimated_count_range_invalid:${count.count_id || "unknown"}`);
    }
    if (count.count_type.startsWith("uncountable") && !count.abstention_reason) {
      findings.push(`fact_graph_count_abstention_reason_missing:${count.count_id || "unknown"}`);
    }
  }

  for (const term of factGraph.fact_grounded_search_terms ?? []) {
    if (!term.term) findings.push("fact_graph_search_term_missing_term");
    if (term.supporting_observation_ids.length < 1) {
      findings.push(`fact_graph_search_term_without_supporting_observation:${term.term || "unknown"}`);
    }
  }

  for (const layer of ["foreground", "midground", "background"]) {
    addMissingObservationFindings(findings, factGraph.scene_layers?.[layer] ?? [], knownIds, `fact_graph_scene_layer_observation_missing:${layer}`);
  }
  addMissingObservationFindings(findings, factGraph.environment?.supporting_observation_ids ?? [], knownIds, "fact_graph_environment_observation_missing");
  addMissingObservationFindings(findings, factGraph.visual_design?.supporting_observation_ids ?? [], knownIds, "fact_graph_visual_design_observation_missing");
  for (const uncertainty of factGraph.uncertainty_and_abstentions ?? []) {
    addMissingObservationFindings(findings, uncertainty.affected_observation_ids ?? [], knownIds, "fact_graph_uncertainty_observation_missing");
  }

  for (const key of FACT_GRAPH_COVERAGE_KEYS) {
    if (!FACT_GRAPH_COVERAGE_REVIEW_STATUSES.has(reviewStatusForCoverage(factGraph, key))) {
      findings.push(`fact_graph_coverage_review_missing:${key}`);
    }
  }
  const coverageEntryChecks = [
    ["subjects_review", factGraph.subjects],
    ["depicted_subjects_review", factGraph.depicted_subjects],
    ["character_representations_review", factGraph.character_representations],
    ["counts_review", factGraph.counts],
    ["objects_and_props_review", factGraph.objects_and_props],
    ["relationships_review", factGraph.relationships],
    ["surface_and_scan_cues_review", factGraph.surface_and_scan_cues],
  ];
  for (const [key, rows] of coverageEntryChecks) {
    if (Array.isArray(rows) && rows.length > 0 && reviewStatusForCoverage(factGraph, key) !== "observed") {
      findings.push(`fact_graph_coverage_review_conflicts_with_entries:${key}`);
    }
  }
  const emptySectionChecks = [
    ["subjects_review", factGraph.subjects],
    ["depicted_subjects_review", factGraph.depicted_subjects],
    ["character_representations_review", factGraph.character_representations],
    ["counts_review", factGraph.counts],
    ["objects_and_props_review", factGraph.objects_and_props],
    ["relationships_review", factGraph.relationships],
    ["surface_and_scan_cues_review", factGraph.surface_and_scan_cues],
  ];
  for (const [key, rows] of emptySectionChecks) {
    if (!sectionCoveredOrObserved(factGraph, key, rows)) findings.push(`fact_graph_empty_section_without_review:${key}`);
  }

  if ((factGraph.fact_grounded_search_terms ?? []).length < 1) findings.push("fact_graph_search_terms_missing");
  if (factGraphContainsInterpretedExpression(factGraph)) findings.push("fact_graph_interpreted_expression_not_allowed");
  const acceptedLanguageFactGraph = factGraphForAcceptedLanguageReview({
    ...factGraph,
    semantic_visual_facts: [],
    canonical_visual_concepts: {
      concept_schema_version: CARD_VISUAL_CONTROLLED_VOCABULARY_VERSION,
      concepts: [],
    },
  });
  const artworkAcceptedLanguageFactGraph = factGraphForAcceptedLanguageReview(factGraphForArtworkLanguageReview(acceptedLanguageFactGraph));
  if (/\b(sexy|attractive|beautiful|seductive|voluptuous|breast size|large breasts|small breasts|majestic|confident)\b/i.test(flattenFactGraphText(artworkAcceptedLanguageFactGraph))) {
    findings.push("fact_graph_subjective_or_interpreted_label_not_allowed");
  }
  if (new RegExp(VISUAL_LANGUAGE_STORY_OR_LORE_PATTERN.source, "i").test(flattenFactGraphText(artworkAcceptedLanguageFactGraph))) {
    findings.push("fact_graph_story_or_lore_language_not_allowed");
  }
  findings.push(...validateFactGraphGroundedFieldsV1(factGraph, knownIds));
  findings.push(...validateFactGraphCountConsistencyV1(factGraph));

  return uniqueSorted(findings);
}

export function validateVisualDescriptionPayloadV1(payload, card = {}) {
  const findings = [];
  const visualAttributes = payload?.visual_attributes;
  const normalizedVisualAttributes = normalizeVisualAttributesV1(visualAttributes);
  const factGraph = normalizedVisualAttributes.fact_graph;
  const artworkDescription = buildFactGraphCompatibilityDigestV1(factGraph);
  const cardSurfaceAndPrintingCues = normalizeSurfaceCues(factGraphSurfaceDigest(factGraph));
  const semanticTags = factGraphSearchTerms(factGraph);
  const qualityFlags = normalizeQualityFlags(payload?.quality_flags);
  const descriptionConfidence = Number(payload?.description_confidence);
  const attributeConfidence = Number(payload?.attribute_confidence);

  if (!visualAttributes || typeof visualAttributes !== "object" || Array.isArray(visualAttributes)) {
    findings.push("visual_attributes_not_object");
  }
  if (normalizedVisualAttributes.fact_schema_version !== CARD_VISUAL_FACT_GRAPH_SCHEMA_VERSION) {
    findings.push("fact_schema_version_invalid");
  }
  findings.push(...validateFactGraphV1(factGraph));
  findings.push(...validateFactGraphOntologyV1(factGraph, card));
  if (semanticTags.length < 1) findings.push("semantic_tags_missing");
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
  const factGraph = attributes.fact_graph ?? {};

  return [
    "Compatibility digest:",
    normalizeText(row.artwork_description),
    "",
    "Printing cues:",
    normalizeText(row.card_surface_and_printing_cues),
    "",
    "Fact graph:",
    stableJson(factGraph),
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
        "Treat physically present people as scene_subject records.",
        "Record visible hair, clothing, posture, gestures, held objects, facial evidence, visible body regions, accessories, and environment as atomic observations and typed facts.",
        "Use the human_appearance module for visible body regions: face, neck, shoulders, upper_chest, midriff, arms, hands, legs, feet, and any visible tattoos or markings.",
        "Use the clothing module for garments, neckline type, sleeve type, headwear, footwear, armor, cape, mask, and accessories.",
        "Do not store subjective body-size, attractiveness, or personality labels. Use factual visibility and clothing terms only.",
        "Do not store interpreted emotions such as confident, sad, angry, or determined. Store visible facial evidence only.",
        "If no human trainer is visible, leave subjects empty and set subjects_review to the correct explicit coverage result.",
      ];
    case "stadium":
      return [
        "Resolved branch instructions:",
        "Use Branch 3 - Stadium.",
        "Environment and place observations are the primary facts.",
        "Record separate observations and typed facts for sky, clouds, lightning bolts or strikes, colored light bands, trees/plants, terrain, architecture, buildings, horizon, repeated elements, palette, lighting, and composition.",
        "Lightning, sky, aurora-like color bands, clouds, trees, terrain, and other environment facts are observations, environment facts, objects/props, counts, or design facts; they are not subjects.",
        "Do not put the card title, an event name, weather phenomenon, or setting name into subjects.",
        "For Stadium cards, subjects must be [] and subjects_review must be none_visible unless a physically present living person, Pokemon, or creature is visible.",
        "If you call something weather or time of day, populate the matching weather or time_of_day_cues field and cite supporting observation IDs.",
        "Do not invent people, Pokemon, crowds, activity, weather, time of day, or a specific named setting unless directly visible.",
      ];
    case "energy":
      return [
        "Resolved branch instructions:",
        "Use Branch 4 - Energy.",
        "Treat Energy cards as symbolic or abstract illustrations unless concrete subjects or objects are visibly present.",
        "Record symbols, gradients, radiating lines, circular motifs, repeated shapes, color fields, highlights, central emblem placement, borders between color regions, lighting, and symmetry as separate observations and typed facts.",
        "Do not name the symbol by card identity such as Psychic Energy. Describe visible shape instead: black eye-like symbol, centered circular emblem, purple gradient, white radiating lines, symmetrical abstract composition.",
        "Do not put an energy symbol, eye symbol, color field, glow, or abstract form into subjects. Use subjects: [] and subjects_review: none_visible unless a living/entity subject is actually visible.",
        "If the card shows one central symbol, create an observation and exact count for the symbol. Add only useful fact-grounded search terms from visible symbol, palette, and composition facts.",
        "Do not invent creatures, environments, metaphysical purpose, powers, or lore.",
      ];
    case "item_tool_supporter":
      return [
        "Resolved branch instructions:",
        "Use Branch 5 - Item / Tool / Supporter.",
        "Record actual visible objects, tools, devices, props, scenes, people, and character representations as fact graph observations.",
        "If a Supporter card shows a human trainer, record that person as a scene_subject rather than a creature.",
        "Do not put a non-living item or tool into subjects. The main item belongs in observations and objects_and_props.",
        "For a visible bomb, bell, badge, fossil, device, or tool, use subjects: [], subjects_review: none_visible, and objects_and_props_review: observed.",
        "For a mechanical, bomb-like, badge-like, bell-like, fossil-like, or tool-like object, create separate observations and typed facts for central object, body, panels, seams, bands, handles, buttons, openings, fuses, sparks, visual effects, background color regions, crop/framing, palette, and composition when visible.",
        "Do not assert actual materials such as metal or plastic. Describe material appearance only, such as dark rounded body, yellow stripe band, bright spark, metallic-looking highlight, or reflective-looking highlight.",
        "For each visible main object, create an exact count of 1 and set count_reference to that count_id.",
        "Add useful fact-grounded search terms from visible object, shape, color, surrounding effects, or composition facts. Do not pad redundant or weak terms to satisfy a quota.",
        "Do not infer object purpose, gameplay function, or Pokemon users unless visible.",
      ];
    case "pokemon":
    default:
      return [
        "Resolved branch instructions:",
        "Use Branch 1 - Pokemon.",
        "Record physically present Pokemon as scene_subject records.",
        "Record visible anatomy, physical features, face position, eye evidence or abstention, mouth evidence or abstention, limbs or appendages, wings, tails, horns, claws, markings, flames/effects, body components, colors, pose, orientation, action/state, crop/framing, background, palette, lighting, composition, and interactions as separate observations and typed facts.",
        "Use the creature_anatomy module for body regions, physical features, pose/orientation, and effects.",
        "If the card name contains multiple Pokemon, record each visible Pokemon as a separate subject. Do not merge them into one hybrid unless the image literally shows a fused body.",
        "For object-like Pokemon, body components are anatomy, not props. Chandelier arms, lantern bodies, flames, or central glass/body regions must not be described as separate held objects unless a separate object is visibly independent.",
        "Do not default to standing. Use floating, diagonal, cropped, upright, or cannot_determine unless feet or contact with ground are visible.",
        "Store visible facial evidence in anatomy fields. If a reusable semantic expression/state is visually supported, store it only in semantic_visual_facts with evidence and observation IDs.",
      ];
  }
}

function buildPrompt(card) {
  const promptMetadata = resolveCardPromptMetadata(card);
  const expectedVisualSubjects = expectedVisualSubjectsFromCardName(card.name);
  const branchLabel = PROMPT_BRANCH_LABELS[promptMetadata.prompt_branch] ?? PROMPT_BRANCH_LABELS.pokemon;
  return [
    "# CARD_VISUAL_FACT_EXTRACTION_PROMPT_V2",
    "## Modular Exhaustive Observable Fact Graph System",
    `## Fact Graph Schema: ${CARD_VISUAL_FACT_GRAPH_SCHEMA_VERSION}`,
    "",
    "Extract exhaustive directly observable visual facts from this exact Pokemon Trading Card Game card image.",
    "Do not write a prose description, story, caption, review, or mood narrative.",
    "The output is a reusable fact graph for semantic search, Taste Engine, Grookai Signature, cameo detection, visual matching, future visuals, and optional downstream story generation.",
    "The fact graph must be sufficient for another system to write prose later, but it must not contain story.",
    "Use canonical card-type metadata only for branch selection and expected-subject checking. It is not visual evidence.",
    "Do NOT use lore, flavor text, attacks, Pokedex entries, card mechanics, rarity, market data, or set metadata as visual evidence.",
    "Inspect both the illustrated artwork and the printed card interface. Artwork facts and card UI facts are separate knowledge layers.",
    "Canonical database metadata is authoritative expected identity. Visible card UI and print markers are image-derived evidence that may support, refine, or conflict with canonical identity. Artwork fact graph modules describe visual content inside the illustrated artwork.",
    "Record visible card UI and print markers when they may help identify the exact printing, including card name text, HP text, collector numbers, set symbols, rarity marks, copyright lines, bottom legal text, illustrator text, promo stamps, WB Kids logos or wording, regulation marks, edition markers, language-specific print text, visible error or correction markers, and other small printed differences.",
    "Use card_ui_and_print_markers for printed card interface facts outside the illustrated artwork area. Do not put those facts in human_appearance, creature_anatomy, clothing, objects_and_props, environment, composition, color_and_light, or visual_effects.",
    "Do not copy canonical metadata into the output unless it is visibly supported by the image. If visible UI duplicates canonical metadata, record it as image-derived card UI evidence, not as artwork.",
    "If small print cannot be read reliably, do not invent OCR text. Record an unreadable or partially readable observation and add an explicit card_ui_and_print_markers abstention.",
    "Visible text inside the illustrated scene, such as a street sign, book, poster, screen, or in-scene logo, remains artwork-scene evidence and should not be automatically classified as card UI.",
    "Capture all useful visible facts, not only the main subject.",
    "Every meaningful visible fact must appear as an atomic observation with an observation_id.",
    "Every reusable claim must also appear in typed_facts with fact_id, module, field_path, claim, value, supporting_observation_ids, confidence, and evidence_strength.",
    "Subjects, depicted_subjects, character_representations, counts, relationships, search terms, typed facts, module facts, and nontrivial environment/design facts must reference supporting observation_ids.",
    "Completeness is reviewed per module, not by a global fact count.",
    "For every module, create one module_reviews entry with review_status, omission_risk, evidence_quality, and field-specific abstentions when needed.",
    "Allowed module review statuses are complete, likely_complete, partial_due_to_crop, partial_due_to_low_resolution, partial_due_to_occlusion, partial_due_to_glare, none_visible, not_applicable, and uncertain.",
    "Use complete or likely_complete only when another careful pass is unlikely to find meaningful visible facts omitted from that module.",
    "Use none_visible, not_applicable, or a source-limitation status for empty modules. Do not invent content to make a module appear complete.",
    "Count repeated visible elements whenever practical. Use exact counts when countable; use estimated ranges or abstentions when not countable.",
    "If a forest has 10 visible trees, record an exact tree count of 10 and reference the tree observation.",
    "Keep these concepts rigidly separate:",
    "- scene_subject: physically present living/entity subject in the illustrated scene.",
    "- depicted_subject: character/entity shown inside another surface such as poster, card, sign, photo, TV, screen, book, painting, or frame.",
    "- character_representation: object shaped like or patterned after a character, such as plush, pillow, statue, toy, ice cream, food decoration, logo, sticker, clothing pattern, or wall pattern.",
    "Pikachu as a pillow or ice cream is a character_representation, not a scene_subject.",
    "Store meaningful semantic visual facts in semantic_visual_facts when directly supported by evidence. Allowed examples include happy, smiling, sleeping, angry, surprised, crying, forest, rainy, floating, eating, fighting, cameo, Pikachu pillow, or ten trees, but only with supporting observation IDs and evidence fields.",
    "semantic_visual_facts is not optional when obvious reusable meaning is visibly supported. Actively add entries for supported subject states/actions such as floating, flying, sleeping, eating, fighting, standing, sitting, or lying down; environment concepts such as forest, outdoor stadium, rain, snow, nighttime, sunset, water body, or food scene; exact useful count concepts such as ten trees; and cameo/representation concepts such as Pikachu poster or Pikachu pillow.",
    "If a pose/action already appears in creature_anatomy or human_appearance and it is useful for future search, also add a semantic_visual_facts entry with the same supporting observation IDs and concrete evidence.",
    "If an environment field records forest, trees, buildings, stadium, water, weather, or time-of-day cues, add the matching semantic_visual_facts entry unless the field is uncertain or purely abstained.",
    "Do not put evidence-only facial details such as open eyes, closed eyes, neutral eyebrows, face visible, or eyes not clearly visible into semantic_visual_facts as standalone labels. Put those details inside facial_evidence or semantic fact evidence fields supporting a useful label such as smiling, sleeping, surprised, or cannot_determine.",
    "Do not put physical print treatment or card UI terms such as gold foil, foil, HP, attack text, weakness, resistance, retreat cost, collector number, rarity, set symbol, copyright, illustrator text, energy symbol, or type symbol into artwork fact_grounded_search_terms. Keep visible printed symbols and text in card_ui_and_print_markers only.",
    "If no semantic visual fact is supportable, use semantic_visual_facts: []. Do not leave the array empty merely because the fact also exists elsewhere in the graph.",
    "Do not store loose interpreted expression labels in subject, anatomy, clothing, object, environment, visual_design, or search-term fields. Store facial evidence in those modules, then place supported labels such as happy or sleeping only in semantic_visual_facts.",
    "Never store unsupported personality, attractiveness, body-size, theme, intention, lore, or story as semantic facts. Confident, fierce, majestic, sexy, protecting a friend, symbolizing hope, and similar claims are not V2 facts.",
    "For substance-coded visual searches, record only concrete visible cues such as red eyes, bloodshot-looking eyes, half-closed eyes, drooping eyelids, smoke, vapor, haze, smoke near mouth, or pipe-like/cigarette-like objects. Do not infer or store stoner, high, under the influence, intoxicated, drugged, or stoned as visual facts, semantic facts, or search terms.",
    "Do not store subjective human appearance labels such as sexy, attractive, body size, breast size, or similar judgments. Store visible body regions and clothing facts only.",
    "No story: allowed facts include Pikachu, standing, dark forest, 10 trees. Do not write Pikachu is lost in the forest.",
    "Use unknown, not_visible, cannot_determine, or explicit coverage review statuses instead of inventing content.",
    "Empty categories are valid only when coverage_reviews proves the category was considered.",
    "Separate illustrated material appearance from physical card surface. Only report border, foil, texture, finish, glare, crop, or scan quality when reliably visible.",
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
    "Branch 1 - Pokemon: extract physically present Pokemon/creature subjects and all supporting scene facts.",
    "Branch 2 - Trainer: extract visible human subjects, clothing, gesture, scene facts, and object facts.",
    "Branch 3 - Stadium: extract environment, structures, terrain, repeated elements, and scene facts.",
    "Branch 4 - Energy: extract symbols, abstract forms, repeated shapes, palette, lighting, and composition facts.",
    "Branch 5 - Item / Tool / Supporter: extract objects, props, people if visible, scenes, representations, and interactions.",
    "Current operator scope defers Energy cards from active extraction until a later explicit re-enable.",
    "Use only the resolved prompt branch for this card.",
    "",
    ...promptBranchInstructions(promptMetadata.prompt_branch),
    "",
    "Fact graph rules:",
    "observations is the factual backbone. Use stable IDs such as obs_subject_001, obs_tree_group_001, obs_palette_001, obs_surface_001.",
    `visual_attributes.fact_schema_version must be exactly ${CARD_VISUAL_FACT_GRAPH_SCHEMA_VERSION}.`,
    "This is an inventory task, not a summary task. Split visible components into distinct observations instead of collapsing them into three broad labels.",
    "Do not chase a fixed fact count. A sparse card may have fewer facts; a dense full-art Trainer may have many more. Success is module completeness, not quantity.",
    "Every subject, depicted_subject, character_representation, object, relationship, count, scene layer, environment support, design support, typed fact, module fact, uncertainty, and search-term reference must point to an observation_id that actually exists in observations.",
    "Every module fact_ids entry must point to a real typed_facts.fact_id.",
    "semantic_visual_facts entries must include semantic_fact_id, category, label, subject_observation_id when subject-specific, supporting_observation_ids, evidence, confidence, and uncertainty.",
    "For semantic facts, evidence must be concrete visible evidence such as smiling mouth, closed eyes, lying-down body position, raised arms, visible trees, rain streaks, or a plush/pillow host object. If the evidence is weak or absent, abstain.",
    "A semantic fact label must not contradict its evidence. Do not output happy if the evidence says frowning or face not visible. Do not output sleeping if the evidence says eyes open and running.",
    "Never invent support IDs such as obs_visual_design_001 unless that exact observation object exists in observations. For motifs, composition, palette, or abstract backgrounds, cite the concrete observation IDs that already record the shape, pattern, color, or background evidence.",
    "Do not create typed_facts for absent printed UI fields such as no HP text, no rarity mark, or no promo stamp. Absence is represented by leaving the relevant card_ui_and_print_markers array empty. Use a module review abstention only when a visible UI area exists but cannot be read.",
    "Do not create placeholder counts for things that are not visible. Never create an exact count with exact_count 0. If nothing is countable, use counts: [] and counts_review: none_visible.",
    "Use count_type exact for 1, 2, 3, or other countable repeated elements. Use many only when dense elements cannot be individually counted; do not combine count_type many with an exact_count or an exact min/max range.",
    "Every visible salient object in objects_and_props must have a count_reference that points to a real count_id. Do not use count_reference: not_visible for a visible object.",
    "Flames, lightning, sky, background, symbols, gradients, color fields, trees, bombs, bells, badges, tools, and abstract effects are not scene_subjects. Record them as observations, objects_and_props, environment, visual_design, counts, or relationships as appropriate.",
    "fact_grounded_search_terms should capture useful visible search concepts only. Do not pad redundant, generic, nonvisual, or weak terms to satisfy a quota; one or two strong terms are better than three padded terms.",
    "Compound search terms such as happy Pikachu, sleeping Pokemon, Pikachu pillow, forest background, or ten trees are allowed only when each component is supported by subjects, semantic_visual_facts, counts, or representation records.",
    "Do not automatically add OCR text, card name text, HP, collector numbers, copyright lines, promo marks, stamps, or logos to fact_grounded_search_terms. Card UI terms remain in card_ui_and_print_markers until a future identity-resolution or search layer intentionally exposes them.",
    "scene_layers arrays must contain observation_id strings only, never labels such as tree, sky, or Pikachu.",
    "environment.supporting_observation_ids, visual_design.supporting_observation_ids, relationships, counts, uncertainty, and search terms must cite observation_id values only.",
    "If any environment field is populated, environment.supporting_observation_ids must cite the observations that prove it. If any visual_design field is populated or visual_design_review is observed, visual_design.supporting_observation_ids must not be empty and must cite the observations that prove palette, lighting, composition, framing, motifs, repeated shapes, or motion cues.",
    "Coverage reviews must match entries: if counts has entries, counts_review must be observed; if subjects has entries, subjects_review must be observed. Use none_visible only when the array is empty.",
    "If setting, sky, terrain, or observation labels use storm, stormy, thunderstorm, rain, snow, wind, lightning, fog, or similar weather terms, populate environment.weather and cite supporting observation_ids. Otherwise describe only the visible sky, light bands, or lightning shapes.",
    "Do not assert setting, weather, time of day, action, pose, material, surface, or anatomy without a visible observation and supporting observation_id.",
    "material_appearance may describe visible appearance only. Avoid actual material names such as metal, plastic, glass, wood, stone, rubber, fabric, paper, steel, iron, gold, or silver unless the material is visibly labeled; prefer empty array or visual cues like dark rounded surface, yellow band, bright highlight.",
    "Search terms must not cite count_id values. Counts cite observations; search terms cite observations.",
    "subjects.subject_kind must be exactly scene_subject. depicted_subjects.subject_kind must be exactly depicted_subject. character_representations.subject_kind must be exactly character_representation.",
    "counts.count_type must be one of: exact, estimated_range, many, uncountable_due_to_crop, uncountable_due_to_density, not_visible.",
    "fact_grounded_search_terms must cite supporting observation_ids. Search terms may include useful future-search phrases such as sleeping Pikachu, Pikachu pillow, forest background, ten trees, food scene, cozy interior, purple flames, or circular motif only when supported by observations.",
    "Each fact_grounded_search_terms entry must include at least one supporting observation_id.",
    "Do not include set names, attacks, rarity labels, card mechanics, franchise labels, market data, generic filler, unsupported lore, or colloquial substance-state aliases such as stoner, high, under the influence, intoxicated, drugged, or stoned in search terms.",
    "coverage_reviews must include all required review keys. Use observed when the category has entries; otherwise use none_visible, not_applicable, cannot_determine_due_to_low_resolution, cannot_determine_due_to_crop, cannot_determine_due_to_glare, or uncertain.",
    "card_ui_and_print_markers must include fact_ids plus observation-id arrays for name_text, hp_text, collector_number, set_symbol, rarity_mark, copyright_line, bottom_line_text, promo_stamp, logo, energy_symbol, regulation_mark, illustrator_text, error_marker, and other_print_marker evidence.",
    "Every observation ID listed in card_ui_and_print_markers must also exist as a full observation object in observations. Never place a placeholder ID such as obs_hp_001 or obs_copyright_001 into the UI module unless that exact observation_id exists in observations.",
    "If a printed UI field is visible but unreadable, create an observation for the visible-but-unreadable print area, reference it from the correct card_ui_and_print_markers field, and add a module_reviews abstention. If the print area cannot be located at all, leave the field array empty and add an abstention without inventing an observation ID.",
    "If a card UI typed fact cites an observation ID, that exact observation must exist in observations and the fact_id must be listed in card_ui_and_print_markers.fact_ids.",
    "Use card UI observation kinds such as card_ui_text, card_ui_symbol, print_marker, promo_stamp, copyright_text, collector_number, rarity_mark, set_symbol, regulation_mark, illustrator_text, bottom_line_text, logo, error_marker, card_name_text, or hp_text. Do not force UI observations into generic artwork object kinds.",
    "module_reviews must include all required module names: subjects, human_appearance, creature_anatomy, clothing, objects_and_props, environment, composition, color_and_light, visual_effects, card_ui_and_print_markers, counts, relationships, surface_and_scan_cues, uncertainty_and_abstentions, fact_grounded_search_terms.",
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
  const observationIdArraySchema = { type: "array", items: { type: "string" } };
  const stringArraySchema = { type: "array", items: { type: "string" } };
  const confidenceSchema = { type: "number", minimum: 0, maximum: 1 };
  const factIdArraySchema = { type: "array", items: { type: "string" } };
  const observationItemSchema = {
    type: "object",
    additionalProperties: false,
    required: [
      "observation_id",
      "kind",
      "label",
      "normalized_label",
      "scene_layer",
      "frame_position",
      "visibility",
      "salience",
      "confidence",
      "evidence_strength",
    ],
    properties: {
      observation_id: { type: "string" },
      kind: { type: "string" },
      label: { type: "string" },
      normalized_label: { type: "string" },
      scene_layer: { type: "string" },
      frame_position: { type: "string" },
      visibility: { type: "string" },
      salience: { type: "string" },
      confidence: confidenceSchema,
      evidence_strength: { type: "string" },
    },
  };
  const typedFactSchema = {
    type: "object",
    additionalProperties: false,
    required: [
      "fact_id",
      "module",
      "field_path",
      "claim",
      "value",
      "supporting_observation_ids",
      "confidence",
      "evidence_strength",
    ],
    properties: {
      fact_id: { type: "string" },
      module: { type: "string", enum: [...FACT_GRAPH_MODULE_NAMES] },
      field_path: { type: "string" },
      claim: { type: "string" },
      value: { type: "string" },
      supporting_observation_ids: observationIdArraySchema,
      confidence: confidenceSchema,
      evidence_strength: { type: "string" },
    },
  };
  const bodyRegionSchema = {
    type: "object",
    additionalProperties: false,
    required: ["subject_observation_id", "region", "visibility", "details", "supporting_observation_ids", "confidence"],
    properties: {
      subject_observation_id: { type: "string" },
      region: { type: "string" },
      visibility: { type: "string" },
      details: stringArraySchema,
      supporting_observation_ids: observationIdArraySchema,
      confidence: confidenceSchema,
    },
  };
  const appearanceRowSchema = {
    type: "object",
    additionalProperties: false,
    required: ["subject_observation_id", "label", "details", "supporting_observation_ids", "confidence"],
    properties: {
      subject_observation_id: { type: "string" },
      label: { type: "string" },
      details: stringArraySchema,
      supporting_observation_ids: observationIdArraySchema,
      confidence: confidenceSchema,
    },
  };
  const humanFacialEvidenceSchema = {
    type: "object",
    additionalProperties: false,
    required: [
      "subject_observation_id",
      "face_position",
      "eyes",
      "mouth",
      "eyebrows",
      "other_visible_evidence",
      "supporting_observation_ids",
      "confidence",
    ],
    properties: {
      subject_observation_id: { type: "string" },
      face_position: { type: "string" },
      eyes: { type: "string" },
      mouth: { type: "string" },
      eyebrows: { type: "string" },
      other_visible_evidence: stringArraySchema,
      supporting_observation_ids: observationIdArraySchema,
      confidence: confidenceSchema,
    },
  };
  const clothingGarmentSchema = {
    type: "object",
    additionalProperties: false,
    required: [
      "subject_observation_id",
      "body_area",
      "garment",
      "neckline_type",
      "sleeve_type",
      "colors",
      "visible_details",
      "supporting_observation_ids",
      "confidence",
    ],
    properties: {
      subject_observation_id: { type: "string" },
      body_area: { type: "string" },
      garment: { type: "string" },
      neckline_type: { type: "string" },
      sleeve_type: { type: "string" },
      colors: stringArraySchema,
      visible_details: stringArraySchema,
      supporting_observation_ids: observationIdArraySchema,
      confidence: confidenceSchema,
    },
  };
  const creatureAnatomyRowSchema = {
    type: "object",
    additionalProperties: false,
    required: ["subject_observation_id", "region", "feature", "visibility", "colors", "details", "supporting_observation_ids", "confidence"],
    properties: {
      subject_observation_id: { type: "string" },
      region: { type: "string" },
      feature: { type: "string" },
      visibility: { type: "string" },
      colors: stringArraySchema,
      details: stringArraySchema,
      supporting_observation_ids: observationIdArraySchema,
      confidence: confidenceSchema,
    },
  };
  const poseOrientationSchema = {
    type: "object",
    additionalProperties: false,
    required: ["subject_observation_id", "pose", "orientation", "action_state", "supporting_observation_ids", "confidence"],
    properties: {
      subject_observation_id: { type: "string" },
      pose: stringArraySchema,
      orientation: { type: "string" },
      action_state: stringArraySchema,
      supporting_observation_ids: observationIdArraySchema,
      confidence: confidenceSchema,
    },
  };
  const moduleFactIdBaseProperties = {
    fact_ids: factIdArraySchema,
  };
  const moduleReviewSchema = {
    type: "object",
    additionalProperties: false,
    required: ["module", "review_status", "omission_risk", "evidence_quality", "abstentions"],
    properties: {
      module: { type: "string", enum: [...FACT_GRAPH_MODULE_NAMES] },
      review_status: { type: "string", enum: [...FACT_GRAPH_MODULE_REVIEW_STATUSES] },
      omission_risk: { type: "string", enum: [...FACT_GRAPH_MODULE_OMISSION_RISK_VALUES] },
      evidence_quality: { type: "string", enum: [...FACT_GRAPH_MODULE_EVIDENCE_QUALITY_VALUES] },
      abstentions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["field_path", "reason", "affected_observation_ids"],
          properties: {
            field_path: { type: "string" },
            reason: { type: "string" },
            affected_observation_ids: observationIdArraySchema,
          },
        },
      },
    },
  };
  const semanticVisualFactEvidenceSchema = {
    type: "object",
    additionalProperties: false,
    required: [...SEMANTIC_VISUAL_FACT_EVIDENCE_FIELDS],
    properties: Object.fromEntries(SEMANTIC_VISUAL_FACT_EVIDENCE_FIELDS.map((field) => [field, stringArraySchema])),
  };
  const semanticVisualFactSchema = {
    type: "object",
    additionalProperties: false,
    required: [
      "semantic_fact_id",
      "category",
      "label",
      "subject_observation_id",
      "supporting_observation_ids",
      "evidence",
      "confidence",
      "uncertainty",
    ],
    properties: {
      semantic_fact_id: { type: "string" },
      category: { type: "string", enum: [...SEMANTIC_VISUAL_FACT_CATEGORIES] },
      label: { type: "string" },
      subject_observation_id: { type: "string" },
      supporting_observation_ids: observationIdArraySchema,
      evidence: semanticVisualFactEvidenceSchema,
      confidence: confidenceSchema,
      uncertainty: { type: "string" },
    },
  };

  return {
    type: "object",
    additionalProperties: false,
    required: [
      "visual_attributes",
      "description_confidence",
      "attribute_confidence",
      "quality_flags",
    ],
    properties: {
      visual_attributes: {
        type: "object",
        additionalProperties: false,
        required: ["fact_schema_version", "fact_graph"],
        properties: {
          fact_schema_version: { type: "string", enum: [CARD_VISUAL_FACT_GRAPH_SCHEMA_VERSION] },
          fact_graph: {
            type: "object",
            additionalProperties: false,
            required: [
              "observations",
              "typed_facts",
              "subjects",
              "depicted_subjects",
              "character_representations",
              "counts",
              "scene_layers",
              "environment",
              "objects_and_props",
              "relationships",
              "visual_design",
              "surface_and_scan_cues",
              "coverage_reviews",
              "modules",
              "module_reviews",
              "semantic_visual_facts",
              "uncertainty_and_abstentions",
              "fact_grounded_search_terms",
            ],
            properties: {
              observations: { type: "array", items: observationItemSchema },
              typed_facts: { type: "array", items: typedFactSchema },
              subjects: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "observation_id",
                    "subject_kind",
                    "identity",
                    "identity_confidence",
                    "anatomy",
                    "physical_features",
                    "pose",
                    "orientation",
                    "action_state",
                    "facial_evidence",
                    "clothing_or_accessories",
                    "colors",
                    "visibility",
                  ],
                  properties: {
                    observation_id: { type: "string" },
                    subject_kind: { type: "string", enum: ["scene_subject"] },
                    identity: { type: "string" },
                    identity_confidence: confidenceSchema,
                    anatomy: stringArraySchema,
                    physical_features: stringArraySchema,
                    pose: stringArraySchema,
                    orientation: { type: "string" },
                    action_state: stringArraySchema,
                    facial_evidence: {
                      type: "object",
                      additionalProperties: false,
                      required: ["eyes", "mouth", "eyebrows", "face_position", "other_visible_evidence"],
                      properties: {
                        eyes: { type: "string" },
                        mouth: { type: "string" },
                        eyebrows: { type: "string" },
                        face_position: { type: "string" },
                        other_visible_evidence: stringArraySchema,
                      },
                    },
                    clothing_or_accessories: stringArraySchema,
                    colors: stringArraySchema,
                    visibility: { type: "string" },
                  },
                },
              },
              depicted_subjects: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "observation_id",
                    "subject_kind",
                    "represented_identity",
                    "identity_confidence",
                    "host_surface",
                    "surface_type",
                    "visibility",
                    "confidence",
                  ],
                  properties: {
                    observation_id: { type: "string" },
                    subject_kind: { type: "string", enum: ["depicted_subject"] },
                    represented_identity: { type: "string" },
                    identity_confidence: confidenceSchema,
                    host_surface: { type: "string" },
                    surface_type: { type: "string" },
                    visibility: { type: "string" },
                    confidence: confidenceSchema,
                  },
                },
              },
              character_representations: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "observation_id",
                    "subject_kind",
                    "represented_identity",
                    "identity_confidence",
                    "host_object",
                    "representation_form",
                    "visibility",
                    "confidence",
                  ],
                  properties: {
                    observation_id: { type: "string" },
                    subject_kind: { type: "string", enum: ["character_representation"] },
                    represented_identity: { type: "string" },
                    identity_confidence: confidenceSchema,
                    host_object: { type: "string" },
                    representation_form: { type: "string" },
                    visibility: { type: "string" },
                    confidence: confidenceSchema,
                  },
                },
              },
              counts: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "count_id",
                    "normalized_label",
                    "count_type",
                    "exact_count",
                    "estimated_min",
                    "estimated_max",
                    "abstention_reason",
                    "supporting_observation_ids",
                    "scene_layer",
                    "confidence",
                  ],
                  properties: {
                    count_id: { type: "string" },
                    normalized_label: { type: "string" },
                    count_type: {
                      type: "string",
                      enum: [
                        "exact",
                        "estimated_range",
                        "many",
                        "uncountable_due_to_crop",
                        "uncountable_due_to_density",
                        "not_visible",
                      ],
                    },
                    exact_count: { type: "integer", minimum: 0 },
                    estimated_min: { type: "integer", minimum: 0 },
                    estimated_max: { type: "integer", minimum: 0 },
                    abstention_reason: { type: "string" },
                    supporting_observation_ids: observationIdArraySchema,
                    scene_layer: { type: "string" },
                    confidence: confidenceSchema,
                  },
                },
              },
              scene_layers: {
                type: "object",
                additionalProperties: false,
                required: ["foreground", "midground", "background"],
                properties: {
                  foreground: observationIdArraySchema,
                  midground: observationIdArraySchema,
                  background: observationIdArraySchema,
                },
              },
              environment: {
                type: "object",
                additionalProperties: false,
                required: [
                  "setting",
                  "indoor_outdoor",
                  "sky",
                  "ground",
                  "terrain",
                  "plants",
                  "architecture",
                  "water",
                  "weather",
                  "time_of_day_cues",
                  "supporting_observation_ids",
                ],
                properties: {
                  setting: stringArraySchema,
                  indoor_outdoor: { type: "string" },
                  sky: stringArraySchema,
                  ground: stringArraySchema,
                  terrain: stringArraySchema,
                  plants: stringArraySchema,
                  architecture: stringArraySchema,
                  water: stringArraySchema,
                  weather: stringArraySchema,
                  time_of_day_cues: stringArraySchema,
                  supporting_observation_ids: observationIdArraySchema,
                },
              },
              objects_and_props: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "observation_id",
                    "label",
                    "normalized_label",
                    "object_type",
                    "colors",
                    "material_appearance",
                    "location",
                    "count_reference",
                    "confidence",
                  ],
                  properties: {
                    observation_id: { type: "string" },
                    label: { type: "string" },
                    normalized_label: { type: "string" },
                    object_type: { type: "string" },
                    colors: stringArraySchema,
                    material_appearance: stringArraySchema,
                    location: { type: "string" },
                    count_reference: { type: "string" },
                    confidence: confidenceSchema,
                  },
                },
              },
              relationships: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "relationship_id",
                    "source_observation_id",
                    "target_observation_id",
                    "relationship",
                    "evidence_strength",
                  ],
                  properties: {
                    relationship_id: { type: "string" },
                    source_observation_id: { type: "string" },
                    target_observation_id: { type: "string" },
                    relationship: { type: "string" },
                    evidence_strength: { type: "string" },
                  },
                },
              },
              visual_design: {
                type: "object",
                additionalProperties: false,
                required: [
                  "palette",
                  "lighting",
                  "shadows",
                  "highlights",
                  "composition",
                  "camera_angle",
                  "framing",
                  "cropping",
                  "depth",
                  "motion_cues",
                  "motifs",
                  "repeated_shapes",
                  "style_cues",
                  "supporting_observation_ids",
                ],
                properties: {
                  palette: stringArraySchema,
                  lighting: stringArraySchema,
                  shadows: stringArraySchema,
                  highlights: stringArraySchema,
                  composition: stringArraySchema,
                  camera_angle: { type: "string" },
                  framing: { type: "string" },
                  cropping: stringArraySchema,
                  depth: { type: "string" },
                  motion_cues: stringArraySchema,
                  motifs: stringArraySchema,
                  repeated_shapes: stringArraySchema,
                  style_cues: stringArraySchema,
                  supporting_observation_ids: observationIdArraySchema,
                },
              },
              surface_and_scan_cues: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["observation_id", "cue_type", "cue", "abstention", "confidence"],
                  properties: {
                    observation_id: { type: "string" },
                    cue_type: { type: "string" },
                    cue: { type: "string" },
                    abstention: { type: "string" },
                    confidence: confidenceSchema,
                  },
                },
              },
              coverage_reviews: {
                type: "object",
                additionalProperties: false,
                required: FACT_GRAPH_COVERAGE_KEYS,
                properties: Object.fromEntries(FACT_GRAPH_COVERAGE_KEYS.map((key) => [key, {
                  type: "string",
                  enum: [...FACT_GRAPH_COVERAGE_REVIEW_STATUSES],
                }])),
              },
              modules: {
                type: "object",
                additionalProperties: false,
                required: FACT_GRAPH_MODULE_NAMES,
                properties: {
                  subjects: {
                    type: "object",
                    additionalProperties: false,
                    required: ["fact_ids", "scene_subject_observation_ids", "depicted_subject_observation_ids", "character_representation_observation_ids"],
                    properties: {
                      ...moduleFactIdBaseProperties,
                      scene_subject_observation_ids: observationIdArraySchema,
                      depicted_subject_observation_ids: observationIdArraySchema,
                      character_representation_observation_ids: observationIdArraySchema,
                    },
                  },
                  human_appearance: {
                    type: "object",
                    additionalProperties: false,
                    required: ["fact_ids", "visible_body_regions", "facial_evidence", "hair", "gestures", "accessories"],
                    properties: {
                      ...moduleFactIdBaseProperties,
                      visible_body_regions: { type: "array", items: bodyRegionSchema },
                      facial_evidence: { type: "array", items: humanFacialEvidenceSchema },
                      hair: { type: "array", items: appearanceRowSchema },
                      gestures: { type: "array", items: appearanceRowSchema },
                      accessories: { type: "array", items: appearanceRowSchema },
                    },
                  },
                  creature_anatomy: {
                    type: "object",
                    additionalProperties: false,
                    required: ["fact_ids", "body_regions", "physical_features", "pose_orientation", "effects"],
                    properties: {
                      ...moduleFactIdBaseProperties,
                      body_regions: { type: "array", items: creatureAnatomyRowSchema },
                      physical_features: { type: "array", items: creatureAnatomyRowSchema },
                      pose_orientation: { type: "array", items: poseOrientationSchema },
                      effects: { type: "array", items: appearanceRowSchema },
                    },
                  },
                  clothing: {
                    type: "object",
                    additionalProperties: false,
                    required: ["fact_ids", "garments", "accessories"],
                    properties: {
                      ...moduleFactIdBaseProperties,
                      garments: { type: "array", items: clothingGarmentSchema },
                      accessories: { type: "array", items: appearanceRowSchema },
                    },
                  },
                  objects_and_props: {
                    type: "object",
                    additionalProperties: false,
                    required: ["fact_ids", "object_observation_ids"],
                    properties: {
                      ...moduleFactIdBaseProperties,
                      object_observation_ids: observationIdArraySchema,
                    },
                  },
                  environment: {
                    type: "object",
                    additionalProperties: false,
                    required: ["fact_ids", "observation_ids"],
                    properties: {
                      ...moduleFactIdBaseProperties,
                      observation_ids: observationIdArraySchema,
                    },
                  },
                  composition: {
                    type: "object",
                    additionalProperties: false,
                    required: ["fact_ids", "observation_ids"],
                    properties: {
                      ...moduleFactIdBaseProperties,
                      observation_ids: observationIdArraySchema,
                    },
                  },
                  color_and_light: {
                    type: "object",
                    additionalProperties: false,
                    required: ["fact_ids", "observation_ids"],
                    properties: {
                      ...moduleFactIdBaseProperties,
                      observation_ids: observationIdArraySchema,
                    },
                  },
                  visual_effects: {
                    type: "object",
                    additionalProperties: false,
                    required: ["fact_ids", "observation_ids"],
                    properties: {
                      ...moduleFactIdBaseProperties,
                      observation_ids: observationIdArraySchema,
                    },
                  },
                  card_ui_and_print_markers: {
                    type: "object",
                    additionalProperties: false,
                    required: ["fact_ids", ...CARD_UI_PRINT_MARKER_FIELDS],
                    properties: {
                      ...moduleFactIdBaseProperties,
                      ...Object.fromEntries(CARD_UI_PRINT_MARKER_FIELDS.map((field) => [field, observationIdArraySchema])),
                    },
                  },
                  counts: {
                    type: "object",
                    additionalProperties: false,
                    required: ["fact_ids", "count_ids"],
                    properties: {
                      ...moduleFactIdBaseProperties,
                      count_ids: stringArraySchema,
                    },
                  },
                  relationships: {
                    type: "object",
                    additionalProperties: false,
                    required: ["fact_ids", "relationship_ids"],
                    properties: {
                      ...moduleFactIdBaseProperties,
                      relationship_ids: stringArraySchema,
                    },
                  },
                  surface_and_scan_cues: {
                    type: "object",
                    additionalProperties: false,
                    required: ["fact_ids", "observation_ids"],
                    properties: {
                      ...moduleFactIdBaseProperties,
                      observation_ids: observationIdArraySchema,
                    },
                  },
                  uncertainty_and_abstentions: {
                    type: "object",
                    additionalProperties: false,
                    required: ["fact_ids", "fields"],
                    properties: {
                      ...moduleFactIdBaseProperties,
                      fields: stringArraySchema,
                    },
                  },
                  fact_grounded_search_terms: {
                    type: "object",
                    additionalProperties: false,
                    required: ["fact_ids", "terms"],
                    properties: {
                      ...moduleFactIdBaseProperties,
                      terms: stringArraySchema,
                    },
                  },
                },
              },
              module_reviews: { type: "array", items: moduleReviewSchema },
              semantic_visual_facts: { type: "array", items: semanticVisualFactSchema },
              uncertainty_and_abstentions: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["field", "reason", "affected_observation_ids"],
                  properties: {
                    field: { type: "string" },
                    reason: { type: "string" },
                    affected_observation_ids: observationIdArraySchema,
                  },
                },
              },
              fact_grounded_search_terms: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["term", "supporting_observation_ids"],
                  properties: {
                    term: { type: "string" },
                    supporting_observation_ids: observationIdArraySchema,
                  },
                },
              },
            },
          },
        },
      },
      description_confidence: { type: "number", minimum: 0, maximum: 1 },
      attribute_confidence: { type: "number", minimum: 0, maximum: 1 },
      quality_flags: { type: "array", items: { type: "string" } },
    },
  };
}

function fixtureDescription(card) {
  const subject = card.name || "the card subject";
  const factGraph = {
    observations: [
      {
        observation_id: "obs_subject_001",
        kind: "scene_subject",
        label: subject,
        normalized_label: subject.toLowerCase(),
        scene_layer: "foreground",
        frame_position: "center",
        visibility: "fixture_unverified",
        salience: "high",
        confidence: 0.35,
        evidence_strength: "fixture_only",
      },
      {
        observation_id: "obs_uncertainty_001",
        kind: "uncertainty",
        label: "live image facts not extracted in fixture mode",
        normalized_label: "fixture uncertainty",
        scene_layer: "not_applicable",
        frame_position: "not_applicable",
        visibility: "not_applicable",
        salience: "high",
        confidence: 1,
        evidence_strength: "fixture_only",
      },
    ],
    typed_facts: [
      {
        fact_id: "fact_subject_001",
        module: "subjects",
        field_path: "subjects.scene_subjects[0].identity",
        claim: `fixture subject identity is ${subject}`,
        value: subject,
        supporting_observation_ids: ["obs_subject_001"],
        confidence: 0.35,
        evidence_strength: "fixture_only",
      },
      {
        fact_id: "fact_uncertainty_001",
        module: "uncertainty_and_abstentions",
        field_path: "uncertainty_and_abstentions[0].reason",
        claim: "fixture mode does not inspect live image facts",
        value: "fixture mode does not inspect live image facts",
        supporting_observation_ids: ["obs_uncertainty_001"],
        confidence: 1,
        evidence_strength: "fixture_only",
      },
      {
        fact_id: "fact_search_001",
        module: "fact_grounded_search_terms",
        field_path: "fact_grounded_search_terms[0].term",
        claim: `fixture search term ${subject}`,
        value: subject,
        supporting_observation_ids: ["obs_subject_001"],
        confidence: 0.35,
        evidence_strength: "fixture_only",
      },
    ],
    subjects: [
      {
        observation_id: "obs_subject_001",
        subject_kind: "scene_subject",
        identity: subject,
        identity_confidence: 0.35,
        anatomy: [],
        physical_features: [],
        pose: ["cannot_determine"],
        orientation: "cannot_determine",
        action_state: ["cannot_determine"],
        facial_evidence: {
          eyes: "cannot_determine",
          mouth: "cannot_determine",
          eyebrows: "cannot_determine",
          face_position: "cannot_determine",
          other_visible_evidence: [],
        },
        clothing_or_accessories: [],
        colors: [],
        visibility: "fixture_unverified",
      },
    ],
    depicted_subjects: [],
    character_representations: [],
    counts: [
      {
        count_id: "count_subject_001",
        normalized_label: "scene_subject",
        count_type: "exact",
        exact_count: 1,
        estimated_min: 0,
        estimated_max: 0,
        abstention_reason: "",
        supporting_observation_ids: ["obs_subject_001"],
        scene_layer: "foreground",
        confidence: 0.35,
      },
    ],
    scene_layers: {
      foreground: ["obs_subject_001"],
      midground: [],
      background: [],
    },
    environment: {
      setting: ["cannot_determine"],
      indoor_outdoor: "cannot_determine",
      sky: [],
      ground: [],
      terrain: [],
      plants: [],
      architecture: [],
      water: [],
      weather: [],
      time_of_day_cues: [],
      supporting_observation_ids: ["obs_uncertainty_001"],
    },
    objects_and_props: [],
    relationships: [],
    visual_design: {
      palette: [],
      lighting: [],
      shadows: [],
      highlights: [],
      composition: [],
      camera_angle: "cannot_determine",
      framing: "cannot_determine",
      cropping: [],
      depth: "cannot_determine",
      motion_cues: [],
      motifs: [],
      repeated_shapes: [],
      style_cues: [],
      supporting_observation_ids: ["obs_uncertainty_001"],
    },
    surface_and_scan_cues: [],
    coverage_reviews: {
      subjects_review: "observed",
      depicted_subjects_review: "none_visible",
      character_representations_review: "none_visible",
      counts_review: "observed",
      scene_layers_review: "observed",
      environment_review: "cannot_determine_due_to_low_resolution",
      objects_and_props_review: "none_visible",
      relationships_review: "none_visible",
      visual_design_review: "cannot_determine_due_to_low_resolution",
      surface_and_scan_cues_review: "cannot_determine_due_to_low_resolution",
    },
    modules: {
      subjects: {
        fact_ids: ["fact_subject_001"],
        scene_subject_observation_ids: ["obs_subject_001"],
        depicted_subject_observation_ids: [],
        character_representation_observation_ids: [],
      },
      human_appearance: {
        fact_ids: [],
        visible_body_regions: [],
        facial_evidence: [],
        hair: [],
        gestures: [],
        accessories: [],
      },
      creature_anatomy: {
        fact_ids: [],
        body_regions: [],
        physical_features: [],
        pose_orientation: [],
        effects: [],
      },
      clothing: {
        fact_ids: [],
        garments: [],
        accessories: [],
      },
      objects_and_props: {
        fact_ids: [],
        object_observation_ids: [],
      },
      environment: {
        fact_ids: [],
        observation_ids: ["obs_uncertainty_001"],
      },
      composition: {
        fact_ids: [],
        observation_ids: ["obs_uncertainty_001"],
      },
      color_and_light: {
        fact_ids: [],
        observation_ids: ["obs_uncertainty_001"],
      },
      visual_effects: {
        fact_ids: [],
        observation_ids: [],
      },
      card_ui_and_print_markers: {
        fact_ids: [],
        name_text_observation_ids: [],
        hp_text_observation_ids: [],
        collector_number_observation_ids: [],
        set_symbol_observation_ids: [],
        rarity_mark_observation_ids: [],
        copyright_line_observation_ids: [],
        bottom_line_text_observation_ids: [],
        promo_stamp_observation_ids: [],
        logo_observation_ids: [],
        energy_symbol_observation_ids: [],
        regulation_mark_observation_ids: [],
        illustrator_text_observation_ids: [],
        error_marker_observation_ids: [],
        other_print_marker_observation_ids: [],
      },
      counts: {
        fact_ids: [],
        count_ids: ["count_subject_001"],
      },
      relationships: {
        fact_ids: [],
        relationship_ids: [],
      },
      surface_and_scan_cues: {
        fact_ids: [],
        observation_ids: [],
      },
      uncertainty_and_abstentions: {
        fact_ids: ["fact_uncertainty_001"],
        fields: ["fact_graph"],
      },
      fact_grounded_search_terms: {
        fact_ids: ["fact_search_001"],
        terms: [subject, "fixture visual facts", "image facts not extracted"],
      },
    },
    module_reviews: FACT_GRAPH_MODULE_NAMES.map((module) => ({
      module,
      review_status: ["subjects", "environment", "composition", "color_and_light", "counts", "uncertainty_and_abstentions", "fact_grounded_search_terms"].includes(module)
        ? "partial_due_to_low_resolution"
        : "not_applicable",
      omission_risk: ["subjects", "environment", "composition", "color_and_light", "counts", "uncertainty_and_abstentions", "fact_grounded_search_terms"].includes(module)
        ? "high"
        : "none",
      evidence_quality: ["subjects", "environment", "composition", "color_and_light", "counts", "uncertainty_and_abstentions", "fact_grounded_search_terms"].includes(module)
        ? "low"
        : "not_applicable",
      abstentions: ["subjects", "environment", "composition", "color_and_light", "counts", "uncertainty_and_abstentions", "fact_grounded_search_terms"].includes(module)
        ? [{
            field_path: module,
            reason: "fixture mode does not inspect live image facts",
            affected_observation_ids: ["obs_uncertainty_001"],
          }]
        : [],
    })),
    semantic_visual_facts: [],
    uncertainty_and_abstentions: [
      {
        field: "fact_graph",
        reason: "fixture mode does not inspect live image facts",
        affected_observation_ids: ["obs_uncertainty_001"],
      },
    ],
    fact_grounded_search_terms: [
      { term: subject, supporting_observation_ids: ["obs_subject_001"] },
      { term: "fixture visual facts", supporting_observation_ids: ["obs_uncertainty_001"] },
      { term: "image facts not extracted", supporting_observation_ids: ["obs_uncertainty_001"] },
    ],
  };
  return {
    visual_attributes: {
      fact_schema_version: CARD_VISUAL_FACT_GRAPH_SCHEMA_VERSION,
      fact_graph: factGraph,
    },
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
        name: "card_visual_fact_graph_schema_v2",
        schema: outputJsonSchema(),
        strict: true,
      },
    },
  };

  let requestCount = 0;
  let retryCount = 0;
  let accumulatedUsage = zeroUsage();
  for (let attempt = 0; attempt <= args.maxRetries; attempt += 1) {
    requestCount += 1;
    let response;
    let responseText = "";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), args.openaiRequestTimeoutMs);
    try {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      responseText = await response.text();
    } catch (error) {
      if (attempt < args.maxRetries) {
        retryCount += 1;
        console.error(`[card-visual-description-agent] openai_request_failed_retrying attempt=${attempt + 1} next_attempt=${attempt + 2} error=${formatFetchError(error)}`);
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
    } finally {
      clearTimeout(timeout);
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

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (error) {
      if (attempt < args.maxRetries) {
        retryCount += 1;
        await sleep(500 * (attempt + 1));
        continue;
      }
      const parseError = new Error(`[card-visual-description-agent] openai_response_json_parse_failed: ${error.message}`);
      parseError.telemetry = {
        response_model_version: args.modelVersion,
        image_detail: args.imageDetail,
        request_count: requestCount,
        retry_count: retryCount,
        usage: accumulatedUsage,
        estimated_cost_usd: estimateUsageCostUsd(accumulatedUsage, args.pricingSnapshot) ?? 0,
      };
      throw parseError;
    }
    const responseUsage = normalizeResponseUsage(parsed.usage);
    accumulatedUsage = addUsageValues(accumulatedUsage, responseUsage);
    const outputText = parsed.output_text
      ?? parsed.output?.flatMap((item) => item.content ?? [])
        .map((content) => content.text ?? "")
        .join("")
      ?? "";
    if (!outputText.trim()) {
      if (attempt < args.maxRetries) {
        retryCount += 1;
        await sleep(500 * (attempt + 1));
        continue;
      }
      const error = new Error("[card-visual-description-agent] openai_response_missing_output_text");
      error.telemetry = {
        response_model_version: parsed.model ?? args.modelVersion,
        image_detail: args.imageDetail,
        request_count: requestCount,
        retry_count: retryCount,
        usage: accumulatedUsage,
        estimated_cost_usd: estimateUsageCostUsd(accumulatedUsage, args.pricingSnapshot),
      };
      throw error;
    }

    let payload;
    try {
      payload = JSON.parse(outputText);
    } catch (error) {
      if (attempt < args.maxRetries) {
        retryCount += 1;
        await sleep(500 * (attempt + 1));
        continue;
      }
      const parseError = new Error(`[card-visual-description-agent] openai_output_json_parse_failed: ${error.message}`);
      parseError.telemetry = {
        response_model_version: parsed.model ?? args.modelVersion,
        image_detail: args.imageDetail,
        request_count: requestCount,
        retry_count: retryCount,
        usage: accumulatedUsage,
        estimated_cost_usd: estimateUsageCostUsd(accumulatedUsage, args.pricingSnapshot) ?? 0,
      };
      throw parseError;
    }
    return {
      payload,
      telemetry: {
        response_model_version: parsed.model ?? args.modelVersion,
        image_detail: args.imageDetail,
        request_count: requestCount,
        retry_count: retryCount,
        usage: accumulatedUsage,
        estimated_cost_usd: estimateUsageCostUsd(accumulatedUsage, args.pricingSnapshot) ?? 0,
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
  const highValueViewExists = args.highValueSample
    ? await tableExists(client, "public", HIGH_VALUE_PRICE_VIEW)
    : false;
  const highValueColumns = highValueViewExists
    ? await tableColumns(client, "public", HIGH_VALUE_PRICE_VIEW)
    : new Set();
  const highValueCardPrintJoinColumn = highValueColumns.has("card_print_id")
    ? "card_print_id"
    : highValueColumns.has("id")
      ? "id"
      : null;
  const highValueMetricColumn = HIGH_VALUE_PRICE_COLUMNS.find((column) => highValueColumns.has(column)) ?? null;
  const highValueJoin = highValueCardPrintJoinColumn && highValueMetricColumn
    ? `left join public.${HIGH_VALUE_PRICE_VIEW} high_value on high_value.${highValueCardPrintJoinColumn} = cp.id`
    : "";
  const highValueSelect = highValueCardPrintJoinColumn && highValueMetricColumn
    ? `high_value.${highValueMetricColumn}::numeric as high_value_metric_usd,
       'public.${HIGH_VALUE_PRICE_VIEW}.${highValueMetricColumn}'::text as high_value_metric_source`
    : `null::numeric as high_value_metric_usd,
       null::text as high_value_metric_source`;

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
  const queryLimit = cardVisualSelectionQueryLimitV1(args);
  const params = [queryLimit];
  const filters = [];
  let nextParam = 2;

  if (descriptionTableExists) {
    filters.push(`($${nextParam}::boolean is true or coalesce(current_desc.review_status, '') <> 'approved')`);
    params.push(args.forceVersion);
    nextParam += 1;
  }

  if (traitTableExists) {
    filters.push(`lower(coalesce(
        nullif(btrim(exact_trait.supertype), ''),
        nullif(btrim(source_trait.supertype), ''),
        nullif(btrim(same_name_trait.supertype), ''),
        ''
      )) <> 'energy'`);
    filters.push(`lower(coalesce(
        nullif(btrim(exact_trait.card_category), ''),
        nullif(btrim(source_trait.card_category), ''),
        nullif(btrim(same_name_trait.card_category), ''),
        ''
      )) not in ('energy', 'basic energy')`);
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
       ${textColumn("rarity")} as rarity,
       ${textColumn("variant_key")} as variant_key,
       ${textColumn("image_url")} as image_url,
       ${textColumn("image_alt_url")} as image_alt_url,
       ${textColumn("representative_image_url")} as representative_image_url,
       ${textColumn("image_path")} as image_path,
       ${textColumn("image_source")} as image_source,
       ${textColumn("image_status")} as image_status,
       ${sourceCardPrintIdExpr}::text as source_card_print_id,
       ${setNameExpr} as set_name,
       ${traitMetadataSelect},
       ${descriptionSelect},
       ${highValueSelect}
     from public.card_prints cp
     ${setJoin}
     ${traitMetadataJoin}
     ${descriptionJoin}
     ${highValueJoin}
     where coalesce(${imageExpressions.join(", ")}) is not null
       ${filters.map((filter) => `and ${filter}`).join("\n       ")}
      order by ${explicitCardPrintIdsParam ? `array_position($${explicitCardPrintIdsParam}::uuid[], cp.id), ` : ""}${args.highValueSample && highValueMetricColumn ? `high_value.${highValueMetricColumn} desc nulls last, ` : ""}${orderExpr}
      limit $1`,
    params,
  );
  const activeRows = filterExcludedPromptBranchesV1(
    filterActiveVisualFactExtractionCardsV1(result.rows),
    args.excludeBranches,
  );
  if (args.v2StressSample) return selectV2StressSampleCardsV1(activeRows);
  if (args.highValueSample) return selectHighValueSampleCardsV1(activeRows, {
    maxCards: args.maxCards ?? args.limit,
    limit: args.limit,
    excludeBranches: args.excludeBranches,
  });
  if (!args.branchStratifiedSample) return activeRows;
  return selectBranchStratifiedCardsV1(activeRows, args.branchTargets);
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
  await writeJsonAtomic(filePath, value);
}

async function writeJsonAtomic(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
    await fs.rename(temporaryPath, filePath);
  } finally {
    await fs.rm(temporaryPath, { force: true }).catch(() => {});
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJsonl(filePath, rows) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  await fs.writeFile(filePath, body ? `${body}\n` : "");
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

async function hashFile(filePath) {
  return sha256(await fs.readFile(filePath));
}

function markdownEscape(value) {
  return normalizeText(value).replace(/\|/g, "\\|");
}

function buildV2StressSelectionArtifact(eligibleCards) {
  return {
    selection_version: "CARD_VISUAL_FACT_GRAPH_V2_STRESS_SELECTION_V1",
    excluded_prior_fact_graph_v1_card_print_ids: [...FACT_GRAPH_V1_DRY_RUN_EXCLUDED_CARD_PRINT_IDS],
    selected_count: eligibleCards.length,
    selected_cards: eligibleCards.map((card) => ({
      card_print_id: card.card_print_id,
      gv_id: card.gv_id,
      name: card.name,
      prompt_branch: resolveCardPromptMetadata(card).prompt_branch,
      v2_stress_role: card.v2_stress_role ?? null,
      v2_stress_reason: card.v2_stress_reason ?? null,
      image_source: card.image_source,
      image_status: card.image_status,
      excluded_prior_fact_graph_v1_cards: Boolean(card.excluded_prior_fact_graph_v1_cards),
      selection_score: card.v2_stress_selection_score ?? null,
    })),
  };
}

function buildHighValueSelectionArtifact(eligibleCards) {
  return {
    selection_version: HIGH_VALUE_SELECTION_VERSION,
    selected_count: eligibleCards.length,
    excluded_branches: [...DEFERRED_VISUAL_FACT_PROMPT_BRANCHES],
    price_view: HIGH_VALUE_PRICE_VIEW,
    selected_cards: eligibleCards.map((card) => ({
      rank: card.high_value_rank ?? null,
      card_print_id: card.card_print_id,
      gv_id: card.gv_id,
      name: card.name,
      set_code: card.set_code,
      set_name: card.set_name,
      number: card.number,
      rarity: card.rarity ?? null,
      prompt_branch: resolveCardPromptMetadata(card).prompt_branch,
      high_value_metric_usd: card.high_value_metric_usd ?? null,
      high_value_metric_source: card.high_value_metric_source ?? null,
      high_value_selection_score: card.high_value_selection_score ?? null,
      high_value_selection_reason: card.high_value_selection_reason ?? null,
      high_value_selection_signals: card.high_value_selection_signals ?? [],
      high_value_artwork_key: card.high_value_artwork_key ?? null,
      image_source: card.image_source,
      image_status: card.image_status,
    })),
  };
}

export function buildFactGraphReviewPacketMarkdown({ generatedRows, validationFailures, skippedImages, summary }) {
  const lines = [
    "# Card Visual Fact Graph V2 Review Packet",
    "",
    `Generated rows: ${generatedRows.length}`,
    `Validation failures: ${validationFailures.length}`,
    `Skipped images: ${skippedImages.length}`,
    `Estimated cost USD: ${summary.estimated_cost_usd}`,
    "",
    "## Rows",
    "",
  ];

  for (const row of generatedRows) {
    const factGraph = row.visual_attributes?.fact_graph ?? {};
    const observations = factGraph.observations ?? [];
    const typedFacts = factGraph.typed_facts ?? [];
    const moduleReviews = factGraph.module_reviews ?? [];
    const counts = factGraph.counts ?? [];
    const relationships = factGraph.relationships ?? [];
    const uncertainties = factGraph.uncertainty_and_abstentions ?? [];
    const semanticFacts = factGraph.semantic_visual_facts ?? [];
    const searchTerms = factGraph.fact_grounded_search_terms ?? [];
    const canonicalConcepts = factGraph.canonical_visual_concepts?.concepts ?? [];
    const uiObservationIds = cardUiObservationIdSet(factGraph);
    const artworkObservations = observations.filter((observation) => !uiObservationIds.has(normalizeText(observation.observation_id)));
    const cardUiObservations = observations.filter((observation) => uiObservationIds.has(normalizeText(observation.observation_id)));
    const artworkTypedFacts = typedFacts.filter((fact) => normalizeText(fact.module) !== CARD_UI_AND_PRINT_MARKERS_MODULE);
    const cardUiTypedFacts = typedFacts.filter((fact) => normalizeText(fact.module) === CARD_UI_AND_PRINT_MARKERS_MODULE);
    const cardUiModule = factGraph.modules?.[CARD_UI_AND_PRINT_MARKERS_MODULE] ?? {};
    const cardUiObservationCount = CARD_UI_PRINT_MARKER_FIELDS
      .map((field) => normalizeObservationReferenceArray(cardUiModule[field]).length)
      .reduce((sum, count) => sum + count, 0);
    lines.push(`### ${row.gv_id || row.card_print_id} - ${row.name || "unknown"}`);
    lines.push("");
    lines.push(`- Branch: \`${row.prompt_branch || "unknown"}\``);
    if (row.v2_stress_role) lines.push(`- V2 stress role: \`${row.v2_stress_role}\``);
    lines.push(`- Review status: \`${row.review_status}\``);
    lines.push(`- Description confidence: \`${row.description_confidence}\``);
    lines.push(`- Attribute confidence: \`${row.attribute_confidence}\``);
    lines.push(`- Cost USD: \`${row.estimated_cost_usd}\``);
    lines.push(`- Artwork observations: \`${artworkObservations.length}\``);
    lines.push(`- Card UI / print-marker observations: \`${cardUiObservations.length}\``);
    lines.push(`- Card UI module evidence references: \`${cardUiObservationCount}\``);
    lines.push(`- Derived digest: ${row.artwork_description}`);
    lines.push(`- Surface/scan digest: ${row.card_surface_and_printing_cues}`);
    lines.push("");
    lines.push("#### Artwork Observations");
    lines.push("");
    lines.push("| Raw observation | Normalized term | Kind | Layer | Salience | Confidence |");
    lines.push("|---|---|---|---|---|---:|");
    for (const observation of artworkObservations.slice(0, 30)) {
      lines.push(`| ${markdownEscape(observation.label || observation.normalized_label)} | ${markdownEscape(observation.normalized_label)} | ${markdownEscape(observation.kind)} | ${markdownEscape(observation.scene_layer)} | ${markdownEscape(observation.salience)} | ${observation.confidence} |`);
    }
    if (artworkObservations.length > 30) lines.push(`| ...${artworkObservations.length - 30} more artwork observations | | | | | |`);
    lines.push("");
    lines.push("#### Card UI And Print-Marker Observations");
    lines.push("");
    lines.push("| Observation | Kind | Frame position | Visibility | Confidence |");
    lines.push("|---|---|---|---|---:|");
    for (const observation of cardUiObservations.slice(0, 30)) {
      lines.push(`| ${markdownEscape(observation.label || observation.normalized_label)} | ${markdownEscape(observation.kind)} | ${markdownEscape(observation.frame_position)} | ${markdownEscape(observation.visibility)} | ${observation.confidence} |`);
    }
    if (cardUiObservations.length > 30) lines.push(`| ...${cardUiObservations.length - 30} more card UI observations | | | | |`);
    if (cardUiObservations.length === 0) lines.push("| none recorded | | | | |");
    lines.push("");
    lines.push("#### Typed Artwork Modules");
    lines.push("");
    lines.push("| Typed fact | Module | Claim | Support | Confidence |");
    lines.push("|---|---|---|---|---:|");
    for (const fact of artworkTypedFacts.slice(0, 40)) {
      lines.push(`| ${markdownEscape(fact.fact_id)} | ${markdownEscape(fact.module)} | ${markdownEscape(fact.claim || fact.value)} | ${markdownEscape((fact.supporting_observation_ids ?? []).join(", "))} | ${fact.confidence} |`);
    }
    if (artworkTypedFacts.length > 40) lines.push(`| ...${artworkTypedFacts.length - 40} more artwork typed facts | | | | |`);
    lines.push("");
    lines.push("#### Card UI And Print-Marker Module");
    lines.push("");
    lines.push("| Typed fact | Claim | Support | Confidence |");
    lines.push("|---|---|---|---:|");
    for (const fact of cardUiTypedFacts) {
      lines.push(`| ${markdownEscape(fact.fact_id)} | ${markdownEscape(fact.claim || fact.value)} | ${markdownEscape((fact.supporting_observation_ids ?? []).join(", "))} | ${fact.confidence} |`);
    }
    if (cardUiTypedFacts.length === 0) lines.push("| none recorded | | | |");
    lines.push("");
    lines.push("<details><summary>Card UI module JSON</summary>");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(cardUiModule, null, 2));
    lines.push("```");
    lines.push("");
    lines.push("</details>");
    lines.push("");
    lines.push("#### Module Completeness Reviews");
    lines.push("");
    lines.push("| Module | Status | Omission risk | Evidence quality | Abstentions |");
    lines.push("|---|---|---|---|---|");
    for (const review of moduleReviews) {
      lines.push(`| ${markdownEscape(review.module)} | ${markdownEscape(review.review_status)} | ${markdownEscape(review.omission_risk)} | ${markdownEscape(review.evidence_quality)} | ${markdownEscape((review.abstentions ?? []).map((entry) => `${entry.field_path}: ${entry.reason}`).join("; "))} |`);
    }
    lines.push("");
    lines.push("#### Semantic Visual Facts");
    lines.push("");
    lines.push("| Semantic fact | Category | Label | Subject | Support | Evidence | Confidence |");
    lines.push("|---|---|---|---|---|---|---:|");
    for (const fact of semanticFacts) {
      lines.push(`| ${markdownEscape(fact.semantic_fact_id)} | ${markdownEscape(fact.category)} | ${markdownEscape(fact.label)} | ${markdownEscape(fact.subject_observation_id)} | ${markdownEscape((fact.supporting_observation_ids ?? []).join(", "))} | ${markdownEscape(semanticVisualFactEvidenceText(fact))} | ${fact.confidence} |`);
    }
    if (semanticFacts.length === 0) lines.push("| none recorded | | | | | | |");
    lines.push("");
    lines.push("#### Counts");
    lines.push("");
    lines.push("| Count | Type | Value | Support | Confidence |");
    lines.push("|---|---|---|---|---:|");
    for (const count of counts) {
      const value = count.count_type === "exact"
        ? String(count.exact_count)
        : count.count_type === "estimated_range"
          ? `${count.estimated_min}-${count.estimated_max}`
          : count.abstention_reason || count.count_type;
      lines.push(`| ${markdownEscape(count.normalized_label)} | ${markdownEscape(count.count_type)} | ${markdownEscape(value)} | ${markdownEscape((count.supporting_observation_ids ?? []).join(", "))} | ${count.confidence} |`);
    }
    lines.push("");
    lines.push("#### Relationships");
    lines.push("");
    lines.push("| Relationship | Source | Target | Evidence |");
    lines.push("|---|---|---|---|");
    for (const relationship of relationships) {
      lines.push(`| ${markdownEscape(relationship.relationship)} | ${markdownEscape(relationship.source_observation_id)} | ${markdownEscape(relationship.target_observation_id)} | ${markdownEscape(relationship.evidence_strength)} |`);
    }
    if (relationships.length === 0) lines.push("| none recorded | | | |");
    lines.push("");
    lines.push("#### Uncertainty And Abstentions");
    lines.push("");
    lines.push("| Field | Reason | Affected observations |");
    lines.push("|---|---|---|");
    for (const uncertainty of uncertainties) {
      lines.push(`| ${markdownEscape(uncertainty.field)} | ${markdownEscape(uncertainty.reason)} | ${markdownEscape((uncertainty.affected_observation_ids ?? []).join(", "))} |`);
    }
    if (uncertainties.length === 0) lines.push("| none recorded | | |");
    lines.push("");
    lines.push("#### Search Terms");
    lines.push("");
    lines.push("| Search term | Supporting observations |");
    lines.push("|---|---|");
    for (const term of searchTerms) {
      lines.push(`| ${markdownEscape(term.term)} | ${markdownEscape((term.supporting_observation_ids ?? []).join(", "))} |`);
    }
    lines.push("");
    lines.push("#### Canonical Visual Concepts");
    lines.push("");
    lines.push("| Concept | Source observations | Derivation | Confidence |");
    lines.push("|---|---|---|---:|");
    for (const concept of canonicalConcepts) {
      lines.push(`| ${markdownEscape(concept.concept)} | ${markdownEscape((concept.source_observation_ids ?? []).join(", "))} | ${markdownEscape(concept.derivation)} | ${concept.confidence} |`);
    }
    if (canonicalConcepts.length === 0) lines.push("| none derived | | | |");
    lines.push("");
    lines.push("#### Flags And Digest");
    lines.push("");
    lines.push(`- Deterministic compatibility digest: ${row.artwork_description}`);
    lines.push(`- Quality flags: ${(row.quality_flags ?? []).length ? row.quality_flags.map((flag) => `\`${flag}\``).join(", ") : "`none`"}`);
    lines.push(`- Policy results: ${(row.policy_results ?? []).length}`);
    lines.push("");
    lines.push("<details><summary>Full fact graph JSON</summary>");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(factGraph, null, 2));
    lines.push("```");
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  if (validationFailures.length > 0) {
    lines.push("## Validation Failures");
    lines.push("");
    for (const failure of validationFailures) {
      lines.push(`- ${failure.gv_id || failure.card_print_id}: ${failure.findings?.join(", ") || failure.error || "unknown"}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function cardIdSet(rows) {
  return new Set((Array.isArray(rows) ? rows : []).map((row) => normalizeText(row.card_print_id)).filter(Boolean));
}

function duplicateIds(ids) {
  const seen = new Set();
  const duplicates = new Set();
  for (const id of ids.map(normalizeText).filter(Boolean)) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates].sort();
}

function findingPrefix(finding) {
  return normalizeText(finding).split(":")[0] || "unknown_finding";
}

function classifyVisualHarvestFindingPrefixV1(prefix) {
  const normalized = normalizeText(prefix).toLowerCase();
  if (normalized.includes("missing") || normalized.endsWith("_missing")) return "missing_reference_or_backbone_integrity";
  if (normalized.includes("semantic_fact_label_not_supported")) return "unsupported_or_unrecognized_semantic_fact";
  if (normalized.includes("surface")) return "surface_or_material_claim_requires_evidence";
  if (/\b(?:story|lore|metadata)\b/i.test(normalized)) return "unsupported_story_lore_or_metadata_claim";
  if (/\b(?:expression|emotion|personality)\b/i.test(normalized)) return "expression_or_personality_claim_requires_evidence";
  if (normalized.includes("count")) return "count_consistency_or_support";
  if (normalized.includes("subject")) return "subject_identity_or_kind_boundary";
  return "structural_validation_failure";
}

export function classifyVisualHarvestFailureV1(failure = {}) {
  const findings = normalizeStringArray(failure.findings);
  if (findings.includes("generation_exception")) return "provider_or_generation_exception";
  if (findings.length === 0) return "unclassified_validation_failure";
  const classes = uniqueSorted(findings.map((finding) => classifyVisualHarvestFindingPrefixV1(findingPrefix(finding))));
  if (classes.length === 1) return classes[0];
  if (classes.includes("missing_reference_or_backbone_integrity")) return "missing_reference_or_backbone_integrity";
  if (classes.includes("unsupported_or_unrecognized_semantic_fact")) return "unsupported_or_unrecognized_semantic_fact";
  return "mixed_validation_failure";
}

export function buildValidationQuarantineRowsV1(validationFailures = []) {
  return validationFailures.map((failure, index) => {
    const findings = normalizeStringArray(failure.findings);
    const prefixes = uniqueSorted(findings.map(findingPrefix));
    return {
      quarantine_index: index + 1,
      quarantine_reason: "structural_validation_failure",
      failure_class: classifyVisualHarvestFailureV1(failure),
      finding_prefixes: prefixes,
      card_print_id: failure.card_print_id,
      gv_id: failure.gv_id,
      name: failure.name,
      findings,
      request_count: failure.request_count ?? 0,
      retry_count: failure.retry_count ?? 0,
      input_tokens: failure.input_tokens ?? 0,
      output_tokens: failure.output_tokens ?? 0,
      total_tokens: failure.total_tokens ?? 0,
      cached_input_tokens: failure.cached_input_tokens ?? 0,
      estimated_cost_usd: failure.estimated_cost_usd ?? 0,
      error: failure.error ?? null,
      raw_failed_payload: failure.raw_payload ?? null,
      failure,
    };
  });
}

export function evaluateHarvestPolicyV1({
  args = {},
  eligibleCards = [],
  generatedRows = [],
  validationFailures = [],
  skippedImages = [],
  stopBeforeNextCall = null,
} = {}) {
  const enabled = args.mode === "harvest";
  const attemptedCount = generatedRows.length + validationFailures.length;
  const selectedCount = eligibleCards.length;
  const validationFailureRate = attemptedCount > 0 ? Number((validationFailures.length / attemptedCount).toFixed(6)) : 0;
  const maxValidationFailureRate = args.harvestMaxValidationFailureRate ?? DEFAULT_HARVEST_MAX_VALIDATION_FAILURE_RATE;
  const maxValidationFailures = args.harvestMaxValidationFailures ?? null;
  const failureClassCounts = Object.fromEntries(
    Object.entries(buildValidationQuarantineRowsV1(validationFailures).reduce((counts, row) => {
      counts[row.failure_class] = (counts[row.failure_class] ?? 0) + 1;
      return counts;
    }, {})).sort(([left], [right]) => left.localeCompare(right)),
  );
  const skippedRate = selectedCount > 0 ? Number((skippedImages.length / selectedCount).toFixed(6)) : 0;
  const rateWithinTolerance = maxValidationFailureRate === null
    || maxValidationFailureRate === undefined
    || validationFailureRate <= Number(maxValidationFailureRate);
  const countWithinTolerance = maxValidationFailures === null
    || maxValidationFailures === undefined
    || validationFailures.length <= Number(maxValidationFailures);
  const hardStopReason = stopBeforeNextCall?.stop_reason ?? null;
  let harvestStatus = "not_enabled";
  if (enabled) {
    if (hardStopReason && hardStopReason !== "max_cards_reached") harvestStatus = "hard_stop";
    else if (!rateWithinTolerance || !countWithinTolerance) harvestStatus = "quarantine_threshold_exceeded";
    else if (validationFailures.length > 0) harvestStatus = "completed_with_quarantine";
    else harvestStatus = "clean";
  }
  return {
    enabled,
    harvest_status: harvestStatus,
    selected_count: selectedCount,
    attempted_count: attemptedCount,
    validated_count: generatedRows.length,
    quarantined_count: validationFailures.length,
    skipped_count: skippedImages.length,
    validation_failure_rate: validationFailureRate,
    max_validation_failure_rate: maxValidationFailureRate,
    max_validation_failures: maxValidationFailures,
    rate_within_tolerance: rateWithinTolerance,
    count_within_tolerance: countWithinTolerance,
    skipped_rate: skippedRate,
    hard_stop_reason: hardStopReason,
    failure_class_counts: failureClassCounts,
    can_keep_harvesting_without_immediate_repair: enabled && ["clean", "completed_with_quarantine"].includes(harvestStatus),
    can_preserve_valid_rows_with_quarantine: enabled && ["clean", "completed_with_quarantine"].includes(harvestStatus),
    exact_next_action: !enabled
      ? "strict gate mode; evaluate validation failures as lock blockers"
      : harvestStatus === "clean"
        ? "continue to the next bounded harvest batch under the approved envelope"
        : harvestStatus === "completed_with_quarantine"
          ? "continue bounded harvesting if cost and reconciliation remain clean; batch offline quarantine repairs before apply-readiness"
          : harvestStatus === "quarantine_threshold_exceeded"
            ? "repair quarantine classes offline before another harvest batch"
            : "stop and inspect hard-stop reason before continuing",
  };
}

function buildHarvestReportJson({ runDir, runPlan, eligibleCards, generatedRows, validationFailures, skippedImages, summary }) {
  const quarantineRows = buildValidationQuarantineRowsV1(validationFailures);
  return {
    artifact_kind: "card_visual_harvest_report",
    created_at: summary.finished_at,
    run_dir: path.relative(REPO_ROOT, runDir).replace(/\\/g, "/"),
    commit_sha: runPlan.commit_sha ?? null,
    branch: runPlan.branch ?? null,
    mode: runPlan.mode,
    provider: runPlan.provider,
    model_version: runPlan.model_version,
    image_detail: runPlan.image_detail,
    concurrency: runPlan.concurrency,
    prompt_version: runPlan.prompt_version,
    output_schema_version: runPlan.output_schema_version,
    boundaries: {
      db_writes: false,
      approvals: false,
      embeddings: false,
      downstream_integrations: false,
    },
    harvest_policy: summary.harvest_policy,
    counts: {
      selected: eligibleCards.length,
      validated: generatedRows.length,
      quarantined: validationFailures.length,
      skipped: skippedImages.length,
      pending: summary.pending_count,
      needs_review: summary.needs_review_count,
    },
    usage: summary.usage,
    estimated_cost_usd: summary.estimated_cost_usd,
    quarantine_failure_class_counts: summary.harvest_policy?.failure_class_counts ?? {},
    quarantine_records: quarantineRows.map((row) => ({
      quarantine_index: row.quarantine_index,
      failure_class: row.failure_class,
      card_print_id: row.card_print_id,
      gv_id: row.gv_id,
      name: row.name,
      finding_prefixes: row.finding_prefixes,
      findings: row.findings,
    })),
  };
}

function buildHarvestReportMarkdown(report) {
  const lines = [
    "# Card Visual Harvest Report",
    "",
    `- Commit SHA: \`${report.commit_sha ?? "unknown"}\``,
    `- Branch: \`${report.branch ?? "unknown"}\``,
    `- Run dir: \`${report.run_dir}\``,
    `- Status: \`${report.harvest_policy?.harvest_status ?? "unknown"}\``,
    `- Next action: ${report.harvest_policy?.exact_next_action ?? "unknown"}`,
    "",
    "## Counts",
    "",
    `- Selected: ${report.counts.selected}`,
    `- Validated: ${report.counts.validated}`,
    `- Quarantined validation failures: ${report.counts.quarantined}`,
    `- Skipped images: ${report.counts.skipped}`,
    `- Pending validated rows: ${report.counts.pending}`,
    `- Needs-review validated rows: ${report.counts.needs_review}`,
    `- Validation failure rate: ${report.harvest_policy?.validation_failure_rate ?? 0}`,
    `- Max validation failure rate: ${report.harvest_policy?.max_validation_failure_rate ?? "not_configured"}`,
    "",
    "## Usage",
    "",
    `- Provider requests: ${report.usage?.request_count ?? 0}`,
    `- Retries: ${report.usage?.retry_count ?? 0}`,
    `- Total tokens: ${report.usage?.total_tokens ?? 0}`,
    `- Estimated cost: $${report.estimated_cost_usd}`,
    "",
    "## Failure Classes",
    "",
  ];
  const classEntries = Object.entries(report.quarantine_failure_class_counts ?? {});
  if (classEntries.length === 0) {
    lines.push("- none");
  } else {
    for (const [failureClass, count] of classEntries) lines.push(`- \`${failureClass}\`: ${count}`);
  }
  lines.push("", "## Quarantine Records", "");
  if (report.quarantine_records.length === 0) {
    lines.push("- none");
  } else {
    for (const row of report.quarantine_records) {
      lines.push(`- ${row.quarantine_index}. \`${row.gv_id}\` ${row.name} - \`${row.failure_class}\``);
    }
  }
  lines.push("", "## Boundaries", "");
  lines.push("- No database writes.");
  lines.push("- No approvals.");
  lines.push("- No embeddings.");
  lines.push("- No downstream integrations.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildSavedSystemExport({ runDir, runPlan, eligibleCards, generatedRows, validationFailures, skippedImages, summary }) {
  const generatedById = new Map(generatedRows.map((row) => [normalizeText(row.card_print_id), row]));
  const failureById = new Map(validationFailures.map((row) => [normalizeText(row.card_print_id), row]));
  const skippedById = new Map(skippedImages.map((row) => [normalizeText(row.card_print_id), row]));
  const records = eligibleCards.map((card) => {
    const id = normalizeText(card.card_print_id);
    const generated = generatedById.get(id);
    if (generated) {
      return {
        outcome: "validated_generated_output",
        card_print_id: card.card_print_id,
        gv_id: card.gv_id,
        name: card.name,
        prompt_branch: resolveCardPromptMetadata(card).prompt_branch,
        saved_system_row: generated,
      };
    }
    const failure = failureById.get(id);
    if (failure) {
      return {
        outcome: "validation_failure",
        card_print_id: card.card_print_id,
        gv_id: card.gv_id,
        name: card.name,
        prompt_branch: resolveCardPromptMetadata(card).prompt_branch,
        findings: failure.findings ?? [],
        raw_failed_payload: failure.raw_payload ?? null,
        failure,
      };
    }
    const skipped = skippedById.get(id);
    if (skipped) {
      return {
        outcome: "skipped_image",
        card_print_id: card.card_print_id,
        gv_id: card.gv_id,
        name: card.name,
        prompt_branch: resolveCardPromptMetadata(card).prompt_branch,
        skipped,
      };
    }
    return {
      outcome: "not_attempted_due_to_stop",
      card_print_id: card.card_print_id,
      gv_id: card.gv_id,
      name: card.name,
      prompt_branch: resolveCardPromptMetadata(card).prompt_branch,
    };
  });

  return {
    artifact_kind: "card_visual_saved_system_json_export",
    created_at: summary.finished_at,
    run_dir: path.relative(REPO_ROOT, runDir).replace(/\\/g, "/"),
    commit_sha: runPlan.commit_sha ?? null,
    branch: runPlan.branch ?? null,
    note: "Validated records contain the generated saved-system row exactly from generated_outputs.jsonl. Failed records contain raw_failed_payload exactly from validation_failures.jsonl because no generated output row was saved for failed validation.",
    summary: {
      selected_count: eligibleCards.length,
      validated_count: generatedRows.length,
      failed_count: validationFailures.length,
      skipped_count: skippedImages.length,
      request_count: summary.usage?.request_count ?? 0,
      retry_count: summary.usage?.retry_count ?? 0,
      input_tokens: summary.usage?.input_tokens ?? 0,
      output_tokens: summary.usage?.output_tokens ?? 0,
      total_tokens: summary.usage?.total_tokens ?? 0,
      cached_input_tokens: summary.usage?.cached_input_tokens ?? 0,
      estimated_cost_usd: summary.estimated_cost_usd ?? 0,
    },
    records,
  };
}

function reconciliationCheck(check, expected, actual, pass) {
  return { check, expected, actual, pass: Boolean(pass) };
}

function buildReconciliationReport({ runDir, runPlan, eligibleCards, generatedRows, validationFailures, skippedImages, summary, savedSystemExport }) {
  const selectedIds = eligibleCards.map((card) => normalizeText(card.card_print_id)).filter(Boolean);
  const finalExportIds = savedSystemExport.records.map((record) => normalizeText(record.card_print_id)).filter(Boolean);
  const generatedIds = cardIdSet(generatedRows);
  const failureIds = cardIdSet(validationFailures);
  const skippedIds = cardIdSet(skippedImages);
  const finalExportIdSet = new Set(finalExportIds);
  const selectedIdSet = new Set(selectedIds);
  const selectedMissingFromFinalExport = selectedIds.filter((id) => !finalExportIdSet.has(id));
  const finalExportExtraIds = finalExportIds.filter((id) => !selectedIdSet.has(id));
  const duplicateFinalExportIds = duplicateIds(finalExportIds);
  const energyCards = eligibleCards.filter((card) => resolveCardPromptMetadata(card).prompt_branch === "energy");
  const checks = [
    reconciliationCheck("eligible_count_matches_summary", eligibleCards.length, summary.eligible_count, eligibleCards.length === summary.eligible_count),
    reconciliationCheck("attempted_count_matches_generated_plus_failures_plus_skipped", generatedRows.length + validationFailures.length + skippedImages.length, summary.attempted_count + summary.skipped_count, generatedRows.length + validationFailures.length + skippedImages.length === summary.attempted_count + summary.skipped_count),
    reconciliationCheck("validated_count_matches_generated_outputs", generatedRows.length, summary.validated_count, generatedRows.length === summary.validated_count),
    reconciliationCheck("failed_count_matches_validation_failures", validationFailures.length, summary.failed_count, validationFailures.length === summary.failed_count),
    reconciliationCheck("skipped_count_matches_skipped_images", skippedImages.length, summary.skipped_count, skippedImages.length === summary.skipped_count),
    reconciliationCheck("selected_ids_unique", selectedIds.length, selectedIdSet.size, selectedIds.length === selectedIdSet.size),
    reconciliationCheck("final_export_ids_unique", finalExportIds.length, finalExportIdSet.size, finalExportIds.length === finalExportIdSet.size),
    reconciliationCheck("final_export_contains_all_selected_ids", selectedIds.length, selectedIds.length - selectedMissingFromFinalExport.length, selectedMissingFromFinalExport.length === 0),
    reconciliationCheck("final_export_contains_no_extra_ids", 0, finalExportExtraIds.length, finalExportExtraIds.length === 0),
    reconciliationCheck("zero_energy_cards", 0, energyCards.length, energyCards.length === 0),
    reconciliationCheck("cost_under_ceiling", runPlan.max_run_cost_usd === null || runPlan.max_run_cost_usd === undefined ? "not_configured" : `<= ${runPlan.max_run_cost_usd}`, summary.estimated_cost_usd, runPlan.max_run_cost_usd === null || runPlan.max_run_cost_usd === undefined || Number(summary.estimated_cost_usd ?? 0) <= Number(runPlan.max_run_cost_usd)),
    reconciliationCheck("request_count_available_in_summary", "present", summary.usage?.request_count ?? null, Number(summary.usage?.request_count ?? 0) >= 0),
    reconciliationCheck("retry_count_available_in_summary", "present", summary.usage?.retry_count ?? null, Number(summary.usage?.retry_count ?? 0) >= 0),
    reconciliationCheck("token_totals_available_in_summary", "present", summary.usage?.total_tokens ?? null, Number(summary.usage?.total_tokens ?? 0) >= 0),
  ];
  const mismatches = checks.filter((check) => !check.pass).map((check) => check.check);
  const finalExportGeneratedIds = cardIdSet(savedSystemExport.records
    .filter((record) => record.outcome === "validated_generated_output")
    .map((record) => record.saved_system_row));
  const finalExportFailureIds = cardIdSet(savedSystemExport.records
    .filter((record) => record.outcome === "validation_failure")
    .map((record) => record.failure));
  const finalExportSkippedIds = cardIdSet(savedSystemExport.records
    .filter((record) => record.outcome === "skipped_image")
    .map((record) => record.skipped));
  for (const id of generatedIds) {
    if (!finalExportGeneratedIds.has(id)) mismatches.push(`generated_missing_from_final_export:${id}`);
  }
  for (const id of failureIds) {
    if (!finalExportFailureIds.has(id)) mismatches.push(`failure_missing_from_final_export:${id}`);
  }
  for (const id of skippedIds) {
    if (!finalExportSkippedIds.has(id)) mismatches.push(`skipped_missing_from_final_export:${id}`);
  }

  return {
    artifact_kind: "card_visual_run_reconciliation",
    created_at: summary.finished_at,
    run_dir: path.relative(REPO_ROOT, runDir).replace(/\\/g, "/"),
    commit_sha: runPlan.commit_sha ?? null,
    branch: runPlan.branch ?? null,
    sample_strategy: runPlan.sample_strategy,
    concurrency: runPlan.concurrency,
    counts: {
      selected: eligibleCards.length,
      generated_outputs: generatedRows.length,
      validation_failures: validationFailures.length,
      skipped_images: skippedImages.length,
      final_export_records: savedSystemExport.records.length,
      unique_final_export_ids: finalExportIdSet.size,
      energy_cards: energyCards.length,
    },
    usage: summary.usage,
    estimated_cost_usd: summary.estimated_cost_usd,
    ceiling: summary.ceiling,
    checks,
    reconciliation_mismatches: uniqueSorted(mismatches),
    selected_missing_from_final_export: selectedMissingFromFinalExport,
    final_export_extra_ids: finalExportExtraIds,
    duplicate_final_export_ids: duplicateFinalExportIds,
  };
}

function buildReconciliationMarkdown(report) {
  const lines = [
    "# Card Visual Run Reconciliation",
    "",
    `- Commit SHA: \`${report.commit_sha ?? "unknown"}\``,
    `- Branch: \`${report.branch ?? "unknown"}\``,
    `- Run dir: \`${report.run_dir}\``,
    `- Sample strategy: \`${report.sample_strategy}\``,
    `- Concurrency: \`${report.concurrency}\``,
    "",
    "## Counts",
    "",
    `- Selected: ${report.counts.selected}`,
    `- Generated outputs: ${report.counts.generated_outputs}`,
    `- Validation failures: ${report.counts.validation_failures}`,
    `- Skipped images: ${report.counts.skipped_images}`,
    `- Provider requests: ${report.usage?.request_count ?? 0}`,
    `- Retries: ${report.usage?.retry_count ?? 0}`,
    `- Total tokens: ${report.usage?.total_tokens ?? 0}`,
    `- Estimated cost: $${report.estimated_cost_usd}`,
    "",
    "## Checks",
    "",
    "| Check | Expected | Actual | Pass |",
    "|---|---:|---:|:---:|",
    ...report.checks.map((check) => `| ${markdownEscape(check.check)} | ${markdownEscape(check.expected)} | ${markdownEscape(check.actual)} | ${check.pass ? "yes" : "no"} |`),
    "",
  ];
  if (report.reconciliation_mismatches.length > 0) {
    lines.push("## Mismatches", "");
    for (const mismatch of report.reconciliation_mismatches) lines.push(`- ${mismatch}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

async function writeRunArtifacts({ runDir, runPlan, eligibleCards, generatedRows, validationFailures, skippedImages, summary, v2StressSelection = null, highValueSelection = null }) {
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
  if (v2StressSelection) files["v2_stress_selection.json"] = v2StressSelection;
  if (highValueSelection) files["high_value_selection.json"] = highValueSelection;
  let harvestReport = null;
  if (runPlan.mode === "harvest") {
    files["validation_quarantine.jsonl"] = buildValidationQuarantineRowsV1(validationFailures);
    harvestReport = buildHarvestReportJson({
      runDir,
      runPlan,
      eligibleCards,
      generatedRows,
      validationFailures,
      skippedImages,
      summary,
    });
    files["HARVEST_REPORT.json"] = harvestReport;
  }
  const savedSystemExport = buildSavedSystemExport({
    runDir,
    runPlan,
    eligibleCards,
    generatedRows,
    validationFailures,
    skippedImages,
    summary,
  });
  const savedSystemExportName = `ALL_${eligibleCards.length}_SAVED_SYSTEM_JSON.json`;
  files[savedSystemExportName] = savedSystemExport;
  const reconciliationReport = buildReconciliationReport({
    runDir,
    runPlan,
    eligibleCards,
    generatedRows,
    validationFailures,
    skippedImages,
    summary,
    savedSystemExport,
  });
  files["RECONCILIATION_REPORT.json"] = reconciliationReport;

  const artifactHashes = {};
  for (const [name, value] of Object.entries(files)) {
    const filePath = path.join(runDir, name);
    if (name.endsWith(".jsonl")) await writeJsonl(filePath, value);
    else await writeJson(filePath, value);
    artifactHashes[name] = await hashFile(filePath);
  }
  const packetPath = path.join(runDir, "FACT_GRAPH_V2_REVIEW_PACKET.md");
  await writeText(packetPath, buildFactGraphReviewPacketMarkdown({ generatedRows, validationFailures, skippedImages, summary }));
  artifactHashes["FACT_GRAPH_V2_REVIEW_PACKET.md"] = await hashFile(packetPath);
  const reconciliationMarkdownPath = path.join(runDir, "RECONCILIATION_REPORT.md");
  await writeText(reconciliationMarkdownPath, buildReconciliationMarkdown(reconciliationReport));
  artifactHashes["RECONCILIATION_REPORT.md"] = await hashFile(reconciliationMarkdownPath);
  if (harvestReport) {
    const harvestMarkdownPath = path.join(runDir, "HARVEST_REPORT.md");
    await writeText(harvestMarkdownPath, buildHarvestReportMarkdown(harvestReport));
    artifactHashes["HARVEST_REPORT.md"] = await hashFile(harvestMarkdownPath);
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
    rarity: row.rarity ?? null,
    variant_key: row.variant_key ?? null,
    prompt_branch: promptMetadata.prompt_branch,
    card_type_metadata_source: promptMetadata.card_type_metadata_source,
    supertype: promptMetadata.supertype,
    subtype: promptMetadata.subtype,
    card_category: promptMetadata.card_category,
    pokemon_name: promptMetadata.pokemon_name,
    trainer_name: promptMetadata.trainer_name,
    image_source: row.image_source,
    image_status: row.image_status,
    v2_stress_role: row.v2_stress_role ?? null,
    v2_stress_reason: row.v2_stress_reason ?? null,
    v2_stress_selection_score: row.v2_stress_selection_score ?? null,
    excluded_prior_fact_graph_v1_cards: row.excluded_prior_fact_graph_v1_cards ?? null,
    high_value_rank: row.high_value_rank ?? null,
    high_value_metric_usd: row.high_value_metric_usd ?? null,
    high_value_metric_source: row.high_value_metric_source ?? null,
    high_value_selection_score: row.high_value_selection_score ?? null,
    high_value_selection_reason: row.high_value_selection_reason ?? null,
    high_value_selection_signals: row.high_value_selection_signals ?? null,
    high_value_artwork_key: row.high_value_artwork_key ?? null,
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

function safeArtifactNamePart(value) {
  return (normalizeText(value) || "unknown")
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "unknown";
}

function persistedOutcomePayload(record) {
  if (record?.outcome_type === "generated_row") return record.generated_row;
  if (record?.outcome_type === "validation_failure") return record.validation_failure;
  if (record?.outcome_type === "skipped_image") return record.skipped_image;
  return null;
}

export function validatePersistedCardOutcomeV1(record, eligibleCards) {
  const selectedIndex = Number(record?.selected_index);
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= eligibleCards.length) {
    return { ok: false, reason: "invalid_selected_index" };
  }
  const expectedCard = eligibleCards[selectedIndex];
  if (normalizeText(record?.card?.card_print_id) !== normalizeText(expectedCard?.card_print_id)) {
    return { ok: false, reason: "card_print_id_mismatch", selectedIndex };
  }
  if (!persistedOutcomePayload(record) || !["generated_row", "validation_failure", "skipped_image"].includes(record?.outcome_type)) {
    return { ok: false, reason: "invalid_outcome_payload", selectedIndex };
  }
  return {
    ok: true,
    selectedIndex,
    outcome: {
      type: record.outcome_type,
      card: expectedCard,
      row: record.generated_row ?? null,
      failure: record.validation_failure ?? null,
      skipped: record.skipped_image ?? null,
    },
  };
}

async function loadPersistedCardOutcomes(runDir, eligibleCards) {
  const perCardDir = path.join(runDir, "per_card");
  let entries = [];
  try {
    entries = await fs.readdir(perCardDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const outcomes = new Array(eligibleCards.length);
  const corruptFiles = [];
  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json")).sort((left, right) => left.name.localeCompare(right.name))) {
    const filePath = path.join(perCardDir, entry.name);
    let record;
    try {
      record = await readJson(filePath);
    } catch (error) {
      corruptFiles.push({ file: entry.name, reason: "invalid_json", error: error.message });
      continue;
    }
    const validation = validatePersistedCardOutcomeV1(record, eligibleCards);
    if (!validation.ok) {
      corruptFiles.push({ file: entry.name, reason: validation.reason });
      continue;
    }
    if (outcomes[validation.selectedIndex]) {
      throw new Error(`[card-visual-description-agent] duplicate valid per-card checkpoint for selected index ${validation.selectedIndex}`);
    }
    outcomes[validation.selectedIndex] = validation.outcome;
  }

  return {
    outcomes,
    recoveredCount: outcomes.filter(Boolean).length,
    corruptFiles,
    missingCount: outcomes.filter((outcome) => !outcome).length,
  };
}

async function writePerCardCompletionArtifact(runDir, index, outcome) {
  const card = outcome.card ?? {};
  const fileName = `${String(index + 1).padStart(4, "0")}_${safeArtifactNamePart(card.gv_id || card.card_print_id)}_${outcome.type}.json`;
  await writeJsonAtomic(path.join(runDir, "per_card", fileName), {
    completed_at: nowIso(),
    selected_index: index,
    outcome_type: outcome.type,
    card: compactCardForArtifact(card),
    generated_row: outcome.row ?? null,
    validation_failure: outcome.failure ?? null,
    skipped_image: outcome.skipped ?? null,
  });
}

async function processVisualDescriptionCard(card, index, totalCount, args, runDir) {
  let image;
  let generationTelemetry = null;
  try {
    image = await validateImageForModel(card, args);
    if (!image.ok) {
      const skipped = {
        card_print_id: card.card_print_id,
        gv_id: card.gv_id,
        name: card.name,
        reason: image.reason,
        error: image.error ?? null,
        quality_flags: image.quality_flags ?? [],
        image_source: image.image_source ?? null,
        image_source_key: image.image_source_key ?? null,
      };
      const outcome = { type: "skipped_image", card, skipped };
      await writePerCardCompletionArtifact(runDir, index, outcome);
      return outcome;
    }

    console.error(`[card-visual-description-agent] generating ${index + 1}/${totalCount}: ${card.gv_id} ${card.name}`);
    const generation = await generateDescription(card, image, args);
    generationTelemetry = generation.telemetry;
    const rawPayload = generation.payload;
    const validation = validateVisualDescriptionPayloadV1(rawPayload, card);
    if (!validation.ok) {
      console.error(`[card-visual-description-agent] validation_failed ${card.gv_id} ${card.name}`);
      const failure = {
        card_print_id: card.card_print_id,
        gv_id: card.gv_id,
        name: card.name,
        ...telemetryForArtifact(generationTelemetry),
        findings: validation.findings,
        raw_payload: rawPayload,
      };
      const outcome = { type: "validation_failure", card, failure };
      await writePerCardCompletionArtifact(runDir, index, outcome);
      return outcome;
    }

    const row = buildDescriptionRow(card, image, validation.normalized, args, generationTelemetry);
    console.error(`[card-visual-description-agent] validated ${card.gv_id} ${card.name} status=${row.review_status}`);
    const outputRow = {
      ...row,
      gv_id: card.gv_id,
      name: card.name,
      set_code: card.set_code,
      set_name: card.set_name,
      number: card.number,
      v2_stress_role: card.v2_stress_role ?? null,
      v2_stress_reason: card.v2_stress_reason ?? null,
      high_value_rank: card.high_value_rank ?? null,
      high_value_metric_usd: card.high_value_metric_usd ?? null,
      high_value_metric_source: card.high_value_metric_source ?? null,
      high_value_selection_score: card.high_value_selection_score ?? null,
      high_value_selection_reason: card.high_value_selection_reason ?? null,
      high_value_selection_signals: card.high_value_selection_signals ?? null,
      high_value_artwork_key: card.high_value_artwork_key ?? null,
      embedding_input_hash_preview: sha256(buildEmbeddingInputV1(row)),
    };
    const outcome = { type: "generated_row", card, row: outputRow };
    await writePerCardCompletionArtifact(runDir, index, outcome);
    return outcome;
  } catch (error) {
    const failure = {
      card_print_id: card.card_print_id,
      gv_id: card.gv_id,
      name: card.name,
      image_sha256: image?.image_sha256 ?? null,
      ...telemetryForArtifact(error.telemetry ?? generationTelemetry),
      findings: ["generation_exception"],
      error: error.message,
    };
    console.error(`[card-visual-description-agent] generation_exception ${card.gv_id} ${card.name}: ${error.message}`);
    const outcome = { type: "validation_failure", card, failure };
    await writePerCardCompletionArtifact(runDir, index, outcome);
    return outcome;
  }
}

function rowsFromOrderedOutcomes(outcomes, type, key) {
  return outcomes
    .filter((outcome) => outcome?.type === type)
    .map((outcome) => outcome[key]);
}

async function processEligibleCardsWithConcurrency({ eligibleCards, args, runDir, initialOutcomes = [] }) {
  const outcomes = new Array(eligibleCards.length);
  for (let index = 0; index < eligibleCards.length; index += 1) {
    if (initialOutcomes[index]) outcomes[index] = initialOutcomes[index];
  }
  const completedGeneratedRows = rowsFromOrderedOutcomes(outcomes, "generated_row", "row");
  const completedValidationFailures = rowsFromOrderedOutcomes(outcomes, "validation_failure", "failure");
  const completedSkippedImages = rowsFromOrderedOutcomes(outcomes, "skipped_image", "skipped");
  let nextIndex = 0;
  let stopBeforeNextCall = null;
  const workerCount = Math.min(Math.max(1, Number(args.concurrency ?? DEFAULT_CONCURRENCY)), Math.max(eligibleCards.length, 1));

  const claimNextIndex = () => {
    if (stopBeforeNextCall) return null;
    while (nextIndex < eligibleCards.length && outcomes[nextIndex]) nextIndex += 1;
    if (nextIndex >= eligibleCards.length) return null;
    if (args.maxCards !== null && args.maxCards !== undefined && nextIndex >= args.maxCards) {
      stopBeforeNextCall = {
        stopped_before_next_call: true,
        stop_reason: "max_cards_reached",
        attempted_count: nextIndex,
        max_cards: args.maxCards,
      };
      return null;
    }
    const ceiling = evaluateStopBeforeNextCall(args, completedGeneratedRows, completedValidationFailures);
    if (ceiling.stopped_before_next_call) {
      stopBeforeNextCall = {
        ...ceiling,
        next_card_print_id: eligibleCards[nextIndex]?.card_print_id ?? null,
        next_gv_id: eligibleCards[nextIndex]?.gv_id ?? null,
        next_name: eligibleCards[nextIndex]?.name ?? null,
      };
      return null;
    }
    const index = nextIndex;
    nextIndex += 1;
    return index;
  };

  async function worker() {
    for (;;) {
      const index = claimNextIndex();
      if (index === null) return;
      const outcome = await processVisualDescriptionCard(eligibleCards[index], index, eligibleCards.length, args, runDir);
      outcomes[index] = outcome;
      if (outcome.type === "generated_row") completedGeneratedRows.push(outcome.row);
      else if (outcome.type === "validation_failure") completedValidationFailures.push(outcome.failure);
      else if (outcome.type === "skipped_image") completedSkippedImages.push(outcome.skipped);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return {
    generatedRows: rowsFromOrderedOutcomes(outcomes, "generated_row", "row"),
    validationFailures: rowsFromOrderedOutcomes(outcomes, "validation_failure", "failure"),
    skippedImages: rowsFromOrderedOutcomes(outcomes, "skipped_image", "skipped"),
    stopBeforeNextCall,
    workerCount,
  };
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
    concurrency: args.concurrency,
    prompt_version: args.promptVersion,
    output_schema_version: args.outputSchemaVersion,
    sample_strategy: args.highValueSample ? "high_value_sample" : args.v2StressSample ? "v2_stress_sample" : args.branchStratifiedSample ? "branch_stratified" : "default_order",
    branch_targets: args.branchStratifiedSample ? args.branchTargets : null,
    branch_candidate_limit: (args.branchStratifiedSample || args.v2StressSample || args.highValueSample) ? args.branchCandidateLimit : null,
    high_value_sample: args.highValueSample,
    exclude_branches: args.excludeBranches,
    active_prompt_branches: BRANCH_STRATIFIED_BRANCHES,
    deferred_prompt_branches: [...DEFERRED_VISUAL_FACT_PROMPT_BRANCHES],
    v2_stress_sample: args.v2StressSample,
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
    harvest_policy: evaluateHarvestPolicyV1({
      args,
      eligibleCards,
      generatedRows,
      validationFailures,
      skippedImages,
      stopBeforeNextCall,
    }),
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

function assertResumeValue(label, actual, expected) {
  if (stableJson(actual) !== stableJson(expected)) {
    throw new Error(`[card-visual-description-agent] resume configuration mismatch for ${label}: expected ${stableJson(expected)}, received ${stableJson(actual)}`);
  }
}

function configureResumeArgsV1(args, runPlan, branch) {
  if (!runPlan || !Array.isArray(runPlan.selected_card_print_ids) || runPlan.selected_card_print_ids.length < 1) {
    throw new Error("[card-visual-description-agent] resume run_plan.json is missing selected_card_print_ids");
  }
  if (runPlan.boundary?.db_writes || !["dry_run", "harvest"].includes(runPlan.mode)) {
    throw new Error("[card-visual-description-agent] refusing to resume a run with database-write boundaries");
  }

  assertResumeValue("branch", branch, runPlan.branch);
  assertResumeValue("mode", args.mode, runPlan.mode);
  assertResumeValue("provider", args.provider, runPlan.provider);
  assertResumeValue("model_version", args.modelVersion, runPlan.model_version);
  assertResumeValue("prompt_version", args.promptVersion, runPlan.prompt_version);
  assertResumeValue("output_schema_version", args.outputSchemaVersion, runPlan.output_schema_version);
  assertResumeValue("image_detail", args.imageDetail, runPlan.image_detail);
  assertResumeValue("concurrency", args.concurrency, runPlan.concurrency);
  assertResumeValue("max_cards", args.maxCards, runPlan.max_cards);
  assertResumeValue("max_run_cost_usd", args.maxRunCostUsd, runPlan.max_run_cost_usd);
  assertResumeValue("max_retries", args.maxRetries, runPlan.max_retries);
  assertResumeValue("openai_request_timeout_ms", args.openaiRequestTimeoutMs, runPlan.openai_request_timeout_ms);
  assertResumeValue("exclude_branches", args.excludeBranches, runPlan.exclude_branches ?? []);
  assertResumeValue("pricing.input_per_million", args.openaiInputCostPerMillion, runPlan.pricing_snapshot?.input_per_million ?? null);
  assertResumeValue("pricing.output_per_million", args.openaiOutputCostPerMillion, runPlan.pricing_snapshot?.output_per_million ?? null);
  assertResumeValue("pricing.cached_input_per_million", args.openaiCachedInputCostPerMillion, runPlan.pricing_snapshot?.cached_input_per_million ?? null);
  assertResumeValue("pricing.image_cost_rule_version", args.openaiImageCostRuleVersion, runPlan.pricing_snapshot?.image_cost_rule_version ?? null);
  if (args.cardPrintIds.length > 0) {
    assertResumeValue("selected_card_print_ids", args.cardPrintIds, runPlan.selected_card_print_ids);
  }

  args.cardPrintId = null;
  args.cardPrintIds = [...runPlan.selected_card_print_ids];
  args.gvId = null;
  args.branchStratifiedSample = false;
  args.v2StressSample = false;
  args.highValueSample = false;
  args.limit = Number(runPlan.requested_limit ?? args.limit);
  args.harvestMaxValidationFailureRate = runPlan.harvest_max_validation_failure_rate ?? args.harvestMaxValidationFailureRate;
  args.harvestMaxValidationFailures = runPlan.harvest_max_validation_failures ?? args.harvestMaxValidationFailures;
  args.pricingSnapshot = runPlan.pricing_snapshot;
  return args;
}

function assertResumeSelectionV1(runPlan, eligibleCards) {
  const selectedIds = eligibleCards.map((card) => normalizeText(card.card_print_id));
  const plannedIds = runPlan.selected_card_print_ids.map(normalizeText);
  assertResumeValue("database_selected_card_print_ids", selectedIds, plannedIds);
}

export async function runCardVisualDescriptionAgentV1(rawArgs = []) {
  await loadEnvFilesIfAvailable();
  let args = parseCardVisualDescriptionArgsV1(rawArgs);
  const conn = connectionString();
  if (!conn) {
    throw new Error("[card-visual-description-agent] Missing SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL.");
  }

  const invocationStartedAt = nowIso();
  const commitSha = await gitOutput(["rev-parse", "HEAD"]);
  const branch = await gitOutput(["branch", "--show-current"]);
  const trackedStatusShort = await gitOutput(["status", "--short", "--untracked-files=no"]);
  let startedAt = invocationStartedAt;
  let runKey;
  let runDir;
  let runPlan;
  if (args.resumeRunDir) {
    runDir = path.resolve(args.resumeRunDir);
    runPlan = await readJson(path.join(runDir, "run_plan.json"));
    args = configureResumeArgsV1(args, runPlan, branch);
    startedAt = runPlan.started_at;
    runKey = runPlan.run_key;
  } else {
    args.pricingSnapshot = buildPricingSnapshot(args, startedAt);
    runKey = sha256(stableJson({
      version: CARD_VISUAL_DESCRIPTION_AGENT_VERSION,
      started_at: startedAt,
      mode: args.mode,
      limit: args.limit,
      provider: args.provider,
      model_version: args.modelVersion,
      prompt_version: args.promptVersion,
      output_schema_version: args.outputSchemaVersion,
      sample_strategy: args.highValueSample ? "high_value_sample" : args.v2StressSample ? "v2_stress_sample" : args.branchStratifiedSample ? "branch_stratified" : "default_order",
      concurrency: args.concurrency,
      commit_sha: commitSha,
    }));
    runDir = path.join(args.outDir, `${stampFromIso(startedAt)}_${args.mode}_${runKey.slice(0, 12)}`);
    runPlan = {
      run_key: runKey,
      commit_sha: commitSha,
      branch,
      tracked_worktree_status_short: trackedStatusShort,
      tracked_worktree_clean: trackedStatusShort === "",
      mode: args.mode,
      provider: args.provider,
      requested_limit: args.limit,
      max_cards: args.maxCards,
      max_run_cost_usd: args.maxRunCostUsd,
      harvest_max_validation_failure_rate: args.harvestMaxValidationFailureRate,
      harvest_max_validation_failures: args.harvestMaxValidationFailures,
      concurrency: args.concurrency,
      prompt_version: args.promptVersion,
      output_schema_version: args.outputSchemaVersion,
      sample_strategy: args.highValueSample ? "high_value_sample" : args.v2StressSample ? "v2_stress_sample" : args.branchStratifiedSample ? "branch_stratified" : "default_order",
      branch_targets: args.branchStratifiedSample ? args.branchTargets : null,
      branch_candidate_limit: (args.branchStratifiedSample || args.v2StressSample || args.highValueSample) ? args.branchCandidateLimit : null,
      high_value_sample: args.highValueSample,
      high_value_selection_version: args.highValueSample ? HIGH_VALUE_SELECTION_VERSION : null,
      exclude_branches: args.excludeBranches,
      active_prompt_branches: BRANCH_STRATIFIED_BRANCHES,
      deferred_prompt_branches: [...DEFERRED_VISUAL_FACT_PROMPT_BRANCHES],
      v2_stress_sample: args.v2StressSample,
      local_tls_certificate_verification_disabled: process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0",
      agent_version: args.agentVersion,
      model_version: args.modelVersion,
      image_detail: args.imageDetail,
      max_retries: args.maxRetries,
      openai_request_timeout_ms: args.openaiRequestTimeoutMs,
      pricing_snapshot: args.pricingSnapshot,
      force_version: args.forceVersion,
      v2_stress_roles: args.v2StressSample ? FACT_GRAPH_V2_STRESS_ROLES : null,
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
  }
  assertOpenAiPricingConfigured(args);

  const client = await createPgClient({ connectionString: conn });
  await client.connect();
  try {
    const eligibleCards = await fetchEligibleCards(client, args);
    const totalEligibleCatalogCount = Number(eligibleCards[0]?.total_eligible_catalog_count ?? eligibleCards.length);
    let resumeState = null;
    if (args.resumeRunDir) {
      assertResumeSelectionV1(runPlan, eligibleCards);
      resumeState = await loadPersistedCardOutcomes(runDir, eligibleCards);
      runPlan.recovery_attempts = [
        ...(Array.isArray(runPlan.recovery_attempts) ? runPlan.recovery_attempts : []),
        {
          resumed_at: invocationStartedAt,
          original_commit_sha: runPlan.commit_sha,
          resume_commit_sha: commitSha,
          resume_tracked_worktree_status_short: trackedStatusShort,
          resume_tracked_worktree_clean: trackedStatusShort === "",
          recovered_outcome_count: resumeState.recoveredCount,
          missing_outcome_count: resumeState.missingCount,
          corrupt_checkpoint_files: resumeState.corruptFiles,
        },
      ];
      await writeJsonAtomic(path.join(runDir, "run_plan.json"), runPlan);
      console.error(`[card-visual-description-agent] resume recovered=${resumeState.recoveredCount} missing=${resumeState.missingCount} corrupt=${resumeState.corruptFiles.length}`);
    } else {
      runPlan.selected_count = eligibleCards.length;
      runPlan.selected_card_print_ids = eligibleCards.map((card) => card.card_print_id);
      runPlan.selected_cards = eligibleCards.map(compactCardForArtifact);
      await writeJson(path.join(runDir, "run_plan.json"), runPlan);
    }
    const v2StressSelection = args.v2StressSample ? buildV2StressSelectionArtifact(eligibleCards) : null;
    if (v2StressSelection) {
      await writeJson(path.join(runDir, "v2_stress_selection.json"), v2StressSelection);
    }
    const highValueSelection = args.highValueSample ? buildHighValueSelectionArtifact(eligibleCards) : null;
    if (highValueSelection) {
      highValueSelection.excluded_branches = args.excludeBranches;
      await writeJson(path.join(runDir, "high_value_selection.json"), highValueSelection);
    }
    let generatedRows = [];
    let validationFailures = [];
    let skippedImages = [];
    let stopBeforeNextCall = null;

    if (args.mode !== "plan") {
      const processed = await processEligibleCardsWithConcurrency({
        eligibleCards,
        args,
        runDir,
        initialOutcomes: resumeState?.outcomes ?? [],
      });
      generatedRows = processed.generatedRows;
      validationFailures = processed.validationFailures;
      skippedImages = processed.skippedImages;
      stopBeforeNextCall = processed.stopBeforeNextCall;
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
      v2StressSelection,
      highValueSelection,
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
  if (result.summary.harvest_policy?.enabled) {
    console.log(`[card-visual-description-agent] harvest_status=${result.summary.harvest_policy.harvest_status}`);
    console.log(`[card-visual-description-agent] quarantined=${result.summary.harvest_policy.quarantined_count}`);
  }
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
