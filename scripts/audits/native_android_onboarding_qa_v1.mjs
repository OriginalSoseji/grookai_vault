import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const PACKAGE = "com.grookai.vault";
const ADB = process.env.ADB_PATH || path.join(
  process.env.LOCALAPPDATA || "",
  "Android",
  "Sdk",
  "platform-tools",
  "adb.exe",
);

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function adb(args, options = {}) {
  return execFileSync(ADB, args, {
    encoding: options.encoding === null ? null : "utf8",
    timeout: options.timeout ?? 30_000,
    windowsHide: true,
  });
}

function serviceKey() {
  return process.env.SUPABASE_SECRET_KEY || "";
}

function supabaseUrl() {
  return String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
}

async function adminRequest(relativePath, options = {}) {
  return fetch(`${supabaseUrl()}${relativePath}`, {
    ...options,
    headers: {
      apikey: serviceKey(),
      Authorization: `Bearer ${serviceKey()}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
}

async function createTemporaryAccount() {
  const token = randomBytes(10).toString("hex");
  const account = {
    email: `native-qa-${token}@grookaivault.invalid`,
    password: `${randomBytes(16).toString("hex")}Aa1`,
  };
  const response = await adminRequest("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { display_name: "Native Release QA" },
    }),
  });
  if (!response.ok) throw new Error(`temporary account create failed: HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload.id) throw new Error("temporary account response omitted id");
  return { ...account, id: payload.id };
}

async function deleteTemporaryAccount(account) {
  if (!account?.id) return false;
  const response = await adminRequest(`/auth/v1/admin/users/${account.id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`temporary account delete failed: HTTP ${response.status}`);
  const verify = await adminRequest(`/auth/v1/admin/users/${account.id}`);
  return verify.status === 404;
}

function decodeXml(value) {
  return value
    .replaceAll("&#10;", "\n")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function nodes(xml) {
  return [...xml.matchAll(/<node\b[^>]*>/g)].map(([node]) => {
    const attributes = {};
    for (const match of node.matchAll(/([\w-]+)="([^"]*)"/g)) {
      attributes[match[1]] = decodeXml(match[2]);
    }
    return attributes;
  });
}

function sanitizeUiXml(xml) {
  return xml
    .replace(/([\w.+-]+)@([\w.-]+)/g, "[redacted-email]")
    .replace(/text="[^"]*"(?= resource-id="" class="android\.widget\.EditText")/g, 'text="[redacted]"');
}

function center(bounds) {
  const match = String(bounds).match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) throw new Error(`invalid bounds: ${bounds}`);
  return [Math.round((Number(match[1]) + Number(match[3])) / 2), Math.round((Number(match[2]) + Number(match[4])) / 2)];
}

async function dumpUi(runDir, name, { preserve = true } = {}) {
  const remote = `/sdcard/${name}.xml`;
  adb(["shell", "uiautomator", "dump", remote]);
  const target = preserve
    ? path.join(runDir, `${name}.xml`)
    : path.join(os.tmpdir(), `${name}-${randomBytes(6).toString("hex")}.xml`);
  adb(["pull", remote, target]);
  const xml = await fs.readFile(target, "utf8");
  if (!preserve) await fs.rm(target, { force: true });
  adb(["shell", "rm", remote]);
  return xml;
}

function tapNode(xml, predicate, label) {
  const node = nodes(xml).find(predicate);
  if (!node?.bounds) throw new Error(`UI node not found: ${label}`);
  const [x, y] = center(node.bounds);
  adb(["shell", "input", "tap", String(x), String(y)]);
}

async function waitFor(runDir, expected, timeoutMs = 30_000) {
  const started = Date.now();
  let xml = "";
  while (Date.now() - started < timeoutMs) {
    await sleep(1500);
    xml = await dumpUi(runDir, "onboarding_current", { preserve: false });
    const permissionDismiss = nodes(xml).find((node) =>
      node.clickable === "true" && /^(Don.t allow|Not now)$/i.test(node.text || node["content-desc"] || ""),
    );
    if (permissionDismiss?.bounds) {
      const [x, y] = center(permissionDismiss.bounds);
      adb(["shell", "input", "tap", String(x), String(y)]);
      continue;
    }
    if (xml.includes("Invalid login credentials")) {
      throw new Error("native email authentication was rejected");
    }
    if (xml.includes(expected)) {
      await fs.writeFile(path.join(runDir, "onboarding_first_step.xml"), xml);
      return xml;
    }
  }
  await fs.writeFile(
    path.join(runDir, "onboarding_timeout_state.xml"),
    sanitizeUiXml(xml),
  );
  throw new Error(`timed out waiting for ${expected}`);
}

async function main() {
  if (!supabaseUrl() || !serviceKey()) throw new Error("Supabase admin environment is required");
  await fs.access(ADB);
  const devices = adb(["devices"]);
  if (!/emulator-\d+\s+device/.test(devices)) throw new Error("a running Android emulator is required");
  const runDir = path.join(ROOT, "artifacts", "release", "native_android_onboarding_qa_v1", stamp());
  await fs.mkdir(runDir, { recursive: true });
  const account = await createTemporaryAccount();
  let accountDeleted = false;
  let status = "failed";
  let failure = null;
  try {
    adb(["shell", "settings", "put", "system", "screen_off_timeout", "2147483647"]);
    adb(["shell", "svc", "power", "stayon", "true"]);
    adb(["shell", "pm", "clear", PACKAGE]);
    adb(["shell", "monkey", "-p", PACKAGE, "-c", "android.intent.category.LAUNCHER", "1"]);
    await sleep(5000);
    let xml = await dumpUi(runDir, "login_initial");
    tapNode(xml, (node) => node["content-desc"] === "Sign in with email" && node.clickable === "true", "Sign in with email");
    await sleep(1000);
    xml = await dumpUi(runDir, "login_form");
    tapNode(xml, (node) => node.hint === "Email", "Email field");
    const [emailLocal, emailDomain] = account.email.split("@");
    adb(["shell", "input", "text", emailLocal]);
    adb(["shell", "input", "keyevent", "77"]);
    adb(["shell", "input", "text", emailDomain]);
    await sleep(500);
    xml = await dumpUi(runDir, "login_after_email", { preserve: false });
    tapNode(xml, (node) => node.hint === "Password", "Password field");
    await sleep(500);
    xml = await dumpUi(runDir, "login_password_focus", { preserve: false });
    const passwordFocused = nodes(xml).some(
      (node) => node.hint === "Password" && node.focused === "true",
    );
    if (!passwordFocused) {
      tapNode(xml, (node) => node.hint === "Password", "focused Password field");
      await sleep(300);
    }
    adb(["shell", "input", "text", account.password]);
    adb(["shell", "input", "keyevent", "4"]);
    await sleep(750);
    xml = await dumpUi(runDir, "login_ready", { preserve: false });
    const emailValue = nodes(xml).find((node) => node.hint === "Email")?.text ?? "";
    if (emailValue !== account.email) {
      throw new Error(
        `email field changed during credential entry (expected_length=${account.email.length}, actual_length=${emailValue.length}, password_appended=${emailValue.endsWith(account.password)})`,
      );
    }
    tapNode(xml, (node) => node["content-desc"] === "Sign in" && node.clickable === "true", "Sign in");
    const onboarding = await waitFor(runDir, "Claim your collector link", 45_000);
    const requiredCopy = [
      "Claim your collector link",
      "Your profile is public by default",
      "Create public profile",
      "You can turn public profile or Vault sharing off later in Account",
    ];
    const missingCopy = requiredCopy.filter((text) => !onboarding.includes(text));
    adb(["exec-out", "screencap", "-p"], { encoding: null });
    const screenshot = adb(["exec-out", "screencap", "-p"], { encoding: null });
    await fs.writeFile(path.join(runDir, "onboarding_first_step.png"), screenshot);
    if (missingCopy.length) throw new Error(`missing onboarding copy: ${missingCopy.join(", ")}`);
    status = "passed";
  } catch (error) {
    failure = String(error.message || error);
  } finally {
    adb(["shell", "am", "force-stop", PACKAGE]);
    adb(["shell", "pm", "clear", PACKAGE]);
    accountDeleted = await deleteTemporaryAccount(account).catch(() => false);
  }

  const summary = {
    audit_version: "NATIVE_ANDROID_ONBOARDING_QA_V1",
    status: status === "passed" && accountDeleted ? "passed" : "failed",
    emulator_detected: true,
    package: PACKAGE,
    first_step_visible: status === "passed",
    required_copy_verified: status === "passed",
    temporary_auth_account_deleted: accountDeleted,
    customer_records_touched: 0,
    persistent_app_data_writes: 0,
    failure,
  };
  await fs.writeFile(path.join(runDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ...summary, artifact_root: path.relative(ROOT, runDir).replace(/\\/g, "/") }, null, 2)}\n`);
  if (summary.status !== "passed") process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[native-android-onboarding-qa] ${error.stack || error.message}`);
  process.exitCode = 1;
});
