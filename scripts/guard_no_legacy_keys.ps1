Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (& git rev-parse --show-toplevel).Trim()
$includedExtensions = @(
  '.ts', '.tsx', '.js', '.jsx', '.mjs',
  '.ps1', '.psm1', '.psd1',
  '.sh', '.bash', '.zsh',
  '.yml', '.yaml', '.json', '.toml'
)
$excludedPathPatterns = @(
  '^node_modules/',
  '^backend/node_modules/',
  '^apps/web/\.next/',
  '^reports/',
  '^\.codex/'
)
$excludedFilePatterns = @(
  '^scripts/guard_no_legacy_keys\.ps1$',
  '^scripts/edge_functions_audit(_run)?\.ps1$',
  '^scripts/check_secrets\.ps1$'
)
$patterns = [ordered]@{
  'SUPABASE_ANON_KEY' = '(?<![A-Z0-9_])SUPABASE_ANON_KEY(?![A-Z0-9_])'
  'PROD_ANON_KEY' = '(?<![A-Z0-9_])PROD_ANON_KEY(?![A-Z0-9_])'
  'STAGING_ANON_KEY' = '(?<![A-Z0-9_])STAGING_ANON_KEY(?![A-Z0-9_])'
  'SUPABASE_SERVICE_ROLE_KEY' = '(?<![A-Z0-9_])SUPABASE_SERVICE_ROLE_KEY(?![A-Z0-9_])'
  'SERVICE_ROLE_KEY' = '(?<![A-Z0-9_])SERVICE_ROLE_KEY(?![A-Z0-9_])'
  'PROD_SERVICE_ROLE_KEY' = '(?<![A-Z0-9_])PROD_SERVICE_ROLE_KEY(?![A-Z0-9_])'
  'STAGING_SERVICE_ROLE_KEY' = '(?<![A-Z0-9_])STAGING_SERVICE_ROLE_KEY(?![A-Z0-9_])'
  'Authorization: Bearer' = 'Authorization:\s*Bearer'
}

function Test-MatchesAnyPattern([string] $Path, [string[]] $Patterns) {
  foreach ($pattern in $Patterns) {
    if ($Path -match $pattern) {
      return $true
    }
  }
  return $false
}

$bad = @()
& git ls-files | Where-Object {
  $rel = $_ -replace '\\', '/'
  ($includedExtensions -contains ([IO.Path]::GetExtension($rel).ToLowerInvariant())) -and
    -not (Test-MatchesAnyPattern $rel $excludedPathPatterns) -and
    -not (Test-MatchesAnyPattern $rel $excludedFilePatterns)
} | ForEach-Object {
  $rel = $_ -replace '\\', '/'
  $fullPath = Join-Path $repoRoot $rel
  $t = try { Get-Content $fullPath -Raw } catch { '' }
  foreach ($entry in $patterns.GetEnumerator()) {
    if ($t -match $entry.Value) {
      $bad += "${rel}: $($entry.Key)"
    }
  }
}
if ($bad.Count) {
  Write-Host 'Found legacy key usage:' -ForegroundColor Red
  $bad | ForEach-Object { Write-Host (" - " + $_) -ForegroundColor Red }
  exit 1
} else {
  Write-Host 'OK: No legacy key usage found in tracked runtime/config files.'
}
