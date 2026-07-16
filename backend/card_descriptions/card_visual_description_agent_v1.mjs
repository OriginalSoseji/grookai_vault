import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

export const CARD_VISUAL_DESCRIPTION_AGENT_VERSION = "CARD_VISUAL_DESCRIPTION_AGENT_V1";
export const CARD_VISUAL_DESCRIPTION_PROMPT_VERSION = "CARD_VISUAL_DESCRIPTION_PROMPT_V1";
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
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const REVIEW_SAMPLE_LIMIT = 25;
const NON_PROBLEM_QUALITY_FLAGS = new Set([
  "clear",
  "clear image",
  "colorful",
  "high",
  "high clarity",
  "high detail",
  "visible",
  "visible attributes only",
  "well-defined",
  "well-defined colors",
  "well-defined features",
]);

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

function normalizeText(value) {
  return String(value ?? "").trim();
}

function uniqueSorted(values) {
  return [...new Set(values.map(normalizeText).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}

function parseCommaList(value) {
  return uniqueSorted(String(value ?? "").split(","));
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

  return parsed;
}

function rowText(row, key) {
  return normalizeText(row[key]);
}

function resolveImageCandidate(row) {
  const candidates = [
    ["image_url", rowText(row, "image_url")],
    ["representative_image_url", rowText(row, "representative_image_url")],
    ["image_alt_url", rowText(row, "image_alt_url")],
    ["image_path", rowText(row, "image_path")],
  ].filter(([, value]) => value);

  if (candidates.length === 0) {
    return { ok: false, reason: "missing_image" };
  }

  const [field, value] = candidates[0];
  if (!/^https?:\/\//i.test(value)) {
    return {
      ok: false,
      reason: "unsupported_non_http_image_path",
      image_source: field,
      image_source_key: value,
    };
  }

  return {
    ok: true,
    image_source: field,
    image_source_key: value,
    url: value,
  };
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

async function fetchImageBytes(candidate, args) {
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

async function validateImageForModel(row, args) {
  const candidate = resolveImageCandidate(row);
  if (!candidate.ok) {
    return {
      ok: false,
      card_print_id: row.card_print_id,
      reason: candidate.reason,
      image_source: candidate.image_source ?? null,
      image_source_key: candidate.image_source_key ?? null,
    };
  }

  const fetched = await fetchImageBytes(candidate, args);
  if (!fetched.ok) {
    return {
      ok: false,
      card_print_id: row.card_print_id,
      reason: fetched.reason,
      error: fetched.error ?? null,
      image_source: candidate.image_source,
      image_source_key: candidate.image_source_key,
    };
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
    return {
      ok: false,
      card_print_id: row.card_print_id,
      reason: qualityFlags[0],
      quality_flags: qualityFlags,
      image_source: candidate.image_source,
      image_source_key: candidate.image_source_key,
      image_sha256: hash,
      image_mime_type: metadata.mime,
      image_width: metadata.width,
      image_height: metadata.height,
    };
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

function buildPrompt(card) {
  return [
    "Describe the artwork on this exact Pokemon card for a blind collector.",
    "Be grounded in visible evidence only. Do not invent hidden details.",
    "Separate the illustration from card frame, foil, border, or printing cues.",
    "For attributes that are not visible or cannot be determined from the scan, write \"unknown\" rather than an empty string.",
    "Do not infer holographic foil, texture, rarity treatment, or surface gloss unless it is directly visible in the image.",
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
  const qualityFlags = uniqueSorted([...(image.quality_flags ?? []), ...(normalizedPayload.quality_flags ?? [])]);
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
    ...telemetryForArtifact(telemetry),
    artwork_description: normalizedPayload.artwork_description,
    card_surface_and_printing_cues: normalizedPayload.card_surface_and_printing_cues,
    visual_attributes: normalizedPayload.visual_attributes,
    semantic_tags: normalizedPayload.semantic_tags,
    identity_input_confidence: 0.95,
    description_confidence: normalizedPayload.description_confidence,
    attribute_confidence: normalizedPayload.attribute_confidence,
    image_quality_score: image.image_quality_score,
    quality_flags: qualityFlags,
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
  const approvedFilter = descriptionTableExists
    ? "and ($2::boolean is true or coalesce(current_desc.review_status, '') <> 'approved')"
    : "";
  const orderExpr = columns.has("created_at")
    ? "cp.created_at desc nulls last, cp.id asc"
    : "cp.id asc";

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
       ${descriptionSelect}
     from public.card_prints cp
     ${setJoin}
     ${descriptionJoin}
     where coalesce(${imageExpressions.join(", ")}) is not null
       ${approvedFilter}
     order by ${orderExpr}
     limit $1`,
    descriptionTableExists ? [args.limit, args.forceVersion] : [args.limit],
  );
  return result.rows;
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
  return {
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    set_name: row.set_name,
    number: row.number,
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
    agent_version: args.agentVersion,
    model_version: args.modelVersion,
    image_detail: args.imageDetail,
    max_retries: args.maxRetries,
    pricing_snapshot: args.pricingSnapshot,
    force_version: args.forceVersion,
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
