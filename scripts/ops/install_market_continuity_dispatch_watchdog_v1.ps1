param(
  [string]$TaskName = 'Grookai TCGPlayer Market Continuity Dispatch Watchdog',
  [string]$WorkerScript = (Join-Path $PSScriptRoot 'ensure_pricing_completion_freshness_v1.ps1'),
  [string]$ArtifactRoot = 'C:\grookai_vault_operator_artifacts\tcgplayer_market_continuity_dispatch_watchdog_v1'
)

$ErrorActionPreference = 'Stop'
$resolvedWorker = (Resolve-Path -LiteralPath $WorkerScript).Path
$pwsh = (Get-Command pwsh.exe -ErrorAction Stop).Source
$arguments = @(
  '-NoProfile',
  '-NonInteractive',
  '-WindowStyle', 'Hidden',
  '-ExecutionPolicy', 'Bypass',
  '-File', ('"{0}"' -f $resolvedWorker),
  '-Workflow', 'tcgplayer-market-continuity-watchdog.yml',
  '-MaxAgeMinutes', '135',
  '-ActiveMaxAgeMinutes', '360',
  '-FailureRetryDelayMinutes', '10',
  '-ArtifactRoot', ('"{0}"' -f $ArtifactRoot),
  '-ReceiptSchemaVersion', 'TCGPLAYER_MARKET_CONTINUITY_DISPATCH_WATCHDOG_V1',
  '-MutexName', 'Local\GrookaiTcgplayerMarketContinuityDispatchWatchdogV1'
) -join ' '

$action = New-ScheduledTaskAction -Execute $pwsh -Argument $arguments
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes 5)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME `
  -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force | Out-Null

Get-ScheduledTask -TaskName $TaskName | Select-Object TaskName, State, Actions, Triggers
