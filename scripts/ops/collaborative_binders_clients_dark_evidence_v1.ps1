#requires -Version 7.4

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ExpectedHeadSha,

  [Parameter(Mandatory = $true)]
  [string]$WebDeploymentId,

  [Parameter(Mandatory = $true)]
  [string]$WebProofPath,

  [Parameter(Mandatory = $true)]
  [datetimeoffset]$WebObservedAtUtc,

  [Parameter(Mandatory = $true)]
  [string]$MobileApkPath,

  [Parameter(Mandatory = $true)]
  [string]$MobileVersionName,

  [Parameter(Mandatory = $true)]
  [int]$MobileVersionCode,

  [Parameter(Mandatory = $true)]
  [string]$MobileProofPath,

  [Parameter(Mandatory = $true)]
  [datetimeoffset]$MobileObservedAtUtc,

  [Parameter(Mandatory = $true)]
  [string]$ArtifactRoot,

  [switch]$ConfirmEvidence
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$activationModulePath =
  Join-Path $PSScriptRoot 'CollaborativeBindersActivationV1.psm1'
$productionModulePath =
  Join-Path $PSScriptRoot 'CollaborativeBindersProductionRolloutV1.psm1'
$expectedActivationModuleSha256 =
  '3296d234be0a166e1b3445142f6670423085e2e2940ad48f3fb9f6ea99a88933'
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
  New-BinderActivationClientsDarkEvidenceV1 `
    -ExpectedHeadSha $ExpectedHeadSha `
    -WebDeploymentId $WebDeploymentId `
    -WebProofPath $WebProofPath `
    -WebObservedAtUtc $WebObservedAtUtc `
    -MobileApkPath $MobileApkPath `
    -MobileVersionName $MobileVersionName `
    -MobileVersionCode $MobileVersionCode `
    -MobileProofPath $MobileProofPath `
    -MobileObservedAtUtc $MobileObservedAtUtc `
    -ArtifactRoot $ArtifactRoot `
    -ConfirmEvidence $ConfirmEvidence.IsPresent |
    ConvertTo-Json -Depth 12
} finally {
  if ($null -ne $productionModuleSeal) {
    $productionModuleSeal.Dispose()
  }
  if ($null -ne $activationModuleSeal) {
    $activationModuleSeal.Dispose()
  }
}
