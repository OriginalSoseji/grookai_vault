param(
  [string]$KBPath = "C:\grookai_vault\.vscode\keybindings.json"
)

$ErrorActionPreference = 'Continue'

$dir = Split-Path -Parent $KBPath
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

# Load existing keybindings (array) or initialize as empty array
$kb = @()
if (Test-Path $KBPath) {
  try {
    $raw = Get-Content $KBPath -Raw
    if ($raw.Trim().Length -gt 0) {
      $parsed = $raw | ConvertFrom-Json -ErrorAction SilentlyContinue
      if ($parsed -is [System.Array]) { $kb = @($parsed) }
      elseif ($parsed) { $kb = @($parsed) } else { $kb = @() }
    }
  } catch { $kb = @() }
}

$bindingsToEnsure = @(
  @{ key="ctrl+alt+l";        command="workbench.action.tasks.runTask"; args="Grookai: Check Lazy DB";            when="editorTextFocus" },
  @{ key="ctrl+alt+shift+l";  command="workbench.action.tasks.runTask"; args="Grookai: Lazy — Audit + Scan"; when="editorTextFocus" }
)

foreach ($b in $bindingsToEnsure) {
  $found = $false
  foreach ($item in $kb) { if ($item.command -eq $b.command -and $item.args -eq $b.args) { $found = $true; break } }
  if (-not $found) {
    $kb = @($kb) + (New-Object psobject -Property $b)
  }
}

($kb | ConvertTo-Json -Depth 5) | Set-Content -Path $KBPath -Encoding UTF8
Write-Host "Updated keybindings at: $KBPath"
