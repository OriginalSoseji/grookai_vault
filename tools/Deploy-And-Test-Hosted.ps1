param(
  [string]$ProjectRoot = "C:\grookai_vault"
)

$ErrorActionPreference = 'Continue'
Set-Location $ProjectRoot

function New-DirIfMissing($p) { if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null } }

$Reports = Join-Path $ProjectRoot '.reports'
New-DirIfMissing $Reports

$DeployOut = Join-Path $Reports 'import_card_deploy.txt'
$ListOut   = Join-Path $Reports 'import_card_list.txt'
$LogsOut   = Join-Path $Reports 'import_card_logs.txt'
$UrlOut    = Join-Path $Reports 'import_card_hosted_endpoint.txt'
$RespOut   = Join-Path $Reports 'import_card_hosted_test.json'
$SummaryOut= Join-Path $Reports 'import_card_hosted_summary.txt'

"Deploying import-card..." | Set-Content -Path $DeployOut
try {
  (supabase functions deploy import-card --no-verify-jwt 2>&1 | Out-String) | Add-Content -Path $DeployOut
} catch { ($_ | Out-String) | Add-Content -Path $DeployOut }

"Listing functions..." | Set-Content -Path $ListOut
try { (supabase functions list 2>&1 | Out-String) | Add-Content -Path $ListOut } catch { ($_ | Out-String) | Add-Content -Path $ListOut }

"Recent logs (10m)..." | Set-Content -Path $LogsOut
try { (supabase functions logs import-card --since 10m 2>&1 | Out-String) | Add-Content -Path $LogsOut } catch { ($_ | Out-String) | Add-Content -Path $LogsOut }

# Determine linked project ref
$LinkStatus = ''
try { $LinkStatus = supabase link status 2>&1 | Out-String } catch { $LinkStatus = $_ | Out-String }
$ProjectRef = $null
foreach ($pat in @('(?im)project\s*ref\s*[:=]\s*([a-z0-9-]{6,})','(?im)reference\s*id\s*[:=]\s*([a-z0-9-]{6,})','(?im)ref\s*[:=]\s*([a-z0-9-]{6,})')) {
  $m = [regex]::Match($LinkStatus, $pat)
  if ($m.Success) { $ProjectRef = $m.Groups[1].Value; break }
}

$HostedUrl = $null
if ($ProjectRef) {
  $HostedUrl = "https://$ProjectRef.functions.supabase.co/import-card"
  $HostedUrl | Set-Content -Path $UrlOut -Encoding UTF8
}

# Test call
$HttpStatus = 0
$Body = '{"set_code":"sv4","number":"12"}'
if ($HostedUrl) {
  try {
    $resp = Invoke-WebRequest -Method POST -Uri $HostedUrl -Headers @{ 'Content-Type'='application/json' } -Body $Body -TimeoutSec 30
    $HttpStatus = [int]$resp.StatusCode
    ($resp.Content) | Set-Content -Path $RespOut -Encoding UTF8
  } catch {
    $HttpStatus = -1
    ($_ | Out-String) | Set-Content -Path $RespOut -Encoding UTF8
  }
}

# Write a short text summary for convenience
$first200 = ''
try {
  if (Test-Path $RespOut) {
    $txt = Get-Content $RespOut -Raw
    if ($txt.Length -gt 200) { $first200 = $txt.Substring(0,200) } else { $first200 = $txt }
  }
} catch {}

$summary = @()
$summary += "Hosted URL: " + ($(if ($HostedUrl) { $HostedUrl } else { '(unknown)' }))
$summary += "HTTP Status: " + $HttpStatus
$summary += "First 200 chars:"
$summary += $first200
$summary -join "`r`n" | Set-Content -Path $SummaryOut -Encoding UTF8

Write-Host "Hosted URL: $HostedUrl"
Write-Host "HTTP Status: $HttpStatus"
Write-Host "First 200 chars:"
Write-Host $first200
