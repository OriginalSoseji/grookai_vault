param(
  [string]$OutDir = "snapshots"
)
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$zipPath = Join-Path $OutDir "lib_$timestamp.zip"

if (-not (Test-Path .\lib)) {
  Write-Error "No .\lib folder found. Run from project root."
  exit 1
}

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

# Create the archive
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path .\lib -DestinationPath $zipPath -Force

# Output file info + hash
$hash = Get-FileHash $zipPath -Algorithm SHA256
Write-Host "Snapshot created: $zipPath"
Write-Host ("SHA256: " + $hash.Hash)
