#Requires -Version 5.1
param(
  [string]$ProdWorkflowFile = "prod-probe.yml",            # First guess
  [string]$ProdWorkflowName = "Prod Probe (read-only)",    # Fallback name
  [string]$StagingWorkflowFile = "staging-probe.yml",      # Known file
  [string]$StagingWorkflowName = "Staging Probe (read-only)"
)

$ErrorActionPreference = 'Stop'

function Fail($m){ Write-Error $m; exit 1 }

Set-Location -Path "C:\grookai_vault"

# --- Helpers ---------------------------------------------------------------

function Get-LatestCodesFromGhWorkflow {
  param([string]$WorkflowFile,[string]$WorkflowName)
  # Try by file first
  try {
    $r = gh run list --workflow $WorkflowFile --limit 1 --json databaseId | ConvertFrom-Json
    if ($r -and $r[0].databaseId) {
      $id  = $r[0].databaseId
      $log = gh run view $id --log | Out-String
    }
  } catch {}

  # Fallback: by human-friendly name (when on default branch)
  if (-not $log) {
    try {
      $r = gh run list --workflow "$WorkflowName" --limit 1 --json databaseId | ConvertFrom-Json
      if ($r -and $r[0].databaseId) {
        $id  = $r[0].databaseId
        $log = gh run view $id --log | Out-String
      }
    } catch {}
  }

  $codes = @{ rpc = "NA"; view = "NA" }
  if ($log) {
    $rpc  = ($log -split "`r?`n" | Where-Object { $_ -match '^RPC:\s*HTTP\s+(\d+)' } | Select-Object -First 1)
    $view = ($log -split "`r?`n" | Where-Object { $_ -match '^VIEW:\s*HTTP\s+(\d+)' } | Select-Object -First 1)
    if ($rpc  -and ($rpc  -match '(\d+)')) { $codes.rpc  = $Matches[1] }
    if ($view -and ($view -match '(\d+)')) { $codes.view = $Matches[1] }
  }
  return $codes
}

function Get-LatestStagingFromCache {
  $dir = Join-Path (Get-Location) "reports"
  if (-not (Test-Path $dir)) { return @{ rpc="NA"; view="NA" } }
  $scanDirs = Get-ChildItem -Path $dir -Directory -Filter "staging_scan_*" | Sort-Object Name -Descending
  if (-not $scanDirs) { return @{ rpc="NA"; view="NA" } }
  $latest = $scanDirs[0].FullName
  $rpc  = (Test-Path "$latest\rpc.status.txt")  ? (Get-Content "$latest\rpc.status.txt" -Raw).Trim()  : "NA"
  $view = (Test-Path "$latest\view.status.txt") ? (Get-Content "$latest\view.status.txt" -Raw).Trim() : "NA"
  return @{ rpc=$rpc; view=$view }
}

function Get-LatestProdFromExecSummary {
  # Parse the most recent prod_audit_* EXEC_SUMMARY.md for a PROD line, if present
  $dir = Join-Path (Get-Location) "reports"
  if (-not (Test-Path $dir)) { return @{ rpc="NA"; view="NA" } }
  $audDirs = Get-ChildItem -Path $dir -Directory -Filter "prod_audit_*" | Sort-Object Name -Descending
  foreach ($d in $audDirs) {
    $exec = Join-Path $d.FullName "EXEC_SUMMARY.md"
    if (Test-Path $exec) {
      $text = Get-Content $exec -Raw
      $m = [regex]::Match($text, 'PROD:\s*(\d+)\s*/\s*(\d+)', 'IgnoreCase')
      if ($m.Success) { return @{ rpc = $m.Groups[1].Value; view = $m.Groups[2].Value } }
    }
  }
  return @{ rpc="NA"; view="NA" }
}

function Compute-Verdict($sRpc,$sView,$pRpc,$pView){
  $all = @($sRpc,$sView,$pRpc,$pView)
  if ($all -contains "NA") { return "FAIL" }
  $nums = $all | ForEach-Object { [int]$_ }
  if ($nums -contains 401 -or $nums -contains 500 -or $nums -contains 502 -or $nums -contains 503) { return "FAIL" }
  if ($nums -contains 403 -or $nums -contains 404) { return "WARN" }
  if ($nums -contains 200) {
    if ($nums | Where-Object { $_ -ne 200 } | Measure-Object | Select-Object -ExpandProperty Count) { return "WARN" }
    return "GREEN"
  }
  return "WARN"
}

function Get-LatestProdAuditPath {
  $dir = Join-Path (Get-Location) "reports"
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  $audDirs = Get-ChildItem -Path $dir -Directory -Filter "prod_audit_*" | Sort-Object Name -Descending
  if ($audDirs) {
    return (Join-Path $audDirs[0].FullName "EXEC_SUMMARY.md")
  } else {
    # Create a fresh prod_audit folder stamped now
    $ts = Get-Date -Format "yyyyMMdd_HHmmss"
    $newDir = Join-Path $dir ("prod_audit_{0}" -f $ts)
    New-Item -ItemType Directory -Path $newDir | Out-Null
    return (Join-Path $newDir "EXEC_SUMMARY.md")
  }
}

# --- Main ------------------------------------------------------------------

# Ensure gh is logged in
try { $null = gh auth status } catch { Fail "GitHub CLI is not authenticated. Run 'gh auth login' and retry." }

# STAGING: prefer GH logs; fallback to cache
$stg = Get-LatestCodesFromGhWorkflow -WorkflowFile $StagingWorkflowFile -WorkflowName $StagingWorkflowName
if ($stg.rpc -eq "NA" -or $stg.view -eq "NA") { $stg = Get-LatestStagingFromCache }

# PROD: try GH logs (file), then name, then EXEC_SUMMARY fallback
$prd = Get-LatestCodesFromGhWorkflow -WorkflowFile $ProdWorkflowFile -WorkflowName $ProdWorkflowName
if ($prd.rpc -eq "NA" -or $prd.view -eq "NA") { $prd = Get-LatestProdFromExecSummary }

# Verdict
$verdict = Compute-Verdict $stg.rpc $stg.view $prd.rpc $prd.view

# Timestamp (America/Denver)
$tz  = [System.TimeZoneInfo]::FindSystemTimeZoneById("Mountain Standard Time")
$now = [System.TimeZoneInfo]::ConvertTime([DateTimeOffset]::Now,$tz).ToString("yyyy-MM-dd HH:mm 'MDT'")

# Find latest prod audit EXEC_SUMMARY.md (or create one)
$execPath = Get-LatestProdAuditPath

# Prepend header block
$header = @"
---
Date: $now
STAGING: $($stg.rpc)/$($stg.view)
PROD:    $($prd.rpc)/$($prd.view)
Verdict: $verdict
---

"@

if (Test-Path $execPath) {
  $old = Get-Content $execPath -Raw
  ($header + $old) | Set-Content -Encoding UTF8 $execPath
} else {
  $header | Set-Content -Encoding UTF8 $execPath
}

Write-Host "Updated: $execPath"
Write-Host "Verdict: $verdict (STAGING $($stg.rpc)/$($stg.view), PROD $($prd.rpc)/$($prd.view))"

# Commit and PR (tiny housekeeping branch)
$branch = "chore/append-probe-" + (Get-Date -Format "yyyyMMdd_HHmm")
git checkout -b $branch
git add $execPath
git commit -m ("audit: append probe verdict ({0}); staging {1}/{2}, prod {3}/{4}" -f $verdict,$stg.rpc,$stg.view,$prd.rpc,$prd.view)
git push -u origin $branch
try {
  gh pr create --base main --head $branch --title "Audit: append probe verdict ($verdict)" --body "Auto-prepended latest STAGING/PROD codes and verdict."
  gh pr merge --squash --auto | Out-Null
  Write-Host "PR opened with auto-merge enabled."
} catch {
  Write-Warning "PR opened but auto-merge may not be enabled; opening in browser."
  gh pr view --web
}

