Param(
  [switch]$SkipRefresh
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg){ Write-Host $msg -ForegroundColor Cyan }
function Write-Warn($msg){ Write-Host $msg -ForegroundColor Yellow }
function Write-Err($msg){ Write-Host $msg -ForegroundColor Red }

# Resolve repo root and .env
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$envPath  = Join-Path $repoRoot '.env'
if (-not (Test-Path $envPath)) { throw ".env not found: $envPath" }

# Load .env (simple KEY=VALUE parser; ignores comments/blank)
$envMap = @{}
Get-Content $envPath | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
    $parts = $line.Split('=',2)
    $k = $parts[0].Trim()
    $v = $parts[1].Trim()
    $envMap[$k] = $v
  }
}

# Derive PG connection envs (prefer explicit SUPABASE_DB_*; fallback from SUPABASE_URL)
if ($envMap.ContainsKey('SUPABASE_DB_HOST')) { $env:PGHOST = $envMap['SUPABASE_DB_HOST'] }
if ($envMap.ContainsKey('SUPABASE_DB_PORT')) { $env:PGPORT = $envMap['SUPABASE_DB_PORT'] }
if ($envMap.ContainsKey('SUPABASE_DB_USER')) { $env:PGUSER = $envMap['SUPABASE_DB_USER'] }
if ($envMap.ContainsKey('SUPABASE_DB_NAME')) { $env:PGDATABASE = $envMap['SUPABASE_DB_NAME'] }
if ($envMap.ContainsKey('SUPABASE_DB_PASSWORD')) { $env:PGPASSWORD = $envMap['SUPABASE_DB_PASSWORD'] }

# Fallbacks from SUPABASE_URL if any missing
if (-not $env:PGHOST -and $envMap.ContainsKey('SUPABASE_URL')) {
  # SUPABASE_URL like https://<ref>.supabase.co
  try {
    $u = [Uri]$envMap['SUPABASE_URL']
    if ($u.Host -match '^(?<ref>[^\.]+)\.supabase\.co$') {
      $proj = $Matches['ref']
      $env:PGHOST = "db.$proj.supabase.co"
    }
  } catch {}
}
if (-not $env:PGPORT)    { $env:PGPORT    = '5432' }
if (-not $env:PGUSER)    { $env:PGUSER    = 'postgres' }
if (-not $env:PGDATABASE){ $env:PGDATABASE= 'postgres' }

if (-not $env:PGHOST -or -not $env:PGPASSWORD) {
  throw 'Missing PGHOST or PGPASSWORD. Ensure SUPABASE_DB_* or SUPABASE_URL and SUPABASE_DB_PASSWORD are set in .env.'
}

# Ensure psql exists
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw 'psql not found on PATH. Install PostgreSQL client or add psql to PATH.'
}

Write-Info ("Connecting host={0} db={1} user={2}" -f $env:PGHOST,$env:PGDATABASE,$env:PGUSER)

function Invoke-PsqlCmd([string]$Sql){
  & psql -X -v ON_ERROR_STOP=1 -c $Sql | Out-Host
}

# Detect whether card_prices.condition exists to decide which index to create
$hasCondition = & psql -X -t -A -q -v ON_ERROR_STOP=1 -c "select exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prices' and column_name='condition');"
$hasCondition = ($hasCondition.Trim() -eq 't')

Write-Info 'Creating indexes concurrently on public.card_prices...'

if ($hasCondition) {
  Invoke-PsqlCmd "create index concurrently if not exists idx_cp_print_cond_time on public.card_prices (card_print_id, condition, last_updated desc) include (low, mid, high, currency, source);"
}
else {
  Write-Warn 'Column public.card_prices.condition not found; skipping idx_cp_print_cond_time.'
}

Invoke-PsqlCmd "create index concurrently if not exists idx_cp_print_time on public.card_prices (card_print_id, last_updated desc) include (low, mid, high, currency, source);"
Invoke-PsqlCmd "create index concurrently if not exists idx_cp_last_updated on public.card_prices (last_updated desc);"

Write-Info "`nVerifying indexes on public.card_prices..."
& psql -X -v ON_ERROR_STOP=1 -c "select indexname, indexdef from pg_indexes where schemaname='public' and tablename='card_prices' order by indexname;" | Out-Host

# Optional: refresh MV if it exists (and function present), unless user opted to skip
if (-not $SkipRefresh) {
  $hasMv = & psql -X -t -A -q -v ON_ERROR_STOP=1 -c "select to_regclass('public.latest_card_prices_mv') is not null;"
  if ($hasMv.Trim() -eq 't') {
    Write-Info "Refreshing materialized view public.latest_card_prices_mv..."
    # Prefer function if it exists; else attempt concurrent refresh with fallback
    $hasFn = & psql -X -t -A -q -v ON_ERROR_STOP=1 -c "select exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='refresh_latest_card_prices_mv');"
    if ($hasFn.Trim() -eq 't') {
      Invoke-PsqlCmd "select public.refresh_latest_card_prices_mv();"
    } else {
      try {
        Invoke-PsqlCmd "refresh materialized view concurrently public.latest_card_prices_mv;"
      } catch {
        Write-Warn 'CONCURRENTLY refresh failed or unsupported; trying non-concurrent refresh.'
        Invoke-PsqlCmd "refresh materialized view public.latest_card_prices_mv;"
      }
    }
  } else {
    Write-Warn 'Materialized view public.latest_card_prices_mv not found; skipping refresh.'
  }
} else {
  Write-Warn 'SkipRefresh set; not refreshing materialized view.'
}

Write-Info '\nDone.'

