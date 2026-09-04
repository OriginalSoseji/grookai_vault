export const MTG_SEALED_CLIENT_V1_ENABLED = false as const;
export const MTG_SEALED_IMAGE_SIGNED_URL_TTL_SECONDS_V1 = 60 * 60;

const MTG_SEALED_RPC_V3 = "get_active_sealed_product_pricing_v3";
const PRIVATE_IMAGE_BUCKET = "user-card-images";
const IMAGE_PATH = /^sealed\/mtg\/sha256\/([0-9a-f]{2})\/([0-9a-f]{64})\.(jpg|png|gif|webp)$/;
const SHA256 = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UnknownRecord = Record<string, unknown>;

export type MtgSealedCatalogRowV1 = {
  priceReleaseId: string;
  imageReleaseId: string;
  familyId: string;
  variantId: string;
  canonicalName: string;
  packageForm: string;
  languageCode: "en";
  regionCode: string | null;
  edition: string | null;
  wave: string | null;
  releaseDate: string | null;
  observedOn: string;
  currency: "USD";
  marketPrice: number;
  imageStorageBucket: "user-card-images";
  imageObjectPath: string;
  imageContentSha256: string;
  imageMime: string;
  imageWidth: number;
  imageHeight: number;
  imageBytes: number;
  imageUrl: string | null;
};

export type MtgSealedCatalogStateV1 =
  | { status: "disabled" }
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "empty" }
  | { status: "ready"; rows: MtgSealedCatalogRowV1[] }
  | { status: "missing_image"; withheldRows: number }
  | { status: "stale"; withheldRows: number }
  | { status: "offline"; message: string }
  | { status: "error"; message: string };

export const MTG_SEALED_LOADING_STATE_V1: MtgSealedCatalogStateV1 = {
  status: "loading",
};

export type MtgSealedClientTransportV1 = {
  isAuthenticated(): Promise<boolean>;
  fetchRows(input: {
    gameKey: "mtg";
    query: string | null;
    limit: number;
    offset: number;
  }): Promise<{ data: unknown; error: Error | null }>;
  createSignedImageUrl(input: {
    bucket: "user-card-images";
    objectPath: string;
    expiresInSeconds: number;
  }): Promise<string>;
};

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableText(value: unknown) {
  return value == null ? null : text(value);
}

function positiveNumber(value: unknown) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value.trim())
      ? Number(value)
      : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function positiveInteger(value: unknown) {
  const parsed = positiveNumber(value);
  return parsed != null && Number.isInteger(parsed) ? parsed : null;
}

function utcDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed;
}

function ageInDays(observedOn: string, now: Date) {
  const observed = utcDay(observedOn);
  if (!observed) return null;
  const currentDay = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return Math.floor((currentDay - observed.valueOf()) / 86_400_000);
}

function containsExternalImageAuthority(row: UnknownRecord) {
  return [
    "selected_source_url",
    "source_image_url",
    "external_image_url",
    "image_url",
  ].some((key) => text(row[key]) != null);
}

type ParsedRow =
  | { kind: "ready"; row: MtgSealedCatalogRowV1 }
  | { kind: "missing_image" }
  | { kind: "stale" }
  | { kind: "invalid" };

function parseRow(value: unknown, now: Date): ParsedRow {
  const row = record(value);
  if (!row || containsExternalImageAuthority(row)) return { kind: "invalid" };

  const priceReleaseId = text(row.price_release_id);
  const imageReleaseId = text(row.image_release_id);
  const familyId = text(row.family_id);
  const variantId = text(row.variant_id);
  const canonicalName = text(row.canonical_name);
  const packageForm = text(row.package_form);
  const observedOn = text(row.observed_on);
  const marketPrice = positiveNumber(row.market_price);
  if (
    !priceReleaseId || !UUID.test(priceReleaseId) ||
    !imageReleaseId || !UUID.test(imageReleaseId) ||
    !familyId || !UUID.test(familyId) ||
    !variantId || !UUID.test(variantId) ||
    !canonicalName || !packageForm || !observedOn || marketPrice == null ||
    text(row.game_key) !== "mtg" || text(row.language_code) !== "en" ||
    text(row.source_provider) !== "tcgplayer" || text(row.currency) !== "USD"
  ) {
    return { kind: "invalid" };
  }

  const age = ageInDays(observedOn, now);
  if (age == null) return { kind: "invalid" };
  if (age < 0 || age > 7) return { kind: "stale" };

  const imageStorageBucket = text(row.image_storage_bucket);
  const imageObjectPath = text(row.image_object_path);
  const imageContentSha256 = text(row.image_content_sha256);
  const imageMime = text(row.image_mime);
  const imageWidth = positiveInteger(row.image_width);
  const imageHeight = positiveInteger(row.image_height);
  const imageBytes = positiveInteger(row.image_bytes);
  const pathMatch = imageObjectPath?.match(IMAGE_PATH) ?? null;
  const expectedMime = pathMatch
    ? {
        jpg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
      }[pathMatch[3]]
    : null;
  if (
    imageStorageBucket !== PRIVATE_IMAGE_BUCKET || !pathMatch ||
    !imageContentSha256 || !SHA256.test(imageContentSha256) ||
    pathMatch[1] !== imageContentSha256.slice(0, 2) ||
    pathMatch[2] !== imageContentSha256 || expectedMime !== imageMime ||
    imageWidth == null || imageHeight == null || imageBytes == null ||
    !imageMime || !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(imageMime)
  ) {
    return { kind: "missing_image" };
  }

  return {
    kind: "ready",
    row: {
      priceReleaseId,
      imageReleaseId,
      familyId,
      variantId,
      canonicalName,
      packageForm,
      languageCode: "en",
      regionCode: nullableText(row.region_code),
      edition: nullableText(row.edition),
      wave: nullableText(row.wave),
      releaseDate: nullableText(row.release_date),
      observedOn,
      currency: "USD",
      marketPrice,
      imageStorageBucket: PRIVATE_IMAGE_BUCKET,
      imageObjectPath: imageObjectPath!,
      imageContentSha256,
      imageMime,
      imageWidth,
      imageHeight,
      imageBytes,
      imageUrl: null,
    },
  };
}

export function classifyMtgSealedRowsV1(
  value: unknown,
  now: Date = new Date(),
): MtgSealedCatalogStateV1 {
  if (!Array.isArray(value)) {
    return { status: "error", message: "Invalid sealed catalog response." };
  }
  if (value.length === 0) return { status: "empty" };

  const parsed = value.map((row) => parseRow(row, now));
  const invalidCount = parsed.filter((row) => row.kind === "invalid").length;
  const staleCount = parsed.filter((row) => row.kind === "stale").length;
  const missingImageCount = parsed.filter((row) => row.kind === "missing_image").length;
  if (invalidCount > 0) {
    return { status: "error", message: "Sealed catalog evidence did not validate." };
  }
  if (staleCount > 0) return { status: "stale", withheldRows: staleCount };
  if (missingImageCount > 0) {
    return { status: "missing_image", withheldRows: missingImageCount };
  }

  return {
    status: "ready",
    rows: parsed.map((item) => (item as Extract<ParsedRow, { kind: "ready" }>).row),
  };
}

function isNetworkFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /network|offline|timeout|timed out|failed to fetch|socket/i.test(message);
}

export async function loadMtgSealedCatalogV1(
  transport: MtgSealedClientTransportV1,
  input: { query?: string | null; limit?: number; offset?: number } = {},
): Promise<MtgSealedCatalogStateV1> {
  if (!MTG_SEALED_CLIENT_V1_ENABLED) return { status: "disabled" };

  try {
    if (!(await transport.isAuthenticated())) return { status: "signed_out" };
    const result = await transport.fetchRows({
      gameKey: "mtg",
      query: input.query?.trim() || null,
      limit: Math.min(Math.max(Math.trunc(input.limit ?? 50), 1), 100),
      offset: Math.max(Math.trunc(input.offset ?? 0), 0),
    });
    if (result.error) throw result.error;
    const classified = classifyMtgSealedRowsV1(result.data);
    if (classified.status !== "ready") return classified;

    const rows = await Promise.all(classified.rows.map(async (row) => ({
      ...row,
      imageUrl: await transport.createSignedImageUrl({
        bucket: row.imageStorageBucket,
        objectPath: row.imageObjectPath,
        expiresInSeconds: MTG_SEALED_IMAGE_SIGNED_URL_TTL_SECONDS_V1,
      }),
    })));
    return { status: "ready", rows };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load sealed catalog.";
    return isNetworkFailure(error)
      ? { status: "offline", message }
      : { status: "error", message };
  }
}

export const mtgSealedRpcNameV1 = MTG_SEALED_RPC_V3;
