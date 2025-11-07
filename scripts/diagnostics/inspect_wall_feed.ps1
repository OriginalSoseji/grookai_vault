param()
$ErrorActionPreference='Stop'

function Root { (git rev-parse --show-toplevel) }
Set-Location (Root)

$outDir = "scripts/diagnostics/output"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$report = Join-Path $outDir "wall_feed_inspect.md"

function TryPsql() {
  try { (psql --version) | Out-Null; return $true } catch { return $false }
}

function PsqlArgs() {
  if ($env:SUPABASE_DB_URL) { return @('-X','-q','-d', $env:SUPABASE_DB_URL) }
  if ($env:POSTGRES_URL) { return @('-X','-q','-d', $env:POSTGRES_URL) }
  return @()
}

function RunSql($sql){
  $args = PsqlArgs
  if ($args.Count -eq 0) { throw "No DB URL env (SUPABASE_DB_URL or POSTGRES_URL)." }
  & psql @args -t -A -F '|' -c $sql
}

$lines = @()
$lines += "# Wall Feed - Forensic Inspect"
$lines += "_Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')_"

if (-not (TryPsql)) {
  $lines += "\n**FAIL**: psql not found on PATH. Set SUPABASE_DB_URL and install psql."
  Set-Content -Path $report -Value ($lines -join "`n")
  Write-Host "Wrote $report (psql missing)"
  exit 0
}

try {
  # Existence checks
  $vrows = RunSql "select schemaname, viewname from pg_views where schemaname='public' and viewname='wall_feed_v'"
  $frows = RunSql "select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='wall_feed_list'"
  $lines += "\n## Existence"
  $lines += "- view wall_feed_v: " + ($(if ($vrows) { 'FOUND' } else { 'MISSING' }))
  $lines += "- function wall_feed_list: " + ($(if ($frows) { 'FOUND' } else { 'MISSING' }))

  # Grants
  $vgrants = RunSql "select grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='wall_feed_v' order by grantee, privilege_type"
  $fgrants = RunSql "select grantee, privilege_type from information_schema.routine_privileges where routine_schema='public' and routine_name='wall_feed_list' order by grantee, privilege_type"
  $lines += "\n## Grants"
  $lines += "### wall_feed_v"
  if ($vgrants) { $lines += ($vgrants | ForEach-Object { '- ' + $_ }) } else { $lines += "- (none)" }
  $lines += "### wall_feed_list"
  if ($fgrants) { $lines += ($fgrants | ForEach-Object { '- ' + $_ }) } else { $lines += "- (none)" }

  # RLS flags
  $rls = RunSql "select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relname in ('listings','listing_photos') order by relname"
  $lines += "\n## RLS Status (public)"
  if ($rls) { $lines += ($rls | ForEach-Object { '- ' + $_ }) } else { $lines += "- (no rows)" }

  # PASS/FAIL logic
  $hasView = [bool]$vrows
  $hasFunc = [bool]$frows
  $hasViewGrants = ($vgrants -join ' ') -match 'anon\|SELECT' -and ($vgrants -join ' ') -match 'authenticated\|SELECT'
  $hasFuncGrants = ($fgrants -join ' ') -match 'anon\|EXECUTE' -and ($fgrants -join ' ') -match 'authenticated\|EXECUTE'

  $lines += "\n## Verdict"
  if ($hasView -and $hasFunc -and $hasViewGrants -and $hasFuncGrants) {
    $lines += "**PASS** - Objects present and grants look correct."
  } else {
    $lines += "**FAIL** - Reasons:"
    if (-not $hasView) { $lines += "- Missing view wall_feed_v" }
    if (-not $hasFunc) { $lines += "- Missing function wall_feed_list" }
    if ($hasView -and -not $hasViewGrants) { $lines += "- wall_feed_v exists but anon/auth lack SELECT" }
    if ($hasFunc -and -not $hasFuncGrants) { $lines += "- wall_feed_list exists but anon/auth lack EXECUTE" }
  }
} catch {
  $lines += "\n**ERROR** running inspection: $($_.Exception.Message)"
}

Set-Content -Path $report -Value ($lines -join "`n")
Write-Host "Wrote $report"
