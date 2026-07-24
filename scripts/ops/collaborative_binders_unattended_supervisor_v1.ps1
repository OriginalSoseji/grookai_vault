[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$AuthorizationPath,

  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{64}$')]
  [string]$ExpectedAuthorizationSha256
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$modulePath = Join-Path $PSScriptRoot (
  'CollaborativeBindersUnattendedSupervisorV1.psm1'
)
$moduleLoaded = $false

try {
  Import-Module $modulePath -Force -ErrorAction Stop
  $moduleLoaded = $true
  $result = Invoke-BinderUnattendedSupervisorV1 `
    -AuthorizationPath $AuthorizationPath `
    -ExpectedAuthorizationSha256 $ExpectedAuthorizationSha256
  $result | ConvertTo-Json -Depth 16
  exit 0
} catch {
  if (-not $moduleLoaded) {
    [pscustomobject][ordered]@{
      status = 'stop'
      exit_class = 'local_integrity_stop'
      message = 'The unattended supervisor module could not be loaded.'
    } | ConvertTo-Json -Depth 4
    exit 40
  }
  $exitClass = [string]$_.Exception.Data[
    'BinderSupervisorExitClass'
  ]
  if ($exitClass -cnotin @(
    'safe_stop_pre_mutation',
    'mutation_possible_stop',
    'local_integrity_stop'
  )) {
    $exitClass = 'local_integrity_stop'
  }
  $exitCode = switch ($exitClass) {
    'safe_stop_pre_mutation' { 20 }
    'mutation_possible_stop' { 30 }
    default { 40 }
  }
  $safeMessage = 'The unattended supervisor stopped safely.'
  try {
    $safeMessage = Protect-BinderUnattendedTextV1 `
      -Text $_.Exception.Message
  } catch {
  }
  [pscustomobject][ordered]@{
    status = 'stop'
    exit_class = $exitClass
    message = $safeMessage
  } | ConvertTo-Json -Depth 8
  exit $exitCode
}
