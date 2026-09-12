param([ValidateSet('build','start')][string]$Mode = 'build', [int]$Port = 3169)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
Push-Location $root
try {
  if ((git branch --show-current).Trim() -ne 'release/collector-web-production-20260912') { throw 'Wrong release branch.' }
  $status = (supabase status -o json 2>$null) | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0 -or $status.API_URL -ne 'http://127.0.0.1:54321') { throw 'Wrong local backend.' }
  Get-ChildItem Env: | Where-Object { $_.Name -match 'SUPABASE|PSA|UPSTASH|VERCEL|BRIDGE_IMPORT|RESEND|SENDGRID|SENTRY|POSTHOG|GROOKAI_COLLECTOR_RELEASE' } | ForEach-Object { Remove-Item -LiteralPath "Env:$($_.Name)" }
  $env:SUPABASE_URL = $status.API_URL
  $env:SUPABASE_PUBLISHABLE_KEY = $status.ANON_KEY
  $env:SUPABASE_SECRET_KEY = $status.SECRET_KEY
  $env:NEXT_PUBLIC_COLLECTOR_STAGING = 'true'
  $env:NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING = 'false'
  $env:NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB = 'false'
  $env:NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY = 'false'
  $env:SITE_URL = "http://127.0.0.1:$Port"
  $env:NEXT_PUBLIC_SITE_URL = $env:SITE_URL
  $env:NEXT_TELEMETRY_DISABLED = '1'
  foreach ($gate in @('SCHEMA_RPC','PERSONAL','CUSTOM')) { Set-Item -LiteralPath "Env:GROOKAI_BINDERS_${gate}_V1_ENABLED" -Value 'true' }
  foreach ($gate in @('SET','SHARED','VIEW_LINKS','PUBLIC','COMMUNITY','TEMPLATES','NOTIFICATIONS','PULSE_SHARING')) { Set-Item -LiteralPath "Env:GROOKAI_BINDERS_${gate}_V1_ENABLED" -Value 'false' }
  Remove-Item Env:BINDER_INVITE_TRANSIENT_SECRET -ErrorAction SilentlyContinue
  Set-Location (Join-Path $root 'apps/web')
  if ($Mode -eq 'build') { node ../../scripts/ci/run_next_build_with_system_ca.mjs }
  else {
    if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { throw 'Port occupied; preserve the existing service.' }
    node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port $Port
  }
  if ($LASTEXITCODE -ne 0) { throw "Next failed: $LASTEXITCODE" }
} finally { Pop-Location }
