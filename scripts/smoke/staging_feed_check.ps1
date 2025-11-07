param(
  [string]$EnvFile = '.env.staging'
)

$ErrorActionPreference = 'Stop'

if (!(Test-Path $EnvFile)) { Write-Error "Env file not found: $EnvFile"; exit 1 }

$lines = Get-Content $EnvFile
$base = ($lines | Where-Object { $_ -match '^SUPABASE_URL=' } | ForEach-Object { ($_ -split '=',2)[1] }) -replace '"',''
$key  = ($lines | Where-Object { $_ -match '^(SUPABASE_PUBLISHABLE_KEY|SUPABASE_ANON_KEY)=' } | ForEach-Object { ($_ -split '=',2)[1] }) -replace '"',''
if (-not $base -or -not $key) { Write-Error 'Missing SUPABASE_URL or PUBLISHABLE/ANON KEY'; exit 1 }

$h = @{ apikey=$key }

function Fetch($url){
  try { Invoke-RestMethod -Method Get -Uri $url -Headers $h -TimeoutSec 20 } catch { $null }
}

$lurl = "$base/rest/v1/listings?select=id,title,created_at&order=created_at.desc&limit=3"
$furl = "$base/rest/v1/wall_feed_view?select=listing_id,title,created_at&order=created_at.desc&limit=3"

$list = Fetch $lurl
$feed = Fetch $furl

$lc = @($list).Count
$fc = @($feed).Count

Write-Host "Staging: $base" -ForegroundColor Cyan
Write-Host ("Listings: {0} rows" -f $lc)
if ($lc -gt 0) { $list | ForEach-Object { Write-Host (" - {0} ({1})" -f $_.title, $_.created_at) } }
Write-Host ("Feed: {0} rows" -f $fc)
if ($fc -gt 0) { $feed | ForEach-Object { Write-Host (" - {0} ({1})" -f $_.title, $_.created_at) } }

if ($lc -lt 1 -or $fc -lt 1) { exit 2 } else { exit 0 }
