import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  CATALOG_PRICING_COMPLETION_POLICY_V1,
  evaluateCatalogPricingCompletionV1,
} from "../../backend/operations/catalog_pricing_completion_v1.mjs";

function value(argv, name) {
  return argv.find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(name.length + 3)
    .trim() ?? "";
}

function parseArgs(argv) {
  const input = value(argv, "control-plane")
    || process.env.GROOKAI_CONTROL_PLANE_REPORT
    || "/var/lib/grookai/production-control-plane/current/live_control_plane_v1.json";
  const outRoot = value(argv, "out-root")
    || process.env.GROOKAI_COMPLETION_OUTPUT_DIR
    || path.resolve("artifacts", "catalog_pricing_completion_v1");
  return {
    input: path.resolve(input),
    outRoot: path.resolve(outRoot),
    requireComplete: argv.includes("--require-complete"),
  };
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function markdown(report) {
  const lines = [
    "# Catalog and Pricing Completion",
    "",
    `- Status: \`${report.status}\``,
    `- Runtime components observed: \`${report.counts.registered_runtime_components}\``,
    `- Completion lanes: \`${report.counts.completion_lanes}\``,
    `- Complete: \`${report.counts.complete}\``,
    `- Incomplete: \`${report.counts.incomplete}\``,
    `- Unmeasured: \`${report.counts.unmeasured}\``,
    "",
    "| Lane | Status | Completion owner | Current backlog |",
    "|---|---|---|---|",
    ...report.lanes.map((lane) => {
      const backlog = lane.backlog
        ? Object.entries(lane.backlog).map(([key, count]) => `${key}=${count}`).join(", ")
        : "unmeasured";
      return `| ${lane.lane_id} | ${lane.status} | ${lane.agent_key} (${lane.agent_state}) | ${backlog} |`;
    }),
    "",
    "A successful runtime job is not catalog completion. Each completion lane remains open until its explicit backlog reaches zero.",
    "",
  ];
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const source = JSON.parse(await fs.readFile(args.input, "utf8"));
  const evaluated = evaluateCatalogPricingCompletionV1(source);
  const report = {
    ...evaluated,
    generated_at: new Date().toISOString(),
    source: {
      report_path: args.input,
      report_sha256: sha256(JSON.stringify(source)),
    },
    boundaries: {
      database_reads: false,
      database_writes: false,
      production_changes: false,
    },
  };
  const runDir = path.join(args.outRoot, stamp());
  await fs.mkdir(runDir, { recursive: true });
  const summary = `${JSON.stringify(report, null, 2)}\n`;
  const reportMarkdown = markdown(report);
  await Promise.all([
    fs.writeFile(path.join(runDir, "summary.json"), summary),
    fs.writeFile(path.join(runDir, "REPORT.md"), reportMarkdown),
    fs.writeFile(path.join(args.outRoot, "latest.json"), summary),
    fs.writeFile(path.join(args.outRoot, "LATEST.md"), reportMarkdown),
  ]);
  process.stdout.write(`${JSON.stringify({
    policy_version: CATALOG_PRICING_COMPLETION_POLICY_V1,
    status: report.status,
    counts: report.counts,
    pricing: report.lanes[0],
    artifact_root: runDir,
  }, null, 2)}\n`);
  if (args.requireComplete && !report.completion_allowed) process.exitCode = 2;
}

main().catch((error) => {
  console.error(`[catalog-pricing-completion] ${error.stack || error.message}`);
  process.exitCode = 1;
});
