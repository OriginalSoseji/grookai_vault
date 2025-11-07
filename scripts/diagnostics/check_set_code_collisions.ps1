param(
  [string]$EnvFile = ".env"
)

$ErrorActionPreference = 'Stop'
# Checks for potential set code collisions like sv6 vs sv06 (normalized to same key)

if (-not (Test-Path $EnvFile)) { throw ".env not found: $EnvFile" }
$u = (Get-Content $EnvFile | ForEach-Object { if ($_ -match '^SUPABASE_URL=(.+)$'){ $Matches[1].Trim() } }) | Select-Object -First 1
$srk = (Get-Content $EnvFile | ForEach-Object { if ($_ -match '^SUPABASE_SERVICE_ROLE_KEY=(.+)$'){ $Matches[1].Trim() } }) | Select-Object -First 1
if (-not $u -or -not $srk) { throw 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env' }

$hdr = @{ apikey=$srk; Authorization="Bearer $srk"; 'Accept-Profile'='public' }
$uri = "$u/rest/v1/sets?select=code&limit=10000"
$sets = Invoke-RestMethod -Method Get -Uri $uri -Headers $hdr

function Normalize-Code([string]$code) {
  if (-not $code) { return $code }
  # Normalize sv0<digit>... -> sv<digit>...
  return ($code -replace '^sv0([0-9].*)$', 'sv$1')
}

$groups = @{}
foreach ($row in $sets) {
  $c = "$($row.code)"; if (-not $c) { continue }
  $n = Normalize-Code $c
  if (-not $groups.ContainsKey($n)) { $groups[$n] = New-Object System.Collections.Generic.HashSet[string] }
  [void]$groups[$n].Add($c)
}

$collisions = @()
foreach ($k in $groups.Keys) {
  $distinct = $groups[$k]
  if ($distinct.Count -gt 1) {
    $collisions += [pscustomobject]@{ normalized=$k; codes=((@($distinct) ) -join ', ') }
  }
}

if ($collisions.Count -gt 0) {
  Write-Host "Collisions detected:" -ForegroundColor Yellow
  $collisions | Format-Table -AutoSize
  exit 2
} else {
  Write-Host "No collisions detected." -ForegroundColor Green
}

