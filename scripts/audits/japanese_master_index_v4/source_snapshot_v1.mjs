import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { sha256, stableJson } from './deterministic_artifact_v1.mjs';

export const SOURCE_SNAPSHOT_VERSION = 'JPN-MASTER-INDEX-SOURCE-SNAPSHOT-V1';
export const SOURCE_USER_AGENT =
  'GrookaiVault-JPNMasterIndex/4.0 (+https://grookaivault.com)';

const PRESERVED_HEADERS = new Set([
  'cache-control',
  'content-encoding',
  'content-length',
  'content-type',
  'date',
  'etag',
  'expires',
  'last-modified',
  'retry-after',
  'server',
  'vary',
]);

function parseFinalHeaderBlock(rawHeaders) {
  const blocks = rawHeaders
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .filter((block) => /^HTTP\/\S+\s+\d{3}/i.test(block));
  const block = blocks.at(-1);
  if (!block) {
    throw new Error('Source response did not contain an HTTP status line.');
  }

  const lines = block.split(/\r?\n/);
  const statusMatch = lines[0].match(/^HTTP\/\S+\s+(\d{3})(?:\s+(.*))?$/i);
  if (!statusMatch) {
    throw new Error(`Unrecognized HTTP status line: ${lines[0]}`);
  }

  const headers = {};
  for (const line of lines.slice(1)) {
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    if (!PRESERVED_HEADERS.has(key)) continue;
    headers[key] = line.slice(separator + 1).trim();
  }

  return {
    http_status: Number(statusMatch[1]),
    status_text: statusMatch[2]?.trim() || null,
    response_headers: headers,
  };
}

function curlArguments({ url, bodyPath, headersPath, timeoutSeconds }) {
  const args = [
    '--fail-with-body',
    '--location',
    '--silent',
    '--show-error',
    '--compressed',
    '--connect-timeout',
    '20',
    '--max-time',
    String(timeoutSeconds),
    '--retry',
    '2',
    '--retry-delay',
    '1',
    '--retry-all-errors',
    '--user-agent',
    SOURCE_USER_AGENT,
    '--dump-header',
    headersPath,
    '--output',
    bodyPath,
  ];
  if (process.platform === 'win32') {
    // Schannel can fail closed when Windows cannot reach its revocation service.
    // Certificate and hostname validation remain enabled.
    args.push('--ssl-no-revoke');
  }
  args.push(url);
  return args;
}

export async function captureSourceSnapshot({
  sourceId,
  url,
  outputDirectory,
  extension,
  timeoutSeconds = 120,
}) {
  const fetchedAt = new Date().toISOString();
  const tempDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'grookai-jpn-source-'),
  );
  const tempBodyPath = path.join(tempDirectory, 'response.body');
  const tempHeadersPath = path.join(tempDirectory, 'response.headers');

  try {
    const result = spawnSync(
      'curl',
      curlArguments({
        url,
        bodyPath: tempBodyPath,
        headersPath: tempHeadersPath,
        timeoutSeconds,
      }),
      {
        encoding: 'utf8',
        windowsHide: true,
        timeout: (timeoutSeconds + 15) * 1_000,
      },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(
        `Source fetch failed for ${sourceId}: ${result.stderr?.trim() || `curl exit ${result.status}`}`,
      );
    }

    const body = await fs.readFile(tempBodyPath);
    const rawHeaders = await fs.readFile(tempHeadersPath, 'utf8');
    const response = parseFinalHeaderBlock(rawHeaders);
    if (response.http_status !== 200) {
      throw new Error(
        `Source fetch returned HTTP ${response.http_status} for ${sourceId}.`,
      );
    }

    await fs.mkdir(outputDirectory, { recursive: true });
    const bodyFilename = `${sourceId}_v1.${extension}`;
    const metadataFilename = `${sourceId}_v1.http.json`;
    const bodyOutputPath = path.join(outputDirectory, bodyFilename);
    const metadataOutputPath = path.join(outputDirectory, metadataFilename);
    await fs.writeFile(bodyOutputPath, body);

    const metadata = {
      snapshot_version: SOURCE_SNAPSHOT_VERSION,
      source_id: sourceId,
      request_url: url,
      request_method: 'GET',
      fetched_at: fetchedAt,
      user_agent: SOURCE_USER_AGENT,
      http_status: response.http_status,
      status_text: response.status_text,
      response_headers: response.response_headers,
      body_path: bodyOutputPath.replaceAll('\\', '/'),
      byte_size: body.length,
      body_sha256: sha256(body),
    };
    await fs.writeFile(metadataOutputPath, stableJson(metadata), 'utf8');
    return { metadata, body };
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

export async function readSourceSnapshot({
  sourceId,
  outputDirectory,
  extension,
}) {
  const bodyPath = path.join(outputDirectory, `${sourceId}_v1.${extension}`);
  const metadataPath = path.join(
    outputDirectory,
    `${sourceId}_v1.http.json`,
  );
  const [body, metadataRaw] = await Promise.all([
    fs.readFile(bodyPath),
    fs.readFile(metadataPath, 'utf8'),
  ]);
  const metadata = JSON.parse(metadataRaw);
  if (metadata.source_id !== sourceId) {
    throw new Error(`Source metadata mismatch for ${sourceId}.`);
  }
  if (metadata.byte_size !== body.length) {
    throw new Error(`Source byte-size mismatch for ${sourceId}.`);
  }
  if (metadata.body_sha256 !== sha256(body)) {
    throw new Error(`Source SHA-256 mismatch for ${sourceId}.`);
  }
  return { metadata, body };
}
