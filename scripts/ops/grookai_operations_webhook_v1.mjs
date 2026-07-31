import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import "../../backend/env.mjs";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const NOTIFIER_VERSION = "GROOKAI_OPERATIONS_WEBHOOK_V1";

function parseArgs(argv) {
  const unit =
    argv.find((arg) => arg.startsWith("--unit="))?.slice("--unit=".length) ||
    "unknown.service";
  const event =
    argv.find((arg) => arg.startsWith("--event="))?.slice("--event=".length) ||
    "systemd_on_failure";
  const stateDir = path.resolve(
    argv
      .find((arg) => arg.startsWith("--state-dir="))
      ?.slice("--state-dir=".length) ||
      process.env.GROOKAI_OPERATIONS_NOTIFICATION_STATE_DIR ||
      path.join(
        REPO_ROOT,
        "artifacts",
        "operations_notifications",
      ),
  );
  return {
    unit,
    event,
    stateDir,
    dryRun: argv.includes("--dry-run"),
  };
}

function safeSegment(value) {
  return String(value).replace(/[^a-zA-Z0-9_.-]+/g, "_");
}

async function commandOrNull(command, args) {
  try {
    const result = await execFileAsync(command, args, {
      cwd: REPO_ROOT,
      timeout: 15_000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    });
    return result.stdout.trim();
  } catch {
    return null;
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const createdAt = new Date().toISOString();
  const stamp = createdAt.replace(/[:.]/g, "-");
  const artifactDir = path.join(
    args.stateDir,
    `${stamp}_${safeSegment(args.unit)}`,
  );
  await fs.mkdir(artifactDir, { recursive: true });

  const [unitState, journal, commitSha] = await Promise.all([
    commandOrNull("systemctl", [
      "show",
      args.unit,
      "--property=Id,LoadState,ActiveState,SubState,Result,ExecMainStatus,NRestarts",
      "--no-pager",
    ]),
    commandOrNull("journalctl", [
      "-u",
      args.unit,
      "-n",
      "80",
      "--no-pager",
      "--output=short-iso",
    ]),
    commandOrNull("git", ["rev-parse", "HEAD"]),
  ]);
  const notificationId = createHash("sha256")
    .update(`${args.event}|${args.unit}|${createdAt}|${os.hostname()}`)
    .digest("hex");
  const payload = {
    notification_version: NOTIFIER_VERSION,
    notification_id: notificationId,
    event: args.event,
    severity: "critical",
    created_at: createdAt,
    host: os.hostname(),
    unit: args.unit,
    commit_sha: commitSha,
    unit_state: unitState,
    journal_tail: journal,
  };
  const payloadPath = path.join(artifactDir, "notification_payload.json");
  await writeJson(payloadPath, payload);

  if (args.dryRun) {
    const receipt = {
      notification_id: notificationId,
      status: "dry_run",
      delivered_at: null,
    };
    await writeJson(path.join(artifactDir, "delivery_receipt.json"), receipt);
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    return;
  }

  const webhookUrl = process.env.GROOKAI_OPERATIONS_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error(
      "GROOKAI_OPERATIONS_WEBHOOK_URL is required for live notification",
    );
  }
  const webhookBearerToken =
    process.env.GROOKAI_OPERATIONS_WEBHOOK_BEARER_TOKEN;
  if (!webhookBearerToken) {
    throw new Error(
      "GROOKAI_OPERATIONS_WEBHOOK_BEARER_TOKEN is required for live notification",
    );
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  let receipt;
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${webhookBearerToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    receipt = {
      notification_id: notificationId,
      status: response.ok ? "delivered" : "delivery_failed",
      http_status: response.status,
      delivered_at: new Date().toISOString(),
    };
    await writeJson(path.join(artifactDir, "delivery_receipt.json"), receipt);
    if (!response.ok) {
      throw new Error(`operations webhook returned HTTP ${response.status}`);
    }
  } catch (error) {
    if (!receipt) {
      receipt = {
        notification_id: notificationId,
        status: "delivery_failed",
        http_status: null,
        delivered_at: null,
        failed_at: new Date().toISOString(),
        error: error.message,
      };
      await writeJson(path.join(artifactDir, "delivery_receipt.json"), receipt);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`[operations-webhook] ${error.stack || error.message}`);
  process.exitCode = 1;
});
