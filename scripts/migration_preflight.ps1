# Grookai Vault Migration Preflight Guard
# Blocks broken migrations before execution
# Header validation is BYTE-LEVEL and deterministic

$ErrorActionPreference = "Stop"

Write-Host "???? Running migration preflight..."

$bad = @()

function Assert-AsciiHeaderBytes {
    param(
        [Parameter(Mandatory = $true)]
        [string] $FilePath
    )

    $bytes = [System.IO.File]::ReadAllBytes($FilePath)
    if ($bytes.Length -eq 0) { return }

    # Scan only the header (first 2KB)
    $limit = [Math]::Min(2047, $bytes.Length - 1)
    $headerBytes = $bytes[0..$limit]

    $invalid = $headerBytes | Where-Object { $_ -gt 127 }
    if ($invalid.Count -gt 0) {
        throw "Non-ASCII byte detected in migration header"
    }
}

Get-ChildItem .\supabase\migrations -File -Filter "*.sql" | ForEach-Object {
    $path = $_.FullName
    $name = $_.Name

    try {
        # UTF-8 BOM check (byte-level)
        $bytes = [System.IO.File]::ReadAllBytes($path)
        if ($bytes.Length -ge 3 -and
            $bytes[0] -eq 0xEF -and
            $bytes[1] -eq 0xBB -and
            $bytes[2] -eq 0xBF) {
            $bad += "${name}: UTF-8 BOM detected"
            return
        }

        # ASCII header check (byte-level, authoritative)
        Assert-AsciiHeaderBytes -FilePath $path

        # Load content ONLY for semantic checks
        $content = Get-Content $path -Raw

        # PRE functions must not reference views
        if ($name -match 'baseline_functions\.sql' -and $content -match 'public\.v_') {
            $bad += "${name}: PRE functions reference views"
        }

        # Views file must not contain functions
        if ($name -match 'baseline_views\.sql' -and $content -match 'CREATE FUNCTION') {
            $bad += "${name}: Functions found in views migration"
        }

    } catch {
        $bad += "${name}: $($_.Exception.Message)"
    }
}

if ($bad.Count -gt 0) {
    Write-Host "??? Migration preflight failed:"
    $bad | ForEach-Object { Write-Host " - $_" }
    exit 1
}

Write-Host "Migration preflight passed"
