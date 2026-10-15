$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot

& npm.cmd run pricing:market:ollama:automation
if ($LASTEXITCODE -ne 0) {
  throw "Grookai Market Evidence Ollama automation failed with exit code $LASTEXITCODE"
}
