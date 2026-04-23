import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

export const CONTRACT_INDEX_PATH_V1 = path.join(REPO_ROOT, 'docs', 'CONTRACT_INDEX.md');
const CHECKPOINT_ROOTS_V1 = [
  path.join(REPO_ROOT, 'docs', 'checkpoints'),
  path.join(REPO_ROOT, 'docs', 'release'),
];

const AUTHORITATIVE_STATUSES = new Set(['Active', 'Frozen']);

let contractIndexEntriesPromise = null;
let checkpointNameSetPromise = null;

function parseTableCells(line) {
  return line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function isSeparatorLine(line) {
  return /^\|\s*[-:]+(?:\s*\|\s*[-:]+)+\s*\|$/.test(line.trim());
}

export function parseContractIndexMarkdownV1(markdown) {
  const lines = String(markdown ?? '').split(/\r?\n/);
  const entries = [];
  let section = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line.startsWith('## ')) {
      section = line.replace(/^##\s+/, '').trim();
      continue;
    }

    if (!line.startsWith('|')) {
      continue;
    }

    const headerCells = parseTableCells(line);
    if (headerCells[0] !== 'Contract') {
      continue;
    }

    if (!isSeparatorLine(lines[index + 1] ?? '')) {
      continue;
    }

    index += 2;
    while (index < lines.length && lines[index].trim().startsWith('|')) {
      const rowLine = lines[index].trim();
      if (isSeparatorLine(rowLine)) {
        index += 1;
        continue;
      }

      const cells = parseTableCells(rowLine);
      const row = Object.fromEntries(
        headerCells.map((header, headerIndex) => [header, cells[headerIndex] ?? '']),
      );

      const name = String(row.Contract ?? '').trim();
      const status = String(row.Status ?? '').trim();
      if (name) {
        entries.push({
          name,
          status,
          description: String(row.Description ?? '').trim(),
          section,
        });
      }
      index += 1;
    }

    index -= 1;
  }

  return entries;
}

async function walkMarkdownFiles(rootPath) {
  const out = [];
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkMarkdownFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      out.push(fullPath);
    }
  }
  return out;
}

export async function loadContractIndexEntriesV1() {
  if (!contractIndexEntriesPromise) {
    contractIndexEntriesPromise = fs
      .readFile(CONTRACT_INDEX_PATH_V1, 'utf8')
      .then((markdown) => parseContractIndexMarkdownV1(markdown));
  }
  return contractIndexEntriesPromise;
}

export async function loadAuthoritativeContractIndexMapV1() {
  const entries = await loadContractIndexEntriesV1();
  return new Map(
    entries
      .filter((entry) => AUTHORITATIVE_STATUSES.has(entry.status))
      .map((entry) => [entry.name, entry]),
  );
}

export async function loadCheckpointNameSetV1() {
  if (!checkpointNameSetPromise) {
    checkpointNameSetPromise = (async () => {
      const names = new Set();
      for (const rootPath of CHECKPOINT_ROOTS_V1) {
        try {
          const files = await walkMarkdownFiles(rootPath);
          for (const filePath of files) {
            names.add(path.basename(filePath, path.extname(filePath)));
          }
        } catch (error) {
          if (error?.code !== 'ENOENT') {
            throw error;
          }
        }
      }
      return names;
    })();
  }
  return checkpointNameSetPromise;
}

export async function assertAuthoritativeContractNamesV1(names, context = 'contract_scope') {
  const authoritative = await loadAuthoritativeContractIndexMapV1();
  const unknown = Array.from(new Set((names ?? []).filter(Boolean))).filter((name) => !authoritative.has(name));
  if (unknown.length > 0) {
    throw new Error(`[contracts:${context}] non-authoritative contract names: ${unknown.join(', ')}`);
  }
}

export async function assertCheckpointNamesV1(names, context = 'contract_scope') {
  const checkpoints = await loadCheckpointNameSetV1();
  const unknown = Array.from(new Set((names ?? []).filter(Boolean))).filter((name) => !checkpoints.has(name));
  if (unknown.length > 0) {
    throw new Error(`[contracts:${context}] unknown checkpoint names: ${unknown.join(', ')}`);
  }
}

export function isAuthoritativeContractStatusV1(status) {
  return AUTHORITATIVE_STATUSES.has(String(status ?? '').trim());
}
