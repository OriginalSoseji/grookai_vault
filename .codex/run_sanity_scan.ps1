Param(
  [string]$DeviceId = "R5CY71V9ETR",
  [switch]$SkipInstall,
  [switch]$SkipFlutter,
  [switch]$SkipProbes,
  [switch]$SkipEdges,
  [switch]$SkipDB,
  [switch]$SkipAnalyze,
  [int]$TimeoutMinutes = 30
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

. "$PSScriptRoot\load_env.ps1"

function Ensure-Tool($name, $checkCmd, $installHint) {
  try {
    $null = & $checkCmd 2>$null
    return $true
  } catch {
    Write-Warning "Missing tool '$name'. $installHint"
    return $false
  }
}

function New-ReportDir {
  $ts = Get-Date -Format "yyyyMMdd_HHmmss"
  $dir = Join-Path (Resolve-Path ".").Path "reports\sanity_scan_$ts"
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
  return $dir
}

function Write-Section($text) { Write-Host ("`n=== {0} ===" -f $text) -ForegroundColor Cyan }

function Get-ProjectRef {
  $cfg = Join-Path (Resolve-Path ".").Path "supabase\config.toml"
  if (Test-Path $cfg) {
    $content = Get-Content $cfg -Raw
    $pattern = '(?m)^\s*project_id\s*=\s*"([^"]+)"'
    $m = [regex]::Match($content, $pattern)
    if ($m.Success) { return $m.Groups[1].Value }
  }
  return $null
}

function Get-SupabaseAnonKey {
  # Try env vars then common files (prefer new name)
  if ($env:SUPABASE_PUBLISHABLE_KEY) { return $env:SUPABASE_PUBLISHABLE_KEY }
  if ($env:SUPABASE_ANON_KEY) { return $env:SUPABASE_ANON_KEY }
  $paths = @(
    "supabase/.env",
    ".env",
    "lib/core/config/env.dart",
    "lib/core/env/env.g.dart"
  )
  foreach ($p in $paths) {
    if (Test-Path $p) {
      $raw = Get-Content $p -Raw
      $pattern = '(?i)(SUPABASE_PUBLISHABLE_KEY|SUPABASE_ANON_KEY|anonKey)\W*[:=]\W*["\']?([^"\'\r\n]+)'
      $m = [regex]::Match($raw, $pattern)
      if ($m.Success) { return $m.Groups[2].Value }
    }
  }
  return $null
}

function Get-EnvMapFromFiles {
  $map = @{}
  $paths = @(".env","supabase/.env",".env.staging",".env.prod")
  foreach ($p in $paths) {
    if (Test-Path $p) {
      foreach ($line in Get-Content $p) {
        if ($line -match "^\s*#") { continue }
        if ($line -match "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$") {
          $k = $Matches[1]
          $v = $Matches[2].Trim()
          $v = $v.Trim('"').Trim("'")
          $map[$k] = $v
        }
      }
    }
  }
  return $map
}

function Run-GH-Probe {
  param(
    [string]$WorkflowFile,
    [string]$ReportDir,
    [int]$TimeoutMinutes
  )
  $probeLog = Join-Path $ReportDir "${WorkflowFile}-log.txt"
  $triggerOut = & gh workflow run $WorkflowFile 2>&1
  Start-Sleep -Seconds 5
  $runId = $null
  # Try parse run id from trigger output (contains actions URL)
  if ($triggerOut -match "actions/ runs?/(\d+)") { $runId = $Matches[1] }
  # Fallback to JSON listing
  if (-not $runId) {
    for ($i=0; $i -lt 60; $i++) {
      $jsonTxt = & gh run list --workflow $WorkflowFile --json databaseId,createdAt 2>$null
      if ($LASTEXITCODE -eq 0 -and $jsonTxt) {
        try {
          $obj = $jsonTxt | ConvertFrom-Json
          if ($obj -and $obj.Length -gt 0 -and $obj[0].databaseId) { $runId = $obj[0].databaseId; break }
        } catch {}
      }
      Start-Sleep -Seconds 5
    }
  }
  if (-not $runId) { throw "Could not find run id for $WorkflowFile" }

  $deadline = (Get-Date).AddMinutes($TimeoutMinutes)
  while ((Get-Date) -lt $deadline) {
    $viewJson = & gh run view $runId --json status,conclusion 2>$null
    if ($LASTEXITCODE -eq 0 -and $viewJson) {
      try {
        $obj = $viewJson | ConvertFrom-Json
        $status = $obj.status
        $conclusion = $obj.conclusion
        if ($status -eq 'completed') { break }
      } catch {}
    }
    Start-Sleep -Seconds 5
  }

  & gh run view $runId --log | Tee-Object -FilePath $probeLog | Out-Null
  $logText = Get-Content $probeLog -Raw
  $rpc = [regex]::Match($logText, "RPC:\s*HTTP\s*(\d{3})")
  $view = [regex]::Match($logText, "VIEW:\s*HTTP\s*(\d{3})")
  return [pscustomobject]@{
    RunId = $runId
    RpcCode = if ($rpc.Success) { [int]$rpc.Groups[1].Value } else { $null }
    ViewCode = if ($view.Success) { [int]$view.Groups[1].Value } else { $null }
    LogFile = $probeLog
  }
}

function Mask-JsonSnippet([string]$json, [int]$max=200) {
  if (-not $json) { return '' }
  $s = $json
  # Replace string values with *** and numbers with #
  $s = [regex]::Replace($s, '"([^"\\]|\\.)*"\s*:\s*"([^"\\]|\\.)*"', { param($m) ($m.Value -replace ':\s*".*"', ': "***"') })
  $s = [regex]::Replace($s, '"([^"\\]|\\.)*"\s*:\s*\d+(\.\d+)?', { param($m) ($m.Value -replace ':\s*\d+(\.\d+)?', ': #') })
  if ($s.Length -gt $max) { $s.Substring(0,[Math]::Min($max,$s.Length)) } else { $s }
}

function Verify-EdgeFunctions {
  param(
    [string[]]$Names,
    [string]$ReportDir
  )
  $outFile = Join-Path $ReportDir 'edge_results.txt'
  $results = @()
  $projectRef = Get-ProjectRef
  $anon = Get-SupabaseAnonKey
  $envMap = Get-EnvMapFromFiles
  $service = if ($env:SUPABASE_SECRET_KEY) { $env:SUPABASE_SECRET_KEY } elseif ($env:SERVICE_ROLE_KEY) { $env:SERVICE_ROLE_KEY } elseif ($env:SUPABASE_SERVICE_ROLE_KEY) { $env:SUPABASE_SERVICE_ROLE_KEY } elseif ($envMap.ContainsKey('SUPABASE_SECRET_KEY')) { $envMap['SUPABASE_SECRET_KEY'] } elseif ($envMap.ContainsKey('SERVICE_ROLE_KEY')) { $envMap['SERVICE_ROLE_KEY'] } elseif ($envMap.ContainsKey('SUPABASE_SERVICE_ROLE_KEY')) { $envMap['SUPABASE_SERVICE_ROLE_KEY'] } else { $null }
  $listOut = ""
  try { $listOut = & supabase functions list 2>$null } catch { $listOut = "" }
  $deployed = @{}
  foreach ($n in $Names) { $deployed[$n] = ($listOut -match ("\b" + [regex]::Escape($n) + "\b")) }

  foreach ($n in $Names) {
    $status = "SKIPPED"
    $durationMs = $null
    $code = $null
    $err = $null
    $authMode = 'none'
    $bodySent = ''
    $start = Get-Date
    try {
      if ($projectRef -and $deployed[$n]) {
        if ($anon -or $service) {
          $base = "https://$projectRef.functions.supabase.co"
          $headers = @{ "Content-Type" = "application/json" }
          $token = $null
          if ($n -eq 'wall_feed') {
            if ($anon) { $headers['apikey'] = $anon; $authMode = 'anon' } else { $authMode = 'none' }
          } else {
            if ($service) { $headers['apikey'] = $service; $authMode = 'service-role' }
          }
          $url = "$base/$n"
          $method = 'POST'
          $body = '{}'
          if ($n -eq 'import-prices') { $body = '{"set_code":"sv1","debug":false}' }
          if ($n -eq 'check-sets')    { $body = '{"fix":false,"throttleMs":200}' }
          if ($n -eq 'wall_feed')     { $method = 'GET'; $body = $null; $url = "$base/wall_feed?limit=1" }
          try {
            if ($method -eq 'GET') {
              $resp = Invoke-WebRequest -Method GET -Uri $url -Headers $headers -TimeoutSec 45 -ErrorAction Stop
            } else {
              $bodySent = Mask-JsonSnippet $body 200
              $resp = Invoke-WebRequest -Method POST -Uri $url -Headers $headers -Body $body -TimeoutSec 45 -ErrorAction Stop
            }
            $code = [int]$resp.StatusCode
          } catch {
            $ex = $_.Exception
            if ($ex.Response -and $ex.Response.StatusCode) {
              try { $code = [int]$ex.Response.StatusCode.value__ } catch { try { $code = [int]$ex.Response.StatusCode } catch { $code = $null } }
            } else { $code = $null }
          }
          $status = if ($code -ge 200 -and $code -lt 300) { 'OK' } else { 'FAIL' }
        } else {
          # Fallback to CLI invoke
          $status = 'UNKNOWN'
        }
      } else {
        $status = "NOT_DEPLOYED"
      }
    } catch {
      $err = $_.Exception.Message
      $status = 'FAIL'
    } finally {
      $durationMs = [int]((Get-Date) - $start).TotalMilliseconds
    }
    $snippet = if ($bodySent) { $bodySent } else { '' }
    $line = "{0}`tcode={1}`tduration_ms={2}`tauth={3}`tbody={4}`t{5}" -f $n, ($(if ($null -ne $code) { $code } else { 'n/a' })), $durationMs, $authMode, $snippet, $status
    $results += $line
  }
  $results | Out-File -FilePath $outFile -Encoding UTF8
  return $outFile
}

function Run-DBChecks {
  param([string]$ReportDir)
  $outFile = Join-Path $ReportDir 'db_status.txt'
  $lint = ""
  $diff = ""
  $envMap = Get-EnvMapFromFiles
  $dbUrl = if ($env:POSTGRES_URL) { $env:POSTGRES_URL } elseif ($envMap.ContainsKey('POSTGRES_URL')) { $envMap['POSTGRES_URL'] } elseif ($envMap.ContainsKey('SUPABASE_DB_URL')) { $envMap['SUPABASE_DB_URL'] } else { $null }
  if ($dbUrl) {
    try { $lint = & supabase db lint --db-url $dbUrl 2>&1 } catch { $lint = $_ | Out-String }
  } else {
    try { $lint = & supabase db lint 2>&1 } catch { $lint = $_ | Out-String }
  }
  # Prefer migration status over diff when Docker is not available
  $migStatus = ""
  try { $migStatus = & supabase migration list 2>&1 } catch { $migStatus = $_ | Out-String }
  "--- supabase db lint ---" | Out-File $outFile -Encoding UTF8
  $lint | Out-File $outFile -Append -Encoding UTF8
  "`n--- supabase migration list ---" | Out-File $outFile -Append -Encoding UTF8
  $migStatus | Out-File $outFile -Append -Encoding UTF8
  $hasErrors = $false
  $lintEval = ($lint -split "`n" | Where-Object { $_ -notmatch '^(At\s+.+\.ps1:|\s*\+\s+CategoryInfo|\s*\+\s+FullyQualifiedErrorId|\s*$)' }) -join "`n"
  $migEval = ($migStatus -split "`n" | Where-Object { $_ -notmatch '^(At\s+.+\.ps1:|\s*\+\s+CategoryInfo|\s*\+\s+FullyQualifiedErrorId|\s*$)' }) -join "`n"
  if ($lintEval -match "(?i)\berror\b|\bfatal\b") { $hasErrors = $true }
  if ($migEval -match "(?i)\berror\b|\bfatal\b|\bmismatch\b|\breverted\b|\bmissing\b") { $hasErrors = $true }
  return [pscustomobject]@{ File=$outFile; Ok = (-not $hasErrors) }
}

function Get-AndroidAppId {
  $gradle = "android/app/build.gradle"
  if (Test-Path $gradle) {
    $raw = Get-Content $gradle -Raw
    $m = [regex]::Match($raw, 'applicationId\s+"([^"]+)"')
    if ($m.Success) { return $m.Groups[1].Value }
  }
  $manifest = "android/app/src/main/AndroidManifest.xml"
  if (Test-Path $manifest) {
    $raw = Get-Content $manifest -Raw
    $m = [regex]::Match($raw, 'package="([^"]+)"')
    if ($m.Success) { return $m.Groups[1].Value }
  }
  return $null
}

function Run-FlutterBuildAndTest {
  param([string]$ReportDir, [string]$DeviceId, [switch]$SkipInstall)
  $logFile = Join-Path $ReportDir 'flutter_logs.txt'
  $buildOk = $false
  $installOk = $false
  $appId = $null
  try {
    Write-Section "Flutter clean/pub get/build apk"
    try { if (Test-Path 'build') { Remove-Item -Recurse -Force 'build' -ErrorAction SilentlyContinue } } catch {}
    & flutter clean | Tee-Object -FilePath $logFile | Out-Null
    & flutter pub get | Tee-Object -FilePath $logFile -Append | Out-Null
    & flutter build apk | Tee-Object -FilePath $logFile -Append | Out-Null
    if ($LASTEXITCODE -eq 0) { $buildOk = $true }
  } catch {
    "Build failed: $($_.Exception.Message)" | Out-File $logFile -Append
  }

  if ($buildOk -and -not $SkipInstall) {
    try {
      Write-Section "Flutter install to device $DeviceId"
      & flutter install -d $DeviceId | Tee-Object -FilePath $logFile -Append | Out-Null
      if ($LASTEXITCODE -eq 0) { $installOk = $true }
    } catch {
      "Install failed: $($_.Exception.Message)" | Out-File $logFile -Append
    }

    # Attempt basic launch + log capture via adb
    try {
      $appId = Get-AndroidAppId
      if ($installOk -and $appId) {
        Write-Section "Launching $appId and collecting logs"
        & adb -s $DeviceId shell monkey -p $appId -c android.intent.category.LAUNCHER 1 | Out-Null
        Start-Sleep -Seconds 8
        & adb -s $DeviceId logcat -d | Select-String -Pattern "(E/|FATAL|Exception|ANR|Crash)" | Out-File -FilePath $logFile -Append -Encoding UTF8
      }
    } catch {
      "ADB smoke failed: $($_.Exception.Message)" | Out-File $logFile -Append
    }
  }

  return [pscustomobject]@{ BuildOk=$buildOk; InstallOk=$installOk; LogFile=$logFile }
}

function Run-UIAudit {
  param([string]$ReportDir)
  $anFile = Join-Path $ReportDir 'analyze.txt'
  $ok = $false
  try {
    & flutter analyze | Tee-Object -FilePath $anFile | Out-Null
    $txt = Get-Content $anFile -Raw
    # Treat only error-level issues as fail
    if ($txt -notmatch "(?im)^\s*error\b") { $ok = $true }
  } catch {
    "Analyze failed: $($_.Exception.Message)" | Out-File $anFile -Append
  }
  return [pscustomobject]@{ File=$anFile; Ok=$ok }
}

function Compose-Summary {
  param(
    [string]$ReportDir,
    $staging,
    $prod,
    [string]$edgeFile,
    $db,
    $flutter,
    $analyze
  )
  $summary = Join-Path $ReportDir 'SUMMARY.md'
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"

  $edgeOk = $false
  if (Test-Path $edgeFile) {
    try {
      $bad = Select-String -Path $edgeFile -Pattern "\t(FAIL|UNKNOWN|NOT_DEPLOYED)$" -SimpleMatch:$false -ErrorAction SilentlyContinue
      $edgeOk = (-not $bad) -or ($bad.Count -eq 0)
    } catch { $edgeOk = $false }
  }
  $dbOk = $db.Ok
  $flutterOk = ($flutter.BuildOk -and ($SkipInstall -or $flutter.InstallOk))
  $anOk = ($null -ne $analyze -and $analyze.Ok)

  $stagingOK = ($staging -and $staging.RpcCode -eq 200 -and $staging.ViewCode -eq 200)
  $prodOK = ($prod -and $prod.RpcCode -eq 200 -and $prod.ViewCode -eq 200)

  $verdict = "GREEN"
  if (-not ($stagingOK -and $prodOK -and $edgeOk -and $dbOk -and $flutterOk -and $anOk)) {
    if ($stagingOK -or $prodOK -or $edgeOk -or $dbOk -or $flutterOk -or $anOk) { $verdict = "WARN" } else { $verdict = "FAIL" }
  }

  $stRpc = if ($null -ne $staging -and $null -ne $staging.RpcCode) { $staging.RpcCode } else { 'n/a' }
  $stView = if ($null -ne $staging -and $null -ne $staging.ViewCode) { $staging.ViewCode } else { 'n/a' }
  $prRpc = if ($null -ne $prod -and $null -ne $prod.RpcCode) { $prod.RpcCode } else { 'n/a' }
  $prView = if ($null -ne $prod -and $null -ne $prod.ViewCode) { $prod.ViewCode } else { 'n/a' }
  $lines = @(
    "SANITY SCAN SUMMARY",
    "Date: $ts",
    "STAGING: RPC=$stRpc VIEW=$stView",
    "PROD: RPC=$prRpc VIEW=$prView",
    ("Edge Functions: {0}" -f ($(if ($edgeOk) { 'OK' } else { 'FAIL' })) ),
    ("DB Diff: {0}" -f ($(if ($dbOk) { 'OK' } else { 'FAIL' })) ),
    ("Flutter Build: {0}" -f ($(if ($flutterOk) { 'OK' } else { 'FAIL' })) ),
    ("Analyze: {0}" -f ($(if ($anOk) { 'OK' } else { 'FAIL' })) ),
    "Verdict: $verdict"
  )

  $lines -join "`n" | Out-File -FilePath $summary -Encoding UTF8
  return $summary
}

function Commit-And-Tag {
  param([string]$ReportDir)
  $tsTag = Get-Date -Format "yyyyMMdd_HHmmss"
  & git add "reports/sanity_scan_*" 2>$null
  & git commit -m "qa: pre-launch sanity scan $tsTag" 2>$null
  & git tag "qa/sanity_$tsTag" 2>$null
  & git push --tags 2>$null
}

# MAIN
Write-Section "Sanity Scan starting"
$reportDir = New-ReportDir
Write-Host ("Report dir: {0}" -f $reportDir)

# Record env + tool versions
"Sanity scan started $(Get-Date)" | Out-File (Join-Path $reportDir 'meta.txt') -Encoding UTF8
try { (& gh --version) | Out-File (Join-Path $reportDir 'meta.txt') -Append } catch {}
try { (& supabase --version) | Out-File (Join-Path $reportDir 'meta.txt') -Append } catch {}
try { (& flutter --version) | Out-File (Join-Path $reportDir 'meta.txt') -Append } catch {}

$probeResultsFile = Join-Path $reportDir 'probe_results.txt'
$stagingRes = $null
$prodRes = $null

if (-not $SkipProbes) {
  Write-Section "Running GitHub probes"
  $ghOk = Ensure-Tool 'gh' { gh --version } 'Install GitHub CLI: https://cli.github.com/'
  if (-not $ghOk) { Write-Warning "Skipping probes: gh not found" }
  else {
    try {
      $stagingRes = Run-GH-Probe -WorkflowFile 'staging-probe.yml' -ReportDir $reportDir -TimeoutMinutes $TimeoutMinutes
    } catch { Write-Warning $_ }
    try {
      $prodRes = Run-GH-Probe -WorkflowFile 'prod-probe.yml' -ReportDir $reportDir -TimeoutMinutes $TimeoutMinutes
    } catch { Write-Warning $_ }
    $stRpc = if ($null -ne $stagingRes -and $null -ne $stagingRes.RpcCode) { $stagingRes.RpcCode } else { 'n/a' }
    $stView = if ($null -ne $stagingRes -and $null -ne $stagingRes.ViewCode) { $stagingRes.ViewCode } else { 'n/a' }
    $prRpc = if ($null -ne $prodRes -and $null -ne $prodRes.RpcCode) { $prodRes.RpcCode } else { 'n/a' }
    $prView = if ($null -ne $prodRes -and $null -ne $prodRes.ViewCode) { $prodRes.ViewCode } else { 'n/a' }
    @(
      "STAGING: RPC=$stRpc VIEW=$stView",
      "PROD: RPC=$prRpc VIEW=$prView"
    ) | Out-File -FilePath $probeResultsFile -Encoding UTF8
  }
} else {
  Write-Section "Skipping probes (flag)"
}

$edgeFile = $null
if (-not $SkipEdges) {
  Write-Section "Verifying Edge Functions"
  $edgeFile = Verify-EdgeFunctions -Names @('import-prices','check-sets','wall_feed') -ReportDir $reportDir
} else {
  Write-Section "Skipping edge functions (flag)"
}

$db = $null
if (-not $SkipDB) {
  Write-Section "Running DB checks"
  $db = Run-DBChecks -ReportDir $reportDir
} else {
  Write-Section "Skipping DB checks (flag)"
}

$flutterRes = [pscustomobject]@{ BuildOk=$false; InstallOk=$false; LogFile=$null }
if (-not $SkipFlutter) {
  Write-Section "Flutter build + device test"
  $flutterOk = Ensure-Tool 'flutter' { flutter --version } 'Install Flutter: https://flutter.dev/docs/get-started/install'
  if ($flutterOk) { $flutterRes = Run-FlutterBuildAndTest -ReportDir $reportDir -DeviceId $DeviceId -SkipInstall:$SkipInstall }
  else { Write-Warning "Skipping Flutter tasks: flutter not found" }
} else {
  Write-Section "Skipping Flutter (flag)"
}

$anRes = $null
if (-not $SkipAnalyze) {
  Write-Section "Flutter analyze"
  $anRes = Run-UIAudit -ReportDir $reportDir
} else {
  Write-Section "Skipping analyze (flag)"
}

Write-Section "Composing summary"
$summary = Compose-Summary -ReportDir $reportDir -staging $stagingRes -prod $prodRes -edgeFile $edgeFile -db $db -flutter $flutterRes -analyze $anRes
Write-Host "Summary -> $summary" -ForegroundColor Green

Write-Section "Committing and tagging"
try { Commit-And-Tag -ReportDir $reportDir } catch { Write-Warning "Git commit/tag failed: $($_.Exception.Message)" }

Write-Section "Sanity Scan complete"
Write-Host "Artifacts: $reportDir"
