Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location 'C:\grookai_vault'

supabase functions deploy import-prices `
  --project-ref ycdxbpibncqcchqiihfz `
  --no-verify-jwt

