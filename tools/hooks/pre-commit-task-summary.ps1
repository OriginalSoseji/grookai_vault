param(
  [switch]$VerboseOutput
)

$ErrorActionPreference = 'SilentlyContinue'

function Have($name){ (Get-Command $name -ErrorAction SilentlyContinue) -ne $null }

function Get-StagedFiles {
  $out = git diff --cached --name-only 2>$null | Where-Object { $_ -and (Test-Path $_) }
  if (-not $out) { return @() }
  # Filter out bulky dirs
  $out | Where-Object { $_ -notmatch "(^|/|\\)(build|.dart_tool|node_modules|.git)(/|\\)" }
}

Write-Host "[pre-commit] Scanning tasks in staged files..."

if (-not (Have rg)) {
  Write-Host "[pre-commit] ripgrep (rg) not found; skipping task summary." -ForegroundColor Yellow
  exit 0
}

$files = Get-StagedFiles
if ($files.Count -eq 0) {
  Write-Host "[pre-commit] No staged files; skipping." -ForegroundColor DarkGray
  exit 0
}

$pattern = '(?i)\b(TODO|FIXME|HACK|TASK|NOTE)\b'

try {
  Write-Host "[pre-commit] Task markers found (staged):" -ForegroundColor Cyan
  rg -n -S $pattern -- $files
} catch {
  # Non-blocking
}

Write-Host "[pre-commit] Tip: run tools/list_tasks.ps1 to scan the whole repo." -ForegroundColor DarkGray
exit 0

