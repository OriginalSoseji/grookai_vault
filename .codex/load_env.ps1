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
# Prefer new names, but keep legacy compatibility
if ($env:SUPABASE_SECRET_KEY) {
  if (-not $env:SERVICE_ROLE_KEY)          { $env:SERVICE_ROLE_KEY = $env:SUPABASE_SECRET_KEY }
  if (-not $env:SUPABASE_SERVICE_ROLE_KEY) { $env:SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SECRET_KEY }
}
if ($env:SUPABASE_PUBLISHABLE_KEY) {
  if (-not $env:ANON_KEY)           { $env:ANON_KEY = $env:SUPABASE_PUBLISHABLE_KEY }
  if (-not $env:SUPABASE_ANON_KEY)  { $env:SUPABASE_ANON_KEY = $env:SUPABASE_PUBLISHABLE_KEY }
}
if ($env:SUPABASE_SERVICE_ROLE_KEY -and -not $env:SERVICE_ROLE_KEY) { $env:SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY }
if ($env:SUPABASE_URL -and -not $env:PROJECT_URL) { $env:PROJECT_URL = $env:SUPABASE_URL }

# Tunables with sane defaults (process scope only)
function Set-IfMissing([string]$name, [string]$value) {
  if (-not [System.Environment]::GetEnvironmentVariable($name, 'Process')) {
    [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}
Set-IfMissing 'IMPORT_PRICES_TIMEOUT_MS' '5000'
Set-IfMissing 'IMPORT_PRICES_MAX_CONCURRENCY' '3'
Set-IfMissing 'IMPORT_PRICES_BREAKER_FAILS' '5'
Set-IfMissing 'IMPORT_PRICES_BREAKER_WINDOW_MS' '60000'
Set-IfMissing 'IMPORT_PRICES_BREAKER_COOLDOWN_MS' '120000'

# Optional one-time key (manual override if not stored in .env)
# if (-not $env:POKEMON_TCG_API_KEY) { $env:POKEMON_TCG_API_KEY = '<your key>' }

Write-Host "[ENV] .env loaded for PRODUCTION context."
