<#
  Verifies wall_feed_v returns 3:4 720x960 thumbs for at least one row.
  - Reads .env for SUPABASE_URL, SUPABASE_ANON_KEY
  - Writes scripts/diagnostics/output/verify_thumbs_3x4.md
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

$outDir = 'scripts/diagnostics/output'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$out = Join-Path $outDir 'verify_thumbs_3x4.md'

$md = @()
$md += '# Verify Wall Thumbs 3:4'
$md += "- SUPABASE_URL: $(Redact $SUPABASE_URL)"

if (-not $SUPABASE_URL -or -not $ANON) {
  $md += 'Missing env; cannot run.'
  Set-Content -Path $out -Value ($md -join "`n"); exit 0
}

$hdr = @{ 'apikey' = $ANON; 'Authorization' = "Bearer $ANON" }
$uri = "$SUPABASE_URL/rest/v1/wall_feed_v?select=id,title,image_url,image_w,image_h&limit=5"
try { $rows = Invoke-RestMethod -Method Get -Uri $uri -Headers $hdr -ErrorAction Stop } catch { $rows = @() }

$ok = $false
foreach ($r in ($rows ?? @())) {
  $url = ($r.image_url ?? '').ToString()
  $w = [int]($r.image_w ?? 0)
  $h = [int]($r.image_h ?? 0)
  if ($url -match '_720x960\.jpg' -or $url -match '/thumbs/') {
    if ($w -eq 720 -and $h -eq 960) { $ok = $true }
  }
}

$md += '## Sample'
$md += (ConvertTo-Json $rows -Depth 4)
$md += "\nResult: **$((if ($ok) { 'PASS' } else { 'FAIL' }))**"

Set-Content -Path $out -Value ($md -join "`n")
Write-Host "Wrote $out"

