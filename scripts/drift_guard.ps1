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
#   - Parses the linked migration table by Local / Remote columns
#   - Reports local-only, remote-only, and shared applied IDs accurately
#
# Notes:
#   - Advisory helper only. Not a safe apply gate.
#   - Authoritative rebuild proof remains: `supabase db reset --local`
# ======================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section([string]$title) {
  Write-Host ""
  Write-Host "============================================================"
  Write-Host $title
  Write-Host "============================================================"
}

function Write-AdvisoryBanner {
  Write-Host "ADVISORY ONLY — NOT A SAFE APPLY GATE" -ForegroundColor Yellow
}

function Require-Command([string]$name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Required command not found in PATH: $name"
  }
}

function Invoke-ExternalCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FileName,

    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $argumentPreview = $Arguments -join " "
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $FileName
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
    throw "Failed to launch ${FileName}: $($_.Exception.Message)"
  }

  $stdOut = $process.StandardOutput.ReadToEnd()
  $stdErr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  return [pscustomobject]@{
    Command  = "$FileName $argumentPreview"
    ExitCode = $process.ExitCode
    StdOut   = $stdOut
    StdErr   = $stdErr
  }
}

function Invoke-SupabaseCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $argumentPreview = $Arguments -join " "
  Write-Host "Running: supabase $argumentPreview"
  return Invoke-ExternalCommand -FileName "cmd.exe" -Arguments (@("/c", "supabase") + $Arguments)
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

function New-IdSet {
  return New-Object 'System.Collections.Generic.HashSet[string]'
}

function Parse-MigrationListTable {
  param(
    [Parameter(Mandatory = $true)]
    [string]$StdOut
  )

  $rows = @()
  $pending = @()
  $error = @()

  foreach ($line in ($StdOut -split "`r?`n")) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed)) {
      continue
    }

    if ($trimmed -match '(?i)\bpending\b') {
      $pending += $line
    }

    if ($trimmed -match '(?i)\berror\b') {
      $error += $line
    }

    $match = [regex]::Match($line, '^\s*(\d{8,14})?\s*\|\s*(\d{8,14})?\s*\|\s*(.+?)\s*$')
    if (-not $match.Success) {
      continue
    }

    $rows += [pscustomobject]@{
      Local  = $match.Groups[1].Value.Trim()
      Remote = $match.Groups[2].Value.Trim()
      Time   = $match.Groups[3].Value.Trim()
      Raw    = $line
    }
  }

  $localIds = New-IdSet
  $remoteIds = New-IdSet
  $appliedIds = @()
  $localOnlyIds = @()
  $remoteOnlyIds = @()

  foreach ($row in $rows) {
    if (-not [string]::IsNullOrWhiteSpace($row.Local)) {
      [void]$localIds.Add($row.Local)
    }
    if (-not [string]::IsNullOrWhiteSpace($row.Remote)) {
      [void]$remoteIds.Add($row.Remote)
    }

    if (-not [string]::IsNullOrWhiteSpace($row.Local) -and -not [string]::IsNullOrWhiteSpace($row.Remote)) {
      $appliedIds += $row.Local
    } elseif (-not [string]::IsNullOrWhiteSpace($row.Local) -and [string]::IsNullOrWhiteSpace($row.Remote)) {
      $localOnlyIds += $row.Local
    } elseif ([string]::IsNullOrWhiteSpace($row.Local) -and -not [string]::IsNullOrWhiteSpace($row.Remote)) {
      $remoteOnlyIds += $row.Remote
    }
  }

  return [pscustomobject]@{
    Rows         = $rows
    Pending      = @($pending | Select-Object -Unique)
    Error        = @($error | Select-Object -Unique)
    LocalIds     = $localIds
    RemoteIds    = $remoteIds
    AppliedIds   = @($appliedIds | Sort-Object -Unique)
    LocalOnlyIds = @($localOnlyIds | Sort-Object -Unique)
    RemoteOnlyIds = @($remoteOnlyIds | Sort-Object -Unique)
  }
}

function Get-RepoMigrationIds {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $ids = New-IdSet
  $migrationPath = Join-Path $RepoRoot "supabase\migrations"

  Get-ChildItem -Path $migrationPath -File -Filter "*.sql" | ForEach-Object {
    if ($_.BaseName -match '^(\d{8,14})') {
      [void]$ids.Add($matches[1])
    }
  }

  return $ids
}

function Diff-Ids($aSet, $bSet) {
  $diff = @()
  foreach ($x in $aSet) {
    if (-not $bSet.Contains($x)) {
      $diff += $x
    }
  }
  return @($diff | Sort-Object)
}

function Get-LatestId([string[]]$ids) {
  $sorted = @($ids | Sort-Object)
  if ($sorted.Count -eq 0) {
    return $null
  }
  return $sorted[-1]
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Write-Section "Grookai Vault - DriftGuard (Read-only)"
Write-AdvisoryBanner

Require-Command "supabase"

$localSourceLabel = "linked output local column"
$localSummary = $null

Write-Section "1) Read Local Migration Ledger"
$localResult = Run-SupabaseMigrationList -mode "local"
if ($localResult.ExitCode -eq 0) {
  $localSummary = Parse-MigrationListTable -StdOut $localResult.StdOut
} elseif (Test-IsLocalDbUnavailable -result $localResult) {
  Write-Host "Local Supabase DB not reachable. DriftGuard local DB comparison skipped."
  Write-Host "Repo migration files will be used as the advisory local source."
  $localSourceLabel = "repo migration files"
} else {
  throw "Supabase CLI returned non-zero exit code ($($localResult.ExitCode)) while running migration list --local."
}

Write-Section "2) Read Linked (Remote) Migration List"
$linkedResult = Run-SupabaseMigrationList -mode "linked"
if ($linkedResult.ExitCode -ne 0) {
  throw "Supabase CLI returned non-zero exit code ($($linkedResult.ExitCode)) while running migration list --linked."
}

$linkedSummary = Parse-MigrationListTable -StdOut $linkedResult.StdOut

if ($localSourceLabel -eq "repo migration files") {
  $repoIds = Get-RepoMigrationIds -RepoRoot $repoRoot
  $localIds = $repoIds
  $remoteIds = $linkedSummary.RemoteIds
  $localOnly = Diff-Ids $localIds $remoteIds
  $remoteOnly = Diff-Ids $remoteIds $localIds
  $applied = @($localIds | Where-Object { $remoteIds.Contains($_) } | Sort-Object)
} else {
  $localOnly = $linkedSummary.LocalOnlyIds
  $remoteOnly = $linkedSummary.RemoteOnlyIds
  $applied = $linkedSummary.AppliedIds
}

$hasPending = (($null -ne $localSummary) -and $localSummary.Pending.Count -gt 0) -or ($linkedSummary.Pending.Count -gt 0)
$hasError = (($null -ne $localSummary) -and $localSummary.Error.Count -gt 0) -or ($linkedSummary.Error.Count -gt 0)
$latestApplied = Get-LatestId -ids $applied

Write-Section "3) Advisory Summary"
Write-AdvisoryBanner
Write-Host "Local source: $localSourceLabel"
Write-Host "Applied/shared migration IDs: $($applied.Count)"
Write-Host "Latest shared applied ID: $(if ($latestApplied) { $latestApplied } else { '<none>' })"
Write-Host "Local-only IDs: $(if ($localOnly.Count -gt 0) { $localOnly -join ', ' } else { 'none' })"
Write-Host "Remote-only IDs: $(if ($remoteOnly.Count -gt 0) { $remoteOnly -join ', ' } else { 'none' })"
Write-Host "Pending rows detected: $(if ($hasPending) { 'yes' } else { 'no' })"
Write-Host "Error rows detected: $(if ($hasError) { 'yes' } else { 'no' })"
Write-Host "Authoritative rebuild proof remains: supabase db reset --local"

$violations = @()
if ($hasPending) { $violations += "PENDING migrations detected" }
if ($hasError) { $violations += "ERROR migrations detected" }
if ($remoteOnly.Count -gt 0) { $violations += "REMOTE-ONLY migrations detected" }
if ($localOnly.Count -gt 0) { $violations += "LOCAL-ONLY migrations detected" }

if ($violations.Count -gt 0) {
  Write-Section "DRIFT GUARD ADVISORY FAIL"
  foreach ($violation in $violations) {
    Write-Host " - $violation"
  }

  if ($remoteOnly.Count -gt 0) {
    Write-Host ""
    Write-Host "Remote-only IDs:"
    $remoteOnly | ForEach-Object { Write-Host " - $_" }
  }

  if ($localOnly.Count -gt 0) {
    Write-Host ""
    Write-Host "Local-only IDs:"
    $localOnly | ForEach-Object { Write-Host " - $_" }
  }

  if ($hasPending) {
    Write-Host ""
    Write-Host "Pending lines:"
    @($localSummary?.Pending + $linkedSummary.Pending) |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
      Select-Object -Unique |
      ForEach-Object { Write-Host $_ }
  }

  if ($hasError) {
    Write-Host ""
    Write-Host "Error lines:"
    @($localSummary?.Error + $linkedSummary.Error) |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
      Select-Object -Unique |
      ForEach-Object { Write-Host $_ }
  }

  exit 1
}

Write-Section "DRIFT GUARD ADVISORY PASS"
Write-Host "No local-only, remote-only, pending, or error rows were detected."
Write-Host "ADVISORY ONLY — NOT A SAFE APPLY GATE"
Write-Host "Rebuild proof still requires: supabase db reset --local"

exit 0
