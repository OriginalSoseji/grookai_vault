Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not $env:SUPABASE_URL) {
  $env:SUPABASE_URL = 'https://ycdxbpibncqcchqiihfz.supabase.co'
}

if (-not $env:SUPABASE_PUBLISHABLE_KEY) {
  throw 'Missing SUPABASE_PUBLISHABLE_KEY environment variable.'
}

& .\scripts\test_import_prices_health.ps1 -FunctionName 'import-prices-v3'

