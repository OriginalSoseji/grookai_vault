<#
Bridge Task: import-prices health probe (backend-standardized)
Goal: Verify the Edge Function "import-prices" responds using supabase-js with SECRET key.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $env:SUPABASE_URL) { $env:SUPABASE_URL = 'https://ycdxbpibncqcchqiihfz.supabase.co' }
if (-not $env:SUPABASE_SECRET_KEY) {
  Write-Host "[INFO] SUPABASE_SECRET_KEY not set. Skipping safely." -ForegroundColor Yellow
  exit 0
}

try {
  node .\scripts\backend\import_prices_health.mjs | Tee-Object -Variable out | Out-Null
  $ok = $true
  $code = 200
} catch {
  $ok = $false
  $code = -1
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportDir = "reports/import_prices_$stamp"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
"CODE,OK`n$code,$ok" | Out-File "$reportDir\summary.csv" -Encoding utf8
Write-Host "[Bridge] import-prices -> Code=$code Ok=$ok" -ForegroundColor Cyan
