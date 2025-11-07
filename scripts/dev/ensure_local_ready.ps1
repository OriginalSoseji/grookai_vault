param(
  [Parameter()][string]$RepoRoot = (Get-Location).Path,
  [switch]$Strict
)

$ErrorActionPreference = 'Stop'

function Log($msg){ Write-Host ("ENSURE_LOCAL_READY: {0}" -f $msg) }

# Paths
$migrationsDir = Join-Path $RepoRoot 'supabase\migrations'
$stateDir = Join-Path $RepoRoot '.gv_local'
$hashFile = Join-Path $stateDir 'migrations.hash'
$seedFile = Join-Path $RepoRoot 'supabase\seed\dev\seed_basic.sql'

if (!(Test-Path $stateDir)) { New-Item -ItemType Directory -Path $stateDir | Out-Null }

# Compute checksum of migration files (path + contents)
function Get-MigrationsHash([string]$dir){
  if (!(Test-Path $dir)) { return '' }
  $files = Get-ChildItem $dir -Recurse -Include *.sql | Sort-Object FullName
  $acc = ''
  foreach ($f in $files){
    $acc += ($f.FullName + "`n")
    $acc += (Get-Content $f.FullName -Raw)
    $acc += "`n"
  }
  if ($acc -eq '') { return '' }
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($acc)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $hash = $sha.ComputeHash($bytes)
  -join ($hash | ForEach-Object { $_.ToString('x2') })
}

$currentHash = Get-MigrationsHash $migrationsDir
$previousHash = if (Test-Path $hashFile) { (Get-Content $hashFile -Raw).Trim() } else { '' }

# Utility: psql invocation (local dev defaults)
function Invoke-PSql([string]$sql){
  $psql = Get-Command psql -ErrorAction SilentlyContinue
  if (-not $psql) { return $null }
  $env:PGPASSWORD = 'postgres'
  & psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -Atc $sql 2>$null
}

# Check schema health using psql when available
$needReset = $false
$listingsExists = $false
$listingsHasRow = $false
$feedExists = $false

$psqlOk = $false
try {
  $r = Invoke-PSql "select exists (select 1 from information_schema.tables where table_schema='public' and table_name='listings');"
  if ($r -ne $null) {
    $psqlOk = $true
    $listingsExists = ($r -match 't')
    if ($listingsExists) {
      $row = Invoke-PSql "select exists (select 1 from public.listings limit 1);"
      $listingsHasRow = ($row -match 't')
    }
    $f = Invoke-PSql "select exists (select 1 from information_schema.views where table_schema='public' and table_name='wall_feed_view');"
    $feedExists = ($f -match 't')
    # Try refreshing MV if present (best-effort)
    $mv = Invoke-PSql "select exists (select 1 from pg_matviews where schemaname='public' and matviewname='wall_thumbs_3x4');"
    if ($mv -match 't') { Invoke-PSql "refresh materialized view public.wall_thumbs_3x4;" | Out-Null }
  }
} catch { }

if (-not $psqlOk) {
  Log 'psql not found; falling back to REST-only checks.'
}

# Decision logic
if ($currentHash -ne $previousHash) { $needReset = $true; Log 'migrations checksum changed -> will reset' }
if ($psqlOk -and -not $listingsExists) { $needReset = $true; Log 'public.listings missing -> will reset' }
if ($psqlOk -and $listingsExists -and -not $listingsHasRow) { Log 'public.listings empty (will seed)'; }

if ($needReset) {
  Log 'RESET+SEED starting'
  & cmd /c "supabase db reset --force >nul 2>&1"
  if ($LASTEXITCODE) { Log 'supabase db reset failed'; exit 1 }
  if (Test-Path $seedFile) {
    $env:PGPASSWORD = 'postgres'
    & psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f $seedFile
    if ($LASTEXITCODE) { Log 'seed SQL failed'; exit 1 }
  } else {
    Log 'seed file missing; skipping seed'
  }
  Set-Content -Path $hashFile -Value $currentHash
  Log 'RESET+SEED done'
} else {
  Log 'SKIP (schema & migrations unchanged)'
}

# Smoke via REST
$st = & cmd /c "supabase status 2>&1"
$base = ($st | Select-String -Pattern 'API URL:\s*(\S+)' -AllMatches).Matches.Groups[1].Value | Select-Object -First 1
$anon = ($st | Select-String -Pattern 'Publishable key:\s*(\S+)' -AllMatches).Matches.Groups[1].Value | Select-Object -First 1
if (-not $base) { $base = 'http://127.0.0.1:54321' }

$env:SUPABASE_ANON_KEY = $anon

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'scripts\dev\http_get.ps1') -Url ("$base/rest/v1/listings?select=id&limit=1") | Out-Null
if ($LASTEXITCODE) { Log 'Smoke FAIL: listings empty or unreachable'; exit 1 }

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'scripts\dev\http_get.ps1') -Url ("$base/rest/v1/wall_feed_view?select=listing_id&limit=1") | Out-Null
if ($LASTEXITCODE) {
  if ($Strict) { Log 'Smoke FAIL (Strict): wall_feed_view empty or absent'; exit 1 }
  else { Log 'Smoke WARN: wall_feed_view empty or absent' }
} else { Log 'Smoke OK: feed has data' }

# Local device conveniences when GV_ENV=local
if ($gvEnv -eq 'local') {
  Log 'Local mode: attempting ADB reverse (54321,54322) and ensuring test user'
  function Resolve-AdbPath {
    $cmd = Get-Command adb -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Path }
    $candidates = @()
    if ($env:ANDROID_SDK_ROOT) { $candidates += (Join-Path $env:ANDROID_SDK_ROOT 'platform-tools/adb.exe') }
    if ($env:ANDROID_HOME) { $candidates += (Join-Path $env:ANDROID_HOME 'platform-tools/adb.exe') }
    $candidates += (Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe')
    foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
    return $null
  }
  $adb = Resolve-AdbPath
  if ($adb) {
    try { & $adb devices | Out-Null } catch { }
    try { & $adb -s R5CY71V9ETR reverse tcp:54321 tcp:54321 | Out-Null } catch { }
    try { & $adb -s R5CY71V9ETR reverse tcp:54322 tcp:54322 | Out-Null } catch { }
  } else {
    Log 'ADB not found; skipping reverse (set ANDROID_SDK_ROOT to enable)'
  }
  $fix = Join-Path $RepoRoot 'scripts\auth\local_login_fix.ps1'
  if (Test-Path $fix) {
    try { & powershell -NoProfile -ExecutionPolicy Bypass -File $fix -DeviceId R5CY71V9ETR -Email 'tester@grookai.local' -Password 'Test1234!' | Out-Null } catch { Log "local_login_fix.ps1 warning: $($_.Exception.Message)" }
  } else {
    Log 'local_login_fix.ps1 not found; skipping test-user ensure'
  }
}

exit 0
$gvEnv = 'local'
try {
  $envLocal = Join-Path $RepoRoot '.env.local'
  if (Test-Path $envLocal) {
    $lines = Get-Content $envLocal
    $maybe = ($lines | ? { $_ -match '^GV_ENV=' } | % { ($_ -split '=',2)[1] })
    if ($maybe) { $gvEnv = $maybe.Trim() }
  }
} catch { }

