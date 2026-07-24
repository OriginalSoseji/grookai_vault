[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
  [Parameter(Mandatory = $true)]
  [string]$ManifestPath,

  [switch]$ConfirmProduction
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$modulePath = Join-Path $PSScriptRoot 'CollaborativeBindersProductionRolloutV1.psm1'
Import-Module $modulePath -Force

$target = 'Supabase production project ycdxbpibncqcchqiihfz'
$action = 'Apply the exact five Collaborative Binders V1 migrations once; leave every feature flag disabled'

if ($PSCmdlet.ShouldProcess($target, $action)) {
  $result = Invoke-BinderProductionApplyV1 `
    -ManifestPath $ManifestPath `
    -ConfirmProduction $ConfirmProduction.IsPresent `
    -Confirm:$false
  $result | ConvertTo-Json -Depth 12
}
