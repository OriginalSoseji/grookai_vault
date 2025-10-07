# Create the tools folder if it doesn't exist
New-Item -ItemType Directory -Force -Path C:\grookai_vault\tools | Out-Null
$ErrorActionPreference = 'Stop'
Set-Location C:\grookai_vault

# ===== Config =====
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$OutDir = "snapshots\$Stamp"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# What to include (add/remove paths as needed)
$Include = @(
  'lib',                              # Flutter app code
  'pubspec.yaml',                     # Dependencies & assets
  'analysis_options.yaml',            # Lints
  'supabase\functions',               # Edge Functions
  'supabase\migrations',              # DB changes
  'supabase\seed.sql',                # Seed (if present)
  'assets',                           # Images/fonts if needed
  '.vscode',                          # Tasks/launch configs
  'README.md'
) | Where-Object { Test-Path $_ }

# 1) Make a ZIP with just the essentials
$ZipPath = "$OutDir\grookai_snapshot_$Stamp.zip"
Compress-Archive -Path $Include -DestinationPath $ZipPath -Force

# 2) Generate a manifest (files + sizes + SHA256) for precise diffing
$Manifest = @()
foreach ($p in $Include) {
  if (Test-Path $p) {
    Get-ChildItem $p -Recurse -File | ForEach-Object {
      $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
      $Manifest += [PSCustomObject]@{
        Path = $_.FullName.Replace((Get-Location).Path + '\', '')
        Size = $_.Length
        SHA256 = $hash
      }
    }
  }
}
$ManifestPath = "$OutDir\manifest_$Stamp.json"
$Manifest | ConvertTo-Json -Depth 6 | Out-File -Encoding utf8 $ManifestPath

# 3) Capture a human-readable summary (deps + functions + migrations)
$SummaryPath = "$OutDir\summary_$Stamp.md"
$pubspec = Get-Content .\pubspec.yaml -Raw
$functions = if (Test-Path .\supabase\functions) {
  Get-ChildItem .\supabase\functions -Directory | Select-Object -ExpandProperty Name
} else { @() }
$migrations = if (Test-Path .\supabase\migrations) {
  Get-ChildItem .\supabase\migrations -Directory | Select-Object -ExpandProperty Name
} else { @() }

@"
# Grookai Vault Snapshot — $Stamp

**Root:** $(Get-Location)
**Zip:** $(Resolve-Path $ZipPath)

## Pubspec (top lines)
$(($pubspec -split "`n")[0..([Math]::Min(40,($pubspec -split "`n").Count-1))] -join "`n")

## Edge Functions
$(if($functions.Count){($functions | ForEach-Object {"- $_"}) -join "`n"}else{"(none)"} )

## Migrations
$(if($migrations.Count){($migrations | ForEach-Object {"- $_"}) -join "`n"}else{"(none)"} )

## File Count
$((Get-ChildItem $Include -Recurse -File | Measure-Object).Count)

"@ | Out-File -Encoding utf8 $SummaryPath

Write-Host "✅ Snapshot ready:"
Write-Host "   $ZipPath"
Write-Host "   $ManifestPath"
Write-Host "   $SummaryPath"
