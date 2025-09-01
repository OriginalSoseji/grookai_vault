# fix-grookai-vault.ps1
param(
  [string]$ProjectPath = ""
)

$ErrorActionPreference = 'Stop'

function Find-ProjectRoot {
  param([string]$start)
  $d = Resolve-Path $start
  while ($true) {
    if (Test-Path (Join-Path $d "pubspec.yaml")) { return $d }
    $parent = Split-Path $d -Parent
    if ($parent -eq $d) { break }
    $d = $parent
  }
  return $null
}

if ([string]::IsNullOrWhiteSpace($ProjectPath)) {
  # Try current dir and walk upward
  $ProjectPath = Find-ProjectRoot -start (Get-Location)
} else {
  if (-not (Test-Path $ProjectPath)) { throw "ProjectPath not found: $ProjectPath" }
  $ProjectPath = Find-ProjectRoot -start $ProjectPath
}

if (-not $ProjectPath) {
  throw "Could not find a Flutter project (no pubspec.yaml). Provide -ProjectPath 'C:\path\to\project'."
}

Set-Location $ProjectPath
Write-Host "Using project root: $ProjectPath"

# Locate main.dart (common locations)
$mainCandidates = @(
  "lib\main.dart",
  "lib\src\main.dart",
  "lib\app\main.dart"
) | ForEach-Object { Join-Path $ProjectPath $_ }

$file = $mainCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $file) {
  throw "Couldn't find main.dart under lib\. Checked: $($mainCandidates -join ', ')"
}

# Backup
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup   = "$file.bak.$timestamp"
Copy-Item $file $backup -Force
Write-Host "Backup created -> $backup"

# Read
$content = Get-Content $file -Raw

# --------- PATCHES ---------
# 1) Remove stray quote before .order / .eq that turns the chain into a string
$content = $content -replace "''?\.order\(", ".order("
$content = $content -replace "''?\.eq\(",    ".eq("

# 2) Replace unary +1 in function args (e.g., onPressed handlers)
$content = $content -replace "(,\s*)\+1(\s*\))", '$1 1$2'

# 3) Fix a stray semicolon inserted right after .order(...) in the middle of a chain
$content = $content -replace "\.order\((.*?)\);\s*\r?\n(\s*\.)", ".order($1)`r`n$2"

# 4) Optional: catch an obvious `'` that starts *before* a dotted method chain line
#    Example:   '   .order(...)   ->    .order(...)
$content = [regex]::Replace($content, "^\s*'\s*(\.\w+\()", '$1', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Multiline)


# Write back
Set-Content -Path $file -Value $content -Encoding UTF8
Write-Host "Patched: $file"

# Warn if duplicate _VaultPageState exists
$dup = ([regex]::Matches($content, 'class\s+_VaultPageState\b')).Count
if ($dup -gt 1) {
  Write-Warning "It looks like _VaultPageState is declared $dup times. Keep ONE class and remove/rename the others."
}

# Build
Write-Host "Running flutter clean / pub get / run..."
flutter clean
flutter pub get
# Change the device id if needed:
flutter run -d emulator-5554
