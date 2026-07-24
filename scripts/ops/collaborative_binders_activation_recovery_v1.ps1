#requires -Version 7.4

[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
  [Parameter(Mandatory = $true)]
  [string]$EvidenceRoot,

  [Parameter(Mandatory = $true)]
  [string]$ExpectedHeadSha,

  [Parameter(Mandatory = $true)]
  [string]$ClientsDarkEvidenceRoot,

  [Parameter(Mandatory = $true)]
  [string]$ArtifactRoot,

  [switch]$ConfirmRecovery
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$activationModulePath =
  Join-Path $PSScriptRoot 'CollaborativeBindersActivationV1.psm1'
$productionModulePath =
  Join-Path $PSScriptRoot 'CollaborativeBindersProductionRolloutV1.psm1'
$expectedActivationModuleSha256 =
  'f805b21d3d31360829b95488fb0d9d4f72b0ff0811cfdcb434acecc2495580d3'
$expectedProductionModuleSha256 =
  'be131d5434bf475d90cb26d4b257b369c45931569340e8303a9cd5a6915650d8'

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
  $action = 'Classify one sealed Binder activation result without mutation'

  if ($PSCmdlet.ShouldProcess($target, $action)) {
    Invoke-BinderActivationRecoveryV1 `
      -EvidenceRoot $EvidenceRoot `
      -ExpectedHeadSha $ExpectedHeadSha `
      -ClientsDarkEvidenceRoot $ClientsDarkEvidenceRoot `
      -ArtifactRoot $ArtifactRoot `
      -ConfirmRecovery $ConfirmRecovery.IsPresent |
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
