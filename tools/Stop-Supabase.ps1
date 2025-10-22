param()
$ErrorActionPreference = 'Stop'

Write-Host "[Stop-Supabase] Stopping local Supabase stack..."

try {
    $supabase = Get-Command supabase -ErrorAction Stop
} catch {
    Write-Warning "Supabase CLI not found on PATH. Skipping 'supabase stop'."
    exit 0
}

try {
    & $supabase.Source stop | Write-Output
    Write-Host "[Stop-Supabase] Done."
} catch {
    Write-Warning "[Stop-Supabase] 'supabase stop' failed: $($_.Exception.Message)"
}

