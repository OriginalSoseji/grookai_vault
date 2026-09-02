import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { assertEmulatorVideoScenarioV1 } from "./emulator_video_policy_v1.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_SCENARIO = path.join(__dirname, "scenarios", "signed_out_charizard_search_v1.json");
const ADB = process.env.ADB_PATH || path.join(
  process.env.LOCALAPPDATA || "",
  "Android",
  "Sdk",
  "platform-tools",
  process.platform === "win32" ? "adb.exe" : "adb",
);

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function adb(args, { device, encoding = "utf8", timeout = 30_000, ignoreFailure = false } = {}) {
  try {
    return execFileSync(ADB, device ? ["-s", device, ...args] : args, {
      encoding,
      timeout,
      windowsHide: true,
      stdio: encoding === null ? ["ignore", "pipe", "pipe"] : undefined,
    });
  } catch (error) {
    if (ignoreFailure) return encoding === null ? Buffer.alloc(0) : "";
    throw error;
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const values = {};
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function xmlDecode(value) {
  return String(value ?? "")
    .replaceAll("&#10;", "\n")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function parseAttributes(node) {
  return Object.fromEntries(
    [...node.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1], xmlDecode(match[2])]),
  );
}

function findNode(xml, selector) {
  const nodes = [...xml.matchAll(/<node\s+[^>]*>/g)].map((match) => parseAttributes(match[0]));
  const field = selector.field || "content-desc";
  const expected = String(selector.value ?? "");
  return nodes.find((node) => {
    if (selector.class && node.class !== selector.class) return false;
    const actual = String(node[field] ?? "");
    return selector.match === "contains" ? actual.includes(expected) : actual === expected;
  }) ?? null;
}

function centerFromBounds(bounds) {
  const match = String(bounds ?? "").match(/^\[(\d+),(\d+)]\[(\d+),(\d+)]$/);
  if (!match) throw new Error(`invalid node bounds: ${bounds}`);
  return {
    x: Math.round((Number(match[1]) + Number(match[3])) / 2),
    y: Math.round((Number(match[2]) + Number(match[4])) / 2),
  };
}

async function dumpUi({ device, runDir, label }) {
  const remote = "/sdcard/grookai_social_video_ui.xml";
  adb(["shell", "uiautomator", "dump", remote], { device, timeout: 15_000 });
  const xml = adb(["exec-out", "cat", remote], { device });
  await fs.writeFile(path.join(runDir, `${label}.xml`), xml);
  return xml;
}

async function waitForSelector({ device, runDir, selector, timeoutMs = 20_000, label }) {
  const deadline = Date.now() + timeoutMs;
  let lastXml = "";
  while (Date.now() < deadline) {
    lastXml = await dumpUi({ device, runDir, label });
    const node = findNode(lastXml, selector);
    if (node) return node;
    await sleep(750);
  }
  throw new Error(`selector not found within ${timeoutMs}ms: ${JSON.stringify(selector)}`);
}

async function runStep(step, context, index, phase) {
  const startedAt = new Date().toISOString();
  const label = `${phase}_${String(index + 1).padStart(2, "0")}_${step.action}`;
  switch (step.action) {
    case "clear_app":
      adb(["shell", "pm", "clear", context.scenario.app_package], { device: context.device });
      break;
    case "launch":
      adb([
        "shell", "monkey", "-p", context.scenario.app_package,
        "-c", "android.intent.category.LAUNCHER", "1",
      ], { device: context.device });
      break;
    case "sleep":
      await sleep(Number(step.milliseconds ?? 500));
      break;
    case "wait_for":
      await waitForSelector({
        ...context,
        selector: step.selector,
        timeoutMs: Number(step.timeout_ms ?? 20_000),
        label,
      });
      break;
    case "tap": {
      const node = await waitForSelector({
        ...context,
        selector: step.selector,
        timeoutMs: Number(step.timeout_ms ?? 20_000),
        label,
      });
      const point = centerFromBounds(node.bounds);
      adb(["shell", "input", "tap", String(point.x), String(point.y)], { device: context.device });
      break;
    }
    case "input_text":
      adb(["shell", "input", "text", String(step.value).replaceAll(" ", "%s")], { device: context.device });
      break;
    case "keyevent":
      adb(["shell", "input", "keyevent", String(step.code)], { device: context.device });
      break;
    case "swipe":
      adb([
        "shell", "input", "swipe",
        String(step.x1), String(step.y1), String(step.x2), String(step.y2),
        String(step.duration_ms ?? 500),
      ], { device: context.device });
      break;
    default:
      throw new Error(`unsupported action reached runtime: ${step.action}`);
  }
  return { index, phase, action: step.action, started_at: startedAt, completed_at: new Date().toISOString() };
}

function startRecorder({ device, remoteVideo, scenario }) {
  const args = [
    ...(device ? ["-s", device] : []),
    "shell", "screenrecord",
    "--bit-rate", String(scenario.recording.bit_rate_bps ?? 8_000_000),
    "--time-limit", String(scenario.recording.max_duration_seconds),
    remoteVideo,
  ];
  return spawn(ADB, args, { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
}

async function stopRecorder({ device, child }) {
  const pids = String(adb(["shell", "pidof", "screenrecord"], { device, ignoreFailure: true }))
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  for (const pid of pids) {
    adb(["shell", "kill", "-2", pid], { device, ignoreFailure: true });
  }
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    sleep(5_000),
  ]);
  if (child.exitCode === null) child.kill();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scenarioPath = path.resolve(ROOT, args.scenario || path.relative(ROOT, DEFAULT_SCENARIO));
  const scenarioRaw = await fs.readFile(scenarioPath, "utf8");
  const scenario = JSON.parse(scenarioRaw);
  const policy = assertEmulatorVideoScenarioV1(scenario);
  const devices = adb(["devices"]).split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts[1] === "device")
    .map((parts) => parts[0]);
  const device = args.device || devices[0];
  if (!device || !devices.includes(device)) throw new Error("no requested Android device is available");

  const runDir = path.join(
    ROOT,
    "artifacts",
    "social_media",
    "emulator_video_agent_v1",
    `${stamp()}_${scenario.scenario_id}`,
  );
  await fs.mkdir(runDir, { recursive: true });
  const remoteVideo = `/sdcard/${scenario.scenario_id}.mp4`;
  const videoPath = path.join(runDir, `${scenario.scenario_id}.mp4`);
  const context = { device, runDir, scenario };
  const executedSteps = [];
  let recorder = null;
  let failure = null;

  const gitSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const gitBranch = execFileSync("git", ["branch", "--show-current"], { cwd: ROOT, encoding: "utf8" }).trim();
  const runPlan = {
    agent_version: "EMULATOR_SOCIAL_VIDEO_AGENT_V1",
    scenario_id: scenario.scenario_id,
    scenario_sha256: sha256(scenarioRaw),
    git_sha: gitSha,
    git_branch: gitBranch,
    device,
    app_package: scenario.app_package,
    publishing_mode: "disabled",
    database_writes_authorized: false,
    social_credentials_required: false,
    created_at: new Date().toISOString(),
  };
  await fs.writeFile(path.join(runDir, "run_plan.json"), `${JSON.stringify(runPlan, null, 2)}\n`);
  await fs.writeFile(path.join(runDir, "scenario.json"), `${JSON.stringify(scenario, null, 2)}\n`);

  try {
    adb(["shell", "svc", "power", "stayon", "true"], { device, ignoreFailure: true });
    adb(["shell", "rm", "-f", remoteVideo], { device, ignoreFailure: true });
    for (const [index, step] of scenario.setup_steps.entries()) {
      executedSteps.push(await runStep(step, context, index, "setup"));
    }
    recorder = startRecorder({ device, remoteVideo, scenario });
    await sleep(750);
    for (const [index, step] of scenario.steps.entries()) {
      executedSteps.push(await runStep(step, context, index, "recording"));
    }
  } catch (error) {
    failure = String(error.stack || error.message || error);
  } finally {
    if (recorder) await stopRecorder({ device, child: recorder });
  }

  adb(["pull", remoteVideo, videoPath], { device, timeout: 60_000, ignoreFailure: true });
  const remoteScreenshot = `/sdcard/${scenario.scenario_id}_final.png`;
  const screenshotPath = path.join(runDir, "final_frame.png");
  adb(["shell", "screencap", "-p", remoteScreenshot], { device, ignoreFailure: true });
  adb(["pull", remoteScreenshot, screenshotPath], { device, timeout: 30_000, ignoreFailure: true });
  adb(["shell", "am", "force-stop", scenario.app_package], { device, ignoreFailure: true });
  const video = await fs.readFile(videoPath).catch(() => Buffer.alloc(0));
  const screenshot = await fs.readFile(screenshotPath).catch(() => Buffer.alloc(0));
  const hasMp4Header = video.subarray(0, 64).includes(Buffer.from("ftyp"));
  const hasPngHeader = screenshot.subarray(0, 8).equals(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  const qa = {
    status: !failure && video.length > 100_000 && hasMp4Header && screenshot.length > 10_000 && hasPngHeader
      ? "passed"
      : "failed",
    scenario_id: scenario.scenario_id,
    device,
    video_bytes: video.length,
    video_sha256: video.length ? sha256(video) : null,
    mp4_header_valid: hasMp4Header,
    final_frame_bytes: screenshot.length,
    final_frame_sha256: screenshot.length ? sha256(screenshot) : null,
    final_frame_png_valid: hasPngHeader,
    executed_step_count: executedSteps.length,
    expected_step_count: scenario.setup_steps.length + scenario.steps.length,
    publishing_attempts: 0,
    database_writes: 0,
    failure,
  };
  await fs.writeFile(path.join(runDir, "executed_steps.json"), `${JSON.stringify(executedSteps, null, 2)}\n`);
  await fs.writeFile(path.join(runDir, "qa_report.json"), `${JSON.stringify(qa, null, 2)}\n`);
  const manifest = {
    ...runPlan,
    policy,
    qa,
    artifacts: {
      video: path.basename(videoPath),
      final_frame: "final_frame.png",
      run_plan: "run_plan.json",
      scenario: "scenario.json",
      executed_steps: "executed_steps.json",
      qa_report: "qa_report.json",
    },
  };
  await fs.writeFile(path.join(runDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ...qa, artifact_root: path.relative(ROOT, runDir).replace(/\\/g, "/") }, null, 2)}\n`);
  if (qa.status !== "passed") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[emulator-video-agent-v1] ${error.stack || error.message}`);
    process.exitCode = 1;
  });
}
