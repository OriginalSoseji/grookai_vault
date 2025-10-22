param(
  [string]$ProjectRoot = "C:\grookai_vault"
)

$ErrorActionPreference = 'Continue'
Set-Location $ProjectRoot

function New-DirIfMissing($p) { if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null } }

$Reports = Join-Path $ProjectRoot '.reports'
New-DirIfMissing $Reports
$OutPath = Join-Path $Reports 'flutter_functions_invoke_audit.txt'

# 1) Scan Dart code for patterns
$files = Get-ChildItem -Path (Join-Path $ProjectRoot 'lib') -Recurse -Include *.dart -File -ErrorAction SilentlyContinue
$pattern = '(functions\.invoke\(|import-card|functions\.v1|supabase\.co)'
$matches = @()
foreach ($f in $files) {
  try {
    $ms = Select-String -Path $f.FullName -Pattern $pattern -CaseSensitive:$false -AllMatches -SimpleMatch:$false -Encoding UTF8 |
      ForEach-Object { "{0}:{1}: {2}" -f $_.Path, $_.LineNumber, ($_.Line.Trim()) }
    if ($ms) { $matches += $ms }
  } catch {}
}
$matches = $matches | Select-Object -First 80

# 2) Detect absolute localhost URLs or hardcoded functions domain
$hardcoded = @()
foreach ($f in $files) {
  try {
    $ms = Select-String -Path $f.FullName -Pattern 'http://localhost:54321|https?://[^\"\']*functions\.supabase\.co' -AllMatches -Encoding UTF8 |
      ForEach-Object { $_.Path }
    if ($ms) { $hardcoded += $ms }
  } catch {}
}
$hardcoded = $hardcoded | Sort-Object -Unique

# 3) Fix function name variants to 'import-card'
$replacements = @()
$variantPatterns = @('import_card','importcard')
foreach ($f in $files) {
  try {
    $txt = Get-Content -Path $f.FullName -Raw -Encoding UTF8
    $orig = $txt
    foreach ($vp in $variantPatterns) {
      $txt = $txt -replace "(['"])$vp(['"])", '$1import-card$2'
    }
    if ($txt -ne $orig) {
      $txt | Set-Content -Path $f.FullName -Encoding UTF8
      $replacements += $f.FullName
    }
  } catch {}
}
$replacements = $replacements | Sort-Object -Unique

# 4) Compose audit
$md = @()
$md += 'Flutter Functions Invoke Audit'
$md += 'Generated: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
$md += ''
$md += 'Matches (up to 80):'
if ($matches.Count -gt 0) { $md += $matches } else { $md += '(none found)' }
$md += ''
$md += 'Hardcoded URLs (localhost or functions domain):'
if ($hardcoded.Count -gt 0) { $md += $hardcoded } else { $md += '(none found)' }
$md += ''
$md += 'Replacements applied (function name variants -> import-card):'
if ($replacements.Count -gt 0) { $md += $replacements } else { $md += '(none)' }
$md += ''
$md += 'Conclusion:'
if ($hardcoded.Count -eq 0) {
  $md += 'Usage appears via Supabase client functions.invoke("import-card", ...).' 
} else {
  $md += 'Found hardcoded URLs. Prefer Supabase.instance.client.functions.invoke("import-card", ...).'
}

$md -join "`r`n" | Set-Content -Path $OutPath -Encoding UTF8

Write-Host "Audit written: $OutPath"
