import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const GATE_JSON = path.join(OUTPUT_DIR, 'enrich13j_core_identity_batch_apply_gate_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich13j_core_identity_batch_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich13j_core_identity_batch_real_apply_v1.md');

const EXPECTED_BATCH_FINGERPRINT = '4f5268be40ce76f3569a81b7a86bb85fea7ecb2863d761dbdab70f10bdbad69f';
const EXPECTED_SCOPE = {
  packages_in_batch: 5,
  parent_rows_in_batch: 124,
  child_printings_handled_in_batch: 343,
  external_mappings_handled_in_batch: 124,
  blocked_rows_excluded: 208,
};

const EXPECTED_PACKAGES = [
  {
    key: 'ENRICH-13D1',
    package_fingerprint_sha256: '9715c745f549bff135a0f8f18718e8d89dbcbc185309f11a5c474f68181368c2',
    sql_hash: '00319a0bea1ef96671d82c6c019fdc36c8ec38060bb21ac795798f8199097212',
  },
  {
    key: 'ENRICH-13E1',
    package_fingerprint_sha256: '17fffbc2ffe5831de01ed152c47c668e4c94c92ff36601e1f1cc7651b4dafc02',
    sql_hash: 'bb7cef1d447bca9d2d1e373b078f7bd73b8a60b40447e40aa6e43021a9195c0d',
  },
  {
    key: 'ENRICH-13C1',
    package_fingerprint_sha256: '6336e52e453641b1041a54e61313178e0998016f58a2c2df0e8a706f370e4566',
    sql_hash: '43665f6292dc8269b6b24c846a00d144131aa4b33f65f7f099eb608bd4111ffc',
  },
  {
    key: 'ENRICH-13F1',
    package_fingerprint_sha256: '8d363c0d4eff9389606fa452090e234830c207438057cbf48733f110e67cdc5b',
    sql_hash: '4b8b0a01d14d2b84efae86cc73799dc7e5427da9937dce502b348e9faa41e4bd',
  },
  {
    key: 'ENRICH-13G1',
    package_fingerprint_sha256: '2a55568422b6a513dbfe6ca64ea662274acc697a3f6955e249e23c781b6641ac',
    sql_hash: 'a9b4550e4e3343dfee547af686468bb141f5d4dc2ad593809f1e7a96772c3a05',
  },
];

const APPROVAL_TEXT = 'Approve real ENRICH-13J-CORE-IDENTITY-BATCH apply only. Batch fingerprint: 4f5268be40ce76f3569a81b7a86bb85fea7ecb2863d761dbdab70f10bdbad69f. Scope: 124 parent dependency/identity rows across 5 proven packages, 343 child printings handled, 124 external mappings handled. Package fingerprints: ENRICH-13D1=9715c745f549bff135a0f8f18718e8d89dbcbc185309f11a5c474f68181368c2, ENRICH-13E1=17fffbc2ffe5831de01ed152c47c668e4c94c92ff36601e1f1cc7651b4dafc02, ENRICH-13C1=6336e52e453641b1041a54e61313178e0998016f58a2c2df0e8a706f370e4566, ENRICH-13F1=8d363c0d4eff9389606fa452090e234830c207438057cbf48733f110e67cdc5b, ENRICH-13G1=2a55568422b6a513dbfe6ca64ea662274acc697a3f6955e249e23c781b6641ac. SQL hashes: ENRICH-13D1=00319a0bea1ef96671d82c6c019fdc36c8ec38060bb21ac795798f8199097212, ENRICH-13E1=bb7cef1d447bca9d2d1e373b078f7bd73b8a60b40447e40aa6e43021a9195c0d, ENRICH-13C1=43665f6292dc8269b6b24c846a00d144131aa4b33f65f7f099eb608bd4111ffc, ENRICH-13F1=4b8b0a01d14d2b84efae86cc73799dc7e5427da9937dce502b348e9faa41e4bd, ENRICH-13G1=a9b4550e4e3343dfee547af686468bb141f5d4dc2ad593809f1e7a96772c3a05. Blocked rows excluded: 208. No global apply. No migrations. No image writes. No cleanup outside the listed package scopes.';

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

async function tableExists(client, tableName) {
  const result = await client.query(`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = $1
    ) as exists
  `, [tableName]);
  return result.rows[0]?.exists === true;
}

async function optionalDependencyCount(client, tableName, columnName, ids) {
  if (!(await tableExists(client, tableName))) return 0;
  const result = await client.query(
    `select count(*)::int as count from public.${tableName} where ${columnName} = any($1::uuid[])`,
    [ids],
  );
  return result.rows[0]?.count ?? 0;
}

function validateGate(gate) {
  const findings = [];
  if (gate.batch_fingerprint_sha256 !== EXPECTED_BATCH_FINGERPRINT) findings.push('batch_fingerprint_mismatch');
  if (gate.summary?.ready_for_single_batch_approval !== true) findings.push('batch_gate_not_ready');
  if (gate.real_apply_authorized_by_this_report !== false) findings.push('gate_unexpectedly_authorizes_apply');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('gate_stop_findings_present');
  if (gate.required_real_apply_approval_text_if_later_authorized !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  for (const [key, value] of Object.entries(EXPECTED_SCOPE)) {
    if (gate.summary?.[key] !== value) findings.push(`scope_mismatch:${key}`);
  }

  const actualByKey = new Map((gate.ready_packages ?? []).map((pkg) => [pkg.key, pkg]));
  for (const expected of EXPECTED_PACKAGES) {
    const actual = actualByKey.get(expected.key);
    if (!actual) {
      findings.push(`missing_package:${expected.key}`);
      continue;
    }
    if (actual.package_fingerprint_sha256 !== expected.package_fingerprint_sha256) {
      findings.push(`package_fingerprint_mismatch:${expected.key}`);
    }
    if (actual.sql_hash !== expected.sql_hash) {
      findings.push(`sql_hash_mismatch:${expected.key}`);
    }
    if (actual.pass !== true) findings.push(`package_not_passed:${expected.key}`);
    if (actual.dry_run_proof_match !== true) findings.push(`dry_run_proof_mismatch:${expected.key}`);
    if (actual.contains_commit_statement !== false) findings.push(`dry_run_contains_commit:${expected.key}`);
    if (actual.contains_rollback_statement !== true) findings.push(`dry_run_missing_rollback:${expected.key}`);
  }

  return findings;
}

function realApplySqlFromDryRun(sql) {
  const trimmed = sql.trimEnd();
  if (!/rollback\s*;\s*$/i.test(trimmed)) {
    throw new Error('SQL artifact does not end with rollback;');
  }
  return `${trimmed.replace(/rollback\s*;\s*$/i, 'commit;')}\n`;
}

async function readPackageSql(pkg) {
  const sql = await fs.readFile(pkg.sql_path, 'utf8');
  const hash = sha256(sql);
  return {
    key: pkg.key,
    sql_path: pkg.sql_path,
    original_sql_hash: hash,
    original_hash_matches_gate: hash === pkg.sql_hash,
    real_apply_sql_hash: sha256(realApplySqlFromDryRun(sql)),
    real_apply_sql: realApplySqlFromDryRun(sql),
  };
}

async function countDuplicateDependencies(client, duplicateIds) {
  return {
    external_mappings: await optionalDependencyCount(client, 'external_mappings', 'card_print_id', duplicateIds),
    card_print_identity: await optionalDependencyCount(client, 'card_print_identity', 'card_print_id', duplicateIds),
    card_print_traits: await optionalDependencyCount(client, 'card_print_traits', 'card_print_id', duplicateIds),
    card_print_species: await optionalDependencyCount(client, 'card_print_species', 'card_print_id', duplicateIds),
    card_printings: await optionalDependencyCount(client, 'card_printings', 'card_print_id', duplicateIds),
    card_prints: await optionalDependencyCount(client, 'card_prints', 'id', duplicateIds),
  };
}

async function snapshotPackage(client, pkg) {
  const report = await readJson(pkg.report_path);
  const duplicateIds = (report.target_rows ?? report.rows ?? [])
    .map((row) => row.duplicate_card_print_id)
    .filter(Boolean);
  const ownerIds = (report.target_rows ?? report.rows ?? [])
    .map((row) => row.canonical_owner_card_print_id)
    .filter(Boolean);
  const dependencyCounts = await countDuplicateDependencies(client, duplicateIds);
  const ownerResult = await client.query(
    'select count(*)::int as count from public.card_prints where id = any($1::uuid[])',
    [ownerIds],
  );
  return {
    key: pkg.key,
    duplicate_ids: duplicateIds,
    owner_ids: ownerIds,
    duplicate_dependency_counts: dependencyCounts,
    owner_rows_present: ownerResult.rows[0]?.count ?? 0,
    hash_sha256: sha256(stableJson({
      key: pkg.key,
      duplicate_dependency_counts: dependencyCounts,
      owner_rows_present: ownerResult.rows[0]?.count ?? 0,
    })),
  };
}

async function globalGuards(client) {
  const result = await client.query(`
    select
      (select count(*)::int from (
        select identity_domain, identity_key_hash
        from public.card_print_identity
        where is_active = true
        group by identity_domain, identity_key_hash
        having count(*) > 1
      ) dupes) as active_identity_duplicate_groups,
      (select count(*)::int from (
        select source, external_id
        from public.external_mappings
        where coalesce(active, true) = true
        group by source, external_id
        having count(distinct card_print_id) > 1
      ) dupes) as active_external_mapping_duplicate_groups,
      (select count(*)::int from (
        select card_print_id, finish_key
        from public.card_printings
        group by card_print_id, finish_key
        having count(*) > 1
      ) dupes) as child_printing_duplicate_groups
  `);
  return result.rows[0];
}

async function snapshotPackagesSequentially(client, packages) {
  const snapshots = [];
  for (const pkg of packages) {
    snapshots.push(await snapshotPackage(client, pkg));
  }
  return snapshots;
}

function table(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replaceAll('|', '\\|')).join(' | ')} |`),
  ].join('\n');
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing database connection string.');

  const gate = await readJson(GATE_JSON);
  const gateFindings = validateGate(gate);
  if (gateFindings.length) {
    throw new Error(`ENRICH-13J gate validation failed: ${gateFindings.join(', ')}`);
  }

  const packages = [...gate.ready_packages].sort((a, b) => a.apply_order - b.apply_order);
  const sqlArtifacts = await Promise.all(packages.map(readPackageSql));
  const sqlFindings = sqlArtifacts
    .filter((artifact) => !artifact.original_hash_matches_gate)
    .map((artifact) => `sql_hash_mismatch:${artifact.key}`);
  if (sqlFindings.length) {
    throw new Error(`ENRICH-13J SQL validation failed: ${sqlFindings.join(', ')}`);
  }

  const client = new Client({ connectionString: conn });
  await client.connect();

  let beforeSnapshots = [];
  let afterSnapshots = [];
  let guardBefore = null;
  let guardAfter = null;
  const appliedPackages = [];

  try {
    beforeSnapshots = await snapshotPackagesSequentially(client, packages);
    guardBefore = await globalGuards(client);

    for (const pkg of packages) {
      const artifact = sqlArtifacts.find((item) => item.key === pkg.key);
      await client.query(artifact.real_apply_sql);
      appliedPackages.push({
        key: pkg.key,
        sql_path: artifact.sql_path,
        source_sql_hash: artifact.original_sql_hash,
        real_apply_sql_hash: artifact.real_apply_sql_hash,
      });
    }

    afterSnapshots = await snapshotPackagesSequentially(client, packages);
    guardAfter = await globalGuards(client);
  } finally {
    await client.end();
  }

  const packageResults = packages.map((pkg) => {
    const before = beforeSnapshots.find((snapshot) => snapshot.key === pkg.key);
    const after = afterSnapshots.find((snapshot) => snapshot.key === pkg.key);
    const duplicateDependenciesCleared = Object.values(after.duplicate_dependency_counts).every((value) => Number(value) === 0);
    return {
      key: pkg.key,
      apply_order: pkg.apply_order,
      target_rows: pkg.target_rows,
      child_printings_handled: pkg.child_printings_handled,
      external_mappings_handled: pkg.external_mappings_handled,
      before_snapshot: before,
      after_snapshot: after,
      duplicate_dependencies_cleared: duplicateDependenciesCleared,
      owner_rows_present_after: after.owner_rows_present,
    };
  });

  const stopFindings = [];
  for (const result of packageResults) {
    if (!result.duplicate_dependencies_cleared) stopFindings.push(`duplicate_dependencies_remaining:${result.key}`);
  }
  for (const [key, value] of Object.entries(guardAfter ?? {})) {
    if (Number(value) !== 0) stopFindings.push(`global_guard_failed:${key}:${value}`);
  }

  const reportCore = {
    version: 'ENRICH_13J_CORE_IDENTITY_BATCH_REAL_APPLY_V1',
    package_id: 'ENRICH-13J-CORE-IDENTITY-BATCH',
    approval_text: APPROVAL_TEXT,
    batch_fingerprint_sha256: EXPECTED_BATCH_FINGERPRINT,
    db_writes_performed: true,
    migrations_created: false,
    cleanup_performed: false,
    image_writes_performed: false,
    global_apply_performed: false,
    summary: {
      packages_applied: appliedPackages.length,
      parent_rows_in_batch: EXPECTED_SCOPE.parent_rows_in_batch,
      child_printings_handled_in_batch: EXPECTED_SCOPE.child_printings_handled_in_batch,
      external_mappings_handled_in_batch: EXPECTED_SCOPE.external_mappings_handled_in_batch,
      blocked_rows_excluded: EXPECTED_SCOPE.blocked_rows_excluded,
      stop_findings_count: stopFindings.length,
    },
    applied_packages: appliedPackages,
    package_results: packageResults,
    global_guards: {
      before: guardBefore,
      after: guardAfter,
    },
    blocked_lanes_preserved: gate.blocked_lanes,
    stop_findings: stopFindings,
  };

  const report = {
    ...reportCore,
    generated_at: new Date().toISOString(),
    proof_hash_sha256: sha256(stableJson(reportCore)),
  };

  const md = `# ENRICH-13J Core Identity Batch Real Apply V1

Generated: ${report.generated_at}

## Summary

- Packages applied: ${report.summary.packages_applied}
- Parent rows in batch: ${report.summary.parent_rows_in_batch}
- Child printings handled in batch: ${report.summary.child_printings_handled_in_batch}
- External mappings handled in batch: ${report.summary.external_mappings_handled_in_batch}
- Blocked rows excluded: ${report.summary.blocked_rows_excluded}
- Stop findings: ${report.summary.stop_findings_count}
- Proof hash: \`${report.proof_hash_sha256}\`

## Applied Packages

${table(report.package_results, [
  { label: 'Order', value: (row) => row.apply_order },
  { label: 'Package', value: (row) => row.key },
  { label: 'Rows', value: (row) => row.target_rows },
  { label: 'Children', value: (row) => row.child_printings_handled },
  { label: 'Mappings', value: (row) => row.external_mappings_handled },
  { label: 'Dependencies cleared', value: (row) => row.duplicate_dependencies_cleared },
  { label: 'Owners present after', value: (row) => row.owner_rows_present_after },
])}

## Global Guards After

\`\`\`json
${JSON.stringify(report.global_guards.after, null, 2)}
\`\`\`

## Blocked Lanes Preserved

${table(report.blocked_lanes_preserved, [
  { label: 'Blocker', value: (row) => row.key },
  { label: 'Rows', value: (row) => row.rows },
  { label: 'Status', value: (row) => row.status },
])}

## Stop Findings

${report.stop_findings.length === 0 ? 'None.' : report.stop_findings.map((finding) => `- ${finding}`).join('\n')}
`;

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, md);

  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    packages_applied: report.summary.packages_applied,
    proof_hash_sha256: report.proof_hash_sha256,
    stop_findings: report.stop_findings,
    global_guards_after: report.global_guards.after,
  }, null, 2));

  if (stopFindings.length) {
    process.exitCode = 1;
  }
}

await main();
