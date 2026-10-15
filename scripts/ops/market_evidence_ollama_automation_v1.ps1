param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot

$logRoot = 'C:\grookai_vault_operator_artifacts\mee_ollama_scheduled_logs'
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH-mm-ss-fffZ')
$logPath = Join-Path $logRoot "market-evidence-ollama-$stamp.log"

try {
  "[$((Get-Date).ToUniversalTime().ToString('o'))] starting dry_run=$DryRun repo=$repoRoot" |
    Set-Content -LiteralPath $logPath -Encoding utf8
  $arguments = @('run', 'pricing:market:ollama:automation')
  if ($DryRun) { $arguments += @('--', '--dry-run') }
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & npm.cmd @arguments 2>&1 | ForEach-Object {
      Write-Host $_
      Add-Content -LiteralPath $logPath -Value ([string]$_) -Encoding utf8
    }
  } finally {
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($exitCode -ne 0) {
    throw "Grookai Market Evidence Ollama automation failed with exit code $exitCode"
  }
  "[$((Get-Date).ToUniversalTime().ToString('o'))] completed exit_code=0" |
    Add-Content -LiteralPath $logPath -Encoding utf8
} catch {
  "[$((Get-Date).ToUniversalTime().ToString('o'))] FAILED: $($_.Exception.Message)" |
    Add-Content -LiteralPath $logPath -Encoding utf8
  throw
}
