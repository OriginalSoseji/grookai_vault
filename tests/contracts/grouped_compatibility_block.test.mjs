import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SHARED_CARDS_ROOT = path.join(REPO_ROOT, "apps", "web", "src", "lib", "sharedCards");
const TOGGLE_PATH = path.join(SHARED_CARDS_ROOT, "toggleSharedCardAction.ts");
const WALL_CATEGORY_PATH = path.join(
  SHARED_CARDS_ROOT,
  "saveSharedCardWallCategoryAction.ts",
);
const PUBLIC_NOTE_PATH = path.join(
  SHARED_CARDS_ROOT,
  "saveSharedCardPublicNoteAction.ts",
);

async function readSource(filePath) {
  return fs.readFile(filePath, "utf8");
}

function extractFunctionBlock(source, functionName) {
  const match = source.match(
    new RegExp(
      `export async function ${functionName}[\\s\\S]*?\\{([\\s\\S]*?)\\n\\}`,
      "m",
    ),
  );
  assert.ok(match, `missing function block for ${functionName}`);
  return match[1];
}

test("grouped compatibility mutation actions are fail-closed", async () => {
  for (const [filePath, functionName] of [
    [TOGGLE_PATH, "toggleSharedCardAction"],
    [WALL_CATEGORY_PATH, "saveSharedCardWallCategoryAction"],
    [PUBLIC_NOTE_PATH, "saveSharedCardPublicNoteAction"],
  ]) {
    const source = await readSource(filePath);
    const functionBlock = extractFunctionBlock(source, functionName);

    assert.match(source, /DEPRECATED COMPATIBILITY MUTATION LAYER/);
    assert.match(source, /GROUPED_COMPATIBILITY_MUTATION_BLOCK_MESSAGE/);
    assert.match(functionBlock, /throw new Error\(GROUPED_COMPATIBILITY_MUTATION_BLOCK_MESSAGE\);/);
  }
});

test("grouped compatibility mutation actions no longer contain write primitives", async () => {
  for (const filePath of [TOGGLE_PATH, WALL_CATEGORY_PATH, PUBLIC_NOTE_PATH]) {
    const source = await readSource(filePath);

    assert.doesNotMatch(source, /\.insert\(/);
    assert.doesNotMatch(source, /\.update\(/);
    assert.doesNotMatch(source, /\.delete\(/);
    assert.doesNotMatch(source, /\.rpc\(/);
    assert.doesNotMatch(source, /\.upsert\(/);
    assert.doesNotMatch(source, /\.from\("shared_cards"\)/);
  }
});

test("grouped compatibility actions cannot silently return success payloads", async () => {
  const toggleSource = await readSource(TOGGLE_PATH);
  const wallCategorySource = await readSource(WALL_CATEGORY_PATH);
  const publicNoteSource = await readSource(PUBLIC_NOTE_PATH);

  assert.doesNotMatch(
    extractFunctionBlock(toggleSource, "toggleSharedCardAction"),
    /return\s+\{\s*ok:\s*true/s,
  );
  assert.doesNotMatch(
    extractFunctionBlock(wallCategorySource, "saveSharedCardWallCategoryAction"),
    /return\s+\{\s*ok:\s*true/s,
  );
  assert.doesNotMatch(
    extractFunctionBlock(publicNoteSource, "saveSharedCardPublicNoteAction"),
    /return\s+\{\s*ok:\s*true/s,
  );
});
