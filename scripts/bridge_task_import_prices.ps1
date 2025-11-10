<#
Bridge Task: import-prices health probe (SRK-free)
Goal: Verify the Edge Function "import-prices" responds using publishable key + bridge token.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$base = "https://ycdxbpibncqcchqiihfz.supabase.co"
$url  = "$base/functions/v1/import-prices"

if ((-not $env:SUPABASE_PUBLISHABLE_KEY -and -not $env:SUPABASE_PUBLISHABLE_KEY) -or -not $env:BRIDGE_IMPORT_TOKEN) {
    Write-Host "[INFO] SUPABASE_PUBLISHABLE_KEY or BRIDGE_IMPORT_TOKEN not set. Skipping safely." -ForegroundColor Yellow
    exit 0
}

$headers = @{
    "Authorization" = "Bearer $($env:SUPABASE_PUBLISHABLE_KEY ?? $env:SUPABASE_PUBLISHABLE_KEY)"
    "apikey"        = ($env:SUPABASE_PUBLISHABLE_KEY ?? $env:SUPABASE_PUBLISHABLE_KEY)
    "x-bridge-token"= $env:BRIDGE_IMPORT_TOKEN
}

try {
    $body = @{ "source" = "bridge_health" } | ConvertTo-Json -Depth 3
    $r = Invoke-WebRequest -Method POST -Uri $url -Headers $headers -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 30
    $code = [int]$r.StatusCode
    $ok = ($code -eq 200)
} catch {
    $code = -1
    $ok = $false
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportDir = "reports/import_prices_$stamp"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
"CODE,OK`n$code,$ok" | Out-File "$reportDir\summary.csv" -Encoding utf8
Write-Host "[Bridge] import-prices -> Code=$code Ok=$ok" -ForegroundColor Cyan
