<#
  Auto-fix loop for import-prices (CI-only + function gate)
  - Loops up to 6 iterations
  - Ensures function config verify_jwt = false
  - Ensures bridge-only edge validator workflow exists (and disables legacy pub validator)
  - Aligns canonical token across repo secret and function-scoped secret
  - Redeploys function
  - Dispatches validator workflow, waits, downloads logs, and analyzes
  - Pulls function logs and summarizes
  - Decides success/failure and writes a report

  Requirements:
  - gh CLI authenticated to the repo (GH_TOKEN/GITHUB_TOKEN or gh auth login)
  - supabase CLI authenticated and linked to the target project
  - PowerShell 7+
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg){ Write-Host "[auto-fix] $msg" }
function Write-Warn($msg){ Write-Warning "[auto-fix] $msg" }
function Write-Err ($msg){ Write-Error "[auto-fix] $msg" }

function Ensure-Directories {
  foreach($p in @('reports','reports/ci_logs','scripts','.github/workflows')){
    if(-not (Test-Path $p)){ New-Item -ItemType Directory -Path $p | Out-Null }
  }
}

function Get-Base64UrlToken([int]$bytes=32){
  $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
  $buf = New-Object byte[] $bytes
  $rng.GetBytes($buf)
  $b64 = [Convert]::ToBase64String($buf)
  $url = $b64 -replace '\+', '-' -replace '/', '_' -replace '=', ''
  return $url
}

function Hash8([string]$s){ if(-not $s){return '<missing>'}; $sha=[Security.Cryptography.SHA256]::Create(); $h=$sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($s)); ([BitConverter]::ToString($h)).Replace('-','').Substring(0,8) }

function Ensure-VerifyJwt-False {
  $cfgPath = 'supabase/functions/import-prices/config.toml'
  if(-not (Test-Path $cfgPath)){
    throw "Missing function config file: $cfgPath"
  }
  $content = Get-Content $cfgPath -Raw
  if($content -notmatch '(?m)^\s*verify_jwt\s*=\s*false\s*$'){
    Write-Info "Adding verify_jwt = false to $cfgPath"
    Add-Content -Path $cfgPath -Value "`nverify_jwt = false`n"
  } else {
    Write-Info "verify_jwt = false already present in $cfgPath"
  }
}

function Write-Edge-Validator-Workflow {
  $wfPath = '.github/workflows/prod-import-prices-validate-edge.yml'
  $wf = @'
name: Prod Import-Prices Validate (EDGE - bridge-only)

on:
  workflow_dispatch:

permissions:
  contents: read

env:
  PROJECT_REF: ycdxbpibncqcchqiihfz
  FUNCS_BASE: https://ycdxbpibncqcchqiihfz.functions.supabase.co

jobs:
  validate:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: Bridge-only probe
        shell: pwsh
        env:
          BRIDGE_IMPORT_TOKEN: ${{ secrets.BRIDGE_IMPORT_TOKEN }}
        run: |
          Set-StrictMode -Version Latest
          $ErrorActionPreference = 'Stop'
          function Hash8([string]$s){ if(-not $s){return '<missing>'}; $sha=[Security.Cryptography.SHA256]::Create(); $h=$sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($s)); ([BitConverter]::ToString($h)).Replace('-','').Substring(0,8) }

          $u = "https://ycdxbpibncqcchqiihfz.functions.supabase.co/import-prices"
          $H = @{
            'x-bridge-token' = $env:BRIDGE_IMPORT_TOKEN
            'content-type' = 'application/json'
          }
          $B = '{"ping":"ci-emit"}'
          try {
            $r = Invoke-WebRequest -Method POST -Uri $u -Headers $H -Body $B -UseBasicParsing -TimeoutSec 30
            $status = [string]$r.StatusCode
            $content = [string]$r.Content
          } catch {
            $status = try { [string]$_.Exception.Response.StatusCode.value__ } catch { '<unknown>' }
            $content = ''
          }

          # Emit six-line summary markers consumed by orchestrator
          Write-Output "DIAG: B/A"
          Write-Output "VARIANT: EDGE-bridge-only"
          Write-Output "FINAL: $status"
          Write-Output "PUBLISHABLE_HASH8: <missing>"
          Write-Output "BRIDGE_HASH8: <hidden>"
          $body100 = if($content.Length -gt 100){ $content.Substring(0,100) } else { $content }
          Write-Output "BODY100: $body100"
'@
  Set-Content -Path $wfPath -Value $wf -Encoding UTF8
  Write-Info "Wrote/updated $wfPath (bridge-only)"
}

function Disable-Legacy-Pub-Validator {
  $legacyPath = '.github/workflows/prod-import-prices-validate-pub.yml'
  if(Test-Path $legacyPath){
    $stub = @"
name: Prod Import-Prices Validate (LEGACY DISABLED)

on:
  workflow_dispatch:

jobs:
  disabled:
    if: false # GV_CI_DISABLED
    runs-on: ubuntu-latest
    steps:
      - run: echo "GV_CI_DISABLED: superseded by prod-import-prices-validate-edge.yml"
"@
    Set-Content -Path $legacyPath -Value $stub -Encoding UTF8
    Write-Info "Disabled legacy validator: $legacyPath"
  }
}

function Gh-Available { return (Get-Command gh -ErrorAction SilentlyContinue) -ne $null }
function Supabase-Available { return (Get-Command supabase -ErrorAction SilentlyContinue) -ne $null }

function Ensure-Repo-Secret([string]$name,[string]$value){
  if(-not (Gh-Available)){
    throw "gh CLI not found; cannot set repo secret $name"
  }
  # See if secret exists already
  $exists = $false
  try {
    $list = gh secret list --json name | ConvertFrom-Json
    if($list){ $exists = $list.name -contains $name }
  } catch { $exists = $false }
  if($exists){
    Write-Info "Updating repo secret $name via gh"
  } else {
    Write-Info "Creating repo secret $name via gh"
  }
  $value | gh secret set $name -b- | Out-Null
}

function Try-Get-Repo-Secret([string]$name){
  if(-not (Gh-Available)){ return $null }
  try {
    $list = gh secret list --json name | ConvertFrom-Json
    if($list -and ($list.name -contains $name)){
      return '<present>'
    }
  } catch {}
  return $null
}

function Ensure-Function-Secret([string]$func,[string]$name,[string]$value){
  if(-not (Supabase-Available)){
    throw "supabase CLI not found; cannot set function secret $name"
  }
  Write-Info "Setting function-scoped secret $name for $func"
  supabase functions secrets set $func "$name=$value" | Out-Null
}

function Deploy-Function([string]$func){
  if(-not (Supabase-Available)){
    throw "supabase CLI not found; cannot deploy function $func"
  }
  Write-Info "Deploying function $func"
  supabase functions deploy $func | Out-Null
}

function Dispatch-Validator {
  if(-not (Gh-Available)){
    throw "gh CLI not found; cannot dispatch workflow"
  }
  Write-Info "Dispatching edge validator workflow"
  gh workflow run 'prod-import-prices-validate-edge.yml' | Out-Null
  Start-Sleep -Seconds 5
  # Find the latest run for this workflow
  $run = gh run list --workflow 'prod-import-prices-validate-edge.yml' --json databaseId,status,conclusion,createdAt -L 1 | ConvertFrom-Json
  if(-not $run){ throw "Failed to locate workflow run" }
  $runId = $run[0].databaseId
  Write-Info "Run ID: $runId — waiting for completion"
  # Wait for completion
  gh run watch $runId | Out-Null
  return $runId
}

function Download-Logs([string]$runId){
  $dest = Join-Path 'reports/ci_logs' ("run_$runId")
  if(-not (Test-Path $dest)){ New-Item -ItemType Directory -Path $dest | Out-Null }
  Write-Info "Downloading logs to $dest"
  $all = Join-Path $dest 'ALL.txt'
  try {
    $jobsJson = gh run view $runId --json jobs | ConvertFrom-Json
    $jobId = $jobsJson.jobs[0].databaseId
    gh run view $runId --job $jobId --log | Set-Content -Path $all -Encoding UTF8
  } catch {
    Write-Warn "Failed gh run view --log: $($_.Exception.Message)"
    "<logs_unavailable>" | Set-Content -Path $all -Encoding UTF8
  }
  return $all
}

function Pull-Function-Logs {
  $outPath = 'reports/import_prices_fn_logs.txt'
  Write-Info "Pulling function logs: import-prices"
  try {
    supabase functions logs -f import-prices | Set-Content -Path $outPath -Encoding UTF8
  } catch {
    Write-Warn "Failed to fetch function logs: $($_.Exception.Message)"
    "<logs_unavailable>" | Set-Content -Path $outPath -Encoding UTF8
  }
  return $outPath
}

function Parse-Result([string]$allLogPath,[string]$fnLogPath){
  $final = '<unknown>'
  $variant = '<unknown>'
  $header8 = '<none>'
  $env8 = '<none>'
  # From workflow logs
  $lines = Get-Content $allLogPath -ErrorAction SilentlyContinue
  foreach($l in $lines){
    if($l -match '^FINAL:\s*(\S+)'){ $final = $Matches[1] }
    if($l -match '^VARIANT:\s*(.+)$'){ $variant = $Matches[1].Trim() }
  }
  # From function logs: look for latest token.check line
  $fnlines = Get-Content $fnLogPath -ErrorAction SilentlyContinue
  $check = $fnlines | Where-Object { $_ -match 'token.check header8=([0-9a-f<>-]+) env8=([0-9a-f<>-]+)' } | Select-Object -Last 1
  if($check){
    $null = $check -match 'header8=([0-9a-f<>-]+) env8=([0-9a-f<>-]+)'
    $header8 = $Matches[1]
    $env8 = $Matches[2]
  }
  return [PSCustomObject]@{
    Final = $final
    Variant = $variant
    Header8 = $header8
    Env8 = $env8
  }
}

function Write-Report([string]$kind,[string]$final,[string]$variant,[string]$header8,[string]$env8,[string]$allLogPath,[string]$fnLogPath){
  $ts = Get-Date -Format 'yyyyMMdd_HHmmss'
  if($kind -eq 'success'){
    $path = "reports/import_prices_fix_success_$ts.md"
  } elseif($kind -eq 'fail401'){
    $path = "reports/import_prices_fix_fail_$ts.md"
  } else {
    $path = "reports/import_prices_fix_fail_$ts.md"
  }
  $summary = @()
  $summary += "Diag: B/A"
  $summary += "Variant: $variant"
  $summary += "Final code: $final"
  $summary += "publishable hash8 <missing>"
  $summary += "bridge hash8 <hidden>"
  $summary += "Gate snapshot: header8=$header8 env8=$env8"
  $content = @()
  $content += "# import-prices auto-fix: $kind"
  $content += ""
  $content += "## Six-line summary"
  $content += $summary
  $content += ""
  $content += "## Artifacts"
  $content += "- ALL.txt: $allLogPath"
  $content += "- Function logs: $fnLogPath"
  if($kind -ne 'success'){
    $content += ""
    $content += "## Tail of function logs (last 200 lines)"
    try {
      $tail = Get-Content $fnLogPath -Tail 200
      $content += $tail
    } catch {}
    $content += ""
    $content += "## ALL.txt (first 400 lines)"
    try {
      $head = Get-Content $allLogPath -TotalCount 400
      $content += $head
    } catch {}
  }
  Set-Content -Path $path -Value ($content -join "`n") -Encoding UTF8
  return $path
}

function Commit-Changes {
  git add .github/workflows/prod-import-prices-validate-edge.yml 2>$null
  git add .github/workflows/prod-import-prices-validate-pub.yml 2>$null
  $status = git status --porcelain
  if($status){
    git commit -m "ci: validator (EDGE, bridge-only) — disable legacy; add robust log fetch" | Out-Null
  }
}

function Commit-Scripts {
  git add scripts/auto_fix_import_prices.ps1 scripts/run_auto_fix.ps1 2>$null
  $status = git status --porcelain
  if($status){ git commit -m "scripts: auto-fix loop for import-prices" | Out-Null }
}

function Push-Changes {
  try {
    git push origin HEAD | Out-Null
    Write-Info "Pushed commits to origin"
  } catch {
    Write-Warn "Failed to push commits: $($_.Exception.Message)"
  }
}

# Entry
Ensure-Directories
Ensure-VerifyJwt-False
Write-Edge-Validator-Workflow
Disable-Legacy-Pub-Validator
Commit-Changes
Commit-Scripts
Push-Changes

# Canonical token selection
$canonical = $null
if($env:BRIDGE_TOKEN_SESSION){
  $canonical = $env:BRIDGE_TOKEN_SESSION
  Write-Info "Using session token from BRIDGE_TOKEN_SESSION (hash8=$(Hash8 $canonical))"
} else {
  $present = Try-Get-Repo-Secret 'BRIDGE_IMPORT_TOKEN'
  if($present){
    Write-Info "Repo secret BRIDGE_IMPORT_TOKEN present; will reuse"
    # We cannot read secret value; keep canonical null to avoid rotation; rely on workflow having it
  } else {
    $canonical = Get-Base64UrlToken 32
    Write-Info ("Minted new bridge token (hash8=" + (Hash8 $canonical) + ")")
  }
}

# If we have a canonical value, set both repo secret and function secret
if($canonical){
  Ensure-Repo-Secret -name 'BRIDGE_IMPORT_TOKEN' -value $canonical
  Ensure-Function-Secret -func 'import-prices' -name 'BRIDGE_IMPORT_TOKEN' -value $canonical
} else {
  Write-Info "No canonical token value available; attempting to proceed without rotating repo secret"
}

# Always ensure function secret is set to canonical if we minted one or session provided
if($canonical){
  try { Ensure-Function-Secret -func 'import-prices' -name 'BRIDGE_IMPORT_TOKEN' -value $canonical } catch { Write-Warn $_.Exception.Message }
}

Deploy-Function 'import-prices'

$max = 6
for($iter=1; $iter -le $max; $iter++){
  Write-Info "Iteration $iter/$($max): dispatching validator"
  $runId = Dispatch-Validator
  $all = Download-Logs $runId
  $fn = Pull-Function-Logs
  $res = Parse-Result -allLogPath $all -fnLogPath $fn
  Write-Info ("Summary: Final=" + $res.Final + " Variant=" + $res.Variant + " header8=" + $res.Header8 + " env8=" + $res.Env8)

  if($res.Final -eq '200'){
    $report = Write-Report -kind 'success' -final $res.Final -variant $res.Variant -header8 $res.Header8 -env8 $res.Env8 -allLogPath $all -fnLogPath $fn
    Write-Host $report
    exit 0
  }
  elseif($res.Final -eq '401'){
    if($res.Header8 -ne $res.Env8){
      Write-Warn "401 with mismatched header8/env8 — resync function secret then retry"
      if($canonical){ Ensure-Function-Secret -func 'import-prices' -name 'BRIDGE_IMPORT_TOKEN' -value $canonical }
      Deploy-Function 'import-prices'
      continue
    } else {
      Write-Err "401 with matching header8/env8 — stopping"
      $report = Write-Report -kind 'fail401' -final $res.Final -variant $res.Variant -header8 $res.Header8 -env8 $res.Env8 -allLogPath $all -fnLogPath $fn
      Write-Host $report
      exit 2
    }
  }
  else {
    Write-Err "Non-200/401 final code: $($res.Final) — stopping"
    $report = Write-Report -kind 'fail' -final $res.Final -variant $res.Variant -header8 $res.Header8 -env8 $res.Env8 -allLogPath $all -fnLogPath $fn
    Write-Host $report
    exit 3
  }
}

Write-Warn "Reached max iterations without success"
$lastReport = Write-Report -kind 'fail' -final '<max-iterations>' -variant '<unknown>' -header8 '<n/a>' -env8 '<n/a>' -allLogPath 'reports/ci_logs' -fnLogPath 'reports/import_prices_fn_logs.txt'
Write-Host $lastReport
exit 3
