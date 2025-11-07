<#
  align_migrations.ps1
  Purpose: Make local Supabase migrations mirror the remote history so future
  `supabase db push` commands run cleanly (no drift/repair loops).

  What it does:
  - Runs `supabase migration list`
  - Parses the table output and tallies remote version prefixes (handles duplicates)
  - Compares to local files under `supabase/migrations`
  - Creates `*_baseline_stub.sql` files for any missing occurrences

  Usage:
    powershell -ExecutionPolicy Bypass -File scripts/tools/align_migrations.ps1

  Notes:
  - Safe to re-run; it creates stubs only for missing occurrences.
  - If you manually applied schema for certain versions (e.g. 2025110212*), this
    script ensures local baseline stubs exist so Local == Remote.
  - Set $env:PGPASSWORD in the shell to avoid any CLI prompts.
#>

param(
  [switch]$AlsoStubV2
)

$ErrorActionPreference = 'Stop'

function Ensure-Dir($p) { if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null } }

Ensure-Dir 'supabase'
Ensure-Dir 'supabase\migrations'

Write-Host 'Reading remote migrations via `supabase migration list` ...'
$list = supabase migration list
if ($LASTEXITCODE -ne 0) { throw 'supabase migration list failed' }

$remoteCounts = @{}
foreach ($line in ($list -split "`r?`n")) {
  # Expect rows like: "   Local | Remote         | Time (UTC)"
  if ($line -match '^[\s\x1b\[0-9;]*?(?<local>\S*)\s*\|\s*(?<remote>\d{4,})\s*\|') {
    $rv = $Matches['remote'].Trim()
    if ($rv) {
      if (-not $remoteCounts.ContainsKey($rv)) { $remoteCounts[$rv] = 0 }
      $remoteCounts[$rv] = [int]$remoteCounts[$rv] + 1
    }
  }
}

if ($remoteCounts.Count -eq 0) {
  Write-Warning 'Could not parse any remote versions from CLI output; no changes made.'
  exit 0
}

Write-Host ('Found {0} distinct remote versions (with duplicates tallied).' -f $remoteCounts.Count)

foreach ($kv in $remoteCounts.GetEnumerator()) {
  $ver = $kv.Key
  $needed = [int]$kv.Value
  $have = (Get-ChildItem -ErrorAction SilentlyContinue -Path 'supabase\migrations' -Filter ("$ver*.sql") | Measure-Object).Count
  if ($have -ge $needed) { continue }
  $todo = $needed - $have
  for ($i = 1; $i -le $todo; $i++) {
    $suffix = if ($needed -gt 1) { "_baseline_stub_$([int]($have + $i))" } else { '_baseline_stub' }
    $path = Join-Path 'supabase\migrations' ("{0}{1}.sql" -f $ver, $suffix)
    if (-not (Test-Path $path)) {
      Set-Content -Path $path -Value ("-- no-op stub mirroring remote version $ver`n") -Encoding UTF8
      Write-Host "Created stub: $path"
    }
  }
}

if ($AlsoStubV2) {
  $v2 = @('20251102121000','20251102123000','20251102124000')
  foreach ($v in $v2) {
    $have = (Get-ChildItem -ErrorAction SilentlyContinue -Path 'supabase\migrations' -Filter ("$v*.sql") | Measure-Object).Count
    if ($have -lt 1) {
      $path = Join-Path 'supabase\migrations' ("{0}_baseline_stub.sql" -f $v)
      Set-Content -Path $path -Value ("-- no-op stub (schema applied manually) for $v`n") -Encoding UTF8
      Write-Host "Created V2 stub: $path"
    }
  }
}

Write-Host 'Done. Run `supabase migration list` to confirm Local == Remote.'

