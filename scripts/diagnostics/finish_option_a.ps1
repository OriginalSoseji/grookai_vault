param(
  [string]$Phase
)
$ErrorActionPreference = 'Stop'

function Root { (git rev-parse --show-toplevel) }
Set-Location (Root)

$outDir = "scripts/diagnostics/output"
$repairDir = "supabase/_repair"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
New-Item -ItemType Directory -Force -Path $repairDir | Out-Null

$ts = (Get-Date).ToString('yyyyMMdd_HHmmss')
$pull1Log = Join-Path $outDir ("pull_attempt_1_" + $ts + ".log")
$pull2Log = Join-Path $outDir ("pull_attempt_2_" + $ts + ".log")
$repairLog = Join-Path $outDir ("repair_" + $ts + ".log")
$pushLog = Join-Path $outDir ("db_push_" + $ts + ".log")
$preflightLog = Join-Path $outDir ("db_preflight_" + $ts + ".log")
$idsFile = Join-Path $repairDir "remote_versions.txt"

function Write-Info($msg){ Write-Host ("[finish_option_a] " + $msg) }

# Force default CLI profile and neutralize stray temp profile
try {
  $tmpProf = Join-Path (Join-Path 'supabase' '.temp') 'profile'
  if (Test-Path $tmpProf) { Remove-Item -Force $tmpProf }
} catch {}
$env:SUPABASE_CONFIG_DIR = ""

# --- Preconditions: detect project ref and DB URL
$projRef = $null
try {
  if (Test-Path ".supabase/config.json") {
    $cfg = Get-Content -Raw ".supabase/config.json" | ConvertFrom-Json -ErrorAction Stop
    if ($cfg.project_ref) { $projRef = $cfg.project_ref }
  }
} catch {}
if (-not $projRef) {
  # Fallback to SUPABASE_URL parsing
  if (Test-Path ".env") {
    $line = (Get-Content .env | Where-Object { $_ -match '^SUPABASE_URL=' } | Select-Object -First 1)
    if ($line -and $line -match 'https://([^.]+)\.supabase\.co') { $projRef = $Matches[1] }
  }
}
if (-not $projRef) {
  Write-Host "Project ref not found. Please run 'supabase link' first." -ForegroundColor Yellow
  exit 1
}

# --- Shell alignment
$shellExe = $(if (Get-Command pwsh -ErrorAction SilentlyContinue) { 'pwsh' } else { 'powershell' })

# --- Env normalization and selection
function Load-DotEnvMap {
  $map = @{}
  if (Test-Path ".env") {
    Get-Content .env | Where-Object { $_ -match '=' -and -not $_.Trim().StartsWith('#') } | ForEach-Object {
      $p = $_.Split('=',2); if ($p.Length -eq 2) { $map[$p[0].Trim()] = $p[1].Trim() }
    }
  }
  return $map
}

$envMap = Load-DotEnvMap
$dbUrlSupabase = $null; if ($env:SUPABASE_DB_URL) { $dbUrlSupabase = $env:SUPABASE_DB_URL } elseif ($envMap['SUPABASE_DB_URL']) { $dbUrlSupabase = $envMap['SUPABASE_DB_URL'] }
$dbUrlPostgres = $null; if ($env:POSTGRES_URL) { $dbUrlPostgres = $env:POSTGRES_URL } elseif ($envMap['POSTGRES_URL']) { $dbUrlPostgres = $envMap['POSTGRES_URL'] }
$DbUrl = $null
if ($dbUrlSupabase) { $DbUrl = $dbUrlSupabase }
elseif ($dbUrlPostgres) { $DbUrl = $dbUrlPostgres }
if ($dbUrlSupabase -and $dbUrlPostgres -and ($dbUrlSupabase -ne $dbUrlPostgres)) {
  Write-Host "Warning: SUPABASE_DB_URL and POSTGRES_URL differ. Using SUPABASE_DB_URL." -ForegroundColor Yellow
}

Write-Info
$directDb = $null
if ($env:SUPABASE_DIRECT_DB_URL) { $directDb = $env:SUPABASE_DIRECT_DB_URL } elseif ($envMap -and $envMap['SUPABASE_DIRECT_DB_URL']) { $directDb = $envMap['SUPABASE_DIRECT_DB_URL'] } elseif ($env:SUPABASE_DB_URL_DIRECT) { $directDb = $env:SUPABASE_DB_URL_DIRECT } elseif ($envMap -and $envMap['SUPABASE_DB_URL_DIRECT']) { $directDb = $envMap['SUPABASE_DB_URL_DIRECT'] } ("project_ref=$projRef  dbUrl=" + ($(if($DbUrl){'set'}else{'missing'})))

# --- Redaction helpers for logs
function Redact([string]$s){
  if (-not $s) { return $s }
  $r = $s
  # redact URL passwords
  $r = [regex]::Replace($r, '://([^:@]+):([^@]+)@', '://$1:***@')
  # redact JWT-like tokens (rough heuristic)
  if ($envMap['SUPABASE_ANON_KEY']) { $r = $r.Replace($envMap['SUPABASE_ANON_KEY'], '***') }
  if ($envMap['SUPABASE_SERVICE_ROLE_KEY']) { $r = $r.Replace($envMap['SUPABASE_SERVICE_ROLE_KEY'], '***') }
  return $r
}
function Append-Log($path, [string]$text){ Add-Content -Path $path -Value (Redact($text)) }

function Pull-Capture($path){
  try {
    if ($dbUrl) { $out = (supabase --profile supabase db pull --db-url $dbUrl 2>&1) | Out-String }
    else { $out = (supabase --profile supabase db pull 2>&1) | Out-String }
  } catch {
    $out = $_.Exception.Message + "`n"
  }
  Set-Content -Path $path -Value $out
  return $out
}

function Parse-RevertedIds([string]$text){
  $list = New-Object System.Collections.ArrayList
  foreach($line in ($text -split "`n")){
    $m = [regex]::Match($line,'repair --status reverted\s+([0-9]+)')
    if ($m.Success) {
      [void]$list.Add($m.Groups[1].Value.Trim())
    }
  }
  # Dedupe while preserving order
  $seen = @{}
  $out = @()
  foreach($id in $list){ if (-not $seen.ContainsKey($id)) { $seen[$id]=$true; $out += $id } }
  return ,$out
}

function Repair-Ids([string[]]$ids){
  if (-not $ids -or $ids.Count -eq 0) { return }
  $batchSize = 8
  for($i=0; $i -lt $ids.Count; $i+=$batchSize){
    $batch = $ids[$i..([Math]::Min($i+$batchSize-1,$ids.Count-1))]
    foreach($id in $batch){
      try {
        $line = "supabase --profile supabase migration repair --status reverted $id"
        Add-Content -Path $repairLog -Value ("$((Get-Date).ToString('s')) $line")
        if ($dbUrl) { supabase --profile supabase migration repair --status reverted $id --db-url $dbUrl 2>&1 | Add-Content -Path $repairLog }
        else { supabase --profile supabase migration repair --status reverted $id 2>&1 | Add-Content -Path $repairLog }
      } catch {
        Add-Content -Path $repairLog -Value ("$((Get-Date).ToString('s')) ERROR: " + $_.Exception.Message)
      }
      Start-Sleep -Milliseconds 350
    }
    Start-Sleep -Seconds 4
  }
}

# --- Phase A: collect reverted hints
if (-not $Phase -or ($Phase -ne 'C')) {
Write-Info "Phase A: collecting reverted hints from db pull"
$pull1 = Pull-Capture $pull1Log
$ids = Parse-RevertedIds $pull1
if ($ids.Count -gt 0) {
  Write-Info ("Found reverted IDs: " + ($ids -join ', '))
  Set-Content -Path $idsFile -Value ($ids -join "`n")
} else {
  Write-Info "No reverted hints found in pull_attempt_1."
}

# --- Phase B: apply repairs in up to 3 passes
$maxPasses = 3
$pass = 0
while ($pass -lt $maxPasses) {
  $pass++
  if (-not (Test-Path $idsFile)) { break }
  $cur = Get-Content $idsFile | Where-Object { $_ -match '^[0-9]+' }
  if (-not $cur -or $cur.Count -eq 0) { break }
  Write-Info ("Phase B: repairing batch (pass $pass) IDs=" + ($cur -join ','))
  Repair-Ids $cur
  $pull2 = Pull-Capture $pull2Log
  $more = Parse-RevertedIds $pull2
  if ($more.Count -eq 0) { break }
  # Merge & dedupe
  $merged = New-Object System.Collections.ArrayList
  foreach($x in ($cur + $more)) { if (-not $merged.Contains($x)) { [void]$merged.Add($x) } }
  Set-Content -Path $idsFile -Value ($merged -join "`n")
}

if (Test-Path $idsFile) {
  $left = Get-Content $idsFile | Where-Object { $_ -match '^[0-9]+' }
  if ($left.Count -gt 0 -and $pass -ge $maxPasses) {
    Write-Host "Unresolved reverted hints after $maxPasses passes. See logs at: $pull1Log, $pull2Log, $repairLog" -ForegroundColor Yellow
    exit 2
  }
}
} # end if Phase != C

# --- Phase C: restore wall-feed migration and push
Write-Info "Phase C: restoring wall-feed migration and pushing"
$migs = Get-ChildItem -Directory "supabase/migrations" | Where-Object { $_.Name -like '_archive_local_*' } | Sort-Object Name -Descending
$restored = $false
if ($migs.Count -gt 0) {
  $latest = $migs[0]
  $candidate = Join-Path $latest.FullName "20251103_wall_feed_view.sql"
  if (Test-Path $candidate) {
    Copy-Item -Force -Path $candidate -Destination "supabase/migrations/20251103_wall_feed_view.sql"
    $restored = $true
    Write-Info ("Restored migration from: " + $candidate)
  }
}
if (-not $restored) {
  $ph = @(
    "-- PLACEHOLDER: wall feed migration expected here. Not generated automatically.",
    "-- Add your wall_feed view/RPC SQL and re-run the task."
  )
  Set-Content -Path "supabase/migrations/20251103_wall_feed_view.sql" -Value ($ph -join "`n")
  Write-Host "Wall migration not found in archive; created placeholder at supabase/migrations/20251103_wall_feed_view.sql" -ForegroundColor Yellow
}

$cliTempDir = Join-Path 'supabase' '.temp'
try {
  New-Item -ItemType Directory -Force -Path $cliTempDir | Out-Null
  $cliProfile = Join-Path $cliTempDir 'profile'
  if (-not (Test-Path $cliProfile)) { New-Item -ItemType File -Path $cliProfile | Out-Null }
} catch {}

# Connectivity preflight
$dbHost = $null
if ($DbUrl -match '://[^/]+@([^:/]+)') { $dbHost = $Matches[1] }
elseif ($DbUrl -match '://([^:/]+)') { $dbHost = $Matches[1] }
if ($DbUrl -and $dbHost) {
  Append-Log $preflightLog ("=== PRELIGHT {0} ===" -f (Get-Date).ToString('s'))
  try {
    $tnc = Test-NetConnection $dbHost -Port 5432 -WarningAction SilentlyContinue
    Append-Log $preflightLog ("TNC TcpTestSucceeded={0} RemoteAddress={1}" -f $tnc.TcpTestSucceeded, $tnc.RemoteAddress)
    if (-not $tnc.TcpTestSucceeded) { Write-Host "Preflight failed: TCP 5432 not reachable to $dbHost. See $preflightLog" -ForegroundColor Yellow; exit 3 }
  } catch { Append-Log $preflightLog ("TNC ERROR: " + $_.Exception.Message) }
  if (Get-Command psql -ErrorAction SilentlyContinue) {
    try {
      $psout = (& psql -X -q "$DbUrl" -c "select 1" 2>&1) | Out-String
      Append-Log $preflightLog ("psql: " + $psout)
      if (-not ($psout -match '1')) { Write-Host "Preflight failed: psql test did not return 1. See $preflightLog" -ForegroundColor Yellow; exit 3 }
    } catch { Append-Log $preflightLog ("psql ERROR: " + $_.Exception.Message); Write-Host "Preflight failed: psql error. See $preflightLog" -ForegroundColor Yellow; exit 3 }
  }
} elseif (-not $DbUrl) {
  if (-not $projRef) { Write-Host "Missing project_ref and DbUrl. Run 'supabase link' first." -ForegroundColor Yellow; exit 3 }
}

function Invoke-Push([string]$mode){
  $tries = 3; $delays = @(2,5,12)
  $ok = $false
  for($i=1; $i -le $tries; $i++){
    Append-Log $pushLog ("=== TRY #{0} ({1}) {2} ===" -f $i, $mode, (Get-Date).ToString('s'))
    $oldEap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    if ($mode -eq 'dburl' -and $DbUrl) { & supabase --profile supabase db push --db-url "$DbUrl" --debug 2>&1 | ForEach-Object { Append-Log $pushLog $_ } }
    elseif ($mode -eq 'linked') { & supabase --profile supabase db push --debug 2>&1 | ForEach-Object { Append-Log $pushLog $_ } }
    else { & supabase --profile supabase db push --debug 2>&1 | ForEach-Object { Append-Log $pushLog $_ } }
    $ErrorActionPreference = $oldEap
    # Check last lines for success cues (heuristic: absence of "ERROR:" and exit code 0)
    if ($LASTEXITCODE -eq 0) { $ok = $true; break }
    # Annotate known signatures
    $tail = Get-Content -Tail 50 $pushLog | Out-String
    if ($tail -match 'Unsupported or invalid secret format') { Append-Log $pushLog 'ANNOTATION: secret format/token drift' }
    if ($tail -match 'SASL' -or $tail -match 'password authentication failed') { Append-Log $pushLog 'ANNOTATION: auth failure (password/JWT)' }
    if ($tail -match 'Connecting to remote database' -and -not ($tail -match 'Applied')) { Append-Log $pushLog 'ANNOTATION: pooler handshake/timeout' }
    if ($i -lt $tries) { Start-Sleep -Seconds $delays[$i-1] }
  }
  return $ok
}

$modeUsed = $null
$okPush = $false
if ($DbUrl) { $okPush = Invoke-Push 'dburl'; $modeUsed = 'pooled-db-url' }
if (-not $okPush) {
  if ($directDb) { Append-Log $pushLog 'FALLBACK: trying direct DB URL'; $old=$DbUrl; $DbUrl=$directDb; $okPush = Invoke-Push 'dburl'; $DbUrl=$old; if ($okPush) { $modeUsed = 'direct-db-url' } }
  if (-not $okPush -and $projRef) { $okPush = Invoke-Push 'linked'; if ($okPush) { $modeUsed = 'linked-context' } }
}
if (-not $okPush) {
  Write-Host ("Push failed after retries. See log: " + $pushLog) -ForegroundColor Yellow
  exit 3
}
Write-Info ("Phase C succeeded using mode=" + $modeUsed)

# --- Phase D: verify end-to-end
Write-Info "Phase D: verify (inspect â†’ seed â†’ verify)"
try { & $shellExe -NoProfile -File scripts/diagnostics/inspect_wall_feed.ps1 | Out-Null } catch {}
$env:DEMO_SEED = "true"
try { & $shellExe -NoProfile -File scripts/tools/seed_wall_photos.ps1 2>&1 | Tee-Object -FilePath (Join-Path $outDir "seed_wall_photos_$ts.log") | Out-Null } catch {}
try { & $shellExe -NoProfile -File scripts/diagnostics/verify_wall_feed.ps1 | Out-Null } catch {}

# --- Summary
$summary = @()
$summary += "Finish Option A - Summary"
$summary += ("pull logs: {0}, {1}" -f $pull1Log, $pull2Log)
$summary += ("repair log: {0}" -f $repairLog)
$summary += ("push log: {0}" -f $pushLog)
$summary += "inspect: scripts/diagnostics/output/wall_feed_inspect.md"
$summary += "verify:  scripts/diagnostics/output/wall_feed_verification.md"
$summary += ("seed:    scripts/diagnostics/output/seed_wall_photos_{0}.log" -f $ts)
$summary | ForEach-Object { Write-Host $_ }

exit 0




