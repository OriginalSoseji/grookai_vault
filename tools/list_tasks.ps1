param(
  [string]$Path = '.',
  [string]$Filter = '(?i)\b(TODO|FIXME|HACK|TASK|NOTE)\b'
)

Write-Host "Scanning tasks in" (Resolve-Path $Path)

if (-not (Get-Command rg -ErrorAction SilentlyContinue)) {
  Write-Error "ripgrep (rg) not found. Install from https://github.com/BurntSushi/ripgrep/releases";
  exit 1
}

rg -n -S $Filter --glob '!.git' --glob '!build' --glob '!**/node_modules/**' --glob '!**/.dart_tool/**' -- $Path

