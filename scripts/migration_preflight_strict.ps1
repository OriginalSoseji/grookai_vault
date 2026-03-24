# ======================================================================
# scripts/migration_preflight_strict.ps1
# Grookai Vault - Strict migration preflight gate
#
# Modes:
#   - AuditLinkedSchema: prove linked ledger is clean and linked schema diff is empty
#   - PrePush: prove expected pending set only, detect duplicate pending objects,
#              and require local replay via `supabase db reset --local --yes`
#
# Notes:
#   - Fail-closed on any detected violation
#   - Uses column-aware parsing for `supabase migration list`
# ======================================================================

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("AuditLinkedSchema", "PrePush")]
  [string]$Phase,

  [string[]]$ExpectedLocalOnlyIds = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section([string]$title) {
  Write-Host ""
  Write-Host "============================================================"
  Write-Host $title
  Write-Host "============================================================"
}

function Fail([string]$message) {
  Write-Error $message
  exit 1
}

function Require-Command([string]$name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    Fail "Required command not found in PATH: $name"
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
    Fail "Failed to launch ${FileName}: $($_.Exception.Message)"
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

  $preview = $Arguments -join " "
  Write-Host "Running: supabase $preview"
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

  $appliedIds = @()
  $localOnlyIds = @()
  $remoteOnlyIds = @()

  foreach ($row in $rows) {
    if (-not [string]::IsNullOrWhiteSpace($row.Local) -and -not [string]::IsNullOrWhiteSpace($row.Remote)) {
      $appliedIds += $row.Local
    } elseif (-not [string]::IsNullOrWhiteSpace($row.Local) -and [string]::IsNullOrWhiteSpace($row.Remote)) {
      $localOnlyIds += $row.Local
    } elseif ([string]::IsNullOrWhiteSpace($row.Local) -and -not [string]::IsNullOrWhiteSpace($row.Remote)) {
      $remoteOnlyIds += $row.Remote
    }
  }

  return [pscustomobject]@{
    Rows          = $rows
    Pending       = @($pending | Select-Object -Unique)
    Error         = @($error | Select-Object -Unique)
    AppliedIds    = @($appliedIds | Sort-Object -Unique)
    LocalOnlyIds  = @($localOnlyIds | Sort-Object -Unique)
    RemoteOnlyIds = @($remoteOnlyIds | Sort-Object -Unique)
  }
}

function Get-RepoMigrationFiles {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $migrationPath = Join-Path $RepoRoot "supabase\migrations"
  $files = @()

  Get-ChildItem -Path $migrationPath -File -Filter "*.sql" | Sort-Object Name | ForEach-Object {
    $id = $null
    if ($_.BaseName -match '^(\d{8,14})') {
      $id = $matches[1]
    }

    $files += [pscustomobject]@{
      Id   = $id
      Name = $_.Name
      Path = $_.FullName
    }
  }

  return $files
}

function Get-DuplicateTimestampGroups {
  param(
    [Parameter(Mandatory = $true)]
    [object[]]$MigrationFiles
  )

  return @(
    $MigrationFiles |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_.Id) } |
      Group-Object Id |
      Where-Object { $_.Count -gt 1 } |
      Sort-Object Name
  )
}

function Normalize-Identifier([string]$identifier) {
  if ([string]::IsNullOrWhiteSpace($identifier)) {
    return ""
  }

  return (($identifier -replace '"', '').Trim()).ToLowerInvariant()
}

function Normalize-SchemaQualifiedName {
  param(
    [string]$Schema,
    [string]$Name
  )

  $schemaPart = Normalize-Identifier $Schema
  $namePart = Normalize-Identifier $Name

  if ([string]::IsNullOrWhiteSpace($schemaPart)) {
    $schemaPart = "public"
  }

  return "$schemaPart.$namePart"
}

function Get-ObjectDuplicates {
  param(
    [Parameter(Mandatory = $true)]
    [object[]]$PendingFiles
  )

  $indexDefinitions = @()
  $viewDefinitions = @()
  $functionDefinitions = @()

  foreach ($file in $PendingFiles) {
    $content = Get-Content -Path $file.Path -Raw

    foreach ($match in [regex]::Matches($content, '(?im)\bcreate\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?(?:(?:"[^"]+"|[a-zA-Z_][\w$]*)\s*\.)?(?:(?<schema>"[^"]+"|[a-zA-Z_][\w$]*)\s*\.)?(?<name>"[^"]+"|[a-zA-Z_][\w$]*)\b')) {
      $normalizedName = Normalize-SchemaQualifiedName -Schema $match.Groups['schema'].Value -Name $match.Groups['name'].Value
      $indexDefinitions += [pscustomobject]@{
        Type = "index"
        Name = $normalizedName
        File = $file.Name
      }
    }

    foreach ($match in [regex]::Matches($content, '(?im)\bcreate\s+(?:or\s+replace\s+)?view\s+(?:(?<schema>"[^"]+"|[a-zA-Z_][\w$]*)\s*\.)?(?<name>"[^"]+"|[a-zA-Z_][\w$]*)\b')) {
      $normalizedName = Normalize-SchemaQualifiedName -Schema $match.Groups['schema'].Value -Name $match.Groups['name'].Value
      $viewDefinitions += [pscustomobject]@{
        Type = "view"
        Name = $normalizedName
        File = $file.Name
      }
    }

    $functionStartPattern = [regex]'(?im)\bcreate\s+(?:or\s+replace\s+)?function\s+((?:(?:"[^"]+"|[a-zA-Z_][\w$]*)\s*\.)?(?:"[^"]+"|[a-zA-Z_][\w$]*))\s*\('
    $functionMatches = $functionStartPattern.Matches($content)

    foreach ($match in $functionMatches) {
      $qualifiedName = $match.Groups[1].Value
      $nameParts = $qualifiedName -split '\s*\.\s*', 2
      $schemaName = if ($nameParts.Count -eq 2) { $nameParts[0] } else { "public" }
      $functionName = if ($nameParts.Count -eq 2) { $nameParts[1] } else { $nameParts[0] }

      $openParenIndex = $match.Index + $match.Length - 1
      $depth = 0
      $closeParenIndex = -1

      for ($i = $openParenIndex; $i -lt $content.Length; $i++) {
        $char = $content[$i]
        if ($char -eq '(') {
          $depth += 1
        } elseif ($char -eq ')') {
          $depth -= 1
          if ($depth -eq 0) {
            $closeParenIndex = $i
            break
          }
        }
      }

      if ($closeParenIndex -lt 0) {
        continue
      }

      $argumentSignature = $content.Substring($openParenIndex + 1, $closeParenIndex - $openParenIndex - 1)
      $argumentSignature = (($argumentSignature -replace '\s+', ' ').Trim()).ToLowerInvariant()
      $normalizedName = Normalize-SchemaQualifiedName -Schema $schemaName -Name $functionName
      $functionDefinitions += [pscustomobject]@{
        Type = "function"
        Name = "$normalizedName($argumentSignature)"
        File = $file.Name
      }
    }
  }

  return [pscustomobject]@{
    DuplicateIndexes = @($indexDefinitions | Group-Object Name | Where-Object { $_.Count -gt 1 } | Sort-Object Name)
    DuplicateViews = @($viewDefinitions | Group-Object Name | Where-Object { $_.Count -gt 1 } | Sort-Object Name)
    DuplicateFunctions = @($functionDefinitions | Group-Object Name | Where-Object { $_.Count -gt 1 } | Sort-Object Name)
  }
}

function Normalize-ExpectedIds([string[]]$ids) {
  $normalized = @()

  foreach ($entry in $ids) {
    if ([string]::IsNullOrWhiteSpace($entry)) {
      continue
    }

    foreach ($part in ($entry -split ',')) {
      $trimmed = $part.Trim()
      if (-not [string]::IsNullOrWhiteSpace($trimmed)) {
        $normalized += $trimmed
      }
    }
  }

  return @($normalized | Sort-Object -Unique)
}

function Compare-IdSets {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Expected,

    [Parameter(Mandatory = $true)]
    [string[]]$Actual
  )

  $expectedSet = New-IdSet
  foreach ($id in $Expected) {
    [void]$expectedSet.Add($id)
  }

  $actualSet = New-IdSet
  foreach ($id in $Actual) {
    [void]$actualSet.Add($id)
  }

  $unexpected = @()
  foreach ($id in $actualSet) {
    if (-not $expectedSet.Contains($id)) {
      $unexpected += $id
    }
  }

  $missing = @()
  foreach ($id in $expectedSet) {
    if (-not $actualSet.Contains($id)) {
      $missing += $id
    }
  }

  return [pscustomobject]@{
    Unexpected = @($unexpected | Sort-Object)
    Missing    = @($missing | Sort-Object)
  }
}

function Get-ProjectIdFromConfig([string]$RepoRoot) {
  $configPath = Join-Path $RepoRoot "supabase\config.toml"
  if (-not (Test-Path $configPath)) {
    return $null
  }

  foreach ($line in (Get-Content -Path $configPath)) {
    if ($line -match '^\s*project_id\s*=\s*"([^"]+)"') {
      return $matches[1]
    }
  }

  return $null
}

function Get-LocalDiffBody([string]$StdOut) {
  if ([string]::IsNullOrWhiteSpace($StdOut)) {
    return ""
  }

  return $StdOut.Trim()
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$migrationFiles = @(Get-RepoMigrationFiles -RepoRoot $repoRoot)
$duplicateTimestamps = @(Get-DuplicateTimestampGroups -MigrationFiles $migrationFiles)
$projectId = Get-ProjectIdFromConfig -RepoRoot $repoRoot
$targetUrl = if ([string]::IsNullOrWhiteSpace($env:SUPABASE_URL)) { "<not set>" } else { $env:SUPABASE_URL }

Require-Command "supabase"
Require-Command "pwsh"

Push-Location $repoRoot
try {
  Write-Section "Grookai Vault - Strict Migration Preflight"
  Write-Host "Phase: $Phase"
  Write-Host "Target: REMOTE"
  Write-Host "SUPABASE_URL: $targetUrl"
  Write-Host "project_ref: $(if ($projectId) { $projectId } else { '<not found>' })"

  if ($duplicateTimestamps.Count -gt 0) {
    Write-Section "FAIL - Duplicate Migration Timestamps"
    foreach ($group in $duplicateTimestamps) {
      Write-Host "Timestamp: $($group.Name)"
      foreach ($entry in $group.Group) {
        Write-Host " - $($entry.Name)"
      }
    }

    exit 1
  }

  Write-Section "1) Linked Migration Ledger"
  $linkedResult = Invoke-SupabaseCommand -Arguments @("migration", "list", "--linked")
  Write-CommandTranscript -result $linkedResult
  if ($linkedResult.ExitCode -ne 0) {
    Fail "supabase migration list --linked failed with exit code $($linkedResult.ExitCode)"
  }

  $linkedSummary = Parse-MigrationListTable -StdOut $linkedResult.StdOut

  if ($linkedSummary.RemoteOnlyIds.Count -gt 0) {
    Write-Section "FAIL - Remote-Only Migration IDs"
    $linkedSummary.RemoteOnlyIds | ForEach-Object { Write-Host " - $_" }
    exit 1
  }

  if ($linkedSummary.Pending.Count -gt 0) {
    Write-Section "FAIL - Pending Rows"
    $linkedSummary.Pending | ForEach-Object { Write-Host $_ }
    exit 1
  }

  if ($linkedSummary.Error.Count -gt 0) {
    Write-Section "FAIL - Error Rows"
    $linkedSummary.Error | ForEach-Object { Write-Host $_ }
    exit 1
  }

  if ($Phase -eq "AuditLinkedSchema") {
    Write-Section "2) Linked Schema Diff"
    $diffResult = Invoke-SupabaseCommand -Arguments @("db", "diff", "--linked")
    Write-CommandTranscript -result $diffResult
    if ($diffResult.ExitCode -ne 0) {
      Fail "supabase db diff --linked failed with exit code $($diffResult.ExitCode)"
    }

    $diffBody = Get-LocalDiffBody -StdOut $diffResult.StdOut
    if (-not [string]::IsNullOrWhiteSpace($diffBody)) {
      Write-Section "FAIL - Linked Schema Drift Detected"
      Write-Host $diffBody
      exit 1
    }

    Write-Section "STRICT PREFLIGHT PASS"
    Write-Host "Linked migration ledger is clean and linked schema diff is empty."
    exit 0
  }

  Write-Section "2) Advisory Drift Guard"
  $driftGuardPath = Join-Path $repoRoot "scripts\drift_guard.ps1"
  $driftGuardResult = Invoke-ExternalCommand -FileName "pwsh" -Arguments @("-NoProfile", "-File", $driftGuardPath)
  Write-CommandTranscript -result $driftGuardResult
  Write-Host "drift_guard exit code: $($driftGuardResult.ExitCode)"

  $expectedLocalOnly = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  $actualLocalOnly = @($linkedSummary.LocalOnlyIds)
  $comparison = Compare-IdSets -Expected $expectedLocalOnly -Actual $actualLocalOnly

  Write-Section "3) Expected Local-Only IDs"
  Write-Host "Expected: $(if ($expectedLocalOnly.Count -gt 0) { $expectedLocalOnly -join ', ' } else { 'none' })"
  Write-Host "Actual: $(if ($actualLocalOnly.Count -gt 0) { $actualLocalOnly -join ', ' } else { 'none' })"

  if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) {
    Write-Section "FAIL - Unexpected Local-Only Pending Set"
    if ($comparison.Unexpected.Count -gt 0) {
      Write-Host "Unexpected local-only IDs:"
      $comparison.Unexpected | ForEach-Object { Write-Host " - $_" }
    }

    if ($comparison.Missing.Count -gt 0) {
      Write-Host "Expected but missing local-only IDs:"
      $comparison.Missing | ForEach-Object { Write-Host " - $_" }
    }

    exit 1
  }

  Write-Section "4) Pending Migration Object Scan"
  $pendingFiles = @($migrationFiles | Where-Object { $actualLocalOnly -contains $_.Id })
  if ($pendingFiles.Count -eq 0) {
    Write-Host "No pending migration files to scan."
  } else {
    $duplicates = Get-ObjectDuplicates -PendingFiles $pendingFiles

    if ($duplicates.DuplicateIndexes.Count -gt 0) {
      Write-Section "FAIL - Duplicate Index Names In Pending Migrations"
      foreach ($group in $duplicates.DuplicateIndexes) {
        Write-Host "Index: $($group.Name)"
        foreach ($entry in $group.Group) {
          Write-Host " - $($entry.File)"
        }
      }
      exit 1
    }

    if ($duplicates.DuplicateViews.Count -gt 0) {
      Write-Section "FAIL - Duplicate View Names In Pending Migrations"
      foreach ($group in $duplicates.DuplicateViews) {
        Write-Host "View: $($group.Name)"
        foreach ($entry in $group.Group) {
          Write-Host " - $($entry.File)"
        }
      }
      exit 1
    }

    if ($duplicates.DuplicateFunctions.Count -gt 0) {
      Write-Section "FAIL - Duplicate Function Signatures In Pending Migrations"
      foreach ($group in $duplicates.DuplicateFunctions) {
        Write-Host "Function: $($group.Name)"
        foreach ($entry in $group.Group) {
          Write-Host " - $($entry.File)"
        }
      }
      exit 1
    }

    Write-Host "Pending migration object scan passed."
  }

  Write-Section "5) Local Replay Proof"
  $resetResult = Invoke-SupabaseCommand -Arguments @("db", "reset", "--local", "--yes")
  Write-CommandTranscript -result $resetResult
  if ($resetResult.ExitCode -ne 0) {
    Fail "supabase db reset --local --yes failed with exit code $($resetResult.ExitCode)"
  }

  Write-Section "STRICT PREFLIGHT PASS"
  Write-Host "Expected pending set matched, duplicate pending objects were not found, and local replay passed."
  exit 0
} finally {
  Pop-Location
}
