import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

import {
  buildSetPublicationGateV1,
  CROSS_TCG_SET_PUBLICATION_GATE_VERSION,
  CROSS_TCG_SET_PUBLICATION_GAME_POLICIES,
} from "../../backend/catalog/cross_tcg_set_publication_gate_v1.mjs";

const { Client } = pg;
const PAGE_TIMEOUT_MS = 120_000;
const IMAGE_TIMEOUT_MS = 20_000;
const IMAGE_PROBE_CONCURRENCY = 20;

function parseArgs(argv) {
  const options = {
    outDir: null,
    expectedHeadSha: process.env.GITHUB_SHA ?? null,
    fixture: null,
    games: null,
    skipImageProbes: false,
  };
  for (const token of argv) {
    if (token.startsWith("--out-dir=")) options.outDir = path.resolve(token.slice(10));
    else if (token.startsWith("--expected-head-sha=")) options.expectedHeadSha = token.slice(20);
    else if (token.startsWith("--fixture=")) options.fixture = path.resolve(token.slice(10));
    else if (token.startsWith("--games=")) {
      options.games = token.slice(8).split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
    } else if (token === "--skip-image-probes") options.skipImageProbes = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!options.outDir) throw new Error("--out-dir is required");
  if (options.expectedHeadSha && !/^[0-9a-f]{40}$/.test(options.expectedHeadSha)) {
    throw new Error("--expected-head-sha must be a full commit SHA");
  }
  if (options.games?.some((game) => !CROSS_TCG_SET_PUBLICATION_GAME_POLICIES[game])) {
    throw new Error("--games includes a game without a publication policy");
  }
  return options;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function gitValue(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body);
}

async function readFixture(file) {
  const value = JSON.parse(await fs.readFile(file, "utf8"));
  return Array.isArray(value) ? value : value.rows;
}

async function loadReleasedSetsReadOnly(options) {
  if (process.env.CATALOG_AUTOMATION_MODE !== "shadow-only") {
    throw new Error("CATALOG_AUTOMATION_MODE=shadow-only is required");
  }
  if (!process.env.SUPABASE_DB_URL) throw new Error("SUPABASE_DB_URL is required");
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    options: "-c default_transaction_read_only=on",
  });
  await client.connect();
  try {
    await client.query("begin transaction read only");
    await client.query(`set local statement_timeout = '${PAGE_TIMEOUT_MS}ms'`);
    const params = [];
    const gameFilter = options.games?.length > 0
      ? `and lower(target_set.game) = any($${params.push(options.games)}::text[])`
      : "";
    const result = await client.query(`
      with released_sets as (
        select
          target_set.id,
          lower(target_set.game) as game,
          target_set.code,
          target_set.name,
          target_set.hero_image_url,
          target_set.hero_image_source,
          target_set.set_role,
          coalesce(
            target_set.source -> 'scryfall' ->> 'set_type',
            target_set.set_role
          ) as catalog_set_type,
          coalesce(set_control.release_status, game_control.release_status) as effective_release_status
        from public.sets target_set
        join public.catalog_game_release_controls game_control
          on lower(game_control.game_code) = lower(target_set.game)
         and game_control.release_status in ('signed_in', 'public')
        left join public.catalog_set_release_controls set_control
          on set_control.set_id = target_set.id
        where coalesce(set_control.release_status, game_control.release_status)
          in ('signed_in', 'public')
          ${gameFilter}
      )
      select
        released_sets.*,
        count(card_prints.id)::int as card_count
      from released_sets
      left join public.card_prints
        on card_prints.set_id = released_sets.id
       and card_prints.gv_id is not null
      group by
        released_sets.id,
        released_sets.game,
        released_sets.code,
        released_sets.name,
        released_sets.hero_image_url,
        released_sets.hero_image_source,
        released_sets.set_role,
        released_sets.catalog_set_type,
        released_sets.effective_release_status
      order by released_sets.game, released_sets.code, released_sets.id
    `, params);
    await client.query("rollback");
    return result.rows;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // The original read failure remains authoritative.
    }
    throw error;
  } finally {
    await client.end();
  }
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return output;
}

async function probeImage(url) {
  if (!url) return { status: "missing", http_status: null, content_type: null, error: null };
  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
      headers: { accept: "image/*", "user-agent": "GrookaiSetPublicationGate/1.0" },
    });
    let contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? null;
    if (response.status === 405 || (response.ok && !contentType)) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
        headers: {
          accept: "image/*",
          range: "bytes=0-0",
          "user-agent": "GrookaiSetPublicationGate/1.0",
        },
      });
      contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? null;
      await response.body?.cancel();
    }
    return {
      status: response.ok && contentType?.startsWith("image/") ? "ok" : "failed",
      http_status: response.status,
      content_type: contentType,
      final_url: response.url,
      error: null,
    };
  } catch (error) {
    return {
      status: "failed",
      http_status: null,
      content_type: null,
      final_url: null,
      error: error.message,
    };
  }
}

function renderReport(runPlan, result) {
  const lines = [
    "# Cross-TCG Set Publication Gate V1",
    "",
    `- Status: \`${result.status}\``,
    `- Frozen commit: \`${runPlan.commit_sha}\``,
    `- Released sets evaluated: \`${result.counts.selected_set_count}\``,
    `- Blocked: \`${result.counts.blocked_set_count}\``,
    `- Package-art coverage gaps: \`${result.counts.eligible_with_coverage_gap_count}\``,
    `- Exact package covers: \`${result.counts.exact_package_count}\``,
    `- Exact set art: \`${result.counts.exact_set_art_count}\``,
    `- Representative covers: \`${result.counts.representative_card_count}\``,
    "",
    "## By Game",
    "",
    "| Game | Sets | Blocked | Package gaps | Exact package | Exact set | Representative |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const [game, counts] of Object.entries(result.by_game)) {
    lines.push(`| ${game} | ${counts.selected} | ${counts.blocked} | ${counts.coverage_gaps} | ${counts.exact_package} | ${counts.exact_set_art} | ${counts.representative_card} |`);
  }
  const blocked = result.rows.filter((row) => row.decision === "blocked");
  if (blocked.length > 0) {
    lines.push("", "## Blockers", "");
    for (const row of blocked) {
      lines.push(`- \`${row.game}:${row.set_code}\` ${row.set_name}: ${row.issues.filter((entry) => entry.severity === "blocker").map((entry) => entry.code).join(", ")}`);
    }
  }
  lines.push(
    "",
    "## Boundaries",
    "",
    "This gate is read-only. It performs no database, Storage, pointer, pricing, publication, or Vault writes.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const actualHeadSha = gitValue("rev-parse", "HEAD");
  if (options.expectedHeadSha && actualHeadSha !== options.expectedHeadSha) {
    throw new Error("Publication gate HEAD does not match the frozen SHA");
  }
  if (!options.fixture && gitValue("status", "--porcelain", "--untracked-files=no")) {
    throw new Error("Publication gate requires a clean tracked working tree");
  }
  await fs.mkdir(options.outDir, { recursive: true });

  const rows = options.fixture
    ? await readFixture(options.fixture)
    : await loadReleasedSetsReadOnly(options);
  const allowedStorageOrigin = process.env.SUPABASE_URL;
  if (!allowedStorageOrigin) throw new Error("SUPABASE_URL is required to prove media authority");
  const withProbes = options.skipImageProbes
    ? rows
    : await mapLimit(rows, IMAGE_PROBE_CONCURRENCY, async (row) => ({
        ...row,
        image_probe: await probeImage(row.hero_image_url),
      }));
  const runPlan = {
    version: CROSS_TCG_SET_PUBLICATION_GATE_VERSION,
    commit_sha: actualHeadSha,
    branch: gitValue("branch", "--show-current") || null,
    mode: options.fixture ? "fixture" : "production_read_only",
    games: options.games ?? "released_game_controls",
    selected_set_ids: withProbes.map((row) => row.id),
    selected_set_count: withProbes.length,
    image_probes_required: !options.skipImageProbes,
    allowed_storage_origin: new URL(allowedStorageOrigin).origin,
    boundaries: {
      database_transaction: options.fixture ? "none" : "read_only",
      database_writes: false,
      storage_writes: false,
      image_pointer_writes: false,
      publication_writes: false,
      pricing_writes: false,
      vault_writes: false,
    },
  };
  const runPlanBody = await writeJson(path.join(options.outDir, "run_plan.json"), runPlan);
  const result = buildSetPublicationGateV1(withProbes, {
    allowedStorageOrigins: [allowedStorageOrigin],
    requireImageProbe: !options.skipImageProbes,
  });
  const rowsBody = await writeJson(path.join(options.outDir, "set_results.json"), result.rows);
  const summary = {
    version: result.version,
    status: result.status,
    counts: result.counts,
    by_game: result.by_game,
    reconciliation: {
      selected_set_count: runPlan.selected_set_count,
      result_set_count: result.rows.length,
      unique_selected_set_id_count: new Set(runPlan.selected_set_ids).size,
      mismatch_count: runPlan.selected_set_count === result.rows.length &&
        runPlan.selected_set_count === new Set(runPlan.selected_set_ids).size ? 0 : 1,
    },
    boundaries: result.boundaries,
  };
  if (summary.reconciliation.mismatch_count > 0) {
    summary.status = "blocked";
  }
  const summaryBody = await writeJson(path.join(options.outDir, "summary.json"), summary);
  const reportBody = Buffer.from(renderReport(runPlan, { ...result, status: summary.status }));
  await fs.writeFile(path.join(options.outDir, "CROSS_TCG_SET_PUBLICATION_GATE_REPORT.md"), reportBody);
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
    algorithm: "sha256",
    artifacts: [
      ["run_plan.json", runPlanBody],
      ["set_results.json", rowsBody],
      ["summary.json", summaryBody],
      ["CROSS_TCG_SET_PUBLICATION_GATE_REPORT.md", reportBody],
    ].map(([artifactPath, body]) => ({
      path: artifactPath,
      bytes: body.length,
      sha256: sha256(body),
    })),
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (summary.status !== "passed") process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
