Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

cd C:\grookai_vault

if (-not $env:SUPABASE_URL) {
  $env:SUPABASE_URL = "https://ycdxbpibncqcchqiihfz.supabase.co"
}

if (-not $env:SUPABASE_SECRET_KEY) {
  throw "[infra-worker] SUPABASE_SECRET_KEY is not set."
}

node .\backend\infra\system_health_worker.mjs

