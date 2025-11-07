param()
$ErrorActionPreference='Stop'

function Root { (git rev-parse --show-toplevel) }
Set-Location (Root)

$outDir = "scripts/diagnostics/output"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$inspect = Join-Path $outDir "wall_feed_inspect.md"
$planOut = Join-Path $outDir "wall_feed_autofix_plan.md"

$fixMig = "supabase/migrations/_pending_wall_feed_fix.sql"
$grantMig = "supabase/migrations/_pending_wall_feed_grants.sql"

function Write-Plan($lines){ Set-Content -Path $planOut -Value ($lines -join "`n") }

if (-not (Test-Path $inspect)) {
  Write-Plan @(
    "# Wall Feed Auto-Remediate Plan",
    "_Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')_",
    "",
    "Inspector report not found at $inspect.",
    "No pending migrations generated. Run 'Diag: Inspect wall feed' first."
  )
  return
}

$text = Get-Content -Raw $inspect

# Heuristics based on inspect script output
$viewFound = ($text -match "view wall_feed_v:\s*FOUND")
$funcFound = ($text -match "function wall_feed_list:\s*FOUND")
$grantsViewOk = ($text -match "role_table_grants") -or ($text -match "### Grants: wall_feed_v" -and $text -match "anon\|SELECT" -and $text -match "authenticated\|SELECT")
$grantsFuncOk = ($text -match "routine_privileges") -or ($text -match "### Grants: wall_feed_list" -and $text -match "anon\|EXECUTE" -and $text -match "authenticated\|EXECUTE")

$needObjects = -not ($viewFound -and $funcFound)
$needGrantsOnly = ($viewFound -and $funcFound -and (-not ($grantsViewOk -and $grantsFuncOk)))

$header = @(
  "-- Pending auto-remediation migration",
  "-- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
)

if ($needObjects) {
  $sql = @()
  $sql += $header
  $sql += @"
drop function if exists public.wall_feed_list(integer, integer);
drop view if exists public.wall_feed_v;

create view public.wall_feed_v as
select
  l.id,
  l.title,                  -- TODO: adjust if different column name
  l.price_cents,            -- TODO: adjust if different column name
  l.set_code,               -- TODO: adjust if different column name
  l.created_at,
  l.owner_id,               -- TODO: adjust if different column name
  lp.thumb_url
from public.listings l
left join lateral (
  select p.thumb_url
  from public.listing_photos p
  where p.listing_id = l.id
    and nullif(trim(p.thumb_url), '') is not null
  order by p.created_at desc nulls last, p.id
  limit 1
) lp on true
where coalesce(l.is_active, true) = true;  -- TODO: adjust if different active flag

create function public.wall_feed_list(_limit int default 50, _offset int default 0)
returns setof public.wall_feed_v
language sql stable as $$
  select * from public.wall_feed_v
  order by created_at desc
  limit greatest(_limit,0) offset greatest(_offset,0);
$$;

grant select on public.wall_feed_v to anon, authenticated, service_role;
grant execute on function public.wall_feed_list(int, int) to anon, authenticated, service_role;

create index if not exists idx_listings_created_at on public.listings (created_at desc);
"@
  Set-Content -Path $fixMig -Value $sql -NoNewline

  Write-Plan @(
    "# Wall Feed Auto-Remediate Plan",
    "_Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')_",
    "",
    "Objects missing (view or function). Created:",
    "- $fixMig",
    "",
    "Next: Review the file, then run 'supabase db push' to apply."
  )
  return
}

if ($needGrantsOnly) {
  $sql = @()
  $sql += $header
  $sql += @"
grant select on public.wall_feed_v to anon, authenticated, service_role;
grant execute on function public.wall_feed_list(int, int) to anon, authenticated, service_role;
"@
  Set-Content -Path $grantMig -Value $sql -NoNewline

  Write-Plan @(
    "# Wall Feed Auto-Remediate Plan",
    "_Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')_",
    "",
    "Objects present but grants incomplete. Created:",
    "- $grantMig",
    "",
    "Next: Review the file, then run 'supabase db push' to apply."
  )
  return
}

Write-Plan @(
  "# Wall Feed Auto-Remediate Plan",
  "_Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')_",
  "",
  "No remediation needed (objects and grants look OK).",
  "No files created."
)

