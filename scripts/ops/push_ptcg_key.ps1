Param(
  [string]$ProjectRef = "ycdxbpibncqcchqiihfz"
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Info($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host $msg -ForegroundColor Yellow }
function Write-Ok($msg) { Write-Host $msg -ForegroundColor Green }

# 1) Source from environment if present; otherwise attempt to load from .env without printing
if (-not $env:POKEMON_TCG_API_KEY) {
  if (Test-Path ".env") {
    $line = Select-String -Path ".env" -Pattern '^(\s*)POKEMON_TCG_API_KEY\s*=\s*(.+)$' -SimpleMatch:$false -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($line) {
      $val = ($line.Matches[0].Groups[2].Value.Trim().Trim('"').Trim("'"))
      $env:POKEMON_TCG_API_KEY = $val
      Write-Info ("Loaded POKEMON_TCG_API_KEY from .env (length = {0})" -f $val.Length)
    } else { Write-Warn ".env present but POKEMON_TCG_API_KEY not found" }
  } else { Write-Warn ".env not found; set POKEMON_TCG_API_KEY in the environment" }
} else {
  Write-Info ("POKEMON_TCG_API_KEY present in environment (length = {0})" -f $env:POKEMON_TCG_API_KEY.Length)
}

if (-not $env:POKEMON_TCG_API_KEY) { throw "POKEMON_TCG_API_KEY is not set" }

# 2) Push to Supabase secrets (no echo of value)
Write-Info "Setting Supabase secret (name only)"
& supabase secrets set "POKEMON_TCG_API_KEY=$env:POKEMON_TCG_API_KEY" --project-ref $ProjectRef | Out-Null

# 3) Verify presence (name only)
Write-Info "Verifying secret exists (name only)"
$list = & supabase secrets list --project-ref $ProjectRef 2>&1 | Select-String -Pattern "POKEMON_TCG_API_KEY" -SimpleMatch
if ($list) { Write-Ok "Supabase: POKEMON_TCG_API_KEY present" } else { Write-Warn "Supabase: POKEMON_TCG_API_KEY not listed" }

