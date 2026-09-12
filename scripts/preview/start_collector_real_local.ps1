param(
  [ValidateSet('dev', 'fixture', 'build', 'start')][string]$Mode = 'dev',
  [ValidateRange(1024, 65535)][int]$Port = 3165
)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$web = Join-Path $root 'apps/web'
Push-Location $root
try {
  $branch = git branch --show-current
  if ($branch.Trim() -ne 'design/collector-real-local') { throw 'Use the isolated collector integration branch.' }
  $raw = supabase status -o json 2>$null
  if ($LASTEXITCODE -ne 0) { throw 'Existing local Supabase must be running; this script will not start, reset or seed it.' }
  $status = $raw | ConvertFrom-Json
  $url = [Uri]$status.API_URL
  if ($url.Host -ne '127.0.0.1' -or $url.Port -ne 54321) { throw 'Only the existing loopback Supabase instance is allowed.' }
  $env:SUPABASE_URL = $url.AbsoluteUri.TrimEnd('/')
  $env:SUPABASE_PUBLISHABLE_KEY = $status.ANON_KEY
  if (-not $env:SUPABASE_PUBLISHABLE_KEY) { throw 'Local publishable credential unavailable.' }
  Get-ChildItem Env: | Where-Object { $_.Name -match '^SUPABASE_.*KEY$' -and $_.Name -ne 'SUPABASE_PUBLISHABLE_KEY' } | ForEach-Object { Remove-Item -LiteralPath "Env:$($_.Name)" }
  Remove-Item Env:VERCEL, Env:GROOKAI_VISUAL_TEST_MODE -ErrorAction SilentlyContinue
  # Existing server-side readers require the local-only service credential.
  $env:SUPABASE_SECRET_KEY = $status.SECRET_KEY
  if ($Mode -eq 'fixture') { $env:GROOKAI_VISUAL_TEST_MODE = '1' }
  $env:NEXT_TELEMETRY_DISABLED = '1'
  Set-Location $web
  if ($Mode -eq 'build') {
    node ../../scripts/generate_public_set_card_counts.mjs --validate-only
    if ($LASTEXITCODE -ne 0) { throw 'Set-count artifact validation failed.' }
    node ../../scripts/ci/run_next_build_with_system_ca.mjs
  } else {
    if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) { throw "Port $Port is in use; no existing server was stopped." }
    if ($Mode -in 'dev', 'fixture') { node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port $Port }
    else { node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port $Port }
  }
  if ($LASTEXITCODE -ne 0) { throw "Next.js exited with $LASTEXITCODE" }
} finally { Pop-Location }
