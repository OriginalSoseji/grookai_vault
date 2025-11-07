# Reads SUPABASE_URL and SUPABASE_ANON_KEY from .env and computes missing cards per set

param(
  [string]$EnvFile = ".env",
  [int]$SampleLimit = 20,
  [string]$ServiceRoleKey = $null,   # optional; used for function calls that require SRK
  [switch]$UseFunctionsFallback       # use check-sets/import-cards probe if REST tables not exposed
)

$ErrorActionPreference='Stop'

if (-not (Test-Path $EnvFile)) { throw ".env not found: $EnvFile" }
$u = (Get-Content $EnvFile | ForEach-Object { if ($_ -match '^SUPABASE_URL=(.+)$'){ $Matches[1].Trim() } }) | Select-Object -First 1
$k = (Get-Content $EnvFile | ForEach-Object { if ($_ -match '^SUPABASE_ANON_KEY=(.+)$'){ $Matches[1].Trim() } }) | Select-Object -First 1
# Optional SRK from env file if not passed via -ServiceRoleKey
if (-not $ServiceRoleKey) {
  $srkFromEnv = (Get-Content $EnvFile | ForEach-Object { if ($_ -match '^SERVICE_ROLE_KEY=(.+)$'){ $Matches[1].Trim() } }) | Select-Object -First 1
  if ($srkFromEnv) { $ServiceRoleKey = $srkFromEnv }
}
if (-not $ServiceRoleKey) {
  $srkFromEnv2 = (Get-Content $EnvFile | ForEach-Object { if ($_ -match '^SUPABASE_SERVICE_ROLE_KEY=(.+)$'){ $Matches[1].Trim() } }) | Select-Object -First 1
  if ($srkFromEnv2) { $ServiceRoleKey = $srkFromEnv2 }
}
if (-not $ServiceRoleKey) {
  $srkFromEnv3 = (Get-Content $EnvFile | ForEach-Object { if ($_ -match '^SB_SERVICE_ROLE_KEY=(.+)$'){ $Matches[1].Trim() } }) | Select-Object -First 1
  if ($srkFromEnv3) { $ServiceRoleKey = $srkFromEnv3 }
}
if (-not $u -or -not $k) { throw 'Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env' }
$hdrAnon = @{ 'apikey'=$k; 'Authorization'="Bearer $k" }
$hdrSr   = $null; if ($ServiceRoleKey) { $hdrSr = @{ 'apikey'=$ServiceRoleKey; 'Authorization'="Bearer $ServiceRoleKey" } }

Write-Host "Using $u (key present=$([bool]$k)); SRK present=$([bool]$ServiceRoleKey)"

$expectedSource = $null

# Primary expected: group by set_code on card_prints (lang=en)
$uriExpectedPrimary = "$u/rest/v1/card_prints?select=set_code,count:count()&lang=eq.en&group=set_code"
$uriActualGrouped = "$u/rest/v1/card_prints?select=set_id,count:count()"
$uriSetsMap = "$u/rest/v1/sets?select=id,code&limit=10000"

$expected = $null; $actual = $null
try {
  Write-Verbose "GET $uriExpectedPrimary"
  $hdrCount = $hdrAnon.Clone(); $hdrCount['Prefer'] = 'count=exact'
  $expected = Invoke-RestMethod -Method Get -Uri $uriExpectedPrimary -Headers $hdrCount
  $expectedSource = 'card_prints'
} catch {
  $msg = $_.Exception.Message; $is404 = ($msg -match '404'); $is400 = ($msg -match '400')
  if ($is404 -or $is400) {
    # Secondary: compat view
    $uriExpectedCompat = "$u/rest/v1/v_set_print_counts?select=set_code,total_prints"
    try {
      Write-Verbose "GET $uriExpectedCompat"
      $tmp = Invoke-RestMethod -Method Get -Uri $uriExpectedCompat -Headers $hdrAnon
      # map to expected shape
      $expected = @(); foreach ($row in $tmp) { $expected += [pscustomobject]@{ set_code=$row.set_code; count=[int]$row.total_prints } }
      $expectedSource = 'v_set_print_counts'
    } catch {
      $msg2 = $_.Exception.Message; $is404b = ($msg2 -match '404')
      if (($UseFunctionsFallback -and $hdrSr) -or ($is404b -and $hdrSr)) {
        if (-not $UseFunctionsFallback) { $UseFunctionsFallback = $true }
        Write-Host 'Expected source missing; will use probe fallback.' -ForegroundColor Yellow
        $expected = $null
      } else { throw }
    }
  } else { throw }
}

# Always compute actual via set_id mapping
try {
  Write-Verbose "GET $uriActualGrouped"
  $actualGrouped = Invoke-RestMethod -Method Get -Uri $uriActualGrouped -Headers $hdrAnon
  Write-Verbose "GET $uriSetsMap"
  $setsMapArr = Invoke-RestMethod -Method Get -Uri $uriSetsMap -Headers $hdrAnon
  $idToCode = @{}
  foreach ($s in $setsMapArr) { if ($s.id -and $s.code) { $idToCode[$s.id] = "$($s.code)" } }
  $actual = @()
  foreach ($g in $actualGrouped) {
    $sid = "$($g.set_id)"; if (-not $sid) { continue }
    $code = $null; if ($idToCode.ContainsKey($sid)) { $code = $idToCode[$sid] }
    if ($code) { $actual += [pscustomobject]@{ set_code=$code; count=[int]$g.count } }
  }
} catch {
  $msg = $_.Exception.Message
  $is404 = ($msg -match '404'); $is400 = ($msg -match '400')
  if (($is404 -or $is400) -and $hdrSr) {
    Write-Host 'Actual mapping failed; enabling probe fallback.' -ForegroundColor Yellow
    $expected = $null; $actual = $null; if (-not $UseFunctionsFallback) { $UseFunctionsFallback = $true }
  } else { throw }
}

$expMap = @{}
$actMap = @{}
if ($expected -ne $null -and $actual -ne $null) {
  foreach ($row in $expected) { $sc = "$($row.set_code)"; if (-not $sc) { continue }; $expMap[$sc] = [int]$row.count }
  foreach ($row in $actual)   { $sc = "$($row.set_code)"; if (-not $sc) { continue }; $actMap[$sc] = ($actMap[$sc] + [int]$row.count) }
}

$allKeys = New-Object System.Collections.Generic.HashSet[string]
$expMap.Keys | ForEach-Object { [void]$allKeys.Add($_) }
$actMap.Keys | ForEach-Object { [void]$allKeys.Add($_) }

$merged = @()
if ($expected -ne $null -and $actual -ne $null) {
  foreach ($sc in $allKeys) {
    $e = 0; if ($expMap.ContainsKey($sc)) { $e = $expMap[$sc] }
    $a = 0; if ($actMap.ContainsKey($sc)) { $a = $actMap[$sc] }
    $m = $e - $a
    $merged += [pscustomobject]@{ set_code=$sc; expected=$e; actual=$a; missing=$m; source=$expectedSource }
  }
} elseif ($UseFunctionsFallback -and $hdrSr) {
  # Use check-sets to list missing sets, and probe import-cards to estimate missing prints
  $checkBody = @{ fix=$false; throttleMs=0 } | ConvertTo-Json
  $cs = Invoke-RestMethod -Method Post -Uri "$u/functions/v1/check-sets" -Headers $hdrSr -Body $checkBody
  $missingSets = @(); if ($cs.missing) { $missingSets = @($cs.missing) }
  $setsMissing = $missingSets.Count
  $missingPrints = 0
  foreach ($sc in $missingSets) {
    try {
      $probeBody = @{ setCode=$sc; page=1; pageSize=1 } | ConvertTo-Json
      $probe = Invoke-RestMethod -Method Post -Uri "$u/functions/v1/import-cards?op=probe" -Headers $hdrAnon -Body $probeBody
      $tc = 0; if ($probe.totalCount -ne $null) { $tc = [int]$probe.totalCount } elseif ($probe.count -ne $null) { $tc = [int]$probe.count }
      $merged += [pscustomobject]@{ set_code=$sc; expected=$tc; actual=0; missing=$tc; source='probe' }
      $missingPrints += $tc
    } catch {}
  }
  $totalMissing = $missingPrints
}
$merged = $merged | Sort-Object -Property @{Expression='missing';Descending=$true}, @{Expression='set_code';Descending=$false}
$totalMissing = ($merged | Where-Object { $_.missing -gt 0 } | Measure-Object -Property missing -Sum).Sum
$setsMissing = ($merged | Where-Object { $_.missing -gt 0 }).Count

$cnt24 = 0; $sample = @()
try {
  $since = (Get-Date).ToUniversalTime().AddHours(-24).ToString('o')
  $sinceEsc = [System.Uri]::EscapeDataString($since)
  $uriCnt24 = "$u/rest/v1/card_prints?select=count:count()&created_at=gte.$sinceEsc"
  $cntArr = Invoke-RestMethod -Method Get -Uri $uriCnt24 -Headers $hdrAnon
  $cnt24 = if ($cntArr -is [System.Array]) { $cntArr[0].count } else { $cntArr.count }
  $uriSample = "$u/rest/v1/card_prints?select=id,set_code,number,name,lang,created_at&created_at=gte.$sinceEsc&order=created_at.desc&limit=$SampleLimit"
  $sample = Invoke-RestMethod -Method Get -Uri $uriSample -Headers $hdrAnon
} catch {}

if (-not $expectedSource) { $expectedSource = 'probe' }
Write-Host ("Sets missing: {0} | Total missing: {1} | Inserts24h: {2} | Expected Source: {3}" -f $setsMissing, $totalMissing, $cnt24, $expectedSource)
"Summary (Set | Expected | Actual | Missing | Source):" | Write-Host
$merged | Sort-Object -Property @{Expression='missing';Descending=$true}, @{Expression='set_code';Descending=$false} |
  Select-Object @{n='Set';e={$_.set_code}}, @{n='Expected';e={$_.expected}}, @{n='Actual';e={$_.actual}}, @{n='Missing';e={$_.missing}}, @{n='Source';e={$_.source}} |
  Format-Table -AutoSize
"Recent inserts (latest $SampleLimit):" | Write-Host
$sample | Select-Object created_at,set_code,number,lang,name | Format-Table -AutoSize

# Telemetry (best effort): ping system_health with source info when SRK present
try {
  if ($hdrSr) {
    $uriHealth = "$u/functions/v1/system_health"
    $body = @{ diag = 'missing_cards'; source = $expectedSource; ranAt = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri $uriHealth -Headers $hdrSr -ContentType 'application/json' -Body $body | Out-Null
  }
} catch { }
