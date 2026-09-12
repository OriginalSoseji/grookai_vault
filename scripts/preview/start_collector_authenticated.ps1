param([ValidateSet('dev','build','start')][string]$Mode = 'dev', [int]$Port = 3167, [switch]$SharedBinders)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
Push-Location $root
try {
  if ((git branch --show-current).Trim() -ne 'preview/collector-authenticated-20260910') { throw 'Wrong staging branch.' }
  $raw = supabase status -o json 2>$null
  if ($LASTEXITCODE -ne 0) { throw 'Local Supabase unavailable; no automatic reset or seed.' }
  $status = $raw | ConvertFrom-Json
  if ($status.API_URL.TrimEnd('/') -ne 'http://127.0.0.1:54321') { throw 'Wrong local endpoint.' }
  # Explicitly remove inherited external service credentials before starting Next.
  Get-ChildItem Env: | Where-Object { $_.Name -match 'SUPABASE|PSA|UPSTASH|VERCEL|BRIDGE_IMPORT|RESEND|SENDGRID|SENTRY|POSTHOG' } | ForEach-Object { Remove-Item -LiteralPath "Env:$($_.Name)" }
  $env:SUPABASE_URL = $status.API_URL
  $env:SUPABASE_PUBLISHABLE_KEY = $status.ANON_KEY
  $env:SUPABASE_SECRET_KEY = $status.SECRET_KEY
  $env:NEXT_PUBLIC_COLLECTOR_STAGING = 'true'
  $env:NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB = 'false'
  $env:NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING = 'false'
  $env:NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY = 'false'
  $env:NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:$Port"
  $env:SITE_URL = $env:NEXT_PUBLIC_SITE_URL
  $env:NEXT_TELEMETRY_DISABLED = '1'
  $env:GROOKAI_BINDERS_SCHEMA_RPC_V1_ENABLED = 'true'
  $env:GROOKAI_BINDERS_PERSONAL_V1_ENABLED = 'true'
  $env:GROOKAI_BINDERS_CUSTOM_V1_ENABLED = 'true'
  # Do not inherit public/collaboration gates or an invitation key from another environment.
  foreach ($gate in @('SHARED','VIEW_LINKS','PUBLIC','COMMUNITY','TEMPLATES','NOTIFICATIONS','PULSE_SHARING')) {
    Set-Item -LiteralPath "Env:GROOKAI_BINDERS_${gate}_V1_ENABLED" -Value 'false'
  }
  Remove-Item Env:BINDER_INVITE_TRANSIENT_SECRET -ErrorAction SilentlyContinue
  if ($SharedBinders) {
    $env:GROOKAI_BINDERS_SHARED_V1_ENABLED = 'true'
    $env:BINDER_INVITE_TRANSIENT_SECRET = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
  }
  # The local schema lacks binder_set_slots_authority_v1; do not offer a broken create path.
  $env:GROOKAI_BINDERS_SET_V1_ENABLED = 'false'
  Set-Location (Join-Path $root 'apps/web')
  if ($Mode -eq 'build') { node ../../scripts/ci/run_next_build_with_system_ca.mjs }
  else {
    if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { throw 'Port already in use.' }
    if ($Mode -eq 'dev') { node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port $Port }
    else { node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port $Port }
  }
  if ($LASTEXITCODE -ne 0) { throw "Next exited with $LASTEXITCODE" }
} finally { Pop-Location }
