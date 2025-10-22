param(
  [string]$TasksPath = "C:\grookai_vault\.vscode\tasks.json"
)

$ErrorActionPreference = 'Continue'

# Ensure parent directory exists
$parent = Split-Path -Parent $TasksPath
if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }

# Load existing or initialize
$obj = $null
if (Test-Path $TasksPath) {
  try { $obj = Get-Content $TasksPath -Raw | ConvertFrom-Json } catch { $obj = $null }
}
if (-not $obj) { $obj = [ordered]@{ version = "2.0.0"; tasks = @() } }

# Ensure version 2.0.0 and tasks array
if (-not $obj.version) { $obj | Add-Member -Name version -MemberType NoteProperty -Value "2.0.0" }
elseif ($obj.version -ne "2.0.0") { $obj.version = "2.0.0" }
if (-not $obj.PSObject.Properties.Match('tasks')) { $obj | Add-Member -Name tasks -MemberType NoteProperty -Value @() }
if ($null -eq $obj.tasks) { $obj.tasks = @() }

# Ensure "Grookai: Check Lazy DB" task
$auditLabel = "Grookai: Check Lazy DB"
$auditTask = [ordered]@{
  label          = $auditLabel
  type           = "shell"
  command        = "powershell"
  args           = @("-NoProfile","-ExecutionPolicy","Bypass","-File","${workspaceFolder}\tools\Audit-LazyState.ps1")
  options        = @{ cwd = "${workspaceFolder}" }
  problemMatcher = @()
  presentation   = @{ reveal = "always"; panel = "dedicated"; clear = $true }
}
$hasAudit = $false
foreach ($t in $obj.tasks) { if ($t.label -eq $auditLabel) { $hasAudit = $true; break } }
if (-not $hasAudit) { $obj.tasks = @($obj.tasks) + (New-Object psobject -Property $auditTask) }

# Ensure "Grookai: Scan Lazy App (init/env)" task
$scanLabel = "Grookai: Scan Lazy App (init/env)"
$scanTask = [ordered]@{
  label          = $scanLabel
  type           = "shell"
  command        = "powershell"
  args           = @("-NoProfile","-ExecutionPolicy","Bypass","-File","${workspaceFolder}\tools\Scan-LazyApp.ps1")
  options        = @{ cwd = "${workspaceFolder}" }
  problemMatcher = @()
  presentation   = @{ reveal = "always"; panel = "dedicated"; clear = $true }
}
$hasScan = $false
foreach ($t in $obj.tasks) { if ($t.label -eq $scanLabel) { $hasScan = $true; break } }
if (-not $hasScan) { $obj.tasks = @($obj.tasks) + (New-Object psobject -Property $scanTask) }

# Ensure compound task "Grookai: Lazy — Audit + Scan"
$compoundLabel = "Grookai: Lazy — Audit + Scan"
$compoundTask = [ordered]@{
  label         = $compoundLabel
  dependsOn     = @($auditLabel, $scanLabel)
  dependsOrder  = "sequence"
}
$hasCompound = $false
foreach ($t in $obj.tasks) { if ($t.label -eq $compoundLabel) { $hasCompound = $true; break } }
if (-not $hasCompound) { $obj.tasks = @($obj.tasks) + (New-Object psobject -Property $compoundTask) }

# Ensure "Supabase: Serve Functions (local)" task
$serveLabel = "Supabase: Serve Functions (local)"
$serveTask = [ordered]@{
  label        = $serveLabel
  type         = "shell"
  command      = "powershell"
  args         = @("-NoProfile","-ExecutionPolicy","Bypass","-Command","supabase functions serve --env-file supabase\\functions\\import-card\\.env --no-verify-jwt")
  options      = @{ cwd = "${workspaceFolder}" }
  presentation = @{ reveal = "always"; panel = "dedicated"; clear = $true }
}
$hasServe = $false
foreach ($t in $obj.tasks) { if ($t.label -eq $serveLabel) { $hasServe = $true; break } }
if (-not $hasServe) { $obj.tasks = @($obj.tasks) + (New-Object psobject -Property $serveTask) }

# Ensure "Supabase: Deploy import-card" task
$deployLabel = "Supabase: Deploy import-card"
$deployTask = [ordered]@{
  label        = $deployLabel
  type         = "shell"
  command      = "powershell"
  args         = @("-NoProfile","-ExecutionPolicy","Bypass","-Command","supabase functions deploy import-card --no-verify-jwt")
  options      = @{ cwd = "${workspaceFolder}" }
  presentation = @{ reveal = "always"; panel = "dedicated"; clear = $true }
}
$hasDeploy = $false
foreach ($t in $obj.tasks) { if ($t.label -eq $deployLabel) { $hasDeploy = $true; break } }
if (-not $hasDeploy) { $obj.tasks = @($obj.tasks) + (New-Object psobject -Property $deployTask) }

# Ensure "Supabase: Invoke import-card (local)" task
$invokeLabel = "Supabase: Invoke import-card (local)"
$invokeTask = [ordered]@{
  label        = $invokeLabel
  type         = "shell"
  command      = "powershell"
  args         = @("-NoProfile","-ExecutionPolicy","Bypass","-File","${workspaceFolder}\tools\Invoke-ImportCard.ps1")
  options      = @{ cwd = "${workspaceFolder}" }
  presentation = @{ reveal = "always"; panel = "dedicated"; clear = $true }
}
$hasInvoke = $false
foreach ($t in $obj.tasks) { if ($t.label -eq $invokeLabel) { $hasInvoke = $true; break } }
if (-not $hasInvoke) { $obj.tasks = @($obj.tasks) + (New-Object psobject -Property $invokeTask) }

# Ensure "Supabase: Set Secrets + Deploy + Invoke (remote)" task
$remoteAllLabel = "Supabase: Set Secrets + Deploy + Invoke (remote)"
$remoteAllTask = [ordered]@{
  label        = $remoteAllLabel
  type         = "shell"
  command      = "powershell"
  args         = @("-NoProfile","-ExecutionPolicy","Bypass","-File","${workspaceFolder}\tools\Deploy-ImportCard.ps1")
  options      = @{ cwd = "${workspaceFolder}" }
  presentation = @{ reveal = "always"; panel = "dedicated"; clear = $true }
}
$hasRemoteAll = $false
foreach ($t in $obj.tasks) { if ($t.label -eq $remoteAllLabel) { $hasRemoteAll = $true; break } }
if (-not $hasRemoteAll) { $obj.tasks = @($obj.tasks) + (New-Object psobject -Property $remoteAllTask) }

# Ensure "Grookai: Lazy E2E Test" task
$e2eLabel = "Grookai: Lazy E2E Test"
$e2eTask = [ordered]@{
  label          = $e2eLabel
  type           = "shell"
  command        = "powershell"
  args           = @("-NoProfile","-ExecutionPolicy","Bypass","-File","${workspaceFolder}\tools\Test-LazyE2E.ps1","-AutoStart","-NoPrompt")
  options        = @{ cwd = "${workspaceFolder}" }
  problemMatcher = @()
  presentation   = @{ reveal = "always"; panel = "dedicated"; clear = $true }
}
$hasE2E = $false
foreach ($t in $obj.tasks) { if ($t.label -eq $e2eLabel) { $hasE2E = $true; break } }
if (-not $hasE2E) { $obj.tasks = @($obj.tasks) + (New-Object psobject -Property $e2eTask) }

# Ensure "Grookai: Lazy - Full Verify" compound task
$fullVerifyLabel = "Grookai: Lazy - Full Verify"
$fullVerifyTask = [ordered]@{
  label        = $fullVerifyLabel
  dependsOn    = @("Supabase: Serve Functions (local)", "Grookai: Lazy E2E Test")
  dependsOrder = "sequence"
  presentation = @{ reveal = "always"; panel = "shared"; clear = $true }
}
$hasFullVerify = $false
foreach ($t in $obj.tasks) { if ($t.label -eq $fullVerifyLabel) { $hasFullVerify = $true; break } }
if (-not $hasFullVerify) { $obj.tasks = @($obj.tasks) + (New-Object psobject -Property $fullVerifyTask) }

# Ensure "Grookai: Deploy & Verify import-card" compound task
$deployVerifyLabel = "Grookai: Deploy & Verify import-card"
$deployVerifyTask = [ordered]@{
  label        = $deployVerifyLabel
  dependsOn    = @("Supabase: Deploy import-card")
  dependsOrder = "sequence"
  options      = @{ cwd = "${workspaceFolder}" }
  presentation = @{ reveal = "always"; panel = "shared"; clear = $true }
}
$hasDeployVerify = $false
foreach ($t in $obj.tasks) { if ($t.label -eq $deployVerifyLabel) { $hasDeployVerify = $true; break } }
if (-not $hasDeployVerify) { $obj.tasks = @($obj.tasks) + (New-Object psobject -Property $deployVerifyTask) }

# Ensure "Grookai: Print Hosted import-card Result" task
$printHostedLabel = "Grookai: Print Hosted import-card Result"
$printHostedTask = [ordered]@{
  label        = $printHostedLabel
  type         = "shell"
  command      = "powershell"
  args         = @(
    "-NoProfile","-ExecutionPolicy","Bypass","-Command",
    "if (Test-Path .\\.reports\\import_card_hosted_endpoint.txt) { Get-Content .\\.reports\\import_card_hosted_endpoint.txt; Write-Host ''; if (Test-Path .\\.reports\\import_card_hosted_test.json) { Get-Content .\\.reports\\import_card_hosted_test.json -TotalCount 50 } } else { Write-Host 'No hosted test file found. Run the deploy/verify prompt first.' }"
  )
  options      = @{ cwd = "${workspaceFolder}" }
  presentation = @{ reveal = "always"; panel = "shared"; clear = $false }
}
$hasPrintHosted = $false
foreach ($t in $obj.tasks) { if ($t.label -eq $printHostedLabel) { $hasPrintHosted = $true; break } }
if (-not $hasPrintHosted) { $obj.tasks = @($obj.tasks) + (New-Object psobject -Property $printHostedTask) }

# Ensure top-level aggregate: "Grookai: import-card - Deploy → Verify"
$aggLabel = "Grookai: import-card - Deploy → Verify"
$aggTask = [ordered]@{
  label        = $aggLabel
  dependsOn    = @("Supabase: Deploy import-card", $printHostedLabel)
  dependsOrder = "sequence"
  presentation = @{ reveal = "always"; panel = "shared"; clear = $true }
}
$hasAgg = $false
foreach ($t in $obj.tasks) { if ($t.label -eq $aggLabel) { $hasAgg = $true; break } }
if (-not $hasAgg) { $obj.tasks = @($obj.tasks) + (New-Object psobject -Property $aggTask) }

# Write back
$json = $obj | ConvertTo-Json -Depth 8
$json | Set-Content -Path $TasksPath -Encoding UTF8

Write-Host "Updated: $TasksPath"
