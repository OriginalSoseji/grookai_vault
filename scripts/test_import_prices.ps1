Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'test_import_prices_health.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
