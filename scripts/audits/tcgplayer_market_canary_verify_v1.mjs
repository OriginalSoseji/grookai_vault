import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import {
  computeDHash64,
  computePHash64,
  hamming64,
} from "../../backend/condition/fingerprint_hashes_v1.mjs";
import {
  loadTcgplayerMarketCanaryDefinitionV1,
  validateTcgplayerMarketCanaryDefinitionV1,
} from "../../backend/pricing/tcgplayer_market_canary_definition_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const VERIFIER_VERSION = "TCGPLAYER_MARKET_CANARY_VERIFIER_V1";
const DEFAULT_DEFINITION = path.join(
  REPO_ROOT,
  "backend",
  "pricing",
  "canaries",
  "tcgplayer_market_canary_100_v1.json",
);
const DEFAULT_OUT = path.join(
  REPO_ROOT,
  "docs",
  "audits",
  "pricing",
  "TCGPLAYER_MARKET_CANARY_100_V1_VERIFICATION.json",
);
const MAX_PHASH_DISTANCE = 16;
const MAX_DHASH_DISTANCE = 24;
const IMAGE_CONCURRENCY = 8;

function parseArgs(argv) {
  const definition = argv
    .find((arg) => arg.startsWith("--definition="))
    ?.slice("--definition=".length)
    .trim();
  const out = argv
    .find((arg) => arg.startsWith("--out="))
    ?.slice("--out=".length)
    .trim();
  return {
    definition: path.resolve(definition || DEFAULT_DEFINITION),
    out: path.resolve(out || DEFAULT_OUT),
    finalize: argv.includes("--finalize"),
  };
}

function connectionString() {
  return (
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ""
  );
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url)
    ? false
    : { rejectUnauthorized: false };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalized(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(?:pokemon|tcg|card)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizedSet(value) {
  return normalized(value)
    .replace(/\bblack star\b/g, " ")
    .replace(/\b(?:promo|promos|cards|collection|and)\b/g, " ")
    .replace(/\bwizards\b/g, "wotc")
    .replace(/\bsvp\b/g, "sv")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceSetMatches(canonicalSet, sourceSet) {
  const canonical = normalizedSet(canonicalSet);
  const source = normalizedSet(sourceSet);
  if (!canonical || !source) return false;
  if (canonical === source || canonical.includes(source) || source.includes(canonical)) {
    return true;
  }
  const canonicalTokens = new Set(canonical.split(" "));
  const sourceTokens = new Set(source.split(" "));
  const overlap = [...canonicalTokens].filter((term) =>
    sourceTokens.has(term),
  ).length;
  return overlap / Math.min(canonicalTokens.size, sourceTokens.size) >= 0.67;
}

function normalizedName(value) {
  return normalized(value)
    .replace(/\b\d+\s+\d+\b.*$/, "")
    .replace(/\b(?:holofoil|reverse holofoil|normal)\b.*$/, "")
    .trim();
}

function normalizedNumber(value) {
  const numerator = String(value ?? "").split("/")[0].trim().toUpperCase();
  const match = numerator.match(/^([A-Z]*)(\d+)([A-Z]*)$/);
  if (!match) return numerator.replace(/[^A-Z0-9]/g, "");
  return `${match[1]}${Number.parseInt(match[2], 10)}${match[3]}`;
}

function extendedValue(extendedData, name) {
  if (!Array.isArray(extendedData)) return null;
  return (
    extendedData.find(
      (entry) => String(entry?.name).toLowerCase() === name.toLowerCase(),
    )?.value ?? null
  );
}

function fetchBuffer(url, redirects = 0, headers = {}) {
  if (redirects > 5) {
    return Promise.reject(new Error(`too many redirects for ${url}`));
  }
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        // The operator environment uses a local TLS inspection chain that Node
        // cannot validate. Image bytes remain content-hashed in the audit.
        rejectUnauthorized: false,
        headers: {
          "user-agent": "Grookai-Market-Canary-Verifier/1.0",
          ...headers,
        },
        timeout: 20_000,
      },
      (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          const redirectUrl = new URL(response.headers.location, url).href;
          resolve(fetchBuffer(redirectUrl, redirects + 1, headers));
          return;
        }
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`image HTTP ${response.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
      },
    );
    request.on("timeout", () => request.destroy(new Error("image timeout")));
    request.on("error", reject);
  });
}

function storageImageUrl(storagePath) {
  const base = String(process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  if (!base || !storagePath) return null;
  const encodedPath = String(storagePath)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `${base}/storage/v1/object/authenticated/user-card-images/${encodedPath}`;
}

async function canonicalImageBuffer(printing, databaseRow) {
  try {
    return {
      buffer: await fetchBuffer(printing.image_url),
      authority: "canonical_image_url",
      source: printing.image_url,
    };
  } catch (urlError) {
    const storageUrl = storageImageUrl(databaseRow.canonical_image_path);
    const key =
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!storageUrl || !key) throw urlError;
    return {
      buffer: await fetchBuffer(storageUrl, 0, {
        apikey: key,
        authorization: `Bearer ${key}`,
      }),
      authority: "canonical_authenticated_storage",
      source: databaseRow.canonical_image_path,
      url_error: urlError.message,
    };
  }
}

async function mapLimit(values, concurrency, operation) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await operation(values[index], index);
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, values.length) },
      () => worker(),
    ),
  );
  return results;
}

async function databaseRows(client, definition) {
  const result = await client.query(
    `select
       printing.id as card_printing_id,
       printing.card_print_id,
       printing.finish_key,
       printing.printing_gv_id,
       card.gv_id,
       card.name as canonical_name,
       card.number as canonical_number,
       set_row.name as canonical_set_name,
       set_row.code as canonical_set_code,
       coalesce(printing.image_path, card.image_path) as canonical_image_path,
       product.product_id as source_product_id,
       product.name as source_product_name,
       product.image_url as source_product_image_url,
       product.extended_data,
       source_group.name as source_group_name,
       candidate.source_observation_id,
       candidate.source_artifact_id,
       candidate.source_artifact_hash,
       candidate.source_row_hash,
       candidate.source_price_row_identity,
       candidate.source_mapping_id,
       candidate.variant_assignment_id,
       candidate.variant_assignment_version,
       candidate.source_subtype_name,
       candidate.market_price,
       candidate.currency,
       snapshot.id as snapshot_id,
       snapshot.provenance_id,
       snapshot.qualification_decision_id
     from public.card_printings printing
     join public.card_prints card on card.id = printing.card_print_id
     left join public.sets set_row on set_row.id = card.set_id
     join public.v_tcgplayer_market_qualification_candidates_v1 candidate
       on candidate.card_printing_id = printing.id
     join public.tcgcsv_source_products product
       on product.product_id = candidate.source_product_id
     left join public.tcgcsv_source_groups source_group
       on source_group.group_id = product.group_id
     left join public.market_price_publication_snapshots snapshot
       on snapshot.run_id = $2
      and snapshot.card_printing_id = printing.id
      and snapshot.source_product_id = candidate.source_product_id
      and snapshot.source_subtype_name = candidate.source_subtype_name
     where printing.id = any($1::uuid[])
     order by printing.printing_gv_id`,
    [
      definition.printings.map((printing) => printing.card_printing_id),
      definition.source_shadow_run_id,
    ],
  );
  return result.rows;
}

function databaseKey(value) {
  return [
    value.card_printing_id,
    Number(value.source_product_id),
    value.source_subtype_name,
  ].join(":");
}

async function verifyImages(printing, databaseRow) {
  const [canonicalImage, sourceBuffer] = await Promise.all([
    canonicalImageBuffer(printing, databaseRow),
    fetchBuffer(databaseRow.source_product_image_url),
  ]);
  const canonicalBuffer = canonicalImage.buffer;
  const [canonicalDHash, canonicalPHash, sourceDHash, sourcePHash] =
    await Promise.all([
      computeDHash64(canonicalBuffer),
      computePHash64(canonicalBuffer),
      computeDHash64(sourceBuffer),
      computePHash64(sourceBuffer),
    ]);
  const phashDistance = hamming64(canonicalPHash, sourcePHash);
  const dhashDistance = hamming64(canonicalDHash, sourceDHash);
  return {
    canonical_image_sha256: sha256(canonicalBuffer),
    source_image_sha256: sha256(sourceBuffer),
    canonical_image_bytes: canonicalBuffer.length,
    source_image_bytes: sourceBuffer.length,
    phash_distance: phashDistance,
    dhash_distance: dhashDistance,
    threshold: {
      maximum_phash_distance: MAX_PHASH_DISTANCE,
      maximum_dhash_distance: MAX_DHASH_DISTANCE,
    },
    visually_consistent:
      phashDistance <= MAX_PHASH_DISTANCE &&
      dhashDistance <= MAX_DHASH_DISTANCE,
    finish_visible_from_reference_image: false,
    finish_verification_authority: "source_subtype_and_exact_child_assignment",
    canonical_image_authority: canonicalImage.authority,
    canonical_image_source: canonicalImage.source,
    canonical_image_url_error: canonicalImage.url_error ?? null,
    tls_verification: "disabled_for_local_inspection_chain",
  };
}

function compare(printing, row, image) {
  const sourceNumber = extendedValue(row.extended_data, "Number");
  const checks = {
    exact_database_row:
      row.card_printing_id === printing.card_printing_id &&
      row.card_print_id === printing.card_print_id,
    canonical_identity:
      row.gv_id === printing.gv_id &&
      row.printing_gv_id === printing.printing_gv_id,
    canonical_name:
      normalizedName(row.canonical_name) ===
        normalizedName(printing.canonical_name) &&
      normalizedName(row.source_product_name).includes(
        normalizedName(printing.canonical_name),
      ),
    card_number:
      normalizedNumber(row.canonical_number) ===
        normalizedNumber(printing.canonical_number) &&
      normalizedNumber(sourceNumber) ===
        normalizedNumber(printing.canonical_number),
    canonical_set:
      normalized(row.canonical_set_name) ===
        normalized(printing.canonical_set_name) &&
      normalized(row.canonical_set_code) ===
        normalized(printing.canonical_set_code),
    source_set: sourceSetMatches(
      printing.canonical_set_name,
      row.source_group_name,
    ),
    finish:
      row.finish_key === printing.expected_finish &&
      row.source_subtype_name === printing.source_subtype_name,
    headline:
      Number(row.market_price) === printing.expected_headline_usd &&
      row.currency === "USD",
    snapshot:
      row.snapshot_id ===
        printing.provenance_verification.source_snapshot_id &&
      row.provenance_id === printing.provenance_verification.provenance_id &&
      row.qualification_decision_id ===
        printing.provenance_verification.qualification_decision_id,
    provenance:
      row.source_observation_id ===
        printing.provenance_verification.source_observation_id &&
      row.source_artifact_id ===
        printing.provenance_verification.source_artifact_id &&
      row.source_artifact_hash ===
        printing.provenance_verification.source_artifact_hash &&
      row.source_row_hash ===
        printing.provenance_verification.source_row_hash &&
      row.source_price_row_identity ===
        printing.provenance_verification.source_price_row_identity &&
      String(row.source_mapping_id) ===
        String(printing.provenance_verification.source_mapping_id) &&
      row.variant_assignment_id ===
        printing.provenance_verification.variant_assignment_id &&
      row.variant_assignment_version ===
        printing.provenance_verification.variant_assignment_version,
    image_identity: image.visually_consistent,
  };
  const failures = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  return {
    ordinal: printing.ordinal,
    card_printing_id: printing.card_printing_id,
    printing_gv_id: printing.printing_gv_id,
    canonical_name: printing.canonical_name,
    source_product_id: printing.source_product_id,
    source_product_name: row.source_product_name,
    source_group_name: row.source_group_name,
    source_card_number: sourceNumber,
    checks,
    failures,
    image,
    status: failures.length ? "failed" : "passed",
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const loaded = await loadTcgplayerMarketCanaryDefinitionV1(
    args.definition,
    { requireVerified: false },
  );
  const definition = loaded.definition;
  const url = connectionString();
  if (!url) throw new Error("database URL is required");
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    query_timeout: 120_000,
    statement_timeout: 120_000,
  });
  await client.connect();
  let rows;
  try {
    rows = await databaseRows(client, definition);
  } finally {
    await client.end();
  }
  const rowMap = new Map(rows.map((row) => [databaseKey(row), row]));
  const duplicateKeys = rows
    .map(databaseKey)
    .filter((key, index, all) => all.indexOf(key) !== index);
  if (duplicateKeys.length) {
    throw new Error(`duplicate database canary rows: ${duplicateKeys.join(",")}`);
  }

  const results = await mapLimit(
    definition.printings,
    IMAGE_CONCURRENCY,
    async (printing) => {
      const row = rowMap.get(databaseKey(printing));
      if (!row) {
        return {
          ordinal: printing.ordinal,
          card_printing_id: printing.card_printing_id,
          printing_gv_id: printing.printing_gv_id,
          status: "failed",
          failures: ["missing_database_row"],
        };
      }
      try {
        return compare(printing, row, await verifyImages(printing, row));
      } catch (error) {
        return {
          ordinal: printing.ordinal,
          card_printing_id: printing.card_printing_id,
          printing_gv_id: printing.printing_gv_id,
          status: "failed",
          failures: ["image_verification_error"],
          error: error.message,
        };
      }
    },
  );
  const failed = results.filter((result) => result.status !== "passed");
  const report = {
    verifier_version: VERIFIER_VERSION,
    canary_id: definition.canary_id,
    definition_sha256: sha256(loaded.raw),
    verified_at: new Date().toISOString(),
    selected_count: definition.printings.length,
    database_row_count: rows.length,
    passed_count: results.length - failed.length,
    failed_count: failed.length,
    finalizable: failed.length === 0,
    thresholds: {
      maximum_phash_distance: MAX_PHASH_DISTANCE,
      maximum_dhash_distance: MAX_DHASH_DISTANCE,
    },
    boundaries: {
      database_writes: false,
      publication_activation: false,
      canonical_identity_writes: false,
      definition_update: args.finalize,
    },
    results,
  };
  await fs.mkdir(path.dirname(args.out), { recursive: true });
  const reportJson = `${JSON.stringify(report, null, 2)}\n`;
  await fs.writeFile(args.out, reportJson);

  if (args.finalize) {
    if (failed.length) {
      throw new Error(
        `canary cannot be finalized with ${failed.length} failed rows`,
      );
    }
    const byPrintingId = new Map(
      results.map((result) => [result.card_printing_id, result]),
    );
    definition.verification_status = "verified";
    definition.verified_at = report.verified_at;
    definition.verifier_version = VERIFIER_VERSION;
    definition.verification_report_path = path
      .relative(REPO_ROOT, args.out)
      .replace(/\\/g, "/");
    definition.printings = definition.printings.map((printing) => {
      const result = byPrintingId.get(printing.card_printing_id);
      return {
        ...printing,
        visual_data_verification: {
          status: "passed",
          canonical_identity_match: true,
          card_number_match: true,
          set_match: true,
          finish_data_match: true,
          source_market_price_match: true,
          image_identity_match: true,
          canonical_image_sha256: result.image.canonical_image_sha256,
          source_image_sha256: result.image.source_image_sha256,
          phash_distance: result.image.phash_distance,
          dhash_distance: result.image.dhash_distance,
          finish_verification_authority:
            result.image.finish_verification_authority,
          notes:
            "Canonical and TCGPlayer source images match by perceptual hash; exact finish is proven by source subtype plus exact child assignment.",
        },
      };
    });
    validateTcgplayerMarketCanaryDefinitionV1(definition);
    await fs.writeFile(
      args.definition,
      `${JSON.stringify(definition, null, 2)}\n`,
    );
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        verifier_version: VERIFIER_VERSION,
        canary_id: definition.canary_id,
        passed_count: report.passed_count,
        failed_count: report.failed_count,
        finalizable: report.finalizable,
        finalized: args.finalize && report.finalizable,
        failed_rows: failed.map((result) => ({
          ordinal: result.ordinal,
          printing_gv_id: result.printing_gv_id,
          failures: result.failures,
          error: result.error ?? null,
        })),
        report_path: path.relative(REPO_ROOT, args.out).replace(/\\/g, "/"),
        report_sha256: sha256(reportJson),
      },
      null,
      2,
    )}\n`,
  );
  if (failed.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error(`[tcgplayer-market-canary-verify] ${error.stack || error.message}`);
  process.exitCode = 1;
});
