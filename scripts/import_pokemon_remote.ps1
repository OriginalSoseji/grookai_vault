# Remote Pokémon import for Supabase
# Uses existing ingestion workers; targets the project specified by env vars.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Require-Env([string]$name) {
  $v = [Environment]::GetEnvironmentVariable($name)
  if ([string]::IsNullOrWhiteSpace($v)) {
    throw "Missing environment variable: $name"
  }
  return $v
}

Write-Host "== Remote Pokémon import ==" -ForegroundColor Cyan

$supabaseUrl = Require-Env 'SUPABASE_URL'
$secret      = Require-Env 'SUPABASE_SECRET_KEY'

Write-Host "Target SUPABASE_URL: $supabaseUrl" -ForegroundColor Yellow
Write-Host "GV_ENV: $([Environment]::GetEnvironmentVariable('GV_ENV') ?? 'unset')" -ForegroundColor Yellow

function Run-Step($label, $cmd) {
  Write-Host "`n[$label] START" -ForegroundColor Cyan
  & pwsh -NoLogo -NoProfile -Command $cmd
  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $label"
  }
  Write-Host "[$label] DONE" -ForegroundColor Green
}

# Ensure we run from repo root
Push-Location "$PSScriptRoot/.."

Run-Step 'Import sets (PokemonAPI)'    'node backend/sets/import_sets_worker.mjs'
Run-Step 'Import sets (TCGdex)'        'node backend/sets/tcgdex_import_sets_worker.mjs'
Run-Step 'Import cards (PokemonAPI)'   'node backend/pokemon/pokemonapi_import_cards_worker.mjs'
Run-Step 'Import cards (TCGdex)'       'node backend/pokemon/tcgdex_import_cards_worker.mjs'
Run-Step 'Normalize (PokemonAPI)'      'node backend/pokemon/pokemonapi_normalize_worker.mjs'
Run-Step 'Normalize (TCGdex)'          'node backend/pokemon/tcgdex_normalize_worker.mjs'
Run-Step 'Enrichment (traits/types)'   'node backend/pokemon/pokemon_enrichment_worker.mjs'

Pop-Location

Write-Host "`nRemote Pokémon import complete." -ForegroundColor Green
