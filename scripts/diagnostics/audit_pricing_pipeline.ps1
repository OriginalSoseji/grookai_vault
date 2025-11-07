<#
 Audits pricing/comps wiring across backend and Flutter code.
 - Reads .env for SUPABASE_URL/keys (redacts in output)
 - When executed by the user, it can query REST to check existence of views/RPCs.
 - Writes scripts/diagnostics/output/pricing_audit.md
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

$repo = Resolve-Path .
$envMap = Read-DotEnv (Join-Path $repo '.env')
$SUPABASE_URL = $env:SUPABASE_URL; if (-not $SUPABASE_URL) { $SUPABASE_URL = $envMap['SUPABASE_URL'] }
$ANON = $env:SUPABASE_ANON_KEY; if (-not $ANON) { $ANON = $envMap['SUPABASE_ANON_KEY'] }
$SERVICE = $env:SUPABASE_SERVICE_ROLE_KEY; if (-not $SERVICE) { $SERVICE = $envMap['SUPABASE_SERVICE_ROLE_KEY'] }
$EBAY_APP_ID = $env:EBAY_APP_ID; if (-not $EBAY_APP_ID) { $EBAY_APP_ID = $envMap['EBAY_APP_ID'] }

$outDir = 'scripts/diagnostics/output'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$out = Join-Path $outDir 'pricing_audit.md'

$md = @()
$md += '# Pricing & Comps Audit'
$md += ''
$md += '## Env'
$md += "- SUPABASE_URL: $(Redact $SUPABASE_URL)"
$md += "- SUPABASE_ANON_KEY: $(Redact $ANON)"
$md += "- SUPABASE_SERVICE_ROLE_KEY: $(Redact $SERVICE)"
$md += "- EBAY_APP_ID: $(Redact $EBAY_APP_ID)"
$md += ''

function Try-Get($uri, $hdr) {
  try { return Invoke-RestMethod -Method Get -Uri $uri -Headers $hdr -ErrorAction Stop } catch { return $null }
}

if ($SUPABASE_URL -and $ANON) {
  $hdrAnon = @{ 'apikey' = $ANON; 'Authorization' = "Bearer $ANON" }
  $md += '## Backend objects (REST presence)'
  $checkList = @(
    '/rest/v1/pricing_health_v?select=count',
    '/rest/v1/pricing_alerts_v?select=count',
    '/rest/v1/latest_card_prices_v?select=count',
    '/rest/v1/sold_comps_v?select=count'
  )
  foreach ($path in $checkList) {
    $uri = "$SUPABASE_URL$path"
    $ok = $false
    try { $r = Invoke-WebRequest -Method Options -Uri $uri -Headers $hdrAnon -ErrorAction Stop; $ok = $true } catch { $ok = $false }
    $md += "- $path => ${(if ($ok) { 'OK' } else { 'MISSING' })}"
  }
} else {
  $md += '## Backend objects'
  $md += '- Skipped live REST checks (missing env).'
}

$md += ''
$md += '## Flutter references'
function Scan($pattern) {
  if (Get-Command rg -ErrorAction SilentlyContinue) { rg -n --no-heading -S $pattern lib | Out-String } else { (gci -Recurse lib -Include *.dart | % { Select-String -Path $_.FullName -Pattern $pattern -SimpleMatch }) | % { "{0}:{1}:{2}" -f $_.Path,$_.LineNumber,$_.Line } | Out-String }
}
$md += '### Services / PriceService'
$md += (Scan 'services/price_service.dart|PriceService|latestIndex|latestFloors|latestGvBaseline|indexHistory|latestSold5')
$md += '### ViewModels'
$md += (Scan 'card_detail_vm.dart|HomeVm|priceMovers')
$md += '### UI surfaces'
$md += (Scan 'widgets/price_card.dart|RecentSalesList|card_detail_page.dart')

$md += ''
$md += '## Probable root causes (from static scan)'
$md += '- If REST checks show MISSING for views, ensure migration creates them and grants SELECT to anon/auth.'
$md += '- If PriceService points at views that do not exist, adapt view names or create adapters.'
$md += '- If sold comps edge function is not deployed, latestSold5 will be empty.'

Set-Content -Path $out -Value ($md -join "`n")
Write-Host "Wrote $out"

