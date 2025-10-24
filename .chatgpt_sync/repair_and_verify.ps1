# .chatgpt_sync\repair_and_verify.ps1
# Smart migration repair: parse CLI suggestions, loop until stable, then REST verify.

param(
  [string]$ProjectRef = "ycdxbpibncqcchqiihfz",
  [string]$EnvPath = ".env",
  [int]$MaxLoops = 6
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Info($m){ Write-Host "[INFO] $m" }
function Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Err ($m){ Write-Host "[ERR ] $m" -ForegroundColor Red }

Set-Location "C:\grookai_vault"

# Ensure linked
Info "Linking to Supabase project $ProjectRef"
supabase link --project-ref $ProjectRef | Out-Null

# Helper: run a supabase cmd, return stdout+stderr joined
function Run-Cmd([string]$cmd, [string[]]$args) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName  = $cmd
  $psi.Arguments = ($args -join ' ')
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError  = $true
  $psi.UseShellExecute        = $false
  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi
  [void]$p.Start()
  $out = $p.StandardOutput.ReadToEnd()
  $err = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  return ($out + "`n" + $err)
}

# Parse lines like:
# supabase migration repair --status reverted 20250916
# supabase migration repair --status applied 20251022180000
function Parse-Repairs([string]$text) {
  $repairs = @()
  $regex = [regex]'supabase\s+migration\s+repair\s+--status\s+(reverted|applied)\s+(\d{4,})'
  foreach ($m in $regex.Matches($text)) {
    $status = $m.Groups[1].Value
    $ver    = $m.Groups[2].Value
    $repairs += "--status $status $ver"
  }
  # de-dupe while preserving order
  $seen = @{}
  $unique = @()
  foreach ($r in $repairs) {
    if (-not $seen.ContainsKey($r)) { $seen[$r]=$true; $unique += $r }
  }
  return $unique
}

# Attempt to converge migration history.
for ($i=1; $i -le $MaxLoops; $i++) {
  Info "Loop $i/$MaxLoops: supabase db pull"
  $pullOut = Run-Cmd "supabase" @("db","pull")
  if ($pullOut -match "The remote database's migration history does not match") {
    $todo = Parse-Repairs $pullOut
    if ($todo.Count -eq 0) {
      Warn "No repair suggestions found in db pull output; continuing."
    } else {
      foreach ($r in $todo) {
        Info "Repair: supabase migration repair $r"
        try { Run-Cmd "supabase" @("migration","repair") + " $r" | Out-Null } catch { Warn "Repair failed or already set: $r" }
      }
    }
  } else {
    Info "db pull OK"
  }

  Info "Loop $i/$MaxLoops: supabase db push"
  $pushOut = Run-Cmd "supabase" @("db","push")
  if ($pushOut -match "Remote migration versions not found") {
    $todo = Parse-Repairs $pushOut
    if ($todo.Count -eq 0) {
      Warn "No repair suggestions found in db push output."
    } else {
      foreach ($r in $todo) {
        Info "Repair: supabase migration repair $r"
        try { Run-Cmd "supabase" @("migration","repair") + " $r" | Out-Null } catch { Warn "Repair failed or already set: $r" }
      }
      # next loop will try again
      continue
    }
  } else {
    Info "db push OK"
    break
  }

  if ($i -eq $MaxLoops) {
    Err "Exceeded max repair attempts; manual check needed."
    break
  }
}

# Load .env for REST verify
if (-not (Test-Path $EnvPath)) { Err "Missing $EnvPath; cannot verify REST."; exit 1 }
$dotenv = Get-Content $EnvPath -Raw
$SUPABASE_URL = ($dotenv -split "`n" | Where-Object { $_ -match '^\s*SUPABASE_URL=(.+)$' } | ForEach-Object { $Matches[1].Trim() }) | Select-Object -First 1
$ANON         = ($dotenv -split "`n" | Where-Object { $_ -match '^\s*SUPABASE_ANON_KEY=(.+)$' } | ForEach-Object { $Matches[1].Trim() }) | Select-Object -First 1

if (-not $SUPABASE_URL -or -not $ANON) { Err "Missing SUPABASE_URL or SUPABASE_ANON_KEY in $EnvPath"; exit 1 }

# REST verify
$rest = ($SUPABASE_URL.TrimEnd('/')) + "/rest/v1/latest_card_prices_v?select=card_print_id&limit=1"
Info "Verifying REST: $rest"
try {
  $headers = @{ "apikey" = $ANON; "Authorization" = "Bearer $ANON" }
  $res = Invoke-WebRequest -Uri $rest -Headers $headers -Method GET -ErrorAction Stop
  if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 300) {
    Info "✅ REST view reachable. Status=$($res.StatusCode). latest_card_prices_v is available."
  } else {
    Err "REST responded Status=$($res.StatusCode). Check RLS/privs."
    exit 1
  }
} catch {
  Err "REST verify failed: $($_.Exception.Message)"
  exit 1
}

Info "Done."
