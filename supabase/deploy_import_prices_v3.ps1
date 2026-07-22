Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

node .\scripts\ci\assert_retired_pricing_entrypoints.mjs
if ($LASTEXITCODE -ne 0) {
  throw 'Refusing to deploy: retired pricing entrypoint contract failed.'
}

supabase functions deploy import-prices-v3 `
  --project-ref ycdxbpibncqcchqiihfz

