import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ts from "typescript";

import { TCGDEX_POKEMON_LANGUAGE_SCOPES } from
  "./pokemon_language_master_index_v1.mjs";

const execFileAsync = promisify(execFile);
const REPOSITORY_URL = "https://github.com/tcgdex/cards-database.git";

function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
    return node.text;
  }
  return null;
}

function property(object, name) {
  if (!object || !ts.isObjectLiteralExpression(object)) return null;
  for (const entry of object.properties) {
    if (ts.isPropertyAssignment(entry) && propertyName(entry.name) === name) {
      return entry.initializer;
    }
  }
  return null;
}

function stringValue(node) {
  return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text.trim()
    : null;
}

function integerValue(node) {
  if (!node || !ts.isNumericLiteral(node)) return null;
  const value = Number(node.text);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function languageMap(node) {
  if (!node || !ts.isObjectLiteralExpression(node)) return new Map();
  const values = new Map();
  for (const entry of node.properties) {
    if (!ts.isPropertyAssignment(entry)) continue;
    const language = propertyName(entry.name);
    const value = stringValue(entry.initializer);
    if (language && value && TCGDEX_POKEMON_LANGUAGE_SCOPES.includes(language)) {
      values.set(language, value);
    }
  }
  return values;
}

function exportedObject(sourceText, filePath, variableName) {
  const source = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  );
  const declarations = new Map();
  let defaultExportName = null;
  for (const statement of source.statements) {
    if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression)) {
      defaultExportName = statement.expression.text;
      continue;
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer &&
          ts.isObjectLiteralExpression(declaration.initializer)) {
        declarations.set(declaration.name.text, declaration.initializer);
      }
    }
  }
  return declarations.get(defaultExportName) ?? declarations.get(variableName) ?? null;
}

async function collectSetDescriptorPaths(root) {
  const descriptors = [];
  async function visit(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const directoryNames = new Set(entries.filter((entry) => entry.isDirectory())
      .map((entry) => entry.name));
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(entryPath);
      else if (entry.isFile() && entry.name.endsWith(".ts") &&
          directoryNames.has(entry.name.slice(0, -3))) {
        descriptors.push(entryPath);
      }
    }
  }
  await visit(root);
  return descriptors.sort();
}

async function mapPool(values, concurrency, task) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

async function parseSetDescriptor(descriptorPath, repositoryRoot) {
  const setDirectory = descriptorPath.slice(0, -3);
  const setSource = await fs.readFile(descriptorPath, "utf8");
  const setObject = exportedObject(setSource, descriptorPath, "set");
  if (!setObject || !property(setObject, "serie")) return null;
  const setId = stringValue(property(setObject, "id"));
  const names = languageMap(property(setObject, "name"));
  if (!setId || names.size === 0) return null;
  const cardCount = property(setObject, "cardCount");
  const officialCount = integerValue(property(cardCount, "official"));
  const cardFiles = (await fs.readdir(setDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => path.join(setDirectory, entry.name))
    .sort();
  const cards = await mapPool(cardFiles, 24, async (cardPath) => {
    const cardSource = await fs.readFile(cardPath, "utf8");
    const cardObject = exportedObject(cardSource, cardPath, "card");
    if (!cardObject) {
      throw new Error(`TCGdex source object card missing in ${cardPath}.`);
    }
    return {
      localId: path.basename(cardPath, ".ts"),
      names: languageMap(property(cardObject, "name")),
      sourceReference: path.relative(repositoryRoot, cardPath).replaceAll("\\", "/"),
    };
  });
  return {
    setId,
    names,
    officialCount,
    totalCount: cards.length,
    sourceReference: path.relative(repositoryRoot, descriptorPath).replaceAll("\\", "/"),
    cards,
  };
}

export async function parseTcgdexGithubLanguageSourceTreeV1({
  repositoryRoot,
  sourceCommitSha,
  concurrency = 8,
}) {
  const descriptorPaths = (await Promise.all([
    collectSetDescriptorPaths(path.join(repositoryRoot, "data")),
    collectSetDescriptorPaths(path.join(repositoryRoot, "data-asia")),
  ])).flat().sort();
  const parsedSets = (await mapPool(
    descriptorPaths,
    concurrency,
    (descriptorPath) => parseSetDescriptor(descriptorPath, repositoryRoot),
  )).filter(Boolean);
  const snapshots = Object.fromEntries(TCGDEX_POKEMON_LANGUAGE_SCOPES.map((language) => [
    language,
    {
      status: "provider_no_cards",
      source: "tcgdex_github_snapshot",
      source_commit_sha: sourceCommitSha,
      sets: [],
      cards: [],
    },
  ]));
  for (const parsedSet of parsedSets) {
    for (const language of TCGDEX_POKEMON_LANGUAGE_SCOPES) {
      const setName = parsedSet.names.get(language);
      if (!setName) continue;
      const translatedCards = parsedSet.cards.filter((card) => card.names.has(language));
      if (translatedCards.length === 0) continue;
      const snapshot = snapshots[language];
      snapshot.status = "available";
      snapshot.sets.push({
        id: parsedSet.setId,
        name: setName,
        cardCount: {
          official: parsedSet.officialCount,
          total: parsedSet.totalCount,
        },
        sourceReference: parsedSet.sourceReference,
      });
      for (const card of translatedCards) {
        snapshot.cards.push({
          id: `${parsedSet.setId}-${card.localId}`,
          localId: card.localId,
          name: card.names.get(language),
          sourceReference: card.sourceReference,
        });
      }
    }
  }
  for (const snapshot of Object.values(snapshots)) {
    snapshot.sets.sort((left, right) => left.id.localeCompare(right.id));
    snapshot.cards.sort((left, right) => left.id.localeCompare(right.id));
  }
  return {
    source: "tcgdex_github_snapshot",
    source_commit_sha: sourceCommitSha,
    repository_url: REPOSITORY_URL,
    snapshots,
  };
}

export async function loadTcgdexGithubLanguageSnapshotsV1({ concurrency = 8 } = {}) {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tcgdex-language-source-"));
  const repositoryRoot = path.join(temporaryRoot, "cards-database");
  try {
    await execFileAsync("git", [
      "clone",
      "--depth=1",
      "--filter=blob:none",
      "--sparse",
      REPOSITORY_URL,
      repositoryRoot,
    ], { timeout: 300_000, maxBuffer: 10 * 1024 * 1024 });
    await execFileAsync("git", [
      "-C", repositoryRoot, "sparse-checkout", "set", "data", "data-asia",
    ], { timeout: 300_000, maxBuffer: 10 * 1024 * 1024 });
    const { stdout } = await execFileAsync(
      "git",
      ["-C", repositoryRoot, "rev-parse", "HEAD"],
      { timeout: 30_000 },
    );
    const sourceCommitSha = stdout.trim();
    return await parseTcgdexGithubLanguageSourceTreeV1({
      repositoryRoot,
      sourceCommitSha,
      concurrency,
    });
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}
