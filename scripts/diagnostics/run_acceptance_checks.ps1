param(
  [string]$EnvFile = ".env"
)
$ErrorActionPreference = 'Stop'
$ts = (Get-Date).ToUniversalTime().ToString('o')
$audit = 'scripts/diagnostics/output/BULLETPROOFING_AUDIT_2025-11-03.md'
if (-not (Test-Path (Split-Path $audit))) { New-Item -ItemType Directory -Force -Path (Split-Path $audit) | Out-Null }

function Append-Audit($lines) {
  Add-Content -Path $audit -Value $lines
}

Append-Audit "`n---`n## Acceptance Checks — Results ($ts)"

# Read env
$u = $null; $anon = $null
if (Test-Path $EnvFile) {
  $u = (Get-Content $EnvFile | % { if ($_ -match '^SUPABASE_URL=(.+)$'){ $Matches[1].Trim() } }) | Select-Object -First 1
  $anon = (Get-Content $EnvFile | % { if ($_ -match '^SUPABASE_ANON_KEY=(.+)$'){ $Matches[1].Trim() } }) | Select-Object -First 1
}

# 1) Grants via REST (pricing_health_v / pricing_alerts_v)
try {
  if ($u -and $anon) {
    $hdr = @{ 'apikey'=$anon; 'Authorization'="Bearer $anon" }
    $okH = $false; $okA = $false
    try { Invoke-RestMethod -Method Get -Uri "$u/rest/v1/pricing_health_v?select=1&limit=1" -Headers $hdr -TimeoutSec 15 | Out-Null; $okH = $true } catch {}
    try { Invoke-RestMethod -Method Get -Uri "$u/rest/v1/pricing_alerts_v?select=code,message,observed_at&limit=1" -Headers $hdr -TimeoutSec 15 | Out-Null; $okA = $true } catch {}
    $sh = if ($okH) { 'PASS' } else { 'FAIL' }
    $sa = if ($okA) { 'PASS' } else { 'FAIL' }
    Append-Audit ("- Grants (REST): pricing_health_v={0} pricing_alerts_v={1}" -f $sh, $sa)
  } else {
    Append-Audit '- Grants: SKIP (missing SUPABASE_URL or SUPABASE_ANON_KEY in .env)'
  }
} catch { Append-Audit "- Grants: ERROR $_" }

# 2) wall_feed_v thumb check
try {
  if ($u -and $anon) {
    $hdr = @{ 'apikey'=$anon; 'Authorization'="Bearer $anon" }
    $uri = "$u/rest/v1/wall_feed_v?select=listing_id,thumb_url,primary_photo_url`&limit=1"
    $rows = Invoke-RestMethod -Method Get -Uri $uri -Headers $hdr -TimeoutSec 15
    $thumbOk = $false
    if ($rows) {
      $r = $rows | Select-Object -First 1
      $t = ("{0}" -f $r.thumb_url)
      $p = ("{0}" -f $r.primary_photo_url)
      if ($t -and $t.Trim().Length -gt 0) { $thumbOk = $true } elseif ($t -eq $p) { $thumbOk = $true }
    }
    $status = if ($thumbOk) { 'PASS' } else { 'FAIL' }
    Append-Audit ("- wall_feed_v.thumb_url: {0}" -f $status)
  } else {
    Append-Audit '- wall_feed_v.thumb_url: SKIP (missing env)'
  }
} catch { Append-Audit "- wall_feed_v.thumb_url: ERROR $_" }

# 3) retryFetch import presence in targeted functions
function Has-RetryImport($file){ if (-not (Test-Path $file)) { return $false }; return Select-String -Path $file -Pattern 'retryFetch.ts' -SimpleMatch -Quiet }
$retryFiles = @(
  'supabase/functions/import-prices/index.ts',
  'supabase/functions/system_health/index.ts',
  'supabase/functions/prices_status/index.ts'
)
foreach ($f in $retryFiles) {
  $ok = Has-RetryImport $f
  $status = if ($ok) { 'PASS' } else { 'FAIL' }
  Append-Audit ("- retryFetch in {0}: {1}" -f $f, $status)
}

# 4) Hot-path no-star selects
$grep = rg -n "\\.select\\('\*'\\)" lib 2>$null
if ([string]::IsNullOrEmpty($grep)) { Append-Audit "- No .select('*') in lib hot paths: PASS" } else { Append-Audit "- No .select('*') in lib hot paths: FAIL`n$grep" }

