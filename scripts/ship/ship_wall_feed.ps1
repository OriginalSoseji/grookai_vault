param()
$ErrorActionPreference = 'Stop'

function Root { (git rev-parse --show-toplevel) }
Set-Location (Root)

$outDir = "scripts/diagnostics/output"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$ts = (Get-Date).ToString('yyyyMMdd_HHmmss')

$pull1Log = Join-Path $outDir ("ship_pull_1_" + $ts + ".log")
$pull2Log = Join-Path $outDir ("ship_pull_2_" + $ts + ".log")
$repairLog = Join-Path $outDir ("ship_repair_" + $ts + ".log")
$preflightLog = Join-Path $outDir ("ship_preflight_" + $ts + ".log")
$pushLog = Join-Path $outDir ("ship_push_" + $ts + ".log")
$seedLog = Join-Path $outDir ("seed_wall_photos_" + $ts + ".log")

function Info($m){ Write-Host ("[ship_wall_feed] " + $m) }

# Shell alignment
$shellExe = $(if (Get-Command pwsh -ErrorAction SilentlyContinue) { 'pwsh' } else { 'powershell' })

# Load .env
function Load-DotEnv {
  $map=@{}
  if (Test-Path ".env") {
    Get-Content .env | ?{ $_ -match '=' -and -not $_.Trim().StartsWith('#') } | %{
      $p=$_.Split('=',2); if($p.Length -eq 2){ $map[$p[0].Trim()]=$p[1].Trim() }
    }
  }
  return $map
}
$envMap = Load-DotEnv

# Force default CLI profile and neutralize stray temp profile
try {
  $tmpProf = Join-Path (Join-Path 'supabase' '.temp') 'profile'
  if (Test-Path $tmpProf) { Remove-Item -Force $tmpProf }
} catch {}
$env:SUPABASE_CONFIG_DIR = ""

# Redaction
function Redact([string]$s){
  if (-not $s) { return $s }
  $r = $s
  $r = [regex]::Replace($r, '://([^:@]+):([^@]+)@', '://$1:***@')
  foreach($k in @('SUPABASE_ACCESS_TOKEN','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY')){
    if ($envMap[$k]) { $r = $r.Replace($envMap[$k],'***') }
  }
  return $r
}
function LogAppend($path,[string]$text){ Add-Content -Path $path -Value (Redact($text)) }

# Preconditions
$token = $envMap['SUPABASE_ACCESS_TOKEN']
$projectRef = $envMap['SUPABASE_PROJECT_REF']
if (-not $token) { Write-Host "Missing SUPABASE_ACCESS_TOKEN in .env â€” add it and rerun the Ship task." -ForegroundColor Yellow; exit 1 }
if (-not $projectRef) {
  # Fallback try parse from SUPABASE_URL
  $url = $envMap['SUPABASE_URL']
  if ($url -and $url -match 'https://([^.]+)\.supabase\.co') { $projectRef = $Matches[1] }
  if (-not $projectRef) { Write-Host "Missing SUPABASE_PROJECT_REF in .env â€” add it and rerun." -ForegroundColor Yellow; exit 1 }
}

# Auth bootstrap (non-interactive)
try { supabase --profile supabase logout 2>&1 | Out-Null } catch {}
try { supabase --profile supabase login --token $token 2>&1 | ForEach-Object { LogAppend $pushLog $_ } } catch { LogAppend $pushLog ("login EXC: " + $_.Exception.Message) }

# Project link
$linkedRef = $null
if (Test-Path ".supabase/config.json") {
  try { $cfg = Get-Content -Raw ".supabase/config.json" | ConvertFrom-Json; $linkedRef = $cfg.project_ref } catch {}
}
if (-not $linkedRef -or $linkedRef -ne $projectRef) {
  Info "Linking project $projectRef"
  supabase --profile supabase link --project-ref $projectRef 2>&1 | ForEach-Object { LogAppend $pushLog $_ }
}

# Connectivity preflight
$dbUrl = $null
if ($envMap['SUPABASE_DB_URL']) { $dbUrl = $envMap['SUPABASE_DB_URL'] }
elseif ($envMap['POSTGRES_URL']) { $dbUrl = $envMap['POSTGRES_URL'] }
if ($dbUrl) {
  $dbHost = $null
  if ($dbUrl -match '://[^/]+@([^:/]+)') { $dbHost=$Matches[1] } elseif ($dbUrl -match '://([^:/]+)'){ $dbHost=$Matches[1] }
  LogAppend $preflightLog ("=== PREFLIGHT " + (Get-Date).ToString('s'))
  try {
    $tnc = Test-NetConnection $dbHost -Port 5432 -WarningAction SilentlyContinue
    LogAppend $preflightLog ("TNC TcpTestSucceeded={0} RemoteAddress={1}" -f $tnc.TcpTestSucceeded, $tnc.RemoteAddress)
    if (-not $tnc.TcpTestSucceeded) { Write-Host "Preflight failed: TCP 5432 not reachable to $dbHost (see $preflightLog)" -ForegroundColor Yellow; exit 1 }
  } catch { LogAppend $preflightLog ("TNC ERROR: " + $_.Exception.Message) }
  if (Get-Command psql -ErrorAction SilentlyContinue) {
    try { $ps = (& psql -X -q "$dbUrl" -c "select 1" 2>&1) | Out-String; LogAppend $preflightLog ("psql: " + $ps) } catch { LogAppend $preflightLog ("psql ERROR: " + $_.Exception.Message) }
  }
}

# Phase A/B - drift repair from finish_option_a logic (harvest reverted hints)
function Pull-Capture($path){ try { $out=(supabase --profile supabase db pull 2>&1) | Out-String } catch { $out=$_.Exception.Message }; Set-Content -Path $path -Value (Redact($out)); return $out }
function Parse-RevertedIds([string]$text){ $ids=@(); foreach($line in ($text -split "`n")){ $m=[regex]::Match($line,'repair --status reverted\s+([0-9]+)'); if($m.Success){ $ids+=$m.Groups[1].Value.Trim() } }; $seen=@{}; $o=@(); foreach($id in $ids){ if(-not $seen.ContainsKey($id)){ $seen[$id]=$true; $o+=$id } }; return ,$o }
function Repair-Ids([string[]]$ids){ $batch=8; for($i=0;$i -lt $ids.Count;$i+=$batch){ $seg=$ids[$i..([Math]::Min($i+$batch-1,$ids.Count-1))]; foreach($id in $seg){ try { LogAppend $repairLog ("repair reverted " + $id); supabase --profile supabase migration repair --status reverted $id 2>&1 | ForEach-Object { LogAppend $repairLog $_ } } catch { LogAppend $repairLog ("EXC: " + $_.Exception.Message) }; Start-Sleep -Milliseconds 350 }; Start-Sleep -Seconds 4 } }

Info "Phase A/B: repairing drift (up to 3 passes)"
$okAB=$true; $max=3
for($pass=1;$pass -le $max;$pass++){
  $log = if ($pass -eq 1) { $pull1Log } else { $pull2Log }
  $pull = Pull-Capture $log
  $ids = Parse-RevertedIds $pull
  if ($ids.Count -eq 0) { break }
  Repair-Ids $ids
}

# Ensure wall migration present
$restored=$false
$archives = Get-ChildItem -Directory "supabase/migrations" | ?{ $_.Name -like '_archive_local_*' } | Sort-Object Name -Descending
if ($archives.Count -gt 0) {
  $src = Join-Path $archives[0].FullName "20251103_wall_feed_view.sql"
  if (Test-Path $src) { Copy-Item -Force -Path $src -Destination "supabase/migrations/20251103_wall_feed_view.sql"; $restored=$true }
}
if (-not $restored) {
  Set-Content -Path "supabase/migrations/20251103_wall_feed_view.sql" -Value "-- PLACEHOLDER: wall feed migration expected here. Not generated automatically.`n-- Add your wall_feed view/RPC SQL and rerun the ship task."
  Write-Host "Wall migration not found; created placeholder at supabase/migrations/20251103_wall_feed_view.sql" -ForegroundColor Yellow
  exit 1
}

# Hardened push (reuse finish_option_a Phase C)
Info "Phase C: hardened push"
& $shellExe -NoProfile -File scripts/diagnostics/finish_option_a.ps1 -Phase C
if ($LASTEXITCODE -ne 0) { Write-Host "Push failed (see logs in $outDir)." -ForegroundColor Yellow; exit 1 }

# Phase D: Inspect â†’ Seed â†’ Verify
Info "Phase D: inspect â†’ seed â†’ verify"
& $shellExe -NoProfile -File scripts/diagnostics/inspect_wall_feed.ps1
$env:DEMO_SEED = "true"
& $shellExe -NoProfile -File scripts/tools/seed_wall_photos.ps1 2>&1 | ForEach-Object { LogAppend $seedLog $_ }
& $shellExe -NoProfile -File scripts/diagnostics/verify_wall_feed.ps1

$verify = Join-Path $outDir 'wall_feed_verification.md'
$pass = $false
if (Test-Path $verify) {
  $txt = Get-Content -Raw $verify
  if ($txt -match 'PASS') { $pass = $true }
}

if ($pass) {
  Write-Host "DONE â€” Wall feed shipped. Artifacts:" -ForegroundColor Green
  Write-Host " - inspect: scripts/diagnostics/output/wall_feed_inspect.md"
  Write-Host " - seed:    $seedLog"
  Write-Host " - verify:  scripts/diagnostics/output/wall_feed_verification.md"
  exit 0
} else {
  Write-Host "FAILED â€” Check logs and artifacts:" -ForegroundColor Yellow
  Write-Host " - preflight: (latest) db_preflight_*.log"
  Write-Host " - push:      (latest) db_push_*.log"
  Write-Host " - inspect:   scripts/diagnostics/output/wall_feed_inspect.md"
  Write-Host " - verify:    scripts/diagnostics/output/wall_feed_verification.md"
  exit 1
}



