param(
  [string]$ProjectRef = "ycdxbpibncqcchqiihfz",
  [string]$ProdRestUrl = "https://ycdxbpibncqcchqiihfz.supabase.co/rest/v1",
  [string]$ExposeFile = "_hold/20251106_wall_feed_expose.sql"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-AnonKey {
  if (-not (Test-Path '.env.prod')) { return $null }
  $line = Get-Content '.env.prod' | Where-Object { $_ -match '^\s*S_ANON_KEY\s*=' } | Select-Object -First 1
  if ($line) { return ($line -split '=',2)[1].Trim() }
  return $null
}

function Invoke-ProdProbe([string]$anon) {
  $headers = @{ 'apikey' = $anon; 'Authorization' = "Bearer $anon" }
  $rpcCode = 'N/A'; $viewCode = 'N/A'
  try {
    $body = @{ q = 'pikachu'; limit = 5; offset = 0 } | ConvertTo-Json -Compress
    $rpcResp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$ProdRestUrl/rpc/search_cards" -Headers $headers -ContentType 'application/json' -Body $body -ErrorAction Stop
    $rpcCode = [string]$rpcResp.StatusCode
  } catch { $rpcCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'ERR' } }
  try {
    $viewResp = Invoke-WebRequest -UseBasicParsing -Method Get -Uri "$ProdRestUrl/v_wall_feed?select=card_id&limit=1" -Headers $headers -ErrorAction Stop
    $viewCode = [string]$viewResp.StatusCode
  } catch { $viewCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'ERR' } }
  Write-Host "RPC: HTTP $rpcCode"
  Write-Host "VIEW: HTTP $viewCode"
}

if (-not (Test-Path $ExposeFile)) {
  Write-Error "Expose file not found: $ExposeFile"
  exit 1
}

$anon = Get-AnonKey
if (-not $anon) {
  Write-Error 'Missing S_ANON_KEY in .env.prod'
  exit 1
}

Write-Warning "You are about to APPLY a schema change to PRODUCTION ($ProjectRef): $ExposeFile"
$resp = Read-Host 'Proceed? (Y/N)'
if ($resp -notin @('Y','y')) { Write-Host 'Cancelled.'; exit 0 }

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Error 'supabase CLI not installed or not on PATH.'
  Write-Host 'Install on Windows (Scoop):' -ForegroundColor Yellow
  Write-Host '  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git'
  Write-Host '  scoop install supabase'
  exit 1
}

# Check if this supabase CLI supports `db execute`
$supportsExecute = $false
try {
  & supabase db execute --help 1>$null 2>$null
  if ($LASTEXITCODE -eq 0) { $supportsExecute = $true }
} catch {}

if (-not $supportsExecute) {
  $dbUrl = $env:SUPABASE_DB_URL
  if ($dbUrl -and (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host 'Using psql fallback with SUPABASE_DB_URL' -ForegroundColor Yellow
    & psql "$dbUrl" -v ON_ERROR_STOP=1 -f $ExposeFile
    if ($LASTEXITCODE) { exit $LASTEXITCODE }
  } else {
    Write-Error 'Your supabase CLI does not support `db execute`, and no psql fallback available.'
    Write-Host 'Options:' -ForegroundColor Yellow
    Write-Host '  1) Set SUPABASE_DB_URL env var and ensure `psql` is installed, then re-run.'
    Write-Host '  2) Open _hold/20251106_wall_feed_expose.sql in Supabase Dashboard SQL editor and run it manually.'
    Write-Host '  3) Update CLI to a build that supports `db execute`.'
    exit 1
  }
} else {
  & supabase db execute --project-ref $ProjectRef --file $ExposeFile
  if ($LASTEXITCODE) { exit $LASTEXITCODE }
}

Write-Host "Re-checking PROD endpoints..."
Invoke-ProdProbe -anon $anon
