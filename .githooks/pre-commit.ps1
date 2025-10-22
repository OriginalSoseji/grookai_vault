# .githooks\pre-commit.ps1
$ErrorActionPreference = "Stop"
Write-Host "Running local Edge Functions audit..."

$root = "supabase/functions"
if (-not (Test-Path $root)) { exit 0 }

$public = @('search_cards','hydrate_card','intake-scan')
$internal = @('import-prices','import-all-prices','import-cards','keep_alive','check-prices','check-sets')

$fail = $false

Get-ChildItem $root -Directory | Where-Object { $_.Name -ne "_archive" } | ForEach-Object {
  $fn = $_.Name
  $cfg = Join-Path $_.FullName "config.toml"
  $readme = Get-ChildItem $_.FullName -Filter "README*" -ErrorAction SilentlyContinue

  if (-not (Test-Path $cfg) -and -not $readme) {
    Write-Error "Function '$fn' must include config.toml or README.md"
    $fail = $true
  }

  if (Test-Path $cfg) {
    $text = Get-Content $cfg -Raw
    if ($internal -contains $fn) {
      if ($text -notmatch 'verify_jwt\s*=\s*false') {
        Write-Error "Internal/job function '$fn' must set verify_jwt = false"
        $fail = $true
      }
    }
    if ($public -contains $fn) {
      if ($text -match 'verify_jwt\s*=\s*false') {
        Write-Error "Public function '$fn' must NOT set verify_jwt = false"
        $fail = $true
      }
    }
  } elseif ($internal -contains $fn) {
    Write-Error "Internal/job function '$fn' requires a config.toml with verify_jwt = false"
    $fail = $true
  }
}

if ($fail) { exit 1 } else { Write-Host "Edge Functions audit passed."; exit 0 }

