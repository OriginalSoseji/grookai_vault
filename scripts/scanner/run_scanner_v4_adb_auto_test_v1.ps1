param(
  [switch]$Help,
  [string]$AppId = "",
  [string]$Activity = ".MainActivity",
  [int]$TimeoutSeconds = 120,
  [switch]$SkipInstall,
  [ValidateSet("Auto", "Intent", "Taps")]
  [string]$AutomationMode = "Auto",
  [int]$FlutterReadyTimeoutSeconds = 20,
  [int]$AutoStartGraceSeconds = 12,
  [int]$TapDelayMilliseconds = 1200,
  [int]$TapScannerTabX = 540,
  [int]$TapScannerTabY = 2200,
  [int]$TapDiagnosticsExpandX = 980,
  [int]$TapDiagnosticsExpandY = 420,
  [int]$TapAutoTestStartX = 820,
  [int]$TapAutoTestStartY = 1280,
  [switch]$ForceStopBeforeLaunch,
  [switch]$NoScreenshots
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Show-Help {
  @"
SCANNER V4 ADB AUTO TEST V1

Runs the debug-only Scanner V4 real-device auto test through ADB.

Usage:
  powershell -ExecutionPolicy Bypass -File scripts/scanner/run_scanner_v4_adb_auto_test_v1.ps1

Options:
  -AppId <id>                    Android application id. Defaults to android/app/build.gradle.kts applicationId.
  -Activity <name>               Android activity. Defaults to .MainActivity.
  -TimeoutSeconds <n>            Wait timeout for auto-test completion. Defaults to 120.
  -SkipInstall                   Skip flutter build/install and only launch the installed app.
  -AutomationMode Auto|Intent|Taps
                                  Auto uses the debug intent first, then scripted taps if startup is not observed.
                                  Intent uses only the debug intent hook.
                                  Taps launches normally and uses adb shell input tap coordinates.
  -TapScannerTabX/Y <n>          Tap point for scanner navigation.
  -TapDiagnosticsExpandX/Y <n>   Tap point for diagnostics expansion.
  -TapAutoTestStartX/Y <n>       Tap point for Scanner V4 Auto Test Start.
  -ForceStopBeforeLaunch         Force-stop the app before launch. Use only if the app reaches scanner after cold start.
  -NoScreenshots                 Disable automatic screenshots during capture windows and failures.
  -Help                          Print this help.

Output:
  .tmp/scanner_v4_real_device_reports/scanner_v4_real_device_auto_test_report_v1.json

No app taps are required from the operator. Physical scene positioning is still required when prompted.
"@
}

if ($Help) {
  Show-Help
  exit 0
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$OutputDir = Join-Path $RepoRoot ".tmp\scanner_v4_real_device_reports"
$ScreenshotDir = Join-Path $OutputDir "screenshots"
$LocalReportPath = Join-Path $OutputDir "scanner_v4_real_device_auto_test_report_v1.json"
$LogPath = Join-Path $OutputDir "scanner_v4_adb_auto_test_v1.log"
$LogErrPath = Join-Path $OutputDir "scanner_v4_adb_auto_test_v1.err.log"
$ParserPath = Join-Path $RepoRoot "backend\scanner_v4\parse_real_device_auto_test_report_v1.mjs"

# Tap coordinate configuration is intentionally centralized here.
# Recalibrate if the scanner UI layout or device resolution changes:
#   1. Capture a screenshot: adb exec-out screencap -p > scanner_screen.png
#   2. Inspect the pixel coordinates for each target in an image viewer.
#   3. Verify a coordinate with: adb shell input tap X Y
#   4. Pass the new values with -TapScannerTabX, -TapScannerTabY, etc.
function Get-TapPoints {
  return [ordered]@{
    ScannerTab = @{
      X = $TapScannerTabX
      Y = $TapScannerTabY
      Description = "scanner navigation"
    }
    DiagnosticsExpand = @{
      X = $TapDiagnosticsExpandX
      Y = $TapDiagnosticsExpandY
      Description = "diagnostics panel expansion"
    }
    AutoTestStart = @{
      X = $TapAutoTestStartX
      Y = $TapAutoTestStartY
      Description = "Scanner V4 Auto Test Start"
    }
  }
}

function Get-DefaultAppId {
  $gradlePath = Join-Path $RepoRoot "android\app\build.gradle.kts"
  if (!(Test-Path $gradlePath)) {
    throw "Cannot find android/app/build.gradle.kts. Pass -AppId explicitly."
  }
  $content = Get-Content $gradlePath -Raw
  if ($content -match 'applicationId\s*=\s*"([^"]+)"') {
    return $Matches[1]
  }
  throw "Cannot derive applicationId from android/app/build.gradle.kts. Pass -AppId explicitly."
}

function Get-SingleAdbDevice {
  param([string]$AdbPath)
  $lines = & $AdbPath devices
  if ($LASTEXITCODE -ne 0) {
    throw "adb devices failed."
  }
  $devices = @()
  foreach ($line in $lines) {
    if ($line -match '^([^\s]+)\s+device$') {
      $devices += $Matches[1]
    }
  }
  if ($devices.Count -ne 1) {
    throw "Expected exactly one connected Android device, found $($devices.Count)."
  }
  return $devices[0]
}

function Get-ScreenResolution {
  param([string]$AdbPath, [string]$Serial)
  $output = (& $AdbPath -s $Serial shell wm size) -join "`n"
  if ($LASTEXITCODE -eq 0 -and $output -match 'Physical size:\s*(\d+)x(\d+)') {
    return @{
      Width = [int]$Matches[1]
      Height = [int]$Matches[2]
      Raw = $output.Trim()
    }
  }
  return @{
    Width = $null
    Height = $null
    Raw = $output.Trim()
  }
}

function Wake-Device {
  param([string]$AdbPath, [string]$Serial)
  Write-Host "Waking device..."
  & $AdbPath -s $Serial shell input keyevent KEYCODE_WAKEUP | Out-Null
  & $AdbPath -s $Serial shell wm dismiss-keyguard | Out-Null
  & $AdbPath -s $Serial shell input keyevent KEYCODE_MENU | Out-Null
  Start-Sleep -Milliseconds 500
}

function Enable-StayAwake {
  param([string]$AdbPath, [string]$Serial)
  $previous = ((& $AdbPath -s $Serial shell settings get global stay_on_while_plugged_in) -join "`n").Trim()
  if ([string]::IsNullOrWhiteSpace($previous)) {
    $previous = "0"
  }
  Write-Host "Keeping device awake while plugged in..."
  & $AdbPath -s $Serial shell settings put global stay_on_while_plugged_in 3 | Out-Null
  & $AdbPath -s $Serial shell svc power stayon true | Out-Null
  return $previous
}

function Restore-StayAwake {
  param([string]$AdbPath, [string]$Serial, [string]$PreviousValue)
  if ([string]::IsNullOrWhiteSpace($PreviousValue)) { return }
  try {
    Write-Host "Restoring device stay-awake setting..."
    & $AdbPath -s $Serial shell settings put global stay_on_while_plugged_in $PreviousValue | Out-Null
  } catch {
    Write-Host "WARN: could not restore stay-awake setting. $($_.Exception.Message)"
  }
}

function Install-DebugApk {
  param([string]$AdbPath, [string]$Serial)
  Write-Host "Building debug APK..."
  Push-Location $RepoRoot
  try {
    & flutter build apk --debug
    if ($LASTEXITCODE -ne 0) {
      throw "flutter build apk --debug failed."
    }
  } finally {
    Pop-Location
  }
  $apkPath = Join-Path $RepoRoot "build\app\outputs\flutter-apk\app-debug.apk"
  if (!(Test-Path $apkPath)) {
    throw "Debug APK not found at $apkPath"
  }
  Write-Host "Installing debug APK..."
  & $AdbPath -s $Serial install -r $apkPath | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "adb install failed."
  }
}

function Start-LogcatCapture {
  param([string]$AdbPath, [string]$Serial)
  if (Test-Path $LogPath) { Remove-Item -LiteralPath $LogPath -Force }
  if (Test-Path $LogErrPath) { Remove-Item -LiteralPath $LogErrPath -Force }
  & $AdbPath -s $Serial logcat -c
  return Start-Process `
    -FilePath $AdbPath `
    -ArgumentList @("-s", $Serial, "logcat", "-v", "time") `
    -RedirectStandardOutput $LogPath `
    -RedirectStandardError $LogErrPath `
    -WindowStyle Hidden `
    -PassThru
}

function Stop-LogcatCapture {
  param($Process)
  if ($null -ne $Process -and !$Process.HasExited) {
    $Process.Kill()
    $Process.WaitForExit()
  }
}

function Read-LogText {
  if (!(Test-Path $LogPath)) { return "" }
  try {
    return Get-Content $LogPath -Raw
  } catch {
    return ""
  }
}

function Strip-LogPayload {
  param([string]$Line)
  $idx = $Line.IndexOf("): ")
  if ($idx -ge 0) {
    return $Line.Substring($idx + 3)
  }
  if ($Line -match '^[0-9-]+\s+[0-9:.]+\s+\S+\s+\S+\s+\S+\s+[^:]+:\s?(.*)$') {
    return $Matches[1]
  }
  return $Line
}

function Write-Utf8NoBom {
  param([string]$Path, [string]$Content)
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Show-NewScannerLogLines {
  param([string]$LogText, [ref]$ProcessedLineCount)
  if ([string]::IsNullOrWhiteSpace($LogText)) { return }
  $lines = $LogText -split "`r?`n"
  for ($i = $ProcessedLineCount.Value; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line.Contains("[scanner_v4_auto_test]")) {
      Write-Host (Strip-LogPayload $line)
    }
  }
  $ProcessedLineCount.Value = $lines.Count
}

function Wait-ForFlutterReady {
  param([int]$Timeout)
  $startedAt = Get-Date
  while (((Get-Date) - $startedAt).TotalSeconds -lt $Timeout) {
    $logText = Read-LogText
    if ($logText -match '(?i)(FlutterActivity|FlutterJNI|I/flutter|D/Flutter|adb_action_opening_scanner|\[scanner_v4_auto_test\])') {
      return $true
    }
    Start-Sleep -Milliseconds 250
  }
  return $false
}

function Test-AutoTestStarted {
  param([string]$LogText)
  return $LogText.Contains("[scanner_v4_auto_test] phase=") -or
    $LogText.Contains("[scanner_v4_auto_test] adb_action_starting_auto_test")
}

function Test-AppCrash {
  param([string]$LogText)
  return $LogText -match '(?i)(FATAL EXCEPTION|AndroidRuntime.*FATAL|Force finishing activity)'
}

function Invoke-AdbTap {
  param(
    [string]$AdbPath,
    [string]$Serial,
    [int]$X,
    [int]$Y,
    [string]$Description
  )
  Write-Host "ADB tap: $Description at $X,$Y"
  & $AdbPath -s $Serial shell input tap $X $Y | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "adb shell input tap failed for $Description at $X,$Y."
  }
}

function Invoke-UiAutomationSequence {
  param([string]$AdbPath, [string]$Serial)
  $tapPoints = Get-TapPoints
  Write-Host "Running ADB UI automation tap sequence..."
  Invoke-AdbTap $AdbPath $Serial $tapPoints.ScannerTab.X $tapPoints.ScannerTab.Y $tapPoints.ScannerTab.Description
  Start-Sleep -Milliseconds $TapDelayMilliseconds
  Invoke-AdbTap $AdbPath $Serial $tapPoints.DiagnosticsExpand.X $tapPoints.DiagnosticsExpand.Y $tapPoints.DiagnosticsExpand.Description
  Start-Sleep -Milliseconds $TapDelayMilliseconds
  Invoke-AdbTap $AdbPath $Serial $tapPoints.AutoTestStart.X $tapPoints.AutoTestStart.Y $tapPoints.AutoTestStart.Description
  Start-Sleep -Milliseconds $TapDelayMilliseconds
}

function Start-App {
  param(
    [string]$AdbPath,
    [string]$Serial,
    [string]$Component,
    [bool]$UseDebugAction
  )
  $args = @("-s", $Serial, "shell", "am", "start", "-n", $Component)
  if ($UseDebugAction) {
    $args += @("--es", "gv_debug_action", "scanner_v4_auto_test")
  }
  & $AdbPath @args | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "adb am start failed."
  }
}

function Save-Screenshot {
  param(
    [string]$AdbPath,
    [string]$Serial,
    [string]$Name
  )
  if ($NoScreenshots) { return }
  New-Item -ItemType Directory -Force -Path $ScreenshotDir | Out-Null
  $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $safeName = $Name -replace '[^A-Za-z0-9_.-]', '_'
  $path = Join-Path $ScreenshotDir "$timestamp`_$safeName.png"
  try {
    $process = Start-Process `
      -FilePath $AdbPath `
      -ArgumentList @("-s", $Serial, "exec-out", "screencap", "-p") `
      -RedirectStandardOutput $path `
      -WindowStyle Hidden `
      -Wait `
      -PassThru
    if ($process.ExitCode -eq 0 -and (Test-Path $path) -and ((Get-Item $path).Length -gt 0)) {
      Write-Host "Screenshot: $path"
    } else {
      Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
      Write-Host "WARN: screenshot capture failed for $Name."
    }
  } catch {
    Write-Host "WARN: screenshot capture failed for $Name. $($_.Exception.Message)"
  }
}

function Show-PhasePrompt {
  param([string]$Phase)
  switch ($Phase) {
    "empty_desk" {
      Write-Host ""
      Write-Host "==== PHASE 1/3 - EMPTY DESK ===="
      Write-Host "Point phone at empty desk/background."
    }
    "partial_edge" {
      Write-Host ""
      Write-Host "==== PHASE 2/3 - PARTIAL EDGE ===="
      Write-Host "Point phone at desk seam / wood grain / partial rectangle."
    }
    "real_card" {
      Write-Host ""
      Write-Host "==== PHASE 3/3 - REAL CARD ===="
      Write-Host "Place one real card clearly in frame."
    }
  }
}

function Get-ReportPathFromLog {
  param([string]$LogText)
  $matches = [regex]::Matches($LogText, 'report=(\S+)')
  if ($matches.Count -eq 0) { return $null }
  return $matches[$matches.Count - 1].Groups[1].Value.Trim()
}

function Try-SaveDeviceReport {
  param([string]$AdbPath, [string]$Serial, [string]$DevicePath)
  if ([string]::IsNullOrWhiteSpace($DevicePath) -or
      $DevicePath -eq "console" -or
      $DevicePath -eq "unavailable") {
    return $false
  }

  if (Test-Path $LocalReportPath) {
    Remove-Item -LiteralPath $LocalReportPath -Force
  }

  & $AdbPath -s $Serial pull $DevicePath $LocalReportPath | Out-Null
  if ($LASTEXITCODE -eq 0 -and (Test-Path $LocalReportPath) -and ((Get-Item $LocalReportPath).Length -gt 0)) {
    return $true
  }

  if (Test-Path $LocalReportPath) {
    Remove-Item -LiteralPath $LocalReportPath -Force
  }

  $content = & $AdbPath -s $Serial exec-out run-as $AppId cat $DevicePath 2>$null
  if ($LASTEXITCODE -eq 0 -and $null -ne $content -and $content.Count -gt 0) {
    Write-Utf8NoBom $LocalReportPath (($content -join "`n").Trim())
    try {
      Get-Content $LocalReportPath -Raw | ConvertFrom-Json | Out-Null
      return $true
    } catch {
      Remove-Item -LiteralPath $LocalReportPath -Force -ErrorAction SilentlyContinue
    }
  }

  return $false
}

function Try-SaveConsoleFallbackReport {
  param([string]$LogText)
  $lines = $LogText -split "`r?`n"
  $capturing = $false
  $payload = New-Object System.Collections.Generic.List[string]
  foreach ($line in $lines) {
    if ($line.Contains("[scanner_v4_auto_test] report_json_begin")) {
      $capturing = $true
      $payload.Clear()
      continue
    }
    if ($line.Contains("[scanner_v4_auto_test] report_json_end")) {
      $capturing = $false
      break
    }
    if ($capturing) {
      $payload.Add((Strip-LogPayload $line))
    }
  }
  if ($payload.Count -eq 0) { return $false }
  $json = ($payload -join "`n").Trim()
  Write-Utf8NoBom $LocalReportPath $json
  try {
    Get-Content $LocalReportPath -Raw | ConvertFrom-Json | Out-Null
    return $true
  } catch {
    Remove-Item -LiteralPath $LocalReportPath -Force -ErrorAction SilentlyContinue
    return $false
  }
}

function Invoke-ReportParser {
  if (!(Test-Path $ParserPath)) {
    throw "Report parser not found: $ParserPath"
  }
  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($null -eq $node) {
    throw "node is required to parse report summary."
  }
  $parserOutput = & node $ParserPath $LocalReportPath 2>&1
  $parserExitCode = $LASTEXITCODE
  foreach ($line in $parserOutput) {
    Write-Host $line
  }
  return $parserExitCode
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

if ([string]::IsNullOrWhiteSpace($AppId)) {
  $AppId = Get-DefaultAppId
}

$adbCommand = Get-Command adb -ErrorAction SilentlyContinue
if ($null -eq $adbCommand) {
  throw "adb is not available on PATH."
}
$Adb = $adbCommand.Source
$Serial = Get-SingleAdbDevice $Adb
$Component = "$AppId/$Activity"
$tapPointsForPrint = Get-TapPoints
$screen = Get-ScreenResolution $Adb $Serial

Write-Host "ADB device: $Serial"
Write-Host "AppId: $AppId"
Write-Host "Activity: $Activity"
Write-Host "AutomationMode: $AutomationMode"
Write-Host "Screen resolution: $($screen.Raw)"
Write-Host "Tap ScannerTab: $($tapPointsForPrint.ScannerTab.X),$($tapPointsForPrint.ScannerTab.Y)"
Write-Host "Tap DiagnosticsExpand: $($tapPointsForPrint.DiagnosticsExpand.X),$($tapPointsForPrint.DiagnosticsExpand.Y)"
Write-Host "Tap AutoTestStart: $($tapPointsForPrint.AutoTestStart.X),$($tapPointsForPrint.AutoTestStart.Y)"

Wake-Device $Adb $Serial

$logcatProcess = $null
$previousStayAwakeSetting = $null
try {
  $previousStayAwakeSetting = Enable-StayAwake $Adb $Serial
  if (!$SkipInstall) {
    Install-DebugApk $Adb $Serial
  }
  $logcatProcess = Start-LogcatCapture $Adb $Serial
  $useDebugAction = $AutomationMode -ne "Taps"
  if ($ForceStopBeforeLaunch) {
    Write-Host "Stopping any existing app process..."
    & $Adb -s $Serial shell am force-stop $AppId | Out-Null
  }
  Write-Host "Launching app..."
  Start-App $Adb $Serial $Component $useDebugAction

  $flutterReady = Wait-ForFlutterReady $FlutterReadyTimeoutSeconds
  if ($flutterReady) {
    Write-Host "Flutter ready state observed."
  } else {
    Write-Host "WARN: Flutter ready log was not observed within $FlutterReadyTimeoutSeconds seconds; continuing automation."
  }

  if ($AutomationMode -eq "Taps") {
    Invoke-UiAutomationSequence $Adb $Serial
  } elseif ($AutomationMode -eq "Auto") {
    $graceStartedAt = Get-Date
    $intentStarted = $false
    while (((Get-Date) - $graceStartedAt).TotalSeconds -lt $AutoStartGraceSeconds) {
      Start-Sleep -Milliseconds 500
      if (Test-AutoTestStarted (Read-LogText)) {
        $intentStarted = $true
        break
      }
    }
    if (!$intentStarted) {
      Write-Host "Debug intent auto-start was not observed; running ADB UI tap fallback."
      Invoke-UiAutomationSequence $Adb $Serial
    }
  }

  $startedAt = Get-Date
  $prompted = @{
    empty_desk = $false
    partial_edge = $false
    real_card = $false
  }
  $captureScreenshotTaken = @{
    empty_desk = $false
    partial_edge = $false
    real_card = $false
  }
  $fallbackOffsets = @{
    empty_desk = 0
    partial_edge = 15
    real_card = 30
  }
  $complete = $false
  $processedLogLineCount = 0

  while (((Get-Date) - $startedAt).TotalSeconds -lt $TimeoutSeconds) {
    Start-Sleep -Milliseconds 500
    $logText = Read-LogText
    Show-NewScannerLogLines $logText ([ref]$processedLogLineCount)

    if (Test-AppCrash $logText) {
      Save-Screenshot $Adb $Serial "failure_app_crash"
      Write-Error "FAILED: App crash detected in logcat. ACTION: inspect $LogPath before rerunning."
      exit 1
    }

    foreach ($phase in @("empty_desk", "partial_edge", "real_card")) {
      if (!$prompted[$phase] -and
          ($logText.Contains("[scanner_v4_auto_test] phase=$phase countdown") -or
           ((Get-Date) - $startedAt).TotalSeconds -ge $fallbackOffsets[$phase])) {
        Show-PhasePrompt $phase
        $prompted[$phase] = $true
      }
      if (!$captureScreenshotTaken[$phase] -and
          $logText.Contains("[scanner_v4_auto_test] phase=$phase capture")) {
        Start-Sleep -Seconds 5
        Save-Screenshot $Adb $Serial "phase_${phase}_capture_mid"
        $captureScreenshotTaken[$phase] = $true
      }
    }

    if ($logText.Contains("[scanner_v4_auto_test] complete")) {
      $complete = $true
      break
    }
  }

  $finalLogText = Read-LogText
  Show-NewScannerLogLines $finalLogText ([ref]$processedLogLineCount)

  if (!$complete) {
    Save-Screenshot $Adb $Serial "failure_timeout"
    if (!(Test-AutoTestStarted $finalLogText)) {
      Write-Error "FAILED: Scanner V4 auto test did not start within $TimeoutSeconds seconds. ACTION: recalibrate tap coordinates or verify the debug intent hook. Log: $LogPath"
    } else {
      Write-Error "FAILED: Scanner V4 auto test started but did not complete within $TimeoutSeconds seconds. ACTION: check app crash, camera permission, and $LogPath."
    }
    exit 1
  }

  $deviceReportPath = Get-ReportPathFromLog $finalLogText
  $saved = Try-SaveDeviceReport $Adb $Serial $deviceReportPath
  if (!$saved) {
    $saved = Try-SaveConsoleFallbackReport $finalLogText
  }
  if (!$saved) {
    Save-Screenshot $Adb $Serial "failure_report_extract"
    Write-Error "FAILED: Could not pull or extract scanner V4 auto-test report. ACTION: inspect report=<path> in $LogPath or console JSON fallback markers."
    exit 1
  }

  Write-Host "Local report: $LocalReportPath"
  $parserExit = Invoke-ReportParser
  if ($parserExit -ne 0) {
    Save-Screenshot $Adb $Serial "failure_report_status"
    Write-Host "FAILED: Report parser returned non-zero. ACTION: inspect $LocalReportPath and screenshots under $ScreenshotDir."
  }
  exit $parserExit
} finally {
  Stop-LogcatCapture $logcatProcess
  Restore-StayAwake $Adb $Serial $previousStayAwakeSetting
}
