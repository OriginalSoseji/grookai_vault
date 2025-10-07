# price-all-sets.ps1 (RPC + REST distinct fallback, resumeable)
$SUPABASE_URL = "https://ycdxbpibncqcchqiihfz.supabase.co"
$ANON         = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZHhicGlibmNxY2NocWlpaGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjM4NzIsImV4cCI6MjA3MTA5OTg3Mn0.3Y7KWRmroVYeyl-jhweLpkCNyE5X6yOrYR__dbalRsg"

$SOURCE     = "tcgplayer"   # change to "cardmarket" for EU pass
$PAGE_SIZE  = 250
$SLEEP_MS   = 150
$RETRIES    = 3
$CHECKPOINT = Join-Path $PWD "price_all_checkpoint.json"
$LOGCSV     = Join-Path $PWD "price_all_log.csv"

function Save-State($s) { ($s | ConvertTo-Json -Depth 6) | Set-Content -Encoding UTF8 $CHECKPOINT }
function Load-State()   { if (Test-Path $CHECKPOINT) { Get-Content $CHECKPOINT -Raw | ConvertFrom-Json } else { @{ sets=@{} } } }
function Log-Row($setCode,$page,$imported,$status){
  if (-not (Test-Path $LOGCSV)) { "timestamp,set_code,source,page,imported,status" | Set-Content -Encoding UTF8 $LOGCSV }
  $ts=(Get-Date).ToString("s")
  Add-Content -Encoding UTF8 $LOGCSV ('{0},{1},{2},{3},{4},{5}' -f $ts,$setCode,$SOURCE,$page,$imported,$status)
}

function Get-AllSetCodes-RPC {
  try {
    $res = Invoke-RestMethod -Method POST `
      -Uri "$SUPABASE_URL/rest/v1/rpc/list_set_codes" `
      -Headers @{ apikey=$ANON; Authorization="Bearer $ANON" } `
      -ContentType "application/json" -Body "{}"
    return ($res | ForEach-Object { $_.set_code } | Where-Object { $_ -ne $null })
  } catch { return @() }
}

function Get-AllSetCodes-REST {
  # Correct PostgREST syntax for distinct
  $url = "$SUPABASE_URL/rest/v1/card_prints?select=set_code&distinct&set_code=not.is.null"
  $res = Invoke-RestMethod -Method GET -Uri $url -Headers @{ apikey=$ANON; Authorization="Bearer $ANON" }
  return ($res | ForEach-Object { $_.set_code } | Sort-Object -Unique)
}

function Invoke-ImportPrices($setCode,$page){
  $body = @{ setCode=$setCode; page=$page; pageSize=$PAGE_SIZE; source=$SOURCE } | ConvertTo-Json
  $attempt=0
  while($attempt -lt $RETRIES){
    try{
      return Invoke-RestMethod -Method POST `
        -Uri "$SUPABASE_URL/functions/v1/import-prices" `
        -Headers @{ apikey=$ANON; Authorization="Bearer $ANON" } `
        -ContentType "application/json" -Body $body -TimeoutSec 180
    } catch {
      $attempt++
      $resp = $_.Exception.Response
      if ($resp) {
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream()); $text = $reader.ReadToEnd(); $reader.Close()
        Write-Warning ("HTTP error {0} page {1}: {2}" -f $setCode,$page,$text)
      } else {
        Write-Warning ("HTTP error {0} page {1}: {2}" -f $setCode,$page,$_.Exception.Message)
      }
      if ($attempt -ge $RETRIES) { return $null }
      Start-Sleep -Milliseconds (600 * $attempt)
    }
  }
}

# --- MAIN ---
$codes = Get-AllSetCodes-RPC
if (-not $codes -or $codes.Count -eq 0) {
  Write-Warning "RPC returned 0; using REST distinct set_code…"
  $codes = Get-AllSetCodes-REST
}
if (-not $codes -or $codes.Count -eq 0) {
  Write-Error "No set codes found (card_prints.set_code might be empty)."
  exit 1
}

$state = Load-State
foreach($code in $codes){
  if (-not $state.sets.$code){ $state.sets.$code = @{ nextPage=1; done=$false; imported=0 } }
  if ($state.sets.$code.done -eq $true){ Write-Host "[$code] done (skip)"; continue }

  $page = [int]$state.sets.$code.nextPage
  Write-Host ("-- Pricing [{0}] ({1}) from page {2}" -f $code,$SOURCE,$page)

  while($true){
    $res = Invoke-ImportPrices $code $page
    if ($null -eq $res){ Log-Row $code $page 0 "ERROR"; break }

    $imp=[int]$res.imported
    Log-Row $code $page $imp "OK"
    $state.sets.$code.imported = ([int]$state.sets.$code.imported) + $imp
    "{0} page {1} -> priced {2}" -f $code,$page,$imp | Write-Host

    $last = ($res.end -eq $true) -or ($imp -lt $PAGE_SIZE) -or ([string]::IsNullOrEmpty($res.nextPageHint))
    if ($last){
      $state.sets.$code.done = $true
      $state.sets.$code.nextPage = $page
      Save-State $state
      break
    } else {
      $page = [int]$res.nextPageHint
      $state.sets.$code.nextPage = $page
      Save-State $state
      Start-Sleep -Milliseconds $SLEEP_MS
    }
  }
}

Write-Host "=== COMPLETE ($SOURCE) ==="
Write-Host ("Checkpoint: {0}" -f $CHECKPOINT)
Write-Host ("Log CSV   : {0}" -f $LOGCSV)
