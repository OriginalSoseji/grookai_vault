Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host '[probe] Legacy write probes are disabled; running only the retired pricing health contract.'
& (Join-Path $PSScriptRoot 'test_import_prices_health.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
