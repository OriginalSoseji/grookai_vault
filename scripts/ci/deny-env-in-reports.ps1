Param()
$ErrorActionPreference = 'Stop'

$root = Resolve-Path .
$reports = Join-Path $root 'reports'
if (-not (Test-Path $reports)) { Write-Host "No reports dir; OK"; exit 0 }

$hits = Get-ChildItem -Path $reports -Recurse -File -Filter '*.env' -ErrorAction SilentlyContinue
if ($hits -and $hits.Count -gt 0) {
  Write-Host "Found forbidden env files under /reports:" -ForegroundColor Red
  foreach ($h in $hits) { Write-Host (" - {0}" -f ($h.FullName.Replace($root,'').TrimStart('\','/'))) }
  Write-Error "Deny: *.env files present under /reports"
  exit 2
}

Write-Host "Leak guard passed: no *.env under /reports" -ForegroundColor Green
exit 0

