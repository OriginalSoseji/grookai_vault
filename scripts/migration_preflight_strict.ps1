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

  [string[]]$ExpectedLocalOnlyIds = @(),

  [switch]$ReconciledReplayAudit,
  [switch]$CollectorCameoIsolatedReplay,
  [switch]$StorefrontReleaseIsolatedReplay,
  [switch]$VendorBillingBaselineAudit,
  [switch]$StoreIndexBaselineAudit,
  [switch]$CustomImportBaselineAudit,
  [switch]$SellerBindingsBaselineAudit,
  [switch]$VendorSellerAdoptionBaselineAudit,
  [switch]$VendorSellerAdoptionReleaseV1,
  [switch]$VendorStockBaselineAudit,
  [switch]$VendorOrdersBaselineAudit,
  [switch]$VendorCheckoutBaselineAudit,
  [switch]$VendorOrderCancellationBaselineAudit,
  [switch]$VendorUnstartedOrderBaselineAudit,
  [switch]$VendorOrderRetryBaselineAudit,
  [switch]$VendorOrderFulfillmentBaselineAudit,
  [switch]$VendorOrderRefundsBaselineAudit,
  [switch]$VendorOrderNotificationsBaselineAudit,
  [switch]$VendorOrderNotificationsV2BaselineAudit,
  [switch]$VendorOrderResolutionsBaselineAudit,
  [switch]$VendorPreordersBaselineAudit,
  [switch]$VendorPreorderConflictBaselineAudit,
  [switch]$VendorBatchCommitBaselineAudit,
  [switch]$VendorBatchPrivateCopyBaselineAudit,
  [switch]$VendorBatchCancellationBaselineAudit,
  [switch]$VendorPreordersPilotApply,
  [switch]$VendorBatchCommitPilotApply,
  [switch]$VendorBatchCancellationPilotApply,
  [switch]$StorefrontProductionReleaseV1,
  [switch]$StorefrontProductionTrialsV1,
  [switch]$VendorStoreTeamBaselineAudit,
  [switch]$VendorStoreTeamWorkflowsBaselineAudit,
  [switch]$NativeImportRecoveryBaselineAudit,
  [switch]$CollectrImportFidelityBaselineAudit,
  [switch]$CollectrImportFidelityReleaseV1,
  [switch]$CosmosPricingReleaseV1,
  [switch]$SearchDatabaseLatencyV1,
  [switch]$ReceiptCloudV1,
  [switch]$SearchNamePlanV1,
  [switch]$JungleEditionBaselineAudit,
  [switch]$JungleEditionBaseline412Audit,
  [switch]$JungleEditionAliasBaselineAudit,
  [switch]$JungleEditionSourceBaselineAudit,
  [switch]$JungleEditionSearchBaselineAudit,
  [switch]$JungleSlabBaselineAudit,
  [switch]$JungleReceiptBaselineAudit,
  [switch]$JungleReleaseV32,
  [switch]$NativeImportRecoveryReleaseV1,
  [switch]$VendorStoreTeamReleaseV1,
  [switch]$VendorStoreTeamHardeningV1,
  [switch]$VendorStoreTeamWorkflowsV1,
  [switch]$VendorStoreCatalogBaselineAudit,
  [string]$InspectionDeps,
  [string]$AuditEnvFile,
  [string]$AuditOutDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($JungleReleaseV32) {
  $jungleExpected = @('20261001050000','20261001203000','20261001211000','20261001213000','20261001220000','20261001223000','20261001224000','20261002010000')
  $jungleRequested = @($ExpectedLocalOnlyIds | ForEach-Object { $_ -split ',' } | Sort-Object)
  if (@($PSBoundParameters.Keys | Where-Object { $_ -notin @('Phase','JungleReleaseV32','ExpectedLocalOnlyIds') }).Count -gt 0 -or ($jungleRequested.Count -gt 0 -and ($jungleRequested -join ',') -ne ($jungleExpected -join ',')) -or ($Phase -eq 'PrePush' -and ($jungleRequested -join ',') -ne ($jungleExpected -join ','))) {
    throw 'Jungle V32 permits only the exact eight migrations, without combined scopes or overrides.'
  }
  & node --use-system-ca (Join-Path $PSScriptRoot 'schema/verify_jungle_release_v32.mjs') $Phase
  exit $LASTEXITCODE
}

if ($JungleReceiptBaselineAudit) {
  if ($Phase -ne 'AuditLinkedSchema' -or @($PSBoundParameters.Keys | Where-Object { $_ -notin @('Phase','JungleReceiptBaselineAudit') }).Count -gt 0) {
    throw 'Jungle receipt baseline is read-only and cannot combine scopes or authorize PrePush.'
  }
  & node --use-system-ca (Join-Path $PSScriptRoot 'schema/audit_jungle_edition_baseline_v10.mjs')
  exit $LASTEXITCODE
}

if ($JungleSlabBaselineAudit) {
  if ($Phase -ne 'AuditLinkedSchema' -or @($PSBoundParameters.Keys | Where-Object { $_ -notin @('Phase','JungleSlabBaselineAudit') }).Count -gt 0) {
    throw 'Jungle slab baseline is read-only and cannot combine scopes or authorize PrePush.'
  }
  & node --use-system-ca (Join-Path $PSScriptRoot 'schema/audit_jungle_edition_baseline_v9.mjs')
  exit $LASTEXITCODE
}

if ($JungleEditionSearchBaselineAudit) {
  if ($Phase -ne 'AuditLinkedSchema' -or @($PSBoundParameters.Keys | Where-Object { $_ -notin @('Phase','JungleEditionSearchBaselineAudit') }).Count -gt 0) {
    throw 'Jungle search baseline is read-only and cannot combine scopes or authorize PrePush.'
  }
  & node --use-system-ca (Join-Path $PSScriptRoot 'schema/audit_jungle_edition_baseline_v8.mjs')
  exit $LASTEXITCODE
}

if ($CollectrImportFidelityBaselineAudit) {
  if ($Phase -ne 'AuditLinkedSchema' -or @($PSBoundParameters.Keys | Where-Object { $_ -notin @('Phase','CollectrImportFidelityBaselineAudit') }).Count -gt 0) {
    throw 'Collectr fidelity baseline is read-only and cannot combine scopes or authorize PrePush.'
  }
  & node --use-system-ca (Join-Path $PSScriptRoot 'schema/audit_collectr_import_baseline_v1.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Collectr baseline differs; no schema work/apply is qualified.' }
  Write-Host 'STRICT COLLECTR BASELINE PASS — read-only, no PrePush or apply authority.'
  exit 0
}

$script:PreflightStartedAt = Get-Date
$script:StepIndex = 0

function Format-Elapsed([TimeSpan]$elapsed) {
  return "{0:hh\:mm\:ss\.fff}" -f $elapsed
}

function Write-TimerMarker([string]$message) {
  $elapsed = (Get-Date) - $script:PreflightStartedAt
  Write-Host "[strict-preflight][$(Format-Elapsed $elapsed)] $message"
}

function Write-Section([string]$title) {
  Write-Host ""
  Write-Host "============================================================"
  Write-Host $title
  Write-Host "============================================================"
  Write-TimerMarker "section: $title"
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
  $script:StepIndex += 1
  $stepNumber = $script:StepIndex
  $stepStartedAt = Get-Date
  Write-TimerMarker "step ${stepNumber} start: ${FileName} ${argumentPreview}"

  $stdoutPath = Join-Path ([System.IO.Path]::GetTempPath()) ("grookai-strict-preflight-{0}-stdout.log" -f ([guid]::NewGuid().ToString("N")))
  $stderrPath = Join-Path ([System.IO.Path]::GetTempPath()) ("grookai-strict-preflight-{0}-stderr.log" -f ([guid]::NewGuid().ToString("N")))
  try {
    & $FileName @Arguments 1> $stdoutPath 2> $stderrPath
    $exitCode = $LASTEXITCODE
  } catch {
    Fail "Failed to launch ${FileName}: $($_.Exception.Message)"
  }

  $stdOut = if (Test-Path $stdoutPath) { Get-Content -LiteralPath $stdoutPath -Raw } else { "" }
  Write-TimerMarker "step ${stepNumber} stdout read complete"
  $stdErr = if (Test-Path $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw } else { "" }
  Write-TimerMarker "step ${stepNumber} stderr read complete"
  Remove-Item -LiteralPath $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue
  $stepElapsed = (Get-Date) - $stepStartedAt
  Write-TimerMarker "step ${stepNumber} exit=$exitCode elapsed=$(Format-Elapsed $stepElapsed)"

  return [pscustomobject]@{
    Command  = "$FileName $argumentPreview"
    ExitCode = $exitCode
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

function Write-BoundedText {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Text,

    [int]$MaxChars = 12000
  )

  $trimmed = $Text.TrimEnd()
  if ($trimmed.Length -le $MaxChars) {
    Write-Host $trimmed
    return
  }

  Write-Host $trimmed.Substring(0, $MaxChars)
  Write-Host ""
  Write-Host "[strict-preflight] transcript truncated after $MaxChars chars from $($trimmed.Length) total chars"
}

function Write-CommandTranscript($result) {
  if (-not [string]::IsNullOrWhiteSpace($result.StdOut)) {
    Write-Host "[stdout]"
    Write-BoundedText -Text $result.StdOut
  }

  if (-not [string]::IsNullOrWhiteSpace($result.StdErr)) {
    if ($result.ExitCode -eq 0) {
      Write-Host "[stderr/info]"
      Write-BoundedText -Text $result.StdErr
    } else {
      Write-Host "[stderr/error]"
      Write-BoundedText -Text $result.StdErr
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
    [AllowEmptyCollection()]
    [string[]]$Expected,

    [Parameter(Mandatory = $true)]
    [AllowEmptyCollection()]
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

if ($ReceiptCloudV1) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','ReceiptCloudV1')
  $receiptExpected = (@(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds) -join ',')
  if (@($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0 -or $receiptExpected -notin @('', '20261002220000') -or ($Phase -eq 'PrePush' -and $receiptExpected -ne '20261002220000')) { Fail 'Receipt cloud release permits only its exact migration, without combined modes or target overrides.' }
  $receiptRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $receiptFiles = @(Get-RepoMigrationFiles -RepoRoot $receiptRoot)
  if (@(Get-DuplicateTimestampGroups -MigrationFiles $receiptFiles).Count -gt 0) { Fail 'Duplicate migration timestamps.' }
  $receiptPending = @($receiptFiles | Where-Object { $_.Id -eq '20261002220000' })
  if ($receiptPending.Count -ne $(if ($receiptExpected) { 1 } else { 0 })) { Fail 'Receipt cloud pending migration differs from requested scope.' }
  if ($receiptPending.Count) {
    $receiptDuplicates = Get-ObjectDuplicates -PendingFiles $receiptPending
    if ($receiptDuplicates.DuplicateIndexes.Count -gt 0 -or $receiptDuplicates.DuplicateViews.Count -gt 0 -or $receiptDuplicates.DuplicateFunctions.Count -gt 0) { Fail 'Duplicate pending receipt objects.' }
  }
  Require-Command 'node'
  $receiptGate = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/verify_receipt_cloud_v1.mjs'),$Phase)
  Write-CommandTranscript -result $receiptGate
  if ($receiptGate.ExitCode -ne 0) { Fail 'Receipt cloud database qualification failed; no apply.' }
  exit 0
}

if ($SearchNamePlanV1) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','SearchNamePlanV1')
  $searchExpected = (@(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds) -join ',')
  if (@($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0 -or $searchExpected -notin @('', '20261001210000') -or ($Phase -eq 'PrePush' -and $searchExpected -ne '20261001210000')) { Fail 'Search release permits only its exact migration, without combined modes or target overrides.' }
  $searchRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $searchFiles = @(Get-RepoMigrationFiles -RepoRoot $searchRoot)
  if (@(Get-DuplicateTimestampGroups -MigrationFiles $searchFiles).Count -gt 0) { Fail 'Duplicate migration timestamps.' }
  $searchPending = @($searchFiles | Where-Object { $_.Id -eq '20261001210000' })
  if ($searchPending.Count -ne $(if ($searchExpected) { 1 } else { 0 })) { Fail 'Search pending migration differs from requested scope.' }
  if ($searchPending.Count) {
    $searchDuplicates = Get-ObjectDuplicates -PendingFiles $searchPending
    if ($searchDuplicates.DuplicateIndexes.Count -gt 0 -or $searchDuplicates.DuplicateViews.Count -gt 0 -or $searchDuplicates.DuplicateFunctions.Count -gt 0) { Fail 'Duplicate pending search objects.' }
  }
  Require-Command 'node'
  $searchGate = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/verify_search_name_plan_v1.mjs'),$Phase)
  Write-CommandTranscript -result $searchGate
  if ($searchGate.ExitCode -ne 0) { Fail 'Search database qualification failed; no apply.' }
  exit 0
}

if ($SearchDatabaseLatencyV1) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','SearchDatabaseLatencyV1')
  $searchExpected = (@(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds) -join ',')
  if (@($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0 -or $searchExpected -notin @('', '20261001150000') -or ($Phase -eq 'PrePush' -and $searchExpected -ne '20261001150000')) { Fail 'Search release permits only its exact migration, without combined modes or target overrides.' }
  $searchRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $searchFiles = @(Get-RepoMigrationFiles -RepoRoot $searchRoot)
  if (@(Get-DuplicateTimestampGroups -MigrationFiles $searchFiles).Count -gt 0) { Fail 'Duplicate migration timestamps.' }
  $searchPending = @($searchFiles | Where-Object { $_.Id -eq '20261001150000' })
  if ($searchPending.Count -ne $(if ($searchExpected) { 1 } else { 0 })) { Fail 'Search pending migration differs from requested scope.' }
  if ($searchPending.Count) {
    $searchDuplicates = Get-ObjectDuplicates -PendingFiles $searchPending
    if ($searchDuplicates.DuplicateIndexes.Count -gt 0 -or $searchDuplicates.DuplicateViews.Count -gt 0 -or $searchDuplicates.DuplicateFunctions.Count -gt 0) { Fail 'Duplicate pending search objects.' }
  }
  Require-Command 'node'
  $searchGate = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/verify_search_database_latency_v1.mjs'),$Phase)
  Write-CommandTranscript -result $searchGate
  if ($searchGate.ExitCode -ne 0) { Fail 'Search database qualification failed; no apply.' }
  exit 0
}

if ($JungleEditionSourceBaselineAudit) {
  if ($Phase -ne 'AuditLinkedSchema' -or @($PSBoundParameters.Keys | Where-Object { $_ -notin @('Phase','JungleEditionSourceBaselineAudit') }).Count -gt 0) { Fail 'Jungle baseline permits only its fixed read-only audit; no PrePush or combined modes.' }
  $jungleRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $jungleFiles = @(Get-RepoMigrationFiles -RepoRoot $jungleRoot)
  if (@(Get-DuplicateTimestampGroups -MigrationFiles $jungleFiles).Count -gt 0) { Fail 'Duplicate migration timestamps.' }
  $junglePending = @($jungleFiles | Where-Object { $_.Id -eq '20261001050000' })
  if ($junglePending.Count -gt 0) {
    $jungleDuplicates = Get-ObjectDuplicates -PendingFiles $junglePending
    if ($jungleDuplicates.DuplicateIndexes.Count -gt 0 -or $jungleDuplicates.DuplicateViews.Count -gt 0 -or $jungleDuplicates.DuplicateFunctions.Count -gt 0) { Fail 'Duplicate pending Jungle objects.' }
  }
  $jungleAudit = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/audit_jungle_edition_baseline_v7.mjs'))
  Write-CommandTranscript -result $jungleAudit
  if ($jungleAudit.ExitCode -ne 0) { Fail 'Jungle baseline differs; no schema work or apply.' }
  Write-Host 'STRICT JUNGLE 413 BASELINE PASS - READ ONLY, NO APPLY AUTHORITY'
  exit 0
}

if ($JungleEditionAliasBaselineAudit) {
  if ($Phase -ne 'AuditLinkedSchema' -or @($PSBoundParameters.Keys | Where-Object { $_ -notin @('Phase','JungleEditionAliasBaselineAudit') }).Count -gt 0) { Fail 'Jungle baseline permits only its fixed read-only audit; no PrePush or combined modes.' }
  $jungleRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $jungleFiles = @(Get-RepoMigrationFiles -RepoRoot $jungleRoot)
  if (@(Get-DuplicateTimestampGroups -MigrationFiles $jungleFiles).Count -gt 0) { Fail 'Duplicate migration timestamps.' }
  $junglePending = @($jungleFiles | Where-Object { $_.Id -eq '20261001050000' })
  if ($junglePending.Count -gt 0) {
    $jungleDuplicates = Get-ObjectDuplicates -PendingFiles $junglePending
    if ($jungleDuplicates.DuplicateIndexes.Count -gt 0 -or $jungleDuplicates.DuplicateViews.Count -gt 0 -or $jungleDuplicates.DuplicateFunctions.Count -gt 0) { Fail 'Duplicate pending Jungle objects.' }
  }
  $jungleAudit = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/audit_jungle_edition_baseline_v3.mjs'))
  Write-CommandTranscript -result $jungleAudit
  if ($jungleAudit.ExitCode -ne 0) { Fail 'Jungle baseline differs; no schema work or apply.' }
  Write-Host 'STRICT JUNGLE 413 ALIAS BASELINE PASS - READ ONLY, NO APPLY AUTHORITY'
  exit 0
}

if ($JungleEditionBaseline412Audit) {
  if ($Phase -ne 'AuditLinkedSchema' -or @($PSBoundParameters.Keys | Where-Object { $_ -notin @('Phase','JungleEditionBaseline412Audit') }).Count -gt 0) { Fail 'Jungle baseline permits only its fixed read-only audit; no PrePush or combined modes.' }
  $jungleRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $jungleFiles = @(Get-RepoMigrationFiles -RepoRoot $jungleRoot)
  if (@(Get-DuplicateTimestampGroups -MigrationFiles $jungleFiles).Count -gt 0) { Fail 'Duplicate migration timestamps.' }
  $junglePending = @($jungleFiles | Where-Object { $_.Id -eq '20261001050000' })
  if ($junglePending.Count -gt 0) {
    $jungleDuplicates = Get-ObjectDuplicates -PendingFiles $junglePending
    if ($jungleDuplicates.DuplicateIndexes.Count -gt 0 -or $jungleDuplicates.DuplicateViews.Count -gt 0 -or $jungleDuplicates.DuplicateFunctions.Count -gt 0) { Fail 'Duplicate pending Jungle objects.' }
  }
  $jungleAudit = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/audit_jungle_edition_baseline_v2.mjs'))
  Write-CommandTranscript -result $jungleAudit
  if ($jungleAudit.ExitCode -ne 0) { Fail 'Jungle baseline differs; no schema work or apply.' }
  Write-Host 'STRICT JUNGLE 412 BASELINE PASS - READ ONLY, NO APPLY AUTHORITY'
  exit 0
}

if ($JungleEditionBaselineAudit) {
  if ($Phase -ne 'AuditLinkedSchema' -or @($PSBoundParameters.Keys | Where-Object { $_ -notin @('Phase','JungleEditionBaselineAudit') }).Count -gt 0) { Fail 'Jungle baseline permits only its fixed read-only audit; no PrePush or combined modes.' }
  $jungleRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $jungleFiles = @(Get-RepoMigrationFiles -RepoRoot $jungleRoot)
  if (@(Get-DuplicateTimestampGroups -MigrationFiles $jungleFiles).Count -gt 0) { Fail 'Duplicate migration timestamps.' }
  $junglePending = @($jungleFiles | Where-Object { $_.Id -eq '20261001050000' })
  if ($junglePending.Count -gt 0) {
    $jungleDuplicates = Get-ObjectDuplicates -PendingFiles $junglePending
    if ($jungleDuplicates.DuplicateIndexes.Count -gt 0 -or $jungleDuplicates.DuplicateViews.Count -gt 0 -or $jungleDuplicates.DuplicateFunctions.Count -gt 0) { Fail 'Duplicate pending Jungle objects.' }
  }
  $jungleAudit = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/audit_jungle_edition_baseline_v1.mjs'))
  Write-CommandTranscript -result $jungleAudit
  if ($jungleAudit.ExitCode -ne 0) { Fail 'Jungle baseline differs; no schema work or apply.' }
  Write-Host 'STRICT JUNGLE BASELINE PASS - READ ONLY, NO APPLY AUTHORITY'
  exit 0
}

if ($CosmosPricingReleaseV1) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','CosmosPricingReleaseV1')
  if (@($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0 -or (@(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds) -join ',') -ne '20260930233000') { Fail 'Cosmos release permits only its exact migration, without combined modes or target overrides.' }
  $cosmosRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $cosmosFiles = @(Get-RepoMigrationFiles -RepoRoot $cosmosRoot)
  if (@(Get-DuplicateTimestampGroups -MigrationFiles $cosmosFiles).Count -gt 0) { Fail 'Duplicate migration timestamps.' }
  $cosmosPending = @($cosmosFiles | Where-Object { $_.Id -eq '20260930233000' })
  if ($cosmosPending.Count -ne 1) { Fail 'Cosmos release migration missing.' }
  $cosmosDuplicates = Get-ObjectDuplicates -PendingFiles $cosmosPending
  if ($cosmosDuplicates.DuplicateIndexes.Count -gt 0 -or $cosmosDuplicates.DuplicateViews.Count -gt 0 -or $cosmosDuplicates.DuplicateFunctions.Count -gt 0) { Fail 'Duplicate pending Cosmos objects.' }
  Require-Command 'node'
  $cosmosGate = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/verify_cosmos_pricing_release_v1.mjs'),$Phase)
  Write-CommandTranscript -result $cosmosGate
  if ($cosmosGate.ExitCode -ne 0) { Fail 'Cosmos release qualification failed; no apply.' }
  exit 0
}

if ($CollectrImportFidelityReleaseV1) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','CollectrImportFidelityReleaseV1')
  if (@($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0 -or (@(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds) -join ',') -ne '20260930010000') { Fail 'Collectr release permits only its exact migration, without combined modes or target overrides.' }
  $collectrRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $collectrFiles = @(Get-RepoMigrationFiles -RepoRoot $collectrRoot)
  if (@(Get-DuplicateTimestampGroups -MigrationFiles $collectrFiles).Count -gt 0) { Fail 'Duplicate migration timestamps.' }
  $collectrPending = @($collectrFiles | Where-Object { $_.Id -eq '20260930010000' })
  if ($collectrPending.Count -ne 1) { Fail 'Collectr release migration missing.' }
  $collectrDuplicates = Get-ObjectDuplicates -PendingFiles $collectrPending
  if ($collectrDuplicates.DuplicateIndexes.Count -gt 0 -or $collectrDuplicates.DuplicateViews.Count -gt 0 -or $collectrDuplicates.DuplicateFunctions.Count -gt 0) { Fail 'Duplicate pending Collectr objects.' }
  Require-Command 'node'
  $collectrGate = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/verify_collectr_import_release_v1.mjs'),$Phase)
  Write-CommandTranscript -result $collectrGate
  if ($collectrGate.ExitCode -ne 0) { Fail 'Collectr release qualification failed; no apply.' }
  exit 0
}

if ($VendorSellerAdoptionReleaseV1) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','VendorSellerAdoptionReleaseV1')
  if (@($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0 -or (@(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds) -join ',') -ne '20260928213000') { Fail 'Seller adoption release permits only its exact migration, without combined modes or target overrides.' }
  $adoptionRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $adoptionFiles = @(Get-RepoMigrationFiles -RepoRoot $adoptionRoot)
  if (@(Get-DuplicateTimestampGroups -MigrationFiles $adoptionFiles).Count -gt 0) { Fail 'Duplicate migration timestamps.' }
  $adoptionPending = @($adoptionFiles | Where-Object { $_.Id -eq '20260928213000' })
  if ($adoptionPending.Count -ne 1) { Fail 'Seller adoption migration missing.' }
  $adoptionDuplicates = Get-ObjectDuplicates -PendingFiles $adoptionPending
  if ($adoptionDuplicates.DuplicateIndexes.Count -gt 0 -or $adoptionDuplicates.DuplicateViews.Count -gt 0 -or $adoptionDuplicates.DuplicateFunctions.Count -gt 0) { Fail 'Duplicate pending adoption objects.' }
  Require-Command 'node'
  $adoptionGate = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/verify_vendor_seller_adoption_release_v1.mjs'),$Phase)
  Write-CommandTranscript -result $adoptionGate
  if ($adoptionGate.ExitCode -ne 0) { Fail 'Seller adoption source, replay, upgrade or release gate failed; no apply.' }
  exit 0
}

if ($VendorSellerAdoptionBaselineAudit) {
  if ($Phase -ne 'AuditLinkedSchema' -or @($PSBoundParameters.Keys | Where-Object { $_ -notin @('Phase','VendorSellerAdoptionBaselineAudit') }).Count -gt 0) { Fail 'Seller adoption baseline permits only its fixed read-only audit.' }
  Require-Command 'node'
  $sellerAdoptionAudit = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/audit_vendor_seller_adoption_baseline_v1.mjs'))
  Write-CommandTranscript -result $sellerAdoptionAudit
  if ($sellerAdoptionAudit.ExitCode -ne 0) { Fail 'Seller adoption baseline failed; no schema work or apply.' }
  exit 0
}

if ($NativeImportRecoveryReleaseV1) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','NativeImportRecoveryReleaseV1')
  if ($Phase -notin @('AuditLinkedSchema','PrePush') -or @($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0 -or (@(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds) -join ',') -ne '20260926230000,20260928020000') { Fail 'Native import release permits only its two exact migrations, without combined modes or target overrides.' }
  $nativeRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $nativeFiles = @(Get-RepoMigrationFiles -RepoRoot $nativeRoot)
  if (@(Get-DuplicateTimestampGroups -MigrationFiles $nativeFiles).Count -gt 0) { Fail 'Duplicate migration timestamps.' }
  $nativePending = @($nativeFiles | Where-Object { $_.Id -in @('20260926230000','20260928020000') })
  if ($nativePending.Count -ne 2) { Fail 'Native import release migrations missing.' }
  $nativeDuplicates = Get-ObjectDuplicates -PendingFiles $nativePending
  if ($nativeDuplicates.DuplicateIndexes.Count -gt 0 -or $nativeDuplicates.DuplicateViews.Count -gt 0 -or $nativeDuplicates.DuplicateFunctions.Count -gt 0) { Fail 'Duplicate pending import objects.' }
  Require-Command 'node'
  $nativeGate = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/verify_native_import_release_v1.mjs'),$Phase)
  Write-CommandTranscript -result $nativeGate
  if ($nativeGate.ExitCode -ne 0) { Fail 'Native import baseline, replay, source or release checks failed; no apply.' }
  Write-Section 'STRICT NATIVE IMPORT RELEASE PASS - NO APPLY'
  exit 0
}

if ($NativeImportRecoveryBaselineAudit) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','NativeImportRecoveryBaselineAudit')
  $nativeExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds) -join ','
  if ($Phase -ne 'AuditLinkedSchema' -or $nativeExpected -notin @('', '20260926230000', '20260926230000,20260928020000') -or @($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0) { Fail 'Native import baseline permits only fixed read-only AuditLinkedSchema; no combined modes, target overrides or apply.' }
  $nativeRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $nativeFiles = @(Get-RepoMigrationFiles -RepoRoot $nativeRoot)
  if (@(Get-DuplicateTimestampGroups -MigrationFiles $nativeFiles).Count -gt 0) { Fail 'Duplicate migration timestamps.' }
  $nativePending = @($nativeFiles | Where-Object { $_.Id -in @('20260926230000','20260928020000') })
  if ((@($nativePending | ForEach-Object { $_.Id } | Sort-Object) -join ',') -ne $nativeExpected) { Fail 'Native import baseline expected pending set mismatch.' }
  if ($nativePending.Count -gt 0) {
    $nativeDuplicates = Get-ObjectDuplicates -PendingFiles $nativePending
    if ($nativeDuplicates.DuplicateIndexes.Count -gt 0 -or $nativeDuplicates.DuplicateViews.Count -gt 0 -or $nativeDuplicates.DuplicateFunctions.Count -gt 0) { Fail 'Duplicate pending import objects.' }
  }
  Require-Command 'node'
  $nativeAudit = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/audit_native_import_baseline_v1.mjs'))
  Write-CommandTranscript -result $nativeAudit
  if ($nativeAudit.ExitCode -ne 0) { Fail 'Native import baseline schema/security proof failed; no apply.' }
  Write-Section 'STRICT NATIVE IMPORT BASELINE PASS - READ ONLY'
  exit 0
}

if ($VendorStoreTeamWorkflowsBaselineAudit) {
  if ($Phase -ne 'AuditLinkedSchema' -or @($PSBoundParameters.Keys | Where-Object { $_ -notin @('Phase','VendorStoreTeamWorkflowsBaselineAudit') }).Count -gt 0) { Fail 'Store team baseline permits only its fixed read-only audit, without overrides or apply.' }
  Require-Command 'node'
  $teamGate = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/audit_store_team_workflows_baseline_v1.mjs'))
  Write-CommandTranscript -result $teamGate
  if ($teamGate.ExitCode -ne 0) { Fail 'Store team baseline comparison failed; no schema work or apply.' }
  Write-Section 'STRICT STORE TEAM BASELINE PASS - READ ONLY'
  exit 0
}

if ($VendorStoreTeamBaselineAudit) {
  if ($Phase -ne 'AuditLinkedSchema' -or @($PSBoundParameters.Keys | Where-Object { $_ -notin @('Phase','VendorStoreTeamBaselineAudit') }).Count -gt 0) { Fail 'Store team baseline permits only its fixed read-only audit, without overrides or apply.' }
  Require-Command 'node'
  $teamGate = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/audit_store_team_baseline_v1.mjs'))
  Write-CommandTranscript -result $teamGate
  if ($teamGate.ExitCode -ne 0) { Fail 'Store team baseline comparison failed; no schema work or apply.' }
  Write-Section 'STRICT STORE TEAM BASELINE PASS - READ ONLY'
  exit 0
}

if ($VendorStoreTeamWorkflowsV1) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','VendorStoreTeamWorkflowsV1')
  if ($Phase -notin @('AuditLinkedSchema','PrePush') -or @($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0 -or (@(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds) -join ',') -ne '20260927143000,20260927160000') { Fail 'Team gate permits only its exact migration and no combined modes or target overrides.' }
  $teamRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $teamFiles = @(Get-RepoMigrationFiles -RepoRoot $teamRoot)
  if (@(Get-DuplicateTimestampGroups -MigrationFiles $teamFiles).Count -gt 0) { Fail 'Duplicate migration timestamps.' }
  $teamPending = @($teamFiles | Where-Object { $_.Id -in @('20260927143000','20260927160000') })
  if ($teamPending.Count -ne 2) { Fail 'Team migration missing.' }
  foreach ($teamMigration in $teamPending) {
    $teamDuplicates = Get-ObjectDuplicates -PendingFiles @($teamMigration)
  if ($teamDuplicates.DuplicateIndexes.Count -gt 0 -or $teamDuplicates.DuplicateViews.Count -gt 0 -or $teamDuplicates.DuplicateFunctions.Count -gt 0) { Fail 'Duplicate pending team objects.' }
    }
  Require-Command 'node'
  $teamGate = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/verify_store_team_workflows_v1.mjs'),$Phase)
  Write-CommandTranscript -result $teamGate
  if ($teamGate.ExitCode -ne 0) { Fail 'Team baseline, replay or security proof failed; no apply.' }
  Write-Section 'STRICT STORE TEAM PASS - NO APPLY'
  exit 0
}

if ($VendorStoreTeamHardeningV1) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','VendorStoreTeamHardeningV1')
  if ($Phase -notin @('AuditLinkedSchema','PrePush') -or @($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0 -or (@(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds) -join ',') -ne '20260927070000') { Fail 'Team gate permits only its exact migration and no combined modes or target overrides.' }
  $teamRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $teamFiles = @(Get-RepoMigrationFiles -RepoRoot $teamRoot)
  if (@(Get-DuplicateTimestampGroups -MigrationFiles $teamFiles).Count -gt 0) { Fail 'Duplicate migration timestamps.' }
  $teamPending = @($teamFiles | Where-Object { $_.Id -eq '20260927070000' })
  if ($teamPending.Count -ne 1) { Fail 'Team migration missing.' }
  $teamDuplicates = Get-ObjectDuplicates -PendingFiles $teamPending
  if ($teamDuplicates.DuplicateIndexes.Count -gt 0 -or $teamDuplicates.DuplicateViews.Count -gt 0 -or $teamDuplicates.DuplicateFunctions.Count -gt 0) { Fail 'Duplicate pending team objects.' }
  Require-Command 'node'
  $teamGate = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/verify_store_team_hardening_v1.mjs'),$Phase)
  Write-CommandTranscript -result $teamGate
  if ($teamGate.ExitCode -ne 0) { Fail 'Team baseline, replay or security proof failed; no apply.' }
  Write-Section 'STRICT STORE TEAM PASS - NO APPLY'
  exit 0
}

if ($VendorStoreTeamReleaseV1) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','VendorStoreTeamReleaseV1')
  if ($Phase -notin @('AuditLinkedSchema','PrePush') -or @($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0 -or (@(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds) -join ',') -ne '20260927060000') { Fail 'Team gate permits only its exact migration and no combined modes or target overrides.' }
  $teamRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $teamFiles = @(Get-RepoMigrationFiles -RepoRoot $teamRoot)
  if (@(Get-DuplicateTimestampGroups -MigrationFiles $teamFiles).Count -gt 0) { Fail 'Duplicate migration timestamps.' }
  $teamPending = @($teamFiles | Where-Object { $_.Id -eq '20260927060000' })
  if ($teamPending.Count -ne 1) { Fail 'Team migration missing.' }
  $teamDuplicates = Get-ObjectDuplicates -PendingFiles $teamPending
  if ($teamDuplicates.DuplicateIndexes.Count -gt 0 -or $teamDuplicates.DuplicateViews.Count -gt 0 -or $teamDuplicates.DuplicateFunctions.Count -gt 0) { Fail 'Duplicate pending team objects.' }
  Require-Command 'node'
  $teamGate = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/verify_store_team_v1.mjs'),$Phase)
  Write-CommandTranscript -result $teamGate
  if ($teamGate.ExitCode -ne 0) { Fail 'Team baseline, replay or security proof failed; no apply.' }
  Write-Section 'STRICT STORE TEAM PASS - NO APPLY'
  exit 0
}

if ($StorefrontProductionTrialsV1) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','StorefrontProductionTrialsV1')
  if (@($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0 -or (@(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds) -join ',') -ne '20260926200000') { Fail 'Production trial gate permits only its exact invitation migration and no combined modes or target overrides.' }
  $trialRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $trialFiles = @(Get-RepoMigrationFiles -RepoRoot $trialRoot)
  if (@(Get-DuplicateTimestampGroups -MigrationFiles $trialFiles).Count -gt 0) { Fail 'Duplicate migration timestamps.' }
  $trialPending = @($trialFiles | Where-Object { $_.Id -eq '20260926200000' })
  if ($trialPending.Count -ne 1) { Fail 'Production trial migration missing.' }
  $trialDuplicates = Get-ObjectDuplicates -PendingFiles $trialPending
  if ($trialDuplicates.DuplicateIndexes.Count -gt 0 -or $trialDuplicates.DuplicateViews.Count -gt 0 -or $trialDuplicates.DuplicateFunctions.Count -gt 0) { Fail 'Duplicate pending trial objects.' }
  Require-Command 'node'
  $trialGate = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/verify_storefront_production_trials_v1.mjs'),$Phase)
  Write-CommandTranscript -result $trialGate
  if ($trialGate.ExitCode -ne 0) { Fail 'Production trial baseline, replay or security proof failed; no apply.' }
  Write-Section 'STRICT PRODUCTION TRIAL PASS - NO APPLY'
  exit 0
}

if ($StorefrontProductionReleaseV1) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','StorefrontProductionReleaseV1')
  if (@($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0 -or (@(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds) -join ',') -ne '20260926190000') {
    Fail 'Production storefront gate requires its single exact package and forbids combined modes or arbitrary targets.'
  }
  $productionRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $productionFiles = @(Get-RepoMigrationFiles -RepoRoot $productionRoot)
  if (@(Get-DuplicateTimestampGroups -MigrationFiles $productionFiles).Count -gt 0) { Fail 'Duplicate migration timestamps.' }
  $productionPending = @($productionFiles | Where-Object { $_.Id -eq '20260926190000' })
  if ($productionPending.Count -ne 1) { Fail 'Production storefront package missing.' }
  $productionDuplicates = Get-ObjectDuplicates -PendingFiles $productionPending
  if ($productionDuplicates.DuplicateIndexes.Count -gt 0 -or $productionDuplicates.DuplicateViews.Count -gt 0 -or $productionDuplicates.DuplicateFunctions.Count -gt 0) { Fail 'Duplicate pending objects in production storefront package.' }
  Require-Command 'node'
  $productionGate = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'schema/verify_storefront_production_package_v1.mjs'),$Phase)
  Write-CommandTranscript -result $productionGate
  if ($productionGate.ExitCode -ne 0) { Fail 'Production storefront schema, replay, security or source binding failed; no apply.' }
  Write-Section 'STRICT PRODUCTION STOREFRONT PACKAGE PASS - NO APPLY'
  exit 0
}

if ($VendorBatchCancellationBaselineAudit) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','VendorBatchCancellationBaselineAudit')
  $batchPrivateExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  $batchPrivatePrior = '20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000,20260920080000,20260920090000,20260922140000,20260922180000,20260923020000,20260923030000,20260923040000,20260923050000'
  if ($Phase -ne 'AuditLinkedSchema' -or @($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0 -or ($batchPrivateExpected -join ',') -notin @($batchPrivatePrior,($batchPrivatePrior + ',20260923060000'))) {
    Fail 'Batch cancellation baseline permits only its exact pending IDs; no apply, arbitrary target, or combined exceptions.'
  }
}

if ($VendorBatchPrivateCopyBaselineAudit) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','VendorBatchPrivateCopyBaselineAudit')
  $batchPrivateExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  $batchPrivatePrior = '20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000,20260920080000,20260920090000,20260922140000,20260922180000,20260923020000,20260923030000,20260923040000'
  if ($Phase -ne 'AuditLinkedSchema' -or @($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0 -or ($batchPrivateExpected -join ',') -notin @($batchPrivatePrior,($batchPrivatePrior + ',20260923050000'))) {
    Fail 'Batch private-copy baseline permits only its exact pending IDs; no apply, arbitrary target, or combined exceptions.'
  }
}

if ($VendorBatchCommitBaselineAudit) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','VendorBatchCommitBaselineAudit')
  $batchExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  $batchPrior = '20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000,20260920080000,20260920090000,20260922140000,20260922180000,20260923020000,20260923030000'
  if ($Phase -ne 'AuditLinkedSchema' -or @($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0 -or ($batchExpected -join ',') -notin @($batchPrior,($batchPrior + ',20260923040000'))) {
    Fail 'Batch intake baseline permits only its exact pending IDs; no apply, arbitrary target, or combined exceptions.'
  }
}

if ($VendorBatchCancellationPilotApply) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','VendorBatchCancellationPilotApply')
  if ($Phase -ne 'PrePush' -or (@(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds) -join ',') -ne '20260923060000' -or @($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0) {
    Fail 'Cancellation pilot gate permits only its fixed isolated overlay and exact migration; no combined exceptions or arbitrary targets.'
  }
  Require-Command 'node'
  $pilotGate = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'preview/vendor-pilot/batch-cancellation-schema.mjs'),'preflight')
  Write-CommandTranscript -result $pilotGate
  if ($pilotGate.ExitCode -ne 0) { Fail 'Cancellation pilot overlay preflight failed; no apply.' }
  Write-Section 'STRICT CANCELLATION PILOT OVERLAY PASS - NO PRODUCTION APPLY'
  exit 0
}

if ($VendorBatchCommitPilotApply) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','VendorBatchCommitPilotApply')
  if ($Phase -ne 'PrePush' -or (@(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds) -join ',') -ne '20260923040000,20260923050000' -or @($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0) {
    Fail 'Batch pilot gate permits only the fixed isolated overlay, two exact migrations, and PrePush; no combined exceptions or arbitrary targets.'
  }
  Require-Command 'node'
  $pilotGate = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'preview/vendor-pilot/batch-commit-schema.mjs'),'preflight')
  Write-CommandTranscript -result $pilotGate
  if ($pilotGate.ExitCode -ne 0) { Fail 'Batch pilot overlay preflight failed; no apply.' }
  Write-Section 'STRICT BATCH PILOT OVERLAY PASS - NO PRODUCTION APPLY'
  exit 0
}

if ($VendorPreordersPilotApply) {
  $allowedParameters = @('Phase','ExpectedLocalOnlyIds','VendorPreordersPilotApply')
  if ($Phase -ne 'PrePush' -or (@(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds) -join ',') -ne '20260923020000' -or @($PSBoundParameters.Keys | Where-Object { $_ -notin $allowedParameters }).Count -gt 0) {
    Fail 'Preorder pilot gate permits only the fixed isolated overlay, one exact migration, and PrePush; no combined exceptions or arbitrary targets.'
  }
  Require-Command 'node'
  $pilotGate = Invoke-ExternalCommand -FileName 'node' -Arguments @('--use-system-ca',(Join-Path $PSScriptRoot 'preview/vendor-pilot/preorders.mjs'),'preflight')
  Write-CommandTranscript -result $pilotGate
  if ($pilotGate.ExitCode -ne 0) { Fail 'Preorder pilot overlay preflight failed; no apply.' }
  Write-Section 'STRICT PREORDER PILOT OVERLAY PASS - NO PRODUCTION APPLY'
  exit 0
}

if ($VendorPreorderConflictBaselineAudit) {
  $preorderConflictExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  $otherModes = @('VendorPreordersBaselineAudit','VendorOrderResolutionsBaselineAudit','ReconciledReplayAudit','CollectorCameoIsolatedReplay','StorefrontReleaseIsolatedReplay','VendorBillingBaselineAudit','StoreIndexBaselineAudit','CustomImportBaselineAudit','SellerBindingsBaselineAudit','VendorStockBaselineAudit','VendorOrdersBaselineAudit','VendorCheckoutBaselineAudit','VendorOrderCancellationBaselineAudit','VendorUnstartedOrderBaselineAudit','VendorOrderRetryBaselineAudit','VendorOrderFulfillmentBaselineAudit','VendorOrderRefundsBaselineAudit','VendorOrderNotificationsBaselineAudit','VendorOrderNotificationsV2BaselineAudit','VendorStoreCatalogBaselineAudit')
  if ($Phase -ne 'AuditLinkedSchema' -or @($otherModes | Where-Object { $PSBoundParameters.ContainsKey($_) }).Count -gt 0 -or $InspectionDeps -or $AuditEnvFile -or $AuditOutDir -or ($preorderConflictExpected -join ',') -ne '20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000,20260920080000,20260920090000,20260922140000,20260922180000,20260923020000,20260923030000') {
    Fail 'Preorder conflict baseline permits only its exact fifteen pending IDs; no apply, reset, arbitrary target, or combined exceptions.'
  }
}

if ($VendorPreordersBaselineAudit) {
  $preordersExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  $otherModes = @('VendorOrderResolutionsBaselineAudit','ReconciledReplayAudit','CollectorCameoIsolatedReplay','StorefrontReleaseIsolatedReplay','VendorBillingBaselineAudit','StoreIndexBaselineAudit','CustomImportBaselineAudit','SellerBindingsBaselineAudit','VendorStockBaselineAudit','VendorOrdersBaselineAudit','VendorCheckoutBaselineAudit','VendorOrderCancellationBaselineAudit','VendorUnstartedOrderBaselineAudit','VendorOrderRetryBaselineAudit','VendorOrderFulfillmentBaselineAudit','VendorOrderRefundsBaselineAudit','VendorOrderNotificationsBaselineAudit','VendorOrderNotificationsV2BaselineAudit','VendorStoreCatalogBaselineAudit')
  if ($Phase -ne 'AuditLinkedSchema' -or @($otherModes | Where-Object { $PSBoundParameters.ContainsKey($_) }).Count -gt 0 -or $InspectionDeps -or $AuditEnvFile -or $AuditOutDir -or ($preordersExpected -join ',') -ne '20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000,20260920080000,20260920090000,20260922140000,20260922180000') {
    Fail 'Preorder baseline permits only its exact thirteen pending IDs; no apply, reset, arbitrary target, or combined exceptions.'
  }
}

if ($VendorOrderResolutionsBaselineAudit) {
  $resolutionsExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  $otherModes = @('ReconciledReplayAudit','CollectorCameoIsolatedReplay','StorefrontReleaseIsolatedReplay','VendorBillingBaselineAudit','StoreIndexBaselineAudit','CustomImportBaselineAudit','SellerBindingsBaselineAudit','VendorStockBaselineAudit','VendorOrdersBaselineAudit','VendorCheckoutBaselineAudit','VendorOrderCancellationBaselineAudit','VendorUnstartedOrderBaselineAudit','VendorOrderRetryBaselineAudit','VendorOrderFulfillmentBaselineAudit','VendorOrderRefundsBaselineAudit','VendorOrderNotificationsBaselineAudit','VendorOrderNotificationsV2BaselineAudit','VendorStoreCatalogBaselineAudit')
  if ($Phase -ne 'AuditLinkedSchema' -or @($otherModes | Where-Object { $PSBoundParameters.ContainsKey($_) }).Count -gt 0 -or $InspectionDeps -or $AuditEnvFile -or $AuditOutDir -or ($resolutionsExpected -join ',') -ne '20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000,20260920080000,20260920090000,20260922140000') {
    Fail 'Resolution baseline permits only its exact twelve pending IDs; no apply, reset, arbitrary target, or combined exceptions.'
  }
}

if ($VendorOrderNotificationsV2BaselineAudit) {
  $notificationsV2Expected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  if ($Phase -ne 'AuditLinkedSchema' -or $VendorStoreCatalogBaselineAudit -or $VendorOrderNotificationsBaselineAudit -or $VendorOrderRefundsBaselineAudit -or $VendorOrderFulfillmentBaselineAudit -or $VendorOrderRetryBaselineAudit -or $VendorUnstartedOrderBaselineAudit -or $VendorOrderCancellationBaselineAudit -or $VendorCheckoutBaselineAudit -or $ReconciledReplayAudit -or $CollectorCameoIsolatedReplay -or $StorefrontReleaseIsolatedReplay -or $VendorBillingBaselineAudit -or $StoreIndexBaselineAudit -or $CustomImportBaselineAudit -or $VendorOrdersBaselineAudit -or $VendorStockBaselineAudit -or $SellerBindingsBaselineAudit -or $InspectionDeps -or $AuditEnvFile -or $AuditOutDir -or ($notificationsV2Expected -join ',') -ne '20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000,20260920080000,20260920090000') {
    Fail 'Notification v2 baseline permits only its exact eleven pending IDs; no apply, reset, arbitrary target, or combined exceptions.'
  }
}

if ($VendorStoreCatalogBaselineAudit) {
  $storeCatalogExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  if ($Phase -ne 'AuditLinkedSchema' -or $VendorOrderNotificationsBaselineAudit -or $VendorOrderRefundsBaselineAudit -or $VendorOrderFulfillmentBaselineAudit -or $VendorOrderRetryBaselineAudit -or $VendorUnstartedOrderBaselineAudit -or $VendorOrderCancellationBaselineAudit -or $VendorCheckoutBaselineAudit -or $ReconciledReplayAudit -or $CollectorCameoIsolatedReplay -or $StorefrontReleaseIsolatedReplay -or $VendorBillingBaselineAudit -or $StoreIndexBaselineAudit -or $CustomImportBaselineAudit -or $VendorOrdersBaselineAudit -or $VendorStockBaselineAudit -or $SellerBindingsBaselineAudit -or $InspectionDeps -or $AuditEnvFile -or $AuditOutDir -or ($storeCatalogExpected -join ',') -ne '20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000,20260920080000,20260920090000') {
    Fail 'Store catalog baseline permits only its exact eleven pending IDs; no apply, reset, arbitrary target, or combined exceptions.'
  }
}

if ($VendorOrderNotificationsBaselineAudit) {
  $notificationsExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  if ($Phase -ne 'AuditLinkedSchema' -or $VendorOrderRefundsBaselineAudit -or $VendorOrderFulfillmentBaselineAudit -or $VendorOrderRetryBaselineAudit -or $VendorUnstartedOrderBaselineAudit -or $VendorOrderCancellationBaselineAudit -or $VendorCheckoutBaselineAudit -or $ReconciledReplayAudit -or $CollectorCameoIsolatedReplay -or $StorefrontReleaseIsolatedReplay -or $VendorBillingBaselineAudit -or $StoreIndexBaselineAudit -or $CustomImportBaselineAudit -or $VendorOrdersBaselineAudit -or $VendorStockBaselineAudit -or $SellerBindingsBaselineAudit -or ($notificationsExpected -join ',') -notin @('20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000,20260920080000,20260920090000', '20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000,20260920080000,20260920090000,20260920110000')) {
    Fail 'Order notifications baseline permits only its exact prerequisites and optional notifications; no apply, reset, or combined exceptions.'
  }
}

if ($VendorOrderRefundsBaselineAudit) {
  $refundsExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  if ($Phase -ne 'AuditLinkedSchema' -or $VendorOrderFulfillmentBaselineAudit -or $VendorOrderRetryBaselineAudit -or $VendorUnstartedOrderBaselineAudit -or $VendorOrderCancellationBaselineAudit -or $VendorCheckoutBaselineAudit -or $ReconciledReplayAudit -or $CollectorCameoIsolatedReplay -or $StorefrontReleaseIsolatedReplay -or $VendorBillingBaselineAudit -or $StoreIndexBaselineAudit -or $CustomImportBaselineAudit -or $VendorOrdersBaselineAudit -or $VendorStockBaselineAudit -or $SellerBindingsBaselineAudit -or ($refundsExpected -join ',') -notin @('20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000,20260920080000', '20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000,20260920080000,20260920090000')) {
    Fail 'Order refunds baseline permits only its exact prerequisites and optional refunds; no apply, reset, or combined exceptions.'
  }
}

if ($VendorOrderFulfillmentBaselineAudit) {
  $fulfillmentExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  if ($Phase -ne 'AuditLinkedSchema' -or $VendorOrderRetryBaselineAudit -or $VendorUnstartedOrderBaselineAudit -or $VendorOrderCancellationBaselineAudit -or $VendorCheckoutBaselineAudit -or $ReconciledReplayAudit -or $CollectorCameoIsolatedReplay -or $StorefrontReleaseIsolatedReplay -or $VendorBillingBaselineAudit -or $StoreIndexBaselineAudit -or $CustomImportBaselineAudit -or $VendorOrdersBaselineAudit -or $VendorStockBaselineAudit -or $SellerBindingsBaselineAudit -or ($fulfillmentExpected -join ',') -notin @('20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000', '20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000,20260920080000')) {
    Fail 'Order fulfillment baseline permits only its exact prerequisites and optional fulfillment; no apply, reset, or combined exceptions.'
  }
}

if ($VendorOrderRetryBaselineAudit) {
  $retryExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  if ($Phase -ne 'AuditLinkedSchema' -or $VendorUnstartedOrderBaselineAudit -or $VendorOrderCancellationBaselineAudit -or $VendorCheckoutBaselineAudit -or $ReconciledReplayAudit -or $CollectorCameoIsolatedReplay -or $StorefrontReleaseIsolatedReplay -or $VendorBillingBaselineAudit -or $StoreIndexBaselineAudit -or $CustomImportBaselineAudit -or $VendorOrdersBaselineAudit -or $VendorStockBaselineAudit -or $SellerBindingsBaselineAudit -or ($retryExpected -join ',') -notin @('20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000', '20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000,20260919210000')) {
    Fail 'Order retry baseline permits only its exact prerequisites and optional orders; no apply, reset, or combined exceptions.'
  }
}

if ($VendorUnstartedOrderBaselineAudit) {
  $unstartedExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  if ($Phase -ne 'AuditLinkedSchema' -or $VendorOrderCancellationBaselineAudit -or $VendorCheckoutBaselineAudit -or $ReconciledReplayAudit -or $CollectorCameoIsolatedReplay -or $StorefrontReleaseIsolatedReplay -or $VendorBillingBaselineAudit -or $StoreIndexBaselineAudit -or $CustomImportBaselineAudit -or $VendorOrdersBaselineAudit -or $VendorStockBaselineAudit -or $SellerBindingsBaselineAudit -or ($unstartedExpected -join ',') -notin @('20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000', '20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000,20260919200000')) {
    Fail 'Unstarted order baseline permits only its exact prerequisites and optional orders; no apply, reset, or combined exceptions.'
  }
}

if ($VendorOrderCancellationBaselineAudit) {
  $cancellationExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  if ($Phase -ne 'AuditLinkedSchema' -or $VendorCheckoutBaselineAudit -or $ReconciledReplayAudit -or $CollectorCameoIsolatedReplay -or $StorefrontReleaseIsolatedReplay -or $VendorBillingBaselineAudit -or $StoreIndexBaselineAudit -or $CustomImportBaselineAudit -or $VendorOrdersBaselineAudit -or $VendorStockBaselineAudit -or $SellerBindingsBaselineAudit -or ($cancellationExpected -join ',') -notin @('20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000')) {
    Fail 'Order cancellation baseline permits only its exact prerequisites and optional orders; no apply, reset, or combined exceptions.'
  }
}

if ($VendorCheckoutBaselineAudit) {
  $checkoutExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  if ($Phase -ne 'AuditLinkedSchema' -or $ReconciledReplayAudit -or $CollectorCameoIsolatedReplay -or $StorefrontReleaseIsolatedReplay -or $VendorBillingBaselineAudit -or $StoreIndexBaselineAudit -or $CustomImportBaselineAudit -or $VendorOrdersBaselineAudit -or $VendorStockBaselineAudit -or $SellerBindingsBaselineAudit -or ($checkoutExpected -join ',') -notin @('20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000', '20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000,20260919180000')) {
    Fail 'Checkout baseline permits only its exact prerequisites and optional orders; no apply, reset, or combined exceptions.'
  }
}

if ($VendorOrdersBaselineAudit) {
  $ordersExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  if ($Phase -ne 'AuditLinkedSchema' -or $ReconciledReplayAudit -or $CollectorCameoIsolatedReplay -or $StorefrontReleaseIsolatedReplay -or $VendorBillingBaselineAudit -or $StoreIndexBaselineAudit -or $CustomImportBaselineAudit -or $VendorStockBaselineAudit -or $SellerBindingsBaselineAudit -or ($ordersExpected -join ',') -notin @('20260919050000,20260919080000,20260919120000,20260919130000,20260919150000', '20260919050000,20260919080000,20260919120000,20260919130000,20260919150000,20260919170000')) {
    Fail 'Orders baseline permits only its exact prerequisites and optional orders; no apply, reset, or combined exceptions.'
  }
}

if ($VendorStockBaselineAudit) {
  $stockExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  if ($Phase -ne 'AuditLinkedSchema' -or $ReconciledReplayAudit -or $CollectorCameoIsolatedReplay -or $StorefrontReleaseIsolatedReplay -or $VendorBillingBaselineAudit -or $StoreIndexBaselineAudit -or $CustomImportBaselineAudit -or $SellerBindingsBaselineAudit -or ($stockExpected -join ',') -notin @('20260919050000,20260919080000,20260919120000,20260919130000', '20260919050000,20260919080000,20260919120000,20260919130000,20260919150000')) {
    Fail 'Stock baseline permits only its exact prerequisites and optional reservation; no apply, reset, or combined exceptions.'
  }
}

if ($SellerBindingsBaselineAudit) {
  $sellerExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  if ($Phase -ne 'AuditLinkedSchema' -or $ReconciledReplayAudit -or $CollectorCameoIsolatedReplay -or $StorefrontReleaseIsolatedReplay -or $VendorBillingBaselineAudit -or $StoreIndexBaselineAudit -or $CustomImportBaselineAudit -or ($sellerExpected -join ',') -notin @('20260919050000,20260919080000,20260919120000', '20260919050000,20260919080000,20260919120000,20260919130000')) {
    Fail 'Seller baseline permits only its exact prerequisites and optional binding; no apply, reset, or combined exceptions.'
  }
}

if ($CustomImportBaselineAudit) {
  $importExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  if ($Phase -ne 'AuditLinkedSchema' -or $ReconciledReplayAudit -or $CollectorCameoIsolatedReplay -or $StorefrontReleaseIsolatedReplay -or $VendorBillingBaselineAudit -or $StoreIndexBaselineAudit -or ($importExpected -join ',') -notin @('20260919050000,20260919080000', '20260919050000,20260919080000,20260919120000')) {
    Fail 'Custom import baseline permits only its exact prerequisites and optional import; no apply, reset, or combined exceptions.'
  }
}

if ($StoreIndexBaselineAudit) {
  $indexExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  if ($Phase -ne 'AuditLinkedSchema' -or $ReconciledReplayAudit -or $CollectorCameoIsolatedReplay -or $StorefrontReleaseIsolatedReplay -or $VendorBillingBaselineAudit -or ($indexExpected -join ',') -ne '20260919050000,20260919080000') {
    Fail 'Index baseline audit requires exactly storefront and billing; no apply, reset, or combined exceptions.'
  }
}

if ($VendorBillingBaselineAudit) {
  $billingExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  $billingAllowed = @('20260919050000', '20260919080000')
  if ($Phase -ne 'AuditLinkedSchema' -or $ReconciledReplayAudit -or $CollectorCameoIsolatedReplay -or $StorefrontReleaseIsolatedReplay -or $billingExpected.Count -lt 1 -or $billingExpected.Count -gt 2 -or $billingExpected[0] -ne '20260919050000' -or @($billingExpected | Where-Object { $_ -notin $billingAllowed }).Count -gt 0) {
    Fail 'Billing baseline audit permits only the storefront prerequisite and optional billing migration; it cannot apply, reset, or combine exceptions.'
  }
}

if ($StorefrontReleaseIsolatedReplay) {
  $storefrontExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  if ($ReconciledReplayAudit -or $CollectorCameoIsolatedReplay -or $storefrontExpected.Count -ne 1 -or $storefrontExpected[0] -ne "20260919050000") {
    Fail "Storefront isolated replay requires only 20260919050000 and cannot combine audit exceptions."
  }
}

if ($CollectorCameoIsolatedReplay) {
  $collectorExpected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
  if ($ReconciledReplayAudit -or $collectorExpected.Count -ne 1 -or $collectorExpected[0] -ne "20260912050000") {
    Fail "Collector isolated replay requires only 20260912050000 and cannot combine audit exceptions."
  }
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
    Write-Host "Applied IDs: $($linkedSummary.AppliedIds.Count)"
    Write-Host "Local-only IDs (not applied): $(if ($linkedSummary.LocalOnlyIds.Count -gt 0) { $linkedSummary.LocalOnlyIds -join ', ' } else { 'none' })"
    if ($linkedSummary.LocalOnlyIds.Count -gt 0) {
      Write-Host "Ledger audit found pending local files, not complete ledger parity. The schema diff below includes these files."
    }
    if ($VendorBatchCancellationBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $batchPrivateExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Batch intake pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_batch_cancellation_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Batch intake baseline schema/security differs; no apply.' }
      Write-Section 'STRICT VENDOR BATCH CANCELLATION BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($VendorBatchPrivateCopyBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $batchPrivateExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Batch intake pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_batch_private_copy_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Batch intake baseline schema/security differs; no apply.' }
      Write-Section 'STRICT VENDOR BATCH PRIVATE COPY BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($VendorBatchCommitBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $batchExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Batch intake pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_batch_commit_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Batch intake baseline schema/security differs; no apply.' }
      Write-Section 'STRICT VENDOR BATCH COMMIT BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($VendorPreorderConflictBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $preorderConflictExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Preorder baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_preorder_conflict_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Preorder baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT VENDOR PREORDER CONFLICT BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($VendorPreordersBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $preordersExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Preorder baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_preorders_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Preorder baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT VENDOR PREORDERS BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($VendorOrderResolutionsBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $resolutionsExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Resolution baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_order_resolutions_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Resolution baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT VENDOR ORDER RESOLUTIONS BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($VendorOrderNotificationsV2BaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $notificationsV2Expected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Notification v2 baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_order_notifications_v2.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Notification v2 baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT VENDOR ORDER NOTIFICATIONS V2 BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($VendorStoreCatalogBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $storeCatalogExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Store catalog baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_store_catalog_recovery_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Store catalog baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT VENDOR STORE CATALOG BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($VendorOrderNotificationsBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $notificationsExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Order notifications baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_order_notifications_baseline_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Order notifications baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT VENDOR ORDER NOTIFICATIONS BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($VendorOrderRefundsBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $refundsExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Order refunds baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_order_refunds_baseline_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Order refunds baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT VENDOR ORDER REFUNDS BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($VendorOrderFulfillmentBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $fulfillmentExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Order fulfillment baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_order_fulfillment_baseline_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Order fulfillment baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT VENDOR ORDER FULFILLMENT BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($VendorOrderRetryBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $retryExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Order retry baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_order_retry_final_baseline_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Order retry baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT VENDOR ORDER RETRY BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($VendorUnstartedOrderBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $unstartedExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Unstarted order baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_unstarted_order_baseline_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Unstarted order baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT VENDOR UNSTARTED ORDER BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($VendorOrderCancellationBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $cancellationExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Order cancellation baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_order_cancellation_baseline_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Order cancellation baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT VENDOR ORDER CANCELLATION BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($VendorCheckoutBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $checkoutExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Checkout baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_checkout_baseline_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Checkout baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT VENDOR CHECKOUT BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($VendorOrdersBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $ordersExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Orders baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_orders_baseline_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Orders baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT VENDOR ORDERS BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($VendorStockBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $stockExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Stock baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_stock_baseline_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Stock baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT VENDOR STOCK BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($SellerBindingsBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $sellerExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Seller binding baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_seller_bindings_baseline_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Seller binding baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT SELLER BINDINGS BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($CustomImportBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $importExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Custom import baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_custom_import_baseline_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Custom import baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT CUSTOM IMPORT BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($VendorBillingBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $billingExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Billing baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_vendor_billing_baseline_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Billing baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT BILLING BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($StoreIndexBaselineAudit) {
      Require-Command 'node'
      $comparison = Compare-IdSets -Expected $indexExpected -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) { Fail 'Index baseline pending set differs.' }
      $audit = Invoke-ExternalCommand -FileName 'node' -Arguments @((Join-Path $repoRoot 'scripts/schema/audit_store_index_baseline_v1.mjs'))
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail 'Index baseline schema/security differs; no apply is permitted.' }
      Write-Section 'STRICT INDEX BASELINE PASS - DEVELOPMENT ONLY'
      exit 0
    }
    if ($StorefrontReleaseIsolatedReplay) {
      Require-Command "node"
      $comparison = Compare-IdSets -Expected @("20260919050000") -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) {
        Fail "Storefront baseline audit requires the exact sole pending release migration."
      }
      $audit = Invoke-ExternalCommand -FileName "node" -Arguments @(
        (Join-Path $repoRoot "scripts/schema/verify_storefront_release_v1.mjs"), "baseline"
      )
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail "Storefront baseline schema or security differs; no apply is permitted." }
      Write-Section "STRICT STOREFRONT BASELINE PASS - PENDING APPLY"
      exit 0
    }
    if ($CollectorCameoIsolatedReplay) {
      Require-Command "node"
      if ([string]::IsNullOrWhiteSpace($AuditEnvFile) -or [string]::IsNullOrWhiteSpace($AuditOutDir)) {
        Fail "Collector baseline audit requires explicit AuditEnvFile and a new AuditOutDir."
      }
      $comparison = Compare-IdSets -Expected @("20260912050000") -Actual @($linkedSummary.LocalOnlyIds)
      if ($comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) {
        Fail "Collector baseline audit requires the exact sole pending cameo migration."
      }
      $arguments = @("--use-system-ca", (Join-Path $repoRoot "scripts/schema/audit_collector_schema_baseline_v1.mjs"),
        "--env-file=$AuditEnvFile", "--out-dir=$AuditOutDir", "--expected-pending=20260912050000")
      if (-not [string]::IsNullOrWhiteSpace($InspectionDeps)) { $arguments += "--inspection-deps=$InspectionDeps" }
      $audit = Invoke-ExternalCommand -FileName "node" -Arguments $arguments
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) { Fail "Collector schema baseline differs; no apply is permitted." }
      Write-Section "STRICT COLLECTOR BASELINE PASS - PENDING APPLY"
      exit 0
    }
    if ($ReconciledReplayAudit) {
      Require-Command "node"
      if ([string]::IsNullOrWhiteSpace($AuditEnvFile) -or [string]::IsNullOrWhiteSpace($AuditOutDir)) {
        Fail "Reconciled replay requires explicit AuditEnvFile and a new AuditOutDir."
      }
      $expected = @(Normalize-ExpectedIds -ids $ExpectedLocalOnlyIds)
      $comparison = Compare-IdSets -Expected $expected -Actual @($linkedSummary.LocalOnlyIds)
      if ($expected.Count -eq 0 -or $comparison.Unexpected.Count -gt 0 -or $comparison.Missing.Count -gt 0) {
        Fail "Reconciled replay requires an exact, non-empty expected pending set."
      }
      Write-Section "2) Fingerprint-Bound Read-Only Replay Audit"
      $auditScript = Join-Path $repoRoot "scripts\schema\audit_reconciled_public_schema_v1.mjs"
      $audit = Invoke-ExternalCommand -FileName "node" -Arguments @(
        "--use-system-ca", $auditScript, "--env-file=$AuditEnvFile",
        "--out-dir=$AuditOutDir", "--expected-pending=$($expected -join ',')"
      )
      Write-CommandTranscript -result $audit
      if ($audit.ExitCode -ne 0) {
        Fail "Reconciled replay audit failed. No apply is permitted."
      }
      Write-Section "STRICT BASELINE AUDIT PASS - PENDING APPLY"
      Write-Host "Known replay differences are reconciled. The exact pending migrations remain unapplied and require their separate apply authority and PrePush gate."
      exit 0
    }
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
    Write-Host "No remote-only migration drift; linked schema diff is empty. Local-only IDs above still require their separate apply gate."
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
  if ($StorefrontReleaseIsolatedReplay) {
    Require-Command "node"
    $resetResult = Invoke-ExternalCommand -FileName "node" -Arguments @(
      (Join-Path $repoRoot "scripts/schema/verify_storefront_release_v1.mjs"), "replay"
    )
  } elseif ($CollectorCameoIsolatedReplay) {
    Require-Command "node"
    $resetResult = Invoke-ExternalCommand -FileName "node" -Arguments @(
      (Join-Path $repoRoot "scripts/schema/verify_collector_cameo_replay_v1.mjs")
    )
  } else {
    $resetResult = Invoke-SupabaseCommand -Arguments @("db", "reset", "--local", "--yes")
  }
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
