import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { createGunzip } from "node:zlib";
import { fileURLToPath } from "node:url";

import { buildMtgCanonicalCandidateV1 } from "../../backend/pricing/mtg_canonical_catalog_candidate_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const PLAN_VERSION = "MTG_CANONICAL_CATALOG_CANARY_PLAN_V1";
const MTG_GAME_ID = "4d544700-0000-4000-8000-000000000001";
const UUID_NAMESPACE = "0f00c5f8-f663-50c4-98f7-b9b5316628d6";

function parseUuid(value) {
  const hex = String(value).replaceAll("-", "");
  if (!/^[0-9a-f]{32}$/i.test(hex)) throw new Error(`Invalid UUID: ${value}`);
  return Buffer.from(hex, "hex");
}

export function deterministicUuidV5(name, namespace = UUID_NAMESPACE) {
  // RFC 4122 UUIDv5 requires SHA-1 for stable identity, not for security.
  // lgtm[js/weak-cryptographic-algorithm]
  const hash = createHash("sha1")
    .update(parseUuid(namespace))
    .update(String(name), "utf8")
    .digest()
    .subarray(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeFinish(finish) {
  if (finish === "nonfoil") return "normal";
  if (finish === "foil" || finish === "etched") return finish;
  throw new Error(`Unsupported MTG finish: ${finish}`);
}

function parseArgs(argv) {
  const args = {
    warehouseProducts: null,
    reconciliationSummary: null,
    bulkFile: path.join(ROOT, ".tmp", "scryfall-default-cards.jsonl.gz"),
    setCode: "dsk",
    outDir: null,
  };
  for (const arg of argv) {
    if (arg.startsWith("--warehouse-products=")) args.warehouseProducts = path.resolve(arg.slice(21));
    else if (arg.startsWith("--reconciliation-summary=")) args.reconciliationSummary = path.resolve(arg.slice(25));
    else if (arg.startsWith("--bulk-file=")) args.bulkFile = path.resolve(arg.slice(12));
    else if (arg.startsWith("--set-code=")) args.setCode = arg.slice(11).trim().toLowerCase();
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
  }
  if (!args.warehouseProducts) throw new Error("--warehouse-products is required");
  if (!args.reconciliationSummary) throw new Error("--reconciliation-summary is required");
  return args;
}

async function loadWarehouseProducts(file) {
  const rows = new Map();
  const lines = readline.createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    rows.set(Number(row.product_id), {
      product_id: Number(row.product_id),
      subtypes: new Set(row.subtypes ?? []),
      positive_market_subtypes: new Set(row.positive_market_subtypes ?? []),
    });
  }
  return rows;
}

async function loadSetCandidates(file, setCode) {
  const candidates = [];
  const lines = readline.createInterface({
    input: createReadStream(file).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const card = JSON.parse(line);
    if (String(card.set ?? "").toLowerCase() !== setCode) continue;
    const candidate = buildMtgCanonicalCandidateV1(card);
    if (candidate.status === "candidate") candidates.push(candidate);
  }
  return candidates.sort((left, right) =>
    left.card.source_print_id.localeCompare(right.card.source_print_id),
  );
}

export function buildMtgCanaryPayloadV1({
  candidates,
  warehouseProducts,
  collisionSourceRows = new Set(),
  sourceBulkSha256,
  stagingMigrationSha256,
  foundationMigrationSha256,
  repository,
}, policy = {}) {
  const planVersion = policy.plan_version ?? PLAN_VERSION;
  const requireExpansion = policy.require_expansion ?? true;
  const qualityFlag = policy.quality_flag ?? "mtg_catalog_canary";
  if (candidates.length === 0) throw new Error("Canary set has no eligible candidates");
  if (!repository?.commit_sha || !repository?.branch) {
    throw new Error("Repository commit SHA and branch are required");
  }
  const set = candidates[0].set;
  if (requireExpansion && set.set_type !== "expansion") {
    throw new Error("Canary set must be an expansion");
  }
  for (const candidate of candidates) {
    if (candidate.set.source_set_id !== set.source_set_id) {
      throw new Error("Canary candidates span multiple set identities");
    }
  }

  const setId = deterministicUuidV5(`mtg:set:${set.source_set_id}`);
  const rows = {
    sets: [
      {
        id: setId,
        game: "mtg",
        code: set.code,
        name: set.name,
        release_date: set.released_at,
        source: {
          scryfall: {
            id: set.source_set_id,
            code: set.code,
            set_type: set.set_type,
            bulk_sha256: sourceBulkSha256,
          },
        },
        set_role: set.set_type === "expansion" ? "expansion" : null,
        identity_domain_default: "mtg_eng_paper_print",
        identity_model: "standard",
        logo_url: null,
        symbol_url: null,
        hero_image_url: null,
        hero_image_source: null,
      },
    ],
    card_prints: [],
    card_print_identity: [],
    card_printings: [],
    external_mappings: [],
    external_printing_mappings: [],
  };
  let exactLaneCount = 0;
  let positiveLaneCount = 0;
  let collisionLaneCount = 0;

  for (const candidate of candidates) {
    const sourcePrintId = candidate.card.source_print_id;
    const cardPrintId = deterministicUuidV5(`mtg:card_print:${sourcePrintId}`);
    const gvId = `GV-MTG-SF-${sourcePrintId.toUpperCase()}`;
    rows.card_prints.push({
      id: cardPrintId,
      game_id: MTG_GAME_ID,
      set_id: setId,
      name: candidate.card.name,
      number: candidate.card.collector_number,
      variant_key: `scryfall:${sourcePrintId}`,
      rarity: candidate.card.rarity,
      image_url: null,
      image_alt_url: null,
      image_source: null,
      image_status: "missing",
      tcgplayer_id: null,
      external_ids: {
        scryfall: sourcePrintId,
        scryfall_oracle: candidate.card.source_oracle_id,
      },
      set_code: set.code,
      artist: candidate.card.artist,
      variants: candidate.printing_finishes.map(normalizeFinish).sort(),
      print_identity_key: `scryfall:${sourcePrintId}`,
      gv_id: gvId,
      identity_domain: "mtg_eng_paper_print",
      printed_identity_modifier: null,
      set_identity_model: "standard",
      data_quality_flags: {
        [qualityFlag]: true,
        image_pending_self_host: true,
        source_bulk_sha256: sourceBulkSha256,
      },
    });
    rows.card_print_identity.push({
      id: deterministicUuidV5(`mtg:identity:${sourcePrintId}`),
      card_print_id: cardPrintId,
      identity_domain: candidate.identity_domain,
      set_code_identity: set.code,
      printed_number: candidate.card.collector_number,
      normalized_printed_name: candidate.card.name.toLowerCase(),
      source_name_raw: candidate.card.name,
      identity_payload: candidate.identity_payload,
      identity_key_version: candidate.identity_key_version,
      identity_key_hash: candidate.identity_key_hash,
      is_active: true,
    });
    rows.external_mappings.push({
      card_print_id: cardPrintId,
      source: "scryfall",
      external_id: sourcePrintId,
      active: true,
      meta: {
        contract_version: planVersion,
        oracle_id: candidate.card.source_oracle_id,
        ...(policy.include_source_card_release_evidence
          ? {
              source_card_released_at:
                candidate.source_card_released_at ?? candidate.set.released_at,
            }
          : {}),
        source_images: candidate.source_images,
        image_policy: candidate.source_image_policy,
      },
    });

    const printingByFinish = new Map();
    for (const sourceFinish of candidate.printing_finishes) {
      const finish = normalizeFinish(sourceFinish);
      const printingId = deterministicUuidV5(`mtg:printing:${sourcePrintId}:${finish}`);
      printingByFinish.set(finish, { id: printingId, finish });
      rows.card_printings.push({
        id: printingId,
        card_print_id: cardPrintId,
        finish_key: finish,
        is_provisional: false,
        provenance_source: "scryfall",
        provenance_ref: sourcePrintId,
        created_by: planVersion,
        printing_gv_id: `${gvId}-${finish.toUpperCase()}`,
        image_source: null,
        image_path: null,
        image_url: null,
        image_status: "missing",
        image_note: "Self-hosted image acquisition is a separate gate.",
      });
    }

    for (const link of candidate.exact_source_links) {
      if (link.source_role !== "tcgplayer_standard_product") continue;
      const warehouse = warehouseProducts.get(link.product_id);
      if (!warehouse) continue;
      for (const subtype of link.expected_source_subtypes) {
        const identity = `${link.product_id}:${subtype}`;
        if (collisionSourceRows.has(identity)) {
          collisionLaneCount += 1;
          continue;
        }
        if (!warehouse.subtypes.has(subtype)) continue;
        const printing = printingByFinish.get(subtype);
        if (!printing) throw new Error(`No ${subtype} child for ${sourcePrintId}`);
        rows.external_printing_mappings.push({
          card_printing_id: printing.id,
          source: "tcgplayer_market",
          external_id: identity,
          active: true,
          meta: {
            contract_version: planVersion,
            product_id: link.product_id,
            source_subtype: subtype,
            source_print_id: sourcePrintId,
          },
        });
        exactLaneCount += 1;
        if (warehouse.positive_market_subtypes.has(subtype)) positiveLaneCount += 1;
      }
    }
  }

  const unique = (values, label) => {
    if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`);
  };
  unique(rows.card_prints.map((row) => row.id), "card_print id");
  unique(rows.card_prints.map((row) => row.gv_id), "parent gv_id");
  unique(rows.card_print_identity.map((row) => row.identity_key_hash), "identity hash");
  unique(rows.card_printings.map((row) => row.id), "printing id");
  unique(rows.card_printings.map((row) => row.printing_gv_id), "printing gv_id");
  unique(rows.external_mappings.map((row) => `${row.source}:${row.external_id}`), "parent mapping");
  unique(
    rows.external_printing_mappings.map((row) => `${row.source}:${row.external_id}`),
    "printing mapping",
  );

  const payloadCore = {
    plan_version: planVersion,
    repository,
    staging_migration_sha256: stagingMigrationSha256,
    foundation_migration_sha256: foundationMigrationSha256,
    source_bulk_sha256: sourceBulkSha256,
    selected_set: set,
    rows,
    counts: {
      sets: rows.sets.length,
      card_prints: rows.card_prints.length,
      card_print_identity: rows.card_print_identity.length,
      card_printings: rows.card_printings.length,
      external_mappings: rows.external_mappings.length,
      external_printing_mappings: rows.external_printing_mappings.length,
      exact_market_lanes: exactLaneCount,
      positive_market_lanes: positiveLaneCount,
      quarantined_collision_lanes: collisionLaneCount,
    },
    boundaries: {
      apply_target: "service_only_mtg_import_staging",
      database_writes: false,
      storage_writes: false,
      image_pointer_updates: false,
      price_publication: false,
      app_visibility: false,
      pokemon_mutation: false,
    },
  };
  return {
    ...payloadCore,
    writer_payload_fingerprint: sha256(JSON.stringify(payloadCore)),
  };
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function report(plan) {
  return `# MTG Canonical Catalog One-Set Canary Plan

- Plan: \`${plan.plan_version}\`
- Producing commit: \`${plan.repository.commit_sha}\`
- Branch: \`${plan.repository.branch}\`
- Set: **${plan.selected_set.name}** (\`${plan.selected_set.code}\`)
- Writer payload fingerprint: \`${plan.writer_payload_fingerprint}\`
- Staging migration SHA-256: \`${plan.staging_migration_sha256}\`
- Foundation migration SHA-256: \`${plan.foundation_migration_sha256}\`
- Database writes performed: \`0\`

## Rows

| Table | Planned rows |
|---|---:|
${Object.entries(plan.counts)
  .map(([key, value]) => `| ${key} | ${value} |`)
  .join("\n")}

## Boundaries

This is an artifacts-only plan. Its first durable target is the service-only MTG import staging layer. It does not apply either migration, write canonical rows, upload images, update image pointers, publish prices, expose MTG in clients, or mutate Pokemon data.
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(),
    branch: execFileSync("git", ["branch", "--show-current"], { cwd: ROOT, encoding: "utf8" }).trim(),
  };
  const [
    warehouseProducts,
    reconciliation,
    bulkSha,
    stagingMigrationSha,
    foundationMigrationSha,
  ] = await Promise.all([
    loadWarehouseProducts(args.warehouseProducts),
    fs.readFile(args.reconciliationSummary, "utf8").then(JSON.parse),
    fs.readFile(args.bulkFile).then(sha256),
    fs
      .readFile(
        path.join(ROOT, "supabase", "migrations", "20260813185000_mtg_canonical_import_staging_v1.sql"),
      )
      .then(sha256),
    fs
      .readFile(
        path.join(ROOT, "supabase", "migrations", "20260813190000_mtg_canonical_catalog_foundation_v1.sql"),
      )
      .then(sha256),
  ]);
  const candidates = await loadSetCandidates(args.bulkFile, args.setCode);
  const collisionSourceRows = new Set(
    reconciliation.reconciliation.collision_samples.map(
      (row) => row.source_price_row_identity,
    ),
  );
  const plan = buildMtgCanaryPayloadV1({
    candidates,
    warehouseProducts,
    collisionSourceRows,
    sourceBulkSha256: bulkSha,
    stagingMigrationSha256: stagingMigrationSha,
    foundationMigrationSha256: foundationMigrationSha,
    repository,
  });
  if (plan.counts.quarantined_collision_lanes !== 0) {
    throw new Error("Selected canary set contains a globally quarantined pricing lane");
  }
  const outDir =
    args.outDir ??
    path.join(ROOT, "docs", "audits", "pricing", "mtg_canonical_catalog_canary_plan_v1", args.setCode);
  await fs.mkdir(outDir, { recursive: true });
  const payloadBody = await writeJson(path.join(outDir, "writer_payload.json"), plan);
  const reportBody = report(plan);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: {
      "writer_payload.json": sha256(payloadBody),
      "REPORT.md": sha256(reportBody),
    },
  });
  process.stdout.write(`${JSON.stringify({ out_dir: outDir, ...plan.counts, writer_payload_fingerprint: plan.writer_payload_fingerprint }, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
