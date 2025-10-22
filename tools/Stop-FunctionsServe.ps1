param()
$ErrorActionPreference = 'Stop'

Write-Host "[Stop-FunctionsServe] Attempting to stop 'supabase functions serve'..."

try {
    $procs = Get-CimInstance Win32_Process | Where-Object {
        $_.CommandLine -match 'supabase(\.exe)?\s+functions\s+serve'
    }

    if (-not $procs) {
        Write-Host "[Stop-FunctionsServe] No running 'supabase functions serve' found."
        exit 0
    }

    foreach ($p in $procs) {
        try {
            Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
            Write-Host "[Stop-FunctionsServe] Stopped PID $($p.ProcessId)."
        } catch {
            Write-Warning "[Stop-FunctionsServe] Failed to stop PID $($p.ProcessId): $($_.Exception.Message)"
        }
    }
} catch {
    Write-Warning "[Stop-FunctionsServe] Error while enumerating processes: $($_.Exception.Message)"
}

