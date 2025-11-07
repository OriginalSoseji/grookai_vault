Param(
  [Parameter(Mandatory=$true)] [string]$DbHost,
  [string]$DbName = 'postgres',
  [string]$User = 'postgres',
  [Parameter(Mandatory=$true)] [string]$Password,
  [int]$Port = 5432
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step($m) { Write-Host "[STEP] $m" -ForegroundColor Cyan }
function Write-Ok($m)   { Write-Host "[OK]   $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-Err($m)  { Write-Host "[ERR]  $m" -ForegroundColor Red }

# Tool checks
Write-Step 'Checking required tools (psql, supabase cli)'
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  Write-Err 'psql not found on PATH. Install PostgreSQL client tools and retry.'
  Write-Host 'Windows installers: https://www.postgresql.org/download/' -ForegroundColor DarkGray
  exit 1
}
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Err 'supabase CLI not found. Install from https://supabase.com/docs/guides/cli/getting-started'
  exit 1
}
Write-Ok 'Tools detected.'

# Configure PG envs for psql
$env:PGHOST = $DbHost
$env:PGPORT = "$Port"
$env:PGUSER = $User
$env:PGDATABASE = $DbName
$env:PGPASSWORD = $Password

Write-Step ("Target: host={0} db={1} user={2} port={3}" -f $env:PGHOST,$env:PGDATABASE,$env:PGUSER,$env:PGPORT)

# Repo paths
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '.') | Select-Object -ExpandProperty Path
$snapDir = Join-Path $repoRoot 'snapshots\baseline_reset'
$migrDir = Join-Path $repoRoot 'supabase\migrations'

# 1) Safety snapshot
Write-Step 'Creating safety snapshot (supabase db dump)'
New-Item -ItemType Directory -Force -Path $snapDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$dumpPath = Join-Path $snapDir "pre_rebaseline_${stamp}.sql"
try {
  supabase db dump -f $dumpPath | Out-Host
  Write-Ok "Snapshot saved: $dumpPath"
} catch {
  Write-Err "Snapshot failed: $($_.Exception.Message)"; exit 1
}

# 2) Clean re-baseline
Write-Step 'Re-baselining migrations from remote schema'
New-Item -ItemType Directory -Force -Path $migrDir | Out-Null
try {
  Get-ChildItem $migrDir -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
} catch {}

$baselinePath = Join-Path $migrDir '000_v2_baseline_clean.sql'
try {
  supabase db pull --schema public --output $baselinePath | Out-Host
  Write-Ok "Baseline migration written: $baselinePath"
} catch {
  Write-Err "supabase db pull failed: $($_.Exception.Message)"; exit 1
}

try {
  $diffOut = supabase db diff 2>&1
  if ($diffOut -match 'No schema changes detected') {
    Write-Ok 'Schema parity verified (no changes).'
  } else {
    Write-Warn 'supabase db diff reported differences (non-fatal).'
    $diffOut | Out-Host
  }
} catch { Write-Warn 'supabase db diff not available or failed (continuing).' }

# 3) Canonical view migration (write file and apply remotely)
Write-Step 'Creating canonical view migration (A_latest_card_prices_v.sql)'
$sqlView = @'
create or replace view public.latest_card_prices_v as
with ranked as (
  select
    cp.*,
    row_number() over (
      partition by cp.card_print_id
      order by cp.last_updated desc
    ) rn
  from public.card_prices cp
)
select
  card_print_id        as card_id,
  low::numeric         as price_low,
  mid::numeric         as price_mid,
  high::numeric        as price_high,
  currency::text       as currency,
  last_updated         as observed_at,
  source::text         as source,
  null::numeric        as confidence,
  null::text           as gi_algo_version
from ranked
where rn = 1;

grant select on public.latest_card_prices_v to anon, authenticated, service_role;
'@

$viewPath = Join-Path $migrDir 'A_latest_card_prices_v.sql'
$null = New-Item -ItemType File -Force -Path $viewPath
Set-Content -Path $viewPath -Value $sqlView -Encoding utf8

Write-Step 'Applying canonical view to remote via psql'
$sqlView | psql -X -v ON_ERROR_STOP=1 1>$null
Write-Ok 'View created/updated.'

# 4) Materialized view migration (write and apply)
Write-Step 'Creating materialized view migration (B_latest_card_prices_mv.sql)'
$sqlMv = @'
do $$
begin
  if to_regclass(''public.latest_card_prices_mv'') is null then
    execute $$
      create materialized view public.latest_card_prices_mv as
      select
        card_id,
        null::text as condition_label,
        price_low,
        price_mid,
        price_high,
        currency,
        observed_at,
        source,
        confidence,
        gi_algo_version
      from public.latest_card_prices_v
      with no data;
    $$;
  end if;

  execute $$
    create unique index if not exists uq_latest_card_prices_mv
    on public.latest_card_prices_mv (card_id, coalesce(condition_label, ''''));
  $$;

  execute ''grant select on public.latest_card_prices_mv to anon, authenticated, service_role'';

  begin
    execute ''refresh materialized view concurrently public.latest_card_prices_mv'';
  exception
    when feature_not_supported then
      execute ''refresh materialized view public.latest_card_prices_mv'';
  end;
end
$$;
'@

$mvPath = Join-Path $migrDir 'B_latest_card_prices_mv.sql'
Set-Content -Path $mvPath -Value $sqlMv -Encoding utf8

Write-Step 'Applying materialized view to remote via psql'
$sqlMv | psql -X -v ON_ERROR_STOP=1 1>$null
Write-Ok 'Materialized view ensured and refreshed.'

# 5) Refresh function, trigger, worker (write and apply)
Write-Step 'Creating refresh function, trigger, and worker migration (C_refresh_and_worker.sql)'
$sqlWorker = @'
create or replace function public.refresh_latest_card_prices_mv()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform 1
    from pg_indexes
    where schemaname=''public''
      and tablename=''latest_card_prices_mv''
      and indexname=''uq_latest_card_prices_mv'';

    if found then
      execute ''refresh materialized view concurrently public.latest_card_prices_mv'';
    else
      execute ''refresh materialized view public.latest_card_prices_mv'';
    end if;
  exception when others then
    execute ''refresh materialized view public.latest_card_prices_mv'';
  end;
end
$$;

grant execute on function public.refresh_latest_card_prices_mv() to authenticated, service_role;

create or replace function public.job_log(p_job_id uuid, p_level text, p_message text, p_meta jsonb default null)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.job_logs(job_id, level, message, meta)
  values (p_job_id, coalesce(p_level,''info''), p_message, p_meta);
$$;

grant execute on function public.job_log(uuid, text, text, jsonb) to service_role;

create or replace function public.enqueue_refresh_latest_card_prices()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.jobs
    where name = ''refresh_latest_card_prices_mv''
      and status in (''queued'',''running'')
  ) then
    insert into public.jobs(name, payload, status, scheduled_at)
    values ('',
      ''refresh_latest_card_prices_mv'',
      jsonb_build_object(''reason'', tg_op),
      ''queued'',
      now()
    );
  end if;
  return null;
end
$$;

drop trigger if exists trg_queue_refresh_latest_card_prices on public.card_prices;
create trigger trg_queue_refresh_latest_card_prices
after insert or update or delete on public.card_prices
for each statement
execute function public.enqueue_refresh_latest_card_prices();

create or replace function public.process_jobs(p_limit int default 25)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.jobs%rowtype;
  v_handled int := 0;
begin
  loop
    with next as (
      select id from public.jobs
      where status = ''queued'' and scheduled_at <= now()
      order by scheduled_at asc, created_at asc
      limit 1
      for update skip locked
    )
    update public.jobs j
       set status=''running'', started_at=now(), attempts=j.attempts+1
     where j.id in (select id from next)
     returning j.* into v_job;

    if not found then exit; end if;

    begin
      perform public.job_log(v_job.id, ''info'', ''Starting job'', jsonb_build_object(''name'', v_job.name));

      if v_job.name = ''refresh_latest_card_prices_mv'' then
        perform public.refresh_latest_card_prices_mv();
      else
        perform public.job_log(v_job.id, ''warning'', ''Unknown job name; marking finished'', jsonb_build_object(''name'', v_job.name));
      end if;

      update public.jobs set status=''finished'', finished_at=now() where id=v_job.id;
      v_handled := v_handled + 1;

    exception when others then
      update public.jobs
         set status = case when attempts < max_attempts then ''queued'' else ''failed'' end,
             last_error = left(sqlerrm, 1000),
             scheduled_at = now() + interval ''1 minute''
       where id = v_job.id;
      perform public.job_log(v_job.id, ''error'', ''Job failed'', jsonb_build_object(''error'', sqlerrm));
    end;

    exit when v_handled >= p_limit;
  end loop;
  return v_handled;
end
$$;

grant execute on function public.process_jobs(int) to service_role;
'@

$workerPath = Join-Path $migrDir 'C_refresh_and_worker.sql'
Set-Content -Path $workerPath -Value $sqlWorker -Encoding utf8

Write-Step 'Applying refresh + worker to remote via psql'
$sqlWorker | psql -X -v ON_ERROR_STOP=1 1>$null
Write-Ok 'Refresh function, trigger, and worker ensured.'

# 6) Performance indexes (CONCURRENTLY) — each in its own call
Write-Step 'Creating performance indexes (CONCURRENTLY)'
function Invoke-Idx([string]$sql){
  & psql -X -v ON_ERROR_STOP=1 -c $sql | Out-Host
}

# Detect condition column
$hasCond = (& psql -X -t -A -q -v ON_ERROR_STOP=1 -c "select exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prices' and column_name='condition');").Trim()
if ($hasCond -eq 't') {
  Invoke-Idx "create index concurrently if not exists idx_cp_print_cond_time on public.card_prices (card_print_id, condition, last_updated desc) include (low, mid, high, currency, source);"
} else { Write-Warn 'public.card_prices.condition not found; skipping idx_cp_print_cond_time.' }

Invoke-Idx "create index concurrently if not exists idx_cp_print_time on public.card_prices (card_print_id, last_updated desc) include (low, mid, high, currency, source);"
Invoke-Idx "create index concurrently if not exists idx_cp_last_updated on public.card_prices (last_updated desc);"

# 7) Verification
Write-Step 'Verifying objects'
& psql -X -v ON_ERROR_STOP=1 -c "select to_regclass('public.latest_card_prices_v') as v;" | Out-Host
& psql -X -v ON_ERROR_STOP=1 -c "select to_regclass('public.latest_card_prices_mv') as mv;" | Out-Host
& psql -X -v ON_ERROR_STOP=1 -c "select indexname from pg_indexes where schemaname='public' and tablename='card_prices' order by 1;" | Out-Host

# Enqueue + process a refresh, then count rows
Write-Step 'Kicking a refresh job and processing'
& psql -X -v ON_ERROR_STOP=1 -c "insert into public.jobs(name, payload) values ('refresh_latest_card_prices_mv', '{}'::jsonb) on conflict do nothing;" | Out-Host
& psql -X -v ON_ERROR_STOP=1 -c "select public.process_jobs(5);" | Out-Host
& psql -X -v ON_ERROR_STOP=1 -c "select count(*) as mv_rows from public.latest_card_prices_mv;" | Out-Host

# 8) Git commit & tag
Write-Step 'Committing migrations and tagging'
& git add $migrDir | Out-Null
& git commit -m "chore(db): pristine re-baseline (no stubs) + canonical pricing view + MV + jobs + indexes" | Out-Host
try { & git tag integration/v2-baseline-pristine | Out-Null } catch {}
Write-Ok 'Commit and tag created (no push).'

# 9) Print run instructions
Write-Host "`nTo run again:" -ForegroundColor Magenta
Write-Host ("powershell -ExecutionPolicy Bypass -File scripts\gv_pristine_rebaseline.ps1 -DbHost {0} -DbName {1} -User {2} -Password '*****'" -f $DbHost,$DbName,$User) -ForegroundColor Magenta
