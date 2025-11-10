<#
Bridge Task: wall_feed health probe
Goal: Verify the Edge Function "wall_feed" responds with anon key and logs result.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$base = "https://ycdxbpibncqcchqiihfz.supabase.co"
$url  = "$base/functions/v1/wall_feed"

if (-not $env:SUPABASE_PUBLISHABLE_KEY) {
    Write-Host "[INFO] SUPABASE_PUBLISHABLE_KEY not set. Skipping safely." -ForegroundColor Yellow
    exit 0
}

$headers = @{
    "Authorization" = "Bearer $($env:SUPABASE_PUBLISHABLE_KEY)"
    "apikey"        = $env:SUPABASE_PUBLISHABLE_KEY
}

try {
    $r = Invoke-WebRequest -Method GET -Uri $url -Headers $headers -UseBasicParsing
    $code = [int]$r.StatusCode
    $ok = ($code -eq 200)
} catch {
    $code = -1
    $ok = $false
    $msg = $_.Exception.Message
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportDir = "reports/wall_feed_$stamp"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
"CODE,OK`n$code,$ok" | Out-File "$reportDir\summary.csv" -Encoding utf8
Write-Host "[Bridge] wall_feed → Code=$code Ok=$ok" -ForegroundColor Cyan
