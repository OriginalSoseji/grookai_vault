Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location 'C:\grookai_vault'

supabase functions deploy import-prices-v3 `
  --project-ref ycdxbpibncqcchqiihfz

