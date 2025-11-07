Param(
  [switch]$RefreshNow
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($m){ Write-Host $m -ForegroundColor Cyan }
function Write-Ok($m){ Write-Host $m -ForegroundColor Green }
function Write-Warn($m){ Write-Host $m -ForegroundColor Yellow }
function Write-Err($m){ Write-Host $m -ForegroundColor Red }

# Resolve repo root and .env
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$envPath  = Join-Path $repoRoot '.env'

# Load .env (KEY=VALUE parser)
$envMap = @{}
if (Test-Path $envPath) {
  Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
      $parts = $line.Split('=',2)
      $envMap[$parts[0].Trim()] = $parts[1].Trim()
    }
  }
}

function Get-Var([string]$key){
  if ($env:$key) { return $env:$key }
  if ($envMap.ContainsKey($key)) { return $envMap[$key] }
  return $null
}

$u  = Get-Var 'SUPABASE_URL'
$sr = (Get-Var 'SUPABASE_SECRET_KEY'); if (-not $sr) { $sr = Get-Var 'SERVICE_ROLE_KEY' }; if (-not $sr) { $sr = Get-Var 'SUPABASE_SERVICE_ROLE_KEY' }
if (-not $u -or -not $sr) { throw 'Missing SUPABASE_URL or SERVICE_ROLE_KEY (set in .env or environment).' }

$hdr = @{ 'apikey'=$sr; 'Content-Type'='application/json' }
$uri = "$u/rest/v1/pricing_health_v?select=mv_latest_observed_at,mv_rows,jobs_failed_24h,jobs_finished_24h"

function Get-Health(){
  try {
    $row = Invoke-RestMethod -Method Get -Uri $uri -Headers $hdr
    if ($row -is [System.Array]) { if ($row.Length -gt 0){ return $row[0] } else { return $null } }
    return $row
  } catch {
    throw "Could not reach Supabase: $($_.Exception.Message)"
  }
}

function Print-Health($h){
  if ($h -eq $null) { Write-Warn 'pricing_health_v returned no rows.'; return @{ verdict='unknown'; ageMin=$null } }
  $tsRaw = $h.mv_latest_observed_at
  $rows  = [int]$h.mv_rows
  $fail  = [int]$h.jobs_failed_24h
  $fin   = [int]$h.jobs_finished_24h

  $ts = $null; if ($tsRaw) { try { $ts = [datetime]::Parse($tsRaw).ToUniversalTime() } catch {} }
  $ageMin = $null; if ($ts) { $ageMin = [int]([datetime]::UtcNow - $ts).TotalMinutes }

  $verdict = 'unknown'
  if ($ageMin -ne $null) {
    if ($ageMin -lt 120) { $verdict = 'fresh' }
    elseif ($ageMin -lt 360) { $verdict = 'stale' }
    else { $verdict = 'critical' }
  }

  $table = @(
    [pscustomobject]@{ Metric='mv_latest_observed_at'; Value=($ts ? $ts.ToString('u') : 'null') },
    [pscustomobject]@{ Metric='mv_rows';               Value=$rows },
    [pscustomobject]@{ Metric='jobs_failed_24h';       Value=$fail },
    [pscustomobject]@{ Metric='jobs_finished_24h';     Value=$fin }
  )
  $table | Format-Table -AutoSize | Out-Host

  $line = switch ($verdict) {
    'fresh'    { "[OK] MV fresh (<2h). Row count $rows. Last refresh: $($ts.ToString('yyyy-MM-ddTHH:mmZ'))" }
    'stale'    { "[WARN] MV stale (>=2h,<6h). Row count $rows. Last: $($ts.ToString('yyyy-MM-ddTHH:mmZ'))" }
    'critical' { "[ALERT] MV critical (>=6h). Row count $rows. Last: $($ts.ToString('yyyy-MM-ddTHH:mmZ'))" }
    default    { "[UNKNOWN] MV state unknown. Row count $rows. Last: $tsRaw" }
  }

  switch ($verdict) {
    'fresh'    { Write-Ok $line }
    'stale'    { Write-Warn $line }
    'critical' { Write-Err $line }
    default    { Write-Warn $line }
  }

  return @{ verdict=$verdict; ageMin=$ageMin }
}

function Check-Schedule(){
  try {
    $out = supabase functions list schedules 2>$null | Out-String
    if (-not $out) { Write-Warn 'Supabase CLI did not return schedules. Is the CLI configured?' ; return }
    if ($out -notmatch 'pricing_refresh') {
      Write-Warn "Schedule 'pricing_refresh' missing! Check supabase/config.toml and redeploy."
    } else {
      Write-Ok "Schedule 'pricing_refresh' found."
    }
  } catch {
    Write-Warn 'Could not query schedules via Supabase CLI. Skipping schedule check.'
  }
}

function Refresh-Now(){
  try {
    if (Get-Command code -ErrorAction SilentlyContinue) {
      Write-Info 'Triggering VS Code task: GV: Pricing — enqueue+run now'
      & code --reuse-window --command "workbench.action.tasks.runTask" --args "GV: Pricing — enqueue+run now" | Out-Null
    } else {
      Write-Warn 'VS Code CLI not found; calling pricing_refresh directly.'
      $fn = "$u/functions/v1/pricing_refresh"
      Invoke-RestMethod -Method Post -Uri $fn -Headers $hdr -Body '{}' | Out-Null
    }
    Start-Sleep -Seconds 15
  } catch {
    Write-Err ("Manual refresh failed: {0}" -f ($_.Exception.Message.Substring(0,[Math]::Min(200, $_.Exception.Message.Length))))
  }
}

try {
  Write-Info 'Checking pricing health via REST...'
  $health = Get-Health
  $state = Print-Health $health
  Check-Schedule

  if ($RefreshNow) {
    Refresh-Now
    Write-Info 'Rechecking after manual refresh...'
    $health2 = Get-Health
    $null = Print-Health $health2
  }
} catch {
  Write-Err ("❌ {0}" -f $_.Exception.Message)
  exit 1
}
