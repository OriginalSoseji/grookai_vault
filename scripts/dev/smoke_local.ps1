param(
  [Parameter()][string]$Base = 'http://127.0.0.1:54321'
)

$ErrorActionPreference = 'Stop'

# Resolve anon key: prefer supabase status, fallback to .env.local
$st = & cmd /c "supabase status 2>&1"
$key = ($st | Select-String -Pattern 'Publishable key:\s*(\S+)' -AllMatches).Matches.Groups[1].Value | Select-Object -First 1
if (-not $key -and (Test-Path '.env.local')) {
  $lines = Get-Content '.env.local'
  $key = ($lines | ? { $_ -match '^SUPABASE_ANON_KEY=' } | % { ($_ -split '=',2)[1] }) -replace '"',''
}
if (-not $key) { throw 'Missing anon key (cannot smoke test)' }

$h = @{ apikey=$key; Authorization = "Bearer $key" }

function Must-NonEmpty($url){
  try {
    $data = Invoke-RestMethod -Method Get -Uri $url -Headers $h -TimeoutSec 10
    if (($data | Measure-Object).Count -lt 1) { throw "empty" }
  } catch {
    throw "Smoke failed for $url: $($_.Exception.Message)"
  }
}

$l = "$Base/rest/v1/listings?select=id,title&limit=1"
$f = "$Base/rest/v1/wall_feed_view?select=listing_id,title&limit=1"

Must-NonEmpty $l
Must-NonEmpty $f

Write-Host "✅ Local Supabase reachable and feed has data" -ForegroundColor Green

