Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Set-Location C:\\grookai_vault

$script:stashed = $false
function Invoke-Pull {
  try { git pull --rebase --autostash | Out-Null }
  catch {
    git stash push -u -m "auto: print_proofs $(Get-Date -Format o)" | Out-Null
    $script:stashed = $true
    git pull --rebase | Out-Null
  }
}

for ($i=0; $i -lt 40; $i++) {
  Invoke-Pull
  if ((Test-Path 'reports/ci_logs/latest/sixline.txt') -and (Test-Path 'reports/ci_logs/latest/attempts.txt')) { break }
  Start-Sleep 6
}
if (!(Test-Path 'reports/ci_logs/latest/sixline.txt') -or !(Test-Path 'reports/ci_logs/latest/attempts.txt')) {
  throw 'Proofs not found yet. Check workflow run or permissions.'
}
$sixC = Get-Content 'reports/ci_logs/latest/sixline.txt' -Raw
$attC = Get-Content 'reports/ci_logs/latest/attempts.txt' -Raw
$gw = ($sixC -split '\r?\n' | Where-Object { $_ -like 'GatewayAuth:*' } | Select-Object -First 1)
$fc = ($sixC -split '\r?\n' | Where-Object { $_ -like 'FinalCode:*'   } | Select-Object -First 1)
$al = ($attC -split '\r?\n' | Where-Object { $_ -like 'Attempts:*'    } | Select-Object -First 1)
$code = ($fc -replace '[^\d]', '')
$result = if ($code -eq '200') { 'PASS' } else { 'FAIL' }
Write-Host ''
Write-Host '=== Auto-Align Proofs ==='
Write-Host $gw
Write-Host $fc
Write-Host $al
Write-Host ("Result: {0} (last code = {1})" -f $result, $code)
if ($stashed) { try { git stash pop | Out-Null } catch { Write-Host 'Note: kept stash due to conflicts.' -ForegroundColor Yellow } }

