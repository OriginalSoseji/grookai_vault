Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$url = "https://ycdxbpibncqcchqiihfz.supabase.co/functions/v1/import-prices"

function Invoke-Probe {
  param($Key,$Tok)
  if (-not $Key -or -not $Tok) { return @{ code = -1; ok = $false; why = "missing env" } }
  try {
    $r = Invoke-WebRequest -Uri $url -Method POST -Headers @{ apikey=$Key; "x-bridge-token"=$Tok } -Body '{"ping":"probe"}' -ContentType 'application/json' -TimeoutSec 30
    return @{ code = [int]$r.StatusCode; ok = ($r.StatusCode -eq 200); why = "" }
  } catch {
    $msg = $_.ErrorDetails.Message
    if ($msg) { try { $j = $msg | ConvertFrom-Json } catch {} }
    $why = if ($j) { "$($j.code) $($j.message)" } else { $_.Exception.Message }
    return @{ code = -1; ok = $false; why = $why }
  }
}

# Read current env (prompt if missing)
if (-not $env:SUPABASE_PUBLISHABLE_KEY) { $env:SUPABASE_PUBLISHABLE_KEY = Read-Host "Enter sb_publishable_ key" }
if (-not $env:BRIDGE_IMPORTED_TOKEN -and -not $env:BRIDGE_IMPORT_TOKEN)      { $env:BRIDGE_IMPORT_TOKEN      = Read-Host "Enter BRIDGE_IMPORT_TOKEN (or leave blank to mint)" }

$res = Invoke-Probe -Key $env:SUPABASE_PUBLISHABLE_KEY -Tok $env:BRIDGE_IMPORT_TOKEN
if ($res.ok) { Write-Host "[OK] import-prices is already green (200)." -ForegroundColor Green; exit 0 }

Write-Host "[INFO] Probe failed ($($res.code)): $($res.why). Repairing token…" -ForegroundColor Yellow

# Mint new token if missing or mismatch
if ([string]::IsNullOrWhiteSpace($env:BRIDGE_IMPORT_TOKEN)) {
  $env:BRIDGE_IMPORT_TOKEN = ([guid]::NewGuid().ToString("N"))
}

# Set project secret + redeploy
supabase secrets set "BRIDGE_IMPORT_TOKEN=$env:BRIDGE_IMPORT_TOKEN"
supabase functions deploy import-prices --no-verify-jwt

# Reprobe
$res2 = Invoke-Probe -Key $env:SUPABASE_PUBLISHABLE_KEY -Tok $env:BRIDGE_IMPORT_TOKEN
if ($res2.ok) {
  Write-Host "[OK] import-prices repaired → 200." -ForegroundColor Green
} else {
  Write-Host "[WARN] Still failing ($($res2.code)): $($res2.why)" -ForegroundColor Yellow
}

# Write short report
if (-not (Test-Path reports)) { New-Item -ItemType Directory reports | Out-Null }
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
"before: code=$($res.code) why=$($res.why)`nafter:  code=$($res2.code) why=$($res2.why)" |
  Out-File "reports/import_prices_token_doctor_$ts.txt" -Encoding utf8
