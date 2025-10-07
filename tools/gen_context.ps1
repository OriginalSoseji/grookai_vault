param(
  [string]$Root = ".",
  [string]$OutMd = "docs/CONTEXT_PACK.md",
  [string]$OutJson = "docs/CONTEXT_PACK.json"
)

# What to scan
$paths = @("pubspec.yaml","lib","supabase/functions","supabase/migrations","supabase/sql")

# Collect files
$files = @()
foreach ($p in $paths) {
  $full = Join-Path $Root $p
  if (Test-Path $full) {
    if ((Get-Item $full).PSIsContainer) {
      $files += Get-ChildItem $full -Recurse -Include *.dart,*.ts,*.sql,*.yaml,*.yml,*.md `
        | Where-Object { $_.FullName -notmatch "\\build\\|\\.dart_tool\\|node_modules" } `
        | Select-Object -ExpandProperty FullName
    } else {
      $files += $full
    }
  }
}

# Extract a concise preview per file
function Snip($path) {
  try {
    $text = Get-Content $path -Raw -ErrorAction Stop
    $lines = $text -split "`n"
    $head  = ($lines | Select-Object -First 40) -join "`n"
    $classes = ($lines | Select-Object -First 400) -match "class\s+\w+" -join "`n"
    $funcs   = ($lines | Select-Object -First 400) -match "^(?:export\s+)?(?:async\s+)?function\s+\w+|^\s*\w+\s+\w+\(" -join "`n"

    return @"
### $path

**Classes/Functions (first pass)**
"@
  } catch {
    return "### $path`n(Error reading file)"
  }
}

# Build MD + JSON
$md = @("# Grookai Vault – Context Pack", "", "Generated: $(Get-Date -Format s)", "")
$json = @()

foreach ($f in $files) {
  $rel = Resolve-Path $f | ForEach-Object { $_.Path }
  $md += Snip $rel
  $json += [pscustomobject]@{
    path = $rel
    size = (Get-Item $rel).Length
    sha1 = (Get-FileHash $rel -Algorithm SHA1).Hash
  }
}

$md -join "`n" | Set-Content $OutMd -Encoding UTF8
($json | ConvertTo-Json -Depth 4) | Set-Content $OutJson -Encoding UTF8
Write-Host "Wrote $OutMd and $OutJson"
