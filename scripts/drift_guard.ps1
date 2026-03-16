# ======================================================================
# scripts/drift_guard.ps1
# Grookai Vault - DriftGuard (Read-only migration drift helper)
#
# Purpose:
#   Provide a safe, read-only migration ledger/drift diagnostic.
#
# Behavior:
#   - Runs `supabase migration list --local` when local Supabase is reachable
#   - Runs `supabase migration list --linked`
#   - Falls back to repo migration files if the local DB is unavailable
#   - Fails only on:
#       * real drift
#       * pending/error migrations
#       * real Supabase CLI command failure
#
# Notes:
#   - Read-only guard. No DB writes.
#   - Rebuild proof still requires: `supabase db reset --local`
# ======================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section([string]$title) {
  Write-Host ""
  Write-Host "============================================================"
  Write-Host $title
  Write-Host "============================================================"
}

function Require-Command([string]$name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Required command not found in PATH: $name"
  }
}

function Invoke-SupabaseCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $argumentPreview = $Arguments -join " "
  Write-Host "Running: supabase $argumentPreview"

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "supabase"
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $psi.Arguments = (($Arguments | ForEach-Object {
        if ($_ -match '[\s"]') {
          '"' + ($_ -replace '"', '\"') + '"'
        } else {
          $_
        }
      }) -join ' ')

  try {
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi
    [void]$process.Start()
  } catch {
    throw "Failed to launch Supabase CLI: $($_.Exception.Message)"
  }

  $stdOut = $process.StandardOutput.ReadToEnd()
  $stdErr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  return [pscustomobject]@{
    Command  = "supabase $argumentPreview"
    ExitCode = $process.ExitCode
    StdOut   = $stdOut
    StdErr   = $stdErr
  }
}

function Write-CommandTranscript($result) {
  if (-not [string]::IsNullOrWhiteSpace($result.StdOut)) {
    Write-Host "[stdout]"
    Write-Host $result.StdOut.TrimEnd()
  }

  if (-not [string]::IsNullOrWhiteSpace($result.StdErr)) {
    if ($result.ExitCode -eq 0) {
      Write-Host "[stderr/info]"
      Write-Host $result.StdErr.TrimEnd()
    } else {
      Write-Host "[stderr/error]"
      Write-Host $result.StdErr.TrimEnd()
    }
  }
}

function Run-SupabaseMigrationList([string]$mode) {
  $result = Invoke-SupabaseCommand -Arguments @("migration", "list", "--$mode")
  Write-CommandTranscript -result $result
  return $result
}

function Test-IsLocalDbUnavailable($result) {
  $stdout = if ($null -eq $result.StdOut) { "" } else { [string]$result.StdOut }
  $stderr = if ($null -eq $result.StdErr) { "" } else { [string]$result.StdErr }
  $combined = ($stdout + "`n" + $stderr).ToLowerInvariant()
  $markers = @(
    "local database",
    "connection refused",
    "failed to connect",
    "connect to docker daemon",
    "docker daemon",
    "is not running",
    "no such host",
    "network name",
    "service is not running"
  )

  foreach ($marker in $markers) {
    if ($combined.Contains($marker)) {
      return $true
    }
  }

  return $false
}

function Parse-MigrationList([string[]]$lines) {
  $ids = New-Object System.Collections.Generic.HashSet[string]
  $pending = @()
  $error = @()

  foreach ($line in $lines) {
    $l = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($l)) { continue }

    if ($l -match '(?i)\bpending\b') { $pending += $line }
    if ($l -match '(?i)\berror\b')   { $error += $line }

    $matches = [regex]::Matches($l, '\b\d{8,14}\b')
    foreach ($m in $matches) {
      [void]$ids.Add($m.Value)
    }
  }

  return [pscustomobject]@{
    Ids     = $ids
    Pending = $pending
    Error   = $error
    Raw     = $lines
  }
}

function Get-RepoMigrationLedger {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $ids = New-Object System.Collections.Generic.HashSet[string]
  $migrationPath = Join-Path $RepoRoot "supabase\migrations"

  Get-ChildItem -Path $migrationPath -File -Filter "*.sql" | ForEach-Object {
    if ($_.BaseName -match '^(\d{8,14})') {
      [void]$ids.Add($matches[1])
    }
  }

  return [pscustomobject]@{
    Ids     = $ids
    Pending = @()
    Error   = @()
    Raw     = @()
  }
}

function Diff-Ids($aSet, $bSet) {
  $diff = @()
  foreach ($x in $aSet) {
    if (-not $bSet.Contains($x)) { $diff += $x }
  }
  return $diff | Sort-Object
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Write-Section "Grookai Vault - DriftGuard (Read-only)"

Require-Command "supabase"

$localSourceLabel = "local Supabase DB"
$local = $null
$linked = $null

Write-Section "1) Read Local Migration Ledger"
$localResult = Run-SupabaseMigrationList -mode "local"
if ($localResult.ExitCode -eq 0) {
  $local = Parse-MigrationList -lines ($localResult.StdOut -split "`r?`n")
} elseif (Test-IsLocalDbUnavailable -result $localResult) {
  Write-Host "Local Supabase DB not reachable. DriftGuard local comparison skipped."
  Write-Host "Falling back to repo migration files for linked ledger comparison."
  $local = Get-RepoMigrationLedger -RepoRoot $repoRoot
  $localSourceLabel = "repo migration files"
} else {
  throw "Supabase CLI returned non-zero exit code ($($localResult.ExitCode)) while running migration list --local."
}

Write-Section "2) Read Linked (Remote) Migration List"
$linkedResult = Run-SupabaseMigrationList -mode "linked"
if ($linkedResult.ExitCode -ne 0) {
  throw "Supabase CLI returned non-zero exit code ($($linkedResult.ExitCode)) while running migration list --linked."
}
$linked = Parse-MigrationList -lines ($linkedResult.StdOut -split "`r?`n")

$localIds = $local.Ids
$remoteIds = $linked.Ids

$remoteOnly = Diff-Ids $remoteIds $localIds
$localOnly = Diff-Ids $localIds $remoteIds

$hasPending = ($local.Pending.Count -gt 0) -or ($linked.Pending.Count -gt 0)
$hasError = ($local.Error.Count -gt 0) -or ($linked.Error.Count -gt 0)

$violations = @()

if ($hasPending) { $violations += "PENDING migrations detected" }
if ($hasError) { $violations += "ERROR migrations detected" }
if ((@($remoteOnly)).Count -gt 0) { $violations += "REMOTE-ONLY migrations detected" }
if ((@($localOnly)).Count -gt 0) { $violations += "LOCAL-ONLY migrations detected" }

if ($violations.Count -gt 0) {
  Write-Section "DRIFT GUARD FAILED"
  Write-Host "Local ledger source: $localSourceLabel"
  Write-Host "Violations:"
  foreach ($v in $violations) { Write-Host " - $v" }

  if ((@($remoteOnly)).Count -gt 0) {
    Write-Host ""
    Write-Host "Remote-only migration IDs (present in linked DB history but not in $localSourceLabel):"
    $remoteOnly | ForEach-Object { Write-Host " - $_" }
  }

  if ((@($localOnly)).Count -gt 0) {
    Write-Host ""
    Write-Host "Local-only migration IDs (present in $localSourceLabel but not in linked DB history):"
    $localOnly | ForEach-Object { Write-Host " - $_" }
  }

  if ($hasPending) {
    Write-Host ""
    Write-Host "Pending lines:"
    ($local.Pending + $linked.Pending) | Select-Object -Unique | ForEach-Object { Write-Host $_ }
  }

  if ($hasError) {
    Write-Host ""
    Write-Host "Error lines:"
    ($local.Error + $linked.Error) | Select-Object -Unique | ForEach-Object { Write-Host $_ }
  }

  if ($localSourceLabel -ne "local Supabase DB") {
    Write-Host ""
    Write-Host "For definitive validation, start local Supabase and run: supabase db reset --local"
  }

  exit 1
}

Write-Section "DRIFT GUARD PASSED"
Write-Host "Local ledger source: $localSourceLabel"
Write-Host "Local and linked migration histories appear consistent. No pending/error detected."
Write-Host "Rebuild proof still requires: supabase db reset --local"

if ($localSourceLabel -ne "local Supabase DB") {
  Write-Host "For definitive validation, start local Supabase and run: supabase db reset --local"
}

exit 0
