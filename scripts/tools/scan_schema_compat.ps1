param(
  [string]$EnvFile = ".env",
  [switch]$Verbose
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $EnvFile)) { throw ".env not found: $EnvFile" }
$u = (Get-Content $EnvFile | % { if ($_ -match '^SUPABASE_URL=(.+)$'){ $Matches[1].Trim() } }) | Select-Object -First 1
$anon = (Get-Content $EnvFile | % { if ($_ -match '^SUPABASE_ANON_KEY=(.+)$'){ $Matches[1].Trim() } }) | Select-Object -First 1
$srk = (Get-Content $EnvFile | % { if ($_ -match '^(SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|SB_SERVICE_ROLE_KEY)=(.+)$'){ $Matches[2].Trim() } }) | Select-Object -First 1
if (-not $u -or -not $anon) { throw 'Missing SUPABASE_URL or SUPABASE_ANON_KEY in env' }

$hdrAnon = @{ apikey=$anon; Authorization="Bearer $anon" }
$hdrSr = $null; if ($srk) { $hdrSr = @{ apikey=$srk; Authorization="Bearer $srk" } }

Write-Host "Scan base: $u (SRK present=$([bool]$srk))"

# Collect resources from repo by regex on REST paths
$patterns = @('*.ps1','*.ts','*.tsx','*.js','*.dart','*.sql')
$files = Get-ChildItem -Recurse -File -Include $patterns | Where-Object { $_.FullName -notmatch '\\node_modules\\' }
$rx = [regex]'/rest/v1/([a-zA-Z0-9_]+)'
$set = New-Object System.Collections.Generic.HashSet[string]
foreach ($f in $files) {
  try {
    $txt = Get-Content $f.FullName -Raw -ErrorAction Stop
    foreach ($m in $rx.Matches($txt)) { [void]$set.Add($m.Groups[1].Value) }
  } catch { }
}

$resources = @(); foreach ($x in $set) { $resources += $x }
$resources = $resources | Sort-Object

# Suggestion map for legacy names
$suggest = @{
  'card_catalog' = 'Use card_prints (group) or v_set_print_counts'
}

Write-Host "Found $($resources.Count) unique REST resources. Checking..."
Write-Host ("{0,-24}{1,-10}{2,-6}{3}" -f 'Resource','Status','HTTP','Notes')
Write-Host ("-"*70)

$missing = @()
$compatHits = @()
foreach ($r in $resources) {
  $uri = "$u/rest/v1/$r?select=1&limit=1"
  if ($Verbose) { Write-Host "GET $uri" -ForegroundColor DarkGray }
  $http = 0; $ok = $false; $note=''
  try {
    Invoke-RestMethod -Method Get -Uri $uri -Headers $hdrAnon | Out-Null
    $http = 200; $ok = $true
  } catch {
    $msg = $_.Exception.Message
    if ($msg -match '404') { $http = 404 }
    elseif ($msg -match '401|403') { $http = 403 } else { $http = 0 }
    if (-not $ok -and $http -eq 404 -and $hdrSr) {
      try { Invoke-RestMethod -Method Get -Uri $uri -Headers $hdrSr | Out-Null; $http=200; $ok=$true } catch { $http=404 }
    }
  }
  if (-not $ok) { $missing += $r; if ($suggest.ContainsKey($r)) { $note = $suggest[$r] } }
  elseif ($r -eq 'card_catalog') { $compatHits += $r }
  $status = 'OK'; if (-not $ok) { $status = 'MISSING' }
  Write-Host ("{0,-24}{1,-10}{2,-6}{3}" -f $r, $status, $http, $note)
}

if ($compatHits.Count -gt 0) {
  Write-Host "DEPRECATION: 'card_catalog' compat in use -- remove by 2025-12-01" -ForegroundColor Yellow
}

if ($missing.Count -gt 0) { exit 1 } else { exit 0 }
