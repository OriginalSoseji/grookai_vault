# DEV-ONLY helper: run pricing diagnostics SQL and capture output
param(
  [string]$OutDir = "build/diagnostics",
  [string]$SqlPath = "supabase/tests/pricing_diagnose.sql"
)

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$dbOut = Join-Path $OutDir "pricing_db.txt"

function Write-Note($msg) { "[NOTE] $msg" | Tee-Object -FilePath $dbOut -Append }

Remove-Item -Force -ErrorAction SilentlyContinue $dbOut
New-Item -ItemType File -Path $dbOut | Out-Null

Write-Note "Grookai Vault Pricing Diagnostics"
Write-Note "Timestamp: $(Get-Date -Format o)"
Write-Note "SQL: $SqlPath"

$supabase = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabase) {
  Write-Note "Supabase CLI not found. Skipping DB checks. Install from https://supabase.com/docs/reference/cli/ and login to enable."
  return
}

if (-not (Test-Path $SqlPath)) {
  Write-Note "SQL file not found: $SqlPath"
  return
}

try {
  Write-Note "Running pricing diagnostics SQL..."
  # Expect a default local project; users can override with project flags if needed
  $result = supabase db execute --file $SqlPath 2>&1
  $result | Tee-Object -FilePath $dbOut -Append | Out-Null
  Write-Note "Diagnostics complete. Output saved to $dbOut"
} catch {
  Write-Note "Error running supabase CLI: $($_.Exception.Message)"
}

