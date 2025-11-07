Param(
  [string[]] $Versions = @(),
  [switch] $DryRun
)

# Grookai Vault — Remote repair helper
# Usage examples:
#   pwsh -File scripts/tools/repair_pull_push.ps1 -Versions 20250916,20251022,20251102
#   pwsh -File scripts/tools/repair_pull_push.ps1 -DryRun

function Exec($cmd) {
  Write-Host ">> $cmd"
  if (-not $DryRun) {
    cmd /c $cmd
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $cmd" }
  }
}

Write-Host "=== Grookai: remote repair → pull → push ==="
if ($Versions.Count -gt 0) {
  $joined = ($Versions -join ' ')
  Exec "supabase migration repair --status reverted $joined"
} else {
  Write-Host "No -Versions provided; skipping repair step."
}

Exec "supabase db pull"
Exec "supabase db push"
Exec "supabase db diff --use-mig-dir supabase/migrations --schema public"

Write-Host "=== Done. If 'db diff' shows 'No changes', you are aligned. ==="

