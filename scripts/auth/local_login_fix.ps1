param(
  [Parameter()][string]$DeviceId = 'R5CY71V9ETR',
  [Parameter()][string]$Email = 'tester@grookai.local',
  [Parameter()][string]$Password = 'Test1234!'
)

$ErrorActionPreference = 'Stop'

function Ok([bool]$b){ if ($b){ return "[OK]" } else { return "[! ]" } }

Write-Host "== 1) Supabase status ==" -ForegroundColor Cyan
# Capture both stdout and stderr to avoid NativeCommandError on stderr output
# Use cmd to avoid PowerShell treating stderr as terminating errors
$status = & cmd /c "supabase status 2>&1"
if (-not $status) { throw "Supabase CLI not available or project not initialized" }
$apiUrl = ($status | Select-String -Pattern 'API URL:\s*(\S+)' -AllMatches).Matches.Groups[1].Value | Select-Object -First 1
$pubKey = ($status | Select-String -Pattern 'Publishable key:\s*(\S+)' -AllMatches).Matches.Groups[1].Value | Select-Object -First 1
if (-not $apiUrl) {
  Write-Host "Supabase not running. Starting..." -ForegroundColor Yellow
  & cmd /c "supabase start >nul 2>&1"
  $status = & cmd /c "supabase status 2>&1"
  $apiUrl = ($status | Select-String -Pattern 'API URL:\s*(\S+)' -AllMatches).Matches.Groups[1].Value | Select-Object -First 1
  $pubKey = ($status | Select-String -Pattern 'Publishable key:\s*(\S+)' -AllMatches).Matches.Groups[1].Value | Select-Object -First 1
}
if ($apiUrl) {
  $mark = if ($apiUrl -eq 'http://127.0.0.1:54321') { '[OK]' } else { '[! ]' }
  Write-Host "API URL: $apiUrl $mark"
}

Write-Host "== 2) Ensure .env.local ==" -ForegroundColor Cyan
$envLocal = '.env.local'
if (!(Test-Path $envLocal)) { '' | Set-Content $envLocal }
$lines = Get-Content $envLocal -Raw
function Upsert-Line([string]$key, [string]$val){
  if ($lines -match "(?m)^$key="){
    $script:lines = [regex]::Replace($lines, "(?m)^$key=.*$", "$key=$val")
  } else {
    $script:lines = ($lines.TrimEnd() + "`n$key=$val`n")
  }
}
if ($apiUrl){ Upsert-Line 'SUPABASE_URL' $apiUrl }
if ($pubKey){ Upsert-Line 'SUPABASE_ANON_KEY' $pubKey }
$lines | Set-Content $envLocal
Write-Host ".env.local updated with local URL + publishable key" -ForegroundColor Green

Write-Host "== 3) Android cleartext (debug) ==" -ForegroundColor Cyan
$debugMan = 'android/app/src/debug/AndroidManifest.xml'
if (Test-Path $debugMan){ Write-Host "Debug manifest present: $debugMan" -ForegroundColor Green } else { Write-Host "Missing debug manifest; add usesCleartextTraffic manually" -ForegroundColor Yellow }

Write-Host "== 4) ADB reverse ==" -ForegroundColor Cyan
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
if (-not $adb) {
  Write-Host "adb not found. Install Android SDK platform-tools and add to PATH, or set ANDROID_SDK_ROOT. Skipping ADB reverse." -ForegroundColor Yellow
} else {
  & $adb devices | Write-Host
  & $adb -s $DeviceId reverse tcp:54321 tcp:54321 | Out-Null
  & $adb -s $DeviceId reverse tcp:54324 tcp:54324 | Out-Null
  $rev = & $adb -s $DeviceId reverse --list 2>$null
  Write-Host $rev
  $m1 = if ($rev -match 'tcp:54321') { '[OK]' } else { '[! ]' }
  $m2 = if ($rev -match 'tcp:54324') { '[OK]' } else { '[! ]' }
  Write-Host "Ports reversed: 54321 $m1, 54324 $m2"
}

Write-Host "== 5) Create local test user ==" -ForegroundColor Cyan
try {
  $headers = @{ apikey=$pubKey; 'Content-Type'='application/json' }
  $body = @{ email=$Email; password=$Password; data=@{ env='local' } } | ConvertTo-Json -Depth 4
  $r = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" -Headers $headers -Body $body -TimeoutSec 20
  $uid = $null
  if ($r -and $r.user) { $uid = $r.user.id }
  if ($uid) { Write-Host "Signup request accepted (user id: $uid)" -ForegroundColor Green } else { Write-Host "Signup response received (check Mailpit to confirm)" -ForegroundColor Yellow }
} catch {
  Write-Host "Signup error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "== Done. Next ==" -ForegroundColor Cyan
Write-Host "- Run: flutter run -d $DeviceId --dart-define=GV_ENV=local" -ForegroundColor Gray
Write-Host "- Login with: $Email / $Password" -ForegroundColor Gray
