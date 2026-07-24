import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const MODULE_PATH = path.join(
  REPO_ROOT,
  "scripts",
  "ops",
  "CollaborativeBindersUnattendedSupervisorV1.psm1",
);
const ENTRYPOINT_PATH = path.join(
  REPO_ROOT,
  "scripts",
  "ops",
  "collaborative_binders_unattended_supervisor_v1.ps1",
);
const ROLLOUT_MODULE_PATH = path.join(
  REPO_ROOT,
  "scripts",
  "ops",
  "CollaborativeBindersProductionRolloutV1.psm1",
);
const APPLY_ENTRYPOINT_PATH = path.join(
  REPO_ROOT,
  "scripts",
  "ops",
  "collaborative_binders_production_apply_v1.ps1",
);
const WORKFLOW_PATH = path.join(
  REPO_ROOT,
  ".github",
  "workflows",
  "contracts-runtime-protection.yml",
);
const WINDOWS_ONLY = process.platform === "win32";
const POWERSHELL = "pwsh.exe";
const NOW = "2026-07-24T12:00:00.0000000Z";
const BACKUP_FLOOR = "2026-07-24T10:25:37.891Z";
const PRODUCTION_PROJECT_REF = "ycdxbpibncqcchqiihfz";
const PROBE_PREFIX = "__BINDER_SUPERVISOR_PROBE__";

const moduleSource = readFileSync(MODULE_PATH, "utf8");
const entrypointSource = readFileSync(ENTRYPOINT_PATH, "utf8");
const rolloutSource = readFileSync(ROLLOUT_MODULE_PATH, "utf8");
const applyEntrypointSource = readFileSync(APPLY_ENTRYPOINT_PATH, "utf8");
const workflowSource = readFileSync(WORKFLOW_PATH, "utf8");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function psQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function encodedPowerShell(script) {
  return Buffer.from(script, "utf16le").toString("base64");
}

function runPowerShell(script, options = {}) {
  return spawnSync(
    POWERSHELL,
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-EncodedCommand",
      encodedPowerShell(script),
    ],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      env: options.env ?? process.env,
    },
  );
}

function probePowerShell(body) {
  const processResult = runPowerShell(`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Import-Module ${psQuote(MODULE_PATH)} -Force -ErrorAction Stop
try {
  $probeResult = & {
${body}
  }
  $payload = [ordered]@{
    ok = $true
    result = $probeResult
    exit_class = $null
    message = $null
  }
} catch {
  $exitClass = $null
  if ($_.Exception.Data.Contains('BinderSupervisorExitClass')) {
    $exitClass = [string]$_.Exception.Data['BinderSupervisorExitClass']
  }
  $payload = [ordered]@{
    ok = $false
    result = $null
    exit_class = $exitClass
    message = [string]$_.Exception.Message
  }
}
[Console]::Out.Write(
  ${psQuote(PROBE_PREFIX)} +
  ($payload | ConvertTo-Json -Compress -Depth 32)
)
`);
  assert.equal(
    processResult.status,
    0,
    `PowerShell probe failed.\nstdout: ${processResult.stdout}\nstderr: ${processResult.stderr}`,
  );
  const marker = processResult.stdout.lastIndexOf(PROBE_PREFIX);
  assert.notEqual(
    marker,
    -1,
    `PowerShell probe emitted no payload.\nstdout: ${processResult.stdout}\nstderr: ${processResult.stderr}`,
  );
  return JSON.parse(
    processResult.stdout.slice(marker + PROBE_PREFIX.length).trim(),
  );
}

function probeRolloutPowerShell(body) {
  const processResult = runPowerShell(`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Import-Module ${psQuote(ROLLOUT_MODULE_PATH)} -Force -ErrorAction Stop
try {
  $probeResult = & {
${body}
  }
  $payload = [ordered]@{
    ok = $true
    result = $probeResult
    message = $null
  }
} catch {
  $payload = [ordered]@{
    ok = $false
    result = $null
    message = [string]$_.Exception.Message
  }
}
[Console]::Out.Write(
  ${psQuote(PROBE_PREFIX)} +
  ($payload | ConvertTo-Json -Compress -Depth 32)
)
`);
  assert.equal(
    processResult.status,
    0,
    `Rollout PowerShell probe failed.\nstdout: ${processResult.stdout}\nstderr: ${processResult.stderr}`,
  );
  const marker = processResult.stdout.lastIndexOf(PROBE_PREFIX);
  assert.notEqual(
    marker,
    -1,
    `Rollout PowerShell probe emitted no payload.\nstdout: ${processResult.stdout}\nstderr: ${processResult.stderr}`,
  );
  return JSON.parse(
    processResult.stdout.slice(marker + PROBE_PREFIX.length).trim(),
  );
}

function backupJson(rows, overrides = {}) {
  return JSON.stringify({
    backups: rows,
    physical_backup_data: {},
    pitr_enabled: false,
    region: "us-east-2",
    walg_enabled: true,
    ...overrides,
  });
}

function backupRow(insertedAt, overrides = {}) {
  return {
    inserted_at: insertedAt,
    is_physical_backup: true,
    status: "COMPLETED",
    ...overrides,
  };
}

function probeBackup(json) {
  const encodedJson = Buffer.from(json, "utf8").toString("base64");
  return probePowerShell(`
    $json = [System.Text.Encoding]::UTF8.GetString(
      [Convert]::FromBase64String(${psQuote(encodedJson)})
    )
    Read-BinderBackupConfirmationV1 \`
      -Json $json \`
      -ProjectRef ${psQuote(PRODUCTION_PROJECT_REF)} \`
      -BackupNotBeforeUtc ${psQuote(BACKUP_FLOOR)} \`
      -NowUtc ([datetimeoffset]${psQuote(NOW)})
`);
}

function functionBody(source, functionName, nextMarker = "\nfunction ") {
  const start = source.indexOf(`function ${functionName}`);
  assert.notEqual(start, -1, `Missing ${functionName}`);
  const next = source.indexOf(nextMarker, start + 10);
  return source.slice(start, next === -1 ? source.length : next);
}

test("authorization reader is a closed, canonical, independently hash-bound envelope", () => {
  const propertyReader = functionBody(
    moduleSource,
    "Get-BinderUnattendedJsonObjectPropertiesV1",
  );
  const authorizationBytes = functionBody(
    moduleSource,
    "ConvertFrom-BinderUnattendedAuthorizationBytesV1",
  );
  const authorizationOpen = functionBody(
    moduleSource,
    "Open-BinderUnattendedAuthorizationV1",
  );

  assert.match(propertyReader, /field count does not match the closed V1 schema/);
  assert.match(propertyReader, /field order does not match the closed V1 schema/);
  assert.match(propertyReader, /OrdinalIgnoreCase/);
  assert.match(propertyReader, /duplicate or case-colliding JSON field/);
  assert.match(authorizationBytes, /UTF8Encoding\]::new\(\$false,\s*\$true\)/s);
  assert.match(authorizationBytes, /exact compact canonical UTF-8/);
  assert.match(authorizationBytes, /\$Bytes\[\$index\]\s+-ne\s+\$canonicalBytes\[\$index\]/);
  assert.match(
    authorizationOpen,
    /ExpectedAuthorizationSha256 must be an independently supplied lowercase SHA-256/,
  );
  assert.match(authorizationOpen, /\$actualSha256\s+-ceq\s+\$ExpectedAuthorizationSha256/);
  assert.doesNotMatch(authorizationOpen, /sidecar/i);
});

test(
  "authorization hash mismatch and a closed-schema violation both fail locally",
  { skip: !WINDOWS_ONLY },
  () => {
    const tempRoot = mkdtempSync(
      path.join(os.tmpdir(), "binder-supervisor-auth-"),
    );
    try {
      const canonicalTempRoot = realpathSync.native(tempRoot).replace(
        /^[a-z](?=:)/,
        (drive) => drive.toUpperCase(),
      );
      const authorizationPath = path.join(
        canonicalTempRoot,
        "authorization.json",
      );
      const bytes = Buffer.from("{}", "utf8");
      writeFileSync(authorizationPath, bytes);

      const wrongHash = probePowerShell(`
        Read-BinderUnattendedAuthorizationV1 \`
          -AuthorizationPath ${psQuote(authorizationPath)} \`
          -ExpectedAuthorizationSha256 $('0' * 64) \`
          -RepoRoot ${psQuote(REPO_ROOT)}
      `);
      assert.equal(wrongHash.ok, false);
      assert.match(wrongHash.message, /caller-supplied SHA-256/);

      const closedSchema = probePowerShell(`
        Read-BinderUnattendedAuthorizationV1 \`
          -AuthorizationPath ${psQuote(authorizationPath)} \`
          -ExpectedAuthorizationSha256 ${psQuote(sha256(bytes))} \`
          -RepoRoot ${psQuote(REPO_ROOT)}
      `);
      assert.equal(closedSchema.ok, false);
      assert.match(closedSchema.message, /closed V1 schema|field count/);

      const outerResult = spawnSync(
        POWERSHELL,
        [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-File",
          ENTRYPOINT_PATH,
          "-AuthorizationPath",
          authorizationPath,
          "-ExpectedAuthorizationSha256",
          "0".repeat(64),
        ],
        {
          cwd: REPO_ROOT,
          encoding: "utf8",
          maxBuffer: 1024 * 1024,
        },
      );
      assert.equal(outerResult.status, 40);
      const outerPayload = JSON.parse(outerResult.stdout);
      assert.equal(outerPayload.status, "stop");
      assert.equal(outerPayload.exit_class, "local_integrity_stop");
      assert.doesNotMatch(
        outerResult.stdout + outerResult.stderr,
        new RegExp(authorizationPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      );
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  },
);

test(
  "backup parser distinguishes wait and one exact fresh candidate",
  { skip: !WINDOWS_ONLY },
  () => {
    const wait = probeBackup(backupJson([]));
    assert.equal(wait.ok, true);
    assert.equal(wait.result.Status, "wait");
    assert.equal(wait.result.EligibleCount, 0);

    const candidate = probeBackup(
      backupJson([backupRow("2026-07-24T11:58:00Z")]),
    );
    assert.equal(candidate.ok, true);
    assert.equal(candidate.result.Status, "candidate");
    assert.equal(candidate.result.EligibleCount, 1);
    assert.equal(candidate.result.Region, "us-east-2");
    assert.match(candidate.result.BackupKey, /PHYSICAL\|COMPLETED$/);
  },
);

test(
  "future COMPLETED physical backup newer than the floor hard-stops",
  { skip: !WINDOWS_ONLY },
  () => {
    const result = probeBackup(
      backupJson([backupRow("2026-07-24T12:00:01Z")]),
    );
    assert.equal(result.ok, false);
    assert.equal(result.exit_class, "safe_stop_pre_mutation");
    assert.match(result.message, /future|clock|after the current/i);
  },
);

test(
  "already-stale COMPLETED physical backup newer than the floor hard-stops",
  { skip: !WINDOWS_ONLY },
  () => {
    const result = probeBackup(
      backupJson([backupRow("2026-07-24T11:54:59Z")]),
    );
    assert.equal(result.ok, false);
    assert.equal(result.exit_class, "safe_stop_pre_mutation");
    assert.match(result.message, /stale|older|five|age/i);
  },
);

test(
  "more than one eligible backup is ambiguous and hard-stops",
  { skip: !WINDOWS_ONLY },
  () => {
    const result = probeBackup(
      backupJson([
        backupRow("2026-07-24T11:58:00Z"),
        backupRow("2026-07-24T11:59:00Z"),
      ]),
    );
    assert.equal(result.ok, false);
    assert.equal(result.exit_class, "safe_stop_pre_mutation");
    assert.match(result.message, /ambiguous|more than one/i);
  },
);

test("preflight artifact equality checks are guarded by exact JSON primitive types", () => {
  const body = functionBody(
    moduleSource,
    "Test-BinderUnattendedPreflightArtifactsV1",
  );
  const requiredGuards = [
    [String.raw`\$manifest\.schema_version`, "long"],
    [String.raw`\$manifest\.tracked_migration_count`, "long"],
    [String.raw`\$repository\.Clean`, "bool"],
    [String.raw`\$readback\.read_only`, "bool"],
    [String.raw`\$readback\.ok`, "bool"],
    [String.raw`\$backupEvidence\.schema_version`, "long"],
    [String.raw`\$backupEvidence\.restore_path_reviewed`, "bool"],
    [String.raw`\$backupDigest\.RestorePathReviewed`, "bool"],
  ];
  for (const [field, type] of requiredGuards) {
    assert.match(
      body,
      new RegExp(`${field}\\s+-is\\s+\\[${type}\\]`, "i"),
      `${field} must reject a string that PowerShell -eq would coerce`,
    );
  }
});

test(
  "entrypoint import failure returns only a fixed generic JSON error",
  { skip: !WINDOWS_ONLY },
  () => {
    const tempRoot = mkdtempSync(
      path.join(os.tmpdir(), "binder-supervisor-entrypoint-"),
    );
    const copiedEntrypoint = path.join(
      tempRoot,
      "collaborative_binders_unattended_supervisor_v1.ps1",
    );
    const copiedModule = path.join(
      tempRoot,
      "CollaborativeBindersUnattendedSupervisorV1.psm1",
    );
    const secret = "sb_secret_NEVER_EXPOSE_THIS_TEST_VALUE";
    try {
      copyFileSync(ENTRYPOINT_PATH, copiedEntrypoint);
      writeFileSync(
        copiedModule,
        `throw '${secret} https://user:password@example.invalid/private'\n`,
        "utf8",
      );
      const result = spawnSync(
        POWERSHELL,
        [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-File",
          copiedEntrypoint,
          "-AuthorizationPath",
          path.join(tempRoot, "unused.json"),
          "-ExpectedAuthorizationSha256",
          "0".repeat(64),
        ],
        {
          cwd: tempRoot,
          encoding: "utf8",
          maxBuffer: 1024 * 1024,
        },
      );
      assert.equal(result.status, 40);
      const payload = JSON.parse(result.stdout);
      assert.deepEqual(payload, {
        status: "stop",
        exit_class: "local_integrity_stop",
        message: "The unattended supervisor module could not be loaded.",
      });
      assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret));
      assert.doesNotMatch(result.stdout + result.stderr, /user:password/);
      assert.doesNotMatch(
        result.stdout + result.stderr,
        new RegExp(tempRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      );
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  },
);

test(
  "redactor removes bearer, URL, query, JSON, JWT, and Supabase secrets",
  { skip: !WINDOWS_ONLY },
  () => {
    const secretText = [
      "Bearer abc.DEF_1234567890-xyz",
      "apikey=QUERY_SECRET_123456",
      '"password":"JSON_SECRET_123456"',
      "eyJheaderheader12.eyJpayloadpayload12.signature1234",
      "https://user:pass@example.invalid/private",
      "sb_secret_SUPABASE_SECRET_123456",
    ].join(" ");
    const encoded = Buffer.from(secretText, "utf8").toString("base64");
    const result = probePowerShell(`
      $text = [System.Text.Encoding]::UTF8.GetString(
        [Convert]::FromBase64String(${psQuote(encoded)})
      )
      Protect-BinderUnattendedTextV1 -Text $text
    `);
    assert.equal(result.ok, true);
    for (const fragment of [
      "abc.DEF",
      "QUERY_SECRET",
      "JSON_SECRET",
      "eyJheader",
      "user:pass",
      "SUPABASE_SECRET",
    ]) {
      assert.doesNotMatch(result.result, new RegExp(fragment, "i"));
    }
  },
);

test("supervisor source has one apply launch, durable markers, and no activation/retry path", () => {
  const invoke = functionBody(
    moduleSource,
    "Invoke-BinderUnattendedSupervisorV1",
    "\nExport-ModuleMember",
  );
  const durableWrite = functionBody(
    moduleSource,
    "Write-BinderUnattendedCreateNewDurableV1",
  );
  const policy = functionBody(moduleSource, "Get-BinderUnattendedPolicyV1");

  assert.equal((invoke.match(/&\s+\$preflightEntrypoint\b/g) ?? []).length, 1);
  assert.equal((invoke.match(/&\s+\$applyEntrypoint\b/g) ?? []).length, 1);
  assert.equal(
    (invoke.match(/New-BinderUnattendedClaimV1\s+`\s*\n\s*-Kind mutation/g) ?? [])
      .length,
    1,
  );
  assert.ok(
    invoke.indexOf("$mutationClaimWriteStarted = $true") <
      invoke.indexOf("-Kind mutation"),
    "mutation-possible classification must begin before durable marker creation",
  );
  assert.match(
    invoke,
    /\$mutationClaimWriteStarted\s+-or[\s\S]*\$mutationMarkerState\s+-ceq\s+'present'/,
  );
  assert.match(durableWrite, /FileMode\]::CreateNew/);
  assert.match(durableWrite, /FileOptions\]::WriteThrough/);
  assert.match(durableWrite, /\$stream\.Flush\(\$true\)/);
  assert.match(policy, /ApplyArguments\s*=\s*@\('db', 'push', '--linked', '--yes'\)/);
  assert.match(invoke, /automatic_retry_permitted\s*=\s*\$false/);
  assert.match(invoke, /feature_flags_enabled\s*=\s*0/);
  assert.doesNotMatch(invoke, /migration\s+repair/i);
  assert.doesNotMatch(invoke, /functions\s+deploy|deploy\s+function/i);
  assert.doesNotMatch(invoke, /automatic_retry_permitted\s*=\s*\$true/);
});

test("entrypoint exposes only authorization path and independent hash parameters", () => {
  const parameterBlock = entrypointSource.slice(
    entrypointSource.indexOf("param("),
    entrypointSource.indexOf("Set-StrictMode"),
  );
  assert.match(parameterBlock, /\$AuthorizationPath/);
  assert.match(parameterBlock, /\$ExpectedAuthorizationSha256/);
  assert.equal((parameterBlock.match(/\[string\]\$/g) ?? []).length, 2);
  assert.doesNotMatch(
    parameterBlock,
    /Project|Repo|Command|Executable|Ack|State|Artifact|Retry|Force|Hook/i,
  );
});

test("bootstrap verifies and retains the signed bundle before importing rollout code", () => {
  const invoke = functionBody(
    moduleSource,
    "Invoke-BinderUnattendedSupervisorV1",
    "\nExport-ModuleMember",
  );
  const openAuthorization = functionBody(
    moduleSource,
    "Open-BinderUnattendedAuthorizationV1",
  );
  const openBundleSeals = functionBody(
    moduleSource,
    "Open-BinderUnattendedBundleSealsV1",
  );
  const resolveSupabase = functionBody(
    moduleSource,
    "Get-BinderUnattendedSupabaseExecutableV1",
  );
  const verifyBundle = functionBody(
    moduleSource,
    "Test-BinderUnattendedBundleV1",
  );

  assert.match(openAuthorization, /Assert-BinderUnattendedOutsideRepositoryV1/);
  assert.doesNotMatch(openAuthorization, /Import-Module/);
  assert.doesNotMatch(openAuthorization, /OutsideEveryWorktree/);

  const authorization = invoke.indexOf(
    "Open-BinderUnattendedAuthorizationV1",
  );
  const firstBundleCheck = invoke.indexOf(
    "Test-BinderUnattendedBundleV1",
    authorization,
  );
  const firstCliResolution = invoke.indexOf(
    "Get-BinderUnattendedSupabaseExecutableV1",
    firstBundleCheck,
  );
  const retainedBundleSeal = invoke.indexOf(
    "Open-BinderUnattendedBundleSealsV1",
    firstCliResolution,
  );
  const secondCliResolution = invoke.indexOf(
    "Get-BinderUnattendedSupabaseExecutableV1",
    retainedBundleSeal + 1,
  );
  const secondBundleCheck = invoke.indexOf(
    "Test-BinderUnattendedBundleV1",
    secondCliResolution,
  );
  const rolloutImport = invoke.indexOf(
    "Import-Module $rolloutModulePath",
    secondBundleCheck,
  );
  const gitSeal = invoke.indexOf(
    "Open-BinderGitMetadataSealV1",
    rolloutImport,
  );
  const everyWorktreeCheck = invoke.indexOf(
    "Assert-BinderUnattendedOutsideEveryWorktreeV1",
    gitSeal,
  );
  for (const [left, right, label] of [
    [authorization, firstBundleCheck, "authorization -> bundle verification"],
    [firstBundleCheck, firstCliResolution, "bundle -> CLI resolution"],
    [firstCliResolution, retainedBundleSeal, "CLI -> retained seals"],
    [retainedBundleSeal, secondCliResolution, "seal -> CLI re-resolution"],
    [secondCliResolution, secondBundleCheck, "CLI rehash -> bundle reverify"],
    [secondBundleCheck, rolloutImport, "bundle reverify -> rollout import"],
    [rolloutImport, gitSeal, "rollout import -> retained Git seal"],
    [gitSeal, everyWorktreeCheck, "Git seal -> all-worktree path check"],
  ]) {
    assert.ok(left >= 0 && right > left, `Invalid bootstrap order: ${label}`);
  }

  for (const required of [
    "SupervisorModuleRelativePath",
    "SupervisorEntrypointRelativePath",
    "RolloutModuleRelativePath",
    "PreflightEntrypointRelativePath",
    "ApplyEntrypointRelativePath",
    "PackageManifestRelativePath",
    "PreflightSqlRelativePath",
    "PostApplySqlRelativePath",
    "RestoreProcedureRelativePath",
    "LauncherPath",
    "ShimDescriptorPath",
    "BinaryPath",
    "supabase/config.toml",
    "supabase/.temp/project-ref",
    "supabase/.temp/pooler-url",
    "supabase/.temp/linked-project.json",
    "GitExecutablePath",
    "GitHttpsHelperPath",
    "supabase/migrations",
  ]) {
    assert.match(openBundleSeals, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(resolveSupabase, /supabase_cli_launcher_sha256/);
  assert.match(resolveSupabase, /supabase_cli_shim_descriptor_sha256/);
  assert.match(resolveSupabase, /supabase_cli_binary_sha256/);
  assert.match(verifyBundle, /supabase_config_sha256/);
  assert.match(verifyBundle, /linked_project_ref_sha256/);
  assert.match(verifyBundle, /linked_pooler_url_sha256/);
  assert.match(verifyBundle, /linked_project_metadata_sha256/);
  assert.match(verifyBundle, /git_executable_sha256/);
  assert.match(verifyBundle, /git_https_helper_sha256/);
});

test("authorization, preflight, and apply seals bind Git and Supabase routing identity", () => {
  const authorizationOrder = functionBody(
    moduleSource,
    "Get-BinderUnattendedAuthorizationPropertyOrderV1",
  );
  const authorizationParser = functionBody(
    moduleSource,
    "ConvertFrom-BinderUnattendedAuthorizationJsonV1",
  );
  const preflightGuard = functionBody(
    moduleSource,
    "Test-BinderUnattendedPreflightArtifactsV1",
  );
  const rolloutManifestGuard = functionBody(
    rolloutSource,
    "Test-PreflightManifestV1",
  );
  const applySeal = functionBody(rolloutSource, "Open-BinderApplySealV1");
  const finalLocalSeal = functionBody(
    rolloutSource,
    "Assert-BinderFinalLocalSealV1",
  );

  const closedFields = [
    "supabase_config_sha256",
    "linked_project_ref_sha256",
    "linked_pooler_url_sha256",
    "linked_project_metadata_sha256",
    "git_executable_path",
    "git_executable_sha256",
    "git_version",
    "git_exec_path",
    "git_https_helper_path",
    "git_https_helper_sha256",
    "git_common_config_sha256",
    "git_metadata_count",
    "git_metadata_sha256",
  ];
  for (const field of closedFields) {
    assert.match(authorizationOrder, new RegExp(`'${field}'`));
    assert.match(
      authorizationParser,
      new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
    assert.match(
      preflightGuard,
      new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    );
    assert.match(
      rolloutManifestGuard,
      new RegExp(`'${field}'`),
    );
  }
  assert.match(authorizationParser, /Get-BinderUnattendedJsonInt32V1[\s\S]*git_metadata_count/);
  assert.match(preflightGuard, /\$manifest\.git_metadata_count\s+-is\s+\[long\]/);
  assert.match(rolloutManifestGuard, /\$data\.git_metadata_count\s+-is\s+\[long\]/);

  for (const sealedPath of [
    "supabase/config.toml",
    "supabase/.temp/project-ref",
    "supabase/.temp/pooler-url",
    "supabase/.temp/linked-project.json",
    "gitGuard.ExecutablePath",
    "gitGuard.HttpsHelperPath",
    "PreflightManifestEnvelope.Path",
    "preflight-manifest.sha256",
    "backup_evidence_path",
  ]) {
    assert.match(
      applySeal,
      new RegExp(sealedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
  assert.match(applySeal, /gitGuard\.Topology\.Metadata/);
  assert.match(applySeal, /TrackedMigrationSet\.Entries/);
  assert.match(applySeal, /Git metadata changed after apply seals were retained/);
  assert.match(applySeal, /Linked Supabase identity changed after apply seals were retained/);
  assert.match(finalLocalSeal, /SupabaseCliLauncherSha256/);
  assert.match(finalLocalSeal, /SupabaseCliBinarySha256/);
  assert.match(finalLocalSeal, /SupabaseCliShimDescriptorSha256/);
  assert.match(finalLocalSeal, /GitHttpsHelperSha256/);
});

test("Git execution is pinned, isolated from ambient config, and seals linked-worktree metadata", () => {
  const policy = functionBody(rolloutSource, "Get-BinderRolloutPolicyV1");
  const gitExecutable = functionBody(
    rolloutSource,
    "Get-BinderGitExecutableV1",
  );
  const invokeGit = functionBody(rolloutSource, "Invoke-BinderGitV1");
  const topology = functionBody(rolloutSource, "Get-BinderGitTopologyV1");
  const localConfig = functionBody(
    rolloutSource,
    "Assert-BinderGitLocalConfigurationV1",
  );
  const processRunner = functionBody(rolloutSource, "Invoke-BinderProcessV1");

  for (const token of [
    "GitExecutablePath",
    "GitExecutableSha256",
    "GitVersion",
    "GitExecPath",
    "GitHttpsHelperPath",
    "GitHttpsHelperSha256",
  ]) {
    assert.match(policy, new RegExp(token));
    assert.match(gitExecutable, new RegExp(token));
  }
  for (const override of [
    "extensions.worktreeConfig=false",
    "core.fsmonitor=false",
    "core.hooksPath=NUL",
    "core.askPass=",
    "core.sshCommand=",
    "credential.helper=",
    "credential.interactive=false",
    "http.proxy=",
    "http.extraHeader=",
    "remote.origin.proxy=",
  ]) {
    assert.match(
      invokeGit,
      new RegExp(override.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
  assert.match(invokeGit, /-SanitizeGitEnvironment/);
  assert.match(invokeGit, /-TrustedGitExecPath\s+\$git\.ExecPath/);
  assert.match(processRunner, /GIT_CONFIG_NOSYSTEM'\]\s*=\s*'1'/);
  assert.match(processRunner, /GIT_CONFIG_GLOBAL'\]\s*=\s*'NUL'/);
  assert.match(processRunner, /GIT_EXEC_PATH/);
  assert.match(processRunner, /GIT_TERMINAL_PROMPT'\]\s*=\s*'0'/);

  for (const metadata of [
    "common_config",
    "common_config_worktree",
    "git_config_worktree",
    "worktree_dot_git_pointer",
    "worktree_commondir",
    "worktree_gitdir",
    "worktree_head",
    "worktree_index",
    "current_head_ref",
    "common_packed_refs",
  ]) {
    assert.match(topology, new RegExp(metadata));
  }
  assert.match(topology, /MetadataSha256/);
  assert.match(localConfig, /include\\\./);
  assert.match(localConfig, /credential\\\./);
  assert.match(localConfig, /http\\\./);
  assert.match(localConfig, /url\\\./);
  assert.match(localConfig, /remote\\\.\.\*\\\.\(proxy/);
  assert.match(localConfig, /remote\\\.origin\\\.pushurl/);
  assert.match(
    localConfig,
    /remote\.origin\.url https:\/\/github\.com\/OriginalSoseji\/grookai_vault\.git/,
  );
  assert.match(
    localConfig,
    /remote\.origin\.fetch \+refs\/heads\/\*:refs\/remotes\/origin\/\*/,
  );
});

test("deadline transport is scrubbed and the final gate uses the earliest authority", () => {
  const supervisorInvoke = functionBody(
    moduleSource,
    "Invoke-BinderUnattendedSupervisorV1",
    "\nExport-ModuleMember",
  );
  const containedWrapper = functionBody(
    rolloutSource,
    "Get-BinderSupervisorEncodedCommandV1",
  );
  const finalGate = functionBody(
    rolloutSource,
    "Assert-BinderFinalRemoteGateV1",
  );
  const apply = functionBody(
    rolloutSource,
    "Invoke-BinderProductionApplyV1",
  );

  const deadlineRead = applyEntrypointSource.indexOf(
    "[Environment]::GetEnvironmentVariable",
  );
  const deadlineScrub = applyEntrypointSource.indexOf(
    "[Environment]::SetEnvironmentVariable",
    deadlineRead,
  );
  const rolloutImport = applyEntrypointSource.indexOf("Import-Module");
  assert.ok(
    deadlineRead >= 0 && deadlineScrub > deadlineRead && rolloutImport > deadlineScrub,
    "Apply entrypoint must read and scrub deadline authority before module import",
  );
  assert.match(
    applyEntrypointSource,
    /finally[\s\S]*\$mutationDeadlineName[\s\S]*\$authorizationExpiryName/,
  );

  const mutationMarker = supervisorInvoke.indexOf("-Kind mutation");
  const transportedDeadline = supervisorInvoke.indexOf(
    "GROOKAI_BINDER_PROD_MUTATION_NOT_AFTER_UTC",
  );
  const applyLaunch = supervisorInvoke.indexOf("& $applyEntrypoint");
  assert.ok(
    mutationMarker >= 0 &&
      transportedDeadline > mutationMarker &&
      applyLaunch > transportedDeadline,
  );
  assert.match(
    containedWrapper,
    /\$payloadName[\s\S]*SetEnvironmentVariable\(\s*\$payloadName,\s*\$null/s,
  );
  assert.match(
    containedWrapper,
    /expired at the child-start gate[\s\S]*if \(-not \$child\.Start\(\)\)/,
  );

  assert.match(finalGate, /\[string\]\$FinalRemoteRepoRoot/);
  assert.match(finalGate, /\[string\]\$SupabaseExecutablePath/);
  const backupBound = finalGate.indexOf("BackupRecoveryLagMinutes");
  const mutationBound = finalGate.indexOf(
    "$parsedMutationDeadline -lt $effectiveNotAfter",
  );
  const expiryBound = finalGate.indexOf(
    "$parsedAuthorizationExpiry -lt $effectiveNotAfter",
  );
  const finalNowCheck = finalGate.indexOf(
    "[datetimeoffset]::UtcNow -lt $effectiveNotAfter",
  );
  assert.ok(
    backupBound >= 0 &&
      mutationBound > backupBound &&
      expiryBound > mutationBound &&
      finalNowCheck > expiryBound,
    "Final child-start deadline must be min(backup horizon, mutation, expiry)",
  );
  assert.match(apply, /-NotAfterUtc \(\[string\]\$finalRemoteGate\.NotAfterUtc\)/);
});

test("final sealed stage runs dry-run, ledger, readback, then one guarded push", () => {
  const finalGate = functionBody(
    rolloutSource,
    "Assert-BinderFinalRemoteGateV1",
  );
  const apply = functionBody(
    rolloutSource,
    "Invoke-BinderProductionApplyV1",
  );
  const plan = functionBody(
    rolloutSource,
    "New-BinderApplyCommandPlanV1",
  );

  const dryRun = finalGate.indexOf("$freshDryRun = Get-BinderDryRunV1");
  const ledger = finalGate.indexOf("$freshLedger = Get-BinderLedgerV1");
  const readback = finalGate.indexOf(
    "$freshReadback = Invoke-BinderReadbackV1",
  );
  assert.ok(dryRun >= 0 && ledger > dryRun && readback > ledger);
  for (const command of ["Get-BinderDryRunV1", "Get-BinderLedgerV1", "Invoke-BinderReadbackV1"]) {
    const start = finalGate.indexOf(command);
    const end = finalGate.indexOf("\n  Assert-BinderConditionV1", start);
    const call = finalGate.slice(start, end);
    assert.match(call, /\$FinalRemoteRepoRoot/);
    assert.match(call, /\$SupabaseExecutablePath/);
  }

  const openSeal = apply.indexOf("Open-BinderApplySealV1");
  const localSeal = apply.indexOf("Assert-BinderFinalLocalSealV1");
  const stage = apply.indexOf("New-BinderSupabaseStageV1");
  const remoteGate = apply.indexOf("Assert-BinderFinalRemoteGateV1");
  const push = apply.indexOf("$push = Invoke-BinderSupabaseV1");
  assert.ok(
    openSeal >= 0 &&
      localSeal > openSeal &&
      stage > localSeal &&
      remoteGate > stage &&
      push > remoteGate,
  );
  assert.match(
    apply.slice(push, apply.indexOf("$pushSucceeded", push)),
    /-Arguments @\(\$plan\[0\]\.Arguments\)[\s\S]*-RepoRoot \$stage\.Root[\s\S]*-ExecutablePath \$supabaseExecutable\.BinaryPath[\s\S]*-NotAfterUtc/,
  );
  assert.equal((apply.match(/\$push\s*=\s*Invoke-BinderSupabaseV1/g) ?? []).length, 1);
  assert.match(plan, /Apply command plan cannot be constructed before authorization validation/);
  assert.match(plan, /MutatesRemote\s*=\s*\$true/);
  assert.match(plan, /Arguments\s*=\s*@\(\$policy\.ApplyArguments\)/);
  assert.doesNotMatch(apply, /migration\s+repair/i);
  assert.doesNotMatch(apply, /functions\s+deploy|deploy\s+function/i);
  assert.doesNotMatch(apply, /automatic_retry\s*=\s*\$true/i);
});

test("Windows CI runs the supervisor suite and source exposes no activation path", () => {
  assert.match(workflowSource, /binder-rollout-windows:/);
  assert.match(
    workflowSource,
    /tests\/contracts\/collaborative_binders_unattended_supervisor_v1\.test\.mjs/,
  );
  const executableSource = [
    moduleSource,
    rolloutSource,
    entrypointSource,
    applyEntrypointSource,
  ].join("\n");
  assert.doesNotMatch(executableSource, /migration\s+repair/i);
  assert.doesNotMatch(executableSource, /--include-all\b/i);
  assert.doesNotMatch(
    executableSource,
    /\b(?:insert\s+into|update|delete\s+from)\s+(?:public\.)?binder_feature_flags\b/i,
  );
  assert.doesNotMatch(executableSource, /automatic_retry_permitted\s*=\s*\$true/i);
  assert.match(moduleSource, /p8_excluded\s*=\s+Get-BinderUnattendedJsonBooleanV1/);
  assert.match(moduleSource, /activation_allowed\s*=\s+Get-BinderUnattendedJsonBooleanV1/);
  assert.match(moduleSource, /deployment_allowed\s*=\s+Get-BinderUnattendedJsonBooleanV1/);
  assert.match(moduleSource, /feature_flags_enabled\s*=\s*0/);
});

test(
  "contained database and Git children receive only their minimum environment",
  { skip: !WINDOWS_ONLY },
  () => {
    const result = probeRolloutPowerShell(`
      $module = Get-Module CollaborativeBindersProductionRolloutV1
      $pwsh = [Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
      $directory = (Get-Location).Path
      $policy = Get-BinderRolloutPolicyV1

      $env:SUPABASE_ACCESS_TOKEN = 'sbp_LOCAL_TEST_TOKEN_123456'
      $env:SUPABASE_URL = 'https://malicious.invalid'
      $env:DB_URL = 'postgresql://user:pass@malicious.invalid/db'
      $env:GIT_CONFIG_COUNT = '99'
      $env:GIT_ASKPASS = 'C:\\malicious-askpass.exe'
      $env:GCM_INTERACTIVE = 'Always'
      $env:GCM_TRACE = '1'
      $env:MSYS2_ARG_CONV_EXCL = 'malicious'
      $env:MSYS_NO_PATHCONV = 'malicious'
      $env:AWS_SECRET_ACCESS_KEY = 'LOCAL_TEST_AWS_SECRET'
      $env:GROOKAI_BINDER_PROD_MUTATION_NOT_AFTER_UTC =
        '2099-01-01T00:00:00Z'

      $childScript = @'
$names = @(
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_URL',
  'DB_URL',
  'GIT_CONFIG_COUNT',
  'GIT_ASKPASS',
  'AWS_SECRET_ACCESS_KEY',
  'GROOKAI_BINDER_PROD_MUTATION_NOT_AFTER_UTC',
  'GROOKAI_BINDER_SUPERVISOR_PAYLOAD_V1',
  'GIT_CONFIG_NOSYSTEM',
  'GIT_CONFIG_GLOBAL',
  'GIT_EXEC_PATH',
  'GIT_TERMINAL_PROMPT',
  'GIT_OPTIONAL_LOCKS',
  'GCM_INTERACTIVE',
  'GCM_TRACE',
  'MSYS2_ARG_CONV_EXCL',
  'MSYS_NO_PATHCONV'
)
$values = [ordered]@{}
foreach ($name in $names) {
  $observed = [Environment]::GetEnvironmentVariable(
    $name,
    [EnvironmentVariableTarget]::Process
  )
  $values[$name] = if (
    $name -ceq 'SUPABASE_ACCESS_TOKEN' -and
    -not [string]::IsNullOrWhiteSpace($observed)
  ) {
    'present'
  } else {
    $observed
  }
}
[Console]::Out.Write(($values | ConvertTo-Json -Compress))
'@

      $database = & $module {
        param($exe, $cwd, $script)
        Invoke-BinderProcessV1 \`
          -FilePath $exe \`
          -Arguments @(
            '-NoLogo',
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            $script
          ) \`
          -WorkingDirectory $cwd \`
          -TimeoutSeconds 15 \`
          -SanitizeDatabaseEnvironment
      } $pwsh $directory $childScript

      $git = & $module {
        param($exe, $cwd, $script, $execPath)
        Invoke-BinderProcessV1 \`
          -FilePath $exe \`
          -Arguments @(
            '-NoLogo',
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            $script
          ) \`
          -WorkingDirectory $cwd \`
          -TimeoutSeconds 15 \`
          -SanitizeGitEnvironment \`
          -TrustedGitExecPath $execPath
      } $pwsh $directory $childScript $policy.GitExecPath

      [pscustomobject][ordered]@{
        database = $database.StdOut | ConvertFrom-Json
        database_exit_code = $database.ExitCode
        database_terminated = $database.TerminationConfirmed
        database_output_complete = $database.OutputCaptureCompleted
        git = $git.StdOut | ConvertFrom-Json
        git_exit_code = $git.ExitCode
        git_terminated = $git.TerminationConfirmed
        git_output_complete = $git.OutputCaptureCompleted
        expected_git_exec_path = $policy.GitExecPath
      }
    `);
    assert.equal(result.ok, true, result.message);
    const value = result.result;
    assert.equal(value.database_exit_code, 0);
    assert.equal(value.database_terminated, true);
    assert.equal(value.database_output_complete, true);
    assert.equal(value.git_exit_code, 0);
    assert.equal(value.git_terminated, true);
    assert.equal(value.git_output_complete, true);

    assert.equal(
      value.database.SUPABASE_ACCESS_TOKEN,
      "present",
    );
    for (const name of [
      "SUPABASE_URL",
      "DB_URL",
      "GIT_CONFIG_COUNT",
      "GIT_ASKPASS",
      "AWS_SECRET_ACCESS_KEY",
      "GROOKAI_BINDER_PROD_MUTATION_NOT_AFTER_UTC",
      "GROOKAI_BINDER_SUPERVISOR_PAYLOAD_V1",
      "GIT_CONFIG_NOSYSTEM",
      "GIT_CONFIG_GLOBAL",
      "GIT_EXEC_PATH",
      "GIT_TERMINAL_PROMPT",
      "GIT_OPTIONAL_LOCKS",
      "GCM_INTERACTIVE",
      "GCM_TRACE",
      "MSYS2_ARG_CONV_EXCL",
      "MSYS_NO_PATHCONV",
    ]) {
      assert.ok(
        value.database[name] === null || value.database[name] === "",
        `database child leaked ${name}`,
      );
    }

    for (const name of [
      "SUPABASE_ACCESS_TOKEN",
      "SUPABASE_URL",
      "DB_URL",
      "GIT_CONFIG_COUNT",
      "GIT_ASKPASS",
      "AWS_SECRET_ACCESS_KEY",
      "GROOKAI_BINDER_PROD_MUTATION_NOT_AFTER_UTC",
      "GROOKAI_BINDER_SUPERVISOR_PAYLOAD_V1",
      "GCM_TRACE",
    ]) {
      assert.ok(
        value.git[name] === null || value.git[name] === "",
        `Git child leaked ${name}`,
      );
    }
    assert.equal(value.git.GIT_CONFIG_NOSYSTEM, "1");
    assert.equal(value.git.GIT_CONFIG_GLOBAL, "NUL");
    assert.equal(value.git.GIT_EXEC_PATH, value.expected_git_exec_path);
    assert.equal(value.git.GIT_TERMINAL_PROMPT, "0");
    assert.equal(value.git.GIT_OPTIONAL_LOCKS, "0");
    assert.equal(value.git.GCM_INTERACTIVE, "Never");
    assert.equal(value.git.MSYS2_ARG_CONV_EXCL, "*");
    assert.equal(value.git.MSYS_NO_PATHCONV, "1");
  },
);

test(
  "expired NotAfter at the released gate prevents the actual target child start",
  { skip: !WINDOWS_ONLY },
  () => {
    const result = probeRolloutPowerShell(`
      $module = Get-Module CollaborativeBindersProductionRolloutV1
      $encodedSupervisor = & $module {
        Get-BinderSupervisorEncodedCommandV1
      }
      $tempRoot = Join-Path (
        [IO.Path]::GetTempPath()
      ) ('binder-deadline-gate-' + [guid]::NewGuid().ToString('N'))
      [void][IO.Directory]::CreateDirectory($tempRoot)
      $markerPath = Join-Path $tempRoot 'TARGET_CHILD_STARTED'
      $gate = $null
      $process = $null
      try {
        $gateName = (
          'Local\\GrookaiBinderDeadlineTest-' +
          [guid]::NewGuid().ToString('N')
        )
        $createdNew = $false
        $gate = [Threading.EventWaitHandle]::new(
          $false,
          [Threading.EventResetMode]::ManualReset,
          $gateName,
          [ref]$createdNew
        )
        if (-not $createdNew) {
          throw 'Deadline-test gate was not unique.'
        }
        $pwsh = [Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
        $targetCommand = (
          '[IO.File]::WriteAllText(' +
          "'" + $markerPath.Replace("'", "''") + "'," +
          "'started')"
        )
        $notAfter = [datetimeoffset]::UtcNow.AddSeconds(1).ToString(
          "yyyy-MM-dd'T'HH:mm:ss.fffffff'Z'",
          [cultureinfo]::InvariantCulture
        )
        $payload = [ordered]@{
          GateName = $gateName
          FilePath = $pwsh
          WorkingDirectory = (Get-Location).Path
          Arguments = @(
            '-NoLogo',
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            $targetCommand
          )
          NotAfterUtc = $notAfter
        }
        $payloadBase64 = [Convert]::ToBase64String(
          [Text.Encoding]::UTF8.GetBytes(
            ($payload | ConvertTo-Json -Compress -Depth 4)
          )
        )
        $start = [Diagnostics.ProcessStartInfo]::new()
        $start.FileName = $pwsh
        $start.WorkingDirectory = (Get-Location).Path
        $start.UseShellExecute = $false
        $start.CreateNoWindow = $true
        $start.RedirectStandardOutput = $true
        $start.RedirectStandardError = $true
        foreach ($argument in @(
          '-NoLogo',
          '-NoProfile',
          '-NonInteractive',
          '-EncodedCommand',
          $encodedSupervisor
        )) {
          [void]$start.ArgumentList.Add($argument)
        }
        $start.Environment[
          'GROOKAI_BINDER_SUPERVISOR_PAYLOAD_V1'
        ] = $payloadBase64
        $process = [Diagnostics.Process]::new()
        $process.StartInfo = $start
        if (-not $process.Start()) {
          throw 'Deadline-test supervisor did not start.'
        }
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        Start-Sleep -Milliseconds 1800
        [void]$gate.Set()
        $process.WaitForExit()
        $stdout = $stdoutTask.GetAwaiter().GetResult()
        $stderr = $stderrTask.GetAwaiter().GetResult()
        [pscustomobject][ordered]@{
          supervisor_exit_code = $process.ExitCode
          target_child_started = Test-Path -LiteralPath $markerPath
          stdout = $stdout
          stderr = $stderr
        }
      } finally {
        if ($null -ne $process) {
          $process.Dispose()
        }
        if ($null -ne $gate) {
          $gate.Dispose()
        }
        if (Test-Path -LiteralPath $tempRoot) {
          Remove-Item -LiteralPath $tempRoot -Recurse -Force
        }
      }
    `);
    assert.equal(result.ok, true, result.message);
    assert.equal(result.result.supervisor_exit_code, 250);
    assert.equal(result.result.target_child_started, false);
    assert.match(result.result.stderr, /authority expired before child start|expired at the child-start gate/i);
  },
);

test(
  "strict deadlines accept 0-7 fractional Z forms, reject malformed/past values, and allow a future child",
  { skip: !WINDOWS_ONLY },
  () => {
    const result = probeRolloutPowerShell(`
      $module = Get-Module CollaborativeBindersProductionRolloutV1
      $valid = @(
        '2099-01-01T00:00:00Z',
        '2099-01-01T00:00:00.1Z',
        '2099-01-01T00:00:00.12Z',
        '2099-01-01T00:00:00.123Z',
        '2099-01-01T00:00:00.1234Z',
        '2099-01-01T00:00:00.12345Z',
        '2099-01-01T00:00:00.123456Z',
        '2099-01-01T00:00:00.1234567Z'
      )
      $validCount = 0
      foreach ($value in $valid) {
        [void](& $module {
          param($deadline)
          ConvertTo-BinderStrictUtcDeadlineV1 \`
            -Value $deadline \`
            -Label 'deadline fixture'
        } $value)
        $validCount += 1
      }

      $invalid = @(
        '2099-01-01T00:00:00',
        '2099-01-01T00:00:00+00:00',
        '2099-01-01T00:00:00.12345678Z',
        '2099-01-01 00:00:00Z',
        "2099-01-01T00:00:00Z\`n"
      )
      $invalidRejected = 0
      foreach ($value in $invalid) {
        try {
          [void](& $module {
            param($deadline)
            ConvertTo-BinderStrictUtcDeadlineV1 \`
              -Value $deadline \`
              -Label 'deadline fixture'
          } $value)
        } catch {
          $invalidRejected += 1
        }
      }

      $pwsh = [Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
      $directory = (Get-Location).Path
      $futureDeadline = [datetimeoffset]::UtcNow.AddMinutes(1).UtcDateTime.ToString(
        "yyyy-MM-dd'T'HH:mm:ss.fffffff'Z'",
        [cultureinfo]::InvariantCulture
      )
      $future = & $module {
        param($exe, $cwd, $deadline)
        Invoke-BinderProcessV1 \`
          -FilePath $exe \`
          -Arguments @(
            '-NoLogo',
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            "[Console]::Out.Write('future-deadline-started')"
          ) \`
          -WorkingDirectory $cwd \`
          -TimeoutSeconds 15 \`
          -NotAfterUtc $deadline
      } $pwsh $directory $futureDeadline

      $pastRejected = $false
      try {
        [void](& $module {
          param($exe, $cwd)
          Invoke-BinderProcessV1 \`
            -FilePath $exe \`
            -Arguments @(
              '-NoLogo',
              '-NoProfile',
              '-NonInteractive',
              '-Command',
              "[Console]::Out.Write('past-deadline-must-not-start')"
            ) \`
            -WorkingDirectory $cwd \`
            -TimeoutSeconds 15 \`
            -NotAfterUtc '2000-01-01T00:00:00Z'
        } $pwsh $directory)
      } catch {
        $pastRejected = $true
      }

      [pscustomobject][ordered]@{
        valid_count = $validCount
        invalid_rejected = $invalidRejected
        future_exit_code = $future.ExitCode
        future_started = $future.Started
        future_terminated = $future.TerminationConfirmed
        future_output_complete = $future.OutputCaptureCompleted
        future_stdout = $future.StdOut
        past_rejected = $pastRejected
      }
    `);
    assert.equal(result.ok, true, result.message);
    assert.equal(result.result.valid_count, 8);
    assert.equal(result.result.invalid_rejected, 5);
    assert.equal(result.result.future_exit_code, 0);
    assert.equal(result.result.future_started, true);
    assert.equal(result.result.future_terminated, true);
    assert.equal(result.result.future_output_complete, true);
    assert.equal(result.result.future_stdout, "future-deadline-started");
    assert.equal(result.result.past_rejected, true);
  },
);
