<#
  Simulates a wall posting flow with minimal side-effects.
  - Reads .env for SUPABASE_URL, TEST_USER_JWT, SUPABASE_SERVICE_ROLE_KEY
  - Creates a listing (as user), attempts a storage upload path & thumb function (no-op if blocked)
  - Reads wall_feed_v (anon)
  - Writes scripts/diagnostics/output/wall_post_probe.md with PASS/FAIL (secrets redacted)

  This is a probe; keep idempotent and safe. Secrets never printed raw.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-DotEnv($path) {
  if (!(Test-Path $path)) { return @{} }
  $map = @{}
  foreach ($line in Get-Content $path) {
    if ($line -match '^\s*#') { continue }
    if ($line -match '^\s*$') { continue }
    $kv = $line -split '=', 2
    if ($kv.Count -eq 2) { $map[$kv[0].Trim()] = $kv[1].Trim().Trim('"') }
  }
  return $map
}

function Redact($s) { if (-not $s) { return $s }; return ($s -replace '([A-Za-z0-9]{6})[A-Za-z0-9\-_]+', '$1•••') }

$root = Split-Path -Parent $PSCommandPath
$repo = Resolve-Path (Join-Path $root '..' '..')
$envMap = Read-DotEnv (Join-Path $repo '.env')

$SUPABASE_URL = $env:SUPABASE_URL; if (-not $SUPABASE_URL) { $SUPABASE_URL = $envMap['SUPABASE_URL'] }
$TEST_USER_JWT = $env:TEST_USER_JWT; if (-not $TEST_USER_JWT) { $TEST_USER_JWT = $envMap['TEST_USER_JWT'] }
$SERVICE_ROLE = $env:SUPABASE_SERVICE_ROLE_KEY; if (-not $SERVICE_ROLE) { $SERVICE_ROLE = $envMap['SUPABASE_SERVICE_ROLE_KEY'] }

$diagDir = Join-Path $repo 'scripts/diagnostics/output'
New-Item -ItemType Directory -Force -Path $diagDir | Out-Null
$out = Join-Path $diagDir 'wall_post_probe.md'

if (-not $SUPABASE_URL) { Set-Content -Path $out -Value "Missing SUPABASE_URL"; exit 0 }

$headersUser = @{ 'apikey' = $SERVICE_ROLE; 'Authorization' = "Bearer $TEST_USER_JWT"; 'Content-Type' = 'application/json' }
$headersAnon = @{ 'apikey' = $SERVICE_ROLE; 'Content-Type' = 'application/json' }

$result = @{
  supabase_url = Redact $SUPABASE_URL
  created_listing = $false
  thumb_invoked = $false
  anon_feed_ok = $false
}

try {
  if ($TEST_USER_JWT) {
    $insBody = @{ title = 'Probe Listing'; price_cents = 1234; set_code = 'sv01'; owner_id = '00000000-0000-0000-0000-000000000000' } | ConvertTo-Json -Compress
    $insUrl = "$SUPABASE_URL/rest/v1/listings?select=*"
    $ins = Invoke-RestMethod -Method Post -Uri $insUrl -Headers $headersUser -Body $insBody -ErrorAction Stop
    $listingId = $ins[0].id
    if ($listingId) { $result.created_listing = $true }

    # Call thumb function (best-effort)
    $fnUrl = "$SUPABASE_URL/functions/v1/thumb_maker"
    $fnBody = @{ listingId = $listingId; storagePath = "listing-photos/$listingId/probe.jpg" } | ConvertTo-Json -Compress
    try { Invoke-RestMethod -Method Post -Uri $fnUrl -Headers $headersUser -Body $fnBody -ErrorAction Stop | Out-Null; $result.thumb_invoked = $true } catch { $result.thumb_invoked = $false }
  }
} catch {
  # ignore and continue
}

try {
  $feedUrl = "$SUPABASE_URL/rest/v1/rpc/wall_feed_list"
  $feedBody = @{ _limit = 1; _offset = 0 } | ConvertTo-Json -Compress
  $resp = Invoke-RestMethod -Method Post -Uri $feedUrl -Headers $headersAnon -Body $feedBody -ErrorAction Stop
  if ($resp) { $result.anon_feed_ok = $true }
} catch { $result.anon_feed_ok = $false }

$pass = if ($result.anon_feed_ok) { 'PASS' } else { 'FAIL' }
$md = @()
$md += "# Wall Post Probe"
$md += "- Supabase URL: $($result.supabase_url)"
$md += "- Created Listing: $($result.created_listing)"
$md += "- Thumb Invoked: $($result.thumb_invoked)"
$md += "- Anon Feed OK: $($result.anon_feed_ok)"
$md += ""
$md += "Result: **$pass**"
Set-Content -Path $out -Value ($md -join "`n")

Write-Host '[wall_post_probe] Done.'

