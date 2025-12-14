# Grookai Vault Migration Preflight Guard
# Blocks broken migrations before execution

$ErrorActionPreference = "Stop"

Write-Host "🔍 Running migration preflight..."

$bad = @()

Get-ChildItem .\supabase\migrations -File -Filter "*.sql" | ForEach-Object {
    $path = $_.FullName
    $content = Get-Content $path -Raw

    # UTF-8 BOM check
    $bytes = [System.IO.File]::ReadAllBytes($path)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $bad += "$($_.Name): UTF-8 BOM detected"
    }

    # ASCII header check
    $header = ($content -split "`n")[0..1] -join "`n"
    if ($header -match '[^\x20-\x7E]') {
        $bad += "$($_.Name): Non-ASCII characters in header"
    }

    # PRE functions must not reference views
    if ($_.Name -match 'baseline_functions\.sql' -and $content -match 'public\.v_') {
        $bad += "$($_.Name): PRE functions reference views"
    }

    # Views file must not contain functions
    if ($_.Name -match 'baseline_views\.sql' -and $content -match 'CREATE FUNCTION') {
        $bad += "$($_.Name): Functions found in views migration"
    }
}

if ($bad.Count -gt 0) {
    Write-Host "❌ Migration preflight failed:"
    $bad | ForEach-Object { Write-Host " - $_" }
    exit 1
}

Write-Host "✅ Migration preflight passed"
