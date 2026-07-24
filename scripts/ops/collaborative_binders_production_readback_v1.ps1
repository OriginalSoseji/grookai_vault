[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('PreApply', 'PostApply')]
  [string]$ExpectedState,

  [Parameter(Mandatory = $true)]
  [string]$ExpectedHeadSha
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$modulePath = Join-Path $PSScriptRoot 'CollaborativeBindersProductionRolloutV1.psm1'
Import-Module $modulePath -Force

[void](Test-BinderSourceV1)
$module = Get-Module CollaborativeBindersProductionRolloutV1
& $module {
  param($repoRoot, $headSha)
  [void](Assert-BinderRepositoryStateV1 -RepoRoot $repoRoot -ExpectedHeadSha $headSha)
  [void](Assert-ProjectBindingV1 -RepoRoot $repoRoot)
} (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) $ExpectedHeadSha

$result = Invoke-BinderReadbackV1 -RepoRoot (
  Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
) -ExpectedState $ExpectedState
$result.Report | ConvertTo-Json -Depth 20
