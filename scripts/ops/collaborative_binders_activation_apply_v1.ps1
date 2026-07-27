#requires -Version 7.4

[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
  [Parameter(Mandatory = $true)]
  [string]$ManifestPath,

  [Parameter(Mandatory = $true)]
  [string]$ArtifactRoot,

  [switch]$ConfirmProduction
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$activationModulePath =
  Join-Path $PSScriptRoot 'CollaborativeBindersActivationV1.psm1'
$productionModulePath =
  Join-Path $PSScriptRoot 'CollaborativeBindersProductionRolloutV1.psm1'
$expectedActivationModuleSha256 =
  '89d93e725ea1b7ed70d2c9dd65f0d4e05f0c766a15796400c0fc817af6ee4679'
$expectedProductionModuleSha256 =
  '4a3c61cec4e490f17f180c7f994041675c37fd8d39bbd95cc8e5711eabedd471'

$activationModuleItem = Get-Item -LiteralPath $activationModulePath
if ($activationModuleItem.Attributes.HasFlag(
  [IO.FileAttributes]::ReparsePoint
)) {
  throw 'Activation module must not be a reparse point.'
}
$productionModuleItem = Get-Item -LiteralPath $productionModulePath
if ($productionModuleItem.Attributes.HasFlag(
  [IO.FileAttributes]::ReparsePoint
)) {
  throw 'Production rollout module must not be a reparse point.'
}
$activationHashBefore = (
  Get-FileHash -LiteralPath $activationModulePath -Algorithm SHA256
).Hash.ToLowerInvariant()
$productionHashBefore = (
  Get-FileHash -LiteralPath $productionModulePath -Algorithm SHA256
).Hash.ToLowerInvariant()
$activationModuleSeal = $null
$productionModuleSeal = $null
try {
  $activationModuleSeal = [IO.File]::Open(
    $activationModulePath,
    [IO.FileMode]::Open,
    [IO.FileAccess]::Read,
    [IO.FileShare]::Read
  )
  $productionModuleSeal = [IO.File]::Open(
    $productionModulePath,
    [IO.FileMode]::Open,
    [IO.FileAccess]::Read,
    [IO.FileShare]::Read
  )
  $activationHashAfter = (
    Get-FileHash -LiteralPath $activationModulePath -Algorithm SHA256
  ).Hash.ToLowerInvariant()
  $productionHashAfter = (
    Get-FileHash -LiteralPath $productionModulePath -Algorithm SHA256
  ).Hash.ToLowerInvariant()
  if (
    $activationHashBefore -cne $expectedActivationModuleSha256 -or
    $activationHashAfter -cne $expectedActivationModuleSha256 -or
    $productionHashBefore -cne $expectedProductionModuleSha256 -or
    $productionHashAfter -cne $expectedProductionModuleSha256
  ) {
    throw 'Trusted Binder rollout module hash mismatch.'
  }

  Import-Module $activationModulePath -Force
  $target = 'Supabase production project ycdxbpibncqcchqiihfz'
  $action = 'Enable the one exact Binder phase named by the sealed manifest'

  if ($PSCmdlet.ShouldProcess($target, $action)) {
    Invoke-BinderActivationApplyV1 `
      -ManifestPath $ManifestPath `
      -ArtifactRoot $ArtifactRoot `
      -ConfirmProduction $ConfirmProduction.IsPresent `
      -Confirm:$false |
      ConvertTo-Json -Depth 12
  }
} finally {
  if ($null -ne $productionModuleSeal) {
    $productionModuleSeal.Dispose()
  }
  if ($null -ne $activationModuleSeal) {
    $activationModuleSeal.Dispose()
  }
}
