import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FLUTTER_SURFACES = new Map([
  ["flutter_card_detail", "price_record"],
  ["flutter_search_or_grid", "price_record"],
  ["flutter_set_grid", "price_record"],
  ["flutter_compare", "price_record"],
  ["flutter_private_vault", "vault_total"],
  ["flutter_public_collector", "vault_group_total"],
  ["flutter_network", "price_record"],
  ["flutter_vault_item", "vault_group_total"],
]);

function parseArgs(argv) {
  const value = (name) =>
    argv
      .find((argument) => argument.startsWith(`--${name}=`))
      ?.slice(name.length + 3)
      .trim() ?? "";
  return {
    surfaceId: value("surface-id"),
    route: value("route"),
    outDir: path.resolve(value("out-dir") || "."),
    device: value("device"),
    match: value("match"),
  };
}

function adb(args, options = {}) {
  return execFileSync("adb", args, {
    encoding: options.binary ? null : "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

function deviceArgs(device) {
  return device ? ["-s", device] : [];
}

function decodeXml(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function parseFlutterPricingProofKeyV1(key) {
  const normalized = key.includes("tcgplayer-market")
    ? key.slice(key.indexOf("tcgplayer-market"))
    : key;
  const parts = normalized.split("|");
  if (parts[0] === "tcgplayer-market-vault-total-v1") {
    return {
      proof_kind: "vault_total",
      card_print_id: null,
      card_printing_id: null,
      rendered: {
        status: "available",
        vault_market_value_usd: Number(parts[1]),
        priced_copy_count: Number(parts[2]),
        unpriced_copy_count: Number(parts[3]),
        currency: "USD",
        source_label: "TCGPlayer Market",
        observed_at: parts[4] || null,
        published_at: parts[5] || null,
      },
    };
  }
  if (parts[0] !== "tcgplayer-market-v1") {
    throw new Error(`Unsupported Flutter pricing proof key: ${key}`);
  }
  const scope = parts[1];
  if (scope === "vault_exact_total") {
    return {
      proof_kind: "vault_group_total",
      card_print_id: parts[2] || null,
      card_printing_id: null,
      rendered: {
        status: "available",
        vault_market_value_usd: Number(parts[5]),
        priced_copy_count: Number(parts[11]),
        unpriced_copy_count: Number(parts[12]),
        currency: "USD",
        source_label: "TCGPlayer Market",
        observed_at: parts[6] || null,
        published_at: parts[7] || null,
      },
    };
  }
  return {
    proof_kind: "price_record",
    card_print_id: parts[2] || null,
    card_printing_id: parts[3] || null,
    rendered: {
      status: "available",
      pricing_scope: scope,
      market_close_usd: Number(parts[5]),
      currency: "USD",
      source_label: "TCGPlayer Market",
        observed_at: parts[6] || null,
        published_at: parts[7] || null,
        provenance_id: parts[8] || null,
        source_label: parts[9] || null,
        is_from_price: parts[10] === "from",
      },
    };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const expectedProofKind = FLUTTER_SURFACES.get(args.surfaceId);
  if (!expectedProofKind) {
    throw new Error("--surface-id must identify a supported Flutter surface");
  }
  if (!args.route) {
    throw new Error("--route is required");
  }

  const prefix = deviceArgs(args.device);
  const remoteDump = "/sdcard/grookai_pricing_surface.xml";
  adb([...prefix, "shell", "uiautomator", "dump", remoteDump]);
  const xmlBuffer = adb([...prefix, "exec-out", "cat", remoteDump], {
    binary: true,
  });
  const xml = xmlBuffer.toString("utf8");
  const resourceIds = [
    ...xml.matchAll(/\bresource-id="([^"]*tcgplayer-market[^"]*)"/g),
  ].map((match) => decodeXml(match[1]));
  const filtered = args.match
    ? resourceIds.filter((resourceId) => resourceId.includes(args.match))
    : resourceIds;
  const uniqueMatches = [...new Set(filtered)];
  if (uniqueMatches.length !== 1) {
    throw new Error(
      `Expected exactly one Flutter pricing proof node, found ${uniqueMatches.length}. Use --match to select one.`,
    );
  }

  const parsed = parseFlutterPricingProofKeyV1(uniqueMatches[0]);
  if (parsed.proof_kind !== expectedProofKind) {
    throw new Error(
      `Surface expects ${expectedProofKind}, captured ${parsed.proof_kind}`,
    );
  }

  const capturedAt = new Date().toISOString();
  const captureId = `${args.surfaceId}_${capturedAt.replace(/[:.]/g, "-")}`;
  await fs.mkdir(args.outDir, { recursive: true });
  const screenshot = adb([...prefix, "exec-out", "screencap", "-p"], {
    binary: true,
  });
  const screenshotPath = path.join(args.outDir, `${captureId}.png`);
  const dumpPath = path.join(args.outDir, `${captureId}.uiautomator.xml`);
  const evidencePath = path.join(args.outDir, `${captureId}.render.json`);
  await fs.writeFile(screenshotPath, screenshot);
  await fs.writeFile(dumpPath, xmlBuffer);

  const evidence = {
    schema_version: "TCGPLAYER_MARKET_PRODUCT_SURFACE_RENDER_EVIDENCE_V1",
    capture_id: captureId,
    surface_id: args.surfaceId,
    client: "flutter",
    proof_kind: parsed.proof_kind,
    authenticated: true,
    route: args.route,
    captured_at: capturedAt,
    card_print_id: parsed.card_print_id,
    card_printing_id: parsed.card_printing_id,
    rendered: parsed.rendered,
    ui_automator_dump_sha256: sha256(xmlBuffer),
    semantics_identifier: uniqueMatches[0],
  };
  await fs.writeFile(
    evidencePath,
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  console.log(
    JSON.stringify(
      {
        capture_id: captureId,
        screenshot_path: screenshotPath,
        render_evidence_path: evidencePath,
        ui_automator_dump_path: dumpPath,
      },
      null,
      2,
    ),
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
