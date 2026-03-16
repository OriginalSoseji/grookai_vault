import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createTcgdexClient } from "../backend/clients/tcgdex.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIRECTORY = path.join(REPO_ROOT, "apps", "web", "public", "set-logos");
const PAGE_SIZE = 1000;
const REQUEST_TIMEOUT_MS = 5000;
const MCD_SHARED_ASSET_CODE = "mcd11";
const BLACK_STAR_PROMO_SHARED_ASSET_CODE = "swshp";
const TRAINER_GALLERY_PARENT_SET_MAP = new Map([
  ["swsh9tg", "swsh9"],
  ["swsh10tg", "swsh10"],
  ["swsh11tg", "swsh11"],
  ["swsh12tg", "swsh12"],
]);

dotenv.config({ path: path.join(REPO_ROOT, ".env.local") });
dotenv.config({ path: path.join(REPO_ROOT, ".env") });

const force = process.argv.includes("--force");

function createServerSupabase() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY.");
  }

  return createClient(url, secretKey);
}

function normalizeSetQuery(value = "") {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chooseCanonicalSetRow(existing, candidate) {
  if (candidate.card_count !== existing.card_count) {
    return candidate.card_count > existing.card_count ? candidate : existing;
  }

  if (Boolean(candidate.release_date) !== Boolean(existing.release_date)) {
    return candidate.release_date ? candidate : existing;
  }

  return candidate.code.length < existing.code.length ? candidate : existing;
}

function normalizeAssetUrl(url) {
  if (typeof url !== "string" || url.trim().length === 0) {
    return null;
  }

  const trimmed = url.trim();
  if (/\.(png)(\?.*)?$/i.test(trimmed)) {
    return trimmed;
  }

  if (/\.(webp|jpe?g)(\?.*)?$/i.test(trimmed)) {
    return null;
  }

  return `${trimmed}.png`;
}

function getPokemonTcgApiSetId(setInfo) {
  const rawId = setInfo.source?.pokemonapi?.id;
  if (typeof rawId !== "string") {
    return null;
  }

  const trimmed = rawId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function fetchJsonWithTimeout(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...headers,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`fetch failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchAllCanonicalSetCodes(supabase) {
  const rows = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("card_prints")
      .select("set_code")
      .not("gv_id", "is", null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const batch = data ?? [];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return rows;
}

async function getCanonicalSets(supabase) {
  const [{ data: setRows, error: setError }, setCodeRows] = await Promise.all([
    supabase.from("sets").select("code,name,printed_total,release_date,logo_url,symbol_url,source"),
    fetchAllCanonicalSetCodes(supabase),
  ]);

  if (setError) {
    throw new Error(setError.message);
  }

  const cardCountBySetCode = new Map();
  for (const row of setCodeRows) {
    const setCode = String(row.set_code ?? "").trim().toLowerCase();
    if (!setCode) continue;
    cardCountBySetCode.set(setCode, (cardCountBySetCode.get(setCode) ?? 0) + 1);
  }

  const canonicalSetsByName = new Map();

  for (const row of setRows ?? []) {
    if (!row.code || !row.name) {
      continue;
    }

    const code = String(row.code).trim().toLowerCase();
    const candidate = {
      code,
      name: row.name,
      printed_total: typeof row.printed_total === "number" ? row.printed_total : undefined,
      release_date: row.release_date ?? undefined,
      card_count: cardCountBySetCode.get(code) ?? 0,
      logo_url: row.logo_url ?? undefined,
      symbol_url: row.symbol_url ?? undefined,
      source: row.source ?? {},
    };
    const normalizedName = normalizeSetQuery(row.name);
    const existing = canonicalSetsByName.get(normalizedName);

    if (!existing) {
      canonicalSetsByName.set(normalizedName, candidate);
      continue;
    }

    canonicalSetsByName.set(normalizedName, chooseCanonicalSetRow(existing, candidate));
  }

  return [...canonicalSetsByName.values()]
    .filter((setInfo) => setInfo.card_count > 0)
    .sort((left, right) => left.code.localeCompare(right.code));
}

async function resolveLogoUrl(setInfo, tcgdexClient) {
  const storedLogoUrl = normalizeAssetUrl(setInfo.source?.tcgdex?.raw?.logo ?? setInfo.source?.tcgdex?.logo);
  if (storedLogoUrl) {
    return { url: storedLogoUrl, source: "tcgdex" };
  }

  const tcgdexSetId = typeof setInfo.source?.tcgdex?.id === "string" ? setInfo.source.tcgdex.id.trim() : "";
  if (tcgdexSetId) {
    try {
      const setDetail = await fetchJsonWithTimeout(
        `${tcgdexClient.baseUrl}sets/${encodeURIComponent(tcgdexSetId)}`,
        tcgdexClient.apiKey ? { "X-Api-Key": tcgdexClient.apiKey } : {},
      );
      const logoUrl = normalizeAssetUrl(setDetail?.logo ?? setDetail?.images?.logo ?? null);
      if (logoUrl) {
        return { url: logoUrl, source: "tcgdex" };
      }
    } catch {
      // Fall through to Pokemon TCG API fallback.
    }
  }

  const pokemonTcgApiSetId = getPokemonTcgApiSetId(setInfo);
  if (!pokemonTcgApiSetId) {
    return { url: null, source: null, reason: "no_deterministic_pokemontcg_id" };
  }

  try {
    const payload = await fetchJsonWithTimeout(`https://api.pokemontcg.io/v2/sets/${encodeURIComponent(pokemonTcgApiSetId)}`);
    const logoUrl = normalizeAssetUrl(payload?.data?.images?.logo ?? null);

    if (logoUrl) {
      return { url: logoUrl, source: "pokemontcgapi" };
    }

    return { url: null, source: null, reason: "pokemontcgapi_missing_logo" };
  } catch (error) {
    return {
      url: null,
      source: null,
      reason: error instanceof Error ? `pokemontcgapi_fetch_failed:${error.message}` : "pokemontcgapi_fetch_failed",
    };
  }
}

async function downloadLogo(url, destinationPath) {
  const response = await fetch(url, {
    headers: {
      Accept: "image/png,image/*;q=0.8,*/*;q=0.5",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`download failed: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(destinationPath, Buffer.from(arrayBuffer));
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getFallbackCopyRule(setCode) {
  if (!setCode) {
    return null;
  }

  if (setCode.startsWith("mcd")) {
    return {
      sourceCode: MCD_SHARED_ASSET_CODE,
      sourceType: "familyFallbackCopies",
    };
  }

  if (setCode === "svp") {
    return {
      sourceCode: BLACK_STAR_PROMO_SHARED_ASSET_CODE,
      sourceType: "sharedPromoFallbackCopies",
    };
  }

  const trainerGalleryParentCode = TRAINER_GALLERY_PARENT_SET_MAP.get(setCode);
  if (trainerGalleryParentCode) {
    return {
      sourceCode: trainerGalleryParentCode,
      sourceType: "parentFallbackCopies",
    };
  }

  return null;
}

async function applyDeterministicFallbackAsset(setInfo, summary) {
  const fallbackRule = getFallbackCopyRule(setInfo.code);
  if (!fallbackRule) {
    return false;
  }

  const destinationPath = path.join(OUTPUT_DIRECTORY, `${setInfo.code}.png`);
  if (await fileExists(destinationPath)) {
    return false;
  }

  const sourcePath = path.join(OUTPUT_DIRECTORY, `${fallbackRule.sourceCode}.png`);
  if (!(await fileExists(sourcePath))) {
    return false;
  }

  await fs.copyFile(sourcePath, destinationPath);
  summary[fallbackRule.sourceType] += 1;
  return true;
}

async function main() {
  const supabase = createServerSupabase();
  const tcgdexClient = createTcgdexClient();
  const sets = await getCanonicalSets(supabase);

  await fs.mkdir(OUTPUT_DIRECTORY, { recursive: true });

  const summary = {
    totalSetsInspected: sets.length,
    logosDownloadedFromTcgdex: 0,
    logosDownloadedFromPokemonTcgApi: 0,
    logosAlreadyPresent: 0,
    familyFallbackCopies: 0,
    parentFallbackCopies: 0,
    sharedPromoFallbackCopies: 0,
    stillMissing: 0,
    skippedNoDeterministicPokemonTcgApiId: [],
    skippedNoUsableUpstreamLogoAsset: [],
  };

  for (const setInfo of sets) {
    if (!force) {
      try {
        await fs.access(path.join(OUTPUT_DIRECTORY, `${setInfo.code}.png`));
        summary.logosAlreadyPresent += 1;
        continue;
      } catch {
        // Download when not present.
      }
    }

    const logoResult = await resolveLogoUrl(setInfo, tcgdexClient);
    if (!logoResult.url || !logoResult.source) {
      const copiedFallback = await applyDeterministicFallbackAsset(setInfo, summary);
      if (!copiedFallback) {
        summary.stillMissing += 1;

        const entry = {
          code: setInfo.code,
          name: setInfo.name,
          tcgdex_set_id: setInfo.source?.tcgdex?.id ?? null,
          pokemontcgapi_set_id: getPokemonTcgApiSetId(setInfo),
          reason: logoResult.reason ?? "no_usable_upstream_logo",
        };

        if (logoResult.reason === "no_deterministic_pokemontcg_id") {
          summary.skippedNoDeterministicPokemonTcgApiId.push(entry);
        } else {
          summary.skippedNoUsableUpstreamLogoAsset.push(entry);
        }
      }

      continue;
    }

    try {
      await downloadLogo(logoResult.url, path.join(OUTPUT_DIRECTORY, `${setInfo.code}.png`));

      if (logoResult.source === "pokemontcgapi") {
        summary.logosDownloadedFromPokemonTcgApi += 1;
      } else {
        summary.logosDownloadedFromTcgdex += 1;
      }
    } catch (error) {
      const copiedFallback = await applyDeterministicFallbackAsset(setInfo, summary);
      if (!copiedFallback) {
        summary.stillMissing += 1;
        summary.skippedNoUsableUpstreamLogoAsset.push({
          code: setInfo.code,
          name: setInfo.name,
          tcgdex_set_id: setInfo.source?.tcgdex?.id ?? null,
          pokemontcgapi_set_id: getPokemonTcgApiSetId(setInfo),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("[fetch_set_logos] fatal error", error);
  process.exit(1);
});
