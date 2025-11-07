param(
  [int[]]$Ports = @(54321, 54324) # Kong(API) and Mailpit
)

function Resolve-Adb {
  $cmd = Get-Command adb -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @()
  if ($env:ANDROID_SDK_ROOT) { $candidates += (Join-Path $env:ANDROID_SDK_ROOT "platform-tools\adb.exe") }
  if ($env:ANDROID_HOME) { $candidates += (Join-Path $env:ANDROID_HOME "platform-tools\adb.exe") }
  $candidates += (Join-Path "$env:LOCALAPPDATA\Android\Sdk" "platform-tools\adb.exe")
  $candidates += 'C:\Android\platform-tools\adb.exe'
  foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
  Write-Error "ADB not found. Install Android Platform Tools or set ANDROID_SDK_ROOT/ANDROID_HOME."
  exit 1
}

function Get-AdbDevices($adbPath) {
  $out = & $adbPath devices | Select-Object -Skip 1 | Where-Object { $_ -and $_ -notmatch "^\*" }
  $list = @()
  foreach ($line in $out) {
    $t = "$line".Trim()
    if ($t -match "^(\S+)\s+device$") { $list += $Matches[1] }
  }
  return $list
}

$ADB = Resolve-Adb
Write-Host "ADB_REVERSE: Using ADB at $ADB"
$devices = Get-AdbDevices -adbPath $ADB
if (-not $devices -or $devices.Count -eq 0) { Write-Error "No Android devices connected (adb devices)."; exit 1 }

Write-Host "ADB_REVERSE: Devices detected: $($devices -join ', ')"
foreach ($dev in $devices) {
  foreach ($p in $Ports) {
    Write-Host "ADB_REVERSE: $dev -> tcp:$p"
    & $ADB -s $dev reverse tcp:$p tcp:$p | Out-Null
  }
}

Write-Host "ADB_REVERSE: Done. Test API at http://127.0.0.1:54321 from the device."
