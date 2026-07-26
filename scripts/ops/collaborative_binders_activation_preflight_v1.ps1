#requires -Version 7.4

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet(
    'schema_internal',
    'personal',
    'shared',
    'view_links',
    'public',
    'community',
    'custom',
    'templates'
  )]
  [string]$Phase,

  [Parameter(Mandatory = $true)]
  [string]$ExpectedHeadSha,

  [Parameter(Mandatory = $true)]
  [string]$PriorEvidenceRoot,

  [Parameter(Mandatory = $true)]
  [string]$ClientsDarkEvidenceRoot,

  [Parameter(Mandatory = $true)]
  [string]$ExpectedWebDeploymentId,

  [Parameter(Mandatory = $true)]
  [string]$ExpectedMobileVersionName,

  [Parameter(Mandatory = $true)]
  [int]$ExpectedMobileVersionCode,

  [Parameter(Mandatory = $true)]
  [string]$ExpectedMobileApkSha256,

  [Parameter(Mandatory = $true)]
  [string]$ArtifactRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$activationModulePath =
  Join-Path $PSScriptRoot 'CollaborativeBindersActivationV1.psm1'
$productionModulePath =
  Join-Path $PSScriptRoot 'CollaborativeBindersProductionRolloutV1.psm1'
$expectedActivationModuleSha256 =
  'e83d0f699f9c25e43d9e7992fe21b0ec924adb6e54315ffa366de4f7643e9ce7'
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
  Invoke-BinderActivationPreflightV1 `
    -Phase $Phase `
    -ExpectedHeadSha $ExpectedHeadSha `
    -PriorEvidenceRoot $PriorEvidenceRoot `
    -ClientsDarkEvidenceRoot $ClientsDarkEvidenceRoot `
    -ExpectedWebDeploymentId $ExpectedWebDeploymentId `
    -ExpectedMobileVersionName $ExpectedMobileVersionName `
    -ExpectedMobileVersionCode $ExpectedMobileVersionCode `
    -ExpectedMobileApkSha256 $ExpectedMobileApkSha256 `
    -ArtifactRoot $ArtifactRoot |
    ConvertTo-Json -Depth 12
} finally {
  if ($null -ne $productionModuleSeal) {
    $productionModuleSeal.Dispose()
  }
  if ($null -ne $activationModuleSeal) {
    $activationModuleSeal.Dispose()
  }
}
