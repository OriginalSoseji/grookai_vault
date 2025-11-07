# ========================================
#  Load .env into current PowerShell session
#  Used for PRODUCTION ship + sanity scans
# ========================================
$ErrorActionPreference = 'Stop'

# If running in CI for prod, don't read .env (secrets come from Actions)
if (($env:CI -eq 'true') -and ($env:GV_ENV -eq 'prod')) {
  Write-Host "[ENV] CI(prod): skipping .env (secrets come from Actions)."
  return
}
$envPath = Join-Path $PSScriptRoot "..\.env"

if (-not (Test-Path $envPath)) {
  Write-Host "[ERROR] .env file not found at $envPath" -ForegroundColor Red
  exit 1
}

# Load KEY=VALUE pairs (ignore comments and blanks)
Get-Content $envPath |
  Where-Object { $_ -match '^\s*[^#].+=.+$' } |
  ForEach-Object {
    $k, $v = $_ -split '=', 2
    $k = $k.Trim()
    $v = $v.Trim().Trim('"').Trim("'")
    [System.Environment]::SetEnvironmentVariable($k, $v, 'Process')
  }

# Map common aliases for production ship/scan scripts
if ($env:SUPABASE_SERVICE_ROLE_KEY -and -not $env:SERVICE_ROLE_KEY) { $env:SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY }
if ($env:SUPABASE_URL -and -not $env:PROJECT_URL) { $env:PROJECT_URL = $env:SUPABASE_URL }

# Optional one-time key (manual override if not stored in .env)
# if (-not $env:POKEMON_TCG_API_KEY) { $env:POKEMON_TCG_API_KEY = '<your key>' }

Write-Host "[ENV] .env loaded for PRODUCTION context."
