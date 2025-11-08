Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Invoke-Probe {
  param(
    [Parameter(Mandatory)] [string]$Name,
    [Parameter(Mandatory)] [ValidateSet("GET","POST")] [string]$Method,
    [Parameter(Mandatory)] [string]$Auth,    # "anon" or "secret"
    [Parameter(Mandatory)] [string]$Url,
    [hashtable]$Headers = @{},
    $Body = $null
  )

  # local helpers
  function Get-Prop($obj, [string]$prop) {
    if ($null -eq $obj) { return $null }
    if ($obj.PSObject.Properties.Match($prop).Count -gt 0) { return $obj.$prop }
    return $null
  }
  function Read-ResponseBody($resp) {
    try {
      if ($null -eq $resp) { return $null }
      $stream = $resp.GetResponseStream()
      if ($null -eq $stream) { return $null }
      $reader = New-Object IO.StreamReader($stream)
      return $reader.ReadToEnd()
    } catch { return $null }
  }

  try {
    if ($Body -ne $null -and $Method -eq "POST") {
      $resp = Invoke-WebRequest -Method POST -Uri $Url -Headers $Headers `
              -Body ($Body | ConvertTo-Json -Depth 5) -ContentType 'application/json' -UseBasicParsing
    } else {
      $resp = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -UseBasicParsing
    }
    $code = [int]$resp.StatusCode
    $ok = ($code -ge 200 -and $code -lt 300)
    return [pscustomobject]@{ NAME=$Name; METHOD=$Method; AUTH=$Auth; CODE=$code; OK=$ok }
  }
  catch {
    $e   = $_.Exception
    $resp = Get-Prop $e 'Response'  # may be null
    $code = 0

    # Try all known places a status code may live
    $statusObj = Get-Prop $e 'StatusCode'
    if ($statusObj) {
      try { $code = [int]$statusObj } catch { $code = 0 }
    }
    if ($code -eq 0 -and $resp -and (Get-Prop $resp 'StatusCode')) {
      try { $code = [int]$resp.StatusCode } catch { $code = 0 }
    }

    # Try to read body if we have a response
    $body = Read-ResponseBody $resp
    if ($body) { Write-Host "---- $Name error body ----`n$body" }

    # Always dump exception properties for diagnostics
    Write-Host "---- $Name exception dump (compact) ----"
    ($e | Format-List * -Force | Out-String) -split "`r?`n" | Select-Object -First 40 | ForEach-Object { Write-Host $_ }

    return [pscustomobject]@{ NAME=$Name; METHOD=$Method; AUTH=$Auth; CODE=$code; OK=$false }
  }
}

# Resolve base URL
$base = $env:SUPABASE_URL
if ([string]::IsNullOrWhiteSpace($base)) { throw "SUPABASE_URL is not set." }
if (-not $base.EndsWith('/')) { $base += '/' }

# Base sanity ping (HEAD or GET)
try {
  Invoke-WebRequest -Method Head -Uri $base -UseBasicParsing -Headers @{ } | Out-Null
} catch {
  Write-Host "---- base url ping failed ----"
  $_.Exception | Format-List * -Force | Out-String | Write-Host
}

# Keys
$pub = $env:SUPABASE_PUBLISHABLE_KEY
$sec = $env:SUPABASE_SECRET_KEY
if ([string]::IsNullOrWhiteSpace($pub)) { throw "SUPABASE_PUBLISHABLE_KEY is not set." }
if ([string]::IsNullOrWhiteSpace($sec)) { throw "SUPABASE_SECRET_KEY is not set." }

$hAnon = @{ apikey = $pub }
$hSrv  = @{ apikey = $sec }

# Targets (adjust paths as needed for your project)
$uWall = "${base}rest/v1/wall_feed?select=id&limit=1"
$uImp  = "${base}functions/v1/import-prices"
$uChk  = "${base}functions/v1/check-sets"

$results = @()
$results += Invoke-Probe -Name "wall_feed"     -Method GET  -Auth "anon"         -Url $uWall -Headers $hAnon
$results += Invoke-Probe -Name "import-prices" -Method POST -Auth "secret"  -Url $uImp  -Headers $hSrv -Body @{ dryRun = $true }
$results += Invoke-Probe -Name "check-sets"    -Method POST -Auth "secret"  -Url $uChk  -Headers $hSrv -Body @{ dryRun = $true }

# Output folder
$ts = (Get-Date -Format "yyyyMMdd_HHmmss")
$dir = Join-Path -Path "reports" -ChildPath ("edge_test_{0}" -f $ts)
New-Item -ItemType Directory -Force -Path $dir | Out-Null

# edge_results.txt
$csvPath = Join-Path $dir "edge_results.txt"
"NAME, METHOD, AUTH, CODE, OK" | Out-File -FilePath $csvPath -Encoding utf8
$results | ForEach-Object {
  "{0}, {1}, {2}, {3}, {4}" -f $_.NAME,$_.METHOD,$_.AUTH,$_.CODE,$_.OK
} | Out-File -Append -FilePath $csvPath -Encoding utf8

# SUMMARY.md (table + verdict)
$md = @()
$md += "| name | method | auth | code | ok |"
$md += "|------|--------|------|------|----|"
$results | ForEach-Object {
  $md += "| {0} | {1} | {2} | {3} | {4} |" -f $_.NAME, $_.METHOD, $_.AUTH, $_.CODE, ($(if($_.OK){"True"}else{"False"}))
}
$allOk = -not ($results | Where-Object { -not $_.OK })
$md += "Verdict: " + ($(if($allOk){"GREEN"}else{"RED"}))
$mdPath = Join-Path $dir "SUMMARY.md"
$md -join "`r`n" | Out-File -FilePath $mdPath -Encoding utf8

# Exit code for CI
if ($allOk) { exit 0 } else { exit 1 }

