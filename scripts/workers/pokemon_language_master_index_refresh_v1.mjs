import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";

import {
  mergePokemonLanguageCandidateSnapshotV1,
  normalizePokemonLanguageSourceSnapshotV1,
  POKEMON_LANGUAGE_MASTER_INDEX_VERSION,
  pokemonLanguageFingerprint,
  stablePokemonLanguageJson,
  summarizePokemonLanguageCandidateSnapshotV1,
  TCGDEX_LIVE_POKEMON_LANGUAGE_SCOPES,
  TCGDEX_POKEMON_LANGUAGE_SCOPES,
} from "../../backend/catalog/pokemon_language_master_index_v1.mjs";
import { loadTcgdexGithubLanguageSnapshotsV1 } from
  "../../backend/catalog/tcgdex_github_language_source_v1.mjs";

const USER_AGENT = "GrookaiVaultPokemonLanguageIndex/1.0 catalog-ops@grookai.com";
const DEFAULT_BASELINE_DIR = path.join(
  "docs",
  "audits",
  "pokemon_language_master_index_v1",
  "candidates",
);
const CANDIDATE_DIRECTORY = "candidate_index";

function clean(value) {
  return String(value ?? "").trim();
}

function parseArgs(argv) {
  const options = {
    mode: "plan",
    baselineDir: DEFAULT_BASELINE_DIR,
    outDir: null,
    planDir: null,
    sourceDir: null,
    languages: [...TCGDEX_POKEMON_LANGUAGE_SCOPES],
    concurrency: 4,
  };
  for (const token of argv) {
    if (token.startsWith("--mode=")) options.mode = token.slice(7);
    else if (token.startsWith("--baseline-dir=")) options.baselineDir = token.slice(15);
    else if (token.startsWith("--out-dir=")) options.outDir = token.slice(10);
    else if (token.startsWith("--plan-dir=")) options.planDir = token.slice(11);
    else if (token.startsWith("--source-dir=")) options.sourceDir = token.slice(13);
    else if (token.startsWith("--languages=")) {
      options.languages = token.slice(12).split(",").map((value) => clean(value).toLowerCase())
        .filter(Boolean);
    } else if (token.startsWith("--concurrency=")) {
      options.concurrency = Number(token.slice(14));
    } else throw new Error(`Unknown argument: ${token}`);
  }
  if (!["plan", "apply-to-worktree"].includes(options.mode)) {
    throw new Error("--mode must be plan or apply-to-worktree");
  }
  if (options.mode === "plan" && !options.outDir) throw new Error("--out-dir is required");
  if (options.mode === "apply-to-worktree" && !options.planDir) {
    throw new Error("--plan-dir is required");
  }
  if (!Number.isSafeInteger(options.concurrency) || options.concurrency < 1 ||
      options.concurrency > 12) {
    throw new Error("--concurrency must be between 1 and 12");
  }
  if (new Set(options.languages).size !== options.languages.length ||
      options.languages.some((language) =>
        !TCGDEX_POKEMON_LANGUAGE_SCOPES.includes(language))) {
    throw new Error("--languages contains an unsupported or duplicate scope");
  }
  return options;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readSnapshot(root, language) {
  const languageDir = path.join(root, language);
  const manifestPath = path.join(languageDir, "manifest.json");
  if (!await exists(manifestPath)) return null;
  const manifest = await readJson(manifestPath);
  if (manifest.version !== POKEMON_LANGUAGE_MASTER_INDEX_VERSION ||
      manifest.language !== language) {
    throw new Error(`Invalid Pokemon language manifest for ${language}.`);
  }
  const [setsBuffer, cardsBuffer] = await Promise.all([
    fs.readFile(path.join(languageDir, "sets.json.gz")),
    fs.readFile(path.join(languageDir, "cards.json.gz")),
  ]);
  const sets = JSON.parse(zlib.gunzipSync(setsBuffer).toString("utf8"));
  const cards = JSON.parse(zlib.gunzipSync(cardsBuffer).toString("utf8"));
  const anomaliesPath = path.join(languageDir, "source_anomalies.json.gz");
  const sourceAnomalies = await exists(anomaliesPath)
    ? JSON.parse(zlib.gunzipSync(await fs.readFile(anomaliesPath)).toString("utf8"))
    : [];
  if (pokemonLanguageFingerprint(sets) !== manifest.sets_fingerprint_sha256 ||
      pokemonLanguageFingerprint(cards) !== manifest.cards_fingerprint_sha256 ||
      (manifest.source_anomalies_fingerprint_sha256 &&
        pokemonLanguageFingerprint(sourceAnomalies) !==
          manifest.source_anomalies_fingerprint_sha256)) {
    throw new Error(`Pokemon language snapshot fingerprint mismatch for ${language}.`);
  }
  return {
    version: manifest.version,
    language,
    source: manifest.source,
    source_commit_sha: manifest.source_commit_sha ?? null,
    source_authority: manifest.source_authority,
    canonical_authority: false,
    sets,
    cards,
    source_anomalies: sourceAnomalies,
  };
}

async function writeSnapshot(root, snapshot) {
  const languageDir = path.join(root, snapshot.language);
  await fs.mkdir(languageDir, { recursive: true });
  const summary = summarizePokemonLanguageCandidateSnapshotV1(snapshot);
  const gzipOptions = { level: 9, mtime: 0 };
  await Promise.all([
    fs.writeFile(
      path.join(languageDir, "sets.json.gz"),
      zlib.gzipSync(Buffer.from(stablePokemonLanguageJson(snapshot.sets)), gzipOptions),
    ),
    fs.writeFile(
      path.join(languageDir, "cards.json.gz"),
      zlib.gzipSync(Buffer.from(stablePokemonLanguageJson(snapshot.cards)), gzipOptions),
    ),
    fs.writeFile(
      path.join(languageDir, "source_anomalies.json.gz"),
      zlib.gzipSync(
        Buffer.from(stablePokemonLanguageJson(snapshot.source_anomalies ?? [])),
        gzipOptions,
      ),
    ),
    fs.writeFile(path.join(languageDir, "manifest.json"), stablePokemonLanguageJson(summary)),
  ]);
  return summary;
}

async function fetchJson(url) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(45_000),
      });
      if (response.status === 404) return { status: 404, body: null };
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        await new Promise((resolve) => setTimeout(
          resolve,
          Math.max(retryAfter * 1000, attempt * 2_000),
        ));
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { status: response.status, body: await response.json() };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw new Error(`${url}: ${lastError?.message ?? lastError}`);
}

async function loadSourceLanguage(language, sourceDir) {
  if (sourceDir) {
    const setsPath = path.join(sourceDir, `${language}.sets.json`);
    const cardsPath = path.join(sourceDir, `${language}.cards.json`);
    if (!await exists(setsPath) || !await exists(cardsPath)) {
      return { status: "provider_no_cards", sets: [], cards: [] };
    }
    return {
      status: "available",
      sets: await readJson(setsPath),
      cards: await readJson(cardsPath),
    };
  }
  const base = `https://api.tcgdex.net/v2/${encodeURIComponent(language)}`;
  const [sets, cards] = await Promise.all([
    fetchJson(`${base}/sets`),
    fetchJson(`${base}/cards`),
  ]);
  if (sets.status === 404 || cards.status === 404 ||
      !Array.isArray(sets.body) || !Array.isArray(cards.body) ||
      sets.body.length === 0 || cards.body.length === 0) {
    return { status: "provider_no_cards", sets: [], cards: [] };
  }
  return { status: "available", sets: sets.body, cards: cards.body };
}

async function mapPool(values, concurrency, task) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

async function plan(options) {
  const candidateRoot = path.join(options.outDir, CANDIDATE_DIRECTORY);
  await fs.mkdir(candidateRoot, { recursive: true });
  const baselineRegistryPath = path.join(options.baselineDir, "language_registry_v1.json");
  const baselineRegistry = await exists(baselineRegistryPath)
    ? await readJson(baselineRegistryPath)
    : null;
  const baselineRegistryByLanguage = new Map(
    (baselineRegistry?.languages ?? []).map((row) => [row.language, row]),
  );
  let githubFallbackPromise = null;
  let apiUnavailable = false;
  const githubFallback = () => {
    githubFallbackPromise ??= loadTcgdexGithubLanguageSnapshotsV1({
      concurrency: Math.min(options.concurrency * 2, 12),
    });
    return githubFallbackPromise;
  };
  const results = await mapPool(options.languages, options.concurrency, async (language) => {
    const baseline = await readSnapshot(options.baselineDir, language);
    try {
      let source;
      let apiError = null;
      if (!apiUnavailable || options.sourceDir) {
        try {
          source = await loadSourceLanguage(language, options.sourceDir);
        } catch (error) {
          apiError = error;
          if (!options.sourceDir) apiUnavailable = true;
        }
      }
      if (!options.sourceDir && (!source || source.status !== "available")) {
        const fallback = await githubFallback();
        source = fallback.snapshots[language];
        if (source.status !== "available" && apiError) {
          source.api_error = String(apiError.message ?? apiError);
        }
      }
      if (!source) throw apiError ?? new Error(`No source for ${language}.`);
      if (source.status !== "available") {
        if (baseline) {
          const summary = await writeSnapshot(candidateRoot, baseline);
          return {
            language,
            status: "source_unavailable_baseline_preserved",
            changed: false,
            ...summary,
          };
        }
        return {
          language,
          status: "provider_no_cards",
          changed: false,
          set_count: 0,
          card_count: 0,
        };
      }
      const current = normalizePokemonLanguageSourceSnapshotV1({
        language,
        sets: source.sets,
        cards: source.cards,
        source: source.source ?? "tcgdex_v2",
        sourceCommitSha: source.source_commit_sha,
      });
      const merged = mergePokemonLanguageCandidateSnapshotV1({ baseline, current });
      const summary = await writeSnapshot(candidateRoot, merged);
      const baselineSummary = baseline
        ? summarizePokemonLanguageCandidateSnapshotV1(baseline)
        : null;
      const changed = !baselineSummary ||
        baselineSummary.sets_fingerprint_sha256 !== summary.sets_fingerprint_sha256 ||
        baselineSummary.cards_fingerprint_sha256 !== summary.cards_fingerprint_sha256 ||
        baselineSummary.source_anomalies_fingerprint_sha256 !==
          summary.source_anomalies_fingerprint_sha256;
      return { language, status: "candidate_index_ready", changed, ...summary };
    } catch (error) {
      if (baseline) {
        const summary = await writeSnapshot(candidateRoot, baseline);
        return {
          language,
          status: "source_error_baseline_preserved",
          changed: false,
          error: String(error.message ?? error),
          ...summary,
        };
      }
      return {
        language,
        status: "source_error_no_baseline",
        changed: false,
        error: String(error.message ?? error),
        set_count: 0,
        card_count: 0,
      };
    }
  });

  const resultsByLanguage = new Map(results.map((row) => [row.language, row]));
  const registry = {
    version: POKEMON_LANGUAGE_MASTER_INDEX_VERSION,
    policy: "all_source_rows_enter_language_index_before_canonical_reconciliation",
    canonical_authority: false,
    languages: TCGDEX_POKEMON_LANGUAGE_SCOPES.map((language) => {
      const row = resultsByLanguage.get(language);
      const prior = baselineRegistryByLanguage.get(language);
      if (!row) {
        return prior ?? {
          language,
          status: "not_selected_no_baseline",
          set_count: 0,
          card_count: 0,
          sets_fingerprint_sha256: null,
          cards_fingerprint_sha256: null,
          source_anomaly_count: 0,
          source_anomalies_fingerprint_sha256: null,
          source: null,
          source_commit_sha: null,
        };
      }
      if (prior && (row.status === "source_unavailable_baseline_preserved" ||
          row.status === "source_error_baseline_preserved")) {
        return prior;
      }
      return {
        language,
        status: row.status,
        set_count: row.set_count,
        card_count: row.card_count,
        sets_fingerprint_sha256: row.sets_fingerprint_sha256 ?? null,
        cards_fingerprint_sha256: row.cards_fingerprint_sha256 ?? null,
        source_anomaly_count: row.source_anomaly_count ?? 0,
        source_anomalies_fingerprint_sha256:
          row.source_anomalies_fingerprint_sha256 ?? null,
        source: row.changed || !prior
          ? row.source ?? null
          : prior.source ?? row.source ?? null,
        source_commit_sha: row.changed || !prior
          ? row.source_commit_sha ?? null
          : prior.source_commit_sha ?? row.source_commit_sha ?? null,
      };
    }),
  };
  await fs.writeFile(
    path.join(candidateRoot, "language_registry_v1.json"),
    stablePokemonLanguageJson(registry),
  );

  const registryChanged = !baselineRegistry ||
    pokemonLanguageFingerprint(baselineRegistry) !== pokemonLanguageFingerprint(registry);
  const report = {
    version: POKEMON_LANGUAGE_MASTER_INDEX_VERSION,
    generated_at: new Date().toISOString(),
    baseline_dir: options.baselineDir,
    candidate_dir: candidateRoot,
    database_writes: false,
    storage_writes: false,
    canonical_writes: false,
    changed: registryChanged || results.some((row) => row.changed),
    changed_languages: results.filter((row) => row.changed).map((row) => row.language),
    registry_changed: registryChanged,
    source_error_languages: results.filter((row) =>
      row.status.startsWith("source_error")
    ).map((row) => row.language),
    source_anomaly_languages: results.filter((row) =>
      Number(row.source_anomaly_count ?? 0) > 0
    ).map((row) => row.language),
    source_anomaly_count: results.reduce(
      (sum, row) => sum + Number(row.source_anomaly_count ?? 0),
      0,
    ),
    observed_source_anomaly_count: results.reduce(
      (sum, row) => sum + Number(row.observed_source_anomaly_count ?? 0),
      0,
    ),
    revalidation_source_anomaly_count: results.reduce(
      (sum, row) => sum + Number(row.revalidation_source_anomaly_count ?? 0),
      0,
    ),
    required_live_language_failures: results.filter((row) =>
      TCGDEX_LIVE_POKEMON_LANGUAGE_SCOPES.includes(row.language) &&
      row.status !== "candidate_index_ready" &&
      !baselineRegistryByLanguage.has(row.language)
    ).map((row) => row.language),
    results,
  };
  report.plan_fingerprint_sha256 = pokemonLanguageFingerprint({
    ...report,
    generated_at: null,
  });
  await fs.writeFile(path.join(options.outDir, "plan.json"), stablePokemonLanguageJson(report));
  await fs.writeFile(
    path.join(options.outDir, "summary.json"),
    stablePokemonLanguageJson(report),
  );
  return report;
}

async function copyDirectory(source, destination) {
  await fs.mkdir(destination, { recursive: true });
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) await copyDirectory(sourcePath, destinationPath);
    else if (entry.isFile()) await fs.copyFile(sourcePath, destinationPath);
  }
}

async function applyToWorktree(options) {
  const planPath = path.join(options.planDir, "plan.json");
  const report = await readJson(planPath);
  const expectedFingerprint = pokemonLanguageFingerprint({
    ...report,
    generated_at: null,
    plan_fingerprint_sha256: undefined,
  });
  if (report.version !== POKEMON_LANGUAGE_MASTER_INDEX_VERSION ||
      report.plan_fingerprint_sha256 !== expectedFingerprint) {
    throw new Error("Pokemon language refresh plan fingerprint mismatch.");
  }
  if (!report.changed) return report;
  const source = path.join(options.planDir, CANDIDATE_DIRECTORY);
  await copyDirectory(source, options.baselineDir);
  return report;
}

const options = parseArgs(process.argv.slice(2));
const report = options.mode === "plan"
  ? await plan(options)
  : await applyToWorktree(options);
process.stdout.write(`${stablePokemonLanguageJson(report)}`);
