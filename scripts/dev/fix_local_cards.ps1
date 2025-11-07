param()

function Invoke-DbSql {
  param([string]$Sql, [switch]$Raw)
  $cmd = @(
    'docker','exec','-i','supabase_db_grookai_vault',
    'psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-t','-A','-c',"$Sql"
  )
  $p = Start-Process -FilePath $cmd[0] -ArgumentList $cmd[1..($cmd.Length-1)] -NoNewWindow -PassThru -RedirectStandardOutput stdout.tmp -RedirectStandardError stderr.tmp
  $p.WaitForExit() | Out-Null
  $out = Get-Content stdout.tmp -Raw
  $err = Get-Content stderr.tmp -Raw
  Remove-Item stdout.tmp, stderr.tmp -ErrorAction SilentlyContinue
  if ($p.ExitCode -ne 0) {
    Write-Error "FIX_LOCAL_CARDS: SQL error ($($p.ExitCode)): $err"; exit 1
  }
  if ($Raw) { return $out } else { return ($out -split "\r?\n") | Where-Object { $_.Trim() } }
}

Write-Host "FIX_LOCAL_CARDS: Starting"

# 1) Ensure table public.card_prints
$existsTbl = Invoke-DbSql -Sql "select exists (select 1 from information_schema.tables where table_schema='public' and table_name='card_prints');"
if ($existsTbl -contains 't') {
  Write-Host "FIX_LOCAL_CARDS: card_prints exists"
} else {
  Write-Host "FIX_LOCAL_CARDS: creating table public.card_prints"
  Invoke-DbSql -Sql @"
create table public.card_prints (
  id text primary key,
  name text not null,
  set_code text,
  number text,
  image_url text,
  thumb_url text
);
"@
}

# 2) Ensure view public.v_card_search
$existsView = Invoke-DbSql -Sql "select exists (select 1 from information_schema.views where table_schema='public' and table_name='v_card_search');"
if ($existsView -contains 't') {
  Write-Host "FIX_LOCAL_CARDS: v_card_search exists"
} else {
  Write-Host "FIX_LOCAL_CARDS: creating view public.v_card_search"
  Invoke-DbSql -Sql @"
create or replace view public.v_card_search as
select
  id,
  name,
  set_code,
  number,
  coalesce(thumb_url, image_url) as image_best,
  null::int as latest_price_cents,
  null::numeric as latest_price,
  null::double precision as rank
from public.card_prints;
"@
}

# 3) Seed one Pikachu if empty
$cntPrints = [int](Invoke-DbSql -Sql "select coalesce(count(*),0) from public.card_prints;" | Select-Object -First 1)
if ($cntPrints -eq 0) {
  Write-Host "FIX_LOCAL_CARDS: inserting test card Pikachu"
  Invoke-DbSql -Sql @"
insert into public.card_prints (id, name, set_code, number, image_url)
values ('0001','Pikachu','BASE','58','https://picsum.photos/600/840')
on conflict do nothing;
"@
} else {
  Write-Host "FIX_LOCAL_CARDS: card_prints already has $cntPrints rows"
}

# 4) Verify search view has rows
$cntSearch = [int](Invoke-DbSql -Sql "select coalesce(count(*),0) from public.v_card_search;" | Select-Object -First 1)
if ($cntSearch -ge 1) {
  Write-Host "FIX_LOCAL_CARDS: Schema OK (v_card_search=$cntSearch)"; exit 0
} else {
  Write-Error "FIX_LOCAL_CARDS: FAILED (v_card_search count=$cntSearch)"; exit 1
}

