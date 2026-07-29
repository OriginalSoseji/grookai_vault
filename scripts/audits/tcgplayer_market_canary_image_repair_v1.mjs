import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import sharp from "../../backend/node_modules/sharp/lib/index.js";

import "../../backend/env.mjs";

const { Client } = pg;
const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const REPAIR_VERSION = "TCGPLAYER_MARKET_CANARY_IMAGE_REPAIR_V1";
const CARD_PRINT_ID = "c267755e-9f4a-4ed5-a6aa-190dd42ae977";
const GV_ID = "GV-PK-CEL-15CC-HERE-COMES-TEAM-ROCKET";
const SOURCE_PRODUCT_ID = 250323;
const SOURCE_IMAGE_URL =
  "https://tcgplayer-cdn.tcgplayer.com/product/250323_in_1000x1000.jpg";
const WRONG_IMAGE_URL = "https://images.pokemontcg.io/cel25c/15_A.png";
const WRONG_IMAGE_PATH =
  "warehouse-derived/self-hosted-images-v1/card_prints/cel25c/gv-pk-cel-15cc-here-comes-team-rocket/484f5a0f6ac9d70b585b7b15.png";
const STORAGE_BUCKET = "user-card-images";
const IMAGE_SOURCE = "identity";
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
  "image_repairs",
);

function parseArgs(argv) {
  const outRoot = argv
    .find((arg) => arg.startsWith("--out-root="))
    ?.slice("--out-root=".length)
    .trim();
  return {
    apply: argv.includes("--apply"),
    outRoot: path.resolve(outRoot || DEFAULT_OUT_ROOT),
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

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        rejectUnauthorized: false,
        headers: { "user-agent": "Grookai-Market-Canary-Image-Repair/1.0" },
        timeout: 20_000,
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`source image HTTP ${response.statusCode}`));
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

async function git(args) {
  return (
    await execFileAsync("git", args, {
      cwd: REPO_ROOT,
      timeout: 15_000,
      windowsHide: true,
    })
  ).stdout.trim();
}

async function currentCard(client) {
  const result = await client.query(
    `select
       card.id,
       card.gv_id,
       card.name,
       card.number,
       card.image_url,
       card.image_path,
       card.image_source,
       card.image_hash,
       card.image_note,
       mapping.id as source_mapping_id,
       mapping.card_print_id as source_mapping_card_print_id,
       product.name as source_product_name,
       product.image_url as source_product_image_url,
       (select count(*)::integer from public.market_price_current_publication)
         as current_publication_refs
     from public.card_prints card
     join public.external_mappings mapping
       on mapping.source = 'tcgplayer'
      and mapping.external_id = $2
      and mapping.active = true
     join public.tcgcsv_source_products product
       on product.product_id = $3
     where card.id = $1`,
    [CARD_PRINT_ID, String(SOURCE_PRODUCT_ID), SOURCE_PRODUCT_ID],
  );
  if (result.rowCount !== 1) {
    throw new Error(`expected one guarded card row, found ${result.rowCount}`);
  }
  return result.rows[0];
}

function assertPreconditions(row) {
  const failures = [];
  if (row.gv_id !== GV_ID) failures.push("gv_id");
  if (row.name !== "Here Comes Team Rocket!") failures.push("name");
  if (row.number !== "15") failures.push("number");
  if (row.image_url !== WRONG_IMAGE_URL) failures.push("wrong_image_url");
  if (row.image_path !== WRONG_IMAGE_PATH) failures.push("wrong_image_path");
  if (row.source_mapping_card_print_id !== CARD_PRINT_ID) {
    failures.push("source_mapping_card_print_id");
  }
  if (row.source_product_name !== "Here Comes Team Rocket!") {
    failures.push("source_product_name");
  }
  if (Number(row.current_publication_refs) !== 0) {
    failures.push("current_publication_refs");
  }
  if (failures.length) {
    throw new Error(`image repair preconditions failed: ${failures.join(",")}`);
  }
}

async function uploadNewObject(buffer, storagePath) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase URL and service key are required for apply");
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "image/jpeg",
      upsert: false,
      cacheControl: "31536000",
    });
  if (!error) return "uploaded";
  if (!/already exists|duplicate/i.test(error.message)) {
    throw new Error(`storage upload failed: ${error.message}`);
  }
  const { data, error: downloadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(storagePath);
  if (downloadError || !data) {
    throw new Error(
      `existing storage object could not be verified: ${downloadError?.message}`,
    );
  }
  const existing = Buffer.from(await data.arrayBuffer());
  if (sha256(existing) !== sha256(buffer)) {
    throw new Error("existing storage object hash does not match repair image");
  }
  return "already_present_hash_verified";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [commitSha, branch, trackedChanges, imageBuffer] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["branch", "--show-current"]),
    git(["status", "--porcelain", "--untracked-files=no"]),
    fetchBuffer(SOURCE_IMAGE_URL),
  ]);
  if (args.apply && trackedChanges) {
    throw new Error("apply requires a clean tracked working tree");
  }
  const metadata = await sharp(imageBuffer).metadata();
  if (
    metadata.format !== "jpeg" ||
    metadata.width !== 596 ||
    metadata.height !== 835
  ) {
    throw new Error(
      `unexpected source image shape ${metadata.format} ${metadata.width}x${metadata.height}`,
    );
  }
  const imageHash = sha256(imageBuffer);
  const storagePath =
    `warehouse-derived/image-truth-v1/pricing-canary-100-v1/` +
    `${CARD_PRINT_ID}/${imageHash}.jpg`;
  const url = connectionString();
  if (!url) throw new Error("database URL is required");
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    query_timeout: 30_000,
    statement_timeout: 30_000,
  });
  await client.connect();
  let before;
  let after;
  let storageStatus = "not_written";
  try {
    before = await currentCard(client);
    assertPreconditions(before);
    if (args.apply) {
      storageStatus = await uploadNewObject(imageBuffer, storagePath);
      await client.query("begin");
      try {
        const update = await client.query(
          `update public.card_prints
              set image_url = $4,
                  image_path = $5,
                  image_source = $8,
                  image_hash = $6,
                  image_note =
                    'Corrected during TCGPlayer Market canary verification; prior pointer rendered Venusaur instead of Here Comes Team Rocket!.'
            where id = $1
              and gv_id = $2
              and image_url = $3
              and image_path = $7`,
          [
            CARD_PRINT_ID,
            GV_ID,
            WRONG_IMAGE_URL,
            SOURCE_IMAGE_URL,
            storagePath,
            imageHash,
            WRONG_IMAGE_PATH,
            IMAGE_SOURCE,
          ],
        );
        if (update.rowCount !== 1) {
          throw new Error(`guarded update changed ${update.rowCount} rows`);
        }
        after = await currentCard(client);
        if (
          after.image_url !== SOURCE_IMAGE_URL ||
          after.image_path !== storagePath ||
          after.image_hash !== imageHash ||
          after.image_source !== IMAGE_SOURCE ||
          Number(after.current_publication_refs) !== 0
        ) {
          throw new Error("post-update image readback did not reconcile");
        }
        await client.query("commit");
      } catch (error) {
        await client.query("rollback").catch(() => {});
        throw error;
      }
    } else {
      after = {
        ...before,
        image_url: SOURCE_IMAGE_URL,
        image_path: storagePath,
        image_source: IMAGE_SOURCE,
        image_hash: imageHash,
      };
    }
  } finally {
    await client.end();
  }

  const result = {
    repair_version: REPAIR_VERSION,
    mode: args.apply ? "apply" : "dry_run",
    status: args.apply ? "applied" : "planned",
    commit_sha: commitSha,
    branch,
    card_print_id: CARD_PRINT_ID,
    gv_id: GV_ID,
    source_product_id: SOURCE_PRODUCT_ID,
    source_image_url: SOURCE_IMAGE_URL,
    source_image_sha256: imageHash,
    source_image_width: metadata.width,
    source_image_height: metadata.height,
    storage_bucket: STORAGE_BUCKET,
    storage_path: storagePath,
    storage_status: storageStatus,
    before,
    after,
    boundaries: {
      canonical_identity_fields_changed: false,
      canonical_image_pointer_changed: args.apply,
      pricing_mapping_writes: false,
      price_writes: false,
      publication_activation: false,
      vault_writes: false,
    },
  };
  const runDir = path.join(
    args.outRoot,
    `${REPAIR_VERSION}-${args.apply ? "apply" : "dry-run"}-${imageHash.slice(0, 12)}`,
  );
  await fs.mkdir(runDir, { recursive: true });
  const resultJson = `${JSON.stringify(result, null, 2)}\n`;
  const resultPath = path.join(runDir, "result.json");
  await fs.writeFile(resultPath, resultJson);
  await fs.writeFile(
    path.join(runDir, "artifact_hashes.json"),
    `${JSON.stringify(
      { result_json_sha256: sha256(resultJson) },
      null,
      2,
    )}\n`,
  );
  process.stdout.write(`${resultJson}`);
}

main().catch((error) => {
  console.error(
    `[tcgplayer-market-canary-image-repair] ${error.stack || error.message}`,
  );
  process.exitCode = 1;
});
