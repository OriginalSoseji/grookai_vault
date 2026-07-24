import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
  "CollaborativeBindersProductionRolloutV1.psm1",
);

function encodePowerShell(source) {
  return Buffer.from(source, "utf16le").toString("base64");
}

function runContainmentHarness() {
  const modulePath = Buffer.from(MODULE_PATH, "utf8").toString("base64");
  const script = `
$ErrorActionPreference = 'Stop'
$modulePath = [Text.Encoding]::UTF8.GetString(
  [Convert]::FromBase64String('${modulePath}')
)
Import-Module $modulePath -Force
$module = Get-Module CollaborativeBindersProductionRolloutV1
$pwsh = [Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
$workingDirectory = (Get-Location).Path

function Invoke-LocalContained {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Script,
    [Parameter(Mandatory = $true)]
    [int]$TimeoutSeconds,
    [switch]$SanitizeDatabaseEnvironment
  )

  return & $module {
    param(
      [string]$Executable,
      [string]$Directory,
      [string]$TargetScript,
      [int]$Timeout,
      [bool]$Sanitize
    )
    if ($Sanitize) {
      return Invoke-BinderProcessV1 \`
        -FilePath $Executable \`
        -Arguments @(
          '-NoLogo',
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          $TargetScript
        ) \`
        -WorkingDirectory $Directory \`
        -TimeoutSeconds $Timeout \`
        -SanitizeDatabaseEnvironment
    }
    return Invoke-BinderProcessV1 \`
      -FilePath $Executable \`
      -Arguments @(
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        $TargetScript
      ) \`
      -WorkingDirectory $Directory \`
      -TimeoutSeconds $Timeout
  } $pwsh $workingDirectory $Script $TimeoutSeconds (
    [bool]$SanitizeDatabaseEnvironment
  )
}

$env:PGHOST = 'must-not-cross-the-contained-boundary'
$normal = Invoke-LocalContained \`
  -Script @'
[Console]::Out.Write(
  'contained-ok|' + [Environment]::GetEnvironmentVariable('PGHOST')
)
[Console]::Error.Write('contained-err')
exit 7
'@ \`
  -TimeoutSeconds 10 \`
  -SanitizeDatabaseEnvironment

$timeout = Invoke-LocalContained \`
  -Script @'
[Console]::Out.WriteLine('before-timeout-out')
[Console]::Error.WriteLine('before-timeout-err')
Start-Sleep -Seconds 30
'@ \`
  -TimeoutSeconds 1

$descendant = Invoke-LocalContained \`
  -Script @'
$child = Start-Process \`
  -FilePath (
    [Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
  ) \`
  -ArgumentList @(
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    'Start-Sleep -Seconds 60'
  ) \`
  -PassThru
[Console]::Out.WriteLine("child_pid=$($child.Id)")
Start-Sleep -Seconds 60
'@ \`
  -TimeoutSeconds 2
$childMatch = [regex]::Match(
  $descendant.StdOut,
  'child_pid=(?<pid>\\d+)'
)
$childAlive = $false
if ($childMatch.Success) {
  $childAlive = $null -ne (
    Get-Process \`
      -Id ([int]$childMatch.Groups['pid'].Value) \`
      -ErrorAction SilentlyContinue
  )
}

$bounded = Invoke-LocalContained \`
  -Script @'
[Console]::Out.Write(('o' * 300000))
[Console]::Error.Write(('e' * 300000))
'@ \`
  -TimeoutSeconds 15

$node = (Get-Command node -ErrorAction Stop).Source
$lateNodeScript = @'
const { spawn } = require("child_process");
const child = spawn(
  process.execPath,
  [
    "-e",
    "setTimeout(() => {" +
      "process.stdout.write('late-out');" +
      "process.stderr.write('late-err')" +
    "}, 6000)",
  ],
  {
    detached: true,
    stdio: ["ignore", "inherit", "inherit"],
  },
);
process.stdout.write("early-out|pid=" + child.pid);
process.stderr.write("early-err");
child.unref();
'@
$lateForwarding = & $module {
  param(
    [string]$Executable,
    [string]$Directory,
    [string]$TargetScript
  )
  Invoke-BinderProcessV1 \`
    -FilePath $Executable \`
    -Arguments @('-e', $TargetScript) \`
    -WorkingDirectory $Directory \`
    -TimeoutSeconds 20
} $node $workingDirectory $lateNodeScript

$handleCountBeforeSetupFailures = (
  [Diagnostics.Process]::GetCurrentProcess().HandleCount
)
$setupFailureCount = 0
foreach ($attempt in 1..12) {
  try {
    [void](Invoke-LocalContained \`
      -Script ('x' * 30000) \`
      -TimeoutSeconds 10)
  } catch {
    $setupFailureCount += 1
  }
}
$handleCountAfterSetupFailures = (
  [Diagnostics.Process]::GetCurrentProcess().HandleCount
)

[ordered]@{
  normal = [ordered]@{
    exit_code = $normal.ExitCode
    stdout = $normal.StdOut
    stderr = $normal.StdErr
    started = $normal.Started
    timed_out = $normal.TimedOut
    root_exited = $normal.RootExited
    process_tree_empty = $normal.ProcessTreeEmpty
    termination_confirmed = $normal.TerminationConfirmed
    output_capture_completed = $normal.OutputCaptureCompleted
  }
  timeout = [ordered]@{
    exit_code = $timeout.ExitCode
    timed_out = $timeout.TimedOut
    kill_attempted = $timeout.KillAttempted
    kill_request_succeeded = $timeout.KillRequestSucceeded
    root_exited = $timeout.RootExited
    process_tree_empty = $timeout.ProcessTreeEmpty
    termination_confirmed = $timeout.TerminationConfirmed
    output_capture_completed = $timeout.OutputCaptureCompleted
    stdout = $timeout.StdOut
    stderr = $timeout.StdErr
  }
  descendant = [ordered]@{
    child_pid_observed = $childMatch.Success
    child_alive_after_return = $childAlive
    timed_out = $descendant.TimedOut
    kill_attempted = $descendant.KillAttempted
    root_exited = $descendant.RootExited
    process_tree_empty = $descendant.ProcessTreeEmpty
    termination_confirmed = $descendant.TerminationConfirmed
  }
  bounded = [ordered]@{
    exit_code = $bounded.ExitCode
    termination_confirmed = $bounded.TerminationConfirmed
    output_capture_completed = $bounded.OutputCaptureCompleted
    stdout_length = $bounded.StdOut.Length
    stderr_length = $bounded.StdErr.Length
    stdout_characters_observed = $bounded.StdOutCharactersObserved
    stderr_characters_observed = $bounded.StdErrCharactersObserved
    stdout_truncated = $bounded.StdOutTruncated
    stderr_truncated = $bounded.StdErrTruncated
  }
  late_forwarding = [ordered]@{
    exit_code = $lateForwarding.ExitCode
    stdout = $lateForwarding.StdOut
    stderr = $lateForwarding.StdErr
    process_tree_empty = $lateForwarding.ProcessTreeEmpty
    termination_confirmed = $lateForwarding.TerminationConfirmed
    output_capture_completed = $lateForwarding.OutputCaptureCompleted
  }
  setup_failure = [ordered]@{
    attempts = 12
    failures = $setupFailureCount
    handle_count_before = $handleCountBeforeSetupFailures
    handle_count_after = $handleCountAfterSetupFailures
  }
} | ConvertTo-Json -Depth 6 -Compress
`;
  const execution = spawnSync(
    "pwsh",
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-EncodedCommand",
      encodePowerShell(script),
    ],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 5 * 1024 * 1024,
      timeout: 45_000,
      windowsHide: true,
    },
  );

  assert.equal(
    execution.status,
    0,
    `PowerShell containment harness failed:\n${execution.stderr}`,
  );
  assert.equal(execution.signal, null);
  return JSON.parse(execution.stdout.trim());
}

test(
  "Collaborative Binders rollout process containment",
  { skip: process.platform !== "win32" },
  async (context) => {
    const report = runContainmentHarness();

    await context.test(
      "runs the exact child only after release and strips routing overrides",
      () => {
        assert.equal(report.normal.exit_code, 7);
        assert.equal(report.normal.stdout, "contained-ok|");
        assert.equal(report.normal.stderr, "contained-err");
        assert.equal(report.normal.started, true);
        assert.equal(report.normal.timed_out, false);
        assert.equal(report.normal.root_exited, true);
        assert.equal(report.normal.process_tree_empty, true);
        assert.equal(report.normal.termination_confirmed, true);
        assert.equal(report.normal.output_capture_completed, true);
      },
    );

    await context.test(
      "terminates and confirms an ordinary timeout",
      () => {
        assert.equal(report.timeout.timed_out, true);
        assert.equal(report.timeout.kill_attempted, true);
        assert.equal(report.timeout.kill_request_succeeded, true);
        assert.equal(report.timeout.root_exited, true);
        assert.equal(report.timeout.process_tree_empty, true);
        assert.equal(report.timeout.termination_confirmed, true);
        assert.equal(report.timeout.output_capture_completed, true);
        assert.match(report.timeout.stdout, /before-timeout-out/);
        assert.match(report.timeout.stderr, /before-timeout-err/);
        assert.notEqual(report.timeout.exit_code, null);
      },
    );

    await context.test(
      "kills descendants before returning from a timeout",
      () => {
        assert.equal(report.descendant.child_pid_observed, true);
        assert.equal(report.descendant.child_alive_after_return, false);
        assert.equal(report.descendant.timed_out, true);
        assert.equal(report.descendant.kill_attempted, true);
        assert.equal(report.descendant.root_exited, true);
        assert.equal(report.descendant.process_tree_empty, true);
        assert.equal(report.descendant.termination_confirmed, true);
      },
    );

    await context.test("caps stdout and stderr evidence", () => {
      assert.equal(report.bounded.exit_code, 0);
      assert.equal(report.bounded.termination_confirmed, true);
      assert.equal(report.bounded.output_capture_completed, true);
      assert.equal(report.bounded.stdout_length, 262_144);
      assert.equal(report.bounded.stderr_length, 262_144);
      assert.equal(report.bounded.stdout_characters_observed, 300_000);
      assert.equal(report.bounded.stderr_characters_observed, 300_000);
      assert.equal(report.bounded.stdout_truncated, true);
      assert.equal(report.bounded.stderr_truncated, true);
    });

    await context.test(
      "waits for descendant output forwarding before reporting complete",
      () => {
        assert.equal(report.late_forwarding.exit_code, 0);
        assert.match(
          report.late_forwarding.stdout,
          /^early-out\|pid=\d+late-out$/,
        );
        assert.equal(report.late_forwarding.stderr, "early-errlate-err");
        assert.equal(report.late_forwarding.process_tree_empty, true);
        assert.equal(report.late_forwarding.termination_confirmed, true);
        assert.equal(report.late_forwarding.output_capture_completed, true);
      },
    );

    await context.test(
      "disposes gate and Job Object handles on pre-launch setup failure",
      () => {
        assert.equal(report.setup_failure.failures, report.setup_failure.attempts);
        assert.ok(
          report.setup_failure.handle_count_after -
            report.setup_failure.handle_count_before <=
            2,
          `unexpected handle growth: ${JSON.stringify(report.setup_failure)}`,
        );
      },
    );
  },
);
