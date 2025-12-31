param(
  [Parameter(Mandatory = $true)][string]$SnapshotId,
  [string]$AnalysisVersion = "v1"
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Split-Path -Parent $scriptDir

$nodePath = "node"

Write-Host "[condition_assist] Running analysis worker for snapshot $SnapshotId (version $AnalysisVersion)" -ForegroundColor Cyan

& $nodePath "$repoRoot\backend\condition\condition_assist_analysis_worker_v1.mjs" --snapshot-id $SnapshotId --analysis-version $AnalysisVersion
if ($LASTEXITCODE -ne 0) {
  Write-Host "[condition_assist] Worker exited with code $LASTEXITCODE" -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host "[condition_assist] Done" -ForegroundColor Green
