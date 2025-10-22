param(
  [string]$ProjectRoot = "C:\grookai_vault"
)

$ErrorActionPreference = 'Continue'
Set-Location $ProjectRoot

function New-DirIfMissing($p) { if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null } }

$Reports = Join-Path $ProjectRoot '.reports'
New-DirIfMissing $Reports

$StatusOut = Join-Path $Reports 'import_card_preapp_status.txt'
$RespOut   = Join-Path $Reports 'import_card_preapp_response.json'

# 1) Find SUPABASE_URL and extract project ref
$envFiles = Get-ChildItem -Path $ProjectRoot -Recurse -File -Include '.env','*.env','*.env.*' -ErrorAction SilentlyContinue
$supabaseUrl = $null
foreach ($f in $envFiles) {
  try {
    $txt = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $supabaseUrl) {
      $m = [regex]::Match($txt, '(?im)^\s*SUPABASE_URL\s*=\s*([^\r\n\s#]+)')
      if ($m.Success) { $supabaseUrl = $m.Groups[1].Value.Trim() }
    }
  } catch {}
}

$appRef = $null
if ($supabaseUrl) {
  $m2 = [regex]::Match($supabaseUrl, '(?i)https?://([a-z0-9-]+)\.supabase\.co')
  if ($m2.Success) { $appRef = $m2.Groups[1].Value }
}

$HostedUrl = $(if ($appRef) { "https://$appRef.functions.supabase.co/import-card" } else { $null })

# 2) Make POST request
$HttpStatus = -1
$Body = '{"set_code":"sv4","number":"12","lang":"en"}'
if ($HostedUrl) {
  try {
    $resp = Invoke-WebRequest -Method POST -Uri $HostedUrl -Headers @{ 'Content-Type'='application/json' } -Body $Body -TimeoutSec 30
    $HttpStatus = [int]$resp.StatusCode
    $resp.Content | Set-Content -Path $RespOut -Encoding UTF8
  } catch {
    $HttpStatus = -1
    ($_ | Out-String) | Set-Content -Path $RespOut -Encoding UTF8
  }
}

# 3) Save status and URL used
$lines = @()
$lines += "URL: " + ($(if ($HostedUrl) { $HostedUrl } else { '(unknown)' }))
$lines += "HTTP Status: " + $HttpStatus
$lines += "Timestamp: " + (Get-Date -Format 's')
$lines -join "`r`n" | Set-Content -Path $StatusOut -Encoding UTF8

# 4) Print concise summary
$first200 = ''
try {
  if (Test-Path $RespOut) {
    $txt = Get-Content $RespOut -Raw
    if ($txt.Length -gt 200) { $first200 = $txt.Substring(0,200) } else { $first200 = $txt }
  }
} catch {}

Write-Host "URL: $HostedUrl"
Write-Host "HTTP Status: $HttpStatus"
Write-Host "First 200 chars:"
Write-Host $first200
