# Grookai Vault - Preflight Gate V1
param(
  [Parameter(Mandatory = $true)]
  [string] $Command,
  [switch] $Destructive
)

$ErrorActionPreference = "Stop"

if ($Destructive -and $env:GROOKAI_PREFLIGHT_ACK -ne "1") {
  Write-Host "[BLOCKED] GROOKAI_PREFLIGHT_ACK=1 is required for destructive runs." -ForegroundColor Red
  exit 1
}

Write-Host "[INFO] Running: $Command"
cmd /c $Command
$exitCode = $LASTEXITCODE
exit $exitCode
