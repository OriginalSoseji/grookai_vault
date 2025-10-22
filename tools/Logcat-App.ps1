param(
    [Parameter(Mandatory = $true)]
    [string]$Package,
    [int]$RetrySeconds = 2,
    [switch]$Clear
)

$ErrorActionPreference = 'Stop'

function Require-Tool($name) {
    try { Get-Command $name -ErrorAction Stop | Out-Null }
    catch { throw "Required tool '$name' not found on PATH." }
}

Require-Tool adb

if ($Clear) {
    try { adb logcat -c | Out-Null } catch { Write-Warning "Failed to clear logcat buffer: $($_.Exception.Message)" }
}

Write-Host "[Logcat-App] Following logs for package: $Package"

while ($true) {
    try {
        $pid = (& adb shell pidof $Package).Trim()
    } catch {
        Write-Warning "[Logcat-App] 'adb shell pidof' failed: $($_.Exception.Message)"; Start-Sleep -Seconds $RetrySeconds; continue
    }

    if (-not $pid) {
        Write-Host "[Logcat-App] Waiting for app process... ($Package)"; Start-Sleep -Seconds $RetrySeconds; continue
    }

    Write-Host "[Logcat-App] Attached to PID $pid"

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "adb"
    $psi.Arguments = "logcat --pid $pid -v time"
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi
    $null = $proc.Start()

    # Stream output until process exits or is killed
    while (-not $proc.HasExited) {
        if (-not $proc.StandardOutput.EndOfStream) { $line = $proc.StandardOutput.ReadLine(); Write-Output $line }
        if (-not $proc.StandardError.EndOfStream) { $err = $proc.StandardError.ReadLine(); if ($err) { Write-Output $err } }
        Start-Sleep -Milliseconds 50
    }

    Write-Host "[Logcat-App] adb logcat ended; will reattach if app restarts."
    Start-Sleep -Seconds $RetrySeconds
}

