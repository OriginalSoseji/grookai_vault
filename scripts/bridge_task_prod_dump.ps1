<#
Bridge Task: prod schema baseline dump
Goal: Dump production schema/functions safely (skips if token missing).
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "[INFO] SUPABASE_ACCESS_TOKEN not set. Skipping safely." -ForegroundColor Yellow
    exit 0
}

$file = "supabase/000_baseline_prod.sql"
if (-not (Test-Path -Path "supabase")) { New-Item -ItemType Directory -Path "supabase" | Out-Null }

try {
    supabase db dump --file $file
    if (Test-Path $file) {
        git add $file
        git commit -m "chore: add prod schema baseline" | Out-Null
        git push
        Write-Host "[Bridge] prod dump → success (file committed)" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Dump did not produce a file. CLI may have exited early." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] prod dump failed: $($_.Exception.Message)" -ForegroundColor Red
}
