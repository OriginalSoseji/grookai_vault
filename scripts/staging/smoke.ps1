param(
  [string]$RestUrl = $env:STAGING_REST_URL,
  [string]$AnonKey = $env:STAGING_ANON_KEY
)
if (-not $RestUrl -or -not $AnonKey) { Write-Error "Set STAGING_REST_URL and STAGING_ANON_KEY"; exit 1 }
$h = @{ apikey=$AnonKey; Authorization="Bearer $AnonKey"; Prefer="count=exact" }
$u1 = "$RestUrl/rest/v1/listings?select=id&limit=1"
$u2 = "$RestUrl/rest/v1/wall_feed_view?select=listing_id&limit=1"
$r1 = Invoke-WebRequest $u1 -Headers $h -Method GET -ErrorAction Stop
$r2 = Invoke-WebRequest $u2 -Headers $h -Method GET -ErrorAction Stop
$range1 = $r1.Headers['Content-Range']
$range2 = $r2.Headers['Content-Range']
if (-not $range1 -or -not $range2) { Write-Error "Missing Content-Range"; exit 2 }
$cnt1 = [int]($range1.Split('/')[-1])
$cnt2 = [int]($range2.Split('/')[-1])
if ($cnt1 -lt 1 -or $cnt2 -lt 1) { Write-Error "Empty feed (listings=$cnt1, feed=$cnt2)"; exit 3 }
Write-Host "OK listings=$cnt1 feed=$cnt2"
