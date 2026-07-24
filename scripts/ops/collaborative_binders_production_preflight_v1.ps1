#requires -Version 7.4

[CmdletBinding()]
param(
  [switch]$ValidateSourceOnly,

  [string]$ExpectedHeadSha,

  [string]$BackupEvidencePath,

  [string]$ArtifactRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$modulePath = Join-Path $PSScriptRoot 'CollaborativeBindersProductionRolloutV1.psm1'
$expectedModuleSha256 =
  'be131d5434bf475d90cb26d4b257b369c45931569340e8303a9cd5a6915650d8'
$moduleItem = Get-Item -LiteralPath $modulePath
if ($moduleItem.Attributes.HasFlag([IO.FileAttributes]::ReparsePoint)) {
  throw 'Production rollout module must not be a reparse point.'
}
if ((
  Get-FileHash -LiteralPath $modulePath -Algorithm SHA256
).Hash.ToLowerInvariant() -cne $expectedModuleSha256) {
  throw 'Production rollout module hash does not match the wrapper bootstrap.'
}
$moduleSeal = [IO.File]::Open(
  $modulePath,
  [IO.FileMode]::Open,
  [IO.FileAccess]::Read,
  [IO.FileShare]::Read
)
try {
  if ((
    Get-FileHash -LiteralPath $modulePath -Algorithm SHA256
  ).Hash.ToLowerInvariant() -cne $expectedModuleSha256) {
    throw 'Production rollout module changed while opening its wrapper seal.'
  }
  Import-Module $modulePath -Force

  if ($ValidateSourceOnly) {
    Test-BinderSourceV1 | ConvertTo-Json -Depth 12
    return
  }

  if ([string]::IsNullOrWhiteSpace($ExpectedHeadSha)) {
    throw '-ExpectedHeadSha is required unless -ValidateSourceOnly is used.'
  }
  if ([string]::IsNullOrWhiteSpace($BackupEvidencePath)) {
    throw '-BackupEvidencePath is required unless -ValidateSourceOnly is used.'
  }
  if ([string]::IsNullOrWhiteSpace($ArtifactRoot)) {
    throw '-ArtifactRoot is required unless -ValidateSourceOnly is used.'
  }

  Invoke-BinderProductionPreflightV1 `
    -ExpectedHeadSha $ExpectedHeadSha `
    -BackupEvidencePath $BackupEvidencePath `
    -ArtifactRoot $ArtifactRoot |
    ConvertTo-Json -Depth 12
} finally {
  $moduleSeal.Dispose()
}
