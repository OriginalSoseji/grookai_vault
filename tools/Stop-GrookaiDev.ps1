param()
$ErrorActionPreference = 'Stop'

Write-Host "[Stop-GrookaiDev] Stopping Flutter, Edge Functions, and Supabase..."

function Invoke-ToolScript($name) {
    $script = Join-Path $PSScriptRoot $name
    if (Test-Path $script) {
        Write-Host "[Stop-GrookaiDev] -> $name"
        try { & $script } catch { Write-Warning "[Stop-GrookaiDev] $name error: $($_.Exception.Message)" }
    } else {
        Write-Warning "[Stop-GrookaiDev] Missing $name"
    }
}

Invoke-ToolScript 'Stop-Flutter.ps1'
Invoke-ToolScript 'Stop-FunctionsServe.ps1'
Invoke-ToolScript 'Stop-Supabase.ps1'

Write-Host "[Stop-GrookaiDev] Done."

