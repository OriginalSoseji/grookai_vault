param(
  [string]$DbUrl = ""
)

Write-Host "== Grookai Vault :: Validate DB (lint + views) =="

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Warning "Supabase CLI not found. Install from https://supabase.com/docs/guides/cli";
  exit 1;
}

if ($DbUrl -ne "") {
  supabase db lint --db-url $DbUrl
} else {
  supabase db lint
}

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "-- OK: lint passed"

Write-Host "-- Note: Ensure migrations compile clean on shadow DB (CI step recommended)."

