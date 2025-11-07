param(
  [Parameter()][string]$DeviceId = 'R5CY71V9ETR'
)

$ErrorActionPreference = 'Stop'

function Check-Reverse($device, $port){
  try { (adb -s $device reverse --list) -match "tcp:$port" } catch { $false }
}

Write-Host "== ADB reverse check ==" -ForegroundColor Cyan
# Resolve adb path
function Resolve-AdbPath {
  $cmd = Get-Command adb -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Path }
  $candidates = @()
  if ($env:ANDROID_SDK_ROOT) { $candidates += (Join-Path $env:ANDROID_SDK_ROOT 'platform-tools/adb.exe') }
  if ($env:ANDROID_HOME) { $candidates += (Join-Path $env:ANDROID_HOME 'platform-tools/adb.exe') }
  $candidates += (Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe')
  foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
  return $null
}

$adb = Resolve-AdbPath
if ($adb) {
  $rev = & $adb -s $DeviceId reverse --list 2>$null
  Write-Host ($rev | Out-String)
  $okApi = ($rev -match 'tcp:54321')
  $okMail = ($rev -match 'tcp:54324')
} else {
  Write-Host 'adb not found. Skipping reverse list check.' -ForegroundColor Yellow
  $okApi = $false; $okMail = $false
}

Write-Host ((if ($okApi) { '✅' } else { '❌' }) + ' Port 54321 reversed (API)')
Write-Host ((if ($okMail) { '✅' } else { '❌' }) + ' Port 54324 reversed (Mailpit)')

Write-Host "== Local Supabase reachability ==" -ForegroundColor Cyan
try {
  $r = Invoke-WebRequest -Method Get -Uri 'http://127.0.0.1:54321/rest/v1/' -TimeoutSec 5
  Write-Host '✅ Local Supabase reachable on host'
} catch {
  Write-Host '❌ Local Supabase not reachable on host (check supabase status / firewall)' -ForegroundColor Yellow
}

Write-Host "== Auth service probe ==" -ForegroundColor Cyan
try {
  $r = Invoke-WebRequest -Method Options -Uri 'http://127.0.0.1:54321/auth/v1/token' -TimeoutSec 5
  Write-Host '✅ Auth service responding'
} catch {
  Write-Host '❌ Auth service not responding (check supabase start)' -ForegroundColor Yellow
}

if (-not $okApi -or -not $okMail) {
  Write-Host "Hint: run 'adb -s $DeviceId reverse tcp:54321 tcp:54321' and 'adb -s $DeviceId reverse tcp:54324 tcp:54324'" -ForegroundColor Gray
}
