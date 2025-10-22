param()
$ErrorActionPreference = 'Stop'

Write-Host "[Stop-Flutter] Attempting to stop 'flutter run'..."

try {
    $procs = Get-CimInstance Win32_Process | Where-Object {
        ($_.CommandLine -match 'flutter(\.bat)?\s+run') -or ($_.CommandLine -match 'dart(\.exe)?\s+.*flutter_tool')
    }

    if (-not $procs) {
        Write-Host "[Stop-Flutter] No running 'flutter run' found."
        exit 0
    }

    foreach ($p in $procs) {
        try {
            Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
            Write-Host "[Stop-Flutter] Stopped PID $($p.ProcessId)."
        } catch {
            Write-Warning "[Stop-Flutter] Failed to stop PID $($p.ProcessId): $($_.Exception.Message)"
        }
    }
} catch {
    Write-Warning "[Stop-Flutter] Error while enumerating processes: $($_.Exception.Message)"
}

