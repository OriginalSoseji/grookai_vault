Param(
  [string]$ProjectRef = "ycdxbpibncqcchqiihfz"
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function New-ReportDir {
  $ts = Get-Date -Format "yyyyMMdd_HHmmss"
  $dir = Join-Path (Resolve-Path ".").Path "reports\ship_edges_prod_$ts"
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
  return $dir
}

function Get-Env([string]$name, [string]$fallbackName=$null) {
  if ($env:$name) { return $env:$name }
  if ($fallbackName -and $env:$fallbackName) { return $env:$fallbackName }
  return $null
}

Write-Host "=== Ship Edges (PROD) ===" -ForegroundColor Cyan
$dir = New-ReportDir
$sum = Join-Path $dir 'deploy_summary.txt'

# Verify CLI login
Write-Host "Verifying Supabase CLI login..." -ForegroundColor Cyan
try { & supabase projects list | Out-Null } catch { throw "Supabase CLI not logged in." }

# Collect secrets from environment (names only)
$secrets = @{
  'PROJECT_URL'               = (Get-Env 'PROJECT_URL' 'SUPABASE_URL');
  'SUPABASE_URL'              = (Get-Env 'SUPABASE_URL' 'PROJECT_URL');
  'SERVICE_ROLE_KEY'          = (Get-Env 'SERVICE_ROLE_KEY' 'SUPABASE_SERVICE_ROLE_KEY');
  'SUPABASE_SERVICE_ROLE_KEY' = (Get-Env 'SUPABASE_SERVICE_ROLE_KEY' 'SERVICE_ROLE_KEY');
  'SUPABASE_ANON_KEY'         = (Get-Env 'SUPABASE_ANON_KEY' 'ANON_KEY');
  'POKEMON_TCG_API_KEY'       = (Get-Env 'POKEMON_TCG_API_KEY');
}

# Set secrets that are present
"Setting secrets (names only):" | Out-File $sum -Encoding UTF8
foreach ($k in $secrets.Keys) {
  $v = $secrets[$k]
  if ($v) {
    & supabase secrets set "$k=$v" --project-ref $ProjectRef | Out-Null
    ("- $k (set)" ) | Out-File $sum -Append -Encoding UTF8
  } else {
    ("- $k (skipped: not present in env)" ) | Out-File $sum -Append -Encoding UTF8
  }
}

# Deploy functions explicitly (no --no-verify-jwt in PROD)
$funcs = @('import-prices','check-sets','wall_feed')
"\nDeploying functions:" | Out-File $sum -Append -Encoding UTF8
foreach ($f in $funcs) {
  try {
    & supabase functions deploy $f --project-ref $ProjectRef | Out-Null
    ("- $f: deployed") | Out-File $sum -Append -Encoding UTF8
  } catch {
    ("- $f: deploy failed: $($_.Exception.Message)" ) | Out-File $sum -Append -Encoding UTF8
  }
}

# Health invokes (status + duration only, no secrets)
"\nHealth invokes:" | Out-File $sum -Append -Encoding UTF8
$base = "https://$ProjectRef.functions.supabase.co"
$srk = (Get-Env 'SERVICE_ROLE_KEY' 'SUPABASE_SERVICE_ROLE_KEY')
$anon = (Get-Env 'SUPABASE_ANON_KEY' 'ANON_KEY')

function Invoke-Health($name, $method, $headers, $body) {
  $url = "$base/$name"
  $start = Get-Date
  $code = $null
  try {
    if ($method -eq 'GET') {
      $resp = Invoke-WebRequest -Method GET -Uri $url -Headers $headers -TimeoutSec 45 -ErrorAction Stop
    } else {
      $resp = Invoke-WebRequest -Method POST -Uri $url -Headers $headers -Body $body -TimeoutSec 45 -ErrorAction Stop
    }
    $code = [int]$resp.StatusCode
  } catch {
    $ex = $_.Exception
    if ($ex.Response -and $ex.Response.StatusCode) { try { $code = [int]$ex.Response.StatusCode.value__ } catch { $code = [int]$ex.Response.StatusCode } }
  }
  $ms = [int]((Get-Date) - $start).TotalMilliseconds
  return @{ name=$name; code=$code; ms=$ms }
}

# import-prices (POST service-role)
$h1 = @{ 'Content-Type'='application/json' }
if ($srk) { $h1['Authorization'] = "Bearer $srk"; $h1['apikey'] = $srk }
$r1 = Invoke-Health 'import-prices' 'POST' $h1 '{"set_code":"sv1","debug":false}'

# check-sets (POST service-role)
$h2 = @{ 'Content-Type'='application/json' }
if ($srk) { $h2['Authorization'] = "Bearer $srk"; $h2['apikey'] = $srk }
$r2 = Invoke-Health 'check-sets' 'POST' $h2 '{"fix":false,"throttleMs":200}'

# wall_feed (GET anon)
$h3 = @{ }
if ($anon) { $h3['apikey'] = $anon }
$baseWall = "$base/wall_feed?limit=1"
$start3 = Get-Date
$code3 = $null
try { $resp3 = Invoke-WebRequest -Method GET -Uri $baseWall -Headers $h3 -TimeoutSec 45 -ErrorAction Stop; $code3 = [int]$resp3.StatusCode } catch { $ex=$_.Exception; if ($ex.Response -and $ex.Response.StatusCode) { try { $code3 = [int]$ex.Response.StatusCode.value__ } catch { $code3 = [int]$ex.Response.StatusCode } } }
$ms3 = [int]((Get-Date) - $start3).TotalMilliseconds

("- import-prices: {0} in {1} ms" -f ($r1.code ?? 'n/a'), $r1.ms) | Out-File $sum -Append -Encoding UTF8
("- check-sets: {0} in {1} ms" -f ($r2.code ?? 'n/a'), $r2.ms) | Out-File $sum -Append -Encoding UTF8
("- wall_feed: {0} in {1} ms" -f ($code3 ?? 'n/a'), $ms3) | Out-File $sum -Append -Encoding UTF8

Write-Host "Summary -> $sum" -ForegroundColor Green

