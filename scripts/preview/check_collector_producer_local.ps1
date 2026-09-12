param([switch]$Commit)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$out = 'C:/grookai_vault_operator_artifacts/collector_polish/cameo_full_replay_20260912'
Push-Location $root
try {
  if ((git branch --show-current).Trim() -ne 'release/collector-web-production-20260912') { throw 'Wrong release branch' }
  if (Test-Path .env.local) { throw 'Unexpected root environment file' }
  if (Get-ChildItem apps/web/.env* -ErrorAction SilentlyContinue) { throw 'Unexpected web environment file' }
  $status = (supabase status -o json 2>$null) | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0 -or $status.API_URL -ne 'http://127.0.0.1:54321') { throw 'Wrong local backend' }
  $container = (docker inspect supabase_db_collector-cameo-replay-20260912 | ConvertFrom-Json)[0]
  if (-not $container.State.Running -or $container.NetworkSettings.Ports.'5432/tcp'[0].HostPort -ne '56530') { throw 'Wrong local schema database' }
  Get-ChildItem Env: | Where-Object { $_.Name -match 'SUPABASE|DATABASE_URL|POSTGRES_URL|SECRET|TOKEN|API_KEY|PASSWORD|PSA|UPSTASH|VERCEL|BRIDGE_IMPORT|RESEND|SENDGRID|SENTRY|POSTHOG|GROOKAI_COLLECTOR_RELEASE|DOTENV_CONFIG_PATH|NODE_OPTIONS' } | ForEach-Object { Remove-Item -LiteralPath "Env:$($_.Name)" }
  $env:SUPABASE_URL = $status.API_URL
  $env:SUPABASE_PUBLISHABLE_KEY = $status.ANON_KEY
  $env:SUPABASE_SECRET_KEY = $status.SERVICE_ROLE_KEY
  $env:SUPABASE_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:56530/postgres'
  $env:DOTENV_CONFIG_PATH = "$out/no-env-file"
  if (Test-Path $env:DOTENV_CONFIG_PATH) { throw 'Unexpected environment override' }
  $env:NEXT_PUBLIC_COLLECTOR_STAGING = 'true'
  $env:NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING = 'false'
  $env:NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB = 'false'
  $env:NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY = 'false'
  $env:SITE_URL = 'http://127.0.0.1:3169'
  $env:NEXT_PUBLIC_SITE_URL = $env:SITE_URL
  $env:NEXT_TELEMETRY_DISABLED = '1'
  $env:NODE_USE_SYSTEM_CA = '1'
  $loader = (Join-Path $root 'scripts/preview/register_collector_local_dependencies.mjs').Replace('\','/')
  $env:NODE_OPTIONS = "--import=file:///$loader"
  if ($Commit) {
    # The repository's installed pre-commit hook runs the complete shipcheck.
    git commit -m 'Preserve collector release candidate and verify bounded backend repairs' *> "$out/managed-commit.log"
  } else {
    npm run shipcheck *> "$out/isolated-shipcheck-repaired.log"
  }
  exit $LASTEXITCODE
} finally { Pop-Location }
