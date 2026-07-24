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
Import-Module $modulePath -Force

if ($ValidateSourceOnly) {
  $result = Test-BinderSourceV1
  $result | ConvertTo-Json -Depth 12
  exit 0
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

$result = Invoke-BinderProductionPreflightV1 `
  -ExpectedHeadSha $ExpectedHeadSha `
  -BackupEvidencePath $BackupEvidencePath `
  -ArtifactRoot $ArtifactRoot
$result | ConvertTo-Json -Depth 12
