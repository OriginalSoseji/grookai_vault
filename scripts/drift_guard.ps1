# ======================================================================
# scripts/drift_guard.ps1
# Grookai Vault — DriftGuard (No-Drift Chat Rule enforcement)
#
# Purpose:
#   Deterministically fail fast if local migration history differs from the
#   linked remote (or if migrations are pending/error) BEFORE any DB/UI work.
#
# Behavior:
#   - Runs `supabase migration list --local`
#   - Runs `supabase migration list --linked`
#   - Detects:
#       * pending migrations
#       * error migrations
#       * remote-only migrations (present remotely but not locally)
#       * local-only migrations (present locally but not remotely applied)
#   - Exits non-zero on any violation.
#
# Notes:
#   - Read-only guard. No DB writes.
#   - Requires Supabase CLI installed and `supabase link` done for the repo.
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

function Run-SupabaseMigrationList([string]$mode) {
  # $mode: "local" or "linked"
  $args = @("migration", "list", "--$mode")
  Write-Host "Running: supabase $($args -join ' ')"
  $out = & supabase @args 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI returned non-zero exit code ($LASTEXITCODE) while running migration list --$mode.`n$out"
  }
  return $out
}

function Parse-MigrationList([string[]]$lines) {
  # Supabase output is a table-like list. We parse tokens conservatively:
  # - Extract migration version ids that look like 14-digit timestamps.
  # - Track any line containing 'pending' or 'error' (case-insensitive).
  $ids = New-Object System.Collections.Generic.HashSet[string]
  $pending = @()
  $error = @()

  foreach ($line in $lines) {
    $l = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($l)) { continue }

    # Flag lines that indicate pending/error in any column.
    if ($l -match '(?i)\bpending\b') { $pending += $line }
    if ($l -match '(?i)\berror\b')   { $error += $line }

    # Capture migration ids (14-digit timestamp style)
    $matches = [regex]::Matches($l, '\b\d{14}\b')
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

function HashSet-ToSortedArray($set) {
  $arr = @()
  foreach ($x in $set) { $arr += $x }
  return $arr | Sort-Object
}

function Diff-Ids($aSet, $bSet) {
  # returns items in A not in B
  $diff = @()
  foreach ($x in $aSet) {
    if (-not $bSet.Contains($x)) { $diff += $x }
  }
  return $diff | Sort-Object
}

Write-Section "Grookai Vault — DriftGuard (Read-only)"

Require-Command "supabase"

# Run both lists
Write-Section "1) Read Local Migration List"
$localOut = Run-SupabaseMigrationList -mode "local"
$localLines = $localOut -split "`r?`n"
$local = Parse-MigrationList -lines $localLines

Write-Section "2) Read Linked (Remote) Migration List"
$linkedOut = Run-SupabaseMigrationList -mode "linked"
$linkedLines = $linkedOut -split "`r?`n"
$linked = Parse-MigrationList -lines $linkedLines

# Compute diffs
$localIds  = $local.Ids
$remoteIds = $linked.Ids

$remoteOnly = Diff-Ids $remoteIds $localIds
$localOnly  = Diff-Ids $localIds $remoteIds

$hasPending = ($local.Pending.Count -gt 0) -or ($linked.Pending.Count -gt 0)
$hasError   = ($local.Error.Count -gt 0)   -or ($linked.Error.Count -gt 0)

$violations = @()

if ($hasPending) { $violations += "PENDING migrations detected" }
if ($hasError)   { $violations += "ERROR migrations detected" }
if ((@($remoteOnly)).Count -gt 0) { $violations += "REMOTE-ONLY migrations detected" }
if ((@($localOnly)).Count -gt 0)  { $violations += "LOCAL-ONLY migrations detected" }

if ($violations.Count -gt 0) {
  Write-Section "🚨 DRIFT GUARD FAILED"
  Write-Host "Violations:"
  foreach ($v in $violations) { Write-Host " - $v" }

  if ((@($remoteOnly)).Count -gt 0) {
    Write-Host ""
    Write-Host "Remote-only migration IDs (present in linked DB history but not in this repo):"
    $remoteOnly | ForEach-Object { Write-Host " - $_" }
    Write-Host ""
    Write-Host "Remediation:"
    Write-Host " - If these are legacy *_remote_schema.sql stub migrations locally, delete the stub file(s) and rerun: supabase db push"
    Write-Host " - If these are real migrations applied remotely, you must fetch/restore them into this repo before proceeding."
  }

  if ((@($localOnly)).Count -gt 0) {
    Write-Host ""
    Write-Host "Local-only migration IDs (present in repo but not in linked DB history):"
    $localOnly | ForEach-Object { Write-Host " - $_" }
    Write-Host ""
    Write-Host "Remediation:"
    Write-Host " - Run: supabase db push"
    Write-Host " - If push complains about legacy remote-schema stubs, remove the local *_remote_schema.sql stub and rerun."
  }

  if ($hasPending) {
    Write-Host ""
    Write-Host "Pending lines (local/linked):"
    ($local.Pending + $linked.Pending) | Select-Object -Unique | ForEach-Object { Write-Host $_ }
  }

  if ($hasError) {
    Write-Host ""
    Write-Host "Error lines (local/linked):"
    ($local.Error + $linked.Error) | Select-Object -Unique | ForEach-Object { Write-Host $_ }
  }

  exit 1
}

Write-Section "✅ DRIFT GUARD PASSED"
Write-Host "Local and linked migration histories appear consistent. No pending/error detected."
exit 0
