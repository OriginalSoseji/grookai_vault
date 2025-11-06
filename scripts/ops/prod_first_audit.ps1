param(
  [string]$ProjectRef = "ycdxbpibncqcchqiihfz",
  [string]$ProdRestUrl = "https://ycdxbpibncqcchqiihfz.supabase.co/rest/v1"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function New-AuditFolder {
  $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd_HHmm')
  $dir = Join-Path -Path 'reports' -ChildPath ("prod_audit_{0}" -f $stamp)
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  return $dir
}

function Get-GitSinceCommit {
  try {
    $since = git rev-list -n 1 --first-parent --before="today 00:00" HEAD
    if ([string]::IsNullOrWhiteSpace($since)) { return $null }
    return $since.Trim()
  } catch { return $null }
}

function Write-TodaysChanges($outDir) {
  & git log --name-status --since "today 00:00" 2>$null | Out-File -Encoding utf8 (Join-Path $outDir 'changed_files.txt')
  & git log --since "today 00:00" --oneline --decorate 2>$null | Out-File -Encoding utf8 (Join-Path $outDir 'commit_log.txt')

  $base = Get-GitSinceCommit
  $diffFile = Join-Path $outDir 'diff_summary.patch'
  if ($base) {
    & git diff --patch --stat "$base..HEAD" 2>$null | Out-File -Encoding utf8 $diffFile
  } else {
    & git diff --patch --stat HEAD~50..HEAD 2>$null | Out-File -Encoding utf8 $diffFile
  }

  # Build WHAT_CHANGED_TODAY.md with numstat aggregation
  $numstats = & git log --since "today 00:00" --numstat --format="" 2>$null
  $agg = @{}
  foreach ($line in $numstats) {
    if ($line -match '^\s*(\d+)\s+(\d+)\s+(.+)$') {
      $adds = [int]$Matches[1]; $dels = [int]$Matches[2]; $file = $Matches[3]
      if (-not $agg.ContainsKey($file)) { $agg[$file] = @{ adds = 0; dels = 0 } }
      $agg[$file].adds += $adds
      $agg[$file].dels += $dels
    }
  }
  $md = @()
  $md += "# What Changed Today"
  $md += ""
  $utcStamp = (Get-Date).ToUniversalTime().ToString('u')
  $md += "Generated: $utcStamp"
  $md += ""
  if ($agg.Keys.Count -eq 0) {
    $md += "No commits since today 00:00."
  } else {
    foreach ($k in ($agg.Keys | Sort-Object)) {
      $adds = $agg[$k].adds; $dels = $agg[$k].dels
      $md += "- $k (+$adds / -$dels)"
    }
  }
  $md | Out-File -Encoding utf8 (Join-Path $outDir 'WHAT_CHANGED_TODAY.md')
}

function Write-ExplicitTouched($outDir) {
  $needle = @(
    'lib/ui/widgets/card_thumb.dart',
    'lib/core/util/debouncer.dart',
    'lib/core/net/supa_timeout.dart',
    'lib/features/search/search_page.dart',
    'lib/features/wall/wall_feed_page.dart',
    '_hold/20251106_wall_feed_expose.sql'
  )
  $touched = (& git log --since "today 00:00" --name-only --pretty=format: 2>$null | Where-Object { $_ -ne '' } | Sort-Object -Unique)
  $present = @()
  foreach ($f in $needle) {
    if ($touched -contains $f) { $present += $f }
  }
  $content = @()
  $content += "# Explicit Files Touched Today"
  if ($present.Count -gt 0) {
    foreach ($p in $present) { $content += "- $p" }
  } else {
    $content += "(none of the monitored files were touched today)"
  }
  $content | Out-File -Encoding utf8 (Join-Path $outDir 'explicit_files_today.md')
}

function Invoke-StagingProbe($outDir) {
  $file = Join-Path $outDir 'staging_probe.txt'
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    "SKIPPED: gh not installed" | Out-File -Encoding utf8 $file
    return @{ rpc = $null; view = $null }
  }
  try {
    $wfFile = 'staging-probe.yml'
    # Check workflow exists before trying to run it
    $wfExists = $false
    try {
      $wfJson = & gh workflow list --json path 2>$null | ConvertFrom-Json
      if ($wfJson) {
        foreach ($w in $wfJson) { if ($w.path -eq ".github/workflows/$wfFile") { $wfExists = $true; break } }
      }
    } catch {}
    if (-not $wfExists) {
      @('SKIPPED: staging-probe.yml not found','RPC: HTTP N/A','VIEW: HTTP N/A') | Out-File -Encoding utf8 $file
      return @{ rpc = $null; view = $null }
    }

    & gh workflow run $wfFile 2>$null | Out-Null
    Start-Sleep -Seconds 2
    $runId = $null
    try {
      $json = & gh run list --workflow $wfFile --limit 1 --json databaseId 2>$null | Out-String
      if ($json -and $json.Trim().StartsWith('[')) {
        $arr = $json | ConvertFrom-Json
        if ($arr -and $arr.Count -ge 1) { $runId = $arr[0].databaseId }
      }
    } catch {}
    if (-not $runId) {
      $txt = & gh run list --workflow $wfFile --limit 1 2>$null | Out-String
      if ($txt) {
        $m = [regex]::Match($txt, '^(\d+)\s')
        if ($m.Success) { $runId = $m.Groups[1].Value }
      }
    }
    if ($runId) {
      & gh run watch $runId --exit-status 2>$null | Out-Null
      $log = & gh run view $runId --log 2>$null
    } else {
      $log = @('RPC: HTTP N/A','VIEW: HTTP N/A','ERROR: staging-probe.yml run id not found')
    }
    $rpc = ($log | Select-String -Pattern 'RPC: HTTP (\d+)' -AllMatches).Matches | Select-Object -Last 1
    $view = ($log | Select-String -Pattern 'VIEW: HTTP (\d+)' -AllMatches).Matches | Select-Object -Last 1
    $rpcCode = if ($rpc) { $rpc.Groups[1].Value } else { 'N/A' }
    $viewCode = if ($view) { $view.Groups[1].Value } else { 'N/A' }
    @("RPC: HTTP $rpcCode", "VIEW: HTTP $viewCode") | Out-File -Encoding utf8 $file
    return @{ rpc = $rpcCode; view = $viewCode }
  } catch {
    @("RPC: HTTP N/A", "VIEW: HTTP N/A", "ERROR: $_") | Out-File -Encoding utf8 $file
    return @{ rpc = $null; view = $null }
  }
}

function Invoke-ProdProbe($outDir, $ProdRestUrl) {
  $file = Join-Path $outDir 'prod_probe.txt'
  $samples = Join-Path $outDir 'prod_samples.json'
  $envFile = '.env.prod'
  $anon = $null
  if (Test-Path $envFile) {
    $line = Get-Content $envFile | Where-Object { $_ -match '^\s*S_ANON_KEY\s*=' } | Select-Object -First 1
    if ($line) { $anon = ($line -split '=',2)[1].Trim() }
  }
  if (-not $anon) {
    @("Missing .env.prod S_ANON_KEY", "RPC: HTTP SKIPPED", "VIEW: HTTP SKIPPED") | Out-File -Encoding utf8 $file
    return @{ rpc = $null; view = $null }
  }

  $headers = @{
    'apikey' = $anon
    'Authorization' = "Bearer $anon"
    'Content-Profile' = 'public'
    'Accept-Profile' = 'public'
  }
  $rpcCode = 'N/A'; $viewCode = 'N/A'
  try {
    $body = @{ q = 'pikachu'; limit = 5; offset = 0 } | ConvertTo-Json -Compress
    $rpcResp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$ProdRestUrl/rpc/search_cards" -Headers $headers -ContentType 'application/json' -Body $body -ErrorAction Stop
    $rpcCode = [string]$rpcResp.StatusCode
    $rpcBody = $rpcResp.Content
  } catch {
    $rpcCode = if ($_.Exception.Response -and $_.Exception.Response.StatusCode) { [int]$_.Exception.Response.StatusCode } else { 'ERR' }
    $rpcBody = ''
  }
  try {
    $viewResp = Invoke-WebRequest -UseBasicParsing -Method Get -Uri "$ProdRestUrl/v_wall_feed?select=card_id&limit=1" -Headers $headers -ErrorAction Stop
    $viewCode = [string]$viewResp.StatusCode
    $viewBody = $viewResp.Content
  } catch {
    $viewCode = if ($_.Exception.Response -and $_.Exception.Response.StatusCode) { [int]$_.Exception.Response.StatusCode } else { 'ERR' }
    $viewBody = ''
  }
  @("RPC: HTTP $rpcCode", "VIEW: HTTP $viewCode") | Out-File -Encoding utf8 $file
  $rpcText = if ($null -ne $rpcBody) { $rpcBody } else { '' }
  $viewText = if ($null -ne $viewBody) { $viewBody } else { '' }
  $rpcSample = if ($rpcText.Length -gt 200) { $rpcText.Substring(0,200) } else { $rpcText }
  $viewSample = if ($viewText.Length -gt 200) { $viewText.Substring(0,200) } else { $viewText }
  $sampleObj = @{ rpc = @{ code = $rpcCode; sample = $rpcSample };
                  view = @{ code = $viewCode; sample = $viewSample } }
  $sampleObj | ConvertTo-Json -Depth 3 | Out-File -Encoding utf8 $samples
  return @{ rpc = $rpcCode; view = $viewCode }
}

function Write-ExecSummary($outDir, $staging, $prod) {
  $ts = (Get-Date).ToUniversalTime().ToString('u')
  $title = "Production-First Audit - $ts"
  $what = Get-Content (Join-Path $outDir 'WHAT_CHANGED_TODAY.md') -ErrorAction SilentlyContinue
  $stLines = Get-Content (Join-Path $outDir 'staging_probe.txt') -ErrorAction SilentlyContinue
  $pdLines = Get-Content (Join-Path $outDir 'prod_probe.txt') -ErrorAction SilentlyContinue
  $md = @()
  $md += "# $title"
  $md += ""
  $md += "## TODAY change summary"
  if ($what) { $md += $what } else { $md += "(no changes)" }
  $md += ""
  $md += "## STAGING results"
  if ($stLines) { $md += $stLines } else { $md += "(none)" }
  $md += ""
  $md += "## PROD results"
  if ($pdLines) { $md += $pdLines } else { $md += "(none)" }
  $md += ""
  $stView = $staging.view
  $pdView = $prod.view
  $pdRpc  = $prod.rpc
  $stagingSkipped = $false
  if ($stLines) { foreach ($l in $stLines) { if ($l -match '^SKIPPED:') { $stagingSkipped = $true; break } } }
  $verdict = ''
  if ($pdRpc -eq '200' -and $pdView -eq '200') {
    $verdict = 'GREEN: Production healthy (RPC=200, VIEW=200).'
  } elseif ($pdRpc -eq '200' -and ($pdView -in @('401','403','404'))) {
    $verdict = 'YELLOW: Prod view not exposed (VIEW in {401,403,404}). Apply guarded expose when approved.'
  } else {
    $verdict = 'RED: One or more probes failed. Investigate and re-run.'
  }
  $md += "## Verdict"; $md += $verdict
  if ($stagingSkipped) { $md += "Note: Staging probe skipped (no workflow)." }
  $md += ""
  $md += "## Next steps"
  $md += "- Re-run probes: pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/ops/prod_first_audit.ps1"
  $md += "- Apply _hold/20251106_wall_feed_expose.sql to PROD: pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/ops/prod_apply_expose.ps1"
  $md += "- Open WHAT_CHANGED_TODAY.md for exact diffs: reports\\prod_audit_*\\WHAT_CHANGED_TODAY.md"
  $md | Out-File -Encoding utf8 (Join-Path $outDir 'EXEC_SUMMARY.md')
}

function Main {
  $outDir = New-AuditFolder
  Write-Host "Audit folder: $outDir"

  Write-TodaysChanges -outDir $outDir
  Write-ExplicitTouched -outDir $outDir

  $staging = Invoke-StagingProbe -outDir $outDir
  $prod    = Invoke-ProdProbe -outDir $outDir -ProdRestUrl $ProdRestUrl

  Write-ExecSummary -outDir $outDir -staging $staging -prod $prod

  # Exit code logic
  $okCodes = @('200','401','403','404')
  $stOK = ($staging.rpc -eq '200') -and ($okCodes -contains $staging.view)
  $pdOK = ($prod.rpc -eq '200')   -and ($okCodes -contains $prod.view)
  if ($stOK -and $pdOK) { exit 0 } else { exit 2 }
}

Main
