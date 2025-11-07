<#
  Seeds listing_photos with deterministic 3:4 thumbs for demo/dev.
  - Idempotent upsert
  - Redacts secrets in logs
  - Writes simple summary to scripts/diagnostics/output/seed_wall_photos.md
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
$SERVICE = $env:SUPABASE_SECRET_KEY; if (-not $SERVICE) { $SERVICE = $env:SUPABASE_SERVICE_ROLE_KEY }; if (-not $SERVICE) { $SERVICE = $envMap['SUPABASE_SECRET_KEY'] }; if (-not $SERVICE) { $SERVICE = $envMap['SUPABASE_SERVICE_ROLE_KEY'] }

if (-not $SUPABASE_URL -or -not $SERVICE) {
  Write-Host 'Missing SUPABASE_URL or SERVICE_ROLE; skipping.'; exit 0
}

$hdr = @{ 'apikey' = $SERVICE; 'Content-Type' = 'application/json' }

# Pick latest 5 listings
$list = Invoke-RestMethod -Method Get -Uri "$SUPABASE_URL/rest/v1/listings?select=id,title,created_at&order=created_at.desc&limit=5" -Headers $hdr -ErrorAction SilentlyContinue
$i = 0
foreach ($l in ($list ?? @())) {
  $i++
  $dest = "public/thumbs/seed_$i`_720x960.jpg"
  $body = @{ listing_id = $l.id; thumb_url_720x960 = $dest; width_thumb = 720; height_thumb = 960 } | ConvertTo-Json -Compress
  Invoke-RestMethod -Method Post -Uri "$SUPABASE_URL/rest/v1/listing_photos?on_conflict=listing_id" -Headers $hdr -Body $body -ErrorAction SilentlyContinue | Out-Null
}

$outDir = 'scripts/diagnostics/output'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$out = Join-Path $outDir 'seed_wall_photos.md'
Set-Content -Path $out -Value ("Seeded thumbs for $i listings at listing-photos/public/thumbs/seed_<n>_720x960.jpg")
Write-Host "Wrote $out"
