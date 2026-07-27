#requires -Version 7.4

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$activationModulePath =
  Join-Path $PSScriptRoot 'CollaborativeBindersActivationV1.psm1'
$productionModulePath =
  Join-Path $PSScriptRoot 'CollaborativeBindersProductionRolloutV1.psm1'
$expectedActivationModuleSha256 =
  '7ad2c2bcc86bf9f8d4b40ff3fbd9d3af4f3db3bc4dc9ace6880a783bf7747826'
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
  Assert-BinderActivationSourceV1 | ConvertTo-Json -Depth 12
} finally {
  if ($null -ne $productionModuleSeal) {
    $productionModuleSeal.Dispose()
  }
  if ($null -ne $activationModuleSeal) {
    $activationModuleSeal.Dispose()
  }
}
