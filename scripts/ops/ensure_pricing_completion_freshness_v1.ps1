param(
  [string]$Repository = 'OriginalSoseji/grookai_vault',
  [string]$Workflow = 'tcgplayer-pricing-completion-agent.yml',
  [string]$Ref = 'main',
  [ValidateRange(5, 120)][int]$MaxAgeMinutes = 20,
  [ValidateRange(15, 180)][int]$ActiveMaxAgeMinutes = 45,
  [ValidateRange(1, 30)][int]$FailureRetryDelayMinutes = 5,
  [string]$ArtifactRoot = 'C:\grookai_vault_operator_artifacts\pricing_completion_dispatch_watchdog_v1',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$mutex = [System.Threading.Mutex]::new($false, 'Local\GrookaiPricingCompletionDispatchWatchdogV1')
$hasMutex = $false
$priorDispatchRequestedAt = $null

function Convert-ToUtc([object]$Value) {
  return ([DateTimeOffset]::Parse([string]$Value)).ToUniversalTime()
}

function Invoke-GhJson([string[]]$Arguments) {
  $output = & gh.exe @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "gh failed with exit code $LASTEXITCODE`: $($output -join ' ')"
  }
  if (-not $output) { return @() }
  return @(($output -join "`n") | ConvertFrom-Json -DateKind String)
}

function Write-Receipt([System.Collections.IDictionary]$Receipt) {
  New-Item -ItemType Directory -Path $ArtifactRoot -Force | Out-Null
  $bytes = $Receipt | ConvertTo-Json -Depth 12
  $dryRunReceipt = [bool]$Receipt.dry_run
  $failureReceipt = [string]$Receipt.decision -eq 'watchdog_failed'
  $fileName = if ($dryRunReceipt) { 'dry-run-latest.json' } elseif ($failureReceipt) {
    'failure-latest.json'
  } else { 'latest.json' }
  $historyName = if ($dryRunReceipt) { 'dry-run-watchdog.jsonl' } elseif ($failureReceipt) {
    'failure-watchdog.jsonl'
  } else { 'watchdog.jsonl' }
  $temp = Join-Path $ArtifactRoot "$fileName.tmp"
  $path = Join-Path $ArtifactRoot $fileName
  Set-Content -LiteralPath $temp -Value $bytes -Encoding utf8
  Move-Item -LiteralPath $temp -Destination $path -Force
  Add-Content -LiteralPath (Join-Path $ArtifactRoot $historyName) `
    -Value ($Receipt | ConvertTo-Json -Depth 12 -Compress) -Encoding utf8
}

try {
  New-Item -ItemType Directory -Path $ArtifactRoot -Force | Out-Null
  $hasMutex = $mutex.WaitOne(0)
  if (-not $hasMutex) { exit 0 }

  $now = [DateTimeOffset]::UtcNow
  $runs = @(Invoke-GhJson @(
    'run', 'list', '--repo', $Repository, '--workflow', $Workflow,
    '--branch', $Ref, '--limit', '20',
    '--json', 'databaseId,status,conclusion,headBranch,headSha,createdAt,event,url'
  ) | Sort-Object { Convert-ToUtc $_.createdAt } -Descending)
  $latest = $runs | Select-Object -First 1
  $latestAge = if ($latest) { ($now - (Convert-ToUtc $latest.createdAt)).TotalMinutes } else { $null }
  $activeStatuses = @('queued', 'in_progress', 'requested', 'waiting', 'pending')
  $decision = 'dispatch_no_runs'

  if ($latest) {
    if ($activeStatuses -contains [string]$latest.status -and $latestAge -le $ActiveMaxAgeMinutes) {
      $decision = 'healthy_active_run'
    } elseif ([string]$latest.status -eq 'completed' -and [string]$latest.conclusion -eq 'success' -and
      $latestAge -le $MaxAgeMinutes) {
      $decision = 'healthy_recent_success'
    } elseif ([string]$latest.status -eq 'completed' -and [string]$latest.conclusion -ne 'success' -and
      $latestAge -lt $FailureRetryDelayMinutes) {
      $decision = 'recent_failure_retry_delay'
    } else {
      $decision = 'dispatch_stale_or_failed_run'
    }
  }

  $priorPath = Join-Path $ArtifactRoot 'latest.json'
  $prior = if (Test-Path -LiteralPath $priorPath -PathType Leaf) {
    Get-Content -LiteralPath $priorPath -Raw | ConvertFrom-Json -DateKind String
  } else { $null }
  if ($prior -and $prior.dispatch_requested_at) {
    $priorDispatchRequestedAt = [string]$prior.dispatch_requested_at
  }
  if ($decision -like 'dispatch_*' -and $priorDispatchRequestedAt) {
    $priorAge = ($now - (Convert-ToUtc $priorDispatchRequestedAt)).TotalMinutes
    if ($priorAge -lt $MaxAgeMinutes) { $decision = 'recent_local_dispatch_request' }
  }

  $shouldDispatch = $decision -like 'dispatch_*'
  $receipt = [ordered]@{
    schema_version = 'PRICING_COMPLETION_DISPATCH_WATCHDOG_V1'
    observed_at = $now.ToString('o')
    repository = $Repository
    workflow = $Workflow
    ref = $Ref
    decision = $decision
    dry_run = [bool]$DryRun
    dispatched = $false
    dispatch_requested_at = $priorDispatchRequestedAt
    thresholds = [ordered]@{
      max_age_minutes = $MaxAgeMinutes
      active_max_age_minutes = $ActiveMaxAgeMinutes
      failure_retry_delay_minutes = $FailureRetryDelayMinutes
    }
    latest_run = if ($latest) { [ordered]@{
      database_id = [long]$latest.databaseId
      status = [string]$latest.status
      conclusion = [string]$latest.conclusion
      event = [string]$latest.event
      head_branch = [string]$latest.headBranch
      head_sha = [string]$latest.headSha
      created_at = [string]$latest.createdAt
      age_minutes = [Math]::Round($latestAge, 2)
      url = [string]$latest.url
    }} else { $null }
    boundaries = [ordered]@{
      github_workflow_dispatch_only = $true
      database_credentials = $false
      database_reads = $false
      database_writes = $false
      mapping_authority = $false
      publication_authority = $false
      customer_state_writes = $false
    }
  }

  if ($shouldDispatch -and -not $DryRun) {
    & gh.exe workflow run $Workflow --repo $Repository --ref $Ref 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "gh workflow run failed with exit code $LASTEXITCODE" }
    $receipt.dispatched = $true
    $receipt.dispatch_requested_at = [DateTimeOffset]::UtcNow.ToString('o')
    $receipt.decision = 'dispatch_requested'
  }

  Write-Receipt $receipt
  $receipt | ConvertTo-Json -Depth 12
} catch {
  $failure = [ordered]@{
    schema_version = 'PRICING_COMPLETION_DISPATCH_WATCHDOG_V1'
    observed_at = [DateTimeOffset]::UtcNow.ToString('o')
    decision = 'watchdog_failed'
    dry_run = [bool]$DryRun
    error_class = $_.Exception.GetType().Name
    message = $_.Exception.Message
    dispatched = $false
    dispatch_requested_at = $priorDispatchRequestedAt
  }
  try { Write-Receipt $failure } catch {}
  Write-Error $_
  exit 1
} finally {
  if ($hasMutex) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
