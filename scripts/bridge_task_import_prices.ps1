<#
Bridge Task: import-prices health probe (backend-standardized)
Goal: Verify the retired Edge Function health contract with a publishable key.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $env:SUPABASE_URL) { $env:SUPABASE_URL = 'https://ycdxbpibncqcchqiihfz.supabase.co' }
if (-not $env:SUPABASE_PUBLISHABLE_KEY) {
  throw 'Missing SUPABASE_PUBLISHABLE_KEY.'
}

try {
  & (Join-Path $PSScriptRoot 'test_import_prices_health.ps1') -FunctionName 'import-prices'
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
if (-not $ok) { exit 1 }
