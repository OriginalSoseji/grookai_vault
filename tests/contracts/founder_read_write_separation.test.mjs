import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const READ_PATH = path.join(
  REPO_ROOT,
  "apps",
  "web",
  "src",
  "lib",
  "warehouse",
  "getFounderWarehouseCandidateById.ts",
);
const WRITE_PATH = path.join(
  REPO_ROOT,
  "apps",
  "web",
  "src",
  "lib",
  "warehouse",
  "persistFounderWarehouseInterpretation.ts",
);

test("getFounderWarehouseCandidateById is read-only", async () => {
  const source = await fs.readFile(READ_PATH, "utf8");

  assert.match(source, /PURE READ GUARANTEE/);
  assert.match(source, /export const FOUNDER_WAREHOUSE_READ_HIDDEN_WRITE_PATHS/);
  assert.doesNotMatch(source, /\.insert\(/);
  assert.doesNotMatch(source, /\.update\(/);
  assert.doesNotMatch(source, /\.delete\(/);
  assert.doesNotMatch(source, /\.rpc\(/);
  assert.doesNotMatch(source, /persistWarehouseInterpreterIfNeeded\s*\(/);
  assert.doesNotMatch(source, /persistFounderWarehouseInterpretation\s*\(/);
});

test("persistFounderWarehouseInterpretation performs the explicit founder write", async () => {
  const source = await fs.readFile(WRITE_PATH, "utf8");

  assert.match(source, /FOUNDER AUTHORITY WRITE/);
  assert.match(source, /export async function persistFounderWarehouseInterpretation/);
  assert.match(source, /\.from\("canon_warehouse_candidates"\)\s*[\s\S]*?\.update\(/);
  assert.match(source, /\.from\("canon_warehouse_candidate_events"\)\.insert\(/);
  assert.match(source, /persistFounderWarehouseInterpretation requires actorId/);
});

test("read helper no longer triggers hidden interpreter persistence side effects", async () => {
  const readSource = await fs.readFile(READ_PATH, "utf8");
  const writeSource = await fs.readFile(WRITE_PATH, "utf8");

  assert.doesNotMatch(readSource, /INTERPRETER_V1_REFRESHED/);
  assert.doesNotMatch(readSource, /canon_warehouse_candidate_events"\)\.insert/);
  assert.doesNotMatch(readSource, /canon_warehouse_candidates"\)\s*[\s\S]*?\.update\(/);
  assert.match(writeSource, /INTERPRETER_V1_REFRESHED/);
});
