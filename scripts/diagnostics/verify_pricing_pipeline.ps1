<#
 Verifies pricing pipeline via REST (when run by the user).
 - Input: -CardId <uuid> (optional). If omitted, tries latest from wall_feed_v.
 - Outputs: scripts/diagnostics/output/verify_pricing_pipeline.md
#>
param(
  [string]$CardId
)
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

$repo = Resolve-Path .
$envMap = Read-DotEnv (Join-Path $repo '.env')
$SUPABASE_URL = $env:SUPABASE_URL; if (-not $SUPABASE_URL) { $SUPABASE_URL = $envMap['SUPABASE_URL'] }
$ANON = $env:SUPABASE_ANON_KEY; if (-not $ANON) { $ANON = $envMap['SUPABASE_ANON_KEY'] }

$outDir = 'scripts/diagnostics/output'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$out = Join-Path $outDir 'verify_pricing_pipeline.md'

$md = @()
$md += '# Verify Pricing Pipeline'
$md += "- SUPABASE_URL: $(Redact $SUPABASE_URL)"
$md += ''

if (-not $SUPABASE_URL -or -not $ANON) {
  $md += 'Missing env; cannot run. Set SUPABASE_URL and SUPABASE_ANON_KEY.'
  Set-Content -Path $out -Value ($md -join "`n"); exit 0
}

$hdr = @{ 'apikey' = $ANON; 'Authorization' = "Bearer $ANON" }

function Get-Json($uri) { try { return Invoke-RestMethod -Method Get -Uri $uri -Headers $hdr -ErrorAction Stop } catch { return $null } }

if (-not $CardId) {
  $wf = Get-Json "$SUPABASE_URL/rest/v1/wall_feed_v?select=card_print_id&limit=1";
  if ($wf -and $wf.Length -ge 1) { $CardId = ($wf[0].card_print_id) }
}
$md += "Using card_id: ${CardId}";

$prices = Get-Json "$SUPABASE_URL/rest/v1/latest_card_prices_v?card_id=eq.$CardId&select=card_id,condition,price_mid,observed_at&limit=1";
$comps = Get-Json "$SUPABASE_URL/rest/v1/sold_comps_v?card_id=eq.$CardId&select=card_id,sold_price,sold_at,url&limit=5";

$md += '## latest_card_prices_v sample'
$md += (ConvertTo-Json $prices -Depth 4)
$md += '## sold_comps_v sample'
$md += (ConvertTo-Json $comps -Depth 4)

$pass = (($prices -ne $null) -and ($comps -ne $null))
$md += "\nResult: **$((if ($pass) { 'PASS' } else { 'FAIL' }))**"
Set-Content -Path $out -Value ($md -join "`n")
Write-Host "Wrote $out"

