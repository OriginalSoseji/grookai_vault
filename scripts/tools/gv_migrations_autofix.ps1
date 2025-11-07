Param(
  [string[]] $RevertVersions = @(),
  [string[]] $ApplyVersions = @(),
  [switch] $DryRun
)

# Grookai Vault — Auto-fix helper for migrations
# Typical use:
#   pwsh -File scripts/tools/gv_migrations_autofix.ps1 -RevertVersions 001,002,003,004,20250916 -ApplyVersions 20251104100000,20251104101000

function Exec($cmd) {
  Write-Host ">> $cmd"
  if (-not $DryRun) {
    cmd /c $cmd
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $cmd" }
  }
}

Write-Host "=== Grookai: migrations autofix (repair → pull → push) ==="

if ($RevertVersions.Count -gt 0) {
  $rv = ($RevertVersions -join ' ')
  Exec "supabase migration repair --status reverted $rv"
}
if ($ApplyVersions.Count -gt 0) {
  $av = ($ApplyVersions -join ' ')
  Exec "supabase migration repair --status applied $av"
}

Exec "supabase db pull"
Exec "supabase db push --include-all"

Write-Host "=== Done. If mismatches persist, rerun with correct versions. ==="

