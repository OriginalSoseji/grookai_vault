Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-Location (Split-Path $PSCommandPath -Parent | Split-Path -Parent)  # repo root

$proj = "ycdxbpibncqcchqiihfz"

# Generate secure 64-hex token (no OpenSSL)
$token = [Guid]::NewGuid().ToString("N") + [Guid]::NewGuid().ToString("N")

# Ensure function env file exists
$envDir  = "supabase/functions/import-prices"
$envPath = Join-Path $envDir ".env"
if (-not (Test-Path $envDir)) { New-Item -ItemType Directory -Path $envDir | Out-Null }
"BRIDGE_IMPORT_TOKEN=$token" | Out-File -FilePath $envPath -Encoding utf8 -Force

# Push secret to Supabase and redeploy function
try {
  supabase secrets set BRIDGE_IMPORT_TOKEN=$token --project-ref $proj --env-file $envPath
} catch {
  Write-Warning "env-file method failed, retrying direct"
  supabase secrets set BRIDGE_IMPORT_TOKEN=$token --project-ref $proj
}

supabase functions deploy import-prices --project-ref $proj --no-verify-jwt

Write-Host "`nNEW BRIDGE_IMPORT_TOKEN (copy & store securely):`n$token" -ForegroundColor Cyan
