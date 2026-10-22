param(
  [string]$Repository = 'OriginalSoseji/grookai_vault',
  [string]$Workflow = 'tcgplayer-pricing-completion-agent.yml',
  [string]$WorkerRepo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [string]$ArtifactRoot = 'C:\grookai_vault_operator_artifacts\pricing_completion_ollama_v2',
  [ValidateRange(1, 5000)][int]$BatchSize = 500
)

$ErrorActionPreference = 'Stop'
$mutexName = 'Local\GrookaiOllamaPricingTriageV2'
$taskMutex = [System.Threading.Mutex]::new($false, $mutexName)
$hasMutex = $false

function Write-TaskLog([string]$Message) {
  $timestamp = (Get-Date).ToUniversalTime().ToString('o')
  $line = "[$timestamp] $Message"
  Write-Host $line
  Add-Content -LiteralPath (Join-Path $ArtifactRoot 'runner.log') -Value $line -Encoding utf8
}

function Invoke-Checked([string]$FilePath, [string[]]$Arguments, [string]$Label) {
  $commandOutput = & $FilePath @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  if ($commandOutput) {
    $commandOutput | ForEach-Object { Write-TaskLog "$Label | $_" }
  }
  if ($exitCode -ne 0) { throw "$Label failed with exit code $exitCode" }
  return @($commandOutput)
}

try {
  New-Item -ItemType Directory -Path $ArtifactRoot -Force | Out-Null
  $hasMutex = $taskMutex.WaitOne(0)
  if (-not $hasMutex) {
    Write-TaskLog 'Another V2 triage run is active; this invocation is a safe no-op.'
    exit 0
  }

  $workerScript = Join-Path $WorkerRepo 'scripts\workers\tcgplayer_ollama_triage_v1.mjs'
  $reconciliationScript = Join-Path $WorkerRepo 'scripts\audits\tcgplayer_ollama_lead_reconciliation_v1.mjs'
  foreach ($required in @($workerScript, $reconciliationScript)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
      throw "Required script is missing: $required"
    }
  }

  $runJsonOutput = Invoke-Checked 'gh.exe' @(
    'run', 'list', '--repo', $Repository, '--workflow', $Workflow,
    '--status', 'success', '--limit', '1',
    '--json', 'databaseId,attempt,headSha,createdAt'
  ) 'latest-run'
  $latestRun = @(($runJsonOutput -join "`n") | ConvertFrom-Json)[0]
  if (-not $latestRun) { throw 'No successful pricing completion run is available.' }

  $runId = [string]$latestRun.databaseId
  $attempt = [string]$latestRun.attempt
  $artifactName = "tcgplayer-pricing-completion-$runId-$attempt"
  $downloadDir = Join-Path $ArtifactRoot "downloads\run-$runId-$attempt"
  if (Test-Path -LiteralPath $downloadDir) {
    Remove-Item -LiteralPath $downloadDir -Recurse -Force
  }
  New-Item -ItemType Directory -Path $downloadDir -Force | Out-Null
  Invoke-Checked 'gh.exe' @(
    'run', 'download', $runId, '--repo', $Repository,
    '--name', $artifactName, '--dir', $downloadDir
  ) 'artifact-download' | Out-Null

  $candidateFiles = @(Get-ChildItem -LiteralPath $downloadDir -Recurse -File `
    -Filter 'ollama_identity_candidate_queue.jsonl')
  if ($candidateFiles.Count -ne 1) {
    throw "Expected one Ollama candidate queue in $artifactName; found $($candidateFiles.Count)."
  }
  $downloadedInputPath = $candidateFiles[0].FullName
  $inputSha = (Get-FileHash -LiteralPath $downloadedInputPath -Algorithm SHA256).Hash.ToLowerInvariant()
  $inputStateDir = Join-Path $ArtifactRoot "inputs\$inputSha"
  $completePath = Join-Path $inputStateDir 'COMPLETE_V2.json'
  $latestReceiptPath = Join-Path $ArtifactRoot 'latest-run.json'
  $latestReceipt = [ordered]@{
    schema_version = 'GROOKAI_OLLAMA_CONTINUOUS_TRIAGE_LATEST_V2'
    observed_at = (Get-Date).ToUniversalTime().ToString('o')
    github_run_id = [long]$latestRun.databaseId
    github_run_attempt = [int]$latestRun.attempt
    github_head_sha = [string]$latestRun.headSha
    github_created_at = [string]$latestRun.createdAt
    input_sha256 = $inputSha
    input_state_dir = $inputStateDir
  }

  if (Test-Path -LiteralPath $completePath -PathType Leaf) {
    $latestReceipt.status = 'unchanged_input_already_complete'
    $latestReceipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $latestReceiptPath -Encoding utf8
    Remove-Item -LiteralPath $downloadDir -Recurse -Force
    Write-TaskLog "Run $runId has unchanged candidate input $inputSha; prior result reused."
    exit 0
  }

  New-Item -ItemType Directory -Path $inputStateDir -Force | Out-Null
  $triageInputPath = Join-Path $inputStateDir 'ollama_identity_candidate_queue.jsonl'
  Copy-Item -LiteralPath $downloadedInputPath -Destination $triageInputPath -Force
  Remove-Item -LiteralPath $downloadDir -Recurse -Force
  $totalRows = @(Get-Content -LiteralPath $triageInputPath).Count
  Write-TaskLog "Processing $totalRows hosted candidate rows from GitHub run $runId."

  $batchesRoot = Join-Path $inputStateDir 'batches-v2'
  New-Item -ItemType Directory -Path $batchesRoot -Force | Out-Null
  for ($offset = 0; $offset -lt $totalRows; $offset += $BatchSize) {
    $selectedCount = [Math]::Min($BatchSize, $totalRows - $offset)
    $batchDir = Join-Path $batchesRoot ('batch-{0:D6}' -f $offset)
    $batchSummaryPath = Join-Path $batchDir 'summary.json'
    $reuseBatch = $false
    if (Test-Path -LiteralPath $batchSummaryPath -PathType Leaf) {
      $priorSummary = Get-Content -LiteralPath $batchSummaryPath -Raw | ConvertFrom-Json
      $reuseBatch = [string]$priorSummary.input_sha256 -eq $inputSha -and
        [int]$priorSummary.offset -eq $offset -and
        [int]$priorSummary.processed_rows -eq $selectedCount -and
        [int]$priorSummary.model_errors -eq 0
    }
    if ($reuseBatch) {
      Write-TaskLog "Reusing completed batch at offset $offset."
      continue
    }
    New-Item -ItemType Directory -Path $batchDir -Force | Out-Null
    Invoke-Checked 'node.exe' @(
      $workerScript,
      "--input=$triageInputPath",
      "--out-dir=$batchDir",
      "--offset=$offset",
      "--limit=$selectedCount"
    ) "batch-$offset" | Out-Null
  }

  $batchSummaries = @(Get-ChildItem -LiteralPath $batchesRoot -Directory | Sort-Object Name |
    ForEach-Object { Get-Content -LiteralPath (Join-Path $_.FullName 'summary.json') -Raw | ConvertFrom-Json })
  $triageLines = @(Get-ChildItem -LiteralPath $batchesRoot -Directory | Sort-Object Name |
    ForEach-Object { Get-Content -LiteralPath (Join-Path $_.FullName 'triage.jsonl') } |
    Where-Object { $_ -and $_.Trim() })
  $triageOutputPath = Join-Path $inputStateDir 'triage-v2.jsonl'
  [System.IO.File]::WriteAllText(
    $triageOutputPath,
    $(if ($triageLines.Count) { ($triageLines -join "`n") + "`n" } else { '' }),
    [System.Text.UTF8Encoding]::new($false)
  )
  $triageRows = @($triageLines | ForEach-Object { $_ | ConvertFrom-Json })
  $modelErrors = @($triageRows | Where-Object disposition -eq 'local_model_error').Count
  if ($modelErrors -ne 0) { throw "Continuous triage retained $modelErrors model errors." }
  if ($triageRows.Count -ne $totalRows) {
    throw "Processed row count drift: expected $totalRows, found $($triageRows.Count)."
  }

  $reconciledOutDir = Join-Path $inputStateDir 'reconciled-v2'
  Invoke-Checked 'node.exe' @(
    $reconciliationScript,
    "--input=$triageInputPath",
    "--triage=$triageOutputPath",
    "--out-dir=$reconciledOutDir"
  ) 'lead-reconciliation' | Out-Null

  $aggregate = [ordered]@{
    schema_version = 'GROOKAI_OLLAMA_CONTINUOUS_TRIAGE_V2'
    completed_at = (Get-Date).ToUniversalTime().ToString('o')
    github_run_id = [long]$latestRun.databaseId
    github_run_attempt = [int]$latestRun.attempt
    github_head_sha = [string]$latestRun.headSha
    input_sha256 = $inputSha
    total_rows = $totalRows
    batch_size = $BatchSize
    batch_count = $batchSummaries.Count
    model_calls = [int](($batchSummaries | Measure-Object -Property model_calls -Sum).Sum)
    model_errors = $modelErrors
    review_required = @($triageRows | Where-Object disposition -eq 'review_required').Count
    review_leads = @($triageRows | Where-Object { $_.advice.decision -eq 'lead_candidate' }).Count
    held_by_deterministic_guard = @($triageRows | Where-Object disposition -eq 'held_by_deterministic_guard').Count
    boundaries = [ordered]@{
      loopback_only = $true
      database_reads = $false
      database_writes = $false
      mapping_authority = $false
      publication_authority = $false
      customer_state_writes = $false
    }
  }
  $aggregate | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $inputStateDir 'aggregate_summary_v2.json') -Encoding utf8
  $aggregate | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $completePath -Encoding utf8
  $latestReceipt.status = 'complete'
  $latestReceipt.aggregate_summary = (Join-Path $inputStateDir 'aggregate_summary_v2.json')
  $latestReceipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $latestReceiptPath -Encoding utf8
  Write-TaskLog "Completed $totalRows hosted candidate rows with $($aggregate.model_calls) model calls and zero model errors."
} catch {
  try { Write-TaskLog "FAILED: $($_.Exception.Message)" } catch {}
  exit 1
} finally {
  if ($hasMutex) {
    try { & ollama.exe stop 'grookai-card-triage:4b' 2>&1 | Out-Null } catch {}
    $taskMutex.ReleaseMutex()
  }
  $taskMutex.Dispose()
}
