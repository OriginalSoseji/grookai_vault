[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'

$latest = Get-ChildItem -Recurse -Path (Join-Path $PSScriptRoot "..\reports") -Directory -Filter 'edge_test_*' |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $latest) { Write-Host "No edge_test reports found."; exit 0 }
$sum = Join-Path $latest.FullName 'SUMMARY.md'
if (-not (Test-Path $sum)) { Write-Host "No SUMMARY.md in $($latest.FullName)"; exit 0 }
$lines = Get-Content $sum -Raw

$stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
$prepend = "`n### Edge Probe ($stamp)`n" + ($lines.Trim()) + "`n"

$exec = Join-Path $PSScriptRoot "..\REPORTS\EXEC_SUMMARY_STAGING.md"
if (-not (Test-Path $exec)) { $exec = Join-Path (Resolve-Path "$PSScriptRoot\..").Path 'EXEC_SUMMARY_STAGING.md' }
if (-not (Test-Path $exec)) { $exec = Join-Path (Resolve-Path "$PSScriptRoot\..").Path 'EXEC_SUMMARY.md' }

if (-not (Test-Path $exec)) { Write-Host "EXEC_SUMMARY not found."; exit 0 }

$old = Get-Content $exec -Raw
($prepend + "`n" + $old) | Set-Content -Path $exec -Encoding utf8

# Optional: create PR if working tree is clean
$status = git status --porcelain
if (-not [string]::IsNullOrWhiteSpace($status)) { Write-Host "Working tree dirty, skipping PR."; exit 0 }
$branch = "probe/auto-append-" + (Get-Date).ToString('yyyyMMdd_HHmm')
git switch -c $branch | Out-Null
git add $exec | Out-Null
git commit -m "chore(probe): append latest PROD edge probe to EXEC_SUMMARY" | Out-Null
try { gh pr create --fill | Out-Null } catch { Write-Host "Created local commit on $branch (gh not available?)" }
Write-Host "Probe appended and PR created (branch $branch)."

