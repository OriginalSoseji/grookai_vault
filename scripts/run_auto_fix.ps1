param(
  [Parameter(Mandatory=$false)]
  [string]$BridgeTokenSession
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if($PSBoundParameters.ContainsKey('BridgeTokenSession') -and $BridgeTokenSession){
  $env:BRIDGE_TOKEN_SESSION = $BridgeTokenSession
}

Write-Host "Running auto-fix orchestrator..."

$scriptPath = Join-Path $PSScriptRoot 'auto_fix_import_prices.ps1'
if(-not (Test-Path $scriptPath)){
  throw "Orchestrator not found: $scriptPath"
}

& $scriptPath
$code = $LASTEXITCODE
if($code -eq $null){ $code = 0 }
Write-Host "Orchestrator exit code: $code"
exit $code
