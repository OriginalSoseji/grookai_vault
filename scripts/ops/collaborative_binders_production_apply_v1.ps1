[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
  [Parameter(Mandatory = $true)]
  [string]$ManifestPath,

  [switch]$ConfirmProduction
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$mutationDeadlineName =
  'GROOKAI_BINDER_PROD_MUTATION_NOT_AFTER_UTC'
$authorizationExpiryName =
  'GROOKAI_BINDER_PROD_AUTH_EXPIRES_AT_UTC'
$mutationDeadline = [Environment]::GetEnvironmentVariable(
  $mutationDeadlineName,
  [EnvironmentVariableTarget]::Process
)
$authorizationExpiry = [Environment]::GetEnvironmentVariable(
  $authorizationExpiryName,
  [EnvironmentVariableTarget]::Process
)
[Environment]::SetEnvironmentVariable(
  $mutationDeadlineName,
  $null,
  [EnvironmentVariableTarget]::Process
)
[Environment]::SetEnvironmentVariable(
  $authorizationExpiryName,
  $null,
  [EnvironmentVariableTarget]::Process
)

try {
  $hasMutationDeadline = -not [string]::IsNullOrWhiteSpace(
    $mutationDeadline
  )
  $hasAuthorizationExpiry = -not [string]::IsNullOrWhiteSpace(
    $authorizationExpiry
  )
  if ($hasMutationDeadline -ne $hasAuthorizationExpiry) {
    throw 'Production deadline transport is incomplete.'
  }

  $modulePath = Join-Path (
    $PSScriptRoot
  ) 'CollaborativeBindersProductionRolloutV1.psm1'
  Import-Module $modulePath -Force -ErrorAction Stop

  $target = 'Supabase production project ycdxbpibncqcchqiihfz'
  $action = (
    'Apply the exact five Collaborative Binders V1 migrations once; ' +
    'leave every feature flag disabled'
  )

  if ($PSCmdlet.ShouldProcess($target, $action)) {
    $result = Invoke-BinderProductionApplyV1 `
      -ManifestPath $ManifestPath `
      -ConfirmProduction $ConfirmProduction.IsPresent `
      -MutationDeadlineUtc ([string]$mutationDeadline) `
      -AuthorizationExpiresAtUtc ([string]$authorizationExpiry) `
      -Confirm:$false
    $result | ConvertTo-Json -Depth 12
  }
} catch {
  [pscustomobject][ordered]@{
    status = 'stop'
    phase = 'apply_entrypoint'
    message = (
      'Production apply stopped before completion; inspect the ' +
      'private local evidence directory.'
    )
  } | ConvertTo-Json -Depth 4 -Compress
  exit 40
} finally {
  [Environment]::SetEnvironmentVariable(
    $mutationDeadlineName,
    $null,
    [EnvironmentVariableTarget]::Process
  )
  [Environment]::SetEnvironmentVariable(
    $authorizationExpiryName,
    $null,
    [EnvironmentVariableTarget]::Process
  )
}
