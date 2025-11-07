$ErrorActionPreference='Stop'
Set-Location (git rev-parse --show-toplevel)
$taskName = "GV Daily Health Report"
$script = (Resolve-Path "scripts/reports/daily_health_report.ps1").Path
$action = New-ScheduledTaskAction -Execute "pwsh.exe" -Argument "-NoProfile -File `"$script`" -Quiet"
$trigger = New-ScheduledTaskTrigger -Daily -At 8:00am
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Description "Sends Grookai Vault daily CEO health report" -Force
Write-Host "Registered task: $taskName (08:00 daily)"

