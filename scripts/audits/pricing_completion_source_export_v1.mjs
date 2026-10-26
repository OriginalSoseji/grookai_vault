import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { pricingCompletionReadOnlyDatabaseConfigV1, readPricingCompletionSourceSnapshotV1 } from '../../backend/pricing/pricing_completion_source_export_v1.mjs';
import { buildPricingCompletionMasterGapExportV1, readPricingCompletionMasterSnapshotV1 } from '../../backend/pricing/pricing_completion_master_gap_export_v1.mjs';

// Intentionally no dotenv, shell commands, worker-provided query or production apply mode.
async function main() {
  const args = process.argv.slice(2);
  const allowed = ['--out-dir=', '--expected-run-id=', '--max-rows='];
  if (args.some((arg) => !allowed.some((prefix) => arg.startsWith(prefix)))) throw new Error('invalid_options');
  const value = (prefix) => {
    const matches = args.filter((arg) => arg.startsWith(prefix));
    if (matches.length > 1) throw new Error('duplicate_option');
    return matches[0]?.slice(prefix.length);
  };
  const outputDirectory = value('--out-dir=');
  if (!outputDirectory || !path.isAbsolute(outputDirectory)) throw new Error('absolute_output_directory_required');
  const connectionString = process.env.PRICING_COMPLETION_READONLY_DB_URL;
  if (!connectionString) throw new Error('dedicated_readonly_connection_required');
  const config = pricingCompletionReadOnlyDatabaseConfigV1(connectionString, {
    ca: process.env.PRICING_COMPLETION_DATABASE_CA_PEM,
    insecureTlsEnvironment: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0',
  });
  const expectedRunId = value('--expected-run-id=') ?? null;
  const maxRows = value('--max-rows=') === undefined ? 250000 : Number(value('--max-rows='));
  const { default: pg } = await import('pg');
  const client = new pg.Client(config);
  try {
    await client.connect();
    const result = await readPricingCompletionSourceSnapshotV1(client, { now: Date.now(), expectedRunId, maxRows,
      readMasterSnapshot: async (transactionClient, { sourceRunId, capturedAt }) =>
        buildPricingCompletionMasterGapExportV1(await readPricingCompletionMasterSnapshotV1(transactionClient, {
          games: ['pokemon'], sourceRunId, observedAt: capturedAt, currency: 'USD',
          evidenceRef: `pokemon-master-exact-pricing-census:${sourceRunId}:${capturedAt}`,
        })),
    });
    // A unique output directory keeps source evidence immutable; existing paths fail closed.
    await fs.mkdir(outputDirectory, { recursive: false });
    const hashes = {};
    for (const [name, body] of Object.entries({ 'snapshot.json': result.snapshot, 'receipt.json': result.receipt, 'master_coverage.json': result.masterExport })) {
      const bytes = `${JSON.stringify(body, null, 2)}\n`;
      await fs.writeFile(path.join(outputDirectory, name), bytes, { flag: 'wx' });
      hashes[name] = createHash('sha256').update(bytes).digest('hex');
    }
    await fs.writeFile(path.join(outputDirectory, 'artifact_hashes.json'), `${JSON.stringify(hashes, null, 2)}\n`, { flag: 'wx' });
    const manifest = { schema_version: 'PRICING_COMPLETION_SNAPSHOT_FILES_V1', snapshot: { path: 'snapshot.json', sha256: hashes['snapshot.json'] } };
    await fs.writeFile(path.join(outputDirectory, 'input_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
    process.stdout.write(`${JSON.stringify({ status: result.normalized.summary.status, unresolved: result.normalized.summary.importedUnresolved, freshness: result.normalized.freshness, masterCoverage: result.normalized.coverage.masterToPrice.status, masterGames: ['pokemon'], databaseWrites: 0 })}\n`);
  } finally { await client.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(() => {
  // PostgreSQL and URL errors can embed connection details; never emit raw errors or environment values.
  process.stderr.write('Pricing source export failed; no snapshot is accepted. Review the bounded runner diagnostics without exposing connection details.\n');
  process.exitCode = 1;
});
