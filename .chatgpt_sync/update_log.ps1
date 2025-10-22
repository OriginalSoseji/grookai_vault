param(
  [switch]$VerboseLog
)
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$logPath = ".chatgpt_sync\CHANGELOG.md"

function Write-Section($title) {
  Add-Content $logPath "`n### $title"
}

function Log-Lines($header, $lines) {
  if ($lines -and $lines.Count -gt 0) {
    Add-Content $logPath "`n$header"
    foreach ($l in $lines) { Add-Content $logPath ("- " + $l) }
  }
}

$changedFiles = @()

# Prefer git if available
$git = Get-Command git -ErrorAction SilentlyContinue
if ($git) {
  # Try diff vs HEAD
  $diff = & git diff --name-status HEAD 2>$null
  if ($LASTEXITCODE -eq 0 -and $diff) {
    $changedFiles = $diff | ForEach-Object { $_ }
  } else {
    # Maybe first commit or detached; list modified/untracked files
    $ls = & git ls-files -m -o --exclude-standard 2>$null
    if ($ls) {
      $changedFiles = $ls | ForEach-Object { "M`t$_" }
    }
  }
}

# If no git or nothing from git, fall back to simple hash scan (lib/ only)
if (-not $changedFiles -or $changedFiles.Count -eq 0) {
  $libFiles = Get-ChildItem -Recurse -File .\lib -ErrorAction SilentlyContinue
  if ($libFiles) {
    $changedFiles = $libFiles | Select-Object -First 50 | ForEach-Object { "?" + "`t" + $_.FullName.Substring((Get-Location).Path.Length+1) }
  }
}

if (-not $changedFiles -or $changedFiles.Count -eq 0) {
  if ($VerboseLog) { Write-Host "No file changes detected." }
  return
}

Write-Section "$timestamp"
Log-Lines "Changes:", $changedFiles
