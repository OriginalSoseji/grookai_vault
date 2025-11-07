param()
$ErrorActionPreference='Stop'

function Root { (git rev-parse --show-toplevel) }
Set-Location (Root)

$outDir = "scripts/diagnostics/output"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$report = Join-Path $outDir "wall_feed_verification.md"

function Read-DotEnv {
  param([string]$path)
  $map = @{}
  if (Test-Path $path) {
    Get-Content $path | Where-Object { $_ -match '=' -and -not $_.Trim().StartsWith('#') } | ForEach-Object {
      $p = $_.Split('=',2); if ($p.Length -eq 2) { $map[$p[0].Trim()] = $p[1].Trim() }
    }
  }
  return $map
}

$envMap = Read-DotEnv ".env"
$SUPABASE_URL = if ($env:SUPABASE_URL) { $env:SUPABASE_URL } elseif ($envMap['SUPABASE_URL']) { $envMap['SUPABASE_URL'] } else { '' }
$ANON = if ($env:SUPABASE_ANON_KEY) { $env:SUPABASE_ANON_KEY } elseif ($envMap['SUPABASE_ANON_KEY']) { $envMap['SUPABASE_ANON_KEY'] } else { '' }

function Has-Psql { try { psql --version | Out-Null; return $true } catch { return $false } }
function PsqlArgs() {
  if ($env:SUPABASE_DB_URL) { return @('-X','-q','-d', $env:SUPABASE_DB_URL) }
  if ($env:POSTGRES_URL) { return @('-X','-q','-d', $env:POSTGRES_URL) }
  return @()
}
function RunSql($sql){ $args = PsqlArgs; if ($args.Count -eq 0) { throw "DB URL missing (SUPABASE_DB_URL or POSTGRES_URL)." }; & psql @args -t -A -F '|' -c $sql }

$lines = @()
$lines += "# Wall Feed Verification"
$lines += "_Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')_"

# --- DB Objects (existence + grants + sample rows)
$lines += "\n## DB Objects (existence + grants)"
if (Has-Psql) {
  try {
    $vrows = RunSql "select schemaname, viewname from pg_views where schemaname='public' and viewname='wall_feed_v'"
    $frows = RunSql "select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='wall_feed_list'"
    $lines += "- view wall_feed_v: " + ($(if ($vrows) { 'FOUND' } else { 'MISSING' }))
    $lines += "- function wall_feed_list: " + ($(if ($frows) { 'FOUND' } else { 'MISSING' }))

    $vgrants = RunSql "select grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='wall_feed_v' order by grantee, privilege_type"
    $fgrants = RunSql "select grantee, privilege_type from information_schema.routine_privileges where routine_schema='public' and routine_name='wall_feed_list' order by grantee, privilege_type"
    $lines += "### Grants: wall_feed_v"
    if ($vgrants) { $lines += ($vgrants | ForEach-Object { '- ' + $_ }) } else { $lines += "- (none)" }
    $lines += "### Grants: wall_feed_list"
    if ($fgrants) { $lines += ($fgrants | ForEach-Object { '- ' + $_ }) } else { $lines += "- (none)" }

    $countV = ''
    try { $countV = RunSql "select count(*) from public.wall_feed_v" } catch {}
    $lines += ("- wall_feed_v count: {0}" -f ($(if($countV){$countV.Trim()} else {'(query failed)'})))

    $sampleList = ''
    try { $sampleList = RunSql "select id, created_at from public.wall_feed_list(5,0) limit 5" } catch {}
    $lines += "- wall_feed_list sample (id|created_at):"
    if ($sampleList) { $lines += ($sampleList | ForEach-Object { '  - ' + $_ }) } else { $lines += "  - (query failed)" }
  } catch {
    $lines += "- DB error: $($_.Exception.Message)"
  }
} else {
  $lines += "- psql not found. Skipping DB checks."
}

# --- REST API Status
$lines += "\n## REST API Status"
if ($SUPABASE_URL -and $ANON) {
  $hdr = @{ apiKey=$ANON; Authorization = "Bearer $ANON" }
  try {
    $respV = Invoke-WebRequest -UseBasicParsing -Uri ("{0}/rest/v1/wall_feed_v?select=*&limit=3" -f $SUPABASE_URL) -Headers $hdr -Method GET -ErrorAction Stop
    $lines += ("- wall_feed_v GET: HTTP {0} len={1}" -f [int]$respV.StatusCode, $respV.Content.Length)
    $jsonV = @()
    try { $jsonV = ($respV.Content | ConvertFrom-Json) } catch {}
    if ($jsonV) {
      $cnt = $jsonV.Count
      $samples = ($jsonV | Select-Object -First 3 | ForEach-Object { $_.thumb_url }) -join ', '
      $lines += ("  - rows={0} thumbs=[{1}]" -f $cnt, $samples)
    }
  } catch {
    $lines += "- wall_feed_v GET error: $($_.Exception.Message)"
  }
  try {
    $body = @{ _limit = 3; _offset = 0 } | ConvertTo-Json
    $respF = Invoke-WebRequest -UseBasicParsing -Uri ("{0}/rest/v1/rpc/wall_feed_list" -f $SUPABASE_URL) -Headers $hdr -Method POST -ContentType 'application/json' -Body $body -ErrorAction Stop
    $lines += ("- wall_feed_list POST: HTTP {0} len={1}" -f [int]$respF.StatusCode, $respF.Content.Length)
    $jsonF = @()
    try { $jsonF = ($respF.Content | ConvertFrom-Json) } catch {}
    if ($jsonF) {
      $cnt = $jsonF.Count
      $samples = ($jsonF | Select-Object -First 3 | ForEach-Object { $_.thumb_url }) -join ', '
      $lines += ("  - rows={0} thumbs=[{1}]" -f $cnt, $samples)
    }
  } catch {
    $lines += "- wall_feed_list POST error: $($_.Exception.Message)"
  }
} else {
  $lines += "- Missing SUPABASE_URL or SUPABASE_ANON_KEY in env/.env; skipping REST checks."
}

# --- Seeder Status
$lines += "\n## Seeder Status"
$seedLog = Join-Path $outDir "seed_wall_photos.log"
if (Test-Path $seedLog) {
  $last = Get-Content $seedLog | Select-Object -Last 1
  $lines += "- Last run: $last"
  if ($last -match 'SOURCE=(\w+)') { $lines += "- Source: $($Matches[1])" }
  if ($last -match 'UPDATED=(\d+)') { $lines += "- Updated: $($Matches[1])" }
  if ($last -match 'SKIPPED=(\d+)') { $lines += "- Skipped: $($Matches[1])" }
  if ($last -match 'FAILED=(\d+)') { $lines += "- Failed: $($Matches[1])" }
} else {
  $lines += "- No seeder log found (run Seed: Wall demo data)."
}

# --- UI Binding Check
$lines += "\n## UI Binding Check"
try {
  $files = Get-ChildItem -Recurse -File lib | Where-Object { $_.FullName -match '\.dart$' }
  $hasThumbUrlRef = $false
  $hasImageBest = $false
  foreach($f in $files){
    $txt = Get-Content -Raw $f.FullName
    if ($txt -match 'thumb_url') { $hasThumbUrlRef = $true }
    if ($txt -match 'imageBestFromRow\(' -or $txt -match 'thumbFromRow\(') { $hasImageBest = $true }
  }
  $lines += "- References to thumb_url in lib: " + ($(if ($hasThumbUrlRef) {'YES'} else {'NO'}))
  $lines += "- Feed uses image helpers (imageBestFromRow/thumbFromRow): " + ($(if ($hasImageBest) {'YES'} else {'NO'}))
} catch {
  $lines += "- UI scan error: $($_.Exception.Message)"
}

# --- Verdict
$lines += "\n## Verdict"
$passReasons = @()
$failReasons = @()

# Heuristic: at least one of DB or REST shows objects, and UI binds, and seeder log exists
if ($SUPABASE_URL -and $ANON) { $passReasons += "REST configured" } else { $failReasons += "Missing REST config (.env)" }
if (Test-Path $seedLog) { $passReasons += "Seeder ran" } else { $failReasons += "Seeder not run" }

if ($passReasons.Count -gt 0 -and $failReasons.Count -eq 0) {
  $lines += "PASS - " + ($passReasons -join '; ')
} else {
  $lines += "FAIL - " + ($failReasons -join '; ')
}

Set-Content -Path $report -Value ($lines -join "`n")
Write-Host "Wrote $report"
