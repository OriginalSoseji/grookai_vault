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
  '^scripts/check_secrets\.ps1$',
  # These completed apply runners are byte-pinned by approved Japanese V4
  # artifacts. Their contract tests preserve the historical execution proof.
  '^scripts/audits/japanese_master_index_v4/image_pointer_common_v1\.mjs$',
  '^scripts/audits/japanese_master_index_v4/image_storage_canary_apply_v1\.mjs$',
  '^scripts/audits/japanese_master_index_v4/image_storage_permanent_apply_v1\.mjs$',
  # Immutable read-only baseline inventory. It records referenced environment
  # variable names from the authority tree, never credential values.
  '^docs/audits/system_parity_baseline_20260903/repository_snapshot\.json$'
)
# Qualified Jungle harness bytes are retained for historical proof replay. These
# exact files use CLI JSON fields or a loopback anon alias/empty service alias.
# Pin LF-normalized bytes so Windows/Linux checkouts agree. Any source change
# rejects the exception; all other tokens/files still receive the normal scan.
$jungleLocalHarnessHashes = @{
  'scripts/schema/test_jungle_edition_discovery_http_v1.mjs' = '8314f07f9a3f64a32f10db8bac2416ee1398bd19baa1f44b22483d3d3e56100f'
  'scripts/schema/test_jungle_edition_http_v1.mjs' = '4f5ce4690261e06be5f69636edbdfe94374b2a85baaa0b4c5cf8ca1b0931013c'
  'scripts/schema/test_jungle_edition_http_v2.mjs' = 'e4289e564bfe5ef95d43fcfeff5d8a4839762113ae703178ecb5d48ba821f0ef'
  'scripts/schema/test_jungle_edition_http_v3.mjs' = '6809f15e91455fb304d87d1853624398c7c9b2f2a986515e0a23d73e5eda29d7'
  'scripts/schema/test_jungle_edition_publication_http_v1.mjs' = 'c72a30cbecfe465c4fec4b200bdeb5293cbacf38ac80ae833b42fd1000fc0b60'
  'scripts/schema/test_jungle_edition_publication_http_v2.mjs' = '2d606c33bd4e2f34aa0014c74652d663698418786ad973c43dcea44faf35a69e'
  'scripts/schema/test_jungle_edition_publication_http_v3.mjs' = 'fef3bf305b4f9dff27bcb397f30a571a12bc60b9e6a05836bce928e5748383c4'
  'scripts/schema/test_jungle_edition_publication_http_v4.mjs' = '36bb9d82cc601b438d050e249f0f6da1cb275b8713f70189a20a2f11827803fb'
  'scripts/schema/test_jungle_edition_search_http_v1.mjs' = '49b1e3fc45acf3451eab6a01e7583bbf3721452b53bc298ed75d46cae4b0de96'
  'scripts/schema/test_jungle_edition_search_http_v2.mjs' = '94feea936ccecac23f1f93fc5e8f156b45af3447351e7f5a8afc7ce80ab19478'
  'scripts/schema/test_jungle_edition_search_http_v3.mjs' = '3cc0d3fe3fc8e529a1632de058dd2b10862855241b51e081e800edc2124b26e3'
  'scripts/schema/test_jungle_edition_search_http_v4.mjs' = '8c14f7d6204f0744eeed2af0fb669a7a396f940cc96d0ce51854708a87b3b5f9'
  'scripts/schema/test_jungle_edition_search_http_v5.mjs' = '3d9fd8a01f1fe51ecb24d5b456b265f5e8a2cce316a855c69f43464f6eb56a80'
  'scripts/schema/test_jungle_edition_search_http_v6.mjs' = '59445987629f64fc94ffdab72ddb7e13f99d85093cd654ea3e10af582e3a1013'
  'scripts/schema/test_jungle_search_integration_v1.mjs' = 'c4cb45f03f0bb417d2b8e62c5d918f0fb1e7c389042661d2de32ef3d71c0e1a5'
  'scripts/tests/run_jungle_release_checks_v1.mjs' = '67e8fccf6ce8a2a6b9606c7d18e712994b68c087994825ace04bfb2e2595ea39'
  'scripts/tests/run_jungle_release_checks_v31.mjs' = 'aa8e7e5b8e360a40bd84e861d966d2689eb9fd0c6472f2a35ca7ea345ed71d81'
  'scripts/tests/run_jungle_release_checks_v32.mjs' = '82b0f45f3186f4dbad44c9abab5ac8448f8279a298df8f09bb11a5b600144a28'
}
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
  # The guarded loopback-only CLI adapter reads a third-party JSON field.
  # Permit that exact property expression only; environment aliases, strings,
  # and every other legacy key reference remain subject to the normal guard.
  if ($rel -eq 'scripts/lib/local_supabase_cli_status_v1.mjs') {
    $t = $t.Replace('status.SERVICE_ROLE_KEY', 'status.CLI_ADMIN_FIELD')
  }
  if ($jungleLocalHarnessHashes.ContainsKey($rel)) {
    $normalized = $t.Replace("`r`n", "`n")
    $bytes = [Text.Encoding]::UTF8.GetBytes($normalized)
    $actual = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
    if ($actual -ne $jungleLocalHarnessHashes[$rel]) {
      $bad += "${rel}: qualified local harness changed; review required"
    } elseif ($rel.StartsWith('scripts/schema/')) {
      $t = $t.Replace('config.SERVICE_ROLE_KEY', 'config.CLI_ADMIN_FIELD')
    } else {
      $t = $t.Replace('SUPABASE_ANON_KEY:anon,', 'LOCAL_COMPAT_PUBLISHABLE:anon,')
      $t = $t.Replace("SUPABASE_SERVICE_ROLE_KEY:'',", "LOCAL_COMPAT_SECRET:'',")
    }
  }
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
