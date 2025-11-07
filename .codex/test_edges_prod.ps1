[CmdletBinding()]
param(
  [switch]$VerboseOutput
)

# ===========================================
#  Test Edge Functions (PRODUCTION)
#  - Uses SRK in Authorization, ANON in apikey
#  - Writes a timestamped report with status codes
# ===========================================
$ErrorActionPreference = 'Stop'

# 0) Load env (no prints of secrets)
. "$PSScriptRoot\load_env.ps1"

# 1) Normalize keys/URL
$SRK  = $env:SUPABASE_SECRET_KEY; if (-not $SRK)  { $SRK  = $env:SERVICE_ROLE_KEY }; if (-not $SRK)  { $SRK  = $env:SUPABASE_SERVICE_ROLE_KEY }
$ANON = $env:SUPABASE_PUBLISHABLE_KEY; if (-not $ANON) { $ANON = $env:ANON_KEY }; if (-not $ANON) { $ANON = $env:SUPABASE_ANON_KEY }
$URL  = $env:PROJECT_URL;       if (-not $URL)  { $URL  = $env:SUPABASE_URL }

if (-not $SRK -or -not $ANON -or -not $URL) {
  Write-Host "[ERROR] Missing SRK/ANON/URL in env. Aborting." -ForegroundColor Red
  exit 1
}

# 2) Headers
# Admin: standardize on apikey: SECRET (no client anon)
$HeadersAdmin = @{ apikey = $SRK; "Content-Type"="application/json" }
$HeadersAnon  = @{ apikey = $ANON; "Content-Type"="application/json" }

# 3) Helpers
function Invoke-WithStatus {
  param(
    [string]$Method, [string]$Uri, [hashtable]$Headers, $Body = $null
  )
  try {
    if ($PSBoundParameters.ContainsKey('Body') -and $Body -ne $null) {
      $payload = $Body
      if ($payload -is [string]) { $bodyJson = $payload } else { $bodyJson = ($payload | ConvertTo-Json -Depth 5) }
      $resp = Invoke-WebRequest -Method $Method -Uri $Uri -Headers $Headers -Body $bodyJson -ErrorAction Stop
    } else {
      $resp = Invoke-WebRequest -Method $Method -Uri $Uri -Headers $Headers -ErrorAction Stop
    }
    return @{ code = [int]$resp.StatusCode; ok = ([int]$resp.StatusCode -ge 200 -and [int]$resp.StatusCode -lt 300) }
  } catch {
    $code = $null
    try {
      if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        $code = [int]$_.Exception.Response.StatusCode
      }
    } catch {}
    return @{ code = $code; ok = $false }
  }
}

# 4) Run tests (minimal payloads)
$ts = (Get-Date).ToString('yyyyMMdd_HHmmss')
$reportRoot = Join-Path $PSScriptRoot "..\reports"
if (-not (Test-Path $reportRoot)) { New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null }
$reportDir = Join-Path $reportRoot "edge_test_$ts"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

$results = @()

# import-prices (POST, admin)
$uri1 = "$URL/functions/v1/import-prices"
$r1 = Invoke-WithStatus -Method 'POST' -Uri $uri1 -Headers $HeadersAdmin -Body @{ set_code = "sv1"; debug = $false }
$results += [pscustomobject]@{ name='import-prices'; method='POST'; auth='service-role'; code=$r1.code; ok=$r1.ok }

# check-sets (POST, admin)
$uri2 = "$URL/functions/v1/check-sets"
$r2 = Invoke-WithStatus -Method 'POST' -Uri $uri2 -Headers $HeadersAdmin -Body @{ fix = $false; throttleMs = 200 }
$results += [pscustomobject]@{ name='check-sets'; method='POST'; auth='service-role'; code=$r2.code; ok=$r2.ok }

# wall_feed (GET, anon)
$uri3 = "$URL/functions/v1/wall_feed?limit=1"
$r3 = Invoke-WithStatus -Method 'GET' -Uri $uri3 -Headers $HeadersAnon
$results += [pscustomobject]@{ name='wall_feed'; method='GET'; auth='anon'; code=$r3.code; ok=$r3.ok }

# 5) Write report
$edgeTxt = Join-Path $reportDir "edge_results.txt"
$sumMd   = Join-Path $reportDir "SUMMARY.md"

"NAME, METHOD, AUTH, CODE, OK" | Out-File -FilePath $edgeTxt -Encoding ascii
$results | ForEach-Object {
  $codeOut = if ($null -ne $_.code) { $_.code } else { '' }
  "{0}, {1}, {2}, {3}, {4}" -f $_.name,$_.method,$_.auth,$codeOut,$_.ok
} | Out-File -Append -FilePath $edgeTxt -Encoding ascii

$allOk = -not ($results | Where-Object { -not $_.ok })
$verdict = if ($allOk) { "GREEN" } else { "RED" }

@"
# Edge Functions Test (PROD)

| Name          | Method | Auth         | Code | OK  |
|---------------|--------|--------------|------|-----|
| import-prices | POST   | service-role | $($results[0].code) | $($results[0].ok) |
| check-sets    | POST   | service-role | $($results[1].code) | $($results[1].ok) |
| wall_feed     | GET    | anon         | $($results[2].code) | $($results[2].ok) |

**Verdict:** $verdict
"@ | Out-File -FilePath $sumMd -Encoding utf8

Write-Host "Results -> $edgeTxt"
Write-Host "Summary -> $sumMd"
$color = if ($allOk) { 'Green' } else { 'Red' }
Write-Host "Verdict: $verdict" -ForegroundColor $color

if (-not $allOk) { exit 2 } else { exit 0 }

# (Optional) verbose dump
if ($VerboseOutput) {
  $results | Format-Table -AutoSize | Out-String | Write-Host
}

# End of script
