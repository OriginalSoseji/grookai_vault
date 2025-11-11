Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location C:\grookai_vault

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  throw 'Supabase CLI not found. Install from https://supabase.com/docs/guides/cli'
}

$proj = 'ycdxbpibncqcchqiihfz'
$envPath = 'supabase/functions/import-prices/.env'
New-Item -ItemType Directory -Force -Path (Split-Path $envPath) | Out-Null

$token = Read-Host -Prompt 'Enter BRIDGE_IMPORT_TOKEN (will be stored in .env and project secret)'
if (-not $token) { throw 'Empty token provided.' }

"BRIDGE_IMPORT_TOKEN=$token" | Set-Content -Path $envPath -Encoding UTF8

# Try NAME=value form first; fallback to NAME value
try {
  supabase secrets set --project-ref $proj BRIDGE_IMPORT_TOKEN=$token | Out-Null
} catch {
  supabase secrets set --project-ref $proj BRIDGE_IMPORT_TOKEN $token | Out-Null
}

supabase functions deploy import-prices --project-ref $proj --no-verify-jwt --env-file $envPath

Write-Host 'Bridge token re-synced and function redeployed.' -ForegroundColor Green

