Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-Location (Split-Path $PSCommandPath -Parent | Split-Path -Parent)

function Read-SecretPlain([string]$prompt) {
  $sec = Read-Host -AsSecureString $prompt
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringUni($ptr) } finally { if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) } }
}

if (-not $env:SUPABASE_URL) { $env:SUPABASE_URL = 'https://ycdxbpibncqcchqiihfz.supabase.co' }
if (-not $env:SUPABASE_PUBLISHABLE_KEY) { $env:SUPABASE_PUBLISHABLE_KEY = Read-SecretPlain "Paste SUPABASE_PUBLISHABLE_KEY (sb_publishable_…)" }
if (-not $env:BRIDGE_IMPORT_TOKEN)      { $env:BRIDGE_IMPORT_TOKEN      = Read-SecretPlain "Paste BRIDGE_IMPORT_TOKEN (function-scoped for import-prices)" }

$url  = "$(($env:SUPABASE_URL.TrimEnd('/')))/functions/v1/import-prices"
$body = @{ ping = 'ok' } | ConvertTo-Json -Depth 5

# Variant A: apikey only
$hA = @{
  "apikey"         = $env:SUPABASE_PUBLISHABLE_KEY
  "x-bridge-token" = $env:BRIDGE_IMPORT_TOKEN
  "Content-Type"   = "application/json"
}
try {
  $r = Invoke-WebRequest -Method POST -Uri $url -Headers $hA -Body $body -UseBasicParsing -TimeoutSec 8
  $codeA = [int]$r.StatusCode
  Write-Host "A -> CODE=$codeA"
} catch {
  $codeA = try { $_.Exception.Response.StatusCode.value__ } catch { -1 }
  Write-Host "A -> ERROR: $($_.Exception.Message)"
}

# Variant B: apikey + Authorization mirrors apikey
$hB = $hA.Clone()
$hB["Authorization"] = "Bearer $($env:SUPABASE_PUBLISHABLE_KEY)"
try {
  $r = Invoke-WebRequest -Method POST -Uri $url -Headers $hB -Body $body -UseBasicParsing -TimeoutSec 8
  $codeB = [int]$r.StatusCode
  Write-Host "B -> CODE=$codeB"
} catch {
  $codeB = try { $_.Exception.Response.StatusCode.value__ } catch { -1 }
  Write-Host "B -> ERROR: $($_.Exception.Message)"
}

# cURL fallback (helps if AV kills iwr)
$curlSupported = (Get-Command curl.exe -ErrorAction SilentlyContinue) -ne $null
$codeC = $null
if ($curlSupported -and ($codeA -lt 200 -or $codeA -ge 300) -and ($codeB -lt 200 -or $codeB -ge 300)) {
  $tmp = New-TemporaryFile
  $cmd = @(
    "curl","-sS","-i","-X","POST",
    "-H","apikey: $($env:SUPABASE_PUBLISHABLE_KEY)",
    "-H","x-bridge-token: $($env:BRIDGE_IMPORT_TOKEN)",
    "-H","Content-Type: application/json",
    "--max-time","8",
    "--data","{\"ping\":\"ok\"}",
    "$url"
  )
  & $cmd 2>$null | Tee-Object -FilePath $tmp | Out-Null
  $firstLine = Get-Content $tmp -TotalCount 1
  if ($firstLine -match "HTTP/\S+\s+(\d{3})") { $codeC = [int]$matches[1] }
  Remove-Item $tmp -Force
  if ($codeC) { Write-Host "C (curl) -> CODE=$codeC" } else { Write-Host "C (curl) -> no status parsed" }
}

# Summarize
$code = ($codeA -as [int]); $variant = "A"
if (-not $code -or $code -lt 200 -or $code -ge 300) {
  $code = ($codeB -as [int]); $variant = "B"
}
if (-not $code -or $code -lt 200 -or $code -ge 300) {
  if ($codeC) { $code = $codeC; $variant = "C" }
}

$ok = ($code -ge 200 -and $code -lt 300)
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
if (-not (Test-Path .\reports)) { New-Item -ItemType Directory -Path .\reports | Out-Null }
$reportPath = ".\reports\import_prices_validate_now_$stamp.txt"
"NAME, METHOD, AUTH, CODE, OK, VARIANT" | Out-File -FilePath $reportPath -Encoding utf8
"import-prices, POST, publishable, $code, $ok, $variant" | Out-File -FilePath $reportPath -Append -Encoding utf8

if ($ok) {
  Write-Host "VALIDATION: PASS ✅  CODE=$code  VARIANT=$variant  Report=$reportPath" -ForegroundColor Green
} else {
  Write-Host "VALIDATION: FAIL ❌ CODE=$code  VARIANT=$variant  Report=$reportPath" -ForegroundColor Red
  Write-Host "Next steps:" -ForegroundColor Yellow
  Write-Host "  1) Supabase Dashboard → Edge Functions → import-prices → Verify JWT (legacy) = OFF"
  Write-Host "  2) Deploy from DASHBOARD once after flipping the toggle"
  Write-Host "  3) Re-run this validator"
  Write-Host "  4) If still failing, check logs (gateway 401 may show none):"
  Write-Host "     supabase functions logs -f import-prices --project-ref ycdxbpibncqcchqiihfz"
  Write-Host "  5) If AV interference suspected, exclude folder: C:\\grookai_vault"
}

