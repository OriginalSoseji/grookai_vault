Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Set-Location (Split-Path $PSCommandPath -Parent | Split-Path -Parent)

if (-not $env:SUPABASE_URL) { $env:SUPABASE_URL = 'https://ycdxbpibncqcchqiihfz.supabase.co' }
if (-not $env:SUPABASE_SECRET_KEY) { throw 'Missing SUPABASE_SECRET_KEY.' }

try {
  node .\scripts\backend\import_prices_health.mjs | Tee-Object -Variable out | Out-Null
  $ok = $true
  $code = 200
  $variant = 'backend-client'
} catch {
  $ok = $false
  $code = -1
  $variant = 'backend-client'
}

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
if (-not (Test-Path .\reports)) { New-Item -ItemType Directory -Path .\reports | Out-Null }
$reportPath = ".\reports\import_prices_validate_now_$stamp.txt"
"NAME, METHOD, AUTH, CODE, OK, VARIANT" | Out-File -FilePath $reportPath -Encoding utf8
"import-prices, POST, secret-backend, $code, $ok, $variant" | Out-File -FilePath $reportPath -Append -Encoding utf8

if ($ok) {
  Write-Host "VALIDATION: PASS  CODE=$code  VARIANT=$variant  Report=$reportPath" -ForegroundColor Green
} else {
  Write-Host "VALIDATION: FAIL  CODE=$code  VARIANT=$variant  Report=$reportPath" -ForegroundColor Red
}
