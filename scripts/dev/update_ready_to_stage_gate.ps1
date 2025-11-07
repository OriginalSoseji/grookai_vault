Param(
  [string]$WorkflowName = "Staging Probe (read-only)"
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path) | Out-Null
Set-Location ..\..  # repo root

# Harden: ensure gh is authenticated and workflow exists
try { gh auth status | Out-Null } catch { Write-Error "GitHub CLI not authenticated. Run 'gh auth login'."; exit 1 }
$wfPath = '.github/workflows/staging-probe.yml'
if (-not (Test-Path $wfPath)) { Write-Error "Workflow file missing: $wfPath"; exit 1 }

try {
  $run = gh run list --workflow $WorkflowName --limit 1 --json databaseId,status,conclusion,createdAt -q '.[0]'
} catch {
  Write-Error "GitHub CLI error. Ensure 'gh' is installed and authenticated (gh auth login)."
  exit 1
}
if (-not $run) { Write-Error "No runs found for '$WorkflowName'. Run it once from GitHub Actions."; exit 2 }

$runId = ($run | ConvertFrom-Json).databaseId
Write-Host "Using runId: $runId"
$log = gh run view $runId --log --job=probe | Out-String

# Strict regex extraction
$rpcMatch  = [regex]::Match($log, "(?m)^RPC:\s*HTTP\s*(?<rpc>\d{3})\s*$")
$viewMatch = [regex]::Match($log, "(?m)^VIEW:\s*HTTP\s*(?<view>\d{3})\s*$")
if (-not $rpcMatch.Success)  { Write-Error "Could not find strict 'RPC: HTTP ###' line in job output."; exit 2 }
if (-not $viewMatch.Success) { Write-Error "Could not find strict 'VIEW: HTTP ###' line in job output."; exit 2 }
$rpcCode = $rpcMatch.Groups['rpc'].Value
$vwCode  = $viewMatch.Groups['view'].Value

if (-not (Test-Path reports)) { New-Item -ItemType Directory -Force -Path reports | Out-Null }
$scan = Get-ChildItem reports -Directory -Filter 'staging_scan_*' | Sort-Object Name -Descending | Select-Object -First 1
if (-not $scan) { $scan = New-Item -ItemType Directory -Force -Path ("reports/staging_scan_{0}" -f (Get-Date -Format yyyyMMdd_HHmm)) }
$OUT = $scan.FullName

"HTTP:$rpcCode" | Set-Content (Join-Path $OUT 'rpc_search_cards.status.txt')
"HTTP:$vwCode"  | Set-Content (Join-Path $OUT 'view_wall_feed.status.txt')
$log | Out-File (Join-Path $OUT 'gha_codes.txt') -Encoding UTF8
Write-Host "Parsed codes → RPC=$rpcCode VIEW=$vwCode | Saved in $OUT"

function GetCode($p){ if (-not (Test-Path $p)) { return 'MISSING' }; $l=(Get-Content $p | Select-Object -Last 1); if ($l -match 'HTTP:(\d{3})'){return $Matches[1]} else { return ($l -replace '[^\d]','') } }
$rpc = GetCode (Join-Path $OUT 'rpc_search_cards.status.txt')
$vw  = GetCode (Join-Path $OUT 'view_wall_feed.status.txt')

$hasSmoke = Test-Path '.github\workflows\db-smoke.yml'
$hasDry   = Test-Path '.github\workflows\migrations-apply.yml'
$stagedSql = Test-Path 'supabase\migrations\_hold\20251106_wall_feed_expose.sql'
$hasWfDir = Test-Path '.github\workflows'
$hasStagingWf = Test-Path '.github\workflows\staging-probe.yml'

$tests   = if (Test-Path (Join-Path $OUT 'tests.txt')) { (Get-Content (Join-Path $OUT 'tests.txt')) -join "`n" } else { '' }
$analyze = if (Test-Path (Join-Path $OUT 'analyze.txt')) { (Get-Content (Join-Path $OUT 'analyze.txt')) -join "`n" } else { '' }
function AnalyzeState($s){ if (-not $s) {return 'UNKNOWN'}; if ($s -match '(?im)^\s*error\s*-\s') {return 'ERRORS'}; return 'WARNINGS-ONLY' }
function TestState($s){ if (-not $s) {return 'UNKNOWN'}; if ($s -match '(?i)Some tests failed|\bFAIL\b|EXCEPTION CAUGHT') { return 'FAIL' } return 'PASS' }
$anState = AnalyzeState $analyze
$tState  = TestState $tests

# Optional snapshot include
$snapshotFile = $null
if (Test-Path 'reports\Tests') {
  $snap = Get-ChildItem 'reports\Tests' -File -Filter 'analyze_*.md' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($snap) { $snapshotFile = $snap.FullName }
}

$rpcOk   = ($rpc -eq '200')
$viewOk  = ($vw  -eq '200' -or $vw -eq '403' -or $vw -eq '404')
$ciOk    = ($hasSmoke -and $hasDry)
$testsOk = ($tState -eq 'PASS' -or $tState -eq 'UNKNOWN')
$anOk    = ($anState -ne 'ERRORS')
$pass = ($rpcOk -and $viewOk -and $ciOk -and $anOk -and $testsOk)

$lines = @()
$lines += '# Ready-to-Stage Gate (Read-Only)'
$lines += ''
$lines += "**Scan folder:** $OUT"
$lines += ''
$lines += '| Check | Result |'
$lines += '|---|---|'
$lines += "| RPC /rpc/search_cards | HTTP $rpc |"
$lines += "| View /v_wall_feed | HTTP $vw |"
$lines += "| Tests | $tState |"
$lines += "| Analyze | $anState |"
$lines += "| CI db-smoke.yml | $hasSmoke |"
$lines += "| CI migrations-apply.yml | $hasDry |"
$lines += "| Wall feed SQL staged (_hold_) | $stagedSql |"
if ($hasWfDir) { $lines += "| staging-probe.yml present | $hasStagingWf |" }
$lines += ''
if ($snapshotFile) { $lines += "Snapshots: $snapshotFile"; $lines += '' }
if ($pass) {
  $next = if ($vw -eq '200') { 'No DB change needed for wall feed (already exposed).' } else { 'Ready to request approval to apply `_hold/20251106_wall_feed_expose.sql` on staging (idempotent).' }
  $lines += '**VERDICT: PASS**'
  $lines += ''
  $lines += "Next: $next"
} else {
  $lines += '**VERDICT: FAIL**'
  $lines += ''
  $blocks = @()
  if (-not $rpcOk)  { $blocks += "- RPC search_cards must return **200** (got $rpc)" }
  if (-not $viewOk) { $blocks += "- Wall view must be **200/403/404** (got $vw)" }
  if (-not $ciOk)   { $blocks += "- CI guardrails missing: db-smoke or migrations-apply" }
  if (-not $anOk)   { $blocks += "- `dart analyze` has ERRORS" }
  if (-not $testsOk){ $blocks += "- Local tests not passing" }
  $lines += ($blocks -join "`n")
}
'REPORTS/READY_TO_STAGE_GATE.md' | ForEach-Object { $lines -join "`n" | Set-Content $_ -Encoding UTF8 }
Write-Host ("READY-TO-STAGE: " + ($(if($pass){'PASS'} else {'FAIL'}) ) + " (see REPORTS\\READY_TO_STAGE_GATE.md)")

# Exit code for gating in CI/Tasks
if ($pass) { exit 0 } else { exit 2 }
