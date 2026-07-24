import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const PACKAGE_ID = "COLLABORATIVE-BINDERS-DB-V1";
const PACKAGE_FINGERPRINT =
  "14a235d9ca9bc2172ddd3bfb8e2ba8b8812849079fe0469b73f35d02b6b47fb9";
const PRODUCTION_PROJECT_REF = "ycdxbpibncqcchqiihfz";
const REQUIRED_ANCESTOR_SHA =
  "34caa07324587815040957f9adde1f771ebfc85a";

const MANIFEST_PATH =
  "scripts/ops/collaborative_binders_production_manifest_v1.json";
const MODULE_PATH =
  "scripts/ops/CollaborativeBindersProductionRolloutV1.psm1";
const PREFLIGHT_ENTRYPOINT_PATH =
  "scripts/ops/collaborative_binders_production_preflight_v1.ps1";
const APPLY_ENTRYPOINT_PATH =
  "scripts/ops/collaborative_binders_production_apply_v1.ps1";
const READBACK_ENTRYPOINT_PATH =
  "scripts/ops/collaborative_binders_production_readback_v1.ps1";
const PREFLIGHT_SQL_PATH =
  "scripts/ops/sql/collaborative_binders_production_preflight_v1.sql";
const POST_APPLY_SQL_PATH =
  "scripts/ops/sql/collaborative_binders_production_post_apply_v1.sql";
const RUNBOOK_PATH =
  "docs/runbooks/COLLABORATIVE_BINDERS_PRODUCTION_ROLLOUT_V1.md";

const EXPECTED_MIGRATIONS = [
  {
    version: "20260723100000",
    file: "20260723100000_collaborative_binders_schema_v1.sql",
    sha256:
      "7e83ab8bb83e5b938fbec758b21f8cae2b4a71427a6600c54c5f773c974bae33",
    cumulative_tables: 19,
    cumulative_functions: 17,
    cumulative_indexes: 61,
    cumulative_rls_policies: 19,
  },
  {
    version: "20260723101000",
    file: "20260723101000_collaborative_binders_core_rpcs_v1.sql",
    sha256:
      "eb9ca9898bca12b127f4b79aff9df81259efe74fa1029487ea133e94e8a67a7d",
    cumulative_tables: 19,
    cumulative_functions: 44,
    cumulative_indexes: 61,
    cumulative_rls_policies: 19,
  },
  {
    version: "20260723102000",
    file: "20260723102000_collaborative_binders_collaboration_rpcs_v1.sql",
    sha256:
      "680580044161936c8a382e5209e2cc54369943e13f1a3ae2ed41c299532cf3bf",
    cumulative_tables: 19,
    cumulative_functions: 65,
    cumulative_indexes: 61,
    cumulative_rls_policies: 19,
  },
  {
    version: "20260723103000",
    file: "20260723103000_collaborative_binders_read_rpcs_v1.sql",
    sha256:
      "73dab7009f059267dcc571fcb6ec79cffdb23b728fc5bf04cd81397a06bcd6fb",
    cumulative_tables: 19,
    cumulative_functions: 99,
    cumulative_indexes: 61,
    cumulative_rls_policies: 19,
  },
  {
    version: "20260723104000",
    file: "20260723104000_collaborative_binders_service_rpcs_v1.sql",
    sha256:
      "2edbef712d6b228c73b504498a6aa09f5bac440cfef96319d5c75f65e12d2997",
    cumulative_tables: 21,
    cumulative_functions: 124,
    cumulative_indexes: 65,
    cumulative_rls_policies: 22,
  },
];

const EXPECTED_FLAGS = [
  "schema_internal",
  "personal",
  "set_binders",
  "custom",
  "shared",
  "view_links",
  "public",
  "community",
  "templates",
  "notifications",
  "pulse_milestones",
];

const EXCLUDED_FLAGS = [
  "set_binders",
  "notifications",
  "pulse_milestones",
];

const READBACK_SQL_HASHES = {
  [PREFLIGHT_SQL_PATH]:
    "268458ed8a4a16dc513b55b6d0e5b3b03c301320e55a9ab4887a135c7652800d",
  [POST_APPLY_SQL_PATH]:
    "5125b0d89f5b3d36c66f98863f0b69b9c6df55561dfb54303437d47d8731f1a1",
};

const EXPECTED_READBACK_SQL = [
  {
    phase: "pre_apply",
    file: PREFLIGHT_SQL_PATH,
    sha256: READBACK_SQL_HASHES[PREFLIGHT_SQL_PATH],
  },
  {
    phase: "post_apply",
    file: POST_APPLY_SQL_PATH,
    sha256: READBACK_SQL_HASHES[POST_APPLY_SQL_PATH],
  },
];

function absolute(relativePath) {
  return path.join(REPO_ROOT, ...relativePath.split("/"));
}

function source(relativePath) {
  return readFileSync(absolute(relativePath), "utf8");
}

function bytes(relativePath) {
  return readFileSync(absolute(relativePath));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function packageFingerprint(manifest) {
  const lines = [
    `schema_version=${manifest.schema_version}`,
    `package_id=${manifest.package_id}`,
    `required_ancestor_sha=${manifest.required_ancestor_sha}`,
    `production_project_ref=${manifest.production_project_ref}`,
    `canonical_git_repository=${manifest.canonical_git_repository}`,
  ];

  for (const migration of manifest.migrations) {
    lines.push(
      [
        "migration=" + migration.version,
        migration.file,
        migration.sha256,
        migration.cumulative_tables,
        migration.cumulative_functions,
        migration.cumulative_indexes,
        migration.cumulative_rls_policies,
      ].join("|"),
    );
  }

  for (const readback of manifest.readback_sql) {
    lines.push(
      `readback=${readback.phase}|${readback.file}|${readback.sha256}`,
    );
  }

  for (const [key, value] of Object.entries(manifest.final_expected_shape)) {
    lines.push(`shape.${key}=${Array.isArray(value) ? value.join(",") : value}`);
  }
  for (const flag of manifest.feature_flags_must_remain_disabled) {
    lines.push(`disabled_flag=${flag}`);
  }
  for (const flag of manifest.excluded_from_rollout) {
    lines.push(`excluded_flag=${flag}`);
  }

  return sha256(lines.join("\n"));
}

function psLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function base64(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

function powerShellTextFromBase64(value) {
  return (
    "[System.Text.Encoding]::UTF8.GetString(" +
    `[Convert]::FromBase64String(${psLiteral(base64(value))}))`
  );
}

function runPowerShell(body, { env = {} } = {}) {
  const childEnv = { ...process.env, ...env };
  delete childEnv.GROOKAI_BINDER_PROD_APPLY_ACK;
  delete childEnv.GROOKAI_BINDER_PROD_BACKUP_ACK;
  Object.assign(childEnv, env);

  const command = [
    "$ErrorActionPreference = 'Stop'",
    `Import-Module ${psLiteral(absolute(MODULE_PATH))} -Force`,
    body,
  ].join("; ");

  return spawnSync(
    "pwsh",
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      command,
    ],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: childEnv,
      windowsHide: true,
    },
  );
}

function assertPowerShellSuccess(result, label) {
  assert.equal(
    result.error,
    undefined,
    `${label}: could not launch pwsh: ${result.error?.message ?? ""}`,
  );
  assert.equal(
    result.status,
    0,
    `${label}: ${result.stderr || result.stdout}`,
  );
}

function parsePowerShellJson(result, label) {
  assertPowerShellSuccess(result, label);
  return JSON.parse(result.stdout.trim());
}

function stripSqlCommentsAndStrings(sql) {
  return sql
    .replace(/--[^\r\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'(?:''|[^'])*'/g, "''");
}

test("Binder rollout manifest is the exact reviewed content-addressed package", () => {
  const manifest = JSON.parse(source(MANIFEST_PATH));

  assert.equal(manifest.schema_version, 1);
  assert.equal(manifest.package_id, PACKAGE_ID);
  assert.equal(manifest.package_fingerprint_sha256, PACKAGE_FINGERPRINT);
  assert.equal(manifest.required_ancestor_sha, REQUIRED_ANCESTOR_SHA);
  assert.equal(manifest.production_project_ref, PRODUCTION_PROJECT_REF);
  assert.equal(
    manifest.canonical_git_repository,
    "OriginalSoseji/grookai_vault",
  );
  assert.deepEqual(manifest.migrations, EXPECTED_MIGRATIONS);
  assert.deepEqual(manifest.readback_sql, EXPECTED_READBACK_SQL);
  assert.deepEqual(manifest.final_expected_shape, {
    tables: 21,
    functions: 124,
    indexes: 65,
    rls_policies: 22,
    feature_flags: 11,
    enabled_feature_flags: 0,
    public_execute_functions: 0,
    anonymous_raw_privileges: 0,
    anonymous_raw_sequence_privileges: 0,
    authenticated_raw_mutations: 0,
    authenticated_raw_sequence_privileges: 0,
    authenticated_raw_select_tables: ["binder_refresh_signals"],
    realtime_tables: ["binder_refresh_signals"],
  });
  assert.deepEqual(manifest.feature_flags_must_remain_disabled, EXPECTED_FLAGS);
  assert.deepEqual(manifest.excluded_from_rollout, EXCLUDED_FLAGS);
  assert.equal(packageFingerprint(manifest), PACKAGE_FINGERPRINT);

  for (const migration of EXPECTED_MIGRATIONS) {
    const relativePath = `supabase/migrations/${migration.file}`;
    assert.equal(
      sha256(bytes(relativePath)),
      migration.sha256,
      `${migration.file} byte hash`,
    );
  }

  const schemaMigration = source(
    `supabase/migrations/${EXPECTED_MIGRATIONS[0].file}`,
  );
  assert.match(
    schemaMigration,
    /revoke all on sequence public\.binder_rate_limit_events_id_seq\s+from public, anon, authenticated;/i,
  );
  assert.match(
    schemaMigration,
    /grant all on sequence public\.binder_rate_limit_events_id_seq\s+to service_role;/i,
  );
});

test("PowerShell policy agrees exactly with the immutable manifest", () => {
  const policy = parsePowerShellJson(
    runPowerShell(
      "Get-BinderRolloutPolicyV1 | ConvertTo-Json -Depth 12 -Compress",
    ),
    "policy",
  );

  assert.equal(policy.PackageId, PACKAGE_ID);
  assert.equal(policy.PackageFingerprintSha256, PACKAGE_FINGERPRINT);
  assert.equal(policy.ProjectRef, PRODUCTION_PROJECT_REF);
  assert.equal(policy.RequiredAncestorSha, REQUIRED_ANCESTOR_SHA);
  assert.equal(policy.SupportedSupabaseCliVersion, "2.90.0");
  assert.equal(
    policy.SupabaseCliLauncherSha256,
    "140e3801d8adeda639a21b14e62b93a4c7d26b7a758421f43c82be59753be49b",
  );
  assert.equal(
    policy.SupabaseCliBinarySha256,
    "31c2a25bd590a36ad803a7c669cf76a62eac3cd5aa7112eeb2e1c5f308c8b39c",
  );
  assert.equal(
    policy.SupabaseCliShimDescriptorSha256,
    "0c68f69a367b2b76e61f3e71fb98c9a867143628a361a2e715dd30f33c4b2c3f",
  );
  assert.equal(
    policy.PreflightSqlSha256,
    READBACK_SQL_HASHES[PREFLIGHT_SQL_PATH],
  );
  assert.equal(
    policy.PostApplySqlSha256,
    READBACK_SQL_HASHES[POST_APPLY_SQL_PATH],
  );
  assert.deepEqual(
    policy.MigrationVersions,
    EXPECTED_MIGRATIONS.map((migration) => migration.version),
  );
  assert.deepEqual(
    policy.MigrationFiles,
    EXPECTED_MIGRATIONS.map((migration) => migration.file),
  );
  assert.deepEqual(
    policy.MigrationSha256,
    EXPECTED_MIGRATIONS.map((migration) => migration.sha256),
  );
  assert.deepEqual(policy.FeatureFlags, EXPECTED_FLAGS);
  assert.deepEqual(policy.ExcludedFlags, EXCLUDED_FLAGS);
  assert.deepEqual(policy.ApplyArguments, [
    "db",
    "push",
    "--linked",
    "--yes",
  ]);
});

test("both catalog readbacks are immutable single-statement read-only SQL", () => {
  const forbiddenKeywords =
    /\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|copy|call|do|vacuum|analyze|refresh|lock|set|reset|listen|notify|unlisten|discard|prepare|execute|deallocate|cluster|reindex|checkpoint|into)\b/i;
  const sideEffectFunctions =
    /\b(pg_notify|set_config|nextval|setval|dblink(?:_exec)?|lo_(?:import|export|unlink)|pg_(?:advisory|try_advisory|terminate_backend|cancel_backend|reload_conf))\s*\(/i;

  for (const [relativePath, expectedHash] of Object.entries(
    READBACK_SQL_HASHES,
  )) {
    const sql = source(relativePath);
    const executable = stripSqlCommentsAndStrings(sql);

    assert.equal(sha256(bytes(relativePath)), expectedHash, relativePath);
    assert.match(executable.trimStart(), /^with\b/i, relativePath);
    assert.equal(executable.includes(";"), false, relativePath);
    assert.doesNotMatch(executable, forbiddenKeywords, relativePath);
    assert.doesNotMatch(executable, sideEffectFunctions, relativePath);
    assert.doesNotMatch(executable, /\bfor\s+(?:update|share)\b/i, relativePath);
    assert.match(sql, /'read_only',\s*true/i, relativePath);
    assert.match(sql, /as rollout_readback\s+from snapshot\s*$/i, relativePath);
  }
});

test("catalog readbacks cover prerequisites and exact post-apply security shape", () => {
  const preflight = source(PREFLIGHT_SQL_PATH);
  const postApply = source(POST_APPLY_SQL_PATH);

  for (const marker of [
    "required_columns(schema_name, table_name, column_name, data_type)",
    "required_function_bodies(function_signature, body_sha256)",
    "missing_columns as (",
    "drifted_functions as (",
    "stable_catalog_fingerprint as (",
    "'stable_catalog_fingerprint_sha256'",
    "c.relkind in ('r', 'p')",
    "external_trigger_name_collisions as (",
    "reviewed_public_default_acl_fingerprint as (",
    "unexpected_schema_create_privileges as (",
    "realtime_publication_config_fingerprint as (",
    "server_major_version_ok",
  ]) {
    assert.ok(preflight.includes(marker), `preflight missing ${marker}`);
  }

  for (const marker of [
    "function_arguments",
    "function_owner",
    "function_acl_fingerprint as (",
    "index_fingerprint as (",
    "policy_fingerprint as (",
    "trigger_fingerprint as (",
    "table_acl_fingerprint as (",
    "binder_identity_sequence_shape_fingerprint as (",
    "binder_identity_sequence_acl_fingerprint as (",
    "realtime_binder_projection_fingerprint as (",
    "unexpected_schema_create_privileges as (",
    "stable_catalog_fingerprint as (",
    "external_trigger_map",
    "binder_function_acl_fingerprint_sha256",
    "binder_index_fingerprint_sha256",
    "binder_policy_fingerprint_sha256",
    "binder_trigger_fingerprint_sha256",
    "binder_table_acl_fingerprint_sha256",
    "enabled_flag_count = 0",
    "server_major_version_ok",
  ]) {
    assert.ok(postApply.includes(marker), `post-apply missing ${marker}`);
  }
  for (const [label, sql] of [
    ["preflight", preflight],
    ["post-apply", postApply],
  ]) {
    assert.match(
      sql,
      /current_setting\('server_version_num'\)::integer\s*\/\s*10000\s*=\s*17/i,
      `${label} must require PostgreSQL major 17`,
    );
    assert.match(
      sql,
      /execution_role\s*=\s*'postgres'\s+and\s+server_major_version_ok/i,
      `${label} must require execution as postgres`,
    );
  }

  assert.match(
    postApply,
    /replace\(pg_get_function_identity_arguments\(p\.oid\), 'public\.', ''\)/,
  );
  assert.match(
    postApply,
    /has_function_privilege\('authenticated', oid, 'EXECUTE'\)/,
  );
  assert.match(
    postApply,
    /has_table_privilege\([\s\S]*?'authenticated'[\s\S]*?'SELECT'/,
  );
});

test("migration-list parser accepts ANSI/CRLF and the exact pending set", () => {
  const ledgerText = [
    "\u001b[32m Local          | Remote         | Time (UTC)\u001b[0m",
    "----------------|----------------|---------------------",
    "20260715120000  | 20260715120000 | 2026-07-15 12:00:00",
    ...EXPECTED_MIGRATIONS.map(
      (migration) =>
        `${migration.version}  |                | 2026-07-23 10:00:00`,
    ),
    "",
  ].join("\r\n");

  const body = [
    `$text = ${powerShellTextFromBase64(ledgerText)}`,
    "$ledger = ConvertFrom-SupabaseMigrationListV1 -Text $text",
    "Assert-ExactBinderPendingSetV1 -Ledger $ledger",
    "ConvertTo-Json -InputObject $ledger -Depth 12 -Compress",
  ].join("; ");
  const ledger = parsePowerShellJson(
    runPowerShell(body),
    "exact migration ledger",
  );

  assert.equal(ledger.Rows.length, 6);
  assert.equal(ledger.Shared.length, 1);
  assert.equal(ledger.LocalOnly.length, 5);
  assert.equal(ledger.RemoteOnly.length, 0);
  assert.deepEqual(
    ledger.LocalOnly.map((row) => row.Local),
    EXPECTED_MIGRATIONS.map((migration) => migration.version),
  );
});

test("migration-list guard rejects extra and remote-only migration rows", () => {
  const exactRows = [
    "20260715120000 | 20260715120000 | baseline",
    ...EXPECTED_MIGRATIONS.map(
      (migration) => `${migration.version} | | pending`,
    ),
  ];
  const cases = [
    {
      label: "extra pending",
      text: [...exactRows, "20260723105000 | | unexpected"].join("\n"),
      expected: /Pending migration count is not exactly five/i,
    },
    {
      label: "remote only",
      text: [...exactRows, "| 20260723105000 | remote-only"].join("\n"),
      expected: /Remote-only migrations detected/i,
    },
  ];

  for (const fixture of cases) {
    const body = [
      `$text = ${powerShellTextFromBase64(fixture.text)}`,
      "$ledger = ConvertFrom-SupabaseMigrationListV1 -Text $text",
      "Assert-ExactBinderPendingSetV1 -Ledger $ledger",
    ].join("; ");
    const result = runPowerShell(body);

    assert.notEqual(result.status, 0, fixture.label);
    assert.match(
      `${result.stderr}\n${result.stdout}`,
      fixture.expected,
      fixture.label,
    );
  }
});

test("post-apply ledger delta is exactly the five Binder versions", () => {
  const baseline = "20260715120000 | 20260715120000 | baseline";
  const beforeText = [
    baseline,
    ...EXPECTED_MIGRATIONS.map(
      (migration) => `${migration.version} | | pending`,
    ),
  ].join("\n");
  const exactAfterText = [
    baseline,
    ...EXPECTED_MIGRATIONS.map(
      (migration) =>
        `${migration.version} | ${migration.version} | applied`,
    ),
  ].join("\n");
  const exactBody = [
    `$beforeText = ${powerShellTextFromBase64(beforeText)}`,
    `$afterText = ${powerShellTextFromBase64(exactAfterText)}`,
    "$before = ConvertFrom-SupabaseMigrationListV1 -Text $beforeText",
    "$after = ConvertFrom-SupabaseMigrationListV1 -Text $afterText",
    "$module = Get-Module CollaborativeBindersProductionRolloutV1",
    "& $module { param($beforeLedger, $afterLedger) " +
      "Assert-ExactBinderLedgerDeltaV1 " +
      "-Before $beforeLedger -After $afterLedger } $before $after",
    "'pass' | ConvertTo-Json -Compress",
  ].join("; ");
  assert.equal(
    parsePowerShellJson(runPowerShell(exactBody), "exact ledger delta"),
    "pass",
  );

  const injectedAfterText = [
    exactAfterText,
    "20260723105000 | 20260723105000 | injected",
  ].join("\n");
  const injectedBody = [
    `$beforeText = ${powerShellTextFromBase64(beforeText)}`,
    `$afterText = ${powerShellTextFromBase64(injectedAfterText)}`,
    "$before = ConvertFrom-SupabaseMigrationListV1 -Text $beforeText",
    "$after = ConvertFrom-SupabaseMigrationListV1 -Text $afterText",
    "$module = Get-Module CollaborativeBindersProductionRolloutV1",
    "& $module { param($beforeLedger, $afterLedger) " +
      "Assert-ExactBinderLedgerDeltaV1 " +
      "-Before $beforeLedger -After $afterLedger } $before $after",
  ].join("; ");
  const injected = runPowerShell(injectedBody);
  assert.notEqual(injected.status, 0);
  assert.match(
    `${injected.stderr}\n${injected.stdout}`,
    /Remote migration delta is not exactly five/i,
  );
});

test("dry-run parser accepts only the five exact filenames in order", () => {
  const exactText = [
    "\u001b[36mDRY RUN\u001b[0m",
    ...EXPECTED_MIGRATIONS.map(
      (migration) => `Would apply migration ${migration.file}`,
    ),
  ].join("\n");
  const successBody = [
    `$text = ${powerShellTextFromBase64(exactText)}`,
    "$parsed = ConvertFrom-SupabaseDryRunV1 -Text $text",
    "ConvertTo-Json -InputObject $parsed -Depth 8 -Compress",
  ].join("; ");
  const parsed = parsePowerShellJson(
    runPowerShell(successBody),
    "exact dry run",
  );
  assert.deepEqual(
    parsed.MigrationFiles,
    EXPECTED_MIGRATIONS.map((migration) => migration.file),
  );

  const wrongOrder = [
    "DRY RUN",
    `Would apply migration ${EXPECTED_MIGRATIONS[1].file}`,
    `Would apply migration ${EXPECTED_MIGRATIONS[0].file}`,
    ...EXPECTED_MIGRATIONS.slice(2).map(
      (migration) => `Would apply migration ${migration.file}`,
    ),
  ].join("\n");
  const failureBody = [
    `$text = ${powerShellTextFromBase64(wrongOrder)}`,
    "ConvertFrom-SupabaseDryRunV1 -Text $text",
  ].join("; ");
  const failure = runPowerShell(failureBody);
  assert.notEqual(failure.status, 0);
  assert.match(
    `${failure.stderr}\n${failure.stdout}`,
    /Dry-run migration order mismatch/i,
  );
});

test("tracked migration inventory rejects an untracked top-level SQL file", () => {
  const script = `
$osTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\\', '/')
$fixture = Join-Path $osTemp ('binder-migration-set-fixture-' + [guid]::NewGuid().ToString('N'))
if ((Split-Path -Parent $fixture) -cne $osTemp) { throw 'unsafe fixture path' }
try {
  [void][IO.Directory]::CreateDirectory((Join-Path $fixture 'supabase/migrations'))
  $migration = Join-Path $fixture 'supabase/migrations/20260723100000_fixture.sql'
  [IO.File]::WriteAllText($migration, 'select 1;')
  $null = & git -C $fixture init --quiet 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'fixture git init failed' }
  $null = & git -C $fixture add -- 'supabase/migrations/20260723100000_fixture.sql' 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'fixture git add failed' }
  $module = Get-Module CollaborativeBindersProductionRolloutV1
  $exact = & $module {
    param($root)
    Get-BinderTrackedMigrationSetV1 -RepoRoot $root
  } $fixture
  [IO.File]::WriteAllText(
    (Join-Path $fixture 'supabase/migrations/20260723100001_injected.sql'),
    'select 2;'
  )
  $failure = ''
  try {
    [void](& $module {
      param($root)
      Get-BinderTrackedMigrationSetV1 -RepoRoot $root
    } $fixture)
  } catch {
    $failure = $_.Exception.Message
  }
  [pscustomobject]@{
    ExactCount = $exact.Count
    ExactFingerprint = $exact.Sha256
    Failure = $failure
  } | ConvertTo-Json -Compress
} finally {
  if (
    (Test-Path -LiteralPath $fixture) -and
    (Split-Path -Parent ([IO.Path]::GetFullPath($fixture))) -ceq $osTemp
  ) {
    foreach ($file in [IO.Directory]::EnumerateFiles(
      $fixture,
      '*',
      [IO.SearchOption]::AllDirectories
    )) {
      [IO.File]::SetAttributes($file, [IO.FileAttributes]::Normal)
    }
    [IO.Directory]::Delete($fixture, $true)
  }
}
`;
  const body =
    `& ([scriptblock]::Create(${powerShellTextFromBase64(script)}))`;
  const result = parsePowerShellJson(
    runPowerShell(body),
    "tracked migration inventory",
  );
  assert.equal(result.ExactCount, 1);
  assert.match(result.ExactFingerprint, /^[0-9a-f]{64}$/);
  assert.match(
    result.Failure,
    /does not exactly match the tracked top-level SQL set/i,
  );
});

test("staged Supabase source denies migration writes and cleans safely", () => {
  const script = `
$osTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\\', '/')
$fixture = Join-Path $osTemp ('binder-stage-fixture-' + [guid]::NewGuid().ToString('N'))
if ((Split-Path -Parent $fixture) -cne $osTemp) { throw 'unsafe fixture path' }
$stage = $null
try {
  [void][IO.Directory]::CreateDirectory((Join-Path $fixture 'supabase/migrations'))
  [void][IO.Directory]::CreateDirectory((Join-Path $fixture 'supabase/.temp'))
  [IO.File]::WriteAllText(
    (Join-Path $fixture 'supabase/config.toml'),
    'project_id = "${PRODUCTION_PROJECT_REF}"'
  )
  [IO.File]::WriteAllText(
    (Join-Path $fixture 'supabase/.temp/project-ref'),
    '${PRODUCTION_PROJECT_REF}'
  )
  $migration = Join-Path $fixture 'supabase/migrations/20260723100000_fixture.sql'
  [IO.File]::WriteAllText($migration, 'select 1;')
  $hash = (Get-FileHash -LiteralPath $migration -Algorithm SHA256).Hash.ToLowerInvariant()
  $module = Get-Module CollaborativeBindersProductionRolloutV1
  $setHash = & $module {
    param($line)
    Get-BinderSha256StringV1 -Value $line
  } ("supabase/migrations/20260723100000_fixture.sql|" + $hash)
  $set = [pscustomobject]@{
    Count = 1
    Sha256 = $setHash
    Entries = @([pscustomobject]@{
      RelativePath = 'supabase/migrations/20260723100000_fixture.sql'
      FullPath = $migration
      Sha256 = $hash
    })
  }
  $stage = & $module {
    param($root, $migrationSet)
    New-BinderSupabaseStageV1 -RepoRoot $root -TrackedMigrationSet $migrationSet
  } $fixture $set

  $createDenied = $false
  try {
    [IO.File]::WriteAllText(
      (Join-Path $stage.MigrationDirectory '20260723100001_injected.sql'),
      'select 2;'
    )
  } catch {
    $exception = $_.Exception
    $createDenied = (
      $exception -is [UnauthorizedAccessException] -or
      $exception.InnerException -is [UnauthorizedAccessException]
    )
  }
  $writeDenied = $false
  try {
    [IO.File]::WriteAllText(
      (Join-Path $stage.MigrationDirectory '20260723100000_fixture.sql'),
      'changed'
    )
  } catch {
    $writeDenied = $true
  }
  $sealedManifest = $stage.SealedManifest
  $cleanup = & $module {
    param($value)
    Close-BinderSupabaseStageV1 -Stage $value
  } $stage
  $stage = $null
  $failedLifecycle = [pscustomobject]@{
    CreatedRoot = $null
    CleanupAttempted = $false
    CleanupSucceeded = $null
    CleanupMessage = ''
  }
  $badSet = [pscustomobject]@{
    Count = 1
    Sha256 = ('0' * 64)
    Entries = $set.Entries
  }
  $constructionFailure = ''
  try {
    [void](& $module {
      param($root, $migrationSet, $lifecycle)
      New-BinderSupabaseStageV1 -RepoRoot $root -TrackedMigrationSet $migrationSet -StageLifecycle $lifecycle
    } $fixture $badSet $failedLifecycle)
  } catch {
    $constructionFailure = $_.Exception.Message
  }
  [pscustomobject]@{
    CreateDenied = $createDenied
    WriteDenied = $writeDenied
    CleanupSucceeded = $cleanup.Succeeded
    StageExistsAfterCleanup = Test-Path -LiteralPath $cleanup.Root
    SealedManifest = $sealedManifest
    ConstructionFailure = $constructionFailure
    InternalCleanupAttempted = $failedLifecycle.CleanupAttempted
    InternalCleanupSucceeded = $failedLifecycle.CleanupSucceeded
    InternalStageExists = if ($null -ne $failedLifecycle.CreatedRoot) {
      Test-Path -LiteralPath $failedLifecycle.CreatedRoot
    } else {
      $false
    }
  } | ConvertTo-Json -Depth 8 -Compress
} finally {
  if ($null -ne $stage) {
    [void](& (Get-Module CollaborativeBindersProductionRolloutV1) {
      param($value)
      Close-BinderSupabaseStageV1 -Stage $value
    } $stage)
  }
  if (
    (Test-Path -LiteralPath $fixture) -and
    (Split-Path -Parent ([IO.Path]::GetFullPath($fixture))) -ceq $osTemp
  ) {
    [IO.Directory]::Delete($fixture, $true)
  }
}
`;
  const body =
    `& ([scriptblock]::Create(${powerShellTextFromBase64(script)}))`;
  const result = parsePowerShellJson(
    runPowerShell(body),
    "immutable staged Supabase source",
  );
  assert.equal(result.CreateDenied, true);
  assert.equal(result.WriteDenied, true);
  assert.equal(result.CleanupSucceeded, true);
  assert.equal(result.StageExistsAfterCleanup, false);
  assert.match(
    result.ConstructionFailure,
    /Staged migration-set fingerprint mismatch/i,
  );
  assert.equal(result.InternalCleanupAttempted, true);
  assert.equal(result.InternalCleanupSucceeded, true);
  assert.equal(result.InternalStageExists, false);
  assert.equal(result.SealedManifest.migration_count, 1);
  assert.equal(result.SealedManifest.migration_set_sha256.length, 64);
  assert.equal(result.SealedManifest.config_sha256.length, 64);
  assert.equal(result.SealedManifest.project_ref, PRODUCTION_PROJECT_REF);
  assert.deepEqual(result.SealedManifest.migrations, [
    {
      file: "20260723100000_fixture.sql",
      sha256: result.SealedManifest.migrations[0].sha256,
    },
  ]);
  assert.equal(
    JSON.stringify(result.SealedManifest).includes("binder-stage-fixture-"),
    false,
  );
});

test("process lifecycle marks started only after a successful process start", () => {
  const body = [
    "$module = Get-Module CollaborativeBindersProductionRolloutV1",
    "$successLifecycle = [pscustomobject]@{ Started = $false; StartedAtUtc = $null }",
    "$pwshPath = (Get-Command pwsh).Source",
    "$success = & $module { param($file, $root, $lifecycle) " +
      "Invoke-BinderProcessV1 -FilePath $file " +
      "-Arguments @('-NoProfile','-NonInteractive','-Command','exit 0') " +
      "-WorkingDirectory $root -TimeoutSeconds 10 " +
      "-ProcessLifecycle $lifecycle } " +
      "$pwshPath " +
      `${psLiteral(REPO_ROOT)} ` +
      "$successLifecycle",
    "$failedLifecycle = [pscustomobject]@{ Started = $false; StartedAtUtc = $null }",
    "$startFailure = ''",
    "try { & $module { param($root, $lifecycle) " +
      "Invoke-BinderProcessV1 " +
      "-FilePath (Join-Path $root 'definitely-missing-binder-tool.exe') " +
      "-Arguments @('--version') -WorkingDirectory $root -TimeoutSeconds 10 " +
      "-ProcessLifecycle $lifecycle } " +
      `${psLiteral(REPO_ROOT)} $failedLifecycle } ` +
      "catch { $startFailure = $_.Exception.Message }",
    "[pscustomobject]@{ " +
      "SuccessStarted = $successLifecycle.Started; " +
      "SuccessTimestamp = $successLifecycle.StartedAtUtc; " +
      "SuccessExitCode = $success.ExitCode; " +
      "FailedStarted = $failedLifecycle.Started; " +
      "StartFailure = $startFailure " +
      "} | ConvertTo-Json -Compress",
  ].join("; ");
  const result = parsePowerShellJson(
    runPowerShell(body),
    "process lifecycle",
  );
  assert.equal(result.SuccessStarted, true);
  assert.match(result.SuccessTimestamp, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(result.SuccessExitCode, 0);
  assert.equal(result.FailedStarted, false);
  assert.match(result.StartFailure, /unable to start|cannot find|no such/i);
});

test("apply command plan is private, gated, and contains one exact mutating argv", () => {
  const externalCall = runPowerShell(
    "New-BinderApplyCommandPlanV1 -AuthorizationValidated $true",
  );
  assert.notEqual(externalCall.status, 0);
  assert.match(
    `${externalCall.stderr}\n${externalCall.stdout}`,
    /New-BinderApplyCommandPlanV1.*not recognized/is,
  );

  const blocked = runPowerShell(
    "$module = Get-Module CollaborativeBindersProductionRolloutV1; " +
      "& $module { New-BinderApplyCommandPlanV1 -AuthorizationValidated $false }",
  );
  assert.notEqual(blocked.status, 0);
  assert.match(
    `${blocked.stderr}\n${blocked.stdout}`,
    /cannot be constructed before authorization validation/i,
  );

  const plan = parsePowerShellJson(
    runPowerShell(
      "$module = Get-Module CollaborativeBindersProductionRolloutV1; " +
        "$plan = @(& $module { " +
        "New-BinderApplyCommandPlanV1 -AuthorizationValidated $true }); " +
        "ConvertTo-Json -InputObject $plan -Depth 8 -Compress",
    ),
    "apply plan",
  );
  assert.deepEqual(plan, [
    {
      Tool: "supabase",
      Arguments: ["db", "push", "--linked", "--yes"],
      MutatesRemote: true,
    },
  ]);
});

test("production apply requires both exact acknowledgements and confirmation", () => {
  const fakeManifest = {
    head_sha: "0123456789abcdef0123456789abcdef01234567",
    manifest_fingerprint_sha256: "a".repeat(64),
    backup_evidence_sha256: "b".repeat(64),
  };
  const manifestExpression =
    `ConvertFrom-Json ${psLiteral(JSON.stringify(fakeManifest))}`;
  const expectedApply =
    `APPLY-COLLABORATIVE-BINDERS-V1::${PRODUCTION_PROJECT_REF}::` +
    `${fakeManifest.head_sha}::${fakeManifest.manifest_fingerprint_sha256}`;
  const expectedBackup =
    `BACKUP-VERIFIED::${PRODUCTION_PROJECT_REF}::` +
    fakeManifest.backup_evidence_sha256;

  const exact = runPowerShell(
    `$manifest = ${manifestExpression}; ` +
      "Assert-BinderApplyAuthorizationV1 " +
      "-PreflightManifest $manifest -ConfirmProduction $true | " +
      "ConvertTo-Json -Compress",
    {
      env: {
        GROOKAI_BINDER_PROD_APPLY_ACK: expectedApply,
        GROOKAI_BINDER_PROD_BACKUP_ACK: expectedBackup,
      },
    },
  );
  assert.equal(parsePowerShellJson(exact, "exact authorization"), true);

  const noConfirmation = runPowerShell(
    `$manifest = ${manifestExpression}; ` +
      "Assert-BinderApplyAuthorizationV1 " +
      "-PreflightManifest $manifest -ConfirmProduction $false",
    {
      env: {
        GROOKAI_BINDER_PROD_APPLY_ACK: expectedApply,
        GROOKAI_BINDER_PROD_BACKUP_ACK: expectedBackup,
      },
    },
  );
  assert.notEqual(noConfirmation.status, 0);
  assert.match(
    `${noConfirmation.stderr}\n${noConfirmation.stdout}`,
    /requires -ConfirmProduction/i,
  );

  const nearMiss = runPowerShell(
    `$manifest = ${manifestExpression}; ` +
      "Assert-BinderApplyAuthorizationV1 " +
      "-PreflightManifest $manifest -ConfirmProduction $true",
    {
      env: {
        GROOKAI_BINDER_PROD_APPLY_ACK: `${expectedApply} `,
        GROOKAI_BINDER_PROD_BACKUP_ACK: expectedBackup,
      },
    },
  );
  assert.notEqual(nearMiss.status, 0);
  assert.match(
    `${nearMiss.stderr}\n${nearMiss.stdout}`,
    /acknowledgement is missing or not exact/i,
  );
});

test("apply implementation revalidates every source guard before its sole push", () => {
  const moduleSource = source(MODULE_PATH);
  const applyStart = moduleSource.indexOf(
    "function Invoke-BinderProductionApplyV1",
  );
  const applyEnd = moduleSource.indexOf(
    "\nExport-ModuleMember",
    applyStart,
  );
  assert.ok(applyStart >= 0 && applyEnd > applyStart);
  const applySource = moduleSource.slice(applyStart, applyEnd);

  const orderedMarkers = [
    "Test-PreflightManifestV1 -Path $ManifestPath",
    "Test-BinderSourceV1 -RepoRoot $RepoRoot",
    "Assert-BinderRepositoryStateV1",
    "Assert-ProjectBindingV1",
    "Test-BackupEvidenceV1",
    "Get-BinderLedgerV1 -RepoRoot $RepoRoot -ExpectedState PreApply",
    "Invoke-BinderReadbackV1 -RepoRoot $RepoRoot -ExpectedState PreApply",
    "Get-BinderDryRunV1 -RepoRoot $RepoRoot",
    "Assert-BinderApplyAuthorizationV1",
    "Get-BinderTrackedMigrationSetV1 -RepoRoot $RepoRoot",
    "Open-BinderApplySealV1",
    "Assert-BinderFinalLocalSealV1",
    "New-BinderApplyCommandPlanV1",
    "New-BinderSupabaseStageV1",
    "-Arguments @($plan[0].Arguments)",
    "-RepoRoot $stage.Root",
  ];
  let previous = -1;
  for (const marker of orderedMarkers) {
    const index = applySource.indexOf(marker);
    assert.ok(index > previous, `missing or out-of-order apply guard: ${marker}`);
    previous = index;
  }

  assert.equal(
    (
      applySource.match(
        /-Arguments\s+@\(\$plan\[0\]\.Arguments\)/g,
      ) ?? []
    ).length,
    1,
  );
  assert.match(
    applySource,
    /Get-BinderLedgerV1[\s\S]*?-RepoRoot \$RepoRoot[\s\S]*?-ExpectedState PostApply/,
  );
  assert.match(
    applySource,
    /Invoke-BinderReadbackV1[\s\S]*?-RepoRoot \$RepoRoot[\s\S]*?-ExpectedState PostApply/,
  );
  assert.match(
    applySource,
    /Assert-ExactBinderLedgerDeltaV1[\s\S]*?-Before \$ledgerBefore\.Ledger[\s\S]*?-After \$ledgerAfter\.Ledger/,
  );
  assert.match(
    applySource,
    /Get-BinderLedgerV1 -RepoRoot \$RepoRoot -ExpectedState PreApply[\s\S]*?ledger\.before\.txt[\s\S]*?ledger\.before\.json[\s\S]*?\$pushAttempted = \$true/,
  );
  assert.match(
    applySource,
    /New-BinderSupabaseStageV1[\s\S]*?sealed-source-manifest\.json[\s\S]*?\$pushAttempted = \$true/,
  );
  assert.match(
    applySource,
    /if \(\s*\$pushLifecycle\.Started -and\s*\$pushLifecycle\.TerminationConfirmed\s*\)\s*\{[\s\S]*diagnosticLedger = Invoke-BinderSupabaseV1/,
  );
  assert.match(applySource, /push_attempted = \$pushAttempted/);
  assert.match(
    applySource,
    /push_started = \[bool\]\$pushLifecycle\.Started/,
  );
  assert.match(applySource, /push_succeeded = if \(\$null -ne \$push\)/);
  assert.match(
    applySource,
    /push_timed_out = \[bool\]\$pushLifecycle\.TimedOut/,
  );
  assert.match(
    applySource,
    /mutation_possible = \[bool\]\$pushLifecycle\.Started/,
  );
});

test("apply keeps one immutable execution identity through verification and diagnostics", () => {
  const moduleSource = source(MODULE_PATH);
  const applyStart = moduleSource.indexOf(
    "function Invoke-BinderProductionApplyV1",
  );
  const applyEnd = moduleSource.indexOf(
    "\nExport-ModuleMember",
    applyStart,
  );
  const applySource = moduleSource.slice(applyStart, applyEnd);
  const positions = [
    applySource.indexOf("Open-BinderApplySealV1"),
    applySource.indexOf("-Arguments @($plan[0].Arguments)"),
    applySource.indexOf("-ExpectedState PostApply"),
    applySource.indexOf("diagnosticLedger = Invoke-BinderSupabaseV1"),
    applySource.indexOf("diagnosticReadback = Invoke-BinderSupabaseV1"),
    applySource.indexOf("Close-BinderApplySealV1"),
  ];
  assert.ok(
    positions.every((position) => position >= 0),
    "all sealed apply phases must be present",
  );
  assert.deepEqual(
    [...positions].sort((left, right) => left - right),
    positions,
    "the apply seal must close only after verification and diagnostics",
  );
  assert.equal(
    (applySource.match(/Close-BinderApplySealV1/g) ?? []).length,
    1,
    "the apply seal must close exactly once",
  );
  assert.match(
    applySource,
    /finally\s*\{[\s\S]*?\$pushLifecycle\.TerminationConfirmed[\s\S]*?\[Environment\]::FailFast\([\s\S]*?Close-BinderApplySealV1 -Streams \$sealStreams\s*\}/,
  );
  assert.match(
    applySource,
    /Open-BinderApplySealV1[\s\S]*?-SupabaseExecutable \$supabaseExecutable/,
  );
  assert.match(
    applySource,
    /-Arguments @\(\$plan\[0\]\.Arguments\)[\s\S]*?-ExecutablePath \$supabaseExecutable\.BinaryPath/,
  );
  assert.match(
    applySource,
    /-ExpectedState PostApply[\s\S]*?-ExecutablePath \$supabaseExecutable\.BinaryPath/,
  );
  assert.match(
    applySource,
    /diagnosticLedger = Invoke-BinderSupabaseV1[\s\S]*?-ExecutablePath \$supabaseExecutable\.BinaryPath/,
  );
  assert.match(
    applySource,
    /diagnosticReadback = Invoke-BinderSupabaseV1[\s\S]*?-ExecutablePath \$supabaseExecutable\.BinaryPath/,
  );
  assert.match(
    applySource,
    /\$push = Invoke-BinderSupabaseV1[\s\S]*?\$pushSucceeded = \([\s\S]*?\)\s*\}\s*finally/,
    "push outcome must be captured before fallible cleanup",
  );

  const readbackStart = moduleSource.indexOf("function Invoke-BinderReadbackV1");
  const readbackEnd = moduleSource.indexOf(
    "\nfunction Get-BinderDryRunV1",
    readbackStart,
  );
  const readbackSource = moduleSource.slice(readbackStart, readbackEnd);
  const hashCheck = readbackSource.indexOf("Get-BinderSha256FileV1 -Path $sqlPath");
  const invocation = readbackSource.indexOf("Invoke-BinderSupabaseV1");
  assert.ok(hashCheck >= 0 && invocation > hashCheck);
  assert.match(readbackSource, /\$policy\.PreflightSqlSha256/);
  assert.match(readbackSource, /\$policy\.PostApplySqlSha256/);
  assert.match(
    readbackSource,
    /\$sqlSeal = \[System\.IO\.File\]::Open\([\s\S]*?\$sqlSeal\.Dispose\(\)/,
  );

  assert.match(
    moduleSource,
    /ShimDescriptorPath = \$shimDescriptorPath/,
  );
  assert.match(
    moduleSource,
    /\$SupabaseExecutable\.ShimDescriptorPath[\s\S]*?\$paths\.Add/,
  );
  assert.match(
    applySource,
    /\[CmdletBinding\(SupportsShouldProcess = \$true, ConfirmImpact = 'High'\)\]/,
  );
  assert.match(applySource, /\$PSCmdlet\.ShouldProcess\(/);
});

test("rollout executables expose no repair, force, routing, or flag-enable path", () => {
  const executableSource = [
    MODULE_PATH,
    PREFLIGHT_ENTRYPOINT_PATH,
    APPLY_ENTRYPOINT_PATH,
    READBACK_ENTRYPOINT_PATH,
  ]
    .map(source)
    .join("\n");

  assert.doesNotMatch(executableSource, /migration\s+repair/i);
  assert.doesNotMatch(executableSource, /--include-all\b/i);
  assert.doesNotMatch(executableSource, /--include-seed\b/i);
  assert.doesNotMatch(executableSource, /--include-roles\b/i);
  assert.doesNotMatch(executableSource, /--db-url\b/i);
  assert.doesNotMatch(executableSource, /--password\b/i);
  assert.doesNotMatch(
    executableSource,
    /Arguments\s+@\(\s*['"](?:link|db\s+pull|db\s+reset)/i,
  );
  assert.doesNotMatch(
    executableSource,
    /\b(?:insert\s+into|update|delete\s+from)\s+(?:public\.)?binder_feature_flags\b/i,
  );
  assert.doesNotMatch(
    executableSource,
    /(?:setx|\$env:)\s*(?:GROOKAI_)?BINDERS?_[A-Z0-9_]*(?:ENABLED|V1)\s*=\s*['"]?(?:true|1)/i,
  );
  assert.doesNotMatch(executableSource, /ValueFromRemainingArguments/i);

  const applyEntrypoint = source(APPLY_ENTRYPOINT_PATH);
  assert.match(applyEntrypoint, /SupportsShouldProcess\s*=\s*\$true/i);
  assert.match(applyEntrypoint, /\[switch\]\$ConfirmProduction/);
  assert.match(
    applyEntrypoint,
    /leave every feature flag disabled/i,
  );

  const moduleSource = source(MODULE_PATH);
  assert.match(
    moduleSource,
    /\$env:GROOKAI_BINDER_PROD_APPLY_ACK\s+-ceq\s+\$expectedApply/,
  );
  assert.match(
    moduleSource,
    /\$env:GROOKAI_BINDER_PROD_BACKUP_ACK\s+-ceq\s+\$expectedBackup/,
  );
  assert.match(
    moduleSource,
    /Invoke-BinderSupabaseV1[\s\S]*?-SanitizeDatabaseEnvironment/,
  );
  assert.match(moduleSource, /'PG\.\*\|'/);
  assert.match(moduleSource, /'POSTGRES\(\?:QL\)\?_URL\.\*\|'/);
  assert.match(moduleSource, /SUPABASE_CA_SKIP_VERIFY/);
  assert.match(moduleSource, /SUPABASE_INTERNAL_\.\*/);
  assert.match(moduleSource, /REDACTED_SUPABASE_ACCESS_TOKEN/);
  assert.match(moduleSource, /SupabaseCliLauncherSha256/);
  assert.match(moduleSource, /SupabaseCliBinarySha256/);
  assert.match(moduleSource, /SupabaseCliShimDescriptorSha256/);
  assert.match(moduleSource, /FileShare\]::Read/);
  assert.match(moduleSource, /Get-BinderTrackedMigrationSetV1/);
  assert.match(moduleSource, /GetTempPath\(\)/);
  assert.match(
    moduleSource,
    /FileSystemAccessRule\]::new\([\s\S]*?AccessControlType\]::Deny/,
  );
  assert.match(moduleSource, /FileSystemRights\]::WriteData/);
  assert.match(moduleSource, /FileSystemRights\]::AppendData/);
  assert.match(moduleSource, /FileSystemRights\]::WriteAttributes/);
  assert.match(moduleSource, /FileSystemRights\]::WriteExtendedAttributes/);
  assert.match(moduleSource, /InheritanceFlags\]::ContainerInherit/);
  assert.match(moduleSource, /InheritanceFlags\]::ObjectInherit/);
  assert.match(moduleSource, /Staged migration directory still permits file creation/);
  assert.match(
    moduleSource,
    /\$stage\.Streams = @\(\$streams\)[\s\S]*?Get-BinderSealedStageManifestV1 -Stage \$stage/,
  );
  assert.match(moduleSource, /Close-BinderSupabaseStageV1/);
  assert.match(moduleSource, /Write-BinderAtomicTextV1/);
  assert.match(moduleSource, /Write-BinderChecksumsV1/);
});

test("runbook keeps installation, activation, Set Binders, and P8 separate", () => {
  const runbook = source(RUNBOOK_PATH);

  assert.match(runbook, /Status: prepared, not applied/);
  assert.match(
    runbook,
    /does not activate Binders[\s\S]*enable any feature flag/i,
  );
  assert.match(runbook, /P8 is excluded/i);
  assert.match(runbook, /All 11 Binder flags must remain disabled/i);
  for (const flag of EXCLUDED_FLAGS) {
    assert.match(runbook, new RegExp(`\\\`${flag}\\\``));
  }
  assert.match(
    runbook,
    /There is exactly one permitted remote mutation command:[\s\S]*supabase db push --linked --yes/i,
  );
  assert.match(
    runbook,
    /never links, pulls, resets,\s*changes migration history, or writes feature flags/i,
  );
});
